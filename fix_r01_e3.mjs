import fs from 'fs';
let file = 'src/features/accounts/PublicProfilePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace("import { useSongPreview } from '../music/hooks/useSongPreview';", "import { useSongPreview } from '../music/hooks/useSongPreview';\nimport type { Track } from '../music/engine/types';");
content = content.replace("any /* TODO: Track */", "Track");
fs.writeFileSync(file, content);
