import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Articles and activities have one folder each, with both languages and the images side by side:
 * "<name>/index.it.md", "<name>/index.en.md", "<name>/images/". This is the layout Sveltia CMS
 * expects for translations that share their media.
 *
 * Entry ids are "<lang>/<folder name>", e.g. "it/correcting-quantum-errors". The default id
 * would come from the `slug` field, which differs between languages and would break the link
 * between the Italian and English versions.
 */
const idFromFolder = ({ entry }: { entry: string }) =>
  entry.replace(/^(.+)\/index\.(it|en)\.md$/, '$2/$1');

/** Home page texts: "it.yaml" → "it". */
const idFromFile = ({ entry }: { entry: string }) => entry.replace(/\.ya?ml$/, '');

const articles = defineCollection({
  loader: glob({
    pattern: '*/index.{it,en}.md',
    base: './src/content/articles',
    generateId: idFromFolder,
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      authors: z.array(z.string()).min(1),
      tags: z.array(z.string()).default([]),
      /** URL segment, may differ between languages. */
      slug: z.string().regex(/^[a-z0-9-]+$/),
      cover: z.object({ src: image(), alt: z.string().min(1) }).optional(),
      draft: z.boolean().default(false),
      /** Pictures uploaded from the editor for use inside the text; the text shows them. */
      images: z.array(z.string()).default([]),
    }),
});

const activities = defineCollection({
  loader: glob({
    pattern: '*/index.{it,en}.md',
    base: './src/content/activities',
    generateId: idFromFolder,
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      /** Short summary shown in lists. */
      description: z.string(),
      /** Start date, used for sorting. Use the first day of the month when only the month is known. */
      date: z.coerce.date(),
      /** Last day, for activities that last more than one day. */
      endDate: z.coerce.date().optional(),
      /** Human-readable date, e.g. "8–10 May 2026"; defaults to the formatted date. */
      dateLabel: z.string().optional(),
      location: z.string().optional(),
      /** Award or placement, e.g. "2nd place in the Indra challenge". */
      result: z.string().optional(),
      gallery: z.array(z.object({ src: image(), alt: z.string().min(1) })).default([]),
      links: z.array(z.object({ url: z.url(), text: z.string() })).default([]),
      /** Sign-up link, shown only until the activity is over. */
      registration: z.object({ url: z.url(), text: z.string() }).optional(),
      /** URL segment; defaults to the file name. */
      slug: z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .optional(),
      draft: z.boolean().default(false),
    }),
});

/** Paragraphs of a section of the home page. */
const paragraphs = z.array(z.string().min(1)).min(1);
/** Buttons of a section of the home page: a page of the site (/team/, /en/team/) or another site. */
const links = z.array(z.object({ label: z.string().min(1), url: z.string().min(1) })).default([]);

const home = defineCollection({
  loader: glob({ pattern: '{it,en}.yaml', base: './src/content/home', generateId: idFromFile }),
  schema: ({ image }) =>
    z.object({
      /** Sentence under the logo; also in the footer, the Linktree and the title of the home page. */
      tagline: z.string().min(1),
      whoWeAre: z.object({
        title: z.string(),
        body: paragraphs,
        image: z.object({ src: image(), alt: z.string().min(1) }),
        links,
      }),
      activities: z.object({ title: z.string(), intro: z.string(), links }),
      articles: z.object({ title: z.string(), intro: z.string(), links }),
      contact: z.object({ title: z.string(), body: paragraphs, links }),
      // `credit`: source and licence of the chip design, with links written as [label](https://...).
      qubits: z.object({ title: z.string(), body: paragraphs, links, credit: z.string().min(1) }),
    }),
});

/** Static pages (About us, Contacts, Join us, Privacy): one folder each, "index.it.md" and "index.en.md". */
const pages = defineCollection({
  loader: glob({
    pattern: '*/index.{it,en}.md',
    base: './src/content/pages',
    generateId: idFromFolder,
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      /** Opening paragraph, larger than the text. */
      lead: z.string(),
      image: z.object({ src: image(), alt: z.string().min(1) }).optional(),
      /** Join us only: applications open (the form, and "Join us" in the menu and on the home page). */
      open: z.boolean().optional(),
      /** Join us only: how the data of the form is used, shown before the button that sends it. */
      privacy: z.string().optional(),
    }),
});

/** Groups of links of the Linktree page: "it.yaml" and "en.yaml". */
const linktree = defineCollection({
  loader: glob({ pattern: '{it,en}.yaml', base: './src/content/linktree', generateId: idFromFile }),
  schema: z.object({
    groups: z.array(
      z.object({
        title: z.string(),
        links: z.array(z.object({ label: z.string(), url: z.string() })).min(1),
      }),
    ),
  }),
});

export const collections = { articles, activities, home, pages, linktree };
