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

  it('does not reveal every card through an arbitrary timeout', () => {
    const hook = read('src/hooks/useVirtualSongList.ts');
    expect(hook).not.toContain('2500');
    expect(hook).toContain('supportsObserverRef');
  });

  it('draws song ropes only for revealed card shells', () => {
    const list = read('src/components/songs/SongListLite.tsx');
    const cords = read('src/home/cords.config.ts');
    expect(list).toContain('data-song-revealed');
    expect(cords).toContain('.nl-song-cell[data-song-revealed="true"]');
  });
});
