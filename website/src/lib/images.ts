import type { ImageMetadata } from 'astro';

/**
 * Widths for a responsive image, never wider than the image itself: Astro would otherwise
 * enlarge a small photo to every requested width. The widths that do not fit are replaced by
 * the original width.
 */
export function widthsUpTo(src: ImageMetadata, widths: number[]): number[] {
  const fitting = widths.filter((width) => width < src.width);
  return fitting.length < widths.length ? [...fitting, src.width] : widths;
}
