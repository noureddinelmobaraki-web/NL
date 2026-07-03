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
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const submit = async () => {
    if (!text.trim()) return;
    if (!user) {
      openAuthModal();
      return;
    }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.rpc('submit_song_suggestion', { p_text: text.trim() });
    setBusy(false);
    if (!error) {
      setSent(true);
      setText('');
      setTimeout(() => {
        setSent(false);
        onClose();
      }, 1400);
    } else {
      console.error('[SuggestSongModal] submit failed', error);
      setErr('Failed to send suggestion. Try again later.');
    }
  };

  return createPortal(
    <div className="nl-suggest-overlay" onMouseDown={onClose}>
      <div className="nl-suggest" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <span><Lightbulb size={16} /> Suggest a Song</span>
          <button onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>
        <p className="nl-suggest__note">Leave the name of a song you'd like added, and it will reach the administration.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="Song Name / Artist..."
          rows={3}
        />
        {err && <p className="nl-suggest__err" role="alert">{err}</p>}
        <button className="nl-suggest__send" onClick={submit} disabled={busy || !text.trim()}>
          {sent ? <><Check size={15} /> Sent</> : <><Send size={15} /> Send</>}
        </button>
      </div>
    </div>,
    document.body,
  );
}
