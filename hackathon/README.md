# Qubito Hackathon 2026 website

Static website for the Qubito Hackathon (11–13 December 2026), served at
**https://qubito.polito.it/hackathon/** (English) and **/hackathon/it/** (Italian).

It lives inside the team site repo but is a separate [Astro](https://docs.astro.build) project:

- `hackathon/` (this folder): the source.
- `static/hackathon/`: the finished site, produced by `npm run build` here. Hugo copies `static/`
  unchanged, so the page is part of the normal team-site build and deploy, at `/hackathon/`.
- Nothing on the main site links to it yet: it is reachable only by typing the address.
  Hugo and Tailwind of the main site are not affected (checked: identical CSS output).

## Run it locally

Needs Node.js 22.23+ (check with `node -v`).

```bash
npm install        # once
npm run dev        # http://localhost:4321/hackathon/ , reloads on every change
npm run build      # writes the final site to ../static/hackathon/
npm run preview    # serves the build to check it
```

## Where things are

| To change | Edit |
|---|---|
| Application form link, contact email, countdown, application deadline / open-closed | `src/config.ts` |
| Schedule | `src/data/schedule.ts` |
| Partners and logos | `src/data/partners.ts` + images in `public/logos/` |
| FAQ | `src/data/faq.ts` |
| Organising team | `src/data/team.ts` (photos in `public/team/`) |
| Section names / order (also the order on the Bloch sphere) | `src/data/sections.ts` |
| Text of each section | `src/components/<Section>.astro` |
| Privacy notice, code of conduct, practical info | `src/content/en/*.md` and `src/content/it/*.md` |
| Colours, layout | `src/styles/global.css` |
| Sphere, superposition text, forms behaviour | `src/scripts/home.js` |
| Link preview image | `public/og-image.png` (source: `../demos/og/og-image.html`) |

Every text exists in English and Italian side by side, e.g. `{ en: 'Apply', it: 'Candidati' }`.
Always fill both.

## Applications (Google Form)

Applications go through the team's Google Form on teamqubito@gmail.com
(`APPLICATION_FORM_URL` in `src/config.ts`). Every "Apply" button opens it in a new tab; at the deadline
the buttons switch to "Applications are closed" by themselves. The Form must also be closed by hand (or
scheduled) in Google Forms. Checklist for the Form: `GOOGLE-SETUP.md`.

Partner requests: the "Get in touch" button opens an email to teamqubito.

`apps-script/hackathon.gs` is a backup: a custom backend (applications and partner requests into a Sheet,
confirmation emails, spam protection) in case the team ever wants a form built into the site instead.

## Publish a change

1. Edit the source in `hackathon/`, check it with `npm run dev`.
2. `npm run build` (updates `../static/hackathon/`).
3. Commit **both** `hackathon/` and `static/hackathon/`, then follow the usual team workflow
   (branch from `staging` → pull request → `staging` → `main`).
4. The team site's normal deploy then includes `/hackathon/`: the GitHub Action for the preview, and the
   usual `npm run build` of the main site + SFTP upload of `public/` to `/htdocs/` for qubito.polito.it.
   Upload with WinSCP/FileZilla **synchronize** (only changed files) and never delete `/htdocs/.well-known/`.
