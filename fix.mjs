import fs from 'fs';
let text = fs.readFileSync('src/features/music/store/musicStore.ts', 'utf-8');

const lines = text.split('\n');
const insertion = `
      hydrateTracks: async () => {
        if (get().status === "ready") return;
        try {
          const tracks = await loadFvTracks();
          const valid = new Set(tracks.map((t) => t.id));
          const prev = get();
          set({
            tracks,
            displayOrder: buildInitialOrder(tracks),
            queue: (prev.queue ?? []).filter((id) => valid.has(id)),
            currentId:
              prev.currentId && valid.has(prev.currentId) ? prev.currentId : undefined,
            status: "ready",
          });
        } catch (e) {
          set({ status: "error", error: (e as Error).message });
        }
      },
`;

lines.splice(164, 0, insertion);
fs.writeFileSync('src/features/music/store/musicStore.ts', lines.join('\n'));
