import type { L10n } from '../i18n';

// Board members. Placeholder until the real names arrive.
// `photo` (optional) = square picture in public/team/, e.g. 'team/name-surname.jpg' (about 400x400 px).
// Without a photo the initials are shown. The layout is tested for 9 people.
const placeholder = (role: L10n) => ({ name: 'Name Surname', role });
export const team: { name: string; role: L10n; photo?: string }[] = [
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
  placeholder({ en: 'Role', it: 'Ruolo' }),
];
