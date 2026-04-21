import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LicenseInfo, UNKNOWN_LICENSE } from "../lib/license-info.js";

describe("getLicense", () => {
  /** @type {LicenseInfo} */
  let li;

  // getLicense is an instance method so we need an instance, but
  // we skip initialize() since we're testing the method directly.
  li = new LicenseInfo();

  it("should return the license string when license is a string", () => {
    assert.equal(li.getLicense({ license: "MIT" }), "MIT");
  });

  it("should return the type when license is an object with type", () => {
    assert.equal(
      li.getLicense({ license: { type: "Apache-2.0", url: "https://example.com" } }),
      "Apache-2.0"
    );
  });

  it("should return joined types when licenses is an array", () => {
    assert.equal(
      li.getLicense({ licenses: [{ type: "MIT" }, { type: "ISC" }] }),
      "MIT, ISC"
    );
  });

  it("should return UNKNOWN when no license field exists", () => {
    assert.equal(li.getLicense({}), UNKNOWN_LICENSE);
  });

  it("should return UNKNOWN when license is null", () => {
    assert.equal(li.getLicense({ license: null }), UNKNOWN_LICENSE);
  });

  it("should return UNKNOWN when license is undefined", () => {
    assert.equal(li.getLicense({ license: undefined }), UNKNOWN_LICENSE);
  });

  it("should prefer license object over licenses array", () => {
    assert.equal(
      li.getLicense({
        license: { type: "BSD-3-Clause" },
        licenses: [{ type: "MIT" }],
      }),
      "BSD-3-Clause"
    );
  });

  it("should return empty string for empty licenses array", () => {
    // Note: an empty licenses array produces "" from the .map().join().
    // This means it won't fall through to UNKNOWN_LICENSE.
    assert.equal(li.getLicense({ licenses: [] }), "");
  });

  it("should handle SPDX expression strings", () => {
    assert.equal(li.getLicense({ license: "(MIT OR Apache-2.0)" }), "(MIT OR Apache-2.0)");
  });
});

describe("getFlattenedDependencies", () => {
  it("should flatten a simple dependency tree", () => {
    const li = new LicenseInfo();
    li.output = {
      dependencies: {},
      devDependencies: {},
      _dependencies: { "pkg-a": "^1.0.0" },
    };

    const deps = {
      "pkg-a": {
        license: "MIT",
        version: "1.0.0",
        dependencies: {
          "pkg-b": {
            license: "ISC",
            version: "2.0.0",
            dependencies: {},
          },
        },
      },
    };

    const { licenses, licenseCount } = li.getFlattenedDependencies(deps);
    assert.deepEqual(Object.keys(licenses).sort(), ["pkg-a@1.0.0", "pkg-b@2.0.0"]);
    assert.equal(licenses["pkg-a@1.0.0"].type, "dependency");
    assert.equal(licenses["pkg-b@2.0.0"].type, "transitive");
    assert.deepEqual(licenses["pkg-b@2.0.0"].trees, [["pkg-a@1.0.0", "pkg-b@2.0.0"]]);
    assert.deepEqual(licenseCount, { MIT: 1, ISC: 1 });
  });

  it("should dedupe packages reached via multiple paths and collect all trees", () => {
    const li = new LicenseInfo();
    li.output = {
      dependencies: {},
      devDependencies: {},
      _dependencies: { express: "^4.0.0" },
    };

    const deps = {
      express: {
        license: "MIT",
        version: "4.19.2",
        dependencies: {
          "body-parser": {
            license: "MIT",
            version: "1.20.2",
            dependencies: {
              depd: { license: "MIT", version: "2.0.0", dependencies: {} },
            },
          },
          depd: { license: "MIT", version: "2.0.0", dependencies: {} },
          "http-errors": {
            license: "MIT",
            version: "2.0.0",
            dependencies: {
              depd: { license: "MIT", version: "2.0.0", dependencies: {} },
            },
          },
        },
      },
    };

    const { licenses, licenseCount } = li.getFlattenedDependencies(deps);
    assert.equal(licenses["depd@2.0.0"].trees.length, 3);
    assert.deepEqual(licenses["depd@2.0.0"].trees, [
      ["express@4.19.2", "body-parser@1.20.2", "depd@2.0.0"],
      ["express@4.19.2", "depd@2.0.0"],
      ["express@4.19.2", "http-errors@2.0.0", "depd@2.0.0"],
    ]);
    // count should not double-count depd@2.0.0
    assert.equal(licenseCount.MIT, 4);
  });

  it("should return empty results for empty deps", () => {
    const li = new LicenseInfo();
    const { licenses, licenseCount } = li.getFlattenedDependencies({});
    assert.deepEqual(licenses, {});
    assert.deepEqual(licenseCount, {});
  });

  it("should preserve an existing licenseCount accumulator", () => {
    const li = new LicenseInfo();
    li.output = { dependencies: {}, devDependencies: {}, _dependencies: {} };
    const result = li.getFlattenedDependencies({}, [], {}, { MIT: 5 });
    assert.deepEqual(result.licenseCount, { MIT: 5 });
  });

  it("should count shared transitives in both scopes when invoked twice", () => {
    const li = new LicenseInfo();
    li.output = {
      dependencies: {},
      devDependencies: {},
      _dependencies: { "prod-root": "^1.0.0" },
    };
    li.output.devDependencies = { "dev-root": "^1.0.0" };

    const prodDeps = {
      "prod-root": {
        license: "MIT",
        version: "1.0.0",
        dependencies: {
          shared: { license: "MIT", version: "2.0.0", dependencies: {} },
        },
      },
    };
    const devDeps = {
      "dev-root": {
        license: "ISC",
        version: "1.0.0",
        dependencies: {
          shared: { license: "MIT", version: "2.0.0", dependencies: {} },
        },
      },
    };

    const licenses = {};
    const prodCount = {};
    const devCount = {};
    li.getFlattenedDependencies(prodDeps, [], licenses, prodCount);
    li.getFlattenedDependencies(devDeps, [], licenses, devCount);

    // shared@2.0.0 is deduped to a single row...
    assert.equal(licenses["shared@2.0.0"].trees.length, 2);
    // ...but counted once per scope.
    assert.equal(prodCount.MIT, 2);
    assert.equal(devCount.MIT, 1);
    assert.equal(devCount.ISC, 1);
  });
});

describe("initialize", () => {
  it("should exit with code 0 when there are no dependencies to process", async () => {
    const li = new LicenseInfo();
    li.getAllDependencies = () => Promise.resolve({});

    const originalExit = process.exit;
    const originalConsoleLog = console.log;
    const printedLogs = [];

    process.exit = ((code) => {
      throw new Error(`EXIT_${code}`);
    });
    console.log = ((...args) => {
      printedLogs.push(args.join(" "));
    });

    try {
      await assert.rejects(li.initialize(), {
        message: "EXIT_0",
      });

      const output = printedLogs.join("\n");
      assert.match(output, /No dependencies found/i);
      assert.match(output, /package-lock\.json/i);
    } finally {
      process.exit = originalExit;
      console.log = originalConsoleLog;
    }
  });
});
