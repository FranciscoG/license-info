import { spawn } from "node:child_process";

/**
 * Opens the given URL in the default browser.
 * @param {string} url - The URL to open. In this case it is expected to be a file path.
 */
export function openBrowser(url) {
  const platform = process.platform;

  /**
   * @type {Record<NodeJS.Platform, string>}
   */
  const openCommands = {
    aix: "defaultbrowser",
    darwin: "open",
    freebsd: "xdg-open",
    linux: "xdg-open",
    openbsd: "xdg-open",
    sunos: "xdg-open",
    win32: "start",
    android: "",
    haiku: "open",
    cygwin: "start",
    netbsd: "xdg-open",
  };

  const openCommand = openCommands[platform];

  if (!openCommand) {
    console.warn(`Opening the HTML report is not supported on platform: ${platform}`);
    // not an error, just skip opening
    return;
  }
  console.log("Opening report in default browser...");

  /**
   * @type {import("child_process").SpawnOptions}
   */
  const spawnOptions = {
    stdio: "ignore",
    detached: true,
  };

  // 'start' is a shell command on Windows
  if (platform === "win32") {
    spawnOptions.shell = true;
  }

  const child = spawn(openCommand, [url], spawnOptions);
  child.on("error", (err) => {
    console.error(`Failed to open browser: ${err.message}`);
  });
  child.unref();
}
