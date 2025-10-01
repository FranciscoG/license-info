import { LicenseInfo, UNKNOWN_LICENSE } from "./license-info.js";
import fs from "node:fs";

/**
 * I'm loading the `site.js` as a string and embedding it in the HTML. I'm doing
 * this so I can develop the script in vscode with syntax highlighting and
 * linting and have it as a separate file for easier editing.
 */
const siteScript = fs.readFileSync(new URL("./site.js", import.meta.url), "utf-8");

/**
 * Create an SPDX license link
 * @param {string} id - License identifier
 * @returns {string} HTML link to SPDX license page
 */
const spdxLink = (id) => `<a target="_blank" href="https://spdx.org/licenses/${id}.html">${id}</a>`;
const spdxOperators = ["AND", "OR", "WITH"];
const spdxRegex = new RegExp(`\\s+(${spdxOperators.join("|")})\\s+`, "g");

/**
 * Linkify a license name if possible to https://spdx.org/licenses/
 *
 * There are packages that handle parsing SPDX expressions
 * (like https://www.npmjs.com/package/spdx-expression-parse)
 * but because I want to keep this script dependency-free,
 * I'm implementing a simple parser that handles the most common cases.
 *
 * @param {string} license
 * @returns {string} HTML-formatted license with links
 */
function linkifyLicense(license) {
  if (license === UNKNOWN_LICENSE || license.toUpperCase().startsWith("SEE LICENSE")) {
    return license;
  }

  // Handle complex license expressions
  // (BSD-2-Clause OR MIT OR Apache-2.0)
  // (MIT AND CC0-1.0)
  // (GPL-2.0+ WITH Bison-exception-2.2)
  // for now it will not handle nested parentheses: (MIT AND (LGPL-2.1+ AND BSD-3-Clause))
  if (license.startsWith("(") && license.endsWith(")")) {
    // remove the outer parentheses and process the inner expression
    const inner = license.slice(1, -1);

    // if the inner expressions still contains parentheses, we won't try to parse it further
    if (inner.includes("(")) {
      // just link them to the main list of licenses and they can search there
      return `<a target="_blank" href="https://spdx.org/licenses/">${license}</a>`;
    }

    // split by AND/OR/WITH and linkify each part and bring it back to
    // together with the original operator
    return inner
      .split(spdxRegex)
      .filter((x) => !!x.trim())
      .map((part) => {
        part = part.trim();
        if (spdxOperators.includes(part)) {
          return ` ${part} `;
        }
        return spdxLink(part);
      })
      .join("");
  }

  return spdxLink(license);
}

/**
 *
 * @param {LicenseInfo} licenseInfo
 * @returns {string}
 */
function buildFilters(licenseInfo) {
  return Object.keys(licenseInfo.licenseCount)
    .sort()
    .map(
      (license) => `
            <label class="${license === UNKNOWN_LICENSE ? "unknown-license" : ""}">
              <input type="checkbox" value="${license}" checked>
              ${license} (${licenseInfo.licenseCount[license]})
            </label>
          `
    )
    .join("");
}

/**
 *
 * @param {LicenseInfo} licenseInfo
 */
function buildRows(licenseInfo) {
  return licenseInfo.licenses
    .map(
      (info) => `
            <tr data-license="${info.license}" data-type="${info.type}">
              <td>
                <details>
                  <summary>${info.name}</summary>
                  <span>
                    ${info.tree
                      .map(
                        (node, index) =>
                          `<code style="padding-left: ${index * 20}px;">${node}</code>`
                      )
                      .join("")}
                  </span>
                </details>
              </td>
              <td>
                <a class="registry-link" 
                   target="_blank" 
                   href="https://www.npmjs.com/package/${info.name}">npm</a>
              </td>
              <td>${info.version}</td>
              <td>${linkifyLicense(info.license)}</td>
              <td class="type-cell">
                <span class="pill ${info.type}">${info.type}</span>
                ${info.isDev ? '<span class="pill dev">dev</span>' : ""}
              </td>
            </tr>
          `
    )
    .join("");
}

/**
 * @param {import('./license-info.js').LicenseInfo} licenseInfo
 * @returns {string} HTML report
 */
export function buildHtmlReport(licenseInfo) {
  let html = `
  <html>
    <head>
      <title>Dependency Licenses</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background: #f4fbfd; }
        fieldset { margin-bottom: 1rem; }
        legend { font-weight: bold; }

        .license-filters {
          column-count: 3;
          column-gap: 20px;
          border-top: 1px solid #ccc;
          padding-top: 7px;
        }
        label {
          display: block;
          margin-bottom: 5px;
        }
        .type-cell {
          white-space: nowrap;
          gap: 5px;
        }
        .pill {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 12px;
          color: white;
          font-size: 0.7rem;
          text-align: center;
          text-transform: capitalize;
        }
        .pill.direct { background-color: #4CAF50; }
        .pill.transitive { background-color: #2196F3; }
        .pill.dev { background-color: #FF9800; }
        thead {
          background-color: #f2f2f2;
          position: sticky;
          top: 0;
        }
        code { display: block; }
        .unknown-license { color: red; font-weight: bold; }
        .registry-link { font-size: 0.8rem; }
      </style>
    </head>
    <body>
      <h1>Dependency Licenses</h1>
      <form>
        <fieldset>
          <legend>Filter by License</legend>
          <label>
            <input id="selectAll" type="checkbox" value="ALL" checked>
            Select All
          </label>
          <div class="license-filters">
            ${buildFilters(licenseInfo)}
          </div>
        </fieldset>
        <fieldset>
          <legend>Filter by Dependency Type</legend>
          <label>
            <input id="filterDirect" type="checkbox" value="direct" checked>
            Direct (${licenseInfo.installedByUser})
          </label>
          <label>
            <input id="filterTransitive" type="checkbox" value="transitive" checked>
            Transitive (${licenseInfo.transitiveCount})
          </label>
        </fieldset>
      </form>
      <table>
        <thead>
          <tr>
            <th>Package</th>
            <th>Link</th>
            <th>Version</th>
            <th>License</th>
            <th>Type</th>
          </tr>
        </thead>
        <tbody id="license-details-body">
          ${buildRows(licenseInfo)}
        </tbody>
      </table>
      <script>
        ${siteScript}
      </script>
    </body>
  </html>
  `;
  return html;
}
