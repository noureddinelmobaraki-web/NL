import fs from 'fs';
let file = 'src/features/admin/UserDetailPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  // song_id -> "Title — Artist" (names, no cover)
  const songNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of useMusicStore.getState().tracks) m.set(t.id, \`\${t.title} — \${t.artist}\`);
    return m;
  }, []);`;

const replacement = `  // song_id -> "Title — Artist" (names, no cover)
  const allTracks = useMusicStore((s) => s.tracks);
  const songNames = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of allTracks) m.set(t.id, \`\${t.title} — \${t.artist}\`);
    return m;
  }, [allTracks]);`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, replacement));
  console.log("Fixed UserDetailPanel");
} else {
  console.log("UserDetailPanel target not found");
}
