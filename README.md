# Lead File Validator

A lightweight, browser-based tool that validates incoming lead intake files against our MaSH validation template — no installs, no manual checking in Excel.

## What it does

The team currently receives lead upload files and manually cross-checks them against the validation rules in our MaSH template (scrubbed emails, invalid company names, blacklisted job titles, etc.). This tool automates that check:

1. Drag and drop the lead `.xlsx` or `.csv` file into the tool.
2. It validates every row against the rules below.
3. It shows a summary (rows checked / clean / errored) and a full error table.
4. Download a `.csv` error report listing every issue, by row number.

## Validation rules implemented

| Field | Rule |
|---|---|
| **Email Address** | Must not be blank, must be a valid format, must not match a specific blacklisted address, and must not use a fully-blocked domain (test.com, Marketo.in, microsoft.com) |
| **Company Name** | Must not be blank, must be ≥ 2 characters, must not be symbols-only, must not match known placeholder values or contain disallowed keywords (freelance, student, estudiante, etc.) |
| **First / Last Name** | Must not contain alphanumeric values (e.g. "Dev12"), must not contain an email address |
| **Job Title** | Must not match the exclusion list, and must not contain "student" anywhere in the title |
| **Country** | Must not be blank, must match a value (name or ISO code) from the official country list |
| **Language** | Must not be blank, must match a value (name or code) from the official language list |

All rule values live in [`src/rules.js`](src/rules.js) (email/company/job title lists) and [`src/country-language-data.js`](src/country-language-data.js) (Country/Language dropdown lists) — update those files whenever the MaSH template changes. No other code needs to change.

## How to use it

**Option A — open directly:**
Open `index.html` in any browser (double-click it, or right-click → Open with → browser). No server or installation required.

**Option B — host it internally:**
Drop the whole folder onto any internal static file host (SharePoint, internal web server, GitHub Pages, etc.) so the team can access it via a URL instead of a local file.

## Project structure

```
lead-validation-tool/
├── index.html          # Page structure / layout
├── src/
│   ├── styles.css       # All styling
│   ├── rules.js         # Validation rule data (email/company/job title) — UPDATE THIS when rules change
│   ├── country-language-data.js  # Country & Language dropdown lists — UPDATE THIS when those lists change
│   ├── validator.js      # Core validation logic (pure functions, no UI)
│   └── app.js            # UI wiring: file upload, rendering, CSV export
├── sample-data/
│   └── sample-leads.csv  # Example file for testing
└── docs/
    └── validation-rules.md  # Plain-English explanation of every rule, for non-technical reference
```

## Updating the rules

When the MaSH validation template changes (new scrubbed emails, new invalid company values, etc.), only `src/rules.js` needs editing. Each list is plain JavaScript array — just add or remove entries, save, and refresh the page.

## Known limitations / next steps

- **Dropdown-restricted fields** (Country, Language, Employee Range, Industry, Segment, Promotional Communication Preference) are currently only checked for blanks, not against the full allowed dropdown list. To complete this, we need the full list of valid values for each dropdown — once provided, they can be added to `rules.js` as additional validation lists.
- Currently single-file processing (one upload at a time). Batch upload could be added if needed.
- No data leaves the browser — files are processed locally via JavaScript, nothing is uploaded to a server.
