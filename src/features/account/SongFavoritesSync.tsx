// مكوّن بلا واجهة: يُبقي مفضّلة NL Music متزامنة مع Supabase.
// يُركّب مرّة داخل AuthProvider. استيراد ديناميكي للمخزن وSupabase
// حتّى لا يتأثّر الإقلاع ولا ميزة الموسيقى.
import { useEffect, useRef } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  diffFavorites,
  performInitialMerge,
  pushDeletes,
  pushInserts,
  type FavSyncClient,
} from './songFavoritesSync'

interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: { song_id?: string } | null
  old: { song_id?: string } | null
}

interface MusicStoreState {
  favorites: string[]
}

interface MusicStore {
  getState: () => MusicStoreState
  setState: (state: Partial<MusicStoreState>) => void
  subscribe: (listener: (state: MusicStoreState) => void) => () => void
}

interface RealtimeSubscription {
  unsubscribe: () => void
}

interface RealtimeChannel {
  on: (
    event: string,
    filter: { event: string; schema: string; table: string; filter: string },
    callback: (payload: RealtimePayload) => void,
  ) => RealtimeChannel
  subscribe: () => RealtimeSubscription
}

interface SupabaseClientWithChannel extends FavSyncClient {
  channel: (name: string) => RealtimeChannel
  removeChannel: (channel: RealtimeChannel) => void
}

export default function SongFavoritesSync() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const syncedRef = useRef<Set<string>>(new Set())
  const applyingRemoteRef = useRef(false)
  const lastFavRef = useRef<string[]>([])

  useEffect(() => {
    if (!userId) {
      syncedRef.current = new Set()
      lastFavRef.current = []
      return
    }

    let active = true
    let unsubscribeStore: (() => void) | null = null
    let channel: RealtimeChannel | null = null
    let client: SupabaseClientWithChannel | null = null

    const setLocalFavorites = (store: MusicStore, nextFavorites: string[]) => {
      applyingRemoteRef.current = true
      store.setState({ favorites: nextFavorites })
      lastFavRef.current = nextFavorites
      applyingRemoteRef.current = false
    }

    void (async () => {
      const [{ supabase }, { useMusicStore }] = await Promise.all([
        import('../../config/supabase'),
        import('../../features/music/store/musicStore'),
      ])
      if (!active) return
      client = supabase as unknown as SupabaseClientWithChannel

      const musicStore = useMusicStore as unknown as MusicStore
      const localFavorites: string[] = musicStore.getState().favorites
      lastFavRef.current = localFavorites

      const { union, toAddLocal } = await performInitialMerge({
        client,
        userId,
        localFavorites,
      })
      if (!active) return

      if (toAddLocal.length > 0) {
        setLocalFavorites(musicStore, union)
      }
      syncedRef.current = new Set(union)

      // دفع التغييرات المحلية (تبديل مفضّل) إلى Supabase.
      unsubscribeStore = musicStore.subscribe((state: MusicStoreState) => {
        const favorites = state.favorites
        if (applyingRemoteRef.current) {
          lastFavRef.current = favorites
          return
        }
        if (favorites === lastFavRef.current) return
        const { added, removed } = diffFavorites(Array.from(syncedRef.current), favorites)
        lastFavRef.current = favorites
        if (added.length === 0 && removed.length === 0) return
        for (const id of added) syncedRef.current.add(id)
        for (const id of removed) syncedRef.current.delete(id)
        void pushInserts(client!, userId, added)
        void pushDeletes(client!, userId, removed)
      })

      // استقبال تغييرات Realtime من الأجهزة الأخرى.
      channel = client
        .channel(`song-favs-${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'song_favorites', filter: `user_id=eq.${userId}` },
          (payload: RealtimePayload) => {
            const current: string[] = musicStore.getState().favorites
            if (payload.eventType === 'INSERT' && payload.new?.song_id) {
              const id = payload.new.song_id
              if (!current.includes(id)) {
                syncedRef.current.add(id)
                setLocalFavorites(musicStore, [...current, id])
              }
            } else if (payload.eventType === 'DELETE' && payload.old?.song_id) {
              const id = payload.old.song_id
              if (current.includes(id)) {
                syncedRef.current.delete(id)
                setLocalFavorites(musicStore, current.filter((existing) => existing !== id))
              }
            }
          },
        )
      channel.subscribe()
    })()

    return () => {
      active = false
      if (unsubscribeStore) unsubscribeStore()
      if (client && channel) client.removeChannel(channel)
    }
  }, [userId])

  return null
}
