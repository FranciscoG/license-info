import { UNKNOWN_LICENSE, LicenseInfo } from "./license-info.js";

/**
 * sort licenseCount by value desc, then key asc
 * @param {Record<string, number>} licenseCount 
 * @returns {Array<[string, number]>}
 */
function sortLicenses(licenseCount) {
  const sortedLicenses = Object.entries(licenseCount).sort((a, b) => {
    const countDiff = b[1] - a[1];
    if (countDiff !== 0) return countDiff;
    return a[0].localeCompare(b[0]);
  });
  return sortedLicenses;
}

/**
 * Print a single license-count section.
 * @param {string} heading
 * @param {{[key: string]: number}} counts
 * @param {number} padWidth - Shared padding width so sections align with each other
 */
function printSection(heading, counts, padWidth) {
  console.log(heading);
  console.log("-".repeat(heading.length));
  if (Object.keys(counts).length === 0) {
    console.log("  (none)");
    return;
  }

  /** @type {Array<[string, number]>} */
  const logs = [];
  /** @type {[string, number] | null} */
  let unknown = null;

  const sortedLicenses = sortLicenses(counts);

  for (const [license, count] of sortedLicenses) {
    if (license === UNKNOWN_LICENSE) {
      unknown = [license, count];
      continue;
    }
    logs.push([license, count]);
  }

  for (const [license, count] of logs) {
    console.log(`${license.padEnd(padWidth, " ")} : ${count.toString().padStart(3, " ")}`);
  }
  if (unknown) {
    console.log(`${unknown[0].padEnd(padWidth, " ")} : ${unknown[1].toString().padStart(3, " ")}`);
  }
}

/**
 * Log a summary of the license information to the console, split
 * into dependencies and devDependencies sections. Shared transitives
 * appear in both.
 * @param {LicenseInfo} licenseInfo
 */
export function logSummary(licenseInfo) {
  const depCounts = licenseInfo.dependencyLicenseCount ?? {};
  const devDepCounts = licenseInfo.devDependencyLicenseCount ?? {};

  // Align the colons across both sections by using the longest
  // license name seen in either map.
  let padWidth = 0;
  for (const license of [...Object.keys(depCounts), ...Object.keys(devDepCounts)]) {
    padWidth = Math.max(padWidth, license.length);
  }

  printSection("From dependencies:", depCounts, padWidth);
  console.log("");
  printSection("From devDependencies:", devDepCounts, padWidth);
}
