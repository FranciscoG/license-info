import fs from "node:fs";
import path from "node:path";
import { UNKNOWN_LICENSE } from "./license-info.js";

/**
 * Extracts the license information from a package object.
 * @param {{license: string | {type: string, name: string}, licenses: Array<{type: string, name: string}>}} pkg
 * @returns {string} The license information or UNKNOWN_LICENSE if not found.
 */
function extractLicense(pkg) {
  if (!pkg) return UNKNOWN_LICENSE;
  if (typeof pkg.license === "string") return pkg.license;
  if (pkg.license && typeof pkg.license === "object") {
    return pkg.license.type || pkg.license.name || JSON.stringify(pkg.license);
  }
  if (Array.isArray(pkg.licenses)) {
    return pkg.licenses
      .map((l) => (typeof l === "string" ? l : l.type || l.name))
      .filter(Boolean)
      .join(", ");
  }
  return UNKNOWN_LICENSE;
}

/**
 * Does a recursive search through node_modules to find all packages
 * and get's their license information.
 * @param {string} dir - The directory to start searching from
 * @param {Set<string>} [visited=new Set()] - A set to keep track of visited directories
 * @returns {Array<{name: string, version: string, license: string}>} - An array of package info
 */
export function getAllPackagesFromFS(dir, visited = new Set()) {
  /**
   * @type {Array<{name: string, version: string, license: string}>}
   */
  const packages = [];

  // Determine starting node_modules directory
  let startDir = dir;
  if (path.basename(dir) !== "node_modules") {
    startDir = path.join(dir, "node_modules");
  }

  if (!fs.existsSync(startDir) || !fs.statSync(startDir).isDirectory()) {
    return packages;
  }

  const entries = fs.readdirSync(startDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const name = entry.name;

    // ignore .bin folders
    if (name === ".bin") continue;

    // Scoped packages (e.g. @scope/pkg)
    if (name.startsWith("@")) {
      const scopeDir = path.join(startDir, name);
      let scopeChildren = [];
      try {
        scopeChildren = fs.readdirSync(scopeDir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const child of scopeChildren) {
        if (!child.isDirectory()) continue;
        // ignore .bin inside scopes
        if (child.name === ".bin") continue;

        const pkgDir = path.join(scopeDir, child.name);
        try {
          const real = fs.realpathSync(pkgDir);
          if (visited.has(real)) continue;
          visited.add(real);

          const pkgJsonPath = path.join(real, "package.json");
          let pkgInfo = { name: `${name}/${child.name}`, version: "UNKNOWN", license: "UNKNOWN" };
          if (fs.existsSync(pkgJsonPath)) {
            try {
              const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
              pkgInfo = {
                name: pkg.name || pkgInfo.name,
                version: pkg.version || "UNKNOWN",
                license: extractLicense(pkg),
              };
            } catch {
              // ignore parse errors, keep UNKNOWN defaults
            }
          }

          packages.push(pkgInfo);

          // Recurse into nested node_modules inside this package
          packages.push(...getAllPackagesFromFS(real, visited));
        } catch {
          // ignore errors (broken symlinks, permission issues, etc.)
        }
      }
    } else {
      // Regular package folder
      const pkgDir = path.join(startDir, name);
      try {
        const real = fs.realpathSync(pkgDir);
        if (visited.has(real)) continue;
        visited.add(real);

        const pkgJsonPath = path.join(real, "package.json");
        let pkgInfo = { name, version: "UNKNOWN", license: "UNKNOWN" };
        if (fs.existsSync(pkgJsonPath)) {
          try {
            const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
            pkgInfo = {
              name: pkg.name || name,
              version: pkg.version || "UNKNOWN",
              license: extractLicense(pkg),
            };
          } catch {
            // ignore parse errors
          }
        }

        packages.push(pkgInfo);

        // Recurse into nested node_modules inside this package
        packages.push(...getAllPackagesFromFS(real, visited));
      } catch {
        // ignore errors
      }
    }
  }

  return packages;
}

// if this file is run directly, output all packages from current working directory
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  const result = getAllPackagesFromFS(process.cwd());
  console.log(JSON.stringify(result, null, 2));
}
