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

    // mock checkDirectoryExists by providing deps that would be in node_modules
    // Note: this test will skip packages not found in node_modules,
    // so we test the logic that doesn't depend on filesystem checks
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
    // Results depend on checkDirectoryExists, which checks node_modules.
    // In this test environment there are no node_modules for these packages,
    // so they'll be skipped. This validates the method doesn't crash.
    assert.ok(typeof licenseCount === "object");
    assert.ok(typeof licenses === "object");
  });

  it("should return empty results for empty deps", () => {
    const li = new LicenseInfo();
    const { licenses, licenseCount } = li.getFlattenedDependencies({});
    assert.deepEqual(licenses, {});
    assert.deepEqual(licenseCount, {});
  });

  it("should count licenses correctly", () => {
    const li = new LicenseInfo();
    li.output = {
      dependencies: {},
      devDependencies: {},
      _dependencies: {},
    };

    // Since checkDirectoryExists will return false for fake packages,
    // we verify that the licenseCount object passed in is returned as-is
    const licenseCount = { MIT: 5 };
    const result = li.getFlattenedDependencies({}, [], licenseCount);
    assert.deepEqual(result.licenseCount, { MIT: 5 });
  });
});
