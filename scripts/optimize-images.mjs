import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';
import https from 'https';

const inputDir = 'public/images';
const outputDir = 'public/images/optimized';
const dataDir = 'public/data';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sizes = [480, 768, 1280, 1920];
const formats = ['webp', 'avif'];

const files = fs.existsSync(inputDir) 
  ? fs.readdirSync(inputDir).filter(file => /\.(jpe?g|png|gif)$/i.test(file))
  : [];

const limit = pLimit(4);

// Download helper
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch image: Status ${res.statusCode}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', (err) => reject(err));
    }).on('error', (err) => reject(err));
  });
}

// LQIP generation helper
async function getLqipBase64(imageBuffer) {
  try {
    const lqipBuffer = await sharp(imageBuffer)
      .resize(16, 16, { fit: 'cover' })
      .blur(2)
      .webp({ quality: 20 })
      .toBuffer();
    return `data:image/webp;base64,${lqipBuffer.toString('base64')}`;
  } catch (err) {
    console.error('[LQIP] Error generating LQIP:', err.message);
    return null;
  }
}

async function processFile(file) {
  const inputPath = path.join(inputDir, file);
  const fileName = path.parse(file).name;
  
  try {
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    if (!metadata.width) {
      console.warn(`[WARN] Skipping ${file}: Could not retrieve width metadata (file may be corrupt or unsupported).`);
      return;
    }

    const tasks = [];
    for (const size of sizes) {
      if (size > (metadata.width || 0)) continue;
      
      for (const format of formats) {
        const outputPath = path.join(outputDir, `${fileName}-${size}.${format}`);
        tasks.push(
          image
            .clone()
            .resize(size)
            .toFormat(format, { quality: 80 })
            .toFile(outputPath)
        );
      }
    }
    
    await Promise.all(tasks);
    console.log(`[INFO] Optimized: ${file}`);
  } catch (err) {
    console.error(`[ERROR] Failed to process ${file}:`, err.message);
  }
}

async function downloadAndOptimizeHeroBgs() {
  const backgroundThemes = {
    dark: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bgdark.webp',
    light: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bgdarklight.webp',
    midnight: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg.webp',
    bit: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/hero_bg_bit.webp'
  };

  for (const [theme, url] of Object.entries(backgroundThemes)) {
    const outputPath = path.join(outputDir, `hero_bg.${theme}.blurred.webp`);
    try {
      console.log(`[INFO] Fetching background for theme: ${theme} from ${url}...`);
      const buffer = await downloadImage(url);

      console.log(`[INFO] Optimizing & blurring background for theme: ${theme}...`);
      await sharp(buffer)
        .blur(8)
        .modulate({ brightness: 0.5 })
        .webp({ quality: 60 })
        .toFile(outputPath);

      console.log(`[INFO] Saved pre-blurred background for theme ${theme} to ${outputPath}`);
    } catch (err) {
      console.error(`[ERROR] Failed to optimize background for theme ${theme}:`, err.message);
    }
  }
}

async function generateLqipManifest() {
  console.log('[LQIP] Starting LQIP manifest generator...');
  const manifest = {};

  const imagesToProcess = [
    { key: 'profile_img.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_img.webp' },
    { key: 'photo.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/photo.webp' },
    { key: 'profile_imgdark.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imgdark.webp' },
    { key: 'photodark.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/photodark.webp' },
    { key: 'profile_imglight.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imglight.webp' },
    { key: 'photolight.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/photolight.webp' },
    { key: 'profile_imglightopenin.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/profile_imglightopenin.webp' },
    { key: 'playlist_cover.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover.webp' },
    { key: 'playlist_coverdark.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_coverdark.webp' },
    { key: 'playlist_coverlight.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_coverlight.webp' },
    { key: 'playlist_cover_bit.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/playlist_cover_bit.webp' },
    { key: 'yt_highlights.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlights.webp' },
    { key: 'yt_highlightsdark.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlightsdark.webp' },
    { key: 'yt_highlightslight.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlightslight.webp' },
    { key: 'yt_highlights_bit.webp', url: 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/yt_highlights_bit.webp' }
  ];

  // Add me_bits 1-9
  for (let i = 1; i <= 9; i++) {
    imagesToProcess.push({
      key: `me_bit_${i}.webp`,
      url: `https://noureddinelmobaraki-web.github.io/nl-audio-cdn/me_bit_${i}.webp`
    });
  }

  // Process CDN images
  for (const item of imagesToProcess) {
    try {
      console.log(`[LQIP] Fetching ${item.key} for LQIP...`);
      const buffer = await downloadImage(item.url);
      const lqipBase64 = await getLqipBase64(buffer);
      if (lqipBase64) {
        manifest[item.key] = lqipBase64;
      }
    } catch (err) {
      console.warn(`[LQIP] Skipping LQIP for ${item.key} (download/process error):`, err.message);
    }
  }

  // Process local gallery drawings too!
  const localDrawings = [
    { key: 'DRAW.webp', path: 'src/assets/images/gallery/DRAW.webp' },
    { key: 'DRAW2.webp', path: 'src/assets/images/gallery/DRAW2.webp' }
  ];

  for (const item of localDrawings) {
    if (fs.existsSync(item.path)) {
      try {
        console.log(`[LQIP] Processing local ${item.key} for LQIP...`);
        const buffer = fs.readFileSync(item.path);
        const lqipBase64 = await getLqipBase64(buffer);
        if (lqipBase64) {
          manifest[item.key] = lqipBase64;
        }
      } catch (err) {
        console.warn(`[LQIP] Skipping local LQIP for ${item.key}:`, err.message);
      }
    } else {
      console.warn(`[LQIP] Local drawing not found: ${item.path}`);
    }
  }

  const manifestPath = path.join(dataDir, 'lqip-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`[LQIP] Successfully wrote manifest to ${manifestPath}`);
}

async function optimize() {
  if (files.length === 0) {
    console.log('No local directory images found to optimize. Checking backgrounds and LQIPs...');
  } else {
    console.log(`Optimizing ${files.length} images with concurrency=4...`);
    await Promise.all(files.map(file => limit(() => processFile(file))));
  }

  // Generate pre-blurred backgrounds
  await downloadAndOptimizeHeroBgs();

  // Generate LQIP manifest
  await generateLqipManifest();

  console.log('Optimization complete!');
}

optimize().catch(err => {
  console.error('Fatal error during optimization:', err);
  process.exit(1);
});
