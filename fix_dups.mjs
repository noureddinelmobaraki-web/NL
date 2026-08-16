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
  // deduplicate imports of useMusicStore
  const lines = content.split('\n');
  const out = [];
  let found = false;
  for (const line of lines) {
    if (line.includes("import { useMusicStore } from")) {
      if (!found) {
        out.push(line);
        found = true;
      }
    } else {
      out.push(line);
    }
  }
  fs.writeFileSync(file, out.join('\n'));
}
