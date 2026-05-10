import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputDir = 'public/images';
const outputDir = 'public/images/optimized';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [480, 768, 1280, 1920];
const formats = ['webp', 'avif'];

const files = fs.readdirSync(inputDir).filter(file => 
  /\.(jpe?g|png|gif)$/i.test(file)
);

async function optimize() {
  console.log(`Optimizing ${files.length} images...`);
  
  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const fileName = path.parse(file).name;
    
    // Original metadata to keep aspect ratio or just for info
    const image = sharp(inputPath);
    const metadata = await image.metadata();
    
    for (const size of sizes) {
      if (size > metadata.width) continue; // Don't upscale
      
      for (const format of formats) {
        const outputPath = path.join(outputDir, `${fileName}-${size}.${format}`);
        await image
          .clone()
          .resize(size)
          .toFormat(format, { quality: 80 })
          .toFile(outputPath);
      }
      
      // Also generate a resized jpeg/png for fallback if needed, but the user asked for WebP and AVIF
      // I'll add a standard jpeg fallback at various sizes too
      const fallbackExt = metadata.format === 'png' ? 'png' : 'jpg';
      const fallbackPath = path.join(outputDir, `${fileName}-${size}.${fallbackExt}`);
      await image
        .clone()
        .resize(size)
        .toFormat(fallbackExt, { quality: 80 })
        .toFile(fallbackPath);
    }
    console.log(`Done: ${file}`);
  }
  console.log('Optimization complete!');
}

optimize().catch(err => {
  console.error('Speed bump during optimization:', err);
  process.exit(1);
});
