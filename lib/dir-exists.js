import fs from "node:fs";
import path from "node:path";

/**
 * Checks if a directory exists in node_modules. Not recursive.
 * @param {string} targetPath - The path to check.
 * @returns {boolean}
 */
export function checkDirectoryExists(targetPath) {
  const fullPath = path.join(process.cwd(), "node_modules", targetPath);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}
