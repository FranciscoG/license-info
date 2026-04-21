/**
 * Loosely based on: https://github.com/sindresorhus/open
 * But because I don't want to add any depedencies, this doesn't cover all the
 * edge cases that the open package does. It should work for the most common cases
 */
import { spawn } from "node:child_process";

/**
 * Opens the given URL in the default browser.
 * @param {string} url - The URL to open. In this case it is expected to be a file path.
 */
export function openBrowser(url) {
  if (typeof url !== "string" || !url?.trim()) {
    console.error("Error: A valid URL string is required.");
    return;
  }
  const platform = process.platform;

  /** @type {import("child_process").SpawnOptions} */
  const spawnOptions = {
    stdio: "ignore",
    detached: true,
  };

  let openCommand = "";
  switch (platform) {
    case "darwin": // macOS
      // Command: open <url>
      openCommand = "open";
      break;
    case "win32":
      // Command: start "" <url>
      // The empty quoted argument ("") is required by 'start' to specify the title
      // of the new command window. This prevents issues if the URL contains arguments
      // that 'start' might interpret as a window title.
      openCommand = 'start ""';
      spawnOptions.shell = true;
      break;
    case "linux":
      openCommand = "xdg-open";
      break;
    default:
      console.error(`Unsupported platform: ${platform}`);
      return;
  }

  console.log("Opening report in default browser...");

  const child = spawn(openCommand, [url.trim()], spawnOptions);
  child.on("error", (err) => {
    if (platform === "linux" && err.code === "ENOENT") {
      console.error(
        `Failed to open browser: '${openCommand}' was not found. Install xdg-utils (e.g. sudo apt install xdg-utils) or open the report manually at: ${url}`
      );
    } else {
      console.error(`Failed to open browser: ${err.message}`);
    }
  });
  child.unref();
}
