// scripts/check-csp.mjs
// Verifies that every origin defined in src/config/servers.ts is present in the
// Content-Security-Policy frame-src directive across index.html (and dist/index.html when --dist is passed),
// and ensures no wildcard (* or bare https:) is used in frame-src.

import fs from 'node:fs';
import path from 'node:path';

const serversPath = path.resolve('src/config/servers.ts');
if (!fs.existsSync(serversPath)) {
  console.error('❌ Error: src/config/servers.ts not found.');
  process.exit(1);
}

const serversSource = fs.readFileSync(serversPath, 'utf8');
const originMatches = [
  ...serversSource.matchAll(/origins:\s*\[([^\]]+)\]/g),
];

const WORKER_FRAME_ORIGIN = 'https://broad-block-7bd7.nordinegb2018.workers.dev';
const extractedOrigins = new Set([WORKER_FRAME_ORIGIN]);
for (const match of originMatches) {
  const block = match[1];
  for (const strMatch of block.matchAll(/['"](https:\/\/[^'"]+)['"]/g)) {
    extractedOrigins.add(strMatch[1]);
  }
}

if (extractedOrigins.size === 0) {
  console.error('❌ Error: No server origins found in src/config/servers.ts');
  process.exit(1);
}

const includeDist = process.argv.includes('--dist');
const candidates = includeDist
  ? ['index.html', 'public/404.html', 'dist/index.html']
  : ['index.html', 'public/404.html'];

const htmlTargets = candidates.filter((file) => fs.existsSync(path.resolve(file)));

let hasFailure = false;

for (const relPath of htmlTargets) {
  const fullPath = path.resolve(relPath);
  const html = fs.readFileSync(fullPath, 'utf8');
  const cspMetaMatch = html.match(
    /<meta\s+http-equiv=(["'])Content-Security-Policy\1[^>]*content=(["'])([\s\S]*?)\2[^>]*>/i,
  );

  if (!cspMetaMatch) {
    if (relPath === 'index.html' || relPath === 'dist/index.html') {
      console.error(`❌ Error: Missing Content-Security-Policy meta tag in ${relPath}`);
      hasFailure = true;
    }
    continue;
  }

  const cspContent = cspMetaMatch[3];
  const frameSrcMatch = cspContent.match(/(?:frame-src|child-src)\s+([^;]+);/);
  if (!frameSrcMatch) {
    console.error(`❌ Error: Missing frame-src directive in ${relPath}`);
    hasFailure = true;
    continue;
  }

  const tokens = frameSrcMatch[1]
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.includes('*') || tokens.includes('https:') || tokens.includes('http:')) {
    console.error(
      `❌ Security Error in ${relPath}: Wildcard (* or bare https:) is forbidden in frame-src.`,
    );
    hasFailure = true;
  }

  const missing = [...extractedOrigins].filter((origin) => !tokens.includes(origin));
  if (missing.length > 0) {
    console.error(
      `❌ CSP Mismatch in ${relPath}: Missing frame-src origins: ${missing.join(', ')}`,
    );
    hasFailure = true;
  } else {
    console.log(
      `✅ CSP frame-src verified in ${relPath} (${extractedOrigins.size} server origins present).`,
    );
  }
}

if (hasFailure) {
  process.exit(1);
}
