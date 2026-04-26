/**
 * @typedef {object} ArgSchema
 * @property {string[]} flags - all variants of the argument name (e.g. --open and -o)
 * @property {string} arg - the canonical name of the argument that will be used internally (e.g. "open")
 * @property {boolean} takesValue - whether this argument expects a value (e.g. --output)
 * @property {string} description - a brief description of the argument for help text
 */

/**
 * Removes anything from the first = and after.
 * @param {string} arg 
 * @returns {string}
 */
const cleanArg = (arg) => arg.replace(/=.*$/, "");

/**
 * Very crude command line arguments parser.
 * @param {string[]} args
 * @param {ArgSchema[]} argSchemas
 * @return {Record<string, boolean | string>}
 * @throws {Error} if an unknown argument is encountered or a value is missing.
 */
export function parseArgs(args, argSchemas) {
	/**
	 * @type {Record<string, boolean | string>}
	 */
	const parsed = {};
	const argSet = new Set(argSchemas.flatMap(({ flags }) => flags));

	let i = 0;
	while (i < args.length) {
		const arg = args[i];
		const cleanedArg = cleanArg(arg);

		if (!argSet.has(cleanedArg)) {
			throw new Error(`Unknown argument: ${arg}`);
		}

		const schema = argSchemas.find(({ flags }) => flags.includes(cleanedArg));
		if (!schema) {
			// this should never happen because we already checked for unknown arguments,
			// but adding this check to prevent vscode from showing a type error.
			throw new Error(`Unknown argument: ${arg}`);
		}

		if (!schema.takesValue) {
			// for flags that don't take a value, we just set them to true
			parsed[schema.arg] = true;
			i += 1;
			continue;
		}

		// everything below is for arguments that take a value.
		// All of the following ways are allowed:
		// --output report.html   or -o report.html
		// --output=report.html   or -o=report.html
		// --output="report.html" or -o="report.html"
		// --output='report.html' or -o='report.html'
		// --output= report.html or -o= report.html
		//
		// but we don't allow: `--output = report.html` (with spaces around the equal sign)
		// because that would make the "=" the value of the argument

		if ((arg === cleanedArg || arg === cleanedArg + "=") && (i + 1 >= args.length || argSet.has(cleanArg(args[i + 1])))) {
			// if there is no next argument or the next argument is another flag,
			// then we consider it a missing value
			throw new Error(`Missing value for ${arg}`);
		}

		const result = parseValueArg(schema.flags, arg, args[i + 1]);
		if (typeof result?.value === "undefined") {
			throw new Error(`Missing value for ${arg}`);
		}
		parsed[schema.arg] = unQuote(result.value);
		i += result.consumedArgs;
	}

	return parsed;
}

/**
 * 
 * @param {ArgSchema['flags']} flags
 * @param {string} currentArg 
 * @param {string} nextArg
 * @returns {{ value: string, consumedArgs: number } | undefined}
 */
function parseValueArg(flags, currentArg, nextArg) {
	for (const flag of flags) {
		// first we strip away the flag from the currentArg and see if there's anything left. 
		const suffix = currentArg.replace(new RegExp("^" + flag), "").trim();
		if (!suffix || suffix === "=") {
			// if there's nothing left, then the value was separated by a space
			return { value: nextArg, consumedArgs: 2 };
		}
		// if the suffix starts with an equal sign, we remove it and consider the rest as the value
		if (suffix.startsWith("=")) {
			return { value: suffix.substring(1), consumedArgs: 1 };
		}
	}
	return undefined;
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
