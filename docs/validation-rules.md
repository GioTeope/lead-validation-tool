# Validation Rules — Plain English Reference

This document explains every validation rule in plain language, for non-technical reference (e.g. when presenting to stakeholders or onboarding a new team member).

## Required Fields

### Email Address
- Cannot be blank.
- Must look like a real email address (contains `@` and a domain with a `.`).
- Cannot match one of 5 specific blacklisted addresses (e.g. `lin-william@hotmail.com`) — only those exact addresses are blocked; other addresses at the same domain (e.g. `someone.else@hotmail.com`) are fine.
- Cannot use a fully-blocked domain — currently `test.com`, `marketo.in`, and `microsoft.com`. Any address at these domains is invalid, regardless of the name before the `@` (e.g. `anyone@test.com` is blocked).

### Company Name
- Cannot be blank.
- Must be at least 2 characters long.
- Cannot be made up of only symbols/punctuation (e.g. "#, .", "$,%").
- Cannot exactly match a known placeholder value — e.g. "Freelancing," "Self work," "NA," "No," "Me," "Independent Contractor," etc. (full list in `src/rules.js` → `SCRUBBED_COMPANIES`).
- Cannot **contain** a disallowed keyword anywhere in the text — e.g. any company name containing "freelance," "student," "estudiante," or "trabajador independiente" is flagged, even as part of a longer phrase (e.g. "Freelance Real Estate Broker" or "Estudiante de la Universidad de Panama"). Full list in `src/rules.js` → `SCRUBBED_COMPANY_KEYWORDS`.

### First Name / Last Name
- Cannot contain a mix of letters and numbers (e.g. "Dev12" is invalid).
- Cannot contain an email address.
- (Blank names are currently allowed through — flag to the team if this should be required.)

### Job Title
- Cannot exactly match a known excluded title — mostly student-type or "independent" titles that don't represent a real lead (e.g. "College Student," "Independent Director," "Thesis Student").
- Cannot **contain** the word "student" anywhere in the title — this catches variations not on the exact list, e.g. "Student Ambassador" or "Part-time Student Worker".

### Country
- Cannot be blank.
- Must match a value (full name or ISO code) from the official country list — see `src/country-language-data.js`.

### Language
- Cannot be blank.
- Must match the real-world value format used in our system: `{language}-default (code)` for base/single-region languages — e.g. `english-default (en-us)`, `french-default (fr)`, `spanish-default (es)`.
- For regional or script variants, the format drops "-default" and uses the full language-region name instead — e.g. `chinese-simplified (zh-hans)`, `french-canadian (fr-ca)`, `portuguese-brazil (pt-br)`.
- Plain language names (e.g. "English") or codes (e.g. "en-US") are also accepted as a fallback.

## Open Items — Fields Awaiting Full Dropdown Lists

The MaSH template notes these fields must come from a specific dropdown list. Country and Language are now fully validated (see above). The remaining fields still need their complete accepted-value lists:

- Promotional Communication Preference
- Program Status
- Employee Range
- City
- State
- Industry
- Segment

Once these lists are provided, they can be added to `src/rules.js` and the tool will validate against them automatically.
