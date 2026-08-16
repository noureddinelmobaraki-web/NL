import fs from 'fs';
let file = 'src/features/music/components/PlaylistsPanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `  const tracksFor = useMemo(() => {
    return (id: string): Track[] => {
      const st = useMusicStore.getState();
      const map = new Map(st.tracks.map((t) => [t.id, t] as const));
      const pl = st.playlists.find((p) => p.id === id);
      if (!pl) return [];
      return pl.trackIds.map((tid) => map.get(tid)).filter((t): t is Track => !!t);
    };
  }, []);`;

const replacement = `  const allTracks = useMusicStore((s) => s.tracks);
  const tracksFor = useMemo(() => {
    return (id: string): Track[] => {
      const map = new Map(allTracks.map((t) => [t.id, t] as const));
      const pl = playlists.find((p) => p.id === id);
      if (!pl) return [];
      return pl.trackIds.map((tid) => map.get(tid)).filter((t): t is Track => !!t);
    };
  }, [allTracks, playlists]);`;

if (content.includes(target)) {
  fs.writeFileSync(file, content.replace(target, replacement));
  console.log("Fixed PlaylistsPanel");
} else {
  console.log("PlaylistsPanel target not found");
}
