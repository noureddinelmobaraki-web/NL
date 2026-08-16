import fs from 'fs';
let file = 'src/features/accounts/PublicProfilePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

const targetMap = `  const songMap = useMemo(() => {
    const m = new Map<string, { title: string; artist: string }>();
    try {
      for (const t of useMusicStore.getState().tracks) m.set(t.id, { title: t.title, artist: t.artist });
    } catch { /* ignore */ }
    return m;
  }, []);`;

const replacementMap = `  const allTracks = useMusicStore((s) => s.tracks);
  const songMap = useMemo(() => {
    const m = new Map<string, import('../../features/music/engine/types').Track>();
    try {
      for (const t of allTracks) m.set(t.id, t);
    } catch { /* ignore */ }
    return m;
  }, [allTracks]);`;

const targetMap2 = `                  {data!.songs.map((s) => {
                    const trackObj = useMusicStore.getState().tracks.find((t) => t.id === s.song_id);
                    const isPlaying = trackObj ? preview.isPlaying(trackObj.id) : false;
                    const meta = songMap.get(s.song_id);
                    return (
                      <div key={s.song_id} className={\`nl-pub-song-card\${isPlaying ? ' is-playing' : ''}\`}>
                        <span className="nl-pub-song-cover">
                          {trackObj?.coverUrl ? (
                            <img src={trackObj.coverUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span>{getInitials(meta ? meta.title : s.song_id)}</span>
                          )}
                          {trackObj && (
                            <button
                              type="button"
                              className="nl-pub-song-play"
                              onClick={() => preview.toggle(trackObj)}
                              aria-label={isPlaying ? 'Pause' : 'Listen'}
                            >
                              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                        </span>
                        <span className="nl-pub-song-title" title={meta ? meta.title : s.song_id}>
                          {first3Words(meta ? meta.title : s.song_id)}
                        </span>
                      </div>
                    );`;

const replacementMap2 = `                  {data!.songs.map((s) => {
                    const trackObj = songMap.get(s.song_id);
                    const isPlaying = trackObj ? preview.isPlaying(trackObj.id) : false;
                    return (
                      <div key={s.song_id} className={\`nl-pub-song-card\${isPlaying ? ' is-playing' : ''}\`}>
                        <span className="nl-pub-song-cover">
                          {trackObj?.coverUrl ? (
                            <img src={trackObj.coverUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            <span>{getInitials(trackObj ? trackObj.title : s.song_id)}</span>
                          )}
                          {trackObj && (
                            <button
                              type="button"
                              className="nl-pub-song-play"
                              onClick={() => preview.toggle(trackObj)}
                              aria-label={isPlaying ? 'Pause' : 'Listen'}
                            >
                              {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                            </button>
                          )}
                        </span>
                        <span className="nl-pub-song-title" title={trackObj ? trackObj.title : s.song_id}>
                          {first3Words(trackObj ? trackObj.title : s.song_id)}
                        </span>
                      </div>
                    );`;

if (content.includes(targetMap) && content.includes(targetMap2)) {
  fs.writeFileSync(file, content.replace(targetMap, replacementMap).replace(targetMap2, replacementMap2));
  console.log("Fixed PublicProfilePanel");
} else {
  console.log("PublicProfilePanel target not found");
}
