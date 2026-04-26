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
  it("should return empty object when no arguments are provided", () => {
    const args = parseArgs([], testSchemas);
    assert.deepEqual(args, {});
  });

  it("should parse flags without values", () => {
    const args = parseArgs(["--open"], testSchemas);
    assert.deepEqual(args, { open: true });
  });

  it("should parse flags with values using space", () => {
    const args = parseArgs(["--output", "file.html"], testSchemas);
    assert.deepEqual(args, { output: "file.html" });
  });

  it("should parse flags with values using equals sign", () => {
    const args = parseArgs(["--output=file.html"], testSchemas);
    assert.deepEqual(args, { output: "file.html" });
  });

  it("should handle mixed flags and values", () => {
    const args = parseArgs(["--open", "--output", "file.html"], testSchemas);
    assert.deepEqual(args, {
      open: true,
      output: "file.html",
    });
  });

  it("should handle quoted values and remove surrounding quotes", () => {
    const args = parseArgs(["--output", '"file with spaces.html"'], testSchemas);
    assert.deepEqual(args, {
      output: "file with spaces.html",
    });
  });

  it("should handle values with equals signs", () => {
    const args = parseArgs(
      ["--config", "key=value;anotherKey=anotherValue", "--open", "-p=some=value"],
      testSchemas
    );
    assert.deepEqual(args, {
      config: "key=value;anotherKey=anotherValue",
      open: true,
      p: "some=value",
    });
  });

  it("should throw error for unknown arguments", () => {
    assert.throws(() => parseArgs(["--unknown", "--output", "file.html"], testSchemas), {
      message: "Unknown argument: --unknown",
    });
  });

  it(`should throw error if "--output" is missing value`, () => {
    assert.throws(() => parseArgs(["--output"], testSchemas), { message: "Missing value for --output" });
    assert.throws(() => parseArgs(["--output", "--open"], testSchemas), { message: "Missing value for --output" });
  });

  // edge cases
  it("dotted token is treated as a value, not a flag", () => {
    const args = parseArgs(["--output", "--not.a.flag"], testSchemas);
    // '--not.a.flag' is not a known flag so it's used as the value of --output
    assert.deepEqual(args, { output: "--not.a.flag" });
  });

  it("single-dash short flag is recognized", () => {
    const args = parseArgs(["-p", "some=value"], testSchemas);
    assert.deepEqual(args, { p: "some=value" });
  });
});
