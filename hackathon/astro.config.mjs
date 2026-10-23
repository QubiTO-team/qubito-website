// @ts-check
import { defineConfig } from 'astro/config';

// Qubito Hackathon site, served at https://qubito.polito.it/hackathon/
//
// `npm run build` (inside this folder) writes the finished static site into ../static/hackathon/.
// Hugo copies static/ unchanged into the main site, so the page exists at /hackathon/ without any
// link or menu entry on the main site. Commit the updated static/hackathon/ together with the source.
//
// SITE_URL / BASE_PATH / NOINDEX can override the address for a test build elsewhere (normally unused).
const site = process.env.SITE_URL || 'https://qubito.polito.it';
const base = process.env.BASE_PATH || '/hackathon';

export default defineConfig({
  site,
  base,
  outDir: '../static/hackathon',
  trailingSlash: 'always',
  build: { format: 'directory' },
  vite: {
    define: { __NOINDEX__: JSON.stringify(process.env.NOINDEX === 'true') },
  },
});
