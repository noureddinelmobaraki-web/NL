import fs from 'fs';
let file = 'src/features/music/MusicPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const target1 = `    (async () => {
      await ensurePersistentStorage();
      const urls = await listSavedUrls();
      if (cancelled) return;
      const tracks = useMusicStore.getState().tracks;`;
const replacement1 = `    (async () => {
      await ensurePersistentStorage();
      const urls = await listSavedUrls();
      if (cancelled) return;
      const tracks = allTracks;`;

const target2 = `  // Layer 1 (reliable): whenever the current track changes, fetch its lyrics now.
  useEffect(() => {
    if (!currentId) return;
    const track = useMusicStore.getState().tracks.find((t) => t.id === currentId);
    if (track) fetchLyrics(track);
  }, [currentId]);`;
const replacement2 = `  // Layer 1 (reliable): whenever the current track changes, fetch its lyrics now.
  useEffect(() => {
    if (!currentId) return;
    const track = allTracks.find((t) => t.id === currentId);
    if (track) fetchLyrics(track);
  }, [currentId, allTracks]);`;

const target3 = `  // Layer 2: on open, prefetch lyrics for songs the user interacts with
  // (favorites + recently played). Bounded set — do NOT prefetch the whole catalog.
  useEffect(() => {
    const s = useMusicStore.getState();
    const byId = new Map(s.tracks.map((t) => [t.id, t]));
    const ids = Array.from(new Set([...s.favorites, ...s.history]));
    const interacted = ids.map((id) => byId.get(id)).filter(Boolean) as typeof s.tracks;
    if (interacted.length) prefetchMany(interacted);
  }, []);`;
const replacement3 = `  // Layer 2: on open, prefetch lyrics for songs the user interacts with
  // (favorites + recently played). Bounded set — do NOT prefetch the whole catalog.
  useEffect(() => {
    const s = useMusicStore.getState();
    const byId = new Map(allTracks.map((t) => [t.id, t]));
    const ids = Array.from(new Set([...s.favorites, ...s.history]));
    const interacted = ids.map((id) => byId.get(id)).filter(Boolean) as typeof allTracks;
    if (interacted.length) prefetchMany(interacted);
  }, [allTracks]);`;

content = content.replace(target1, replacement1);
content = content.replace(target2, replacement2);
content = content.replace(target3, replacement3);
content = content.replace("  const currentId = useMusicStore((s) => s.currentId);", "  const currentId = useMusicStore((s) => s.currentId);\n  const allTracks = useMusicStore((s) => s.tracks);");
content = content.replace("}, []);", "}, [allTracks]); // Re-run when allTracks arrive");

fs.writeFileSync(file, content);
console.log("Fixed MusicPage");
