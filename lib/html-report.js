import fs from "node:fs";
import { execSync } from "node:child_process";

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
  let html;
  const reportUrl = new URL("./report.html", import.meta.url);
  try {
    html = fs.readFileSync(reportUrl, "utf-8");
  } catch (err) {
    console.error(`Error: Could not read report template at ${reportUrl.pathname}.`);
    console.log(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  const PROJECT_NAME_PLACEHOLDER = "{{projectName}}";
  const PLACEHOLDER_COUNT = "/* {{licenseCount}} */";
  const PLACEHOLDER_DATA = "/* {{licenseData}} */";

  if (!html.includes(PLACEHOLDER_COUNT) || !html.includes(PLACEHOLDER_DATA)) {
    console.error(
      "Error: report.html is missing one or more required template placeholders. The file may be corrupted."
    );
    process.exit(1);
  }

  html = html.replace(
    PLACEHOLDER_COUNT,
    `licenseCount = ${safeJsonStringify(licenseInfo.licenseCount)};`
  );

  html = html.replace(
    PLACEHOLDER_DATA,
    `licenseData = ${safeJsonStringify(licenseInfo.licenses)};`
  );

  try {
    const projectName = execSync("npm pkg get name", { encoding: "utf-8" }).trim();
    html = html.replace(PROJECT_NAME_PLACEHOLDER, projectName);
  } catch (error) {
    html = html.replace(`for ${PROJECT_NAME_PLACEHOLDER}`, '');
  }
  return html;
}
