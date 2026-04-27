/**
 * Loosely based on: https://github.com/sindresorhus/open
 * But because I don't want to add any depedencies, this doesn't cover all the
 * edge cases that the open package does. It should work for the most common cases.
 * And where it doesn't work, the user can just open the report manually.
 */
import { spawn } from "node:child_process";

/**
 * Opens the given file path in the default browser.
 * @param {string} filePath - The file path to open.
 */
export function openBrowser(filePath) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("A valid file path string is required.");
  }
  const platform = process.platform;

  /** @type {import("child_process").SpawnOptions} */
  const spawnOptions = {
    stdio: "ignore",
    detached: true,
  };

  let command;
  let args;
  switch (platform) {
    case "darwin":
      command = "open";
      args = [filePath.trim()];
      break;
    case "win32":
      // The empty string ("") is required by 'start' as the window title argument.
      // Without it, 'start' may interpret the file path as the title if it contains spaces.
      command = "start";
      args = ["", filePath.trim()];
      spawnOptions.shell = true;
      break;
    case "linux":
      command = "xdg-open";
      args = [filePath.trim()];
      break;
    default:
      console.error(`Unsupported platform: ${platform}`);
      return;
  }

  console.log("Opening report in default browser...");

  const child = spawn(command, args, spawnOptions);
  child.on("error", (err) => {
    const code = typeof err === "object" && err && "code" in err ? err.code : undefined;
    if (platform === "linux" && code === "ENOENT") {
      console.error(
        `Failed to open browser: '${command}' was not found. Install xdg-utils or open the report manually at: ${filePath}`
      );
    } else {
      console.error(`Failed to open browser: ${err.message}`);
      console.error(`Please open the report manually at: ${filePath}`);
    }
  });
  child.unref();
}
