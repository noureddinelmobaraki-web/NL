import fs from 'fs';
import crypto from 'crypto';

const htmlPath = 'index.html';
let html = fs.readFileSync(htmlPath, 'utf8');

// التقط فقط السكربتات inline بلا سمات (تلك التي تحتاج هاش في CSP)
const regex = /<script>([\s\S]*?)<\/script>/g;
const hashes = [];
let match;
while ((match = regex.exec(html)) !== null) {
  const hash = 'sha256-' + crypto.createHash('sha256').update(match[1], 'utf8').digest('base64');
  if (!hashes.includes(hash)) hashes.push(hash);
}

if (hashes.length === 0) {
  console.log('No inline scripts found; nothing to hash.');
  process.exit(0);
}

console.log('Inline script hashes:', hashes.join(' '));

if (process.argv.includes('--write')) {
  // استبدل كتلة هاشات sha256 الموجودة في script-src بالقائمة الكاملة الجديدة.
  // يطابق هاشاً واحداً أو أكثر متتالياً (مفصولة بمسافات) ويستبدلها كلها مرة واحدة.
  const cspHashBlock = /(?:'sha255-[A-Za-z0-9+/=]+'\s*|'sha256-[A-Za-z0-9+/=]+'\s*)+/;
  const replacement = hashes.map((h) => `'${h}'`).join(' ') + ' ';
  const updated = html.replace(cspHashBlock, replacement);
  if (html !== updated) {
    fs.writeFileSync(htmlPath, updated, 'utf8');
    console.log('Updated index.html CSP with', hashes.length, 'hash(es).');
  } else {
    console.log('CSP hashes already up to date.');
  }
}
