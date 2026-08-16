import fs from 'fs';
let file = 'src/features/accounts/PublicProfilePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import('../../features/music/engine/types').Track", "any /* TODO: Track */");
fs.writeFileSync(file, content);
