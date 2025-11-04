import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getArgs } from "../lib/args.js";

describe("getArgs", () => {
  it("should return default values when no arguments are provided", () => {
    const args = getArgs([]);
    assert.equal(args.output, "./license-report.html");
    assert.equal(args.open, false);
  });

  it("should parse --open argument", () => {
    const args = getArgs(["--open"]);
    assert.equal(args.output, "./license-report.html");
    assert.equal(args.open, true);
  });

  it("should parse --output argument", () => {
    const args = getArgs(["--output", "custom-output.html"]);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, false);
  });

  it("should parse --output=argument", () => {
    const args = getArgs(["--output=custom-output.html"]);
    assert.equal(args.output, "custom-output.html");
    assert.equal(args.open, false);
  });
});
