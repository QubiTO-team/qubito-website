import { getEntry } from 'astro:content';
import type { Lang } from '../i18n/utils';

/**
 * The sentence under the logo of the home page, from the home texts in the CMS: also in the
 * footer, the Linktree and the title of the home page.
 */
export async function siteTagline(lang: Lang): Promise<string> {
  const home = await getEntry('home', lang);
  if (!home) throw new Error(`Missing home texts for "${lang}"`);
  return home.data.tagline;
}
