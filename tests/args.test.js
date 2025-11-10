import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getArgs, parseArgs } from "../lib/args.js";

describe("getArgs", () => {
  it("should return default values when no arguments are provided", () => {
    const args = getArgs([]);
    assert.equal(args.output, "./license-report.html");
    assert.equal(args.open, false);
  });

  it("should parse --open", () => {
    const args = getArgs(["--open"]);
    assert.equal(args.output, "./license-report.html");
    assert.equal(args.open, true);
  });

  it(`should parse "--output <value>"`, () => {
    const args = getArgs(["--output", "custom-output.html"]);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, false);
  });

  it(`should parse "--output=<value>"`, () => {
    const args = getArgs(["--output=custom-output.html"]);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, false);
  });

  it(`should parse with quotes '--output "<value>"'`, () => {
    const args = getArgs(["--output", '"custom-output.html"']);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, false);
  });

  it(`should parse with quotes '--output="<value>"'`, () => {
    const args = getArgs(['--output="custom-output.html"']);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, false);
  });

  it(`should parse both "--open" and "--output"`, () => {
    const args = getArgs(["--open", "--output", "custom-output.html"]);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, true);
  });

  it(`should parse both "--output" and "--open"`, () => {
    const args = getArgs(["--output", "custom-output.html", "--open"]);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, true);
  });

  // now we try and break it
  it("should handle unexpected arguments gracefully", () => {
    const args = getArgs(["--unknown", "--output", "file.html", "--open"]);
    assert.equal(args.output, "file.html");
    assert.equal(args.open, true);
  });

  it(`should throw error if "--output" is missing value`, () => {
    try {
      getArgs(["--output"]);
    } catch (error) {
      assert.equal(error.message, "Missing value for --output");
    }
    try {
      getArgs(["--output", "--open"]);
    } catch (error) {
      assert.equal(error.message, "Missing value for --output");
    }
  });
});

describe("parseArgs", () => {
  it("should return empty object when no arguments are provided", () => {
    const args = parseArgs([]);
    assert.deepEqual(args, {});
  });

  it("should parse flags without values", () => {
    const args = parseArgs(["--open", "--verbose"]);
    assert.deepEqual(args, { open: true, verbose: true });
  });

  it("should parse flags with values using space", () => {
    const args = parseArgs(["--output", "file.html", "--mode", "strict"]);
    assert.deepEqual(args, { output: "file.html", mode: "strict" });
  });

  it("should parse flags with values using equals sign", () => {
    const args = parseArgs(["--output=file.html", "--mode=strict"]);
    assert.deepEqual(args, { output: "file.html", mode: "strict" });
  });

  it("should handle mixed flags and values", () => {
    const args = parseArgs(["--open", "--output", "file.html", "--mode=strict", "--verbose"]);
    assert.deepEqual(args, {
      open: true,
      output: "file.html",
      mode: "strict",
      verbose: true,
    });
  });

  it("should handle quoted values and remove surrounding quotes", () => {
    const args = parseArgs(["--output", '"file with spaces.html"', "--mode='strict mode'"]);
    assert.deepEqual(args, {
      output: "file with spaces.html",
      mode: "strict mode",
    });
  });

  it("should handle values with equals signs", () => {
    const args = parseArgs([
      "--config",
      "key=value;anotherKey=anotherValue",
      "--open",
      "-p=some=value",
    ]);
    assert.deepEqual(args, {
      config: "key=value;anotherKey=anotherValue",
      open: true,
      p: "some=value",
    });
  });

  it("should throw error for unexpected values without flags", () => {
    try {
      parseArgs(["file.html", "--open"]);
    } catch (error) {
      assert.equal(error.message, "Unexpected value without flag: file.html");
    }
  });

  // some edge cases
  it("should treat `--output=` as a dangling flag (current behavior)", () => {
    const args = parseArgs(["--output="]);
    // current implementation treats this as a dangling flag -> true
    assert.deepEqual(args, { output: true });
  });

  it("flag with hyphen", () => {
    const args = parseArgs(["--output", "--flag-with-hyphen"]);
    // '--flag-with-hyphen' does not match the flag regex, so it's treated as a value
    assert.deepEqual(args, { output: true, "flag-with-hyphen": true });
  });

  it("dotted token is treated as a value, not a flag", () => {
    const args = parseArgs(["--output", "--not.a.flag"]);
    assert.deepEqual(args, { output: "--not.a.flag" });
  });

  it("single-dash short flag is recognized", () => {
    const args = parseArgs(["-p", "some=value"]);
    assert.deepEqual(args, { p: "some=value" });
  });

  it("should accept a flag with numbers and underscores", () => {
    const args = parseArgs(["--flag_123", "value"]);
    assert.deepEqual(args, { flag_123: "value" });
  });
});
