const fs = require('fs');
let text = fs.readFileSync('src/features/music/store/musicStore.ts', 'utf-8');

// I will remove the corrupted part inside the interface
text = text.replace(/              hydrateTracks: async \(\) => {[\s\S]*?},/g, '');

fs.writeFileSync('src/features/music/store/musicStore.ts', text);
