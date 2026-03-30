#!/usr/bin/env node

/**
 * LaTeX to Hugo Article Converter
 * Converts a ZIP file containing a LaTeX project into a Hugo article
 * for the QubiTO website (content/articles/).
 *
 * Usage: node scripts/latex-to-article.js <path-to-zip> [options]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { spawnSync } = require('child_process');

// ============================================================
// LaTeX -> Markdown converter
// ============================================================

/**
 * Extract the document body from a full LaTeX source.
 * Returns everything between \begin{document} and \end{document}.
 */
function extractBody(latex) {
  const match = latex.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  return match ? match[1] : latex;
}

/**
 * Extract the preamble metadata (\title, \author, \date) for fallback use.
 */
function extractPreambleMeta(latex) {
  const meta = {};
  const titleMatch = latex.match(/\\title\{([^}]*)\}/);
  if (titleMatch) meta.title = titleMatch[1].trim();

  const authorMatch = latex.match(/\\author\{([^}]*)\}/);
  if (authorMatch) {
    meta.authors = authorMatch[1]
      .split(/\\and|,/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return meta;
}

/**
 * Convert a LaTeX tabular block to a Markdown table.
 * colspec: the column spec string, e.g. "|c|c|c|"
 * content: content between \begin{tabular} and \end{tabular}
 * caption: optional caption string
 */
function convertTabular(colspec, content, caption) {
  // Remove \hline, clean up
  const cleaned = content.replace(/\\hline/g, '').trim();
  const lines = cleaned.split(/\\\\/);

  const rows = lines
    .map((line) =>
      line
        .split('&')
        .map((cell) => cell.trim())
        .filter((cell) => cell !== undefined)
    )
    .filter((row) => row.length > 0 && row.some((c) => c));

  if (rows.length === 0) return '';

  const maxCols = Math.max(...rows.map((r) => r.length));

  let table = '';
  if (caption) table += `*${caption}*\n\n`;

  // Header
  const header = rows[0];
  while (header.length < maxCols) header.push('');
  table += `| ${header.join(' | ')} |\n`;
  table += `|${Array(maxCols).fill('---|').join('')}\n`;

  // Rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    while (row.length < maxCols) row.push('');
    table += `| ${row.join(' | ')} |\n`;
  }

  return '\n' + table + '\n';
}

/**
 * Convert list environments (itemize, enumerate, description) to Markdown.
 * Handles single-level nesting; inner passes are done by repeated replacement.
 */
function convertLists(text) {
  let result = text;

  // Repeatedly apply until no more list environments remain (handles nesting)
  let prev = '';
  while (prev !== result) {
    prev = result;

    // itemize
    result = result.replace(
      /\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g,
      (_, content) => {
        const items = content.split(/\\item(?:\s*\[[^\]]*\])?\s*/g).filter((s) => s.trim());
        return '\n' + items.map((item) => `- ${item.trim().replace(/\n+/g, ' ')}`).join('\n') + '\n';
      }
    );

    // enumerate
    result = result.replace(
      /\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g,
      (_, content) => {
        const items = content.split(/\\item(?:\s*\[[^\]]*\])?\s*/g).filter((s) => s.trim());
        return (
          '\n' +
          items.map((item, i) => `${i + 1}. ${item.trim().replace(/\n+/g, ' ')}`).join('\n') +
          '\n'
        );
      }
    );

    // description
    result = result.replace(
      /\\begin\{description\}([\s\S]*?)\\end\{description\}/g,
      (_, content) => {
        const items = content.split(/\\item\s*/g).filter((s) => s.trim());
        return (
          '\n' +
          items
            .map((item) => {
              const labelMatch = item.match(/^\[([^\]]*)\]\s*([\s\S]*)/);
              if (labelMatch) return `**${labelMatch[1]}**: ${labelMatch[2].trim().replace(/\n+/g, ' ')}`;
              return `- ${item.trim().replace(/\n+/g, ' ')}`;
            })
            .join('\n') +
          '\n'
        );
      }
    );
  }

  return result;
}

/**
 * Convert table environments to Markdown tables.
 * protect() is passed in so the output is shielded from later text substitutions.
 */
function convertTables(text, protect) {
  return text.replace(
    /\\begin\{table\}[\s\S]*?\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}([\s\S]*?)\\end\{table\}/g,
    (_, colspec, tabContent, afterTabular) => {
      const captionMatch = afterTabular.match(/\\caption\{([^}]*)\}/);
      const caption = captionMatch ? captionMatch[1] : null;
      return protect(convertTabular(colspec, tabContent, caption));
    }
  );
}

/**
 * Convert figure environments to Markdown image references.
 */
function convertFigures(text) {
  return text.replace(
    /\\begin\{figure\}[\s\S]*?\\end\{figure\}/g,
    (block) => {
      const imgMatch = block.match(/\\includegraphics(?:\[.*?\])?\{([^}]*)\}/);
      const captionMatch = block.match(/\\caption\{([^}]*)\}/);
      if (!imgMatch) return '';
      const imgFile = path.basename(imgMatch[1]);
      const alt = captionMatch ? captionMatch[1] : imgFile;
      const caption = captionMatch ? `\n*${captionMatch[1]}*` : '';
      return `\n![${alt}](images/${imgFile})${caption}\n`;
    }
  );
}

/**
 * Main LaTeX-to-Markdown conversion.
 *
 * Strategy: extract math spans and code blocks into a placeholder map early,
 * so that text-transformation passes cannot corrupt their contents.
 * Restore them at the end.
 */
function latexToMarkdown(latex) {
  let md = extractBody(latex);

  // ---- Strip LaTeX comments ----
  md = md.replace(/(?<!\\)%[^\n]*/g, '');

  // ---- Remove document structure commands ----
  md = md.replace(/\\maketitle\s*/g, '');

  // ---- Convert math environments to $$...$$ / $...$ before protecting ----
  // These run before protect() is defined; the raw $$...$$ output is caught
  // by the protect($$) step below — so \\ and all LaTeX inside is preserved.
  md = md.replace(
    /\\begin\{(equation|displaymath)\*?\}([\s\S]*?)\\end\{\1\*?\}/g,
    (_, _env, content) => `\n$$\n${content.trim()}\n$$\n`
  );
  md = md.replace(
    /\\begin\{(align|gather|multline|aligned)\*?\}([\s\S]*?)\\end\{\1\*?\}/g,
    (_, env, content) => `\n$$\n\\begin{${env}}\n${content.trim()}\n\\end{${env}}\n$$\n`
  );
  // \begin{center} → display math. KaTeX already centers $$...$$ blocks, so
  // the environment adds nothing but its content. \\ inside becomes the
  // aligned line-break separator, which KaTeX handles correctly.
  md = md.replace(
    /\\begin\{center\}([\s\S]*?)\\end\{center\}/g,
    (_, content) => {
      const body = content.trim().replace(/\\\\/g, '\\cr');
      return `\n$$\n\\begin{aligned}\n${body}\n\\end{aligned}\n$$\n`;
    }
  );

  // ---- Protect math and code blocks with placeholders ----
  const placeholders = new Map();
  let placeholderIndex = 0;

  function protect(content) {
    const key = `\u0000PLACEHOLDER_${placeholderIndex++}\u0000`;
    placeholders.set(key, content);
    return key;
  }

  // Protect display math  $$...$$
  md = md.replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => protect(`$$${inner}$$`));

  // Protect inline math  $...$  (avoid matching already-protected $$)
  md = md.replace(/\$([^$\n]+?)\$/g, (_, inner) => protect(`$${inner}$`));

  // Protect code environments (verbatim, lstlisting, minted)
  md = md.replace(/\\begin\{verbatim\}([\s\S]*?)\\end\{verbatim\}/g, (_, c) =>
    protect('\n```\n' + c.trim() + '\n```\n')
  );
  md = md.replace(/\\begin\{lstlisting\}(?:\[.*?\])?([\s\S]*?)\\end\{lstlisting\}/g, (_, c) =>
    protect('\n```\n' + c.trim() + '\n```\n')
  );
  md = md.replace(/\\begin\{minted\}(?:\{.*?\})?([\s\S]*?)\\end\{minted\}/g, (_, c) =>
    protect('\n```\n' + c.trim() + '\n```\n')
  );

  // ---- Abstract ----
  md = md.replace(/\\begin\{abstract\}([\s\S]*?)\\end\{abstract\}/g, (_, c) => {
    return '> ' + c.trim().split('\n').join('\n> ') + '\n';
  });

  // ---- Figures ----
  md = convertFigures(md);

  // Standalone \includegraphics (not inside figure env)
  md = md.replace(/\\includegraphics(?:\[.*?\])?\{([^}]*)\}/g, (_, imgPath) => {
    return `![](images/${path.basename(imgPath)})`;
  });

  // ---- Tables (protected so separators survive typographic substitutions) ----
  md = convertTables(md, protect);

  // Standalone tabular (not wrapped in table)
  md = md.replace(
    /\\begin\{tabular\}\{([^}]*)\}([\s\S]*?)\\end\{tabular\}/g,
    (_, colspec, content) => protect(convertTabular(colspec, content, null))
  );

  // ---- Lists ----
  md = convertLists(md);

  // ---- Block environments ----
  md = md.replace(/\\begin\{quote\}([\s\S]*?)\\end\{quote\}/g, (_, c) => {
    return '\n> ' + c.trim().split('\n').join('\n> ') + '\n';
  });
  md = md.replace(/\\begin\{quotation\}([\s\S]*?)\\end\{quotation\}/g, (_, c) => {
    return '\n> ' + c.trim().split('\n').join('\n> ') + '\n';
  });
  md = md.replace(/\\begin\{flushleft\}([\s\S]*?)\\end\{flushleft\}/g, (_, c) => c.trim() + '\n');
  md = md.replace(/\\begin\{flushright\}([\s\S]*?)\\end\{flushright\}/g, (_, c) => c.trim() + '\n');

  // ---- Sections ----
  md = md.replace(/\\section\*?\{([^}]*)\}/g, '\n## $1\n');
  md = md.replace(/\\subsection\*?\{([^}]*)\}/g, '\n### $1\n');
  md = md.replace(/\\subsubsection\*?\{([^}]*)\}/g, '\n#### $1\n');
  md = md.replace(/\\paragraph\*?\{([^}]*)\}/g, '\n**$1**\n');
  md = md.replace(/\\subparagraph\*?\{([^}]*)\}/g, '\n**$1**\n');

  // ---- Text formatting ----
  md = md.replace(/\\textbf\{([^}]*)\}/g, '**$1**');
  md = md.replace(/\\textit\{([^}]*)\}/g, '*$1*');
  md = md.replace(/\\emph\{([^}]*)\}/g, '*$1*');
  md = md.replace(/\\texttt\{([^}]*)\}/g, (_, inner) => protect('`' + inner + '`'));
  md = md.replace(/\\underline\{([^}]*)\}/g, '<u>$1</u>');
  md = md.replace(/\\textsc\{([^}]*)\}/g, '$1');
  md = md.replace(/\\textrm\{([^}]*)\}/g, '$1');
  md = md.replace(/\\textsf\{([^}]*)\}/g, '$1');
  md = md.replace(/\\textup\{([^}]*)\}/g, '$1');
  md = md.replace(/\{\\bf\s+([^}]*)\}/g, '**$1**');
  md = md.replace(/\{\\it\s+([^}]*)\}/g, '*$1*');

  // ---- Links ----
  md = md.replace(/\\href\{([^}]*)\}\{([^}]*)\}/g, '[$2]($1)');
  md = md.replace(/\\url\{([^}]*)\}/g, '[$1]($1)');

  // ---- Footnotes (inline) ----
  md = md.replace(/\\footnote\{([^}]*)\}/g, ' ($1)');

  // ---- Cross-references ----
  md = md.replace(/\\label\{[^}]*\}/g, '');
  md = md.replace(/\\ref\{([^}]*)\}/g, protect('\\ref{$1}'));
  md = md.replace(/\\eqref\{([^}]*)\}/g, (_, k) => protect(`(\\ref{${k}})`));
  md = md.replace(/\\autoref\{([^}]*)\}/g, (_, k) => protect(`\\ref{${k}}`));

  // ---- Citations — strip ----
  md = md.replace(/\\cite(?:p|t|alt)?\*?(?:\[.*?\])*\{[^}]*\}/g, '');

  // ---- Bibliography ----
  md = md.replace(/\\begin\{thebibliography\}[\s\S]*?\\end\{thebibliography\}/g, '');
  md = md.replace(/\\bibliographystyle\{[^}]*\}/g, '');
  md = md.replace(/\\bibliography\{[^}]*\}/g, '');

  // ---- Page breaks ----
  md = md.replace(/\\(newpage|clearpage|cleardoublepage)\b/g, '\n---\n');

  // ---- Line breaks ----
  md = md.replace(/\\\\(\s*\[.*?\])?\s*$/gm, '\n');
  md = md.replace(/\\newline\b/g, '\n');

  // ---- Spacing ----
  md = md.replace(/\\(?:,|;|:|!|>|<| )/g, ' ');
  md = md.replace(/\\quad\b/g, '  ');
  md = md.replace(/\\qquad\b/g, '    ');
  md = md.replace(/\\hspace\*?\{[^}]*\}/g, ' ');
  md = md.replace(/\\vspace\*?\{[^}]*\}/g, '\n');
  md = md.replace(/\\medskip\b|\\bigskip\b|\\smallskip\b/g, '\n');
  md = md.replace(/~(?=[A-Z]|\\)/g, ' ');
  md = md.replace(/~/g, ' ');

  // ---- Special characters ----
  md = md.replace(/\\&/g, '&');
  md = md.replace(/\\%/g, '%');
  md = md.replace(/\\\$/g, '$');
  md = md.replace(/\\#/g, '#');
  md = md.replace(/\\_/g, '_');
  md = md.replace(/\\\{/g, '{');
  md = md.replace(/\\\}/g, '}');
  md = md.replace(/\\textbackslash\b/g, '\\');
  md = md.replace(/\\textasciicircum\b/g, '^');
  md = md.replace(/\\textasciitilde\b/g, '~');
  md = md.replace(/\\ldots\b|\\dots\b/g, '...');
  md = md.replace(/\\cdots\b/g, '...');

  // ---- Typographic punctuation (text only — math already protected) ----
  md = md.replace(/---/g, '\u2014');
  md = md.replace(/--/g, '\u2013');
  md = md.replace(/``/g, '\u201C');
  md = md.replace(/''/g, '\u201D');

  // ---- Remove remaining unknown LaTeX commands ----
  // Commands with one braced argument — keep the argument content
  md = md.replace(/\\[a-zA-Z]+\{([^}]*)\}/g, '$1');
  // Zero-arg commands
  md = md.replace(/\\[a-zA-Z]+(?:\[.*?\])?\s*/g, '');
  // Leftover grouping braces
  md = md.replace(/(?<!\\)\{([^{}]*)\}/g, '$1');

  // ---- Restore placeholders ----
  for (const [key, value] of placeholders) {
    md = md.split(key).join(value);
  }

  // ---- Clean up excessive blank lines ----
  md = md.replace(/\n{3,}/g, '\n\n');

  return md.trim();
}

// ============================================================
// Meta file parser
// ============================================================

/**
 * Parse a meta file. Supports JSON and a simple key: value format.
 */
function parseMeta(content) {
  const trimmed = content.trim();

  // Try JSON first
  if (trimmed.startsWith('{')) {
    try {
      return JSON.parse(trimmed);
    } catch (_) {
      // fall through
    }
  }

  // Simple YAML-like key: value (no multi-level nesting)
  const meta = {};
  for (const line of trimmed.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    let value = line.slice(colonIdx + 1).trim();
    if (!key) continue;

    // Array value: ["a", "b"] or [a, b]
    if (value.startsWith('[') && value.endsWith(']')) {
      const inner = value.slice(1, -1);
      try {
        meta[key] = JSON.parse(value);
      } catch (_) {
        meta[key] = inner
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
      }
      continue;
    }

    // Strip surrounding quotes
    value = value.replace(/^["']|["']$/g, '');
    meta[key] = value;
  }
  return meta;
}

// ============================================================
// Frontmatter builder
// ============================================================

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildFrontmatter(meta) {
  const title = (meta.title || 'Untitled Article').replace(/"/g, '\\"');
  const date = meta.date || new Date().toISOString().split('T')[0];
  const summary = (meta.summary || '').replace(/"/g, '\\"');
  const authors = Array.isArray(meta.authors)
    ? meta.authors
    : meta.authors
    ? [meta.authors]
    : [];
  const tags = Array.isArray(meta.tags) ? meta.tags : meta.tags ? [meta.tags] : [];
  const slug = meta.slug || slugify(meta.title || 'article');
  const translationKey = meta.translationKey || slug;

  const lines = [
    '---',
    `title: "${title}"`,
    `date: ${date}`,
    `summary: "${summary}"`,
    `authors: [${authors.map((a) => `"${a}"`).join(', ')}]`,
    `tags: [${tags.map((t) => `"${t}"`).join(', ')}]`,
    `slug: "${slug}"`,
    `translationKey: "${translationKey}"`,
  ];

  if (meta.weight !== undefined) lines.push(`weight: ${meta.weight}`);
  if (meta.description) lines.push(`description: "${String(meta.description).replace(/"/g, '\\"')}"`);

  lines.push('---');
  return lines.join('\n');
}

// ============================================================
// File system helpers
// ============================================================

function findFiles(dir, ext) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

function findImageFiles(dir) {
  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pdf', '.eps', '.tif', '.tiff', '.webp']);
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (imageExts.has(path.extname(entry.name).toLowerCase())) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ============================================================
// Main
// ============================================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(
      `
Usage:
  node scripts/latex-to-article.js <zip-file> [options]

Options:
  --output <dir>   Output directory (default: content/articles)
  --dry-run        Preview conversion without writing any files
  --help, -h       Show this help message

Example:
  node scripts/latex-to-article.js my-article.zip
  node scripts/latex-to-article.js my-article.zip --dry-run
  node scripts/latex-to-article.js my-article.zip --output content/articles
`.trim()
    );
    process.exit(0);
  }

  const zipPath = args[0];
  let outputDir = path.join(__dirname, '..', 'content', 'articles');
  let dryRun = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' && args[i + 1]) outputDir = path.resolve(args[++i]);
    if (args[i] === '--dry-run') dryRun = true;
  }

  if (!fs.existsSync(zipPath)) {
    console.error(`Error: file not found: ${zipPath}`);
    process.exit(1);
  }

  const resolvedZip = path.resolve(zipPath);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'latex-article-'));

  try {
    // Extract zip using system unzip
    console.log(`Extracting ${resolvedZip} ...`);
    const result = spawnSync('unzip', ['-q', resolvedZip, '-d', tmpDir]);
    if (result.status !== 0) {
      const err = result.stderr ? result.stderr.toString() : 'unzip failed';
      console.error(`Error extracting zip: ${err}`);
      process.exit(1);
    }

    // Locate main .tex file
    const texFiles = findFiles(tmpDir, '.tex');
    if (texFiles.length === 0) {
      console.error('Error: no .tex files found in zip.');
      process.exit(1);
    }

    let mainTex = texFiles.find((f) => path.basename(f) === 'main.tex');
    if (!mainTex) {
      // Use the largest .tex file as a heuristic
      mainTex = texFiles.sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
    }
    console.log(`Using LaTeX file: ${path.relative(tmpDir, mainTex)}`);
    const latexSource = fs.readFileSync(mainTex, 'utf8');

    // Locate meta file
    const metaCandidates = ['meta.json', 'meta.yaml', 'meta.yml'];
    let meta = {};
    for (const candidate of metaCandidates) {
      const p = path.join(tmpDir, candidate);
      if (fs.existsSync(p)) {
        console.log(`Found meta file: ${candidate}`);
        meta = parseMeta(fs.readFileSync(p, 'utf8'));
        break;
      }
    }

    // Fill in missing fields from LaTeX preamble
    const preambleMeta = extractPreambleMeta(latexSource);
    if (!meta.title && preambleMeta.title) meta.title = preambleMeta.title;
    if (!meta.authors && preambleMeta.authors) meta.authors = preambleMeta.authors;
    if (!meta.date) meta.date = new Date().toISOString().split('T')[0];

    // Convert LaTeX to Markdown
    console.log('Converting LaTeX to Markdown ...');
    const markdownBody = latexToMarkdown(latexSource);
    const frontmatter = buildFrontmatter(meta);
    const fullContent = frontmatter + '\n\n' + markdownBody + '\n';

    // Determine article directory name
    const slug = meta.slug || slugify(meta.title || 'article');
    const dateTag = (meta.date || new Date().toISOString().split('T')[0]).replace(/-/g, '_');
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const articleDirName = `${slug}_${dateTag}_${randomSuffix}`;
    const articlePath = path.join(outputDir, articleDirName);

    if (dryRun) {
      console.log('\n=== DRY RUN ===');
      console.log(`\nArticle directory: ${articlePath}`);
      console.log('\n--- Frontmatter ---');
      console.log(frontmatter);
      console.log('\n--- Content preview (first 800 chars) ---');
      console.log(markdownBody.substring(0, 800));
      console.log('\n=== END DRY RUN ===');
      return;
    }

    // Write files
    fs.mkdirSync(articlePath, { recursive: true });
    fs.writeFileSync(path.join(articlePath, 'index.md'), fullContent, 'utf8');
    console.log(`Written: ${path.join(articlePath, 'index.md')}`);

    // Copy images
    const imagesDir = path.join(tmpDir, 'images');
    const targetImagesDir = path.join(articlePath, 'images');

    if (fs.existsSync(imagesDir) && fs.statSync(imagesDir).isDirectory()) {
      copyDirRecursive(imagesDir, targetImagesDir);
      console.log(`Copied: images/ directory`);
    } else {
      // Collect image files from zip root
      const rootImages = findImageFiles(tmpDir);
      if (rootImages.length > 0) {
        fs.mkdirSync(targetImagesDir, { recursive: true });
        for (const img of rootImages) {
          fs.copyFileSync(img, path.join(targetImagesDir, path.basename(img)));
        }
        console.log(`Copied ${rootImages.length} image(s) to images/`);
      }
    }

    console.log(`\nDone. Article created at:\n  ${articlePath}`);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main();
