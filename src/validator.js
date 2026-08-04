/**
 * validator.js
 * -----------------------------------------------------------------------
 * Pure validation logic. No DOM access here — this file just takes
 * spreadsheet data in and returns a list of errors out, so it's easy to
 * test and reason about independently of the UI.
 * -----------------------------------------------------------------------
 */

function normalizeHeader(h) {
  if (!h) return '';
  return h.toString().trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex(h => normalizeHeader(h) === normalizeHeader(c));
    if (idx > -1) return idx;
  }
  return -1;
}

function isValidEmail(value) {
  if (!value) return { ok: false, msg: 'Email is blank' };
  const s = value.toString().trim();
  if (!s.includes('@') || s.startsWith('@') || s.endsWith('@')) {
    return { ok: false, msg: 'Invalid email format' };
  }
  const [, domain] = s.split('@');
  if (!domain || !domain.includes('.')) {
    return { ok: false, msg: 'Invalid email format' };
  }
  if (RULES.SCRUBBED_EMAILS.map(e => e.toLowerCase()).includes(s.toLowerCase())) {
    return { ok: false, msg: 'Scrubbed / blacklisted email address' };
  }
  if (RULES.BLOCKED_DOMAINS.map(d => d.toLowerCase()).includes(domain.toLowerCase())) {
    return { ok: false, msg: `Email domain "${domain}" is blocked` };
  }
  return { ok: true };
}

// Strips accents so "Étudiant" and "Etudiant" match the same way
function stripAccents(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isValidCompany(value) {
  if (!value || value.toString().trim() === '') {
    return { ok: false, msg: 'Company name is blank (must not be null)' };
  }
  const s = value.toString().trim();

  if (RULES.SYMBOL_ONLY_PATTERN.test(s)) {
    return { ok: false, msg: 'Company name contains only symbols/punctuation, no real text' };
  }
  if (s.length < 2) {
    return { ok: false, msg: 'Company name must be at least 2 characters' };
  }

  const sNorm = stripAccents(s.toLowerCase());

  const exactMatch = RULES.SCRUBBED_COMPANIES.some(c => stripAccents(c.toLowerCase()) === sNorm);
  if (exactMatch) {
    return { ok: false, msg: 'Invalid company name value' };
  }

  const keywordMatch = RULES.SCRUBBED_COMPANY_KEYWORDS.some(kw => sNorm.includes(stripAccents(kw.toLowerCase())));
  if (keywordMatch) {
    return { ok: false, msg: 'Company name contains a disallowed keyword (e.g. freelance/student/estudiante)' };
  }

  return { ok: true };
}

function isValidName(value, fieldLabel) {
  if (!value || value.toString().trim() === '') return { ok: true }; // blank names aren't flagged per template
  const s = value.toString().trim();
  if (/[a-zA-Z]/.test(s) && /[0-9]/.test(s)) {
    return { ok: false, msg: `${fieldLabel} should not contain alphanumeric values (e.g. Dev12)` };
  }
  if (s.includes('@')) {
    return { ok: false, msg: `${fieldLabel} should not contain an email address` };
  }
  return { ok: true };
}

function isValidJobTitle(value) {
  if (!value || value.toString().trim() === '') return { ok: true };
  const s = value.toString().trim();
  const sNorm = stripAccents(s.toLowerCase());

  const exactMatch = RULES.BAD_JOB_TITLES.some(t => stripAccents(t.toLowerCase()) === sNorm);
  if (exactMatch) {
    return { ok: false, msg: 'Job title is on the exclusion list (student / independent type)' };
  }

  const keywordMatch = RULES.BAD_JOB_TITLE_KEYWORDS.some(kw => sNorm.includes(stripAccents(kw.toLowerCase())));
  if (keywordMatch) {
    return { ok: false, msg: 'Job title contains a disallowed keyword (e.g. student)' };
  }

  return { ok: true };
}

function isNotBlank(value, fieldLabel) {
  if (!value || value.toString().trim() === '') {
    return { ok: false, msg: `${fieldLabel} should not be blank` };
  }
  return { ok: true };
}

/**
 * Validates a value against a reference list of { name, code } pairs.
 * Accepts either the full name or the code. Matching is case-insensitive
 * and ignores spaces/punctuation differences (e.g. "United States" matches
 * "UnitedStates", "Côte d'Ivoire" matches "CôtedIvoire").
 */
function normalizeForMatch(s) {
  return s.toString().trim().toLowerCase().replace(/[\s,.'’-]/g, '');
}

function isInReferenceList(value, fieldLabel, list) {
  if (!value || value.toString().trim() === '') {
    return { ok: false, msg: `${fieldLabel} should not be blank` };
  }
  const sNorm = normalizeForMatch(value);
  const sRaw = value.toString().trim().toLowerCase();
  const match = list.some(item =>
    normalizeForMatch(item.name) === sNorm || item.code.toLowerCase() === sRaw
  );
  if (!match) {
    return { ok: false, msg: `${fieldLabel} must be a valid value from the dropdown list` };
  }
  return { ok: true };
}

/**
 * Builds a set of known base language slugs (the first word of each language
 * name) derived from the LANGUAGES reference list, e.g. "french", "chinese",
 * "english". Used to validate the first segment of real-world language values.
 */
function buildBaseLanguageSlugs() {
  return new Set(
    REFERENCE_DATA.LANGUAGES.map(l => {
      const base = l.name.split(' - ')[0];
      return base.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    })
  );
}

/**
 * Validates the Language column using a pattern-based approach that handles
 * any {language}-{region} combination without needing a hardcoded list of
 * every variant.
 *
 * Valid formats (all lowercase, hyphens):
 *   - "{language}-{region}"            e.g. "chinese-china", "english-uk"
 *   - "{language}-{region} ({code})"   e.g. "french-france (fr-fr)"
 *   - "{language}-default ({code})"    e.g. "english-default (en-us)"
 *   - "{language}-default"             e.g. "english-default"
 *
 * The first segment must be a known language slug derived from the reference
 * list, so "klingon-default" still fails even though it matches the pattern.
 *
 * Plain name (e.g. "English") or code (e.g. "en-US") also accepted as fallback.
 */
function isValidLanguage(value) {
  if (!value || value.toString().trim() === '') {
    return { ok: false, msg: 'Language should not be blank' };
  }
  const s = value.toString().trim().toLowerCase();
  // Fallback: explicit language code match only (e.g. "en-US", "fr", "zh-Hans")
  // Plain display names like "French" or "English" are NOT accepted —
  // values must always include a region suffix like "french-france".
  const codeMatch = REFERENCE_DATA.LANGUAGES.some(item =>
    item.code.toLowerCase() === s
  );
  if (codeMatch) return { ok: true };

  // Pattern: {known-lang-slug}-{region} optionally followed by (code)
  const pattern = /^([a-z][a-z-]*)-([a-z][a-z-]*)(\s+\([a-z0-9-]+\))?$/;
  const m = s.match(pattern);
  if (m) {
    const baseSlugs = buildBaseLanguageSlugs();
    if (baseSlugs.has(m[1])) return { ok: true };
  }

  return { ok: false, msg: 'Language must be a valid value (e.g. "english-default (en-us)", "french-france (fr-fr)", "chinese-china")' };
}


/**
 * Validates a 2D array of spreadsheet data (first row = headers).
 * Returns { checked, errors, headers, rejectedRows, emptyFile }
 * - errors: flat list of all issues (for the error table UI)
 * - headers: original column headers from the file
 * - rejectedRows: Map of rowNum -> { rawRow, reasons[] } for the
 *   rejection template export (one row per lead, reasons consolidated)
 */
function validateLeadData(data) {
  if (!data || data.length < 2) {
    return { checked: 0, errors: [], headers: [], rejectedRows: new Map(), emptyFile: true };
  }

  const headers = data[0].map(h => (h ? h.toString().trim() : ''));
  const rows = data.slice(1);
  const cols = RULES.COLUMN_ALIASES;

  const colIdx = {
    email: findColumn(headers, cols.email),
    company: findColumn(headers, cols.company),
    firstName: findColumn(headers, cols.firstName),
    lastName: findColumn(headers, cols.lastName),
    jobTitle: findColumn(headers, cols.jobTitle),
    country: findColumn(headers, cols.country),
    language: findColumn(headers, cols.language)
  };

  const errors = [];
  const rejectedRows = new Map();
  let checked = 0;

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const hasData = row.some(c => c !== null && c !== undefined && c.toString().trim() !== '');
    if (!hasData) return;
    checked++;

    const pushIfBad = (result, field, value, type) => {
      if (!result.ok) {
        errors.push({ row: rowNum, field, value: value || '(blank)', issue: result.msg, type });
        // also collect into rejectedRows for the template export
        if (!rejectedRows.has(rowNum)) {
          rejectedRows.set(rowNum, { rawRow: row, reasons: [] });
        }
        rejectedRows.get(rowNum).reasons.push(`${field}: ${result.msg}`);
      }
    };

    if (colIdx.email > -1) pushIfBad(isValidEmail(row[colIdx.email]), 'Email Address', row[colIdx.email], 'email');
    if (colIdx.company > -1) pushIfBad(isValidCompany(row[colIdx.company]), 'Company Name', row[colIdx.company], 'company');
    if (colIdx.firstName > -1) pushIfBad(isValidName(row[colIdx.firstName], 'First name'), 'First Name', row[colIdx.firstName], 'name');
    if (colIdx.lastName > -1) pushIfBad(isValidName(row[colIdx.lastName], 'Last name'), 'Last Name', row[colIdx.lastName], 'name');
    if (colIdx.jobTitle > -1) pushIfBad(isValidJobTitle(row[colIdx.jobTitle]), 'Job Title', row[colIdx.jobTitle], 'jobtitle');
    if (colIdx.country > -1) pushIfBad(isInReferenceList(row[colIdx.country], 'Country', REFERENCE_DATA.COUNTRIES), 'Country', row[colIdx.country], 'other');
    if (colIdx.language > -1) pushIfBad(isValidLanguage(row[colIdx.language]), 'Language', row[colIdx.language], 'other');
  });

  return { checked, errors, headers, rejectedRows, emptyFile: false };
}

// Browser-global export (no bundler in this lightweight tool)
window.Validator = { validateLeadData };
