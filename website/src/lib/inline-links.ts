/** A piece of a short text: plain, or a link written as [label](https://...). */
export interface TextPart {
  text: string;
  href?: string;
}

const LINK = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

/** Splits a short text into plain parts and links; only http(s) addresses become links. */
export function inlineLinks(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    const start = match.index ?? last;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: match[1], href: match[2] });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}
