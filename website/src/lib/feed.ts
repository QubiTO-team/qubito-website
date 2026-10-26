import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { SITE } from '../config';
import { articleUrl, getArticles } from './content';
import { useTranslations, type Lang } from '../i18n/utils';

const feedLanguages: Record<Lang, string> = { it: 'it-IT', en: 'en-GB' };

/** RSS feed of the articles in one language, written to a static file at build time. */
export async function articleFeed(lang: Lang, context: APIContext): Promise<Response> {
  if (!context.site) throw new Error('The RSS feed needs `site` in astro.config.mjs');
  const t = useTranslations(lang);
  const articles = await getArticles(lang);
  return rss({
    title: `${SITE.name} | ${t('nav.articles')}`,
    description: t('articles.description'),
    site: context.site,
    items: articles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.date,
      link: articleUrl(article, lang),
      categories: article.data.tags,
    })),
    customData: `<language>${feedLanguages[lang]}</language>`,
  });
}
