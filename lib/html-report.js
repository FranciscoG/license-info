import fs from "node:fs";

/**
 * Safely serializes data for injection into an HTML <script> block by
 * escaping `</` to prevent script tag breakout (XSS via package metadata).
 * @param {unknown} data
 * @returns {string}
 */
function safeJsonStringify(data) {
  return JSON.stringify(data).replace(/<\//g, "<\\/");
}

/**
 * @param {import('./license-info.js').LicenseInfo} licenseInfo
 * @returns {string} HTML report
 */
export function buildHtmlReport(licenseInfo) {
  let html = fs.readFileSync(new URL("./report.html", import.meta.url), "utf-8");

  html = html.replace(
    "/* {{licenseCount}} */",
    `licenseCount = ${safeJsonStringify(licenseInfo.licenseCount)};`
  );

  html = html.replace(
    "/* {{licenseData}} */",
    `licenseData = ${safeJsonStringify(licenseInfo.licenses)};`
  );
  return html;
}
