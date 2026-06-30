import { describe, it, expect, vi } from 'vitest'
import {
  mergeFavorites,
  diffFavorites,
  uniqueIds,
  fetchRemoteFavorites,
  pushInserts,
  pushDeletes,
  performInitialMerge,
  type FavSyncClient,
  type FavoriteRow,
} from '../songFavoritesSync'

function makeClient(remote: FavoriteRow[]) {
  const eqSelect = vi.fn().mockResolvedValue({ data: remote, error: null })
  const upsert = vi.fn().mockResolvedValue({ error: null })
  const deleteIn = vi.fn().mockResolvedValue({ error: null })
  const deleteEq = vi.fn(() => ({ in: deleteIn }))
  const del = vi.fn(() => ({ eq: deleteEq }))
  const select = vi.fn(() => ({ eq: eqSelect }))
  const client: FavSyncClient = {
    from: vi.fn(() => ({ select, upsert, delete: del })),
  }
  return { client, select, eqSelect, upsert, del, deleteEq, deleteIn }
}

describe('songFavoritesSync helpers', () => {
  it('uniqueIds يزيل التكرار', () => {
    expect(uniqueIds(['fv-1', 'fv-1', 'fv-2'])).toEqual(['fv-1', 'fv-2'])
  })

  it('mergeFavorites يحسب الاتّحاد والفروق', () => {
    const r = mergeFavorites(['fv-1', 'fv-2'], ['fv-2', 'fv-3'])
    expect(r.union.sort()).toEqual(['fv-1', 'fv-2', 'fv-3'])
    expect(r.toInsert).toEqual(['fv-1'])
    expect(r.toAddLocal).toEqual(['fv-3'])
  })

  it('diffFavorites يرصد المضاف والمحذوف', () => {
    const d = diffFavorites(['fv-1', 'fv-2'], ['fv-2', 'fv-9'])
    expect(d.added).toEqual(['fv-9'])
    expect(d.removed).toEqual(['fv-1'])
  })

  it('fetchRemoteFavorites يُرجع المعرّفات', async () => {
    const { client } = makeClient([{ song_id: 'fv-5' }, { song_id: 'fv-6' }])
    await expect(fetchRemoteFavorites(client, 'u1')).resolves.toEqual(['fv-5', 'fv-6'])
  })

  it('fetchRemoteFavorites يُرجع [] عند خطأ', async () => {
    const eqSelect = vi.fn().mockResolvedValue({ data: null, error: { message: 'x' } })
    const client: FavSyncClient = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({ eq: eqSelect })),
        upsert: vi.fn(),
        delete: vi.fn(),
      })) as unknown as FavSyncClient['from'],
    }
    await expect(fetchRemoteFavorites(client, 'u1')).resolves.toEqual([])
  })

  it('pushInserts لا يستدعي شيئًا عند مصفوفة فارغة', async () => {
    const { client, upsert } = makeClient([])
    await pushInserts(client, 'u1', [])
    expect(upsert).not.toHaveBeenCalled()
  })

  it('pushInserts يبني الصفوف بـ onConflict', async () => {
    const { client, upsert } = makeClient([])
    await pushInserts(client, 'u1', ['fv-1', 'fv-1', 'fv-2'])
    expect(upsert).toHaveBeenCalledWith(
      [
        { user_id: 'u1', song_id: 'fv-1' },
        { user_id: 'u1', song_id: 'fv-2' },
      ],
      { onConflict: 'user_id,song_id', ignoreDuplicates: true },
    )
  })

  it('pushDeletes يستدعي delete().eq().in()', async () => {
    const { client, deleteEq, deleteIn } = makeClient([])
    await pushDeletes(client, 'u1', ['fv-3'])
    expect(deleteEq).toHaveBeenCalledWith('user_id', 'u1')
    expect(deleteIn).toHaveBeenCalledWith('song_id', ['fv-3'])
  })

  it('pushDeletes لا يستدعي شيئًا عند فارغ', async () => {
    const { client, del } = makeClient([])
    await pushDeletes(client, 'u1', [])
    expect(del).not.toHaveBeenCalled()
  })

  it('performInitialMerge يدمج ويدفع المحلي-فقط', async () => {
    const { client, upsert } = makeClient([{ song_id: 'fv-2' }])
    const result = await performInitialMerge({
      client,
      userId: 'u1',
      localFavorites: ['fv-1', 'fv-2'],
    })
    expect(result.union.sort()).toEqual(['fv-1', 'fv-2'])
    expect(result.toAddLocal).toEqual([])
    expect(upsert).toHaveBeenCalledWith(
      [{ user_id: 'u1', song_id: 'fv-1' }],
      { onConflict: 'user_id,song_id', ignoreDuplicates: true },
    )
  })
})
