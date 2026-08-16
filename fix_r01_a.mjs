import fs from 'fs';
let file = 'src/features/account/components/FavoriteSongsSection.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  // Local catalog map: song_id -> Track
  const catalog = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of useMusicStore.getState().tracks) m.set(t.id, t);
    return m;
  }, []);`;

const replacement = `  // Local catalog map: song_id -> Track
  // نشترك في s.tracks فقط: مرجع ثابت لا يتغير مع currentTime،
  // ويتغير مرة واحدة فقط عند اكتمال hydrateTracks.
  const allTracks = useMusicStore((s) => s.tracks);
  const catalog = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of allTracks) m.set(t.id, t);
    return m;
  }, [allTracks]);`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, replacement));
  console.log("Fixed FavoriteSongsSection");
} else {
  console.log("FavoriteSongsSection target not found");
}
