import fs from 'fs';
import crypto from 'crypto';

const htmlPath = 'index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

const regex = /<script>([\s\S]*?)<\/script>/g;
let match;
let hashes = [];

while ((match = regex.exec(html)) !== null) {
  const content = match[1];
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
  hashes.push('sha256-' + hash);
}

if (hashes.length > 0) {
  const newHash = hashes[0];
  console.log('New Hash:', newHash);

  if (process.argv.includes('--write')) {
    const cspRegex = /sha256-[a-zA-Z0-9+/=]+/g;
    const updatedHtml = html.replace(cspRegex, newHash);
    
    if (html !== updatedHtml) {
      fs.writeFileSync(htmlPath, updatedHtml, 'utf8');
      console.log('Successfully updated index.html with new CSP hash.');
    } else {
      console.log('CSP hash is already up to date.');
    }
  }
}
