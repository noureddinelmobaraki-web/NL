import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import pLimit from 'p-limit';

const inputData = JSON.parse(fs.readFileSync('public/data/videos.json', 'utf8'));
const outputDir = 'public/images/posters';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const limit = pLimit(2); // Keep concurrency low for ffmpeg

async function generatePoster(video) {
  const outputPath = path.join(outputDir, `${video.id}.webp`);
  
  if (fs.existsSync(outputPath)) {
    console.log(`[SKIP] Poster already exists for ${video.id}`);
    return;
  }

  console.log(`[GEN] Generating poster for ${video.id}...`);

  return new Promise((resolve, reject) => {
    ffmpeg(video.src)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: `${video.id}.webp`,
        folder: outputDir,
        size: '320x569'
      })
      .on('end', () => {
        console.log(`[SUCCESS] Generated ${video.id}.webp`);
        resolve();
      })
      .on('error', (err) => {
        console.error(`[ERROR] Failed ${video.id}:`, err.message);
        // Create a blank placeholder if it fails (e.g. invalid URL)
        resolve(); 
      });
  });
}

async function run() {
  console.log('Starting poster generation... (Requires local ffmpeg)');
  await Promise.all(inputData.map(v => limit(() => generatePoster(v))));
  console.log('Task finished.');
}

run().catch(console.error);
