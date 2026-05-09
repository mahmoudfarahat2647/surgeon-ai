export function getScripts(): string {
  return `
(function() {
  const search = document.getElementById('search');
  const sevFilter = document.getElementById('sev-filter');
  const modeFilter = document.getElementById('mode-filter');
  const table = document.getElementById('findings-table');

  function filterRows() {
    const q = search.value.toLowerCase();
    const sev = sevFilter.value;
    const mode = modeFilter.value;
    const rows = table.querySelectorAll('tbody tr:not(.detail-row)');
    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      const rowSev = row.dataset.severity;
      const rowMode = row.dataset.mode;
      const visible = (!q || text.includes(q)) && (!sev || rowSev === sev) && (!mode || rowMode === mode);
      row.classList.toggle('hidden', !visible);
      const next = row.nextElementSibling;
      if (next && next.classList.contains('detail-row')) {
        if (!visible) next.classList.add('hidden');
      }
    });
  }

  search.addEventListener('input', filterRows);
  sevFilter.addEventListener('change', filterRows);
  modeFilter.addEventListener('change', filterRows);

  // Click to expand/collapse detail row
  table.querySelectorAll('tbody tr:not(.detail-row)').forEach(row => {
    row.style.cursor = 'pointer';
    row.addEventListener('click', () => {
      const next = row.nextElementSibling;
      if (next && next.classList.contains('detail-row')) {
        next.classList.toggle('hidden');
      }
    });
  });

  // Sortable headers
  table.querySelectorAll('th').forEach((th, i) => {
    th.addEventListener('click', () => {
      const tbody = table.querySelector('tbody');
      const rows = Array.from(tbody.querySelectorAll('tr:not(.detail-row)'));
      rows.sort((a, b) => {
        const aText = a.cells[i]?.textContent ?? '';
        const bText = b.cells[i]?.textContent ?? '';
        return aText.localeCompare(bText);
      });
      rows.forEach(row => {
        tbody.appendChild(row);
        const next = row.nextElementSibling;
        if (next && next.classList.contains('detail-row')) tbody.appendChild(next);
      });
    });
  });
})();
`;
}
