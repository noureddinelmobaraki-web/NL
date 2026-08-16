import fs from 'fs';
const files = [
  'src/features/account/components/FavoriteSongsSection.tsx',
  'src/features/account/components/ThemeSongBar.tsx',
  'src/features/account/components/ThemeSongPicker.tsx',
  'src/features/account/components/FeaturedPicker.tsx',
  'src/features/accounts/PublicProfilePanel.tsx',
  'src/features/admin/UserDetailPanel.tsx',
  'src/features/admin/AdminDashboard.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf-8');
  const importStr = "import { useMusicStore } from '../../music/store/musicStore';";
  const importStr2 = "import { useMusicStore } from '../music/store/musicStore';";
  
  if (content.split(importStr).length > 2) {
     content = content.replace(importStr, "");
  }
  if (content.split(importStr2).length > 2) {
     content = content.replace(importStr2, "");
  }
  fs.writeFileSync(file, content);
}
