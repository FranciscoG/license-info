import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { logSummary } from "../lib/log-summary.js";

describe("logSummary", () => {
  /**
   * Captures console.log output during a callback.
   */
  function captureLog(fn) {
    const lines = [];
    const original = console.log;
    console.log = (...args) => lines.push(args.join(" "));
    try {
      fn();
    } finally {
      console.log = original;
    }
    return lines;
  }

  it("should log license counts", () => {
    const lines = captureLog(() => {
      logSummary({ licenseCount: { MIT: 10, ISC: 3 } });
    });
    assert.ok(lines.some((l) => l.includes("MIT") && l.includes("10")));
    assert.ok(lines.some((l) => l.includes("ISC") && l.includes("3")));
  });

  it("should display UNKNOWN at the end", () => {
    const lines = captureLog(() => {
      logSummary({ licenseCount: { MIT: 5, UNKNOWN: 2, ISC: 1 } });
    });
    // find the index of lines containing each license
    const mitIndex = lines.findIndex((l) => l.includes("MIT"));
    const unknownIndex = lines.findIndex((l) => l.includes("UNKNOWN"));
    assert.ok(unknownIndex > mitIndex, "UNKNOWN should appear after other licenses");
  });

  it("should handle empty licenseCount", () => {
    const lines = captureLog(() => {
      logSummary({ licenseCount: {} });
    });
    assert.ok(lines.some((l) => l.includes("License Summary")));
  });

  it("should pad license names for alignment", () => {
    const lines = captureLog(() => {
      logSummary({ licenseCount: { MIT: 1, "Apache-2.0": 2 } });
    });
    // MIT should be padded to match the length of "Apache-2.0"
    const mitLine = lines.find((l) => l.includes("MIT"));
    assert.ok(mitLine);
    // MIT (3 chars) padded to 10 chars ("Apache-2.0".length)
    assert.ok(mitLine.includes("MIT       "));
  });
});
