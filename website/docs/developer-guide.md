# Developer guide

This guide is for whoever works on the code of the QubiTO website or puts it online. It assumes you have used Git
and a terminal before; everything else is explained along the way. If you only want to change texts, articles or
activities, [Editing the content](editing-content.md) is enough.

## Getting started

### What you need

| Program | Version | Notes |
|---|---|---|
| [Git](https://git-scm.com/downloads) | any recent one | on Windows it comes with Git Credential Manager, which handles the GitHub login |
| [Node.js](https://nodejs.org/) | **24** (at least 22.22) | an older version is refused on purpose: `npm ci` stops with `EBADENGINE` |

You don't need Blender or Python: the 3D models are already in the repository.

To check your Node version, run `node -v`. If you use nvm or fnm, `nvm use` (or `fnm use`) in the project folder
picks the right version from `.nvmrc`.

The site lives in the team's repository, `QubiTO-team/qubito-website`: it is the `website/` folder of the
`staging` branch. The `main` branch still holds the old Hugo site, and `hackathon/` is the site of the QubiTO
Hackathon. To push, your GitHub account needs write access to the repository; the first push opens the browser to
log in to GitHub.

### Install and run

```powershell
git clone --branch staging https://github.com/QubiTO-team/qubito-website.git
cd qubito-website/website
npm ci
npm run dev
```

All the commands of this guide run inside `website/`.

`npm ci` installs exactly the versions written in `package-lock.json` and takes about a minute. A few
`npm warn deprecated` messages are normal: they come from indirect dependencies and don't matter.

`npm run dev` starts a local server: the Italian site is at http://localhost:4321/ and the English one at
http://localhost:4321/en/. The browser reloads by itself when you save a file. Stop it with `Ctrl + C`.

### See the real thing

The development server is fast but a bit forgiving. Before you call something done, look at the site exactly as
it will be on the server:

```powershell
npm run build
npm run preview
```

`build` writes the whole site into `dist/`, and `preview` serves it at http://localhost:4321/. The security policy
of the site (more on it [below](#the-security-policy)) is only active here, so this is where you spot anything it
blocks.

### Try it on a phone

```powershell
npm run dev -- --host
```

The terminal also shows a "Network" address, something like `http://192.168.1.20:4321/`. Open it on a phone
connected to the same Wi-Fi. The site stays inside your local network. If Windows asks about the firewall, allow
it for private networks only. On networks like eduroam devices often can't see each other: use your phone's
hotspot instead.

### Edit the content without GitHub

The content editor can also work directly on the files on your computer, without a token. This only works in
**Chrome or Edge**.

1. `npm run dev`, then open http://localhost:4321/admin/index.html.
2. Click **Work with Local Repository** and pick the folder of the whole repository (`qubito-website`, the one
   that contains `website/`), not `website/` itself.
3. Edit and save: the editor writes straight into the files. It doesn't commit anything, so check the changes
   and commit them yourself.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | development server at http://localhost:4321/ |
| `npm run build` | builds the static site into `dist/` |
| `npm run preview` | serves `dist/` the way the server of the Politecnico will |
| `npm run check` | checks types and components (TypeScript and Astro) |
| `npm run format` | formats the code with Prettier (Markdown files are left alone, so formulas stay intact) |
| `npm run cms` | rebuilds the content editor into `public/admin/cms/` (normally `dev` and `build` do it for you) |
| `npm run deploy` | uploads the site to the server: see [Publishing the site](#publishing-the-site) |
| `node scripts/photos.mjs <photo> <out.jpg>` | prepares a photo for the site: upright, at most 2560 px, no hidden data |

## How the project is organised

The site is built with [Astro](https://astro.build): each page is turned into plain HTML when you run the build,
and nothing runs on the server. The main folders:

```
src/
  pages/        the addresses of the site: Italian at the root, English in pages/en/
  views/        the actual pages, one file each, shared by the two languages
  components/   pieces used by the pages (header, footer, galleries, timeline...)
  components/hero/   the 3D scene of the home page
  content/      articles, activities, pages, home texts and Linktree links
  i18n/         every piece of interface text, in Italian and in English
  layouts/      the HTML shell around every page (head, meta tags, header, footer)
  lib/          small helpers (content lists, images, the .htaccess file, Markdown plugins)
  styles/global.css   colours, fonts and the other design tokens
public/
  admin/        the content editor (its settings are in config.yml)
  models/       the 3D models, ready to use
scripts/
  deploy.mjs    the upload to the server
  photos.mjs    prepares photos
  cms/          builds the content editor
  blender/      the scripts that made the 3D models
```

**One page, two languages.** Every page has two tiny files in `src/pages/`, for example `team.astro` and
`en/team.astro`. Both just render `src/views/TeamView.astro` and tell it the language. So you write a page once, in
`src/views/`, and it works in both languages.

**Content.** Articles and activities have one folder each, with `index.it.md`, `index.en.md` and an `images/`
folder that both languages share. The folder name is what links the Italian and the English version, while the
address of each version comes from its `slug` field. The rules for each kind of content (which fields exist, which
are required) are in `src/content.config.ts`. The content editor has its own copy of those rules in
`public/admin/config.yml`: **whenever you change one, change the other**, or the editor will write files that the
build refuses.

**Interface texts.** Buttons, menu items, labels and messages live in `src/i18n/ui.ts`, never directly in the
components. In a component, `const t = useTranslations(lang)` and then `t('nav.articles')` give you the text in
the language of the page.

## Ground rules

These were decided with the team at the start of the project. Each one has a reason, so please keep them, or
discuss them with the team before changing them.

1. **Static only.** The server of the Politecnico can only hand out files: no server code, no database, no
   forms that post to a server of our own. In Astro terms: `output: 'static'`, no adapters, no endpoints.
2. **Always in both languages.** Italian at the root (`/`), English under `/en/`. Every page and every piece of
   content exists in both, and the two versions say exactly the same things. Interface texts go in
   `src/i18n/ui.ts`.
3. **Nothing loaded from other websites.** No CDNs, Google Fonts, embeds or iframes: fonts and libraries are
   installed with npm and served from our own domain. It's faster, it respects the privacy of visitors, and it
   keeps the security policy strict. The only exception, agreed with the team, is
   [Simple Analytics](https://www.simpleanalytics.com): it uses no cookies and is explained on the Privacy page.
4. **JavaScript only where it's needed.** three.js and GSAP load on the home page only. The other pages ship
   almost no JavaScript: the background particles (`ParticleField.astro`, about 1.4 KB compressed), Simple
   Analytics and, on Join us while applications are open, the application form.
5. **Don't break existing addresses.** People and search engines link to the old pages. If you rename a page or
   change a slug, add a redirect in `redirects` in `astro.config.mjs`. The build turns it into a real redirect for
   Apache too, in `.htaccess` (`src/lib/htaccess.ts`).
6. **Accessible to everyone.** Respect "reduce motion" (`prefers-reduced-motion`), keep text contrast at least AA,
   give every image an alternative text (the content rules require it), and make sure everything works with the
   keyboard.
7. **The look.** A black background everywhere, with no gradients or glows: the only violet light comes from the
   particles. Colours and fonts are tokens in `src/styles/global.css`. Space Grotesk is used for everything, and
   JetBrains Mono only for technical labels (temperatures, dates, kets). Anybody is used only for the animated
   title on the home page, which turns into the logo. The fonts are the same as on the QubiTO Hackathon site, so
   the two sites feel related.
8. **Tidy work.** Comments in English that explain what the code does and why. `npm run format` before
   committing. Small commits with a short English message in the
   [Conventional Commits](https://www.conventionalcommits.org) style (`feat: ...`, `fix: ...`, `docs: ...`). The
   team chose not to keep automated test scripts in the repository: check your changes by hand, as described in
   [Before you publish](#before-you-publish).

### The security policy

The site sends a Content Security Policy (CSP): a list of what pages are allowed to load and run. It's set in
`security.csp` in `astro.config.mjs`. Astro adds a fingerprint (hash) for every script and style it builds, and
the browser refuses anything else. In practice:

- write scripts inside the `<script>` tags of Astro components, never as inline `onclick="..."` attributes, and
  never use `eval`;
- don't use Astro's `<ClientRouter />`: it doesn't work with this policy;
- if a page really needs something from another website (like the application form, which posts to a Google
  script), allow it on that page only, with `Astro.csp?.insertDirective(...)`, as `src/views/JoinUsView.astro`
  does;
- after a change, run `npm run build` and `npm run preview`, open the browser's developer tools and check the
  console: anything blocked shows up there as an error.

The content editor at `/admin/` is a plain page with its own, looser policy (`public/admin/index.html`), because it
needs things the site doesn't allow.

## The home page and the 3D scene

As you scroll the home page, a 3D model of a dilution refrigerator, the "cryostat" that keeps quantum computers
cold, turns slowly and moves down one stage at a time: 300 K at the top, then 50 K, 4 K, 800 mK, 100 mK, 20 mK
(where the camera dives into the chip with the qubits) and 10 mK in the footer. Each section of the page is one of
those stages, marked by a small golden plate with its temperature (`StagePlate.astro`), and the 3D plate with the
same temperature lines up next to it.

Some details that matter:

- The model follows the scroll, slightly smoothed. **On phones and tablets** the 3D is drawn at 45% opacity
  behind the text so that it doesn't get in the way of reading.
- On computers you can **turn the model by dragging it** with the mouse (only over the model itself, not over
  text or buttons).
- With "reduce motion" turned on, with "save data", or without WebGL 2, the page shows a still picture instead,
  and nothing heavy is downloaded.
- The animation keeps running while the page is still (the particles move), but it stops when the tab is hidden.
- The 3D appears as soon as it's ready, usually within a second or two. The chip of the finale is downloaded
  together with the cryostat and prepared before the 3D appears: preparing it later, while the page moves, made
  the page stutter (on slower computers, and on fast screens even on good ones).
- To stay smooth, the 3D draws 30 frames per second while the page is still, and on computers up to about 60
  while you scroll or turn the model, so that it keeps up with the page. It lowers its resolution a step at a
  time on devices that can't keep up (it goes back up when there is room again). On fast
  computers it is drawn at twice the screen resolution, so thin lines stay smooth; phones use antialiasing.

The code is in `src/components/hero/`:

| File | What it does |
|---|---|
| `QuantumScene.astro` | the canvas behind the page, and the decision whether to load the 3D at all |
| `scene.ts` | the scene: camera, lights, model, the descent stage by stage, the final dive |
| `scroll.ts` | finds where each stage of the page is and how far you've scrolled |
| `chip.ts` | the chip at 20 mK and the particles that land on its qubits |
| `particles.ts` | the thermal particles: many and different at 300 K, few, alike and slow at 10 mK |
| `environment.ts`, `surface.ts` | reflections of the metals and the fine detail of their surfaces |
| `shaders.ts` | prepares the materials before the first frame, so that the page doesn't freeze |
| `pick.ts` | tells whether the mouse is over the model, for dragging |
| `quality.ts` | how often the 3D is drawn and at which resolution, so that slower devices stay smooth |

The timing of the movement (how quickly the model follows the page, how long the particles take to land on the
qubits, and so on) is set by the constants at the top of `scene.ts`, each with a comment.

Judge smoothness in a normal browser window. Windows controlled by automation tools make WebGL very slow, even on
a fast computer.

### Changing the 3D models (optional)

You don't need this to work on the site. The finished models are in `public/models/` and the still pictures in
`src/assets/hero/` and `src/assets/home/`, and the site uses them as they are. The Blender scripts that made them
are in `scripts/blender/`, in case someone wants to change the shape one day.

<details>
<summary>How to rebuild the models (Blender 5)</summary>

Intermediate files go in `scripts/blender/build/`, which Git ignores. Replace the path of Blender with yours.

```powershell
$blender = "C:\Program Files\Blender Foundation\Blender 5.0\blender.exe"

# Cryostat, detailed (computers) and light (phones)
& $blender -b --factory-startup -P scripts/blender/cryostat.py -- --detail high --glb scripts/blender/build/cryostat-desktop-raw.glb
& $blender -b --factory-startup -P scripts/blender/cryostat.py -- --detail low --glb scripts/blender/build/cryostat-mobile-raw.glb
npx gltf-transform optimize scripts/blender/build/cryostat-desktop-raw.glb public/models/cryostat-desktop.glb --compress quantize --texture-compress false --simplify false --join false --flatten false --instance false --palette false
npx gltf-transform optimize scripts/blender/build/cryostat-mobile-raw.glb public/models/cryostat-mobile.glb --compress quantize --texture-compress false --simplify false --join false --flatten false --instance false --palette false

# Still picture of the cryostat (redo it whenever the materials change)
& $blender -b --factory-startup -P scripts/blender/cryostat.py -- --detail high --render scripts/blender/build/cryostat-static.png --view hero --samples 192 --resolution 1100x1650 --transparent
node -e "require('sharp')('scripts/blender/build/cryostat-static.png').trim({threshold:1}).png({compressionLevel:9}).toFile('src/assets/hero/cryostat.png')"

# Chip (units in millimetres)
& $blender -b --factory-startup -P scripts/blender/chip.py -- --texture-size 2048 --textures scripts/blender/build/web --glb scripts/blender/build/chip-raw.glb
npx gltf-transform optimize scripts/blender/build/chip-raw.glb public/models/chip.glb --compress quantize --texture-compress false --simplify false --join false --flatten false --instance false --palette false --prune false
& $blender -b --factory-startup -P scripts/blender/chip.py -- --view macro --glow 1.2 --samples 192 --render scripts/blender/build/chip-macro-glow.png
# then save it as a JPEG in src/assets/home/chip.jpg
```

A few things to know:

- No Draco or Meshopt compression: both would need WebAssembly, which the security policy doesn't allow on the
  site.
- `--prune false` on the chip keeps the empty markers called `qubit-<row>-<column>`, which tell the scene where
  the qubits are.
- The plates of the cryostat must keep their names (`plate-300K` ... `plate-10mK`): the scene finds them by name.
- `gltf-transform optimize` merges materials with identical values. Two materials that must stay separate need
  at least one different value.
- The qubit design on the chip is adapted from Fig. 1 of J. Rönkkö et al. (IQM), *EPJ Quantum Technology* 11, 32
  (2024), under the CC BY 4.0 licence. The credit line under "Where the qubits live" on the home page must stay.

</details>

## The content editor

The editor is [Sveltia CMS](https://sveltiacms.app). Instead of loading it from a CDN, which would bring in code
and fonts from other websites, `scripts/cms/build.mjs` builds it from its npm package into `public/admin/cms/`.
That folder isn't in Git: it's rebuilt automatically before `dev` and `build`, and only when the version changes.

- Its settings are in `public/admin/config.yml`. At the top, `repo`, `branch` and `root_dir` say where it saves:
  the `website/` folder of the `staging` branch of `QubiTO-team/qubito-website`. Every save is a commit there, so
  the preview rebuilds itself. If the site moves to another branch or folder, change them there.
- Online, people sign in with a GitHub personal access token (see [Editing the content](editing-content.md)).
  "Sign In with GitHub" would need an extra sign-in service, which we don't have.
- Uploaded photos are converted to WebP, at most 2560 px, without the hidden data of the camera.
- The text of articles and pages is edited as plain Markdown on purpose: the visual editor would rewrite
  formulas and figures in ways the site can't read.

<details>
<summary>How to remove the editor completely</summary>

It doesn't touch the site or the content: delete `public/admin/` and `scripts/cms/`; in `package.json` remove the
`predev`, `prebuild` and `cms` scripts and run `npm uninstall @sveltia/cms`; remove the line `public/admin/cms/`
from `.gitignore` and the entry `public/admin/cms` from `exclude` in `tsconfig.json`.

</details>

## Before you publish

1. `npm run check` and `npm run build` must finish without errors. GitHub runs the same two on every push to
   `staging` before it updates the preview (`.github/workflows/deploy.yml` of the repository), and emails whoever
   pushed if they fail; the preview then stays as it was. Nothing runs on a schedule.
2. `npm run preview`, then look at the pages you changed, in both languages, with the browser console open: no
   red errors, nothing blocked by the security policy.
3. If you touched the home page, scroll it all the way down to the chip, on a computer and on a phone.
4. For a bigger change, run Lighthouse from Chrome's developer tools on the home page and on an article. Today
   accessibility, best practices and SEO are at 100, and speed is between 95 and 100.

## The staging preview

Before a change goes on the real server, the team can look at it on https://qubito-team.github.io/. That page
shows the `staging` branch of the repository. On every push to `staging`, GitHub builds `website/` and adds the
hackathon site at `/hackathon/` (`.github/workflows/deploy.yml`); after a couple of minutes the preview is up to
date.

So to update the preview, commit and push to `staging`. The content editor saves there too: pull before you
start working (`git pull`), so you have the latest texts. Never reset or force-push `staging`: the other people of
the team and the content editor use it too. Merging `main` into it is fine.

The preview is built with `PREVIEW=true`, which changes only two things: search engines are asked not to index
the pages, and visit statistics are switched off. GitHub Pages isn't Apache, so `.htaccess` does nothing there:
old addresses like `/tags/qiskit/` and the English "not found" page work only on the real server.

## Publishing the site

> **Only with the team's go-ahead.** Until the team decides otherwise, the site online is the old one.

The site lives on an Apache server of the Politecnico. You can reach it **only via SFTP, with a key, and only from
the Politecnico's VPN**. The site goes into the `htdocs/` folder (there are other files next to it: leave them
alone), and the space available is 1 GB.

Inside `htdocs/` there's also `hackathon/`, the site of the QubiTO Hackathon, which is built and uploaded
separately. The upload script never touches it.

### Once, on each computer you publish from

1. Install [rclone](https://rclone.org/install/), the program that copies the files: on Windows,
   `winget install Rclone.Rclone`. Or download the zip and set the `RCLONE` environment variable to the path of
   `rclone.exe`.
2. Ask the IT of the Politecnico for the server address, the user name and the key. The private key stays on your
   computer only: never put it in the repository.
3. Create the connection, called `qubito`:

   ```powershell
   rclone config create qubito sftp host=<address> user=<user> key_file=<path of the key> shell_type=none
   ```

   If the key has a password, add `key_file_pass=<password> --obscure`. `shell_type=none` tells rclone that the
   server offers SFTP only, without a shell.

### Every time

Connect to the VPN of the Politecnico, then:

```powershell
npm run deploy -- --dry-run   # builds the site and shows what would change, without uploading
npm run deploy                # the same, then asks for confirmation and uploads
```

`npm run deploy` builds the site and checks that it's complete. Then it shows which files are new and which will
be deleted, and asks you to type `yes`. Before uploading, it saves a copy of the site that is online in
`deploy-backups/<date>/` (ignored by Git). Then it uploads in an order that keeps the site working during the
upload: first the new files, then the pages, and at the end it deletes the old files. It refuses to work on any
folder other than `htdocs/`.

After the upload, open https://qubito.polito.it/ and check a few pages. Also try a page that doesn't exist (for
example `/test/` and `/en/test/`, which must show the Italian and the English "not found" page) and an old address
(for example `/tags/qiskit/`, which must lead to the articles).

- **To go back to the previous version:**
  `rclone sync deploy-backups/<date> qubito:htdocs --exclude "/hackathon/**"`.
- **If the server answers with "500 Internal Server Error"** after the first upload, it doesn't accept the
  `.htaccess` file. The build writes that file (from `src/lib/htaccess.ts`) for redirects, error pages, caching
  and security headers. Delete it with `rclone deletefile qubito:htdocs/.htaccess` and tell the IT of the
  Politecnico.

Run it from `website/` on an up-to-date `staging` branch (`git pull` first). Changes made with the content editor
reach the site the same way: they're saved on GitHub, and someone with the VPN and the key runs `npm run deploy`.
Remember that "Upcoming" activities are also decided at build time, so after an event ends, the site needs a new
upload.

### Before the very first upload

- The team's go-ahead.
- The team has read the Privacy page, especially how long applications are kept.
- Give the people who edit content write access to the repository.

## Things we learned the hard way

Small traps we've already fallen into. They're worth a look before you change the related code.

- **Changing a Markdown plugin.** Astro keeps already-rendered Markdown in `node_modules/.astro/data-store.json`.
  If you change a plugin without touching the texts, delete that file, or the pages won't change.
- **The home page shows a still cryostat in `npm run dev`**, and the console says
  `Failed to fetch dynamically imported module`. This happens after an `npm install` or a change to
  `astro.config.mjs`: Vite has rebuilt its copy of three.js and GSAP, but the running server still asks for the
  old one. Stop the server, start it again and reload with `Ctrl + F5`. If that's not enough, use
  `npm run dev -- --force`.
- **CSS scroll-driven animations.** The CSS minifier folds `animation-timeline` into the `animation` shorthand,
  and Chrome then ignores it. Keep `animation-timeline` in a separate rule.
- **Images.** Astro enlarges an image if you ask for sizes wider than the original: use `widthsUpTo` from
  `src/lib/images.ts`. `<Picture class="...">` puts the class on the `<img>`; to place the `<picture>` itself in
  a grid, use `pictureAttributes`.
- **KaTeX fonts.** `assetsInlineLimit: 0` in `astro.config.mjs` is there because Vite would inline the smallest
  KaTeX fonts as `data:` addresses, which the security policy blocks. `katex` stays at version 0.16, the one
  `rehype-katex` supports.
- **Fonts and layout shifts.** The Latin file of Space Grotesk is preloaded in `BaseLayout.astro`. Without it,
  long titles wrapped differently with the fallback font, and the page jumped when the real font arrived.
- **three.js materials.** Two materials with the same `onBeforeCompile` but different shader code need different
  `customProgramCacheKey` values, or three.js reuses the first program. And with `scene.environment` set,
  three.js ignores `material.envMapIntensity`: to dim a single material, do it in its shader.
- **Reflections.** `environment.ts` prepares reflections with a lighter filter that relies on internal parts of
  three.js's `PMREMGenerator` (r186). If they're missing after an update, it falls back to the standard filter on
  its own, but check that the start of the home page is still quick.
- **Windows and shaders.** On Windows, `compileAsync` alone doesn't help: the browser compiles each shader at its
  first draw. That's why `shaders.ts` draws every material once on a single pixel before the model appears.
- **Soft shadows on text.** Chrome prepares a drawing program for each blur size the first time it draws it,
  and meanwhile the whole page stops. Three sizes on the footer of the home page (3, 8 and 16 px) made it stutter
  for about 50 ms as the footer came near: use one blur size, repeated if it needs to be darker.

## Common problems

- **`EBADENGINE` during `npm ci`:** your Node is too old. Install version 24.
- **PowerShell says that running scripts is disabled** when you type `npm`: use `npm.cmd` instead (for example
  `npm.cmd run dev`), or the classic Command Prompt.
- **Port 4321 is busy:** `npm run dev -- --port 4322`.
- **The 3D stutters:** check that hardware acceleration is turned on in the browser settings.
