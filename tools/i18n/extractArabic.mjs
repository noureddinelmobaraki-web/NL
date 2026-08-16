import fs from 'fs';
import path from 'path';

function scanDir(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'locales' && file !== 'i18n' && file !== 'node_modules' && file !== '.git') {
        results.push(...scanDir(fullPath));
      }
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('//') || line.includes('/*') || line.includes('*')) {
            // Very naive check for comments, let's just strip basic single-line comments
            if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
        }
        if (/[\u0600-\u06FF]/.test(line)) {
          results.push(`${fullPath}:${i + 1}: ${line.trim()}`);
        }
      }
    }
  }
  return results;
}

const matches = scanDir('src');
fs.writeFileSync('arabic_strings.txt', matches.join('\n'));
console.log('Found ' + matches.length + ' lines with Arabic strings');
