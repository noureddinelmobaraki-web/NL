import fs from 'fs';
import path from 'path';

function scanDir(dir) {
  const results = new Set();
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'locales' && file !== 'i18n' && file !== 'node_modules' && file !== '.git') {
        scanDir(fullPath).forEach(r => results.add(r));
      }
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // Match Arabic text blocks, possibly containing spaces and punctuation.
      // We will match a run of Arabic characters and spaces.
      const regex = /[\u0600-\u06FF0-9\s.,!?():\-—]+/g;
      
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('//') || line.includes('/*') || line.includes('*')) {
            if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
        }
        let match;
        while ((match = regex.exec(line)) !== null) {
          let str = match[0].trim();
          if (/[\u0600-\u06FF]/.test(str)) {
             results.add(str);
          }
        }
      }
    }
  }
  return results;
}

const uniquePhrases = Array.from(scanDir('src'));
fs.writeFileSync('arabic_phrases.json', JSON.stringify(uniquePhrases, null, 2));
console.log('Found ' + uniquePhrases.length + ' unique Arabic phrases');
