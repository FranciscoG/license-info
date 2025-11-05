import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getArgs } from "../lib/args.js";

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
    assert.equal(args.output, '"custom-output.html"');
    assert.equal(args.open, false);
  });

  it(`should parse with quotes '--output="<value>"'`, () => {
    const args = getArgs(['--output="custom-output.html"']);
    assert.equal(args.output, '"custom-output.html"');
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
