export const PRIVACY_EFFECTIVE_DATE = 'October 9, 2026';

export const PRIVACY_NAV = [
  { id: 'extension-data', label: 'Local storage' },
  { id: 'quest-access', label: 'Quest access' },
  { id: 'website', label: 'Network requests' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'easyaccess', label: 'EasyAccess' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'sharing', label: 'Sharing' },
  { id: 'choices', label: 'Your choices' },
  { id: 'contact', label: 'Contact' },
] as const;

export type PrivacySection = {
  id: string;
  index: string;
  eyebrow: string;
  title: string;
  body: string[];
  list?: string[];
  boundary?: { does: string; doesNot: string };
  cta?: { href: string; label: string };
  className?: string;
};

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    id: 'extension-data',
    index: '01',
    eyebrow: 'On your device',
    title: 'What the extension remembers.',
    body: [
      'BetterQuest uses the single Chrome storage permission. Its local state is stored under betterquest.local.v1 and may include:',
      'This information remains in Chrome storage on your device. BetterQuest does not currently operate an account library or upload this coursework state. The diagnostics described below are a separate, limited data flow.',
    ],
    list: [
      'theme and feature preferences;',
      'course and assignment metadata visible on Quest, including titles, source identifiers, URLs, deadlines, and completion labels;',
      'a record of which course pages were observed and when they were last observed;',
      'question identifiers, question numbers, source links, bookmark status, and bookmark notes; and',
      'locally cached study records created by enabled features.',
    ],
  },
  {
    id: 'quest-access',
    index: '02',
    eyebrow: 'Page access',
    title: 'What BetterQuest can see on Quest.',
    body: [
      'The content script runs only on quest.cns.utexas.edu/student pages. It reads course and assignment metadata, deadlines, status, and question identifiers already visible on the page so enabled overview and bookmark features can work.',
      'BetterQuest does not scan every course automatically. An assignment appears in the overview only after the relevant Quest page has been visited and observed.',
    ],
    boundary: {
      does: 'Enhance pages you visit and cache the limited metadata listed above.',
      doesNot: 'Read or store passwords, UT login credentials, submitted answers, response text, or solution text. It does not submit work, change grades, or automate assessments.',
    },
  },
  {
    id: 'website',
    index: '03',
    eyebrow: 'The network',
    title: 'Requests needed to run the site.',
    body: [
      'The extension includes its feature code and does not use an advertising tracker. Quest continues to make the requests needed to operate the page you are using. Diagnostic and aggregate measurement features, when enabled, use IEXDevs services only for the limited purposes below.',
      'Visiting this website sends ordinary requests to our hosting provider. Security and operational logs may include your IP address, browser type, requested path, and request time. We use those logs to deliver, protect, and troubleshoot the site.',
    ],
  },
  {
    id: 'diagnostics',
    index: '04',
    eyebrow: 'When something breaks',
    title: 'Useful errors, without the coursework.',
    body: [
      'When diagnostics are enabled, BetterQuest may send a de-identified user-submitted issue report or an automatic extension error report after an unexpected failure. A report may include the error category, affected feature, extension and browser version, page type, time, and sanitized technical context needed to reproduce the problem.',
      'Diagnostic reports do not include passwords, submitted answers, coursework text, solution text, names, account identifiers, or bookmark-note contents. Text you choose to type into a report is handled as support correspondence.',
    ],
  },
  {
    id: 'easyaccess',
    index: '05',
    eyebrow: 'Not active today',
    title: 'EasyAccess is future work.',
    body: [
      'EasyAccess is the shared IEXDevs login and is currently available only in UTMAX. BetterQuest does not currently offer EasyAccess login. If it is added, the interface and this policy will identify which compatible preferences or product data can be stored on IEXDevs servers and shared across IEXDevs services after you choose to use an account.',
    ],
  },
  {
    id: 'analytics',
    index: '06',
    eyebrow: 'Product measurement',
    title: 'Patterns, not student profiles.',
    body: [
      'When enabled, IEXDevs may collect de-identified measurements such as coarse general location, approximate connection quality or internet speed, API request counts and hourly usage, product version, and sanitized error categories.',
      'Cross-product aggregates may describe high-level schedule or degree-completion trends, frequently used or requested courses, and popular majors, minors, or certificates. BetterQuest does not contribute raw answers, coursework text, names, account IDs, or complete student records to these aggregates.',
      'De-identified aggregate results may appear in public reports and restricted internal developer dashboards. These reports are designed so an individual user cannot reasonably be identified.',
    ],
  },
  {
    id: 'sharing',
    index: '07',
    eyebrow: 'Other companies',
    title: 'No sale. No ad audience.',
    body: [
      'We do not sell, rent, or use your information for advertising. Our website host and diagnostic delivery infrastructure may process ordinary requests and the limited de-identified reports described above.',
      'If you open the IEXDevs contact form, you leave BetterQuest. That form collects the name, email, and message you submit, uses Cloudflare Turnstile to prevent abuse, and uses an email provider to deliver the message. We retain contact correspondence only as reasonably necessary to answer it, maintain service records, or address abuse.',
    ],
  },
  {
    id: 'choices',
    index: '08',
    eyebrow: 'Your controls',
    title: 'Disable it or erase it.',
    body: [
      'You can disable assignment or bookmark features from BetterQuest settings. You can delete local data by removing the extension and clearing its extension data in Chrome. Clearing ordinary Quest website data alone may not remove Chrome extension storage.',
      'BetterQuest is intended for college students and is not directed to children under 13. We may update this policy when the product or its data practices change; the effective date at the top will change with it.',
    ],
  },
  {
    id: 'contact',
    index: '09',
    eyebrow: 'A person, not a ticket maze',
    title: 'Ask the team directly.',
    body: [
      'Use the IEXDevs contact form for a privacy question, correction request, or concern about BetterQuest.',
    ],
    cta: { href: 'https://iexdevs.com/contact', label: 'Contact IEXDevs' },
    className: 'contact-panel',
  },
];

export const PRIVACY_PLAIN_TEXT = [
  PRIVACY_EFFECTIVE_DATE,
  'betterquest.local.v1',
  'Chrome storage',
  'quest.cns.utexas.edu',
  'course and assignment metadata',
  'does not',
  'passwords',
  'submitted answers',
  'remove the extension',
  'do not sell',
  'user-submitted issue report',
  'automatic extension error',
  'EasyAccess',
  'currently available only in UTMAX',
  'coarse general location',
  'connection quality',
  'internet speed',
  'API request',
  'hourly',
  'de-identified',
  'aggregate',
  'public',
  'internal',
  'dashboard',
].join(' ');
