import { getEntry } from 'astro:content';

/**
 * Whether applications to join the team are open: the switch of the Join us page in the CMS
 * ("open" in src/content/pages/join-us/). It shows the form and "Join us" in the menu, on the home
 * page and on the About us page.
 */
export async function applicationsOpen(): Promise<boolean> {
  const page = await getEntry('pages', 'it/join-us');
  return page?.data.open ?? false;
}
