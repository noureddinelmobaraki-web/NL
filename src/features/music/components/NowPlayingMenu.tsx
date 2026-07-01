import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Check, Share2, Send, Music, Search, Loader2, X 
} from 'lucide-react';
import { useMusicStore } from '../store/musicStore';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '../../../config/supabase';
import { invalidateProfile } from '../../accounts/profileCache';
import { shareSong } from '../data/shareSong';
import type { Track } from '../engine/types';

interface NowPlayingMenuProps {
  track: Track;
  onClose: () => void;
}

export function NowPlayingMenu({ track, onClose }: NowPlayingMenuProps) {
  const { user } = useAuth();
  const playlists = useMusicStore((s) => s.playlists);
  const actions = useMusicStore((s) => s.actions);

  const [activeTab, setActiveTab] = useState<'main' | 'playlists' | 'send'>('main');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Playlists State
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);

  // Send to User State
  const [userSearch, setUserSearch] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [sendMsg, setSendMsg] = useState('');
  const [sending, setSending] = useState(false);

  // 1. Set as Profile Song
  const handleSetProfileSong = async () => {
    if (!user) {
      showError('يجب تسجيل الدخول أولاً تعيين أغنية للملف الشخصي.');
      return;
    }
    try {
      const { error } = await supabase.rpc('set_theme_song', {
        p_song_id: track.id,
        p_start: 0,
        p_end: 0,
      });
      if (error) throw error;
      invalidateProfile(user.id);
      showSuccess('تم تعيين الأغنية كأغنية لملفك الشخصي بنجاح!');
    } catch (err) {
      console.error('[NowPlayingMenu] set profile song failed', err);
      showError('عذراً، فشل تعيين أغنية الملف الشخصي.');
    }
  };

  // 2. Share Song
  const handleShareSong = async () => {
    const res = await shareSong(track);
    if (res === 'copied' || res === 'shared') {
      showSuccess('تم نسخ رابط الأغنية إلى الحافظة!');
    } else {
      showError('عذراً، تعذر نسخ الرابط.');
    }
  };

  // 3. Add to existing playlist
  const handleAddToPlaylist = (playlistId: string) => {
    actions.addToPlaylist(playlistId, track.id);
    showSuccess('تمت إضافة الأغنية إلى قائمة التشغيل بنجاح!');
  };

  // 4. Create new playlist and add track
  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const plId = actions.createPlaylist(newPlaylistName.trim());
    actions.addToPlaylist(plId, track.id);
    setNewPlaylistName('');
    setIsCreatingPlaylist(false);
    showSuccess('تم إنشاء قائمة التشغيل وإضافة الأغنية!');
  };

  // 5. Fetch users for search
  useEffect(() => {
    if (activeTab !== 'send') return;
    let cancelled = false;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const { data, error } = await supabase.rpc('list_profiles', {
          p_search: userSearch.trim() || null,
          p_limit: 20,
          p_offset: 0
        });
        if (!cancelled && !error) {
          // Exclude self if user is logged in
          const filtered = (data ?? []).filter((u: any) => u.id !== user?.id);
          setUsers(filtered);
        }
      } catch (err) {
        console.warn('Error listing profiles', err);
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };

    const t = setTimeout(fetchUsers, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [userSearch, activeTab, user]);

  // 6. Send song to selected user
  const handleSendSong = async () => {
    if (!selectedUser) return;
    setSending(true);
    try {
      // Try RPC first
      const { error } = await supabase.rpc('send_song', {
        p_receiver_id: selectedUser.id,
        p_song_id: track.id,
        p_message: sendMsg.trim() || 'استمع إلى هذه الأغنية الرائعة!'
      });

      if (error) {
        // Fallback to direct insertion if RPC doesn't work or isn't perfect
        const { error: insertErr } = await supabase.from('song_shares').insert({
          receiver_id: selectedUser.id,
          song_id: track.id,
          message: sendMsg.trim() || 'استمع إلى هذه الأغنية الرائعة!'
        });
        if (insertErr) throw insertErr;
      }

      showSuccess(`تم إرسال الأغنية بنجاح إلى ${selectedUser.display_name || 'المستخدم'}!`);
      setSelectedUser(null);
      setSendMsg('');
    } catch (err) {
      console.error('[NowPlayingMenu] send song failed', err);
      showError('عذراً، فشل إرسال الأغنية.');
    } finally {
      setSending(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
      onClose();
    }, 2000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setTimeout(() => {
      setErrorMsg(null);
    }, 3000);
  };

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-slate-900/95 backdrop-blur-xl text-white p-6 justify-between select-none" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
        <h3 className="text-lg font-bold">التحكم بالأغنية</h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow my-4 overflow-y-auto scrollbar-thin">
        <AnimatePresence mode="wait">
          {successMsg && (
            <motion.div
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center p-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
                <Check size={36} />
              </div>
              <p className="text-emerald-400 font-bold text-lg">{successMsg}</p>
            </motion.div>
          )}

          {errorMsg && (
            <motion.div
              key="error"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center p-4"
            >
              <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500 flex items-center justify-center text-rose-400 mb-4">
                <X size={36} />
              </div>
              <p className="text-rose-400 font-bold text-lg">{errorMsg}</p>
              <button 
                onClick={() => setErrorMsg(null)}
                className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-semibold"
              >
                رجوع
              </button>
            </motion.div>
          )}

          {!successMsg && !errorMsg && activeTab === 'main' && (
            <motion.div
              key="main-options"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {/* Song details */}
              <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF7A1A] to-[#00E676] overflow-hidden shrink-0 flex items-center justify-center">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music size={24} className="text-white" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-white truncate text-sm">{track.title}</h4>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{track.artist}</p>
                </div>
              </div>

              {/* Actions Grid */}
              <button
                onClick={() => setActiveTab('playlists')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-right transition-all group"
              >
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Plus size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-sm">إضافة إلى قائمة التشغيل</h5>
                  <p className="text-xs text-slate-400 mt-0.5">أضف هذه الأغنية لإحدى قوائمك الخاصة</p>
                </div>
              </button>

              <button
                onClick={handleSetProfileSong}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-right transition-all group"
              >
                <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Music size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-sm">تعيين كأغنية الملف الشخصي</h5>
                  <p className="text-xs text-slate-400 mt-0.5">ستعمل الأغنية تلقائياً لزوار بروفايلك</p>
                </div>
              </button>

              <button
                onClick={handleShareSong}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-right transition-all group"
              >
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Share2 size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-sm">مشاركة الأغنية</h5>
                  <p className="text-xs text-slate-400 mt-0.5">احصل على رابط مباشر مع معاينة اجتماعية</p>
                </div>
              </button>

              <button
                onClick={() => setActiveTab('send')}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-right transition-all group"
              >
                <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl group-hover:scale-110 transition-transform">
                  <Send size={18} />
                </div>
                <div>
                  <h5 className="font-bold text-sm">إرسال إلى مستخدم</h5>
                  <p className="text-xs text-slate-400 mt-0.5">اقترح الأغنية وأرسلها لصديق مسجل بالموقع</p>
                </div>
              </button>
            </motion.div>
          )}

          {!successMsg && !errorMsg && activeTab === 'playlists' && (
            <motion.div
              key="playlist-options"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              className="space-y-4"
            >
              <div className="flex justify-between items-center">
                <h4 className="font-bold text-sm text-indigo-400">اختر قائمة تشغيل</h4>
                <button 
                  onClick={() => setActiveTab('main')} 
                  className="text-xs text-slate-400 hover:text-white"
                >
                  رجوع للمثبتات
                </button>
              </div>

              {/* Create New Playlist Form */}
              {isCreatingPlaylist ? (
                <form onSubmit={handleCreatePlaylist} className="flex gap-2 bg-white/5 p-2 rounded-xl border border-white/10">
                  <input
                    autoFocus
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="اسم القائمة الجديدة..."
                    maxLength={32}
                    className="flex-grow bg-transparent text-sm px-2 outline-none border-none placeholder-slate-500 text-white"
                  />
                  <button type="submit" className="px-3 py-1 bg-indigo-500 hover:bg-indigo-600 rounded-lg text-xs font-bold transition-colors">
                    إنشاء
                  </button>
                  <button type="button" onClick={() => setIsCreatingPlaylist(false)} className="px-2 text-slate-400 hover:text-white text-xs">
                    إلغاء
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingPlaylist(true)}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-white/20 text-slate-400 hover:text-white hover:border-white/40 text-sm transition-all"
                >
                  <Plus size={16} /> إنشاء قائمة تشغيل جديدة
                </button>
              )}

              {/* Playlists List */}
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {playlists.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-4">ليس لديك قوائم تشغيل مخصصة حالياً.</p>
                ) : (
                  playlists.map((pl) => {
                    const alreadyHas = pl.trackIds.includes(track.id);
                    return (
                      <button
                        key={pl.id}
                        disabled={alreadyHas}
                        onClick={() => handleAddToPlaylist(pl.id)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border text-right text-sm transition-all ${
                          alreadyHas 
                            ? 'bg-white/5 border-white/5 text-slate-500 cursor-not-allowed' 
                            : 'bg-white/5 border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 text-white'
                        }`}
                      >
                        <span className="font-semibold">{pl.name}</span>
                        {alreadyHas ? (
                          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-slate-400">مضافة بالفعل</span>
                        ) : (
                          <span className="text-xs text-indigo-400 font-bold">إضافة +</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}

          {!successMsg && !errorMsg && activeTab === 'send' && (
            <motion.div
              key="send-options"
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              className="space-y-4 h-full flex flex-col"
            >
              <div className="flex justify-between items-center shrink-0">
                <h4 className="font-bold text-sm text-sky-400">إرسال واقتراح الأغنية</h4>
                <button 
                  onClick={() => {
                    setActiveTab('main');
                    setSelectedUser(null);
                  }} 
                  className="text-xs text-slate-400 hover:text-white"
                >
                  رجوع للمثبتات
                </button>
              </div>

              {!selectedUser ? (
                <>
                  {/* Search box */}
                  <label className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10 shrink-0">
                    <Search size={16} className="text-slate-400" />
                    <input
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="ابحث بالاسم أو البريد..."
                      className="bg-transparent border-none outline-none text-sm placeholder-slate-500 w-full text-white"
                    />
                  </label>

                  {/* Users Directory */}
                  <div className="flex-grow space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                    {loadingUsers ? (
                      <div className="flex items-center justify-center py-6 text-slate-500 text-xs gap-2">
                        <Loader2 size={16} className="animate-spin" /> جارٍ البحث عن مستخدمين...
                      </div>
                    ) : users.length === 0 ? (
                      <p className="text-center text-xs text-slate-500 py-6">
                        {userSearch ? 'لا توجد حسابات مطابقة.' : 'اكتب للبحث عن مستخدمين مسجلين...'}
                      </p>
                    ) : (
                      users.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUser(u)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 text-right transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-white/10 flex items-center justify-center">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-slate-400 font-bold">
                                {(u.display_name || 'NL').slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{u.display_name || 'مستخدم'}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{u.role === 'admin' ? 'إداري' : 'عضو'}</div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-4 shrink-0"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">المستقبل المحدد:</span>
                    <button 
                      onClick={() => setSelectedUser(null)}
                      className="text-[10px] text-rose-400 hover:text-rose-300"
                    >
                      تغيير
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-white/10">
                      {selectedUser.avatar_url ? (
                        <img src={selectedUser.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-400 font-bold">
                          {(selectedUser.display_name || 'NL').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="font-bold text-sm text-white">{selectedUser.display_name}</div>
                  </div>

                  <label className="block space-y-1.5">
                    <span className="text-xs text-slate-400">رسالة اختيارية:</span>
                    <textarea
                      rows={2}
                      maxLength={140}
                      value={sendMsg}
                      onChange={(e) => setSendMsg(e.target.value)}
                      placeholder="لماذا تقترح هذه الأغنية؟"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-xs text-white outline-none focus:border-sky-500 placeholder-slate-600 resize-none"
                    />
                  </label>

                  <button
                    onClick={handleSendSong}
                    disabled={sending}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer"
                  >
                    {sending ? (
                      <>
                        <Loader2 size={16} className="animate-spin" /> جارٍ الإرسال...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> إرسال الآن
                      </>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding */}
      <div className="text-center text-[10px] text-slate-500 pt-3 border-t border-white/10 shrink-0 select-none">
        تحكّم بموسيقاك وعالمك الخاص من • NL Music
      </div>
    </div>
  );
}
