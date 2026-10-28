# Editing the content

This guide is for everyone in QubiTO who wants to publish an article, add an activity or change a text on the
website. You don't need to know how to program: everything happens in a web page, the **content editor**.

If you get stuck, nothing is lost: every change you save is kept as a separate version on GitHub, so any mistake
can be undone.

## How it works, in one minute

All the texts of the site (articles, activities, pages, the home page) are stored as small text files in the
site's repository on GitHub. The content editor, at `/admin/`, is a friendlier way to change those files: you fill
in a form, press **Save**, and the editor writes the files on GitHub for you.

Saving does **not** change the public website right away. The site is rebuilt and uploaded to the server of the
Politecnico by hand, from time to time, by someone in the team who has access to the server (the
[Developer guide](developer-guide.md#publishing-the-site) explains how). So:

- you can save as often as you like: visitors see your changes only after the next upload;
- if you want something online quickly, tell the person who publishes the site.

## Getting access (once)

1. **A GitHub account.** If you don't have one, create it at https://github.com/signup. Then ask whoever
   manages the repository to add you to it.
2. **A personal access token.** This is a long password that lets the editor save to GitHub on your behalf,
   and nothing else.
   1. Open https://github.com/settings/personal-access-tokens/new (or: your picture at the top right →
      **Settings** → **Developer settings**, at the bottom of the left menu → **Personal access tokens** →
      **Fine-grained tokens** → **Generate new token**).
   2. Give it a name you will recognise, for example "QubiTO website", and choose an expiry date.
   3. Under **Repository access** choose **Only select repositories** and pick the website repository.
   4. Under **Permissions**, click **Add permissions**, look for **Contents** and set it to **Read and
      write**. Leave everything else as it is.
   5. Click **Generate token** and copy it. GitHub shows it only once.
3. **Open the editor** and sign in.
   - Once the new site is online, the editor is at https://qubito.polito.it/admin/.
   - Until then, the editor works from a copy of the site running on your computer: follow the short
     instructions in the [README](../README.md#try-it-on-your-computer-in-two-minutes), then open
     http://localhost:4321/admin/index.html.

   Click **Sign In Using Access Token** and paste your token. Your browser remembers it, so you only do this
   once per browser. ("Sign In with GitHub" doesn't work: it would need an extra sign-in service that we don't
   have.)

Treat the token like a password: don't paste it anywhere else and don't send it to anyone. If you think someone
else has it, delete it on the same GitHub page and create a new one. When it expires, just create a new one.

The editor's own buttons follow the language of your browser. This guide uses the English names.

## Finding your way around

On the left you see the **collections**, one for each kind of content: **Articles**, **Activities**, **Pages**
(About us, Contacts, Join us, Privacy), **Home** and **Linktree**. Click one to see what's inside it. The **New**
button at the top right creates a new article or activity.

When you open something, the form is on the left and a preview is on the right. At the top of the form there are
two tabs, **Italian** and **English**: that's where you switch between the two versions. On the right you can
show the other language instead of the preview, so you can translate while looking at the original.

Fields marked with a red `*` are required: the editor won't save until they're filled in. When you're done,
press **Save** at the top right.

The translate button (the one with 文A) would need a paid translation service that we haven't set up. Please
write both languages yourself.

## Two languages, same content

The site exists in Italian and in English, and **the two versions must say exactly the same things**. If you
add a sentence, a photo description or a paragraph in one language, add it to the other too.

A few fields are the same in both languages, such as dates, authors and photos, and the "draft" and "applications
open" switches. You fill them in once, in the **Italian** tab, and the English version copies them
automatically: in the English tab you'll see them, but you can't change them there.

## Writing an article

1. Go to **Articles** and click **New**.
2. In the **Italian** tab, fill in:
   - **Title** and **Description**: the description is one or two sentences. It appears in the list of articles
     and when someone shares the link on social media.
   - **Publication date** and **Authors** (one entry for each author).
   - **Topics**, if you want: a few keywords, like "Qiskit" or "Cryptography".
   - **Address**: the last part of the page address, for example `introduzione-a-qiskit`. Only lowercase
     letters without accents, numbers and hyphens. It can be different in each language.
   - **Cover image**, if you have one: tick the box, upload the picture and describe what it shows.
   - **Text**: the article itself, written in Markdown (see the [cheat sheet](#markdown-cheat-sheet) below).
3. Switch to the **English** tab and fill in the same fields in English.
4. Press **Save**.

If the article isn't finished yet, turn on **Draft (not published)** before saving. Drafts are kept on GitHub but
don't appear on the site. Turn it off when the article is ready.

### Images inside the text

Pictures inside the text (diagrams, plots, circuits) are uploaded in the field **Images in the text**, just
above the text:

1. Click **Add Images in the text**, then **Browse** and **Upload**, and pick the picture from your computer.
   Press **Insert**.
2. Next to the picture, the editor shows its file name, for example `./images/bloch-sphere.webp`. Every picture
   becomes a WebP, so the name always ends in `.webp`.
3. In the text, where the picture should go, write
   `![What the image shows](./images/bloch-sphere.webp "Caption|short-id")`.
   The caption appears under the picture with its number ("Fig. 1"), and the short id lets you link to it
   from the text with `[Fig. 1](#short-id)`.

Upload each picture once, even if the article has both languages: the Italian and English texts share the same
pictures. Use simple file names: lowercase, no spaces. The upload also removes the place where a phone photo was
taken.

The **Image** button in the toolbar of the text only types `![]()`: use the field above instead.

## Adding an activity

Activities are the events, hackathons and talks of the team. They appear on the timeline of the **Activities**
page and the latest ones on the home page.

1. Go to **Activities** and click **New**.
2. In the **Italian** tab, fill in:
   - **Title** and **Description** (one sentence, shown in the timeline).
   - **Start date**: it decides the order. If you only know the month, use the first day of the month.
   - **Last day**, only for events longer than one day.
   - **Date as shown on the site**, if you want it written in a particular way, like "8–10 maggio 2026" or
     "Autunno 2024". If you leave it empty, the site shows the start date.
   - **Place** and **Result** (an award or a placement), if there are any.
   - **Photos**: the first one is also shown in the timeline. For each photo, write a short description of what
     it shows.
   - **External links** (for example the event's website) and **Sign-up**, a button that disappears by itself
     when the event is over.
   - **Text**: what happened, in Markdown.
3. Fill in the **English** tab, then **Save**.

Activities that haven't finished yet appear under "Upcoming" at the top of the page. The site decides this when it
is built, so after an event ends it moves to the past only with the next upload of the site.

## Photos

When you upload a photo through the editor, it is automatically:

- converted to WebP, a format that keeps good quality with smaller files;
- shrunk to at most 2560 pixels per side (the site then makes even smaller copies for phones);
- cleaned of the hidden data that phones add, such as the camera model and the GPS position.

Every photo needs an **alternative text**: a short sentence saying what the photo shows ("Five QubiTO members
presenting their project at ETH Zurich"). People who can't see images, and search engines, read it instead of the
photo.

Only upload photos that the team is allowed to publish, and that the people in them are happy to see online.

## Pages

In **Pages** you can change the texts of four pages:

- **About us**: introduction, photo and text.
- **Contacts**: introduction and the closing message. The email address and the social links are added by the
  site itself.
- **Join us**: see [Opening applications](#opening-applications) below.
- **Privacy**: what the site does with visitors' data. If you change how we handle applications or statistics,
  update this page too.

The **Description for search engines** of each page is what Google shows under the link: one or two clear
sentences.

## Opening applications

Applications are closed by default. To open them:

1. Go to **Pages → Join us**.
2. Turn on **Applications open** (in the Italian tab: it switches both languages) and check that the
   introduction, the text and the privacy note are up to date in both languages.
3. Press **Save**.

After the next upload of the site, the application form appears on the Join us page, and "Join us" shows up in
the menu, on the home page and on the About us page. To close applications, turn the switch off and save again.

The form sends the answers to the team's Google sheet, the same one used by the old site. **Before opening
applications for real, send one test application** and check that it arrives in the sheet.

## The home page

In **Home → Home page texts** you can change:

- the **sentence under the logo** (it's also used in the footer, on the Linktree page and in the title of the
  home page);
- for each section (About us, What we do, Articles, Get in touch, Where the qubits live): the title, the
  paragraphs or the introduction, and the **buttons**. You can add, remove and reorder paragraphs and buttons.

A button needs a text and an address. The address can be a page of the site, written with its language, like
`/team/` for the Italian page and `/en/team/` for the English one, or another website, written in full
(`https://...`).

A few things on the home page are fixed:

- the sections themselves: each one is a stage of the cryostat in the 3D animation, so you can't add or remove
  sections;
- the latest activities and articles, which the site picks automatically;
- the button with the team's email in "Get in touch", and the "Join us" button, which appears by itself while
  applications are open;
- the **Source of the chip design** under "Where the qubits live". The drawing of the qubits on the chip comes
  from a scientific article published under a licence (CC BY 4.0) that asks us to name the authors, the source
  and the licence. Please keep that line.

## Linktree

**Linktree → Linktree links** changes the Linktree page (`/linktree/`): a simple page with the team's most useful
links, meant to be linked from social media profiles. The links are organised in groups, each with a title. For pages of the site, write the address with its language (`/activities/` or `/en/activities/`); for
anything else, the full address.

## What you can't change from the editor

Some parts of the site are in the code: the menu, the footer (social links, email address, Politecnico logo),
the link to the hackathon website, the questions of the application form and the look of the site. If one of
them needs to change, ask someone who works on the code.

## Markdown cheat sheet

The texts of articles, activities and pages are written in Markdown: plain text with a few symbols for
formatting. You don't need to learn it all at once: these cover almost everything.

| You write | You get |
|---|---|
| `## A section title` | a section title (the article title is already at the top, so start from `##`) |
| `### A smaller title` | a sub-section title |
| `**bold**` and `*italic*` | **bold** and *italic* |
| `[the QubiTO site](https://qubito.polito.it)` | a link |
| `- an item` on each line | a bulleted list (`1.` for a numbered one) |
| `$E = mc^2$` | a formula inside a sentence |
| `$$` on a line, the formula, then `$$` on its own line | a formula on its own line |
| `\ket{0}` inside a formula | the ket \|0⟩ |
| `![What it shows](./images/file.webp "Caption\|my-figure")` | a numbered figure with its caption |
| `[the figure above](#my-figure)` | a link to that figure |

Formulas use LaTeX, as in a thesis. For code, put three backticks and the language name on the line before
(for example ```` ```python ````) and three backticks on the line after.

A table has `|` between the cells and a line of `---` under the first row, which becomes the header:

```text
| Gate | Before | After |
|---|---|---|
| CZ | 0 | 7 |
| SWAP | 0 | 14 |
```

Leave an empty line between paragraphs. A single line break inside a paragraph is ignored.

## When something goes wrong

- **The editor won't save, or says that the token is not valid.** Your token has probably expired, or it lacks
  the "Contents: Read and write" permission. Create a new one (see [Getting access](#getting-access-once)).
- **The Address field is red.** Use only lowercase letters without accents, numbers and hyphens:
  `quantum-error-correction`, not `Quantum Error Correction`.
- **I saved, but the website hasn't changed.** That's expected: changes go online with the next upload of the
  site. Ask the person who publishes it.
- **I deleted something by mistake, or broke a page.** Don't worry: GitHub keeps every version. Ask someone who
  works on the code to restore the previous one. To hide an article or an activity without deleting it, turn on
  **Draft** instead: deleting removes both languages and the photos.
