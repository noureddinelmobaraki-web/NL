import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Play, Trash2, MailOpen, Calendar, MessageSquare, Music, Loader2 
} from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useMusicStore } from '../../music/store/musicStore';
import { useAuth } from '../../../context/AuthContext';

interface InboxPanelProps {
  onClose: () => void;
  onRefreshCount: () => void;
}

export function InboxPanel({ onClose, onRefreshCount }: InboxPanelProps) {
  const { user, closeProfile } = useAuth();
  const tracks = useMusicStore((s) => s.tracks);
  const playTrack = useMusicStore((s) => s.actions.playTrack);

  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<any | null>(null);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch suggestions from RPC
      const { data, error } = await supabase.rpc('my_suggestions');
      if (error) throw error;
      setSuggestions(data ?? []);
    } catch (err) {
      console.warn('[InboxPanel] failed to load suggestions', err);
      // Fallback to direct query if RPC is not available
      try {
        const { data, error } = await supabase
          .from('song_shares')
          .select(`
            id,
            song_id,
            message,
            created_at,
            is_read,
            sender:profiles!sender_id (display_name, avatar_url)
          `)
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          // Map to match RPC expected schema
          const mapped = data.map((d: any) => ({
            id: d.id,
            song_id: d.song_id,
            message: d.message,
            created_at: d.created_at,
            is_read: d.is_read,
            sender_name: d.sender?.display_name || 'مستخدم',
            sender_avatar: d.sender?.avatar_url
          }));
          setSuggestions(mapped);
        }
      } catch (fallbackErr) {
        console.error('[InboxPanel] Fallback fetch also failed', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  const handlePlaySuggestion = async (songId: string) => {
    // Match direct or with fv- prefix
    const actualId = songId.startsWith('fv-') ? songId : `fv-${songId}`;
    const track = tracks.find((t) => t.id === actualId);
    
    if (track) {
      // Play track in store
      void playTrack(track.id, true);
      // Close profile modal and inbox panel to let the user see the player
      onClose();
      closeProfile();
    } else {
      alert('الأغنية غير متوفرة في دليل الموسيقى الحالي.');
    }
  };

  const handleDelete = async (id: any) => {
    setDeletingId(id);
    try {
      // Try delete from song_shares
      const { error } = await supabase
        .from('song_shares')
        .delete()
        .eq('id', id);
      
      if (error) {
        // Fallback: update as read
        await supabase
          .from('song_shares')
          .update({ is_read: true })
          .eq('id', id);
      }

      setSuggestions((prev) => prev.filter((s) => s.id !== id));
      onRefreshCount();
    } catch (err) {
      console.error('Failed to delete suggestion', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await supabase
        .from('song_shares')
        .update({ is_read: true })
        .eq('receiver_id', user.id);
      
      setSuggestions((prev) => prev.map((s) => ({ ...s, is_read: true })));
      onRefreshCount();
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-slate-950/98 text-white p-6 justify-between select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-2">
          <MailOpen className="text-teal-400" size={20} />
          <h3 className="text-lg font-bold">صندوق المقترحات الموسيقية</h3>
        </div>
        <div className="flex items-center gap-3">
          {suggestions.some((s) => !s.is_read) && (
            <button 
              onClick={handleMarkAllRead}
              className="text-xs text-teal-400 hover:text-teal-300 font-bold transition-colors"
            >
              قراءة الكل
            </button>
          )}
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Main Inbox List */}
      <div className="flex-grow my-4 overflow-y-auto scrollbar-thin space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400 gap-2">
            <Loader2 size={32} className="animate-spin text-teal-400" />
            <p className="text-sm">جارٍ تحميل المقترحات...</p>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-500">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-slate-400 mb-4">
              <MailOpen size={28} />
            </div>
            <h4 className="font-bold text-sm text-slate-400">صندوقك فارغ تماماً</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-[240px] mx-auto">
              عندما يرسل لك الأصدقاء أغاني لتقوم بالاستماع إليها، ستظهر مقترحاتهم هنا.
            </p>
          </div>
        ) : (
          suggestions.map((item) => {
            const actualId = item.song_id.startsWith('fv-') ? item.song_id : `fv-${item.song_id}`;
            const track = tracks.find((t) => t.id === actualId);
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-2xl border transition-all flex gap-4 ${
                  item.is_read 
                    ? 'bg-white/5 border-white/5 text-slate-300' 
                    : 'bg-teal-500/5 border-teal-500/20 shadow-[0_4px_12px_rgba(20,184,166,0.05)]'
                }`}
              >
                {/* Track Cover / Play Button */}
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-slate-800 border border-white/10 shrink-0 group flex items-center justify-center">
                  {track?.coverUrl ? (
                    <img src={track.coverUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <Music size={24} className="text-slate-500" />
                  )}
                  {track && (
                    <button
                      onClick={() => handlePlaySuggestion(item.song_id)}
                      className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity duration-200"
                      title="تشغيل الآن"
                    >
                      <Play size={20} fill="currentColor" />
                    </button>
                  )}
                </div>

                {/* Info Column */}
                <div className="flex-grow min-w-0 flex flex-col justify-between py-0.5">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-bold text-white truncate text-sm">
                        {track?.title || `أغنية #${item.song_id}`}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          disabled={deletingId === item.id}
                          onClick={() => handleDelete(item.id)}
                          className="p-1 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 rounded transition-colors"
                          title="حذف"
                        >
                          {deletingId === item.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Trash2 size={13} />
                          )}
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {track?.artist || 'مغني مجهول'}
                    </p>
                  </div>

                  {/* Message & Sender */}
                  <div className="mt-2 bg-white/5 rounded-xl p-2 border border-white/5">
                    <div className="flex items-center gap-1.5 text-[10px] text-teal-400 font-bold mb-1">
                      <MessageSquare size={10} />
                      <span>اقتراح من: {item.sender_name || 'مستكشف'}</span>
                    </div>
                    {item.message && (
                      <p className="text-[11px] text-slate-300 leading-relaxed font-medium break-words">
                        {item.message}
                      </p>
                    )}
                  </div>

                  {/* Date Badge */}
                  <div className="flex items-center gap-1 text-[9px] text-slate-500 mt-2">
                    <Calendar size={10} />
                    <span>{new Date(item.created_at).toLocaleDateString('ar-EG', { dateStyle: 'medium' })}</span>
                    {!item.is_read && (
                      <span className="mr-auto w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-[10px] text-slate-600 pt-3 border-t border-white/10 shrink-0 select-none">
        شارك حب الموسيقى • NL Music Inbox
      </div>
    </div>
  );
}
