import fs from 'fs';
let file = 'src/features/account/components/FeaturedPicker.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  const catalog = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of useMusicStore.getState().tracks) m.set(t.id, t);
    return m;
  }, []);`;

const replacement = `  const allTracks = useMusicStore((s) => s.tracks);
  const catalog = useMemo(() => {
    const m = new Map<string, Track>();
    for (const t of allTracks) m.set(t.id, t);
    return m;
  }, [allTracks]);`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, replacement));
  console.log("Fixed FeaturedPicker");
} else {
  console.log("FeaturedPicker target not found");
}
