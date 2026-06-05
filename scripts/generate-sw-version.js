import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

let hash;
try {
  hash = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  hash = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6);
}

const template = readFileSync('public/sw.template.js', 'utf-8');
const output = template.replace(/__BUILD_HASH__/g, hash);
writeFileSync('public/sw.js', output);
console.log(`✅ SW versioned with hash: ${hash}`);
