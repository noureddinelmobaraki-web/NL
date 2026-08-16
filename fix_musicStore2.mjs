import fs from 'fs';
let content = fs.readFileSync('src/features/music/store/musicStore.ts', 'utf-8');

// Add hydrateTracks interface
content = content.replace("error?: string;", "error?: string;\n  hydrateTracks: () => Promise<void>;");

// Add hydrateTracks implementation to the state object
const actionIndex = content.lastIndexOf("actions: {");
const stateObjectStart = content.substring(0, actionIndex).lastIndexOf("queueIndex: -1,");
// It's inside the first object argument of `persist((set, get) => ({ ... }))`
// Let's just put it before `actions: {`
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
content = content.replace("actions: {", insertion + "      actions: {");
fs.writeFileSync('src/features/music/store/musicStore.ts', content);
