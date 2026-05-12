import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import pLimit from 'p-limit';

const inputDir = 'public/images';
const outputDir = 'public/images/optimized';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [480, 768, 1280, 1920];
const formats = ['webp', 'avif'];

const files = fs.existsSync(inputDir) 
  ? fs.readdirSync(inputDir).filter(file => /\.(jpe?g|png|gif)$/i.test(file))
  : [];

const limit = pLimit(4);

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
      if (size > (metadata.width || 0)) continue; // Double guard for safety
      
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

async function optimize() {
  if (files.length === 0) {
    console.log('No images found to optimize.');
    return;
  }

  console.log(`Optimizing ${files.length} images with concurrency=4...`);
  await Promise.all(files.map(file => limit(() => processFile(file))));
  console.log('Optimization complete!');
}

optimize().catch(err => {
  console.error('Fatal error during optimization:', err);
  process.exit(1);
});
