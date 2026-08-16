import fs from 'fs';
import path from 'path';

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== 'locales' && file !== 'i18n' && file !== 'node_modules' && file !== '.git') {
        scanDir(fullPath);
      }
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      // We need to replace Arabic phrases inside JSX text, title="", aria-label="", etc.
      // Since it's hard to do AST parsing, let's use a regex replace with a function.
      
      let modified = false;
      content = content.replace(/[\u0600-\u06FF][\u0600-\u06FF0-9\s.,!?():\-—]*/g, (match) => {
        let trimmed = match.trim();
        if (!/[\u0600-\u06FF]/.test(trimmed)) return match;
        
        // Very basic dictionary replacement, or just generic english if we want to be lazy, 
        // but let's actually just build a dictionary of common words found.
        return match; 
      });
      
    }
  }
}
scanDir('src');
