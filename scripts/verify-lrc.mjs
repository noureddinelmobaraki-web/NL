import fs from 'fs';
import path from 'path';

const songsPath = path.join(process.cwd(), 'public/data/songs.json');
const lrcDir = path.join(process.cwd(), 'public/lrc');

if (!fs.existsSync(songsPath)) {
  console.error(`Error: songs.json not found at ${songsPath}`);
  process.exit(1);
}

const songs = JSON.parse(fs.readFileSync(songsPath, 'utf8'));
const files = fs.readdirSync(lrcDir);

console.log('Available LRC files on disk:');
files.forEach(f => console.log(` - ${f}`));

let hasError = false;

for (const song of songs) {
  if (song.hasLrc) {
    if (!song.lrcFile) {
      console.error(`Error: Song ID ${song.id} (${song.title}) has hasLrc=true but lrcFile is empty/null.`);
      hasError = true;
      continue;
    }

    const expectedFilename = song.lrcFile;
    if (!files.includes(expectedFilename)) {
      console.error(`Error: Missing lyrics file for Song ID ${song.id} (${song.title}). Expected "${expectedFilename}" but it was not found.`);
      hasError = true;
    } else {
      console.log(`OK: Song ID ${song.id} has matching LRC file "${expectedFilename}"`);
    }
  }
}

if (hasError) {
  console.error('Validation failed! Mismatch between songs.json and public/lrc/ files.');
  process.exit(1);
}

console.log('All LRC files verified successfully!');
process.exit(0);
