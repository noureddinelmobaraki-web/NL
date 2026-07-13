import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

describe('My Songs performance architecture', () => {
  it('shares device and theme state instead of subscribing once per card', () => {
    const card = read('src/components/songs/SongCardLite.tsx');
    const list = read('src/components/songs/SongListLite.tsx');
    expect(card).not.toContain('useDeviceType');
    expect(card).not.toContain('useResolvedTheme');
    expect(list).toContain('resolvedTheme={theme}');
    expect(list).toContain('isMobileViewport={isMobile}');
  });

  it('mounts a true six-song window instead of mapping all filtered songs', () => {
    const list = read('src/components/songs/SongListLite.tsx');
    const wrapper = read('src/components/MySongs/MySongsList.tsx');
    expect(list).toContain('visibleSongs.map');
    expect(list).not.toContain('filteredSongs.map');
    expect(list).toContain('SONG_LADDER_PAGE_SIZE');
    expect(wrapper).not.toContain('useVirtualSongList');
  });

  it('attaches the global Home rope to one Cargo Hook', () => {
    const cords = read('src/home/cords.config.ts');
    expect(cords).toContain("sel: '.nl-song-ladder__hook'");
    expect(cords).not.toContain("itemSel: '.nl-song-cell[data-song-revealed=\"true\"]'");
  });

  it('physically hangs pagination controls from the last ladder rung', () => {
    const controls = read('src/components/songs/SongLadderControls.tsx');
    expect(controls).toContain('nl-song-ladder__control-harness');
    expect(controls).toContain('is-beam');
    expect(controls).not.toContain('nl-song-ladder__control-rope');
  });

  it('synchronizes launcher rays and branch nodes without completion gating', () => {
    const graph = read('src/components/launcher/LauncherGraph.tsx');
    const connector = read('src/components/launcher/ConnectorLayer.tsx');
    const node = read('src/components/launcher/NodePill.tsx');
    expect(graph).not.toContain('readyNodeIds');
    expect(connector).toContain('edges.map');
    expect(connector).not.toContain('readyNodeIds.has');
    expect(node).not.toContain('onAnimationComplete');
    expect(node).toContain('getLauncherRevealSpec');
    expect(connector).toContain('getLauncherRevealSpec');
  });

  it('never gates the permanent Home cord topology behind readiness', () => {
    const station = read('src/home/Station.tsx');
    const cords = read('src/home/HomeCords.tsx');
    const css = read('src/styles/home-map.css');
    expect(station).not.toContain('data-connection-ready');
    expect(cords).not.toContain('readyStations');
    expect(css).toContain('.nl-cords .nl-cord');
  });
});
