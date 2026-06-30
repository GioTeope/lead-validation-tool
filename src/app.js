/**
 * app.js
 * -----------------------------------------------------------------------
 * UI wiring: file upload (drag/drop + browse), rendering results, and
 * the CSV error-report download. Delegates all actual rule-checking to
 * validator.js.
 * -----------------------------------------------------------------------
 */

function setStatus(msg, type) {
  const bar = document.getElementById('statusBar');
  bar.style.display = 'block';
  bar.className = 'status-bar ' + type;
  bar.innerHTML = msg;
}

function resetTool() {
  document.getElementById('results').style.display = 'none';
  document.getElementById('statusBar').style.display = 'none';
  document.getElementById('fileIn').value = '';
  document.getElementById('dropZone').style.display = '';
}

function renderResults({ checked, errors }) {
  const errorRowCount = new Set(errors.map(e => e.row)).size;
  const cleanRows = checked - errorRowCount;

  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('statusBar').style.display = 'none';
  document.getElementById('results').style.display = 'block';

  document.getElementById('summaryGrid').innerHTML = `
    <div class="metric"><div class="label">Rows checked</div><div class="val">${checked}</div></div>
    <div class="metric ok"><div class="label">Clean rows</div><div class="val">${cleanRows}</div></div>
    <div class="metric bad"><div class="label">Rows with errors</div><div class="val">${errorRowCount}</div></div>
    <div class="metric warn"><div class="label">Total issues</div><div class="val">${errors.length}</div></div>
  `;

  const tbody = document.getElementById('errBody');
  if (errors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state"><i class="ti ti-circle-check"></i> No issues found — all rows passed validation.</td></tr>`;
  } else {
    tbody.innerHTML = errors.map(e => `
      <tr>
        <td class="muted">${e.row}</td>
        <td><span class="badge ${e.type}">${escapeHtml(e.field)}</span></td>
        <td class="value-cell">${escapeHtml(e.value)}</td>
        <td>${escapeHtml(e.issue)}</td>
      </tr>`).join('');
  }

  document.getElementById('dlBtn').onclick = () => downloadCsv(errors);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function downloadCsv(errors) {
  const header = ['Row', 'Field', 'Value', 'Issue'];
  const rows = [header.join(',')];
  if (errors.length === 0) {
    rows.push('No errors found.');
  } else {
    errors.forEach(e => {
      rows.push([
        e.row,
        `"${e.field}"`,
        `"${String(e.value).replace(/"/g, '""')}"`,
        `"${e.issue}"`
      ].join(','));
    });
  }
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lead_validation_errors.csv';
  a.click();
}

function handleFile(file) {
  if (!file) {
    setStatus('No file selected.', 'error');
    return;
  }
  const ext = file.name.split('.').pop().toLowerCase();
  setStatus(`<i class="ti ti-loader"></i> Reading <b>${escapeHtml(file.name)}</b>...`, 'info');

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb = ext === 'csv'
        ? XLSX.read(e.target.result, { type: 'string' })
        : XLSX.read(e.target.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const result = Validator.validateLeadData(data);
      if (result.emptyFile) {
        setStatus('File appears empty or has no data rows.', 'error');
        return;
      }
      renderResults(result);
    } catch (err) {
      console.error(err);
      setStatus('Could not read file. Make sure it is a valid .xlsx or .csv.', 'error');
    }
  };

  if (ext === 'csv') reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

// --- Event wiring ---
document.addEventListener('DOMContentLoaded', () => {
  const dz = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileIn');

  document.getElementById('browseLink').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => handleFile(e.target.files[0]));

  dz.addEventListener('click', () => fileInput.click());
  dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', e => {
    e.preventDefault();
    dz.classList.remove('drag');
    handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById('resetBtn').addEventListener('click', resetTool);
});
