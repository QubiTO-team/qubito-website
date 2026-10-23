import type { L10n } from '../i18n';

// QubiTO board. Photos: square 480x480 JPEGs in public/team/ (cropped from utils/teammembers).
// Order: by role. Italian roles use the name of the function, so they don't depend on gender.
export const team: { name: string; role: L10n; photo?: string }[] = [
  { name: 'Ruzgar Sipahi', role: { en: 'Team leader', it: 'Team leader' }, photo: 'team/ruzgar-sipahi.jpg' },
  { name: 'Timoteo Croce', role: { en: 'Vice team leader', it: 'Vice team leader' }, photo: 'team/timoteo-croce.jpg' },
  { name: 'Berhan Yirci', role: { en: 'Project manager', it: 'Project manager' }, photo: 'team/berhan-yirci.jpg' },
  { name: 'Hossam Hamada', role: { en: 'Project manager', it: 'Project manager' }, photo: 'team/hossam-hamada.jpg' },
  { name: 'Davide Luppino', role: { en: 'Secretary', it: 'Segreteria' }, photo: 'team/davide-luppino.jpg' },
  { name: 'Rebecca Dogaru', role: { en: 'Secretary', it: 'Segreteria' }, photo: 'team/rebecca-dogaru.jpg' },
  { name: 'Ema Kola', role: { en: 'Treasurer', it: 'Tesoreria' }, photo: 'team/ema-kola.jpg' },
  { name: 'Tommaso Cambursano', role: { en: 'External relations', it: 'Relazioni esterne' }, photo: 'team/tommaso-cambursano.jpg' },
  { name: 'Simone Boi', role: { en: 'Event planner', it: 'Organizzazione eventi' }, photo: 'team/simone-boi.jpg' },
];
