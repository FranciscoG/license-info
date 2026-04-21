import { spawn } from "node:child_process";

/**
 * @typedef {'dependency'|'devDependency'|'transitive'} DependencyType
 */

/**
 * @typedef {object} PackageInfo
 * @property {string} name - Package name
 * @property {string} license - License type
 * @property {string} version - Package version
 * @property {DependencyType} type - Dependency type
 * @property {string[][]} trees - Every path in the dependency graph that reaches this package
 */

/**
 * @typedef {object} PackageData
 * @property {string | {type: string, url: string}} license - License information
 * @property {Array<{type: string, url: string}>} [licenses]
 * @property {string} version - Package version
 * @property {Record<string, PackageData>} dependencies - Package dependencies
 */

/**
 * @typedef {object} DependencyData
 * @property {Record<string, PackageData>} dependencies - Production dependencies
 * @property {Record<string, string>} devDependencies - Same as devDependencies from package.json
 * @property {Record<string, string>} _dependencies - Same as the dependencies in package.json
 */

export const UNKNOWN_LICENSE = "UNKNOWN";

/**
 * Class for reading license information of npm dependencies
 */
export class LicenseInfo {
  constructor() {
    /**
     * The complete output of `npm ls --all --json --long`
     * @type {DependencyData}
     */
    this.output = {
      dependencies: {},
      devDependencies: {},
      _dependencies: {},
    };

    /** @type {PackageInfo[]} */
    this.licenses = [];

    /** @type {{[key: string]: number}} */
    this.licenseCount = {};

    /** @type {{[key: string]: number}} */
    this.dependencyLicenseCount = {};

    /** @type {{[key: string]: number}} */
    this.devDependencyLicenseCount = {};
  }

  /**
   * Initialize the license info by fetching all dependencies
   * @returns {Promise<void>}
   */
  initialize() {
    return this.getAllDependencies().then((deps) => {
      this.output = deps ?? {
        dependencies: {},
        devDependencies: {},
        _dependencies: {},
      };

      const allDeps = this.output?.dependencies;
      if (!allDeps || typeof allDeps !== "object" || Object.keys(allDeps).length === 0) {
        console.log(
          "No dependencies found to analyze. If this is unexpected, run npm install to generate package-lock.json and install dependencies."
        );
        process.exit(0);
      }

      // Partition the top-level entries by whether they come from
      // `dependencies` or `devDependencies` in the host package.json.
      // We traverse each scope independently so shared transitives can
      // be counted in both summaries.
      /** @type {Record<string, PackageData>} */
      const prodRoots = {};
      /** @type {Record<string, PackageData>} */
      const devRoots = {};
      for (const [name, info] of Object.entries(allDeps)) {
        if (this.output?._dependencies?.[name]) {
          prodRoots[name] = info;
        } else if (this.output?.devDependencies?.[name]) {
          devRoots[name] = info;
        }
      }

      console.log("Processing dependencies...");
      /** @type {Record<string, PackageInfo>} */
      const licenses = {};
      this.getFlattenedDependencies(prodRoots, [], licenses, this.dependencyLicenseCount);
      this.getFlattenedDependencies(devRoots, [], licenses, this.devDependencyLicenseCount);

      this.licenses = Object.values(licenses).sort((a, b) => a.name.localeCompare(b.name));
      // Combined count is unique per name@version — used by the HTML
      // filter, which deduplicates shared transitives to a single row.
      this.licenseCount = this.licenses.reduce((acc, pkg) => {
        acc[pkg.license] = (acc[pkg.license] || 0) + 1;
        return acc;
      }, /** @type {{[key: string]: number}} */ ({}));
    });
  }

  /**
   * Get all dependencies using npm ls command
   * @returns {Promise<DependencyData>}
   */
  getAllDependencies() {
    return new Promise((resolve) => {
      console.log("Reading dependencies...");
      const script = spawn("npm", ["ls", "--all", "--json", "--long"]);

      /** @type {Buffer[]} */
      let result = [];
      script.stdout.on("data", (data) => {
        result.push(data);
      });
      script.stderr.on("data", (data) => {
        console.error(`npm ls: ${data}`);
      });
      script.on("error", (err) => {
        console.error(`Error: Failed to run npm ls. Make sure npm is installed and available on PATH.`);
        console.error(err);
        process.exit(1);
      });
      script.on("close", (code) => {
        if (code !== 0) {
          console.log(`npm ls process exited with code ${code}`);
        }
        const raw = Buffer.concat(result).toString();
        if (!raw.trim()) {
          console.error("Error: 'npm ls' produced no output. Make sure you are in a directory with a package.json and that npm is installed.");
          process.exit(1);
        }
        try {
          resolve(JSON.parse(raw));
        } catch (err) {
          console.error("Error: Failed to parse 'npm ls' output.");
          console.error(err);
          process.exit(1);
        }
      });
    });
  }

  /**
   * Extract license information from a package
   * @param {{license: string | {type: string}, licenses: Array<{type: string}>, version: string, dependencies: Record<string, string>}} pkg - Package object with license information
   * @returns {string} License string
   */
  getLicense(pkg) {
    // old deprecated versions of package.json allowed the license field to be an object,
    // or even an array of objects using the "licenses" field. Here we handle those
    // old edge cases.

    if (pkg.license && typeof pkg.license === "object" && pkg.license.type) {
      return pkg.license.type;
    }

    // sometimes license is an array of licenses
    if (pkg.licenses && Array.isArray(pkg.licenses)) {
      return pkg.licenses.map((l) => l.type).join(", ");
    }

    // if license is a string, return it
    if (typeof pkg.license === "string") {
      return pkg.license;
    }

    return UNKNOWN_LICENSE;
  }

  /**
   * Recursively flatten the dependencies object and count licenses.
   * Packages reached through multiple paths are deduped into a single
   * entry in `licenses` whose `trees` field records every path. The
   * `licenseCount` counts each unique name@version once per call chain,
   * so invoking this separately for prod vs dev roots produces two
   * independent counts even when transitives are shared.
   *
   * @param {object} deps - Dependencies object
   * @param {string[]} parent - Parent dependency tree
   * @param {Record<string, PackageInfo>} [licenses] - Deduped package accumulator (may be shared across scopes)
   * @param {{[key: string]: number}} [licenseCount] - License count accumulator for the current scope
   * @param {Set<string>} [countedKeys] - Keys already counted in the current scope; callers normally omit this
   * @returns {{licenses: Record<string, PackageInfo>, licenseCount: Record<string, number>}}
   */
  getFlattenedDependencies(deps = {}, parent = [], licenses = {}, licenseCount = {}, countedKeys = new Set()) {
    if (!deps || typeof deps !== "object") {
      return { licenses, licenseCount };
    }

    for (const [name, info] of Object.entries(deps)) {
      // skip malformed entries (e.g. peer deps listed with no metadata by npm ls)
      if (!name || !info || typeof info !== "object") {
        continue;
      }
      const license = this.getLicense(info).trim();
      const version = info.version ?? "";

      const key = name + (version ? `@${version}` : "");
      const tree = [...parent, key];

      if (licenses[key]) {
        licenses[key].trees.push(tree);
      } else {
        /** @type {DependencyType} */
        let type = "transitive";
        if (this.output?._dependencies?.[name]) {
          type = "dependency";
        } else if (this.output?.devDependencies?.[name]) {
          type = "devDependency";
        }
        licenses[key] = { name, license, version, type, trees: [tree] };
      }

      if (!countedKeys.has(key)) {
        countedKeys.add(key);
        licenseCount[license] = (licenseCount[license] || 0) + 1;
      }

      if (info.dependencies) {
        this.getFlattenedDependencies(info.dependencies, tree, licenses, licenseCount, countedKeys);
      }
    }
    return { licenses, licenseCount };
  }
}
