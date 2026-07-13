import { readFileSync, writeFileSync } from 'node:fs';
import { resolveBuildRevision } from './build-metadata.mjs';

const template = readFileSync('public/sw.template.js', 'utf-8');
const packageJson = readFileSync('package.json', 'utf-8');
const hash = resolveBuildRevision({ fallbackContents: [template, packageJson] });
const output = template.replace(/__BUILD_HASH__/g, hash);
writeFileSync('public/sw.js', output);
console.log(`✅ SW versioned with hash: ${hash}`);
