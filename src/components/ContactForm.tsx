import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { Mail, MessageCircle, Send } from 'lucide-react';

type Mode = 'anonymous' | 'named';
type Status = 'idle' | 'sending' | 'success' | 'error';

const EMAILJS_SERVICE = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? 'service_715qfyk';
const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? 'template_rvp2u2k';
const EMAILJS_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '4jAqmjHZpNREKOgNR';

const CONTACT_METHODS = [
  {
    name: 'Gmail',
    value: 'noureddinelmobaraki@gmail.com',
    url: 'mailto:noureddinelmobaraki@gmail.com',
    icon: Mail,
    bg: 'linear-gradient(135deg, #EA4335 0%, #B31412 100%)',
  },
  {
    name: 'WhatsApp',
    value: '+212 612-806932',
    url: 'https://wa.me/212612806932',
    icon: MessageCircle,
    bg: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
  },
  {
    name: 'Telegram',
    value: '+212 612 806932',
    url: 'https://t.me/212612806932',
    icon: Send,
    bg: 'linear-gradient(135deg, #0088CC 0%, #005580 100%)',
  },
];

export const ContactForm = () => {
  const [mode, setMode] = useState<Mode>('anonymous');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [sendLog, setSendLog] = useState<string[]>([]);
  
  // Hydrate send log from localStorage
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const saved = localStorage.getItem('sarahni_send_log');
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        const now = new Date().getTime();
        const oneDay = 24 * 60 * 60 * 1000;
        
        // Filter out entries older than 24 hours
        const validEntries = parsed.filter(ts => {
          const time = new Date(ts).getTime();
          return now - time < oneDay;
        });
        
        setSendLog(validEntries);
        if (validEntries.length >= 3) {
          setIsBlocked(true);
        }
        
        // Update storage with cleaned entries
        localStorage.setItem('sarahni_send_log', JSON.stringify(validEntries));
      }
    } catch (e) {
      console.warn('Failed to parse or access send log', e);
    }
  }, []);

  const handleSend = async () => {
    if (isBlocked) return;
    
    if (message.trim().length < 3) {
      setErrorMsg('الرسالة قصيرة جداً');
      return;
    }

    if (sendLog.length >= 3) {
      setIsBlocked(true);
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    try {
      await emailjs.send(
        EMAILJS_SERVICE,
        EMAILJS_TEMPLATE,
        {
          sender_name: mode === 'anonymous' ? 'مجهول' : (senderName.trim() || 'مجهول'),
          message: message.trim(),
          time: new Date().toLocaleString('ar-MA', {
            timeZone: 'Africa/Casablanca'
          }),
        },
        EMAILJS_KEY
      );

      const newTimestamp = new Date().toISOString();
      const updatedLog = [...sendLog, newTimestamp];
      
      setSendLog(updatedLog);
      try {
        localStorage.setItem('sarahni_send_log', JSON.stringify(updatedLog));
      } catch (e) {
        console.warn('Failed to save send log', e);
      }
      
      setStatus('success');
      setMessage('');
      setSenderName('');
      
      setTimeout(() => {
        if (updatedLog.length >= 3) {
          setIsBlocked(true);
        } else {
          setStatus('idle');
        }
      }, 4000);
    } catch (err) {
      setStatus('error');
      setErrorMsg('فشل الإرسال، حاول مرة أخرى');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (isBlocked) {
    return (
      <section dir="rtl" style={styles.section}>
        <div className="manga-panel" style={{
          ...styles.card,
          border: '4px solid var(--ink-color)',
          boxShadow: '8px 8px 0 var(--manga-shadow-color), 14px 14px 0 rgba(var(--bg-page-rgb), 0.15)'
        }}>
          {/* MacOS traffic light buttons */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', border: '1px solid var(--border-subtle)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', border: '1px solid var(--border-subtle)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', border: '1px solid var(--border-subtle)' }} />
          </div>
          <p style={styles.blocked}>وصلت رسايلك، شكراً على صراحتك</p>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" style={styles.section}>
      <div className="manga-panel" style={{
        ...styles.card,
        border: '4px solid var(--ink-color)',
        boxShadow: '8px 8px 0 var(--manga-shadow-color), 14px 14px 0 rgba(var(--bg-page-rgb), 0.15)'
      }}>
        {/* MacOS traffic light buttons */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', border: '1px solid var(--border-subtle)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', border: '1px solid var(--border-subtle)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', border: '1px solid var(--border-subtle)' }} />
        </div>

        <h2 style={styles.title}>صارحني</h2>

        {/* بطاقات التواصل المباشر */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {CONTACT_METHODS.map((method) => (
            <a
              key={method.name}
              href={method.url}
              target="_blank"
              rel="noreferrer"
              className="manga-border group relative flex flex-col items-center justify-center p-4 border-[4px] border-[var(--ink-color)] overflow-hidden bg-[var(--paper-color)] transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-[6px_6px_0px_var(--manga-shadow-color)]"
            >
              <div className="absolute inset-0 z-0 opacity-20 transition-opacity group-hover:opacity-30"
                   style={{ background: method.bg }} />
              <div className="relative z-10 flex flex-col items-center gap-2">
                <div className="p-2 bg-[var(--ink-color)] text-[var(--text-inverse)] rounded-full">
                  <method.icon className="w-6 h-6" />
                </div>
                <span className="font-manga text-lg font-black text-[var(--ink-color)] uppercase">
                  {method.name}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] truncate max-w-full text-center">
                  {method.value}
                </span>
              </div>
            </a>
          ))}
        </div>
        <div className="manga-divider mb-6 opacity-30" />

        {status === 'success' ? (
          <div style={styles.successBox}>
            <div style={{
              fontSize: '3rem',
              fontFamily: 'var(--font-manga)',
              color: '#27c93f',
              textShadow: '3px 3px 0 var(--manga-shadow-color)',
              animation: 'scaleIn 400ms ease',
              letterSpacing: '0.05em',
            }}>✓ OK</div>
            <p style={styles.successText}>وصلت الرسالة لنورالدين</p>
            <p style={styles.successSub}>شكراً على صراحتك</p>
          </div>
        ) : (
          <>
            <div style={styles.toggleRow}>
              <button
                style={mode === 'anonymous' ? styles.toggleActive : styles.toggleInactive}
                onClick={() => setMode('anonymous')}
              >مجهول</button>
              <button
                style={mode === 'named' ? styles.toggleActive : styles.toggleInactive}
                onClick={() => setMode('named')}
              >باسمي</button>
            </div>

            {mode === 'named' && (
              <input
                type="text"
                placeholder="اكتب اسمك..."
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                maxLength={50}
                style={styles.input}
              />
            )}

            <div style={{ position: 'relative' }}>
              <textarea
                placeholder="قوليا"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={2000}
                style={styles.textarea}
                className="focus:!border-[var(--accent-indigo)] focus:!ring-2 focus:!ring-[var(--accent-indigo)]/30"
              />
              <span style={{
                ...styles.charCount,
                color: message.length > 1900 ? 'var(--accent-red)' : 'var(--text-muted)'
              }}>
                {message.length} / 2000
              </span>
            </div>

            {errorMsg && <p style={styles.error}>{errorMsg}</p>}

            <button
              onClick={handleSend}
              disabled={status === 'sending'}
              style={{
                ...styles.sendBtn,
                opacity: status === 'sending' ? 0.6 : 1,
                cursor: status === 'sending' ? 'not-allowed' : 'pointer'
              }}
              className="manga-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 hover:!shadow-[7px_7px_0_var(--manga-shadow-color)] active:translate-x-0.5 active:translate-y-0.5 active:!shadow-[3px_3px_0_var(--manga-shadow-color)]"
            >
              {status === 'sending' ? (
                <span style={styles.spinner} />
              ) : 'أرسل →'}
            </button>
          </>
        )}
      </div>
    </section>
  );
};

const styles: Record<string, React.CSSProperties> = {
  section: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    padding: '40px 16px',
  },
  card: {
    width: '100%',
    maxWidth: '600px',
    background: 'var(--bg-glass)',
    border: '3px solid var(--ink-color)',
    borderRadius: '16px',
    padding: '32px 28px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: 'var(--text-primary)',
    marginBottom: '8px',
    textAlign: 'center',
    fontFamily: 'var(--font-manga)',
    letterSpacing: '0.05em',
  },
  toggleRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '20px',
    justifyContent: 'center',
  },
  toggleActive: {
    padding: '6px 20px',
    borderRadius: '255px',
    border: '2px solid var(--ink-color)',
    background: 'var(--ink-color)',
    color: 'var(--text-inverse)',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 200ms',
    fontFamily: 'inherit',
  },
  toggleInactive: {
    padding: '6px 20px',
    borderRadius: '255px',
    border: '2px solid var(--border-subtle)',
    background: 'transparent',
    color: 'var(--text-muted)',
    fontWeight: '400',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 200ms',
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--bg-glass)',
    border: '3px solid var(--border-subtle)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    marginBottom: '12px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    textAlign: 'right',
  },
  textarea: {
    width: '100%',
    minHeight: '130px',
    padding: '14px 16px',
    paddingBottom: '28px',
    background: 'var(--bg-glass)',
    border: '3px solid var(--border-subtle)',
    boxShadow: 'inset 3px 3px 0 rgba(var(--bg-page-rgb), 0.3)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '0.95rem',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    textAlign: 'right',
    lineHeight: '1.6',
    transition: 'all 0.2s ease',
  },
  charCount: {
    position: 'absolute',
    bottom: '10px',
    left: '12px',
    fontSize: '0.75rem',
    transition: 'color 200ms',
    pointerEvents: 'none',
  },
  error: {
    color: 'var(--accent-red)',
    fontSize: '0.85rem',
    marginTop: '6px',
    marginBottom: '0',
    textAlign: 'center',
  },
  sendBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '16px',
    background: 'var(--paper-color)',
    color: 'var(--ink-color)',
    border: '3px solid var(--ink-color)',
    boxShadow: '5px 5px 0 var(--ink-color)',
    borderRadius: '4px',
    fontSize: '1.2rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 200ms',
    fontFamily: 'var(--font-manga)',
    letterSpacing: '0.1em',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '48px',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(var(--bg-page-rgb), 0.2)',
    borderTopColor: 'var(--ink-color)',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  successBox: {
    textAlign: 'center',
    padding: '20px 0',
    animation: 'fadeIn 400ms ease',
  },
  successText: {
    fontSize: '1.2rem',
    fontWeight: '700',
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  successSub: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  blocked: {
    textAlign: 'center',
    color: 'var(--text-muted)',
    padding: '20px 0',
    fontSize: '0.95rem',
  },
};
