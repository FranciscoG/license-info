import { parseArgs } from "./utils/arg-parser.js";

/**
 * @typedef {import('./utils/arg-parser.js').ArgSchema & {defaultValue: string | boolean}} ArgSchemaWithDefault
 */

/**
 * @type {ArgSchemaWithDefault[]}
 */
const ARG_SCHEMAS = [
  {
    flags: ["--open"],
    arg: 'open',
    takesValue: false,
    description: "Automatically open the HTML report in your default browser",
    defaultValue: false,
  },
  {
    flags: ["--output"],
    arg: 'output',
    takesValue: true,
    description: "Set the name and location of the generated report",
    defaultValue: "./license-report.html",
  },
  {
    flags: ["--help", "-h"],
    arg: 'help',
    takesValue: false,
    description: "Show this help message",
    defaultValue: false,
  }
];


/**
 * @param {ArgSchemaWithDefault[]} argSchemas
 * @returns {string}
 */
function generateHelpText(argSchemas) {
  const header = `
Usage: license-info [options]

Generate a license report for your project's npm dependencies.
  
Options:
`.trim();

  const optionsText = argSchemas.map(({ arg, flags, takesValue, description, defaultValue }) => {
    const nameText = flags.join(", ") + (takesValue ? " <value>" : "");
    const defaultValueText = arg !== "help" ? ` (default: ${defaultValue})` : "";
    return `  ${nameText.padEnd(25)} ${description}${defaultValueText}`;
  }).join("\n");

  return `${header}\n${optionsText}`;
}

/**
 * Parses command line arguments and returns an object with the parsed values.
 * @param {string[]} args - The command line arguments to parse.
 * @returns {Record<string, string | boolean>} The parsed arguments.
 */
export function getArgs(args) {
  /**
   * @type {Record<string, string | boolean>}
   */
  const initDefault = {};
  const defaults = ARG_SCHEMAS.reduce((acc, { arg, defaultValue }) => {
    acc[arg] = defaultValue;
    return acc;
  }, initDefault);

  let cliArgs;
  try {
    cliArgs = parseArgs(args, ARG_SCHEMAS);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  if (cliArgs.help || cliArgs.h) {
    console.log(generateHelpText(ARG_SCHEMAS));
    process.exit(0);
  }

  return Object.assign({}, defaults, cliArgs);
}
