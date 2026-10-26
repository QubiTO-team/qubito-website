// Builds Sveltia CMS from its npm package into public/admin/cms/, so that the /admin/ page loads
// it from our own domain: the CDN build would load fonts and code from unpkg.com and jsdelivr.net.
// Runs before `dev` and `build`; skipped when the installed version has already been built
// (`--force` builds anyway). The output is not committed (.gitignore).
//
//   node scripts/cms/build.mjs [--force]

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const here = (path) => fileURLToPath(new URL(path, import.meta.url));
const outDir = here('../../public/admin/cms/');
const stamp = `${outDir}VERSION`;

const { version } = JSON.parse(
  await readFile(here('../../node_modules/@sveltia/cms/package.json'), 'utf8'),
);
const built = await readFile(stamp, 'utf8').catch(() => '');
if (built.trim() === version && !process.argv.includes('--force')) {
  console.log(`Sveltia CMS ${version}: already built in public/admin/cms/`);
  process.exit(0);
}

console.log(`Sveltia CMS ${version}: building public/admin/cms/ ...`);
await build({
  configFile: false,
  root: here('.'),
  // Every file is loaded relative to cms.js, wherever the site is served from.
  base: './',
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 10_000,
    rollupOptions: {
      input: here('entry.js'),
      output: {
        entryFileNames: 'cms.js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
await writeFile(stamp, version);
console.log(`Sveltia CMS ${version}: done`);
