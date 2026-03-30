# ZIP File Structure for latex-to-article

---

## English

### Recommended zip structure

The zip should ideally come from an Overleaf project export. Below is the minimal recommended structure:

```
my-article.zip
├── main.tex          # Required: main LaTeX source file
├── meta.json         # Recommended: article metadata (see README.md)
└── images/           # Optional: folder containing all images
    ├── figure1.png
    ├── diagram.svg
    └── ...
```

The script also accepts a flat layout where image files sit at the zip root:

```
my-article.zip
├── main.tex
├── meta.json
├── figure1.png
└── diagram.svg
```

### Main LaTeX file

The script looks for a file named exactly `main.tex`. If it is not found, it picks the largest `.tex` file in the archive.

Multi-file projects (using `\input{}` or `\include{}`) are **not** supported. You must merge all content into a single `main.tex` before zipping. Overleaf's "Download as ZIP" keeps files separate — use the "Download PDF" + copy-paste approach, or flatten manually.

---

### What works

The converter handles the following LaTeX constructs:

#### Document structure
| LaTeX | Markdown output |
| --- | --- |
| `\section{Title}` | `# Title` |
| `\subsection{Title}` | `## Title` |
| `\subsubsection{Title}` | `### Title` |
| `\paragraph{Title}` | `**Title**` |

#### Text formatting
| LaTeX | Markdown output |
| --- | --- |
| `\textbf{text}` | `**text**` |
| `\textit{text}`, `\emph{text}` | `*text*` |
| `\texttt{text}` | `` `text` `` |
| `\underline{text}` | `<u>text</u>` |

#### Math
| LaTeX | Markdown output |
| --- | --- |
| `$inline$` | `$inline$` (kept as-is for KaTeX) |
| `$$display$$` | `$$display$$` |
| `\begin{equation}...\end{equation}` | `$$...$$` |
| `\begin{align}...\end{align}` | `$$\begin{align}...\end{align}$$` |
| `\begin{gather}...\end{gather}` | `$$\begin{gather}...\end{gather}$$` |

Math is rendered on the site with KaTeX. Standard LaTeX math syntax works. Macro packages like `physics`, `siunitx`, or custom `\newcommand` definitions are **not** processed — include them inline if needed.

#### Lists
| LaTeX | Markdown output |
| --- | --- |
| `\begin{itemize}` with `\item` | `- item` bullet list |
| `\begin{enumerate}` with `\item` | `1. item` numbered list |
| `\begin{description}` with `\item[term]` | `**term**: description` |

Single-level nesting works. Deeply nested lists (3+ levels) may not render correctly.

#### Tables
Simple `tabular` environments are converted to Markdown tables. The first row is treated as the header. `\hline` and column separators (`|`) in the column spec are ignored.

| LaTeX | Result |
| --- | --- |
| `\begin{tabular}{|c|c|}` | Markdown table with 2 columns |
| `\caption{...}` | Italic caption above the table |

Limitations: merged cells (`\multicolumn`, `\multirow`) are **not** supported and will produce garbled output.

#### Figures and images
```latex
\begin{figure}[h]
  \includegraphics[width=0.5\textwidth]{images/figure1}
  \caption{My caption}
\end{figure}
```
becomes:
```markdown
![My caption](images/figure1)
*My caption*
```

The file extension does not need to be specified in `\includegraphics` — the script uses the basename. Make sure the actual file (with extension) exists in the `images/` folder of the zip.

#### Block environments
| LaTeX | Markdown output |
| --- | --- |
| `\begin{quote}` | `> blockquote` |
| `\begin{verbatim}` | ```` ```code block``` ```` |
| `\begin{lstlisting}` | ```` ```code block``` ```` |
| `\begin{minted}` | ```` ```code block``` ```` |
| `\begin{center}` | Inline (centering removed) |

#### Links and footnotes
| LaTeX | Markdown output |
| --- | --- |
| `\href{url}{text}` | `[text](url)` |
| `\url{url}` | `[url](url)` |
| `\footnote{text}` | ` (text)` inline |

---

### What does NOT work

The following Overleaf/LaTeX features are either stripped silently or produce incorrect output:

| Feature | Behaviour |
| --- | --- |
| `\input{file}` / `\include{file}` | The referenced file is **not** loaded. Content is lost. Merge all files into `main.tex` before conversion. |
| `\multicolumn` / `\multirow` in tables | Cells are treated as regular cells — output will be malformed. Split or rewrite the table. |
| Custom `\newcommand` / `\renewcommand` | Definitions are stripped; usages become empty text. Inline the content manually. |
| `\usepackage{tikz}` / TikZ diagrams | The entire `tikzpicture` environment is stripped. Export diagrams as image files and use `\includegraphics`. |
| `\usepackage{pgfplots}` / pgfplots | Same as TikZ — stripped entirely. |
| `\bibliography` / BibTeX / `\cite` | Citations are removed; bibliography is dropped. Link references manually in Markdown. |
| `\label` / `\ref` (cross-references) | Labels are removed; `\ref{key}` becomes the literal key string. |
| `\newtheorem` (theorem environments) | The environment content is kept but the theorem label/number is lost. |
| `\begin{algorithm}` | Content is stripped. Rewrite as a code block or numbered list. |
| `\begin{minipage}` / `\begin{wrapfigure}` | Converted to a plain block; layout is lost. |
| Color commands (`\color`, `\textcolor`) | Stripped; color formatting is lost. |
| Font size commands (`\large`, `\small`, etc.) | Stripped. |
| `\maketitle` | Removed (the Hugo frontmatter provides the title). |
| Numbering (`\setcounter`, `\stepcounter`) | Stripped. |
| Page layout (`\geometry`, `\setmargins`) | Stripped (irrelevant for web). |

---

### Overleaf-specific notes

When exporting from Overleaf:

1. Use **Menu > Download > Source** to get the full zip.
2. If the project has multiple `.tex` files (chapters, sections split across files), you must merge them into a single `main.tex` before running the script.
3. Overleaf includes `.bbl`, `.aux`, `.log`, `.out` files — the script ignores them.
4. Images exported from Overleaf are usually in the project root or inside an `images/` subfolder — both layouts are handled.
5. Custom fonts and style packages (`.sty` files) are ignored.

---

---

## Italiano

### Struttura consigliata dello zip

Lo zip dovrebbe idealmente provenire da un export di un progetto Overleaf. Di seguito la struttura minima consigliata:

```
my-article.zip
├── main.tex          # Richiesto: file sorgente LaTeX principale
├── meta.json         # Consigliato: metadati dell'articolo (vedi README.md)
└── images/           # Opzionale: cartella con tutte le immagini
    ├── figure1.png
    ├── diagram.svg
    └── ...
```

Lo script accetta anche un layout piatto con i file immagine alla radice dello zip:

```
my-article.zip
├── main.tex
├── meta.json
├── figure1.png
└── diagram.svg
```

### File LaTeX principale

Lo script cerca un file chiamato esattamente `main.tex`. Se non viene trovato, sceglie il file `.tex` piu grande nell'archivio.

I progetti multi-file (che usano `\input{}` o `\include{}`) **non** sono supportati. Bisogna unire tutto il contenuto in un unico `main.tex` prima di comprimere. L'esportazione "Download as ZIP" di Overleaf mantiene i file separati — usa l'approccio "Download PDF" + copia-incolla, oppure unisci manualmente.

---

### Cosa funziona

Il convertitore gestisce i seguenti costrutti LaTeX:

#### Struttura del documento
| LaTeX | Output Markdown |
| --- | --- |
| `\section{Titolo}` | `# Titolo` |
| `\subsection{Titolo}` | `## Titolo` |
| `\subsubsection{Titolo}` | `### Titolo` |
| `\paragraph{Titolo}` | `**Titolo**` |

#### Formattazione del testo
| LaTeX | Output Markdown |
| --- | --- |
| `\textbf{testo}` | `**testo**` |
| `\textit{testo}`, `\emph{testo}` | `*testo*` |
| `\texttt{testo}` | `` `testo` `` |
| `\underline{testo}` | `<u>testo</u>` |

#### Matematica
| LaTeX | Output Markdown |
| --- | --- |
| `$inline$` | `$inline$` (mantenuto per KaTeX) |
| `$$display$$` | `$$display$$` |
| `\begin{equation}...\end{equation}` | `$$...$$` |
| `\begin{align}...\end{align}` | `$$\begin{align}...\end{align}$$` |
| `\begin{gather}...\end{gather}` | `$$\begin{gather}...\end{gather}$$` |

La matematica e renderizzata con KaTeX. La sintassi matematica LaTeX standard funziona. I pacchetti di macro come `physics`, `siunitx`, o definizioni `\newcommand` personalizzate **non** vengono elaborati.

#### Liste
| LaTeX | Output Markdown |
| --- | --- |
| `\begin{itemize}` con `\item` | Lista puntata `- elemento` |
| `\begin{enumerate}` con `\item` | Lista numerata `1. elemento` |
| `\begin{description}` con `\item[termine]` | `**termine**: descrizione` |

La nidificazione a un livello funziona. Le liste profondamente annidate (3+ livelli) potrebbero non renderizzarsi correttamente.

#### Tabelle
Gli ambienti `tabular` semplici vengono convertiti in tabelle Markdown. La prima riga e trattata come intestazione. `\hline` e i separatori di colonna (`|`) nel column spec vengono ignorati.

Limitazioni: le celle unite (`\multicolumn`, `\multirow`) **non** sono supportate.

#### Figure e immagini
```latex
\begin{figure}[h]
  \includegraphics[width=0.5\textwidth]{images/figure1}
  \caption{La mia didascalia}
\end{figure}
```
diventa:
```markdown
![La mia didascalia](images/figure1)
*La mia didascalia*
```

L'estensione del file non deve essere specificata in `\includegraphics` — lo script usa il basename. Assicurati che il file effettivo (con estensione) esista nella cartella `images/` dello zip.

#### Ambienti a blocco
| LaTeX | Output Markdown |
| --- | --- |
| `\begin{quote}` | `> blockquote` |
| `\begin{verbatim}` | ```` ```blocco di codice``` ```` |
| `\begin{lstlisting}` | ```` ```blocco di codice``` ```` |
| `\begin{center}` | Inline (centratura rimossa) |

#### Link e note a pie di pagina
| LaTeX | Output Markdown |
| --- | --- |
| `\href{url}{testo}` | `[testo](url)` |
| `\url{url}` | `[url](url)` |
| `\footnote{testo}` | ` (testo)` inline |

---

### Cosa NON funziona

Le seguenti funzionalita LaTeX/Overleaf vengono rimosse silenziosamente o producono output errato:

| Funzionalita | Comportamento |
| --- | --- |
| `\input{file}` / `\include{file}` | Il file referenziato **non** viene caricato. Il contenuto va perso. Unisci tutti i file in `main.tex` prima della conversione. |
| `\multicolumn` / `\multirow` nelle tabelle | Le celle sono trattate come normali — l'output sara malformato. Riscrivi la tabella. |
| `\newcommand` / `\renewcommand` personalizzati | Le definizioni vengono rimosse; gli utilizzi diventano testo vuoto. Incorpora il contenuto manualmente. |
| Diagrammi TikZ (`\usepackage{tikz}`) | L'intero ambiente `tikzpicture` viene rimosso. Esporta i diagrammi come file immagine. |
| pgfplots (`\usepackage{pgfplots}`) | Come TikZ — rimosso completamente. |
| `\bibliography` / BibTeX / `\cite` | Le citazioni vengono rimosse; la bibliografia viene eliminata. Collega i riferimenti manualmente in Markdown. |
| `\label` / `\ref` (cross-reference) | Le etichette vengono rimosse; `\ref{key}` diventa la stringa letterale della chiave. |
| `\newtheorem` (ambienti teorema) | Il contenuto e mantenuto ma l'etichetta/numero del teorema va perso. |
| `\begin{algorithm}` | Il contenuto viene rimosso. Riscrivi come blocco di codice o lista numerata. |
| Comandi colore (`\color`, `\textcolor`) | Rimossi. |
| Comandi dimensione font (`\large`, `\small`, ecc.) | Rimossi. |

---

### Note specifiche per Overleaf

Quando si esporta da Overleaf:

1. Usa **Menu > Download > Source** per ottenere lo zip completo.
2. Se il progetto ha piu file `.tex` (capitoli, sezioni in file separati), devi unirli in un unico `main.tex` prima di eseguire lo script.
3. Overleaf include file `.bbl`, `.aux`, `.log`, `.out` — lo script li ignora.
4. Le immagini esportate da Overleaf si trovano solitamente nella root del progetto o in una sottocartella `images/` — entrambi i layout sono gestiti.
5. I font personalizzati e i pacchetti di stile (file `.sty`) vengono ignorati.
