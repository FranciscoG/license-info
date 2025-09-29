import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// This script generates a report of all dependencies and their licenses.
// It uses `npm ls --all --json --long` to get a full list of dependencies.
// Then it flattens the dependency tree and extracts license information.
// Finally, it generates an HTML report and saves it to disk.

// Note: We use spawn instead of execSync because the output of our npm ls command 
// is too large for execSync to handle.

class LicenseInfo {

  constructor() {
    this.userInstalledDeps = {};
    this.dependencies = {};
    this.licenses = {};
    this.licenseCount = {};
  }

  initialize() {
    return this.getAllDependencies().then((deps) => {
      this.dependencies = deps;
      this.userInstalledDeps = { ...deps._dependencies, ...deps.devDependencies };
      const { licenses, licenseCount } = this.getFlattenedDependencies(deps.dependencies);
      this.licenses = Object.values(licenses).sort((a, b) => a.name.localeCompare(b.name));
      this.licenseCount = licenseCount;
    });
  }

  get installedByUser() {
    return Object.keys(this.userInstalledDeps).length;
  }

  get transitiveCount() {
    return Object.keys(this.licenses).length - this.installedByUser;
  }

  getAllDependencies() {
    return new Promise((resolve) => {
      const script = spawn('npm', ['ls', '--all', '--json', '--long']);

      let result = [];
      script.stdout.on('data', (data) => {
        result.push(data);
      });
      script.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
      });
      script.on('close', (code) => {
        if (code !== 0) {
          console.log(`npm ls process exited with code ${code}`);
        }
        resolve(JSON.parse(Buffer.concat(result).toString()));
      });
    });
  }

  getLicense(pkg) {
    // old deprecated versions of package.json allowed the license field to be an object,
    // or even an array of objects using the "licenses" field. Here we handle those
    // old edge cases.

    if (pkg.license && typeof pkg.license === 'object' && pkg.license.type) {
      return pkg.license.type;
    }

    // sometimes license is an array of licenses
    if (pkg.licenses && Array.isArray(pkg.licenses)) {
      return pkg.licenses.map(l => l.type).join(', ');
    }

    // if license is a string, return it
    if (pkg.license) {
      return pkg.license;
    }

    return 'UNKNOWN';
  }

  getFlattenedDependencies(deps, parent = [], licenseCount = {}) {
    // recursively flatten the dependencies object and also count licenses
    let result = {};
    for (const [name, info] of Object.entries(deps)) {
      const license = this.getLicense(info).trim();
      const version = info.version ? `@${info.version}` : '';

      const key = `${name}${version}`;
      const tree = [...parent, key];

      result[key] = {
        name,
        license,
        isDev: this.dependencies.devDependencies && !!this.dependencies.devDependencies[name],
        version: version.replace(/^@/, ''),
        type: this.userInstalledDeps[name] ? 'direct' : 'transitive',
        tree,
      };

      licenseCount[license] = (licenseCount[license] || 0) + 1;

      if (info.dependencies) {
        result = { ...result, ...this.getFlattenedDependencies(info.dependencies, tree, licenseCount).licenses };
      }
    }
    return { licenses: result, licenseCount };
  }
}

const spdxLink = (id) => `<a target="_blank" href="https://spdx.org/licenses/${id}.html">${id}</a>`;
const spdxOperators = ['AND', 'OR', 'WITH'];
const spdxRegex = new RegExp(`\\s+(${spdxOperators.join('|')})\\s+`, 'g');

/**
 * Linkify a license name if possible to https://spdx.org/licenses/
 * 
 * There are packages that handle parsing SPDX expressions 
 * (like https://www.npmjs.com/package/spdx-expression-parse)
 * but because I want to keep this script dependency-free, 
 * I'm implementing a simple parser that handles the most common cases.
 * 
 * @param {string} license 
 */
function linkifyLicense(license) {
  if (license === 'UNKNOWN' || license.startsWith('SEE LICENSE')) {
    return license;
  }

  // Handle complex license expressions
  // (BSD-2-Clause OR MIT OR Apache-2.0) 
  // (MIT AND CC0-1.0)
  // (GPL-2.0+ WITH Bison-exception-2.2)
  // for now it will not handle nested parentheses: (MIT AND (LGPL-2.1+ AND BSD-3-Clause))
  if (license.startsWith('(') && license.endsWith(')')) {

    // remove the outer parentheses and process the inner expression
    const inner = license.slice(1, -1);

    // if the inner expressions still contains parentheses, we won't try to parse it further
    if (inner.includes('(')) {
      // just link them to the main list of licenses and they can search there
      return `<a target="_blank" href="https://spdx.org/licenses/">${license}</a>`;
    }

    // split by AND/OR/WITH and linkify each part and bring it back to together with the original operator
    return inner.split(spdxRegex).filter(x => !!x.trim()).map(part => {
      part = part.trim();
      if (spdxOperators.includes(part)) {
        return ` ${part} `;
      }
      return spdxLink(part);
    }).join('');
  }

  return spdxLink(license);
}

/**
 * @param {LicenseInfo} licenseInfo
 * @returns {string} HTML report
 */
function buildHtmlReport(licenseInfo) {
  let html = `
  <html>
    <head>
      <title>Dependency Licenses</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; }
        th, td { border: 1px solid #ddd; padding: 8px; }
        tr:nth-child(even) { background: #f4fbfd; }

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
          ${Object.keys(licenseInfo.licenseCount).sort().map(license => `
            <label class="${license === 'UNKNOWN' ? 'unknown-license' : ''}">
              <input type="checkbox" value="${license}" checked>
              ${license} (${licenseInfo.licenseCount[license]})
            </label>
          `).join('')}
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
          ${licenseInfo.licenses.map(info => `
            <tr data-license="${info.license}" data-type="${info.type}">
              <td>
                <details>
                  <summary>${info.name}</summary>
                  <span>
                    ${info.tree.map((node, index) => `
                      <code style="padding-left: ${index * 20}px;">${node}</code>
                    `).join('')}
                  </span>
                </details>
              </td>
              <td><a class="registry-link" target="_blank" href="https://www.npmjs.com/package/${info.name}">https://www.npmjs.com/package/${info.name}</a></td>
              <td>${info.version}</td>
              <td>${linkifyLicense(info.license)}</td>
              <td class="type-cell">
                <span class="pill ${info.type}">${info.type}</span>
                ${info.isDev ? '<span class="pill dev">dev</span>' : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <script>

        function filterTable() {
          const checkedLicenses = Array.from(document.querySelectorAll('.license-filters input[type="checkbox"]:checked')).map(cb => cb.value);
          const showDirect = document.getElementById('filterDirect').checked;
          const showTransitive = document.getElementById('filterTransitive').checked;

          const rows = document.querySelectorAll('#license-details-body tr');
          rows.forEach(row => {
            const license = row.getAttribute('data-license');
            if (checkedLicenses.includes(license) &&
                ((showDirect && row.getAttribute('data-type') === 'direct') ||
                 (showTransitive && row.getAttribute('data-type') === 'transitive'))) {
              row.style.display = '';
            } else {
              row.style.display = 'none';
            }
          });
        }
          
        function attachFilterListeners() {
          const checkboxes = document.querySelectorAll('.license-filters input[type="checkbox"]');
          checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
              filterTable();
            });
          });

          document.getElementById('selectAll').addEventListener('change', (e) => {
            const checked = e.target.checked;
            checkboxes.forEach(checkbox => {
              checkbox.checked = checked;
            });
            filterTable();
          });

          document.getElementById('filterDirect').addEventListener('change', (e) => {
            filterTable();
          });
          
          document.getElementById('filterTransitive').addEventListener('change', (e) => {
            filterTable();
          });
        }

        document.addEventListener('DOMContentLoaded', attachFilterListeners);
      </script>
    </body>
  </html>
  `;
  return html;
}

const licenseInfo = new LicenseInfo();
await licenseInfo.initialize();

const htmlReport = buildHtmlReport(licenseInfo);

const outputPath = path.join(process.cwd(), 'license-report.html');
fs.writeFileSync(outputPath, htmlReport);

console.log(`License report generated at ${outputPath}`);
