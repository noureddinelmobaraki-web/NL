/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { LIQUID_GLASS_ALBUMS } from '../src/features/liquid-glass/albumsData.ts';
import { SUN_TEXTURE_DATA_URI, EARTH_TEXTURE_DATA_URI } from '../src/features/liquid-glass/sunTexture.ts';

async function decodeDataUriToWebp(dataUri, outPaths) {
  const base64 = dataUri.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');
  const webpBuffer = await sharp(buffer).webp({ quality: 88 }).toBuffer();
  for (const outPath of outPaths) {
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, webpBuffer);
  }
}

async function main() {
  const root = process.cwd();
  const albumsJson = JSON.stringify(LIQUID_GLASS_ALBUMS);

  const jsonTargets = [
    path.join(root, 'cdn-export/data/albums.json'),
    path.join(root, 'public/data/albums.json'),
  ];
  for (const target of jsonTargets) {
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, albumsJson, 'utf8');
  }

  await decodeDataUriToWebp(SUN_TEXTURE_DATA_URI, [
    path.join(root, 'cdn-export/textures/sun.webp'),
    path.join(root, 'public/textures/sun.webp'),
  ]);

  await decodeDataUriToWebp(EARTH_TEXTURE_DATA_URI, [
    path.join(root, 'cdn-export/textures/earth.webp'),
    path.join(root, 'public/textures/earth.webp'),
  ]);

  console.log('Exported CDN assets to cdn-export/ and public/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
