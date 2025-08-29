# Articles Hierarchy & Properties

## Hierarchy

Articles are stored inside the `content/articles/` directory. Each article is a folder containing an `index.md` file (for Italian) and an `index.en.md` file (for English), plus optionally images or other resources.

**Example:**
```
content/
  articles/
    quantum-error-correction-8-5-2025/
      index.md           # Italian version
      index.en.md        # English version
      images/
        binary-symmetric-error.png
        encoding_quantum_states.png
        ...
```

## Article Properties

The main properties for each article are defined in the front matter of the markdown files. Example from `quantum-error-correction-8-5-2025/index.en.md`:

```yaml
---
title: "Quantum Error Correction"
weight: 14
date: 2025-05-17
summary: "Using techniques like repetition codes and the 9-qubit Shor code, quantum error correction enables reliable quantum computing by protecting qubits from bit-flip errors, phase-flip errors, and arbitrary errors."
tags: ["QEC", "Qiskit"]
authors: ["Mattia Corrado Placì", "Leonardo Niccolai", "Edoardo Frulla", "Walid Bou Ezz"]
slug: "quantum-error-correction"  
translationKey: "correcting-quantum-errors"
---
```

### Supported Fields

- `title`: The article's title.
- `weight`: Used for ordering articles.
- `date`: Publication date.
- `summary`: Short summary or description.
- `tags`: List of tags for filtering/search.
- `authors`: List of author names.
- `slug`: Custom URL slug for the article.
- `translationKey`: Key for linking translations of the same article.

## Usage

- Place each article in its own folder under `content/articles/`.
- Use `index.md` for the Italian version and `index.en.md` for the English version.
- Add images and resources in a subfolder or alongside the markdown file.

## Example Structure

```
content/articles/quantum-error-correction-8-5-2025/
  index.md
  index.en.md
  images/
    binary-symmetric-error.png
    encoding_quantum_states.png
    ...
```

## Configuration

The display and behavior of articles are managed by Hugo and the Blowfish theme. You can configure listing, sorting, and appearance in `config/_default/config.toml` and `config/_default/params.toml`.

For more details, see the [Blowfish documentation](https://blowfish.page/docs/).