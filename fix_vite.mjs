import fs from 'fs';
let file = 'vite.config.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("environment: 'jsdom',", "environment: 'jsdom',\n      setupFiles: ['./src/test/setup.ts'],");
fs.writeFileSync(file, content);
