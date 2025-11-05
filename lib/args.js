// my simple argument parser
// The only 2 arguments supported are --open and --output
// --open does not take any value (treat as a boolean flag)
// --output takes a string value in the form of --output=filepath OR --output filepath (with or without quotes)

/**
 * Parses command line arguments and returns an object with the parsed values.
 * @param {string[]} args - The command line arguments to parse.
 * @returns {{ open: boolean, output: string }} The parsed arguments.
 */
export function getArgs(args) {
  const parsedArgs = {
    open: false,
    output: "./license-report.html", // default output path
  };
  for (const arg of args) {
    if (arg === "--open") {
      parsedArgs.open = true;
    } else if (arg.startsWith("--output")) {
      const value = arg.split("=")[1] || args[args.indexOf(arg) + 1];
      if (!value || value.startsWith("--")) {
        throw new Error("Missing value for --output");
      }
      parsedArgs.output = value;
    }
  }

  return parsedArgs;
}
