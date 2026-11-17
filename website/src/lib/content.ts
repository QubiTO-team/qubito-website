import { getCollection, type CollectionEntry } from 'astro:content';
import { langs, localizePath, type Lang } from '../i18n/utils';

export type Article = CollectionEntry<'articles'>;
export type Activity = CollectionEntry<'activities'>;

const byDateDesc = (a: { data: { date: Date } }, b: { data: { date: Date } }) =>
  b.data.date.valueOf() - a.data.date.valueOf();

const inLang = (lang: Lang) => (entry: { id: string; data: { draft: boolean } }) =>
  entry.id.startsWith(`${lang}/`) && !entry.data.draft;

/** File name of an entry without its language folder: "it/foo" → "foo". */
export const entryKey = (entry: { id: string }) => entry.id.slice(entry.id.indexOf('/') + 1);

/** Published articles in one language, newest first. */
export async function getArticles(lang: Lang): Promise<Article[]> {
  return (await getCollection('articles', inLang(lang))).sort(byDateDesc);
}

/** Published activities in one language, newest first. */
export async function getActivities(lang: Lang): Promise<Activity[]> {
  return (await getCollection('activities', inLang(lang))).sort(byDateDesc);
}

export const articleUrl = (article: Article, lang: Lang) =>
  localizePath(`/articles/${article.data.slug}/`, lang);

/** RSS feed of the articles, at the same address as on the previous Hugo site. */
export const articleFeedUrl = (lang: Lang) => `${localizePath('/articles/', lang)}index.xml`;

/** The same entry in each language; the list of its collection where a translation is missing. */
async function alternates<T extends { id: string }>(
  entry: T,
  getEntries: (lang: Lang) => Promise<T[]>,
  url: (entry: T, lang: Lang) => string,
  listPath: string,
): Promise<Record<Lang, string>> {
  const key = entryKey(entry);
  const urls = await Promise.all(
    langs.map(async (lang) => {
      const translation = (await getEntries(lang)).find((other) => entryKey(other) === key);
      return [lang, translation ? url(translation, lang) : localizePath(listPath, lang)];
    }),
  );
  return Object.fromEntries(urls) as Record<Lang, string>;
}

export const articleAlternates = (article: Article) =>
  alternates(article, getArticles, articleUrl, '/articles/');

export const activityUrl = (activity: Activity, lang: Lang) =>
  localizePath(`/activities/${activity.data.slug ?? entryKey(activity)}/`, lang);

export const activityAlternates = (activity: Activity) =>
  alternates(activity, getActivities, activityUrl, '/activities/');

export type ActivityStatus = 'ongoing' | 'upcoming' | 'past';

/** A day as "YYYY-MM-DD" in Italy, whatever the time zone of the computer that builds the site. */
function italianDay(now: Date): string {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

/**
 * Whether an activity is taking place today, hasn't started yet or is over. Decided when the
 * site is built: an activity changes status only with the next build.
 */
export function activityStatus(activity: Activity, now = new Date()): ActivityStatus {
  const today = italianDay(now);
  // Dates in the front matter have no time: they are midnight UTC of that day.
  const day = (date: Date) => date.toISOString().slice(0, 10);
  if (day(activity.data.endDate ?? activity.data.date) < today) return 'past';
  return day(activity.data.date) <= today ? 'ongoing' : 'upcoming';
}
