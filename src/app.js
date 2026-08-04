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

function renderResults({ checked, errors, headers, rejectedRows, sheetName, sheetWarning }) {
  const errorRowCount = new Set(errors.map(e => e.row)).size;
  const cleanRows = checked - errorRowCount;

  document.getElementById('dropZone').style.display = 'none';
  document.getElementById('statusBar').style.display = 'none';
  document.getElementById('results').style.display = 'block';

  let sheetNote = '';
  if (sheetWarning) {
    sheetNote = `<div class="status-bar error" style="display:block;margin-bottom:1rem">
      <i class="ti ti-alert-triangle"></i> ${escapeHtml(sheetWarning)}
    </div>`;
  } else if (sheetName) {
    sheetNote = `<div class="sheet-note">Validated sheet: <b>${escapeHtml(sheetName)}</b></div>`;
  }
  document.getElementById('sheetNote').innerHTML = sheetNote;

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

  document.getElementById('dlBtn').onclick = () => downloadErrorReport(errors);
  document.getElementById('dlRejBtn').onclick = () => downloadRejectionTemplate(headers, rejectedRows);
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function csvCell(val) {
  const s = val === null || val === undefined ? '' : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

// Original error report: one row per issue (Row / Field / Value / Issue)
function downloadErrorReport(errors) {
  const header = ['Row', 'Field', 'Value Found', 'Issue'];
  const rows = [header.join(',')];
  if (errors.length === 0) {
    rows.push('No errors found.');
  } else {
    errors.forEach(e => {
      rows.push([e.row, csvCell(e.field), csvCell(e.value), csvCell(e.issue)].join(','));
    });
  }
  triggerDownload(rows.join('\n'), 'lead_validation_errors.csv');
}

// Rejection template: one row per rejected lead, original columns preserved,
// "Reason" column prepended — matches the MaSH rejection export format.
function downloadRejectionTemplate(headers, rejectedRows) {
  const cols = ['Reason', ...headers];
  const rows = [cols.map(csvCell).join(',')];
  rejectedRows.forEach(({ rawRow, reasons }) => {
    const reason = reasons.join(' | ');
    // pad rawRow to header length in case some rows are shorter
    const padded = headers.map((_, i) => rawRow[i] !== undefined ? rawRow[i] : '');
    rows.push([csvCell(reason), ...padded.map(csvCell)].join(','));
  });
  triggerDownload(rows.join('\n'), 'rejected_leads.csv');
}

function triggerDownload(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function selectTargetSheet(workbook) {
  const target = RULES.TARGET_SHEET_NAME.trim().toLowerCase();
  const matchName = workbook.SheetNames.find(name => name.trim().toLowerCase() === target);
  if (matchName) {
    return { sheetName: matchName, usedFallback: false };
  }
  return { sheetName: workbook.SheetNames[0], usedFallback: true };
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

      const { sheetName, usedFallback } = selectTargetSheet(wb);
      const ws = wb.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      const result = Validator.validateLeadData(data);
      if (result.emptyFile) {
        setStatus('File appears empty or has no data rows.', 'error');
        return;
      }

      if (usedFallback) {
        result.sheetWarning = `No sheet named "${RULES.TARGET_SHEET_NAME}" was found — validated the first sheet ("${sheetName}") instead.`;
      } else {
        result.sheetWarning = null;
      }
      result.sheetName = sheetName;
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

  document.getElementById('browseLink').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });
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
