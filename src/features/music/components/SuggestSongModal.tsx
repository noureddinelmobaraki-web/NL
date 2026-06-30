import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X, Send, Check } from 'lucide-react';
import { supabase } from '../../../config/supabase';
import { useAuth } from '../../../context/AuthContext';

export function SuggestSongModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, openAuthModal } = useAuth();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!text.trim()) return;
    if (!user) {
      openAuthModal();
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc('submit_song_suggestion', { p_text: text.trim() });
    setBusy(false);
    if (!error) {
      setSent(true);
      setText('');
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1400);
    }
  };

  return createPortal(
    <div className="nl-suggest-overlay" onMouseDown={onClose}>
      <div className="nl-suggest" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <span><Lightbulb size={16} /> اقتراح أغنية</span>
          <button onClick={onClose} aria-label="إغلاق"><X size={16} /></button>
        </header>
        <p className="nl-suggest__note">اترك اسم أغنية تودّ إضافتها إلى الموقع وستصل إلى الإدارة.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="اسم الأغنية / الفنان..."
          rows={3}
        />
        <button className="nl-suggest__send" onClick={submit} disabled={busy || !text.trim()}>
          {sent ? <><Check size={15} /> تم الإرسال</> : <><Send size={15} /> إرسال</>}
        </button>
      </div>
    </div>,
    document.body,
  );
}
