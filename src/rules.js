/**
 * rules.js
 * -----------------------------------------------------------------------
 * This file holds all the validation rules from the MaSH lead intake
 * template. Update these lists whenever the validation template changes
 * — no need to touch any other file.
 * -----------------------------------------------------------------------
 */

// Exact email addresses that are known to be scrubbed / placeholder /
// blacklisted leads. Only these specific addresses are blocked — the
// domains they belong to (hotmail.com, amazon.com, etc.) are NOT blocked.
const SCRUBBED_EMAILS = [
  'tes@tst.com',
  'lin-william@hotmail.com',
  'seitisu@amazon.com',
  'francis@adf-foods.com',
  'krishnasantosh.maadasu@ltimindtree.com'
];

// Domains that are fully blocked — ANY email address ending in one of
// these domains is invalid, regardless of the name before the @.
const BLOCKED_DOMAINS = [
  'test.com',
  'marketo.in',
  'microsoft.com',
  'example.com'
];

// Company name values that indicate scrubbed / invalid / placeholder data.
// These are matched EXACTLY (case-insensitive) — short/ambiguous words live
// here rather than in the keyword list below, to avoid false positives on
// real company names (e.g. "No" as an exact value is bad, but a company
// called "Noble Corp" should NOT be flagged just for containing "No").
const SCRUBBED_COMPANIES = [
  'should contain At least 2 charcters',
  'Currently unemployeed',
  'ASU student',
  'Study',
  'Example',
  'NA',
  'NA.',
  'public',
  'private',
  'myself',
  'studying',
  'Studing',
  'Etudante',
  'Étudiant',
  'Etudiant',
  'Etudiante',
  'Étudiante',
  'Free',
  'HA !',
  'aaa',
  'Self owned business',
  'Self Entrepreneur',
  'Self work',
  'Self worker',
  'My work',
  'My business',
  'Own Busibess',
  'No Company',
  'NoCompany',
  'No Aplicable',
  'No Applicable',
  'No poseo',
  'no hay',
  'no tengo',
  'No me encuentro',
  'Noentiendo',
  'No estoy empleado',
  'no dispongo',
  'In college 1st year',
  'In college',
  'Independiente',
  'Independient',
  'Independer',
  'Independientemente',
  'Indépendant',
  'Independent Contractor',
  'Independent Consultant',
  'Consultor independiente',
  'Personal',
  'No aplica',
  'Not yet',
  'Any',
  'No',
  'Own Company',
  'Me',
  'person',
  'Non',
  'Pub',
  'Test',
  'Marketo',
  'Finland',
  'hotmail.com',
  'tes@tst.com',
  'Graduate'
];

// Keywords/substrings that indicate an invalid company name if found ANYWHERE
// in the value — use for distinctive words unlikely to appear in a real
// company name (e.g. "Freelance", "Estudiante"). Matching is case-insensitive
// and accent-insensitive.
const SCRUBBED_COMPANY_KEYWORDS = [
  'freelance',
  'freelancer',
  'freelancing',
  'freel lance',
  'estudiante',
  'trabajador-independiente',
  'trabajador independiente',
  'student',
  'self learner',
  'self-learner',
  'learner',
  'leraner',
  'lerner',
  'learnner',
  'self employed',
  'self-employed',
  'independent learner',
  'independent consultant',
  'independent contractor',
  'independent developer',
  'independent consulting',
  'independiente',
  'independant',
  'fresh graduate',
  'new graduate',
  'recent graduate',
  'graduate student',
  'graduate trainee',
  'graduate intern',
  'graduated',
  'i am a'
];

// Patterns that mean the company name is just symbols/punctuation with no
// real text (e.g. "# , .", "$,%", "#$").
const SYMBOL_ONLY_PATTERN = /^[\s#.,$%!*\-_'"]+$/;

// Job titles that should be flagged/removed (students, independent-type roles)
const BAD_JOB_TITLES = [
  'Independent Consultant – Industrial Sociology',
  'Independent Director',
  'Student',
  'Full time student',
  'College Student',
  'University Student',
  'Working Student',
  'Doctoral Student',
  'Student Trainee',
  'Student Co-op',
  'AFIT Graduate Student',
  'Working student Corporate Information Security',
  'Graduate Student',
  'Working Student AIDigital Transformation Adoption',
  'Artificial Intelligence Student',
  'Thesis Student',
  'Graduate',
  'Fresh Graduate',
  'New Graduate',
  'Recent Graduate',
  'Graduate Trainee',
  'Graduate Intern'
];

// Keywords/substrings that indicate an invalid job title if found ANYWHERE
// in the value (case-insensitive) — catches variations not in the exact
// list above, e.g. "Part-time Student Worker" or "Student Ambassador".
const BAD_JOB_TITLE_KEYWORDS = [
  'student',
  'freelance',
  'self learner',
  'self-learner',
  'learner',
  'leraner',
  'lerner',
  'learnner',
  'self employed',
  'self-employed',
  'independent learner',
  'independent consultant',
  'independent contractor',
  'independent developer',
  'independent consulting',
  'fresh graduate',
  'new graduate',
  'recent graduate',
  'graduate student',
  'graduate trainee',
  'graduate intern',
  'graduated',
  'i am a'
];

// Name of the sheet in MaSH lead upload files that should be validated.
// These files arrive with 2 sheets (e.g. "List Template" + "E164 Phone
// Format") — only the lead data sheet should be checked.
const TARGET_SHEET_NAME = 'List Template';

// Column header aliases — lets the tool find columns even if naming varies slightly
const COLUMN_ALIASES = {
  email: ['Email Address', 'Email', 'EmailAddress'],
  company: ['Company Name', 'CompanyName', 'Company'],
  firstName: ['First Name', 'FirstName'],
  lastName: ['Last Name', 'LastName'],
  jobTitle: ['Job Title', 'JobTitle'],
  country: ['Country'],
  language: ['Language'],
  programStatus: ['Program Status', 'ProgramStatus', 'Program_Status'],
  dateColumn: ['Collection Date', 'Date Collected', 'Lead Date', 'Created Date', 'Date', 'Timestamp']
};

// Exported for use in validator.js / app.js (browser-global, no bundler needed)
window.RULES = {
  SCRUBBED_EMAILS,
  BLOCKED_DOMAINS,
  SCRUBBED_COMPANIES,
  SCRUBBED_COMPANY_KEYWORDS,
  SYMBOL_ONLY_PATTERN,
  BAD_JOB_TITLES,
  BAD_JOB_TITLE_KEYWORDS,
  TARGET_SHEET_NAME,
  COLUMN_ALIASES
};
