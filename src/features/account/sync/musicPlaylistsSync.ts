import { useMusicStore } from '../../music/store/musicStore'

export type LocalMusicPlaylist = {
  localId: string
  remoteId?: string
  title: string
  description?: string | null
  color?: string | null
  position: number
  songIds: string[]
  updatedAt?: string
}

type RemotePlaylistRow = {
  id: string
  user_id: string
  title: string
  description: string | null
  color: string | null
  position: number
  updated_at?: string
  created_at?: string
}

type RemotePlaylistItemRow = {
  id: string
  playlist_id: string
  song_id: string
  position: number
  created_at?: string
}

type SupabaseLike = {
  from: (table: string) => any
  channel?: (name: string) => any
  removeChannel?: (channel: any) => Promise<unknown> | unknown
}

const STORAGE_KEY = 'nl-music-store-v1'
const MAX_TITLE = 80
const MAX_DESCRIPTION = 240

let currentStop: null | (() => void) = null
let isApplyingRemote = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function normalizeSongId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= 120 ? trimmed : null
}

function safeText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, max)
}

function makeLocalId(seed: string) {
  return `pl-${seed.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 36) || Date.now()}`
}

function normalizePlaylist(raw: any, index: number): LocalMusicPlaylist | null {
  if (!raw || typeof raw !== 'object') return null

  const title = safeText(
    raw.title ?? raw.name ?? raw.label ?? raw.playlistName,
    MAX_TITLE,
  )
  if (!title) return null

  const remoteId = typeof raw.remoteId === 'string'
    ? raw.remoteId
    : typeof raw.remote_id === 'string'
      ? raw.remote_id
      : typeof raw.id === 'string' && raw.id.includes('-') && raw.id.length > 20
        ? raw.id
        : undefined

  const localId = typeof raw.localId === 'string'
    ? raw.localId
    : typeof raw.local_id === 'string'
      ? raw.local_id
      : typeof raw.id === 'string'
        ? raw.id
        : makeLocalId(`${title}-${index}`)

  const sourceSongs = Array.isArray(raw.songIds)
    ? raw.songIds
    : Array.isArray(raw.song_ids)
      ? raw.song_ids
      : Array.isArray(raw.trackIds)
        ? raw.trackIds
        : Array.isArray(raw.tracks)
          ? raw.tracks.map((item: any) => item?.songId ?? item?.song_id ?? item?.id)
          : Array.isArray(raw.songs)
            ? raw.songs.map((item: any) => typeof item === 'string' ? item : item?.songId ?? item?.song_id ?? item?.id)
            : Array.isArray(raw.items)
              ? raw.items.map((item: any) => item?.songId ?? item?.song_id ?? item?.id)
              : []

  const songIds = Array.from(new Set(sourceSongs.map(normalizeSongId).filter(Boolean))) as string[]

  return {
    localId,
    remoteId,
    title,
    description: safeText(raw.description, MAX_DESCRIPTION),
    color: safeText(raw.color ?? raw.accent ?? raw.theme, 40),
    position: Number.isFinite(Number(raw.position)) ? Number(raw.position) : index,
    songIds,
    updatedAt: typeof raw.updatedAt === 'string'
      ? raw.updatedAt
      : typeof raw.updated_at === 'string'
        ? raw.updated_at
        : undefined,
  }
}

export function readLocalMusicPlaylists(storage: Storage = localStorage): LocalMusicPlaylist[] {
  try {
    if (storage === localStorage) {
      const statePlaylists = useMusicStore.getState().playlists
      if (Array.isArray(statePlaylists)) {
        return statePlaylists
          .map((item: any, index: number) => normalizePlaylist(item, index))
          .filter(Boolean) as LocalMusicPlaylist[]
      }
    }
  } catch (err) {
    // fallback if store is not yet loaded or in tests
  }

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    const state = parsed?.state && typeof parsed.state === 'object' ? parsed.state : parsed
    const playlists = Array.isArray(state?.playlists) ? state.playlists : []
    return playlists
      .map((item: unknown, index: number) => normalizePlaylist(item, index))
      .filter(Boolean) as LocalMusicPlaylist[]
  } catch (err) {
    console.warn('[sync] playlists: failed to read local storage', err)
    return []
  }
}

export function writeLocalMusicPlaylists(playlists: LocalMusicPlaylist[], storage: Storage = localStorage) {
  const uiPlaylists = playlists.map((pl) => ({
    id: pl.localId,
    name: pl.title,
    trackIds: pl.songIds,
    createdAt: pl.updatedAt ? new Date(pl.updatedAt).getTime() : Date.now(),
    remoteId: pl.remoteId,
  }))

  try {
    if (storage === localStorage) {
      useMusicStore.setState({ playlists: uiPlaylists })
      window.dispatchEvent(new CustomEvent('nl:music-playlists-sync', { detail: { playlists } }))
      return
    }
  } catch (err) {
    // fallback if store is not available
  }

  try {
    const raw = storage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    const state = parsed?.state && typeof parsed.state === 'object' ? parsed.state : parsed
    state.playlists = uiPlaylists
    if (parsed?.state && typeof parsed.state === 'object') parsed.state = state
    else Object.assign(parsed, state)
    storage.setItem(STORAGE_KEY, JSON.stringify(parsed))
    window.dispatchEvent(new CustomEvent('nl:music-playlists-sync', { detail: { playlists } }))
  } catch (err) {
    console.warn('[sync] playlists: failed to write local storage', err)
  }
}

function remoteToLocal(
  rows: RemotePlaylistRow[],
  items: RemotePlaylistItemRow[],
): LocalMusicPlaylist[] {
  const grouped = new Map<string, RemotePlaylistItemRow[]>()
  for (const item of items) {
    const list = grouped.get(item.playlist_id) ?? []
    list.push(item)
    grouped.set(item.playlist_id, list)
  }

  return rows
    .slice()
    .sort((a, b) => a.position - b.position || a.title.localeCompare(b.title))
    .map((row, index) => {
      const songIds = (grouped.get(row.id) ?? [])
        .slice()
        .sort((a, b) => a.position - b.position)
        .map(item => item.song_id)
      return {
        localId: makeLocalId(row.id),
        remoteId: row.id,
        title: row.title,
        description: row.description,
        color: row.color,
        position: Number.isFinite(row.position) ? row.position : index,
        songIds,
        updatedAt: row.updated_at,
      }
    })
}

function mergePlaylists(local: LocalMusicPlaylist[], remote: LocalMusicPlaylist[]) {
  const byKey = new Map<string, LocalMusicPlaylist>()

  for (const playlist of remote) {
    byKey.set(playlist.remoteId ?? playlist.localId, playlist)
  }

  for (const playlist of local) {
    const key = playlist.remoteId ?? playlist.localId
    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, playlist)
      continue
    }
    byKey.set(key, {
      ...existing,
      ...playlist,
      remoteId: existing.remoteId ?? playlist.remoteId,
      songIds: Array.from(new Set([...existing.songIds, ...playlist.songIds])),
    })
  }

  return Array.from(byKey.values()).sort((a, b) => a.position - b.position)
}

async function fetchRemotePlaylists(supabase: SupabaseLike, userId: string) {
  const playlistsRes = await supabase
    .from('music_playlists')
    .select('id,user_id,title,description,color,position,created_at,updated_at')
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (playlistsRes.error) throw playlistsRes.error
  const rows = (playlistsRes.data ?? []) as RemotePlaylistRow[]
  const ids = rows.map(row => row.id)
  if (ids.length === 0) return []

  const itemsRes = await supabase
    .from('music_playlist_items')
    .select('id,playlist_id,song_id,position,created_at')
    .in('playlist_id', ids)
    .order('position', { ascending: true })

  if (itemsRes.error) throw itemsRes.error
  return remoteToLocal(rows, (itemsRes.data ?? []) as RemotePlaylistItemRow[])
}

async function upsertRemotePlaylists(supabase: SupabaseLike, userId: string, playlists: LocalMusicPlaylist[]) {
  const saved: LocalMusicPlaylist[] = []

  for (const playlist of playlists) {
    const payload = {
      user_id: userId,
      title: playlist.title.slice(0, MAX_TITLE),
      description: playlist.description?.slice(0, MAX_DESCRIPTION) ?? null,
      color: playlist.color ?? null,
      position: playlist.position,
    }

    let playlistId = playlist.remoteId
    if (playlistId) {
      const res = await supabase
        .from('music_playlists')
        .update(payload)
        .eq('id', playlistId)
        .eq('user_id', userId)
        .select('id')
        .single()
      if (res.error) throw res.error
    } else {
      const res = await supabase
        .from('music_playlists')
        .insert(payload)
        .select('id')
        .single()
      if (res.error) throw res.error
      playlistId = res.data.id
    }

    const deleteRes = await supabase
      .from('music_playlist_items')
      .delete()
      .eq('playlist_id', playlistId)
    if (deleteRes.error) throw deleteRes.error

    const uniqueSongs = Array.from(new Set(playlist.songIds.map(normalizeSongId).filter(Boolean))) as string[]
    if (uniqueSongs.length) {
      const insertRes = await supabase.from('music_playlist_items').insert(
        uniqueSongs.map((songId, index) => ({
          playlist_id: playlistId,
          song_id: songId,
          position: index,
        })),
      )
      if (insertRes.error) throw insertRes.error
    }

    saved.push({ ...playlist, remoteId: playlistId, songIds: uniqueSongs })
  }

  return saved
}

async function syncOnce(supabase: SupabaseLike, userId: string) {
  const local = readLocalMusicPlaylists()
  const remote = await fetchRemotePlaylists(supabase, userId)
  const merged = mergePlaylists(local, remote)
  const saved = await upsertRemotePlaylists(supabase, userId, merged)
  isApplyingRemote = true
  writeLocalMusicPlaylists(saved)
  isApplyingRemote = false
  console.debug('[sync] playlists: synced', saved.length)
}

function scheduleLocalPush(supabase: SupabaseLike, userId: string) {
  if (isApplyingRemote) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    syncOnce(supabase, userId).catch(err => console.warn('[sync] playlists: local push failed', err))
  }, 800)
}

export async function startMusicPlaylistsSync(userId: string) {
  if (currentStop) currentStop()

  const { supabase } = await import('../../../config/supabase')
  if (!supabase) {
    console.debug('[sync] playlists: supabase not configured')
    return () => undefined
  }

  await syncOnce(supabase, userId)

  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) scheduleLocalPush(supabase, userId)
  }
  const onCustom = () => scheduleLocalPush(supabase, userId)
  window.addEventListener('storage', onStorage)
  window.addEventListener('nl:music-playlists-changed', onCustom)

  let lastPlaylists = useMusicStore.getState().playlists
  const unsubscribeStore = useMusicStore.subscribe((state) => {
    if (state.playlists !== lastPlaylists) {
      lastPlaylists = state.playlists
      scheduleLocalPush(supabase, userId)
    }
  })

  const channel = supabase.channel?.(`music-playlists:${userId}`)
  if (channel) {
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_playlists', filter: `user_id=eq.${userId}` }, () => {
        syncOnce(supabase, userId).catch(err => console.warn('[sync] playlists: remote playlist event failed', err))
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'music_playlist_items' }, () => {
        syncOnce(supabase, userId).catch(err => console.warn('[sync] playlists: remote item event failed', err))
      })
      .subscribe()
  }

  currentStop = () => {
    window.removeEventListener('storage', onStorage)
    window.removeEventListener('nl:music-playlists-changed', onCustom)
    unsubscribeStore()
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = null
    if (channel && supabase.removeChannel) void supabase.removeChannel(channel)
    currentStop = null
    console.debug('[sync] playlists: stopped')
  }

  return currentStop
}

export function stopMusicPlaylistsSync() {
  if (currentStop) currentStop()
}
