import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { parseArgs } from "../lib/utils/arg-parser.js";

const originalExit = process.exit;
const originalConsoleError = console.error;
const printedErrors = {};

beforeEach((context) => {
  console.error = ((...args) => {
    printedErrors[context.test.name] = args.join(" ");
  });
  process.exit = (() => {
    throw new Error(printedErrors[context.test.name]);
  });
});

afterEach(() => {
  process.exit = originalExit;
  console.error = originalConsoleError;
});

/** @type {import('../lib/utils/arg-parser.js').ArgSchema[]} */
const testSchemas = [
  { flags: ["--open", "-o"], arg: "open", takesValue: false, description: "", defaultValue: false },
  { flags: ["--output", "-O"], arg: "output", takesValue: true, description: "", defaultValue: "" },
  { flags: ["--config"], arg: "config", takesValue: true, description: "", defaultValue: "" },
  { flags: ["-p"], arg: "p", takesValue: true, description: "", defaultValue: "" },
];

describe("parseArgs", () => {
  // --- basics ---

  it("should return empty object when no arguments are provided", () => {
    assert.deepEqual(parseArgs([], testSchemas), {});
  });

  it("should parse a boolean flag (long form)", () => {
    assert.deepEqual(parseArgs(["--open"], testSchemas), { open: true });
  });

  it("should parse a boolean flag (short alias)", () => {
    assert.deepEqual(parseArgs(["-o"], testSchemas), { open: true });
  });

  it("should parse a value flag with space separator", () => {
    assert.deepEqual(parseArgs(["--output", "file.html"], testSchemas), { output: "file.html" });
  });

  it("should parse a value flag with equals separator", () => {
    assert.deepEqual(parseArgs(["--output=file.html"], testSchemas), { output: "file.html" });
  });

  it("should parse a value flag short alias with space separator", () => {
    assert.deepEqual(parseArgs(["-O", "file.html"], testSchemas), { output: "file.html" });
  });

  it("should parse a value flag short alias with equals separator", () => {
    assert.deepEqual(parseArgs(["-O=file.html"], testSchemas), { output: "file.html" });
  });

  it("should parse multiple flags together", () => {
    assert.deepEqual(parseArgs(["--open", "--output", "file.html"], testSchemas), {
      open: true,
      output: "file.html",
    });
  });

  it("should parse flags in any order", () => {
    assert.deepEqual(parseArgs(["--output", "file.html", "--open"], testSchemas), {
      open: true,
      output: "file.html",
    });
  });

  // --- value parsing ---

  it("should strip surrounding double quotes from values", () => {
    assert.deepEqual(parseArgs(["--output", '"file with spaces.html"'], testSchemas), {
      output: "file with spaces.html",
    });
  });

  it("should strip surrounding single quotes from values", () => {
    assert.deepEqual(parseArgs(["--output", "'file with spaces.html'"], testSchemas), {
      output: "file with spaces.html",
    });
  });

  it("should strip quotes from inline = values", () => {
    assert.deepEqual(parseArgs(['--output="file.html"'], testSchemas), { output: "file.html" });
  });

  it("should preserve = signs inside a value", () => {
    assert.deepEqual(
      parseArgs(["--config", "key=value;another=value", "-p=a=b=c"], testSchemas),
      { config: "key=value;another=value", p: "a=b=c" }
    );
  });

  it("should use the next arg as value when the flag ends with bare =", () => {
    // --output= <space> value treats the next token as the value
    assert.deepEqual(parseArgs(["--output=", "file.html"], testSchemas), { output: "file.html" });
  });

  it("last occurrence wins when a flag is repeated", () => {
    assert.deepEqual(
      parseArgs(["--output", "first.html", "--output", "second.html"], testSchemas),
      { output: "second.html" }
    );
  });

  // --- unknown-looking tokens used as values ---

  it("dotted token is not treated as a flag — used as value instead", () => {
    // '--not.a.flag' is not in the schema so it falls through as a value for --output
    assert.deepEqual(parseArgs(["--output", "--not.a.flag"], testSchemas), {
      output: "--not.a.flag",
    });
  });

  it("unknown hyphenated token is not treated as a flag — used as value instead", () => {
    assert.deepEqual(parseArgs(["--output", "--flag-with-hyphen"], testSchemas), {
      output: "--flag-with-hyphen",
    });
  });

  // --- errors ---

  it("should throw for an unknown flag", () => {
    assert.throws(
      () => parseArgs(["--unknown"], testSchemas),
      { message: "Unknown argument: --unknown" }
    );
  });

  it("should throw for an unknown flag even when valid flags follow it", () => {
    assert.throws(
      () => parseArgs(["--unknown", "--output", "file.html"], testSchemas),
      { message: "Unknown argument: --unknown" }
    );
  });

  it("should throw when a value flag has no following argument", () => {
    assert.throws(
      () => parseArgs(["--output"], testSchemas),
      { message: "Missing value for --output" }
    );
  });

  it("should throw when the next token after a value flag is a known flag", () => {
    assert.throws(
      () => parseArgs(["--output", "--open"], testSchemas),
      { message: "Missing value for --output" }
    );
  });

  it("should throw when a value flag appears at end after other flags", () => {
    assert.throws(
      () => parseArgs(["--open", "--output"], testSchemas),
      { message: "Missing value for --output" }
    );
  });
});
