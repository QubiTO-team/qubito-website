/**
 * Writes the .htaccess of the Apache server into the build:
 *
 * - real 301 redirects: those in `redirects` of astro.config.mjs (whose static pages only send
 *   the browser on, and stay as a fallback) plus the old addresses that only the server can
 *   redirect, such as the taxonomy pages and the sitemaps of the Hugo site;
 * - the 404 page of each language;
 * - caching: files in _astro/ change name whenever their content changes and are kept for a
 *   year, everything else is checked again on every visit;
 * - compression, media types and security headers.
 *
 * Directives that need an optional Apache module are wrapped in <IfModule>, so that a server
 * without the module skips them instead of answering with an error.
 */
import { writeFile } from 'node:fs/promises';
import type { AstroIntegration, RedirectConfig } from 'astro';

/** Old addresses that only the server can redirect: [pattern, target]. */
const SERVER_REDIRECTS: [string, string][] = [
  // Pages of the Hugo taxonomies: tags are now plain labels of the articles.
  ['^/(en/)?(tags|categories|authors|series)(/.*)?$', '/$1articles/'],
  // Sitemaps of the Hugo site.
  ['^/(it/|en/)?sitemap\\.xml$', '/sitemap-index.xml'],
];

const TYPES: [string, string][] = [
  ['image/avif', '.avif'],
  ['image/webp', '.webp'],
  ['font/woff2', '.woff2'],
  ['font/woff', '.woff'],
  ['font/ttf', '.ttf'],
  ['model/gltf-binary', '.glb'],
  ['application/wasm', '.wasm'],
  ['application/manifest+json', '.webmanifest'],
  ['text/javascript', '.js .mjs'],
];

const COMPRESSED = [
  'text/html',
  'text/css',
  'text/javascript',
  'application/javascript',
  'application/json',
  'application/manifest+json',
  'application/xml',
  'application/rss+xml',
  'text/xml',
  'text/plain',
  'image/svg+xml',
  'model/gltf-binary',
  'application/wasm',
];

export function htaccess(): AstroIntegration {
  let redirects: Record<string, RedirectConfig> = {};
  return {
    name: 'qubito:htaccess',
    hooks: {
      'astro:config:done': ({ config }) => {
        redirects = config.redirects;
      },
      'astro:build:done': async ({ dir }) => {
        await writeFile(new URL('.htaccess', dir), render(redirects));
      },
    },
  };
}

function render(redirects: Record<string, RedirectConfig>) {
  const pageRedirects = Object.entries(redirects).map(([from, to]) => {
    const target = typeof to === 'string' ? to : to.destination;
    const status = typeof to === 'string' ? 301 : to.status;
    // With or without the final slash.
    return `RedirectMatch ${status} ^${escapeRegExp(from.replace(/\/$/, ''))}/?$ ${target}`;
  });
  const serverRedirects = SERVER_REDIRECTS.map(
    ([pattern, target]) => `RedirectMatch 301 ${pattern} ${target}`,
  );

  return `# Written by the build (src/lib/htaccess.ts): edit that file, not this one.

# Addresses of the previous site.
${[...pageRedirects, ...serverRedirects].join('\n')}

# Page not found, in the language of the address.
ErrorDocument 404 /404.html
<If "%{REQUEST_URI} =~ m#^/en/#">
  ErrorDocument 404 /en/404/index.html
</If>

AddDefaultCharset utf-8
<IfModule mod_mime.c>
${TYPES.map(([type, extensions]) => `  AddType ${type} ${extensions}`).join('\n')}
  AddCharset utf-8 .css .js .mjs .json .xml .txt .svg .webmanifest
</IfModule>

<IfModule mod_deflate.c>
  <IfModule mod_filter.c>
    AddOutputFilterByType DEFLATE ${COMPRESSED.join(' ')}
  </IfModule>
</IfModule>

<IfModule mod_headers.c>
  # Files in _astro/ change name whenever their content changes.
  <If "%{REQUEST_URI} =~ m#^/_astro/#">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </If>
  <Else>
    Header set Cache-Control "no-cache"
  </Else>

  # The pages can be framed only by the site itself (the meta tag of the CSP cannot say so).
  Header always set Content-Security-Policy "frame-ancestors 'self'"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
</IfModule>
`;
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
