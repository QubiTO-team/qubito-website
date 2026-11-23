/*
 * Whether an activity is taking place, hasn't started yet or is over, by the date in Italy.
 * Used when the site is built and again in the browser (ActivityStatus.astro), so pages built
 * some days ago still show the right state: keep this file free of imports.
 */

export type ActivityStatus = 'ongoing' | 'upcoming' | 'past';

/** A day as "YYYY-MM-DD" in Italy, whatever the time zone of the computer. */
export function italianDay(now: Date): string {
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

/** The status on a given day of an activity from its first and last day, all as "YYYY-MM-DD". */
export function statusOn(start: string, end: string, today: string): ActivityStatus {
  if (end < today) return 'past';
  return start <= today ? 'ongoing' : 'upcoming';
}
