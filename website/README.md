# QubiTO website

This is the new website of [QubiTO](https://qubito.polito.it), the quantum computing student team of the
Politecnico di Torino. It replaces the old Hugo site, keeps all of its addresses, and is available in Italian
(at the root, `/`) and in English (under `/en/`).

> **Not online yet.** The site you see at qubito.polito.it is still the old one. This one goes live only when the
> team decides so.

## Which guide do I need?

- **You want to write an article, add an activity or change a text on the site:**
  read [Editing the content](docs/editing-content.md). You only need a browser and a GitHub account, no
  programming.
- **You want to change how the site looks or works, or put it online:**
  read the [Developer guide](docs/developer-guide.md).

## Try it on your computer in two minutes

You need [Git](https://git-scm.com/downloads) and [Node.js 24](https://nodejs.org/). Then, in a terminal:

```powershell
git clone https://github.com/FBarattero/qubito-website-v2.git
cd qubito-website-v2
npm ci
npm run dev
```

Open http://localhost:4321/ for the Italian site and http://localhost:4321/en/ for the English one. Press
`Ctrl + C` in the terminal to stop it.

The repository is private for now: to clone it, your GitHub account must have been added to it. The
[Developer guide](docs/developer-guide.md#getting-started) explains every step in more detail and what to do if
something goes wrong.

## In short, how the site is made

- It is a **static site**: every page is built in advance into plain HTML files, and the server of the Politecnico
  just hands them out. There is no database and nothing runs on the server.
- It is built with [Astro](https://astro.build). The texts live in simple files inside the repository, and a
  content editor ([Sveltia CMS](https://sveltiacms.app), at `/admin/`) lets anyone change them from a browser.
- On the home page a 3D model of a dilution refrigerator (the "cryostat" that keeps quantum computers cold) turns
  and descends as you scroll, down to the chip where the qubits live. It is made with
  [three.js](https://threejs.org).
