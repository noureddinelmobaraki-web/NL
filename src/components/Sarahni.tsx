import React, { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';

type Mode = 'anonymous' | 'named';
type Status = 'idle' | 'sending' | 'success' | 'error';

const EMAILJS_SERVICE = 'service_715qfyk';
const EMAILJS_TEMPLATE = 'template_rvp2u2k';
const EMAILJS_KEY = '4jAqmjHZpNREKOgNR';

export const Sarahni = () => {
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
          border: '4px solid #000',
          boxShadow: '8px 8px 0 #000, 14px 14px 0 rgba(0,0,0,0.15)'
        }}>
          {/* MacOS traffic light buttons */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', border: '1px solid rgba(0,0,0,0.3)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', border: '1px solid rgba(0,0,0,0.3)' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', border: '1px solid rgba(0,0,0,0.3)' }} />
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
        border: '4px solid #000',
        boxShadow: '8px 8px 0 #000, 14px 14px 0 rgba(0,0,0,0.15)'
      }}>
        {/* MacOS traffic light buttons */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', border: '1px solid rgba(0,0,0,0.3)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', border: '1px solid rgba(0,0,0,0.3)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', border: '1px solid rgba(0,0,0,0.3)' }} />
        </div>

        <h2 style={styles.title}>صارحني</h2>

        {status === 'success' ? (
          <div style={styles.successBox}>
            <div style={{
              fontSize: '3rem',
              fontFamily: 'var(--font-manga)',
              color: '#27c93f',
              textShadow: '3px 3px 0 #000',
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
                className="focus:!border-white/50 focus:!ring-2 focus:!ring-purple-500/30"
              />
              <span style={{
                ...styles.charCount,
                color: message.length > 1900 ? '#ff4444' : 'rgba(255,255,255,0.3)'
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
              className="manga-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 hover:!shadow-[7px_7px_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:!shadow-[3px_3px_0_#000]"
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
    maxWidth: '500px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px',
    padding: '32px 28px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: 'bold',
    color: '#ffffff',
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
    border: '2px solid #000',
    background: '#000',
    color: '#ffffff',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 200ms',
    fontFamily: 'inherit',
  },
  toggleInactive: {
    padding: '6px 20px',
    borderRadius: '255px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '400',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 200ms',
    fontFamily: 'inherit',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    border: '3px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#ffffff',
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
    background: 'rgba(255,255,255,0.06)',
    border: '3px solid rgba(255,255,255,0.2)',
    boxShadow: 'inset 3px 3px 0 rgba(0,0,0,0.3)',
    borderRadius: '10px',
    color: '#ffffff',
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
    color: '#ff5555',
    fontSize: '0.85rem',
    marginTop: '6px',
    marginBottom: '0',
    textAlign: 'center',
  },
  sendBtn: {
    width: '100%',
    padding: '14px',
    marginTop: '16px',
    background: '#ffffff',
    color: '#000000',
    border: '3px solid #000',
    boxShadow: '5px 5px 0 #000',
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
    border: '2px solid rgba(0,0,0,0.2)',
    borderTopColor: '#000',
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
    color: '#ffffff',
    marginBottom: '6px',
  },
  successSub: {
    fontSize: '0.85rem',
    color: 'rgba(255,255,255,0.4)',
  },
  blocked: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    padding: '20px 0',
    fontSize: '0.95rem',
  },
};
