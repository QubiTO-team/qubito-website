// Prepares photos for the site: turns them upright, shrinks them to at most 2560 px on the long
// side and saves them as JPEG without metadata (EXIF, GPS position, camera). The site serves
// smaller AVIF/WebP copies anyway: this only keeps the repository light and the photos private.
//
//   node scripts/photos.mjs <photo> <output.jpg> [<photo> <output.jpg> ...]

import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import sharp from 'sharp';

const MAX_SIDE = 2560;

const args = process.argv.slice(2);
if (args.length === 0 || args.length % 2 !== 0) {
  console.error('Usage: node scripts/photos.mjs <photo> <output.jpg> [<photo> <output.jpg> ...]');
  process.exit(1);
}

for (let i = 0; i < args.length; i += 2) {
  const [input, output] = [args[i], args[i + 1]];
  await mkdir(dirname(output), { recursive: true });
  // rotate() applies the EXIF orientation before the metadata is dropped; sharp writes no
  // metadata unless asked to.
  const info = await sharp(input)
    .rotate()
    .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(output);
  console.log(`${output}: ${info.width}×${info.height}, ${Math.round(info.size / 1024)} KB`);
}
