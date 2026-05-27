import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const imgDir = path.join(process.cwd(), 'public/win12/img');

const fallbackWallpapers = {
  'colorful-apps': `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#7B2CBF" />
          <stop offset="40%" stop-color="#3C096C" />
          <stop offset="70%" stop-color="#5A189A" />
          <stop offset="100%" stop-color="#FF9E00" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#g)" />
      <circle cx="400" cy="300" r="500" fill="#E0AA3E" opacity="0.15" filter="blur(80px)" />
      <circle cx="1500" cy="800" r="600" fill="#9D4EDD" opacity="0.2" filter="blur(100px)" />
    </svg>`,
  'ai-copilot': `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#0F172A" />
          <stop offset="50%" stop-color="#1E1B4B" />
          <stop offset="100%" stop-color="#0284C7" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#g)" />
      <circle cx="1000" cy="400" r="300" fill="#0EA5E9" opacity="0.25" filter="blur(120px)" />
    </svg>`,
  'start-menu': `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#2563EB" />
          <stop offset="50%" stop-color="#1E3A8A" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#g)" />
      <circle cx="1600" cy="200" r="450" fill="#60A5FA" opacity="0.2" filter="blur(90px)" />
    </svg>`,
  'dark-mode': `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stop-color="#090A0F" />
          <stop offset="100%" stop-color="#161A23" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#g)" />
      <circle cx="960" cy="540" r="700" fill="#312E81" opacity="0.15" filter="blur(150px)" />
    </svg>`,
  'office': `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EA580C" />
          <stop offset="100%" stop-color="#F97316" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#g)" />
    </svg>`,
  'office-newfile': `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563EB" />
          <stop offset="100%" stop-color="#3B82F6" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#g)" />
    </svg>`,
  'wsm': `
    <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#1E293B" />
          <stop offset="100%" stop-color="#0F172A" />
        </linearGradient>
      </defs>
      <rect width="1920" height="1080" fill="url(#g)" />
    </svg>`
};

async function compressPNGtoWebP(filename) {
  const inputPath = path.join(imgDir, filename);
  const outFilename = filename.replace(/\.png$/i, '.webp');
  const outputPath = path.join(imgDir, outFilename);

  try {
    let imageSource;
    let fallbackUsed = false;

    if (fs.existsSync(inputPath)) {
      try {
        const inputBuffer = fs.readFileSync(inputPath);
        // Quick verify if sharp can parse it
        await sharp(inputBuffer).metadata();
        imageSource = inputBuffer;
      } catch (err) {
        console.warn(`[WARN] Original file ${filename} is corrupted (likely binary-damaged). Generating beautiful SVG replacement...`);
        fallbackUsed = true;
      }
    } else {
      console.warn(`[WARN] Original file ${filename} does not exist. Generating beautiful SVG replacement...`);
      fallbackUsed = true;
    }

    if (fallbackUsed) {
      const baseName = filename.replace(/\.png$/i, '');
      const svgString = fallbackWallpapers[baseName] || `
        <svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg">
          <rect width="1920" height="1080" fill="#1E293B" />
        </svg>
      `;
      imageSource = Buffer.from(svgString.trim());
    }

    await sharp(imageSource)
      .webp({ quality: 80 })
      .toFile(outputPath);

    console.log(`[SUCCESS] Generated ${outFilename} with 80% quality!`);
  } catch (err) {
    console.error(`[ERROR] Failed to process/generate ${filename}:`, err);
  }
}

async function run() {
  console.log('Scanning img folder for PNGs to compress...');
  if (!fs.existsSync(imgDir)) {
    fs.mkdirSync(imgDir, { recursive: true });
    return;
  }
  const files = fs.readdirSync(imgDir);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith('.png'));
  console.log(`Found ${pngFiles.length} PNG files. Processing...`);
  
  for (const png of pngFiles) {
    await compressPNGtoWebP(png);
  }
  console.log('Compression process completed!');
}

run().catch(console.error);
