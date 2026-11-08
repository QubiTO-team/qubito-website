/**
 * Turns a Markdown image with a title into a numbered figure with a caption:
 *
 *   ![Alt text](./images/circuit.png "Caption|circuit-id")
 *
 * becomes <figure id="circuit-id"> with the image and "Fig. N  Caption" below it. The id after
 * "|" is optional: without it the id is derived from the caption, as on the previous Hugo site,
 * so that existing links to figures (#binary-symmetric-error, …) keep working.
 */
import { ui, type Lang } from '../i18n/ui';

interface Text {
  type: 'text';
  value: string;
}

interface Element {
  type: 'element';
  tagName: string;
  properties: Record<string, unknown>;
  children: Node[];
}

type Node = Text | Element | { type: string; children?: Node[] };

interface Parent {
  children: Node[];
}

const isElement = (node: Node, tagName?: string): node is Element =>
  node.type === 'element' && (tagName === undefined || (node as Element).tagName === tagName);

const isBlank = (node: Node) => node.type === 'text' && (node as Text).value.trim() === '';

/** Same rule as Hugo's `anchorize`: lowercase, spaces to hyphens, punctuation dropped. */
export const anchorize = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '');

/** "…/correcting-quantum-errors/index.en.md" → "en". */
const langOf = (path: string | undefined): Lang =>
  path?.match(/index\.(it|en)\.md$/)?.[1] === 'en' ? 'en' : 'it';

const isCaptionedImage = (node: Node): node is Element =>
  isElement(node, 'img') && typeof node.properties.title === 'string';

/** Whitespace or line breaks left at the edge of a paragraph once a figure is taken out. */
const isEdge = (node: Node | undefined) =>
  node !== undefined && (isBlank(node) || isElement(node, 'br'));

export function rehypeFigure() {
  return (tree: Parent, file: { path?: string }) => {
    const label = ui[langOf(file.path)]['article.figure'];
    let count = 0;

    const figure = (image: Element): Element => {
      const [caption = '', id] = String(image.properties.title).split('|');
      const { title: _title, ...properties } = image.properties;
      count += 1;
      return {
        type: 'element',
        tagName: 'figure',
        properties: { id: id?.trim() || anchorize(caption) },
        children: [
          { ...image, properties },
          {
            type: 'element',
            tagName: 'figcaption',
            properties: {},
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['figure-number'] },
                children: [{ type: 'text', value: `${label} ${count}` }],
              },
              { type: 'text', value: ` ${caption.trim()}` },
            ],
          },
        ],
      };
    };

    /* A paragraph can hold an image followed by text on the next line: it is split into
       the figure and a paragraph with the rest. */
    const split = (paragraph: Element): Node[] => {
      const result: Node[] = [];
      let run: Node[] = [];
      const flush = () => {
        while (isEdge(run[0])) run.shift();
        while (isEdge(run.at(-1))) run.pop();
        if (run.length > 0) result.push({ ...paragraph, children: run });
        run = [];
      };
      for (const child of paragraph.children) {
        if (isCaptionedImage(child)) {
          flush();
          result.push(figure(child));
        } else {
          run.push(child);
        }
      }
      flush();
      return result;
    };

    const walk = (parent: Parent) => {
      parent.children = parent.children.flatMap((node) => {
        if (isElement(node, 'p') && node.children.some(isCaptionedImage)) return split(node);
        if ('children' in node && node.children) walk(node as Parent);
        return [node];
      });
    };

    walk(tree);
  };
}
