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
 * @property {Record<string, string>} devDependencies - Development dependencies
 * @property {Record<string, string>} _dependencies - Internal dependencies reference
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
      this.output = deps;
      console.log("Processing dependencies...");
      const { licenses, licenseCount } = this.getFlattenedDependencies(deps.dependencies);
      this.licenses = Object.values(licenses).sort((a, b) => a.name.localeCompare(b.name));
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
      script.on("close", (code) => {
        if (code !== 0) {
          console.log(`npm ls process exited with code ${code}`);
        }
        resolve(JSON.parse(Buffer.concat(result).toString()));
      });
    });
  }

  /**
   * Extract license information from a package
   * @param {any} pkg - Package object with license information
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
      return pkg.licenses.map(/** @param {any} l */ (l) => l.type).join(", ");
    }

    // if license is a string, return it
    if (pkg.license) {
      return pkg.license;
    }

    return UNKNOWN_LICENSE;
  }

  /**
   * Recursively flatten the dependencies object and count licenses
   * @param {object} deps - Dependencies object
   * @param {string[]} parent - Parent dependency tree
   * @param {{[key: string]: number}} licenseCount - License count object
   * @returns {{licenses: Record<string, PackageInfo>, licenseCount: Record<string, number>}}
   */
  getFlattenedDependencies(deps, parent = [], licenseCount = {}) {
    // recursively flatten the dependencies object and also count licenses

    /** @type {{[key: string]: PackageInfo}} */
    let result = {};

    for (const [name, info] of Object.entries(deps)) {
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

      result[key] = {
        name,
        license,
        version,
        type,
        tree,
      };

      licenseCount[license] = (licenseCount[license] || 0) + 1;

      if (info.dependencies) {
        result = {
          ...result,
          ...this.getFlattenedDependencies(info.dependencies, tree, licenseCount).licenses,
        };
      }
    }
    return { licenses: result, licenseCount };
  }
}
