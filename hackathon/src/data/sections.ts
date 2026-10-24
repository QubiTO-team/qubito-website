import type { L10n } from '../i18n';

// Order of the sections on the page = order of the states on the Bloch sphere spiral (|0⟩ → |1⟩).
// `nav: false` keeps a section out of the top menu.
export const sections: { id: string; name: L10n; nav?: boolean }[] = [
  { id: 'hero', name: 'Home', nav: false },
  { id: 'about', name: { en: 'About', it: "L'evento" } },
  { id: 'programme', name: { en: 'Programme', it: 'Programma' } },
  { id: 'partners', name: { en: 'Partners', it: 'Partner' } },
  { id: 'faq', name: 'FAQ' },
  { id: 'team', name: 'Team' },
  { id: 'apply', name: { en: 'Apply', it: 'Candidati' }, nav: false },
];
