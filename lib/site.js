const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

function filterTable() {
  /**
   * @type {NodeListOf<HTMLInputElement>}
   */
  const checkedLicenseFilters = $$('.license-filters input[type="checkbox"]:checked');

  const checkedLicenses = Array.from(checkedLicenseFilters).map((cb) => cb.value);

  const showDirect = /** @type {HTMLInputElement} */ ($("#filterDirect")).checked;

  const showTransitive = /** @type {HTMLInputElement} */ ($("#filterTransitive")).checked;

  /**
   * @type {NodeListOf<HTMLTableRowElement>}
   */
  const rows = $$("#license-details-body tr");
  rows.forEach((row) => {
    const license = row.getAttribute("data-license");
    if (
      license &&
      checkedLicenses.includes(license) &&
      ((showDirect && row.getAttribute("data-type") === "direct") ||
        (showTransitive && row.getAttribute("data-type") === "transitive"))
    ) {
      row.style.display = "";
    } else {
      row.style.display = "none";
    }
  });
}

function attachFilterListeners() {
  const checkboxes = $$('.license-filters input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      filterTable();
    });
  });

  $("#selectAll")?.addEventListener("change", (e) => {
    const checked = e.target.checked;
    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked;
    });
    filterTable();
  });

  $("#filterDirect")?.addEventListener("change", (e) => {
    filterTable();
  });

  $("#filterTransitive")?.addEventListener("change", (e) => {
    filterTable();
  });
}

document.addEventListener("DOMContentLoaded", attachFilterListeners);
