#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { LicenseInfo } from "./license-info.js";
import { buildHtmlReport } from "./html-report.js";
import { logSummary } from "./log-summary.js";
import { getArgs } from "./args.js";
import { openBrowser } from "./open-browser.js";

// parse command line arguments
let openHtmlPage, outputPath;
try {
  ({ open: openHtmlPage, output: outputPath } = getArgs(process.argv.slice(2)));
} catch (err) {
  console.error("Error parsing command line arguments.");
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

// begin reading dependencies and extracting license info
const licenseInfo = new LicenseInfo();
await licenseInfo.initialize();

// Generate HTML report
console.log("Generating HTML report...");
const htmlReport = buildHtmlReport(licenseInfo);

/**
 * @param {string} output
 * @returns {string} the resolved output path
 */
function handleOutput(output) {
  if (output.startsWith("~")) {
    output = path.join(os.homedir(), output.substring(1));
  }
  if (output) {
    const dir = path.dirname(output);
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (error) {
      console.error(`Error creating directory ${dir}`);
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  } else {
    output = path.join(process.cwd(), "license-report.html");
  }

  try {
    fs.writeFileSync(output, htmlReport);
  } catch (err) {
    console.error(`Error: Could not write report to ${output}.`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
  console.log(`\nLicense report generated at ${output}\n`);
  return output;
}

console.log(`\nLicense Summary:\n`);
logSummary(licenseInfo);

if (typeof outputPath === "string") {
  const resolvedPath = handleOutput(outputPath);

  if (openHtmlPage) {
    openBrowser(resolvedPath);
  }
}