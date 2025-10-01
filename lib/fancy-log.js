import { UNKNOWN_LICENSE, LicenseInfo } from "./license-info.js";

/**
 * Log a summary of the license information to the console.
 * @param {LicenseInfo} licenseInfo
 */
export function logSummary(licenseInfo) {
  // also log license summary to console
  console.log("License Summary:");

  let longestKeyLength = 0;

  /**
   * @type {Array<[string, number]>}
   */
  const logs = [];

  /**
   * @type {[string, number] | null}
   */
  let unknown = null;
  for (const [license, count] of Object.entries(licenseInfo.licenseCount)) {
    longestKeyLength = Math.max(longestKeyLength, license.length);

    if (license === UNKNOWN_LICENSE) {
      // save for later, will display at the end with special note
      unknown = [license, count];
      continue;
    }
    logs.push([license, count]);
  }

  for (const [license, count] of logs) {
    console.log(`${license.padEnd(longestKeyLength, "—")} : ${count.toString().padStart(3, " ")}`);
  }

  if (unknown) {
    console.log(
      `${unknown[0].padEnd(longestKeyLength, "—")} : ${unknown[1].toString().padStart(3, " ")}`
    );
  }
}
