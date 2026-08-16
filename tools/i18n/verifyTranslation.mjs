import fs from 'fs';

for (const required of ['full_arabic.txt', 'combined_map.json']) {
  if (!fs.existsSync(required)) {
    console.error(`Error: required file "${required}" not found.`);
    process.exit(1);
  }
}
const phrases = fs.readFileSync('full_arabic.txt', 'utf8').split('\n').filter(Boolean);
const map = JSON.parse(fs.readFileSync('combined_map.json'));
let missing = 0;
phrases.forEach(p => {
  if (!map[p]) {
    // console.log("Missing:", p);
    missing++;
  }
});
console.log("Missing count:", missing);
