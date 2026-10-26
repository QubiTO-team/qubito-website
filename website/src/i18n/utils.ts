import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLang, languages, ui, type Lang, type UiKey } from './ui';

export { defaultLang, languages, type Lang, type UiKey };

export const langs = Object.keys(languages) as Lang[];

export function isLang(value: string | undefined): value is Lang {
  return value !== undefined && value in languages;
}

/** Returns t(): placeholders are written in braces, e.g. "© {year} QubiTO". */
export function useTranslations(lang: Lang) {
  return function t(key: UiKey, vars?: Record<string, string | number>): string {
    const text = ui[lang][key];
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}

/** Path in the requested language: "/articles/" → "/articles/" (it) or "/en/articles/" (en). */
export function localizePath(path: string, lang: Lang): string {
  return getRelativeLocaleUrl(lang, path.replace(/^\/+/, ''));
}

/** Removes the language prefix: "/en/articles/" → "/articles/". */
export function stripLangPrefix(pathname: string): string {
  const [, first, ...rest] = pathname.split('/');
  if (isLang(first) && first !== defaultLang) return `/${rest.join('/')}`;
  return pathname;
}

const intlLocales: Record<Lang, string> = { it: 'it-IT', en: 'en-GB' };

/** Formats a date; content dates are UTC midnight, so UTC avoids off-by-one days. */
export function formatDate(
  date: Date,
  lang: Lang,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' },
): string {
  return new Intl.DateTimeFormat(intlLocales[lang], { timeZone: 'UTC', ...options }).format(date);
}

/** "A, B and C" / "A, B e C". */
export function formatList(items: string[], lang: Lang): string {
  return new Intl.ListFormat(intlLocales[lang], { style: 'long', type: 'conjunction' }).format(
    items,
  );
}

/** Equivalent page in each language, for pages that share the same path in it and en. */
export function getAlternates(pathname: string): Record<Lang, string> {
  const base = stripLangPrefix(pathname);
  return Object.fromEntries(langs.map((lang) => [lang, localizePath(base, lang)])) as Record<
    Lang,
    string
  >;
}
