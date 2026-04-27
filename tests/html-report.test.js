import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildHtmlReport } from "../lib/html-report.js";

describe("buildHtmlReport", () => {
  /**
   * Helper to create a minimal LicenseInfo-shaped object for testing.
   */
  function makeLicenseInfo(licenses = [], licenseCount = {}) {
    return { licenses, licenseCount };
  }

  it("should return a valid HTML string", () => {
    const html = buildHtmlReport(makeLicenseInfo());
    assert.ok(html.includes("<!DOCTYPE html>"));
    assert.ok(html.includes("<html"));
    assert.ok(html.includes("</html>"));
  });

  it("should inject license data into the report", () => {
    const licenses = [
      { name: "test-pkg", license: "MIT", version: "1.0.0", type: "dependency", trees: [["test-pkg@1.0.0"]] },
    ];
    const licenseCount = { MIT: 1 };
    const html = buildHtmlReport(makeLicenseInfo(licenses, licenseCount));
    assert.ok(html.includes('"test-pkg"'));
    assert.ok(html.includes('"MIT"'));
  });

  it("should escape </script> in package data to prevent XSS", () => {
    const licenses = [
      {
        name: '</script><script>alert("xss")</script>',
        license: "MIT",
        version: "1.0.0",
        type: "dependency",
        trees: [[]],
      },
    ];
    const html = buildHtmlReport(makeLicenseInfo(licenses, { MIT: 1 }));
    // The literal </script> should NOT appear inside the script block's data
    // It should be escaped to <\/script>
    assert.ok(!html.includes('</script><script>alert'));
    assert.ok(html.includes("<\\/script>"));
  });

  it("should escape </script> in license count keys", () => {
    const licenseCount = { '</script><img src=x onerror=alert(1)>': 1 };
    const html = buildHtmlReport(makeLicenseInfo([], licenseCount));
    assert.ok(!html.includes('</script><img'));
  });
});
