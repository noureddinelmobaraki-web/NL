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
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('//') || line.includes('/*') || line.includes('*')) {
            if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) continue;
        }
        if (/[\u0600-\u06FF]/.test(line)) {
            // make sure it's not a console.log or throw error that shouldn't be translated?
            // "كل النصوص المعروضة" (All DISPLAYED texts).
            if (!line.includes('console.log') && !line.includes('console.warn') && !line.includes('console.error')) {
                results.add(fullPath);
            }
        }
      }
    }
  }
  return results;
}

const files = Array.from(scanDir('src'));
fs.writeFileSync('arabic_files.txt', files.join('\n'));
console.log('Found ' + files.length + ' files with Arabic strings');
