import fs from 'fs';
let content = fs.readFileSync('src/features/music/store/musicStore.ts', 'utf-8');
content = content.replace(/hydrateTracks: async \(\) => \{[\s\S]*?\},/g, '');
content = content.replace(/hydrateTracks: \(\) => Promise<void>;/g, '');
fs.writeFileSync('src/features/music/store/musicStore.ts', content);
