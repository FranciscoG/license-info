import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { getArgs } from "../lib/args.js";

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
  it("should fail with unknown arguments", () => {
    assert.throws(() => getArgs(["--unknown", "--output", "file.html", "--open"]), {
      message: "Unknown argument: --unknown",
    });
  });

  it(`should throw error if "--output" is missing value`, () => {
    assert.throws(() => getArgs(["--output"]), { message: "Missing value for --output" });
    assert.throws(() => getArgs(["--output", "--open"]), { message: "Missing value for --output" });
  });
});
