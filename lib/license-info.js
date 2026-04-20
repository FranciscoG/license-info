import { spawn } from "node:child_process";
import { checkDirectoryExists } from "./dir-exists.js";

/**
 * @typedef {'dependency'|'devDependency'|'transitive'} DependencyType
 */

/**
 * @typedef {object} PackageInfo
 * @property {string} name - Package name
 * @property {string} license - License type
 * @property {string} version - Package version
 * @property {DependencyType} type - Dependency type
 * @property {string[]} tree - Dependency tree path
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

      const dependencies = this.output?.dependencies;
      if (!dependencies || typeof dependencies !== "object" || Object.keys(dependencies).length === 0) {
        console.log(
          "No dependencies found to analyze. If this is unexpected, run npm install to generate package-lock.json and install dependencies."
        );
        process.exit(0);
      }

      console.log("Processing dependencies...");
      const { licenses, licenseCount } = this.getFlattenedDependencies(dependencies);
      this.licenses = Object.values(licenses)
        .flat()
        .sort((a, b) => a.name.localeCompare(b.name));
      this.licenseCount = licenseCount;
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
        console.log(`stderr: ${data}`);
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
   * Recursively flatten the dependencies object and count licenses
   * @param {object} deps - Dependencies object
   * @param {string[]} parent - Parent dependency tree
   * @param {{[key: string]: number}} licenseCount - License count object
   * @returns {{licenses: Record<string, PackageInfo[]>, licenseCount: Record<string, number>}}
   */
  getFlattenedDependencies(deps = {}, parent = [], licenseCount = {}) {
    /** @type {{[key: string]: PackageInfo[]}} */
    let result = {};

    if (!deps || typeof deps !== "object") {
      return { licenses: result, licenseCount };
    }

    for (const [name, info] of Object.entries(deps)) {
      // add check to see if the directory exists in node_modules to avoid
      // listing optional/peer dependencies that are not actually installed.
      const isInNodeModules = checkDirectoryExists(name);
      if (!isInNodeModules) {
        continue;
      }
      const license = this.getLicense(info).trim();
      const version = info.version ?? "";

      const key = name + (version ? `@${version}` : "");
      const tree = [...parent, key];

      /**
       * @type {DependencyType}
       */
      let type = "transitive";
      if (this.output?._dependencies?.[name]) {
        type = "dependency";
      } else if (this.output?.devDependencies?.[name]) {
        type = "devDependency";
      }

      const packageInfo = {
        name,
        license,
        version,
        type,
        tree,
      };

      // Store all occurrences instead of overwriting
      if (!result[key]) {
        result[key] = [];
      }
      result[key].push(packageInfo);

      // Only count license once per unique package@version
      if (result[key].length === 1) {
        licenseCount[license] = (licenseCount[license] || 0) + 1;
      }

      if (info.dependencies) {
        const nested = this.getFlattenedDependencies(info.dependencies, tree, licenseCount);
        // Merge nested results
        for (const [nestedKey, nestedPackages] of Object.entries(nested.licenses)) {
          if (!result[nestedKey]) {
            result[nestedKey] = [];
          }
          result[nestedKey].push(...nestedPackages);
        }
      }
    }
    return { licenses: result, licenseCount };
  }
}
