// src/features/account/hooks/useInboxNotifications.ts
// Shared read-model for the "song suggestion" inbox (song_shares table).
// Powers both the profile bell and the glass-switcher notch so notifications
// (a friend sent you a song / left a note) can surface anywhere, together with
// the time they were sent. Safe to mount globally: returns an empty model when
// logged out and never throws.
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../../config/supabase';
import { useAuthOptional } from '../../../context/AuthContext';
import { useMusicStore } from '../../music/store/musicStore';

export interface InboxNotification {
  id: string;
  songId: string;
  title: string;
  sender: string;
  message: string;
  createdAt: string;
  timeLabel: string;
  isRead: boolean;
}

// Compact "time of sending" label for the notch (now / 5m / 3h / 2d / Jul 4).
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

const POLL_MS = 45000;

export function useInboxNotifications() {
  const auth = useAuthOptional();
  const user = auth?.user ?? null;
  const tracks = useMusicStore((s) => s.tracks);

  const [items, setItems] = useState<InboxNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Keep the latest tracks without forcing load() to re-run on every store tick.
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    try {
      let rows: any[] = [];
      const { data, error } = await supabase.rpc('my_suggestions');
      if (!error && Array.isArray(data)) {
        rows = data;
      } else {
        // Fallback direct query if the RPC is unavailable.
        const fb = await supabase
          .from('song_shares')
          .select('id, song_id, message, created_at, is_read, sender:profiles!sender_id (display_name)')
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false });
        rows = (fb.data ?? []).map((d: any) => ({
          id: d.id,
          song_id: d.song_id,
          message: d.message,
          created_at: d.created_at,
          is_read: d.is_read,
          sender_name: d.sender?.display_name || 'User',
        }));
      }

      const list: InboxNotification[] = rows.map((r: any) => {
        const rawId = String(r.song_id ?? '');
        const actualId = rawId.startsWith('fv-') ? rawId : `fv-${rawId}`;
        const track = tracksRef.current.find((t) => t.id === actualId);
        return {
          id: String(r.id),
          songId: rawId,
          title: track?.title || (rawId ? `Song #${rawId}` : 'Song'),
          sender: r.sender_name || 'Explorer',
          message: r.message || '',
          createdAt: r.created_at,
          timeLabel: relativeTime(r.created_at),
          isRead: !!r.is_read,
        };
      });

      setItems(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    } catch (err) {
      console.warn('[useInboxNotifications] load failed', err);
    }
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const onFocus = () => { void load(); };
    window.addEventListener('focus', onFocus);
    const id = window.setInterval(() => { void load(); }, POLL_MS);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.clearInterval(id);
    };
  }, [user, load]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
    try {
      await supabase.from('song_shares').update({ is_read: true }).eq('receiver_id', user.id);
    } catch (err) {
      console.warn('[useInboxNotifications] markAllRead failed', err);
    }
  }, [user]);

  return { items, unreadCount, markAllRead, refresh: load };
}
