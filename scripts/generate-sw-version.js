import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

function getGitHash() {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    // FIXED: fallback عند غياب git
    return `nogit-${Date.now().toString(36)}`;
  }
}

const hash = `${getGitHash()}-${Date.now().toString(36)}`;

const template = readFileSync('public/sw.template.js', 'utf-8');
const output = template.replace(/__BUILD_HASH__/g, hash);
writeFileSync('public/sw.js', output);
console.log(`✅ SW versioned with hash: ${hash}`);
