#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { LicenseInfo } from "./license-info.js";
import { buildHtmlReport } from "./html-report.js";
import { logSummary } from "./log-summary.js";
import { getArgs } from "./args.js";
import { openBrowser } from "./open-browser.js";

// parse command line arguments
const { open: openHtmlPage, output: outputPath } = getArgs(process.argv.slice(2));

// begin reading dependencies and extracting license info
const licenseInfo = new LicenseInfo();
await licenseInfo.initialize();

// Generate HTML report
console.log("Generating HTML report...");
const htmlReport = buildHtmlReport(licenseInfo);

let output = outputPath;
if (output) {
  const dir = path.dirname(output);
  try {
    if (!fs.existsSync(dir)) {
      // don't create the directory for the user just in case they made a mistake
      console.error(
        `Directory ${dir} does not exist. Please create it or specify a different output path.`
      );
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error checking for the existence of ${dir}`);
    console.error(error);
    process.exit(1);
  }
} else {
  output = path.join(process.cwd(), "license-report.html");
}

fs.writeFileSync(output, htmlReport);
console.log(`License report generated at ${output}\n`);

logSummary(licenseInfo);

if (openHtmlPage) {
  openBrowser(output);
}
