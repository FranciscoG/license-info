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

  it("should log dependency and devDependency sections separately", () => {
    const lines = captureLog(() => {
      logSummary({
        dependencyLicenseCount: { MIT: 10, ISC: 3 },
        devDependencyLicenseCount: { MIT: 4, "Apache-2.0": 1 },
      });
    });
    const joined = lines.join("\n");
    assert.match(joined, /From dependencies:/);
    assert.match(joined, /From devDependencies:/);

    const depIndex = lines.findIndex((l) => l.includes("From dependencies:"));
    const devIndex = lines.findIndex((l) => l.includes("From devDependencies:"));
    // MIT:10 should appear between the dep heading and the devDep heading
    const mit10Index = lines.findIndex((l) => l.includes("MIT") && l.includes("10"));
    const mit4Index = lines.findIndex((l) => l.includes("MIT") && l.includes("4"));
    assert.ok(mit10Index > depIndex && mit10Index < devIndex);
    assert.ok(mit4Index > devIndex);
  });

  it("should display UNKNOWN at the end of each section", () => {
    const lines = captureLog(() => {
      logSummary({
        dependencyLicenseCount: { MIT: 5, UNKNOWN: 2, ISC: 1 },
        devDependencyLicenseCount: {},
      });
    });
    const mitIndex = lines.findIndex((l) => l.includes("MIT"));
    const unknownIndex = lines.findIndex((l) => l.includes("UNKNOWN"));
    assert.ok(unknownIndex > mitIndex, "UNKNOWN should appear after other licenses");
  });

  it("should handle empty counts with a (none) marker per section", () => {
    const lines = captureLog(() => {
      logSummary({ dependencyLicenseCount: {}, devDependencyLicenseCount: {} });
    });
    const noneLines = lines.filter((l) => l.includes("(none)"));
    assert.equal(noneLines.length, 2);
  });

  it("should align license names across both sections", () => {
    const lines = captureLog(() => {
      logSummary({
        dependencyLicenseCount: { MIT: 1 },
        devDependencyLicenseCount: { "Apache-2.0": 2 },
      });
    });
    // MIT (3 chars) padded to 10 chars ("Apache-2.0".length)
    const mitLine = lines.find((l) => l.includes("MIT"));
    assert.ok(mitLine);
    assert.ok(mitLine.includes("MIT       "));
  });

  it("should tolerate a licenseInfo with only one of the counts populated", () => {
    const lines = captureLog(() => {
      logSummary({ dependencyLicenseCount: { MIT: 1 } });
    });
    assert.ok(lines.some((l) => l.includes("(none)")));
  });
});
