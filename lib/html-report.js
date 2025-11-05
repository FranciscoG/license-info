import fs from "node:fs";

/**
 * @param {import('./license-info.js').LicenseInfo} licenseInfo
 * @returns {string} HTML report
 */
export function buildHtmlReport(licenseInfo) {
  let html = fs.readFileSync(new URL("./report.html", import.meta.url), "utf-8");

  html = html.replace(
    "/* {{licenseCount}} */",
    `licenseCount = ${JSON.stringify(licenseInfo.licenseCount)};`
  );

  html = html.replace(
    "/* {{licenseData}} */",
    `licenseData = ${JSON.stringify(licenseInfo.licenses)};`
  );
  return html;
}
