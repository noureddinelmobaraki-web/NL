import fs from 'fs';
import path from 'path';

let results = [];

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['locales', 'i18n', 'node_modules', '.git', '__tests__'].includes(file)) {
        scanDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        // Skip comment lines
        let trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            continue;
        }
        
        // If it still has Arabic, check if it's not a console.log
        if (/[\u0600-\u06FF]/.test(line)) {
            if (!line.includes('console.')) {
                results.push({ file: fullPath, line: i, text: line });
            }
        }
      }
    }
  }
}
scanDir('src');
fs.writeFileSync('arabic_lines.json', JSON.stringify(results, null, 2));
console.log('Found ' + results.length + ' lines with Arabic strings');
