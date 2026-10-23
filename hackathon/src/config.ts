// Settings you are expected to change. Everything else lives in src/data/ (content) and src/components/.

/** The application form (Google Forms, on teamqubito@gmail.com). All "Apply" buttons open it. */
export const APPLICATION_FORM_URL = 'https://forms.gle/BLngupimND7nxq7R7';

/** Shown on the page and used as reply address. */
export const CONTACT_EMAIL = 'teamqubito@gmail.com';

/** Countdown target: start of the company talks. */
export const COUNTDOWN_TARGET = '2026-12-11T13:00:00+01:00';

/**
 * Applications. Set `open: false` to close them; `deadline` (ISO date) also closes them automatically
 * at that moment (the Apply buttons stop opening the form) and is shown in the text.
 * The Google Form itself must also be closed at the deadline (Responses > Accepting responses).
 */
export const APPLICATIONS = {
  open: true,
  deadline: '2026-11-15T23:59:00+01:00' as string | null, // same as the Google Form
  resultsBy: null as string | null,         // e.g. '2026-11-27'
};

export const SOCIAL = {
  instagram: 'https://www.instagram.com/qubitoteam_polito/',
  linkedin: 'https://www.linkedin.com/company/qubito-student-team-politecnico-di-torino/',
  website: 'https://qubito.polito.it/',
};

/** True once applications are closed (switched off, or deadline passed when the site was built). */
export const applicationsClosed = () =>
  !APPLICATIONS.open || (APPLICATIONS.deadline !== null && Date.now() > Date.parse(APPLICATIONS.deadline));
