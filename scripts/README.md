# latex-to-article — Usage Guide

---

## English

### Requirements

- Node.js 20+
- `unzip` installed on your system (`sudo apt install unzip` on Debian/Ubuntu)

No extra npm dependencies are required.

### Running the script

Run the script from the **project root**:

```bash
node scripts/latex-to-article.js <path-to-zip> [options]
```

#### Options

| Option | Default | Description |
| --- | --- | --- |
| `--output <dir>` | `content/articles` | Destination directory for the new article |
| `--dry-run` | off | Preview the conversion without writing any files |
| `--help`, `-h` | — | Show the help message |

#### Examples

```bash
# Basic usage — creates the article under content/articles/
node scripts/latex-to-article.js my-article.zip

# Preview without writing anything
node scripts/latex-to-article.js my-article.zip --dry-run

# Custom output directory
node scripts/latex-to-article.js my-article.zip --output content/articles
```

### What the script does

1. Extracts the zip to a temporary directory.
2. Locates `main.tex` (or the largest `.tex` file as a fallback).
3. Reads `meta.json` (or `meta.yaml` / `meta.yml`) for article metadata. If no meta file is present, it falls back to the `\title` and `\author` commands in the LaTeX preamble.
4. Converts the LaTeX body to Markdown.
5. Creates a new directory under `content/articles/` named `{slug}_{date}_{randomID}`.
6. Writes `index.md` with the Hugo frontmatter and the converted content.
7. Copies the `images/` folder (if present) — or any image files found at the root of the zip — into the article directory.

### Article directory naming

```
content/articles/{slug}_{YYYY_MM_DD}_{XXXXXX}/
```

Example: `content/articles/classical-cryptography_2025_05_01_A3F9B2/`

### Meta file format

Create a `meta.json` file at the root of your zip:

```json
{
  "title": "Introduction to Classical Cryptography",
  "date": "2025-05-01",
  "summary": "A brief overview of Caesar ciphers, substitution ciphers, and the one-time pad.",
  "authors": ["Student Name", "Second Author"],
  "tags": ["Cryptography", "Classical"],
  "slug": "classical-cryptography",
  "translationKey": "classical-cryptography",
  "weight": 15
}
```

Alternatively, use `meta.yaml` or `meta.yml`:

```yaml
title: Introduction to Classical Cryptography
date: 2025-05-01
summary: A brief overview of classical ciphers.
authors: ["Student Name"]
tags: ["Cryptography"]
slug: classical-cryptography
translationKey: classical-cryptography
```

All fields are optional — the script will fall back to the LaTeX preamble for `title` and `author`.

---

---

## Italiano

### Requisiti

- Node.js 20+
- `unzip` installato nel sistema (`sudo apt install unzip` su Debian/Ubuntu)

Non sono richieste dipendenze npm aggiuntive.

### Eseguire lo script

Esegui lo script dalla **root del progetto**:

```bash
node scripts/latex-to-article.js <percorso-del-zip> [opzioni]
```

#### Opzioni

| Opzione | Default | Descrizione |
| --- | --- | --- |
| `--output <dir>` | `content/articles` | Directory di destinazione per il nuovo articolo |
| `--dry-run` | disattivo | Anteprima della conversione senza scrivere file |
| `--help`, `-h` | — | Mostra il messaggio di aiuto |

#### Esempi

```bash
# Utilizzo base — crea l'articolo sotto content/articles/
node scripts/latex-to-article.js my-article.zip

# Anteprima senza scrivere nulla
node scripts/latex-to-article.js my-article.zip --dry-run

# Directory di output personalizzata
node scripts/latex-to-article.js my-article.zip --output content/articles
```

### Cosa fa lo script

1. Estrae il file zip in una directory temporanea.
2. Individua `main.tex` (o il file `.tex` piu grande come fallback).
3. Legge `meta.json` (o `meta.yaml` / `meta.yml`) per i metadati dell'articolo. In assenza del file meta, usa i comandi `\title` e `\author` nel preambolo LaTeX.
4. Converte il corpo del documento LaTeX in Markdown.
5. Crea una nuova directory sotto `content/articles/` con il nome `{slug}_{data}_{IDcasuale}`.
6. Scrive `index.md` con il frontmatter Hugo e il contenuto convertito.
7. Copia la cartella `images/` (se presente) — o i file immagine alla radice dello zip — nella directory dell'articolo.

### Nome della directory articolo

```
content/articles/{slug}_{YYYY_MM_DD}_{XXXXXX}/
```

Esempio: `content/articles/crittografia-classica_2025_05_01_A3F9B2/`

### Formato del file meta

Crea un file `meta.json` alla radice del tuo zip:

```json
{
  "title": "Introduzione alla Crittografia Classica",
  "date": "2025-05-01",
  "summary": "Una breve panoramica su cifrari di Cesare, cifrari a sostituzione e one-time pad.",
  "authors": ["Nome Studente", "Secondo Autore"],
  "tags": ["Crittografia", "Classico"],
  "slug": "crittografia-classica",
  "translationKey": "classical-cryptography",
  "weight": 15
}
```

In alternativa, usa `meta.yaml` o `meta.yml`:

```yaml
title: Introduzione alla Crittografia Classica
date: 2025-05-01
summary: Una breve panoramica sui cifrari classici.
authors: ["Nome Studente"]
tags: ["Crittografia"]
slug: crittografia-classica
translationKey: classical-cryptography
```

Tutti i campi sono opzionali — lo script usa il preambolo LaTeX come fallback per `title` e `author`.
