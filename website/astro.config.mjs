// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import sitemap from '@astrojs/sitemap';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';

import tailwindcss from '@tailwindcss/vite';
import { htaccess } from './src/lib/htaccess.ts';
import { rehypeFigure } from './src/lib/rehype-figure.ts';
import { qubitoCodeTheme } from './src/lib/shiki-theme.ts';

// Unicode ranges of the Fontsource subsets (identical across packages).
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'.split(
    ',',
  );
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'.split(
    ',',
  );
const GREEK = 'U+0370-0377,U+037A-037F,U+0384-038A,U+038C,U+038E-03A1,U+03A3-03FF'.split(',');

/**
 * The Fonts API expects non-empty lists (variants and sources).
 * @template T
 * @param {T[]} list
 * @returns {[T, ...T[]]}
 */
const nonEmpty = (list) => {
  if (list.length === 0) throw new Error('Font configuration: empty list');
  return /** @type {[T, ...T[]]} */ (list);
};

/**
 * Variants of a variable Fontsource font installed in node_modules:
 * nothing is downloaded at build time and the files are served from our domain.
 * @param {string} pkg
 * @param {string} file file name without the subset, e.g. "wght-normal"
 * @param {Array<[string, string[]]>} subsets
 * @param {{ weight: string, style: 'normal' | 'italic', stretch?: string }} props
 */
const fontsourceVariants = (pkg, file, subsets, props) =>
  nonEmpty(
    subsets.map(([subset, unicodeRange]) => ({
      src: nonEmpty([`@fontsource-variable/${pkg}/files/${pkg}-${subset}-${file}.woff2`]),
      unicodeRange: nonEmpty(unicodeRange),
      ...props,
    })),
  );

/** @type {Array<[string, string[]]>} */
const LATIN_SUBSETS = [
  ['latin', LATIN],
  ['latin-ext', LATIN_EXT],
];

// PREVIEW=true builds the preview of the staging branch: search engines are asked not to index it
// (BaseLayout) and Simple Analytics is left out, so its visits are not counted.
const preview = process.env.PREVIEW === 'true';
const analyticsQueue = preview ? '' : ' https://queue.simpleanalyticscdn.com';

export default defineConfig({
  site: 'https://qubito.polito.it',
  output: 'static',

  // Every URL of the previous Hugo site ends with "/": keep them identical.
  trailingSlash: 'always',

  build: {
    format: 'directory',
  },

  // HTML-aware compression: keeps the space between inline elements.
  compressHTML: true,

  // Addresses of the previous site that change. The Apache server answers them with real 301
  // redirects (.htaccess, written by src/lib/htaccess.ts); the small pages that Astro builds for
  // them, which send the browser on, stay as a fallback.
  redirects: {
    // The folder name of the Hugo page bundle had ended up in the URL by mistake.
    '/articles/hardware_superconducting_qubits_08_05_2025_gvpgje/superconducting-qubits/':
      '/articles/superconducting-qubits/',
    '/en/articles/hardware_superconducting_qubits_08_05_2025_gvpgje/superconducting-qubits/':
      '/en/articles/superconducting-qubits/',
    // Forms of the Hugo site: applications are now on the Join us page, the Quantum Days are over.
    '/forms/join-us/': '/join-us/',
    '/en/forms/join-us/': '/en/join-us/',
    '/thankyou/': '/join-us/',
    '/en/thankyou/': '/en/join-us/',
    '/forms/thankyou/': '/join-us/',
    '/en/forms/thankyou/': '/en/join-us/',
    '/en/forms/qubito-quantum-days-form/': '/en/activities/qubito-quantum-days/',
    '/en/forms/qubito-quantum-days-thankyou/': '/en/activities/qubito-quantum-days/',
    // Empty section lists that Hugo generated, and its Italian root: the home page of the language.
    '/forms/': '/',
    '/en/forms/': '/en/',
    '/snippets/': '/',
    '/en/snippets/': '/en/',
    '/it/': '/',
  },

  integrations: [
    // Every page except the 404s; the two languages of a page are linked by the hreflang tags
    // in its head (BaseLayout), since their slugs can differ.
    sitemap({
      filter: (page) => !new URL(page).pathname.endsWith('/404/'),
    }),
    htaccess(),
  ],

  i18n: {
    defaultLocale: 'it',
    locales: ['it', 'en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },

  // Astro hashes the scripts and styles of each page; everything else comes only from our domain,
  // except Simple Analytics (visit statistics, no cookies). The 3D scene reads the textures inside
  // its models from blob: URLs (fetched, or as images on the browsers where three.js does not use
  // createImageBitmap). The Join us page adds the address of its form while applications are open.
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        `connect-src 'self' blob:${analyticsQueue}`,
        `img-src 'self' blob:${analyticsQueue}`,
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", ...(preview ? [] : ['https://scripts.simpleanalyticscdn.com'])],
      },
    },
  },

  env: {
    schema: {
      PREVIEW: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },

  // Space Grotesk for text and interface, JetBrains Mono for technical labels, Anybody for the
  // home title that turns into the logo.
  fonts: [
    {
      // Headings, text and interface.
      provider: fontProviders.local(),
      name: 'Space Grotesk',
      cssVariable: '--font-space-grotesk',
      fallbacks: ['sans-serif'],
      options: {
        variants: fontsourceVariants('space-grotesk', 'wght-normal', LATIN_SUBSETS, {
          weight: '300 700',
          style: 'normal',
        }),
      },
    },
    {
      // Only the title of the home page, which turns into the logo: drawn in the same style as
      // the letters of the logo, with the width axis from 50% to 150%.
      provider: fontProviders.local(),
      name: 'Anybody',
      cssVariable: '--font-anybody',
      fallbacks: ['sans-serif'],
      options: {
        variants: fontsourceVariants('anybody', 'wdth-normal', LATIN_SUBSETS, {
          weight: '100 900',
          style: 'normal',
          stretch: '50% 150%',
        }),
      },
    },
    {
      // Technical labels: temperatures, dates, kets.
      provider: fontProviders.local(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      fallbacks: ['monospace'],
      options: {
        variants: fontsourceVariants(
          'jetbrains-mono',
          'wght-normal',
          [...LATIN_SUBSETS, ['greek', GREEK]],
          { weight: '100 800', style: 'normal' },
        ),
      },
    },
  ],

  markdown: {
    // remark/rehype pipeline, required by remark-math and rehype-katex.
    // Formulas are rendered at build time: article pages ship no JavaScript.
    processor: unified({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [
          rehypeKatex,
          {
            // Macros of the previous site, used by the articles.
            macros: {
              '\\ket': '\\left|#1\\right\\rangle',
              '\\CX': '\\text{CX}_{#1 \\to #2}',
            },
          },
        ],
        rehypeFigure,
      ],
    }),
    shikiConfig: {
      theme: qubitoCodeTheme,
    },
  },

  vite: {
    plugins: [tailwindcss()],
    build: {
      // The 3D chunk (Three.js + GSAP, ~170 KB compressed) is loaded lazily on the home page only.
      chunkSizeWarningLimit: 800,
      // Small files stay files: inlined as data: URLs, the smallest KaTeX fonts would be
      // blocked by the CSP (font-src 'self').
      assetsInlineLimit: 0,
    },
  },
});
