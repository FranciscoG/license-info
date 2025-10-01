#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { LicenseInfo, UNKNOWN_LICENSE } from "./license-info.js";
import { buildHtmlReport } from "./html-report.js";
import { logSummary } from "./fancy-log.js";

// get arguments from command line
const args = process.argv.slice(2);

// process arguments
const openHtmlPage = args.includes("--open");
let output = args.find((arg) => arg.startsWith("--output"))?.split("=")[1];

// begin reading dependencies and extracting license info
const licenseInfo = new LicenseInfo();
await licenseInfo.initialize();

// Generate HTML report
console.log("Generating HTML report...");
const htmlReport = buildHtmlReport(licenseInfo);

if (output) {
  const dir = path.dirname(output);
  try {
    // Ensure the directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (error) {
    console.error(`Error creating directory: ${dir} \nDefaulting to local folder`);
    output = path.join(process.cwd(), path.basename(output));
  }
} else {
  output = path.join(process.cwd(), "license-report.html");
}

fs.writeFileSync(output, htmlReport);
console.log(`License report generated at ${output}\n`);

logSummary(licenseInfo);

if (openHtmlPage) {
  const open =
    process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
  console.log("Opening report in default browser...");
  const { spawn } = await import("node:child_process");
  spawn(open, [output], {
    stdio: "ignore",
    detached: true,
  }).unref();
}
