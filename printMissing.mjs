import fs from 'fs';
const phrases = fs.readFileSync('full_arabic.txt', 'utf8').split('\n').filter(Boolean);
const map = JSON.parse(fs.readFileSync('combined_map.json'));
phrases.forEach(p => {
  if (!map[p]) {
    console.log(p);
  }
});
