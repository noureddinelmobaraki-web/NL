
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputDir = 'public/images';
const outputDir = 'public/images/optimized';
const widths = [1920, 1280, 768, 480];
const formats = ['webp', 'avif'];

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function optimizeImages() {
  const files = fs.readdirSync(inputDir).filter(f => /\.(jpe?g|png)$/i.test(f));
  
  console.log(`Found ${files.length} images to optimize...`);

  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const baseName = path.parse(file).name;

    for (const width of widths) {
      for (const format of formats) {
        const outFileName = `${baseName}-${width}.${format}`;
        const outPath = path.join(outputDir, outFileName);

        if (fs.existsSync(outPath)) {
          // console.log(`Skipping ${outFileName}, already exists.`);
          continue;
        }

        try {
          await sharp(filePath)
            .resize(width, null, { withoutEnlargement: true })
            .toFormat(format, { quality: 80 })
            .toFile(outPath);
          console.log(`Generated: ${outFileName}`);
        } catch (err) {
          console.error(`Error processing ${file} (${width}px, ${format}):`, err);
        }
      }
    }
  }
  console.log('Optimization complete!');
}

optimizeImages();
