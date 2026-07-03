import fs from 'fs';
import path from 'path';

const map = JSON.parse(fs.readFileSync('combined_map.json'));
const regex = /[\u0600-\u06FF]+(?:[\s.,!?()\-—]+[\u0600-\u06FF]+)*/g;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

let modifiedFiles = 0;

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!['locales', 'i18n', 'node_modules', '.git', '__tests__'].includes(file)) {
        scanDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalContent = content;
      
      // We process line by line to skip comments
      const lines = content.split('\n');
      let newLines = [];
      let changed = false;
      
      for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        
        let trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            newLines.push(line);
            continue;
        }
        
        if (line.includes('console.') || line.includes('throw new Error')) {
            newLines.push(line);
            continue;
        }

        if (/[\u0600-\u06FF]/.test(line)) {
            // Find all matches in this line
            let modifiedLine = line;
            
            // We should sort matches by length descending so that longer phrases are replaced first!
            let matches = [];
            let match;
            while ((match = regex.exec(line)) !== null) {
              matches.push(match[0].trim());
            }
            
            // Remove duplicates and sort by length descending
            matches = [...new Set(matches)].sort((a, b) => b.length - a.length);
            
            for (let m of matches) {
               if (map[m]) {
                  // Replace exact match, being careful not to mess up things
                  const matchRegex = new RegExp(escapeRegExp(m), 'g');
                  modifiedLine = modifiedLine.replace(matchRegex, map[m]);
               }
            }
            
            if (modifiedLine !== line) {
               changed = true;
               newLines.push(modifiedLine);
            } else {
               newLines.push(line);
            }
        } else {
            newLines.push(line);
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, newLines.join('\n'));
        modifiedFiles++;
      }
    }
  }
}
scanDir('src');
console.log('Modified ' + modifiedFiles + ' files.');
