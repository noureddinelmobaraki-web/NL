import fs from 'fs';
import crypto from 'crypto';

const html = fs.readFileSync('index.html', 'utf8');
const regex = /<script>([\s\S]*?)<\/script>/g;
let match;
while ((match = regex.exec(html)) !== null) {
  const content = match[1];
  const hash = crypto.createHash('sha256').update(content, 'utf8').digest('base64');
  console.log('sha256-' + hash);
}
