# Linktree Page Guide

The Linktree-style landing page is stored in the multilingual content files at:

- `content/linktree/index.md` (Italian, default language)
- `content/linktree/index.en.md` (English)

Both files share the same front matter structure. The page is rendered with the custom template `layouts/_default/linktree.html`.

## Page Structure

The front matter contains two main blocks you can edit:

- `social`: a map of icon identifiers to URLs. The key must match one of the icon names provided by the Blowfish theme (e.g. `github`, `linkedin`, `instagram`, `globe`). Each key renders its corresponding SVG from `assets/icons/<icon>.svg`.
- `linkGroups`: an ordered list of sections. Each section has a `title` and an array of `links`, where every link defines a `label` (visible text) and a `url`.

Example excerpt:

```yaml
social:
  github: "https://github.com/QubiTO-team/qubito-website/"
  linkedin: "https://www.linkedin.com/company/qubito-student-team-politecnico-di-torino/"

linkGroups:
  - title: "Upcoming Events"
    links:
      - label: "Register for QHack"
        url: "https://example.org/register"
```

## Adding or Updating Social Icons

1. Open the language file you want to edit.
2. Inside the `social` block, add or update a key/value pair:
   ```yaml
   social:
     twitter: "https://twitter.com/qubito"
   ```
3. Ensure the key corresponds to an icon available in `assets/icons/`. (Use `x-twitter` for the X/Twitter logo.)
4. Repeat the change in the other language file to keep both versions aligned.

## Adding New Links

1. Decide which section the link belongs to (or create a new section—see below).
2. Inside the `links` array for that section, add a new item:
   ```yaml
   - label: "Community Discord"
     url: "https://discord.gg/your-invite"
   ```
3. Keep labels short; the layout is optimised for a single line on mobile.
4. Copy the same change into the translated file, translating the `label` text if needed.

## Creating a New Section

Add another entry to the `linkGroups` list:

```yaml
linkGroups:
  - title: "Resources"
    links:
      - label: "Starter Guide"
        url: "https://qubito.polito.it/resources/guide/"
```

The order of sections matches the order defined in the file. Reordering the array rearranges sections on the final page.

## Previewing Your Changes

After editing the content files:

```sh
npm run start
```

This command watches Tailwind classes, rebuilds `assets/css/compiled/main.css`, and launches `hugo server -D` so you can verify the Linktree page locally at `http://localhost:1313/linktree/`. When you exit the server, remember to apply the same edits to both language files before committing.
