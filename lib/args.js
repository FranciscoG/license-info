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
  const defaults = {
    open: false,
    output: "./license-report.html", // default output path
  };
  const cliArgs = parseArgs(args);
  return Object.assign(defaults, cliArgs);
}

/**
 * Very crude command line arguments parser.
 * @param {string[]} args
 */
export function parseArgs(args) {
  /**
   * @type {Record<string, boolean | string>}
   */
  const parsed = {};

  let pendingFlag = null;
  for (const arg of args) {
    // this will either be a flag or value, or flag=value
    const [flag, value] = smartSplit(arg);

    // case: --flag=value
    if (flag && value) {
      parsed[flag] = unQuote(value.trim());
      // check if we also need to add lastArg
      if (pendingFlag) {
        parsed[pendingFlag] = true;
        pendingFlag = null;
      }
      continue;
    }

    // case: value following a pending flag
    if (!flag && value && pendingFlag) {
      parsed[pendingFlag] = unQuote(value.trim());
      pendingFlag = null;
      continue;
    }

    // case: flag without value (might be followed by a value)
    if (flag && !value) {
      if (pendingFlag) {
        parsed[pendingFlag] = true;
      }
      pendingFlag = flag;
      continue;
    }

    // stray value with no pending flag
    if (!flag && value && !pendingFlag) {
      throw new Error(`Unexpected value without flag: ${value}`);
    }
  }

  // if we have a dangling lastArg, set it to true
  if (pendingFlag) {
    parsed[pendingFlag] = true;
  }

  return parsed;
}

/**
 * Checks if this cli arg is truly a `--flag=value` or
 * possibly a value that has an equal sign in it.
 * @param {string} arg
 */
function smartSplit(arg) {
  const match = arg.match(/^--?([a-z0-9_-]+)(?:=(.*))?$/i);
  if (match) {
    return [match[1], match[2]];
  }
  return [null, arg];
}

/**
 * Removes surrounding quotes from a string if present.
 * @param {string} str
 * @returns {string}
 */
function unQuote(str) {
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    return str.slice(1, -1);
  }
  return str;
}
