import { spawn } from "node:child_process";

/**
 * Opens the given URL in the default browser.
 * @param {string} url - The URL to open. In this case it is expected to be a file path.
 */
export async function openBrowser(url) {
  let openCommand = "";
  switch (process.platform) {
    case "aix": // IBM AIX
      openCommand = "defaultbrowser";
      break;
    case "darwin": // macOS
      openCommand = "open";
      break;
    case "freebsd":
    case "openbsd":
    case "linux":
    case "sunos":
      openCommand = "xdg-open";
      break;
    case "win32":
      openCommand = "start";
      break;
    default:
      console.warn(`Opening the HTML report is not supported on platform: ${process.platform}`);
      // not an error, just skip opening
      return;
  }
  console.log("Opening report in default browser...");

  spawn(openCommand, [url], {
    stdio: "ignore",
    detached: true,
  }).unref();
}
