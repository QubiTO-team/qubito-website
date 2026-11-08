/** Words per minute for technical text with formulas and code. */
const WORDS_PER_MINUTE = 200;

/** Estimated reading time in minutes of a Markdown body (at least 1). */
export function readingTime(markdown: string): number {
  // Formulas are left out: their LaTeX commands are not words.
  const text = markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/\$\$[\s\S]*?\$\$/g, ' ')
    .replace(/\$[^$\n]+\$/g, ' formula ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/<[^>]+>/g, ' ');
  const words = text.match(/[\p{L}\p{N}]+/gu)?.length ?? 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
