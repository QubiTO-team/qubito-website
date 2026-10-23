export type Lang = 'en' | 'it';
export const LANGS: Lang[] = ['en', 'it'];

/** A piece of text in both languages. Plain strings are used as-is in both. */
export type L10n = { en: string; it: string } | string;

export const pick = (lang: Lang) => (s: L10n): string => (typeof s === 'string' ? s : s[lang]);

const BASE = import.meta.env.BASE_URL; // '/hackathon/'

/** Path inside the site for a language: url('en', 'privacy/') -> /hackathon/privacy/ ; it -> /hackathon/it/privacy/ */
export function url(lang: Lang, path = ''): string {
  return BASE + (lang === 'it' ? 'it/' : '') + path;
}

/** Asset in public/: asset('logos/iqm.png') -> /hackathon/logos/iqm.png */
export function asset(path: string): string {
  return BASE + path;
}

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  it: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
};

/** '2026-11-20' -> '20 November 2026' / '20 novembre 2026'; null -> the "to be announced" text */
export function formatDate(lang: Lang, iso: string | null): string {
  if (!iso) return lang === 'it' ? '[data da definire]' : '[date TBA]';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[lang][m - 1]} ${y}`;
}
