import type { UiKey } from './i18n/ui';

export const SITE = {
  name: 'QubiTO',
  email: 'teamqubito@gmail.com',
  polito: 'https://www.polito.it/',
  /**
   * The QubiTO Hackathon site, in each language. It is a separate site, uploaded to the same
   * server: the address has no domain, so the staging preview links to its own copy.
   */
  hackathon: {
    it: '/hackathon/it/',
    en: '/hackathon/',
  },
  /**
   * Google Apps Script of the team that receives the Join us form, as on the Hugo site.
   * Applications are opened and closed in the CMS (Pages → Join us).
   */
  applicationsScript:
    'https://script.google.com/macros/s/AKfycbzrG7VHS7GihxpPbslbyxOWJW4Nb4rpaJkTY42_UPmnuEnnLBHdP6-KJISctVvaY8y2/exec',
} as const;

export const SOCIAL = [
  {
    name: 'LinkedIn',
    icon: 'linkedin',
    url: 'https://www.linkedin.com/company/qubito-student-team-politecnico-di-torino/',
  },
  { name: 'Instagram', icon: 'instagram', url: 'https://www.instagram.com/qubitoteam_polito/' },
  { name: 'GitHub', icon: 'github', url: 'https://github.com/QubiTO-team' },
] as const;

export interface NavItem {
  key: UiKey;
  /** Path without the language prefix, identical in it and en. */
  path: string;
  requiresRecruiting?: boolean;
}

export const NAV: NavItem[] = [
  { key: 'nav.articles', path: '/articles/' },
  { key: 'nav.activities', path: '/activities/' },
  { key: 'nav.team', path: '/team/' },
  { key: 'nav.joinUs', path: '/join-us/', requiresRecruiting: true },
  { key: 'nav.contacts', path: '/contacts/' },
];

/** The navigation, with "Join us" only while applications are open (applicationsOpen()). */
export function navItems(applicationsOpen: boolean) {
  return NAV.filter((item) => !item.requiresRecruiting || applicationsOpen);
}
