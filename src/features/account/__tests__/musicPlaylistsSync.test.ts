import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  readLocalMusicPlaylists,
  writeLocalMusicPlaylists,
  startMusicPlaylistsSync,
  stopMusicPlaylistsSync,
  type LocalMusicPlaylist,
} from '../sync/musicPlaylistsSync'

class MemoryStorage implements Storage {
  private data = new Map<string, string>()
  get length() { return this.data.size }
  clear() { this.data.clear() }
  getItem(key: string) { return this.data.get(key) ?? null }
  key(index: number) { return Array.from(this.data.keys())[index] ?? null }
  removeItem(key: string) { this.data.delete(key) }
  setItem(key: string, value: string) { this.data.set(key, value) }
}

describe('musicPlaylistsSync', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('يقرأ playlists من zustand persist بدون كسر favorites', () => {
    const storage = new MemoryStorage()
    storage.setItem('nl-music-store-v1', JSON.stringify({
      state: {
        favorites: ['fv-1'],
        playlists: [
          { id: 'local-a', title: 'قائمتي', songIds: ['fv-1', 'fv-2', ''], position: 2 },
        ],
      },
      version: 0,
    }))

    const playlists = readLocalMusicPlaylists(storage)
    expect(playlists).toHaveLength(1)
    expect(playlists[0].title).toBe('قائمتي')
    expect(playlists[0].songIds).toEqual(['fv-1', 'fv-2'])
  })

  it('يكتب playlists ويُبقي بقية state كما هي', () => {
    const storage = new MemoryStorage()
    storage.setItem('nl-music-store-v1', JSON.stringify({
      state: { favorites: ['fv-9'], volume: 0.5 },
      version: 0,
    }))

    const playlists: LocalMusicPlaylist[] = [
      { localId: 'pl-a', title: 'A', position: 0, songIds: ['fv-1'] },
    ]

    writeLocalMusicPlaylists(playlists, storage)
    const parsed = JSON.parse(storage.getItem('nl-music-store-v1') ?? '{}')
    expect(parsed.state.favorites).toEqual(['fv-9'])
    expect(parsed.state.volume).toBe(0.5)
    expect(parsed.state.playlists).toEqual([
      expect.objectContaining({
        id: 'pl-a',
        name: 'A',
        trackIds: ['fv-1'],
      })
    ])
  })

  it('يقرأ شكل playlists الحقيقي من واجهة الموسيقى', () => {
    const storage = new MemoryStorage()
    storage.setItem('nl-music-store-v1', JSON.stringify({
      state: {
        favorites: ['fv-1'],
        playlists: [
          {
            id: 'ui-playlist-1',
            name: 'تجربة',
            trackIds: ['fv-1', 'fv-2'],
          },
        ],
      },
      version: 0,
    }))

    const playlists = readLocalMusicPlaylists(storage)
    expect(playlists).toHaveLength(1)
    expect(playlists[0].title).toBe('تجربة')
    expect(playlists[0].songIds).toEqual(['fv-1', 'fv-2'])
  })

  it('يعيد [] إذا localStorage فارغ أو معطوب', () => {
    const storage = new MemoryStorage()
    expect(readLocalMusicPlaylists(storage)).toEqual([])
    storage.setItem('nl-music-store-v1', '{bad json')
    expect(readLocalMusicPlaylists(storage)).toEqual([])
  })

  it('start/stop لا يرميان عند Supabase غير مضبوط', async () => {
    vi.doMock('../../../config/supabase', () => ({ supabase: null }))
    await expect(startMusicPlaylistsSync('u1')).resolves.toEqual(expect.any(Function))
    expect(() => stopMusicPlaylistsSync()).not.toThrow()
  })
})
