// مساعدات خالصة بلا اعتماديّات لمزامنة مفضّلة NL Music مع Supabase.
// ⚠️ لا تستورد أي شيء من src/features/music هنا.
// معرّفات المفضّلة هي معرّفات المسارات الأصلية (مثل "fv-2"، "fv-1044").

export interface FavoriteRow {
  song_id: string
}

interface FavSyncTable {
  select: (columns: string) => {
    eq: (column: string, value: string) => Promise<{ data: FavoriteRow[] | null; error: unknown }>
  }
  upsert: (
    rows: Array<{ user_id: string; song_id: string }>,
    options?: { onConflict?: string; ignoreDuplicates?: boolean },
  ) => Promise<{ error: unknown }>
  delete: () => {
    eq: (column: string, value: string) => {
      in: (column: string, values: string[]) => Promise<{ error: unknown }>
    }
  }
}

export interface FavSyncClient {
  from: (table: string) => FavSyncTable
}

const FAV_TABLE = 'song_favorites'

export function uniqueIds(ids: string[]): string[] {
  return Array.from(new Set(ids))
}

export interface MergeResult {
  union: string[]
  toInsert: string[]
  toAddLocal: string[]
}

export function mergeFavorites(local: string[], remote: string[]): MergeResult {
  const localSet = new Set(local)
  const remoteSet = new Set(remote)
  const union = uniqueIds([...local, ...remote])
  const toInsert = uniqueIds(local).filter((id) => !remoteSet.has(id))
  const toAddLocal = uniqueIds(remote).filter((id) => !localSet.has(id))
  return { union, toInsert, toAddLocal }
}

export interface FavoriteDiff {
  added: string[]
  removed: string[]
}

export function diffFavorites(prev: string[], next: string[]): FavoriteDiff {
  const prevSet = new Set(prev)
  const nextSet = new Set(next)
  const added = next.filter((id) => !prevSet.has(id))
  const removed = prev.filter((id) => !nextSet.has(id))
  return { added, removed }
}

export async function fetchRemoteFavorites(
  client: FavSyncClient,
  userId: string,
): Promise<string[]> {
  const { data, error } = await client.from(FAV_TABLE).select('song_id').eq('user_id', userId)
  if (error || !data) return []
  return data.map((row) => row.song_id)
}

export async function pushInserts(
  client: FavSyncClient,
  userId: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return
  const rows = uniqueIds(ids).map((song_id) => ({ user_id: userId, song_id }))
  await client.from(FAV_TABLE).upsert(rows, { onConflict: 'user_id,song_id', ignoreDuplicates: true })
}

export async function pushDeletes(
  client: FavSyncClient,
  userId: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return
  await client.from(FAV_TABLE).delete().eq('user_id', userId).in('song_id', uniqueIds(ids))
}

export interface InitialMergeArgs {
  client: FavSyncClient
  userId: string
  localFavorites: string[]
}

// يجلب البعيدة، يحسب الاتّحاد (offline-first)، ويدفع المحلي-فقط إلى Supabase.
export async function performInitialMerge(args: InitialMergeArgs): Promise<MergeResult> {
  const { client, userId, localFavorites } = args
  const remote = await fetchRemoteFavorites(client, userId)
  const result = mergeFavorites(localFavorites, remote)
  await pushInserts(client, userId, result.toInsert)
  return result
}
