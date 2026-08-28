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

function getComplianceRules() {
  const prdRef = (document.getElementById('prdRef')?.value || '').trim();
  const excludedRaw = (document.getElementById('excludedCountries')?.value || '').trim();
  const dateCutoff = (document.getElementById('dateCutoff')?.value || '').trim();
  const dateColumnName = (document.getElementById('dateColumnName')?.value || '').trim();
  const originalNote = (document.getElementById('complianceNote')?.value || '').trim();

  const excludedCountries = excludedRaw
    ? excludedRaw.split(',').map(c => c.trim()).filter(Boolean)
    : [];

  const hasRules = prdRef || excludedCountries.length > 0 || dateCutoff || originalNote;

  return hasRules
    ? { prdRef, excludedCountries, dateCutoff, dateColumnName, originalNote }
    : null;
}

function updateComplianceSummary() {
  const rules = getComplianceRules();
  const el = document.getElementById('complianceSummary');
  if (!el) return;
  if (!rules) { el.style.display = 'none'; return; }
  const parts = [];
  if (rules.prdRef) parts.push(`<strong>PRD:</strong> ${escapeHtml(rules.prdRef)}`);
  if (rules.excludedCountries.length) parts.push(`<strong>Excluded:</strong> ${rules.excludedCountries.map(escapeHtml).join(', ')}`);
  if (rules.dateCutoff) parts.push(`<strong>DNC cutoff:</strong> ${escapeHtml(rules.dateCutoff)}`);
  el.innerHTML = '✓ Compliance rules active — ' + parts.join(' &nbsp;·&nbsp; ');
  el.style.display = parts.length ? 'block' : 'none';
}

function resetTool() {
  document.getElementById('results').style.display = 'none';
  document.getElementById('statusBar').style.display = 'none';
  document.getElementById('fileIn').value = '';
  document.getElementById('dropZone').style.display = '';
  document.getElementById('programStatusBreakdown').style.display = 'none';
  const ca = document.getElementById('complianceAudit');
  if (ca) ca.style.display = 'none';
  // Reset Step 2
  document.getElementById('step2Section').style.display = 'none';
  document.getElementById('step2Status').style.display = 'none';
  document.getElementById('step2Actions').style.display = 'none';
  document.getElementById('fileIn2').value = '';
  _rejectedEmailSet = new Set();
}

function renderResults({ checked, errors, headers, rejectedRows, programStatusCounts, compliance, sheetName, sheetWarning }) {
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

  // Compliance audit block
  const compAuditEl = document.getElementById('complianceAudit');
  if (compAuditEl) {
    if (compliance) {
      const complianceErrors = errors.filter(e => e.type === 'compliance');
      const lines = [];
      if (compliance.prdRef) lines.push(`<p><strong>Approval ref:</strong> ${escapeHtml(compliance.prdRef)}</p>`);
      if (compliance.excludedCountries && compliance.excludedCountries.length)
        lines.push(`<p><strong>Excluded countries:</strong> ${compliance.excludedCountries.map(escapeHtml).join(', ')}</p>`);
      if (compliance.dateCutoff)
        lines.push(`<p><strong>DNC cutoff date:</strong> ${escapeHtml(compliance.dateCutoff)}</p>`);
      if (complianceErrors.length)
        lines.push(`<p><strong>Compliance violations:</strong> ${complianceErrors.length} lead(s) flagged</p>`);
      if (compliance.originalNote)
        lines.push(`<div class="note-text"><strong>Note:</strong> ${escapeHtml(compliance.originalNote)}</div>`);
      compAuditEl.innerHTML = `<h4>Compliance rules applied</h4>${lines.join('')}`;
      compAuditEl.style.display = 'block';
    } else {
      compAuditEl.style.display = 'none';
    }
  }

  document.getElementById('summaryGrid').innerHTML = `
    <div class="metric"><div class="label">Rows checked</div><div class="val">${checked}</div></div>
    <div class="metric ok"><div class="label">Clean rows</div><div class="val">${cleanRows}</div></div>
    <div class="metric bad"><div class="label">Rows with errors</div><div class="val">${errorRowCount}</div></div>
    <div class="metric warn"><div class="label">Total issues</div><div class="val">${errors.length}</div></div>
  `;

  // Program Status breakdown
  const psEl = document.getElementById('programStatusBreakdown');
  const psCount = Object.keys(programStatusCounts || {}).length;
  if (psCount > 0) {
    // Sort by count descending
    const sorted = Object.entries(programStatusCounts).sort((a, b) => b[1] - a[1]);
    const rows = sorted.map(([status, count]) => `
      <div class="ps-row">
        <span class="ps-label">${escapeHtml(status)}</span>
        <span class="ps-bar-wrap"><span class="ps-bar" style="width:${Math.round(count/checked*100)}%"></span></span>
        <span class="ps-count">${count.toLocaleString()}</span>
        <span class="ps-pct">${Math.round(count/checked*100)}%</span>
      </div>`).join('');
    psEl.innerHTML = `<div class="section"><h3>Program Status breakdown</h3><div class="ps-list">${rows}</div></div>`;
    psEl.style.display = 'block';
  } else {
    psEl.style.display = 'none';
    psEl.innerHTML = '';
  }

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

  document.getElementById('dlBtn').onclick = (e) => downloadErrorReport(errors, e.currentTarget);
  document.getElementById('dlRejBtn').onclick = (e) => downloadRejectionTemplate(headers, rejectedRows, e.currentTarget);

  // Reveal Step 2 if there are rejected leads to clean up
  if (rejectedRows.size > 0) {
    document.getElementById('step2Section').style.display = 'block';
    document.getElementById('step2Count').textContent = rejectedRows.size;
  }
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function csvCell(val) {
  const s = val === null || val === undefined ? '' : String(val);
  return `"${s.replace(/"/g, '""')}"`;
}

// ── Format picker modal ──────────────────────────────────────────────────────
// Shows a small inline picker (CSV / Excel / TXT) and calls back with the
// chosen format so the caller can produce the right file.

function showFormatPicker(anchorBtn, callback) {
  // Remove any existing picker
  const existing = document.getElementById('formatPicker');
  if (existing) { existing.remove(); if (existing._anchor === anchorBtn) return; }

  const picker = document.createElement('div');
  picker.id = 'formatPicker';
  picker._anchor = anchorBtn;
  picker.style.cssText = `
    position:absolute; background:var(--surface-2); border:1px solid var(--border-strong);
    border-radius:var(--radius); box-shadow:0 4px 16px rgba(0,0,0,.12);
    padding:6px; display:flex; flex-direction:column; gap:4px; z-index:999;
    min-width:160px; font-family:inherit;
  `;

  const formats = [
    { label: '📊  Excel (.xlsx)', fmt: 'xlsx' },
    { label: '📄  CSV (.csv)',    fmt: 'csv'  },
    { label: '📝  Text (.txt)',   fmt: 'txt'  },
  ];

  formats.forEach(({ label, fmt }) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.cssText = `
      text-align:left; padding:7px 12px; border:none; background:none;
      border-radius:6px; cursor:pointer; font-size:13px; color:var(--text-primary);
      font-family:inherit;
    `;
    btn.onmouseover = () => btn.style.background = 'var(--surface-1)';
    btn.onmouseout  = () => btn.style.background = 'none';
    btn.onclick = () => { picker.remove(); callback(fmt); };
    picker.appendChild(btn);
  });

  // Position below the anchor button
  document.body.appendChild(picker);
  const rect = anchorBtn.getBoundingClientRect();
  picker.style.top  = (window.scrollY + rect.bottom + 6) + 'px';
  picker.style.left = (window.scrollX + rect.left) + 'px';

  // Close on outside click
  setTimeout(() => {
    document.addEventListener('click', function close(e) {
      if (!picker.contains(e.target)) { picker.remove(); document.removeEventListener('click', close); }
    });
  }, 0);
}

// ── Download helpers ─────────────────────────────────────────────────────────

function buildTabDelimited(headers, dataRows) {
  return [headers.join('\t'), ...dataRows.map(r => r.join('\t'))].join('\n');
}

function buildCsv(headers, dataRows) {
  return [
    headers.map(csvCell).join(','),
    ...dataRows.map(r => r.map(csvCell).join(','))
  ].join('\n');
}

function buildXlsx(headers, dataRows) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

function triggerDownload(content, filename, isArray) {
  const mime = isArray
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/plain';
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportFile(fmt, baseName, headers, dataRows) {
  if (fmt === 'xlsx') {
    triggerDownload(buildXlsx(headers, dataRows), baseName + '.xlsx', true);
  } else if (fmt === 'txt') {
    triggerDownload(buildTabDelimited(headers, dataRows), baseName + '.txt', false);
  } else {
    triggerDownload(buildCsv(headers, dataRows), baseName + '.csv', false);
  }
}

// ── Error report: one row per issue ─────────────────────────────────────────
function downloadErrorReport(errors, anchorBtn) {
  const headers = ['Row', 'Field', 'Value Found', 'Issue'];
  const dataRows = errors.length === 0
    ? [['—', '—', '—', 'No errors found']]
    : errors.map(e => [String(e.row), e.field, String(e.value), e.issue]);

  showFormatPicker(anchorBtn, fmt => exportFile(fmt, 'lead_validation_errors', headers, dataRows));
}

// ── Rejection template: one row per rejected lead ────────────────────────────
function downloadRejectionTemplate(fileHeaders, rejectedRows, anchorBtn) {
  const headers = ['Reason', ...fileHeaders];
  const dataRows = [];
  rejectedRows.forEach(({ rawRow, reasons }) => {
    const reason = reasons.join(' | ');
    const padded = fileHeaders.map((_, i) => rawRow[i] !== undefined ? String(rawRow[i]) : '');
    dataRows.push([reason, ...padded]);
  });

  showFormatPicker(anchorBtn, fmt => exportFile(fmt, 'rejected_leads', headers, dataRows));
}

function selectTargetSheet(workbook) {
  const target = RULES.TARGET_SHEET_NAME.trim().toLowerCase();
  const matchName = workbook.SheetNames.find(name => name.trim().toLowerCase() === target);
  if (matchName) {
    return { sheetName: matchName, usedFallback: false };
  }
  return { sheetName: workbook.SheetNames[0], usedFallback: true };
}

// Stores the set of rejected emails after Step 1 — used in Step 2
let _rejectedEmailSet = new Set();

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

      const compliance = getComplianceRules();
      const result = Validator.validateLeadData(data, compliance);
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

      // Build rejected email set for Step 2
      _rejectedEmailSet = new Set();
      result.rejectedRows.forEach(({ rawRow }) => {
        const emailIdx = result.headers.findIndex(h =>
          RULES.COLUMN_ALIASES.email.some(a => a.toLowerCase() === h.toLowerCase())
        );
        if (emailIdx > -1 && rawRow[emailIdx]) {
          _rejectedEmailSet.add(rawRow[emailIdx].toString().trim().toLowerCase());
        }
      });

      renderResults(result);
    } catch (err) {
      console.error(err);
      setStatus('Could not read file. Make sure it is a valid .xlsx or .csv.', 'error');
    }
  };

  if (ext === 'csv') reader.readAsText(file);
  else reader.readAsArrayBuffer(file);
}

// ── Step 2: Dashboard UTF-8 .txt cleanup ────────────────────────────────────

function parseTsv(text) {
  const lines = text.split(/\r?\n/);
  return lines.map(l => l.split('\t'));
}

function setStep2Status(msg, type) {
  const bar = document.getElementById('step2Status');
  bar.style.display = 'block';
  bar.className = 'status-bar ' + type;
  bar.innerHTML = msg;
}

function handleDashboardFile(file) {
  if (!file) return;

  // Hide previous results
  document.getElementById('step2Actions').style.display = 'none';
  setStep2Status(`<i class="ti ti-loader"></i> Reading <b>${escapeHtml(file.name)}</b>...`, 'info');

  // Guard: Step 1 must have been run first
  if (_rejectedEmailSet.size === 0) {
    setStep2Status('No rejected leads found from Step 1. Please validate a lead file first.', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const text = e.target.result;

      // ── Check 1: File is not empty
      if (!text || text.trim().length === 0) {
        setStep2Status('The uploaded file is empty.', 'error');
        return;
      }

      // ── Check 2: Looks tab-separated (not comma or pipe)
      const firstLine = text.split(/\r?\n/)[0];
      const tabCount   = (firstLine.match(/\t/g) || []).length;
      const commaCount = (firstLine.match(/,/g) || []).length;
      const pipeCount  = (firstLine.match(/\|/g) || []).length;
      if (tabCount === 0) {
        const likely = commaCount > 0 ? 'comma-separated (.csv)' : pipeCount > 0 ? 'pipe-separated' : 'unrecognised';
        setStep2Status(
          `This file does not appear to be tab-separated — it looks like a <b>${likely}</b> file. ` +
          `Please export the dashboard file as a tab-separated .txt.`,
          'error'
        );
        return;
      }

      const rows = parseTsv(text);
      const dataRows = rows.slice(1).filter(r => r.some(c => (c || '').trim() !== ''));

      // ── Check 3: Has data rows
      if (dataRows.length === 0) {
        setStep2Status('The file has a header row but no data rows.', 'error');
        return;
      }

      const headers = rows[0].map(h => (h || '').trim());

      // ── Check 4: Has an email column
      const emailIdx = headers.findIndex(h =>
        RULES.COLUMN_ALIASES.email.some(a => a.toLowerCase() === h.toLowerCase())
      );
      if (emailIdx === -1) {
        setStep2Status(
          `Could not find an email column in this file. ` +
          `Headers found: <b>${escapeHtml(headers.filter(Boolean).join(', '))}</b>. ` +
          `Expected a column named "Email Address" or "Email".`,
          'error'
        );
        return;
      }

      // ── Split into clean / removed
      const cleanRows   = [];
      const removedRows = [];
      const dashboardEmails = new Set();

      dataRows.forEach(row => {
        const email = ((row[emailIdx] || '')).toString().trim().toLowerCase();
        if (email) dashboardEmails.add(email);
        if (_rejectedEmailSet.has(email)) {
          removedRows.push(row);
        } else {
          cleanRows.push(row);
        }
      });

      // ── Check 5: Zero matches — likely wrong file
      if (removedRows.length === 0) {
        const rejectedList = [..._rejectedEmailSet].slice(0, 3).join(', ');
        setStep2Status(
          `<b>Warning — no rejected leads were found in this file.</b><br>` +
          `None of the ${_rejectedEmailSet.size} rejected email(s) from Step 1 appear in this dashboard export. ` +
          `This may mean you uploaded the wrong file.<br>` +
          `<small>Looking for: ${escapeHtml(rejectedList)}${_rejectedEmailSet.size > 3 ? '…' : ''}</small>`,
          'error'
        );
        return;
      }

      // ── Check 6: Partial match warning — some rejected emails not found in dashboard
      const notFoundInDashboard = [..._rejectedEmailSet].filter(e => !dashboardEmails.has(e));
      const partialWarning = notFoundInDashboard.length > 0
        ? `<br><small>⚠️ <b>${notFoundInDashboard.length}</b> rejected email(s) from Step 1 were not found in this file ` +
          `(they may already have been removed or belong to a different export): ` +
          `${escapeHtml(notFoundInDashboard.slice(0, 3).join(', '))}${notFoundInDashboard.length > 3 ? '…' : ''}</small>`
        : '';

      // ── Check 7: Row count sanity — dashboard file has far fewer rows than lead file
      // (Only warn, don't block — dashboard may legitimately have different counts)
      const step1Count = parseInt(document.getElementById('summaryGrid')
        ?.querySelector('.metric .val')?.textContent || '0', 10);
      const countWarning = (step1Count > 0 && dataRows.length < step1Count * 0.5)
        ? `<br><small>⚠️ This file has <b>${dataRows.length}</b> rows but the lead file had <b>${step1Count}</b> — ` +
          `double-check this is the correct dashboard export.</small>`
        : '';

      // ── All checks passed — show results
      setStep2Status(
        `✓ Done — <b>${dataRows.length}</b> rows processed. ` +
        `<b>${removedRows.length}</b> rejected lead(s) removed. ` +
        `<b>${cleanRows.length}</b> clean rows remaining.` +
        partialWarning + countWarning,
        removedRows.length > 0 && notFoundInDashboard.length === 0 ? 'success' : 'info'
      );

      document.getElementById('step2Actions').style.display = 'flex';

      document.getElementById('dlCleanBtn').onclick = () => {
        const content = [headers, ...cleanRows].map(r => r.join('\t')).join('\n');
        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'dashboard_cleaned.txt';
        a.click();
      };

      document.getElementById('dlRemovedBtn').onclick = () => {
        const content = [headers, ...removedRows].map(r => r.join('\t')).join('\n');
        const blob = new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'dashboard_removed.txt';
        a.click();
      };

    } catch (err) {
      console.error(err);
      setStep2Status('Could not read file. Make sure it is a valid UTF-8 .txt file.', 'error');
    }
  };

  reader.onerror = () => {
    setStep2Status('Failed to read the file — it may be locked or corrupted.', 'error');
  };

  reader.readAsText(file, 'UTF-8');
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

  // Compliance panel toggle
  const compToggle = document.getElementById('complianceToggle');
  const compFields = document.getElementById('complianceFields');
  if (compToggle && compFields) {
    compToggle.addEventListener('click', () => {
      const expanded = compToggle.getAttribute('aria-expanded') === 'true';
      compToggle.setAttribute('aria-expanded', String(!expanded));
      compToggle.innerHTML = expanded
        ? '<i class="ti ti-chevron-down"></i> Expand'
        : '<i class="ti ti-chevron-up"></i> Collapse';
      compFields.style.display = expanded ? 'none' : 'block';
    });
    // Live summary update as user types
    ['prdRef','excludedCountries','dateCutoff','dateColumnName','complianceNote'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateComplianceSummary);
    });
  }

  // Step 2 wiring
  const dz2 = document.getElementById('dropZone2');
  const fileInput2 = document.getElementById('fileIn2');

  document.getElementById('browseLink2').addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput2.click();
  });
  fileInput2.addEventListener('change', e => handleDashboardFile(e.target.files[0]));
  dz2.addEventListener('click', () => fileInput2.click());
  dz2.addEventListener('dragover', e => { e.preventDefault(); dz2.classList.add('drag'); });
  dz2.addEventListener('dragleave', () => dz2.classList.remove('drag'));
  dz2.addEventListener('drop', e => {
    e.preventDefault();
    dz2.classList.remove('drag');
    handleDashboardFile(e.dataTransfer.files[0]);
  });
});
