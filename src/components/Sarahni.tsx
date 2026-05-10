import { useState, useRef } from 'react';
import emailjs from '@emailjs/browser';

type Mode = 'anonymous' | 'named';
type Status = 'idle' | 'sending' | 'success' | 'error';

export const Sarahni = () => {
  const [mode, setMode] = useState<Mode>('anonymous');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const sendCount = useRef(0);
  const sessionBlocked = useRef(false);

  const handleSend = async () => {
    if (sessionBlocked.current) return;
    if (message.trim().length < 3) {
      setErrorMsg('الرسالة قصيرة جداً');
      return;
    }
    if (sendCount.current >= 3) {
      sessionBlocked.current = true;
      return;
    }

    setStatus('sending');
    setErrorMsg('');

    const templateParams = {
      sender_name: mode === 'anonymous'
        ? 'مجهول'
        : (senderName.trim() || 'مجهول'),
      message: message.trim(),
      time: new Date().toLocaleString('ar-MA', {
        timeZone: 'Africa/Casablanca'
      }),
    };

    try {
      await emailjs.send(
        'service_715qfyk',
        'template_rvp2u2k',
        templateParams,
        '4jAqmjHZpNREKOgNR'
      );
      sendCount.current += 1;
      setStatus('success');
      setMessage('');
      setSenderName('');
      setTimeout(() => {
        if (sendCount.current >= 3) {
          sessionBlocked.current = true;
        } else {
          setStatus('idle');
        }
      }, 4000);
    } catch {
      setStatus('error');
      setErrorMsg('فشل الإرسال، حاول مرة أخرى');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (sessionBlocked.current) {
    return (
      <section dir="rtl" style={styles.section}>
        <div style={styles.card}>
          <p style={styles.blocked}>وصلت رسايلك، شكراً على صراحتك</p>
        </div>
      </section>
    );
  }

  return (
    <section dir="rtl" style={styles.section}>
      <div style={styles.card}>
        <h2 style={styles.title}>صارحني</h2>

        {status === 'success' ? (
          <div style={styles.successBox}>
            <div style={styles.checkmark}>✓</div>
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
                opacity: status === 'sending' ? 0.7 : 1
              }}
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
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    marginBottom: '24px',
  },
  toggleRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px',
    justifyContent: 'center',
  },
  toggleActive: {
    padding: '8px 24px',
    borderRadius: '20px',
    border: 'none',
    background: '#ffffff',
    color: '#000000',
    fontWeight: '700',
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 200ms',
    fontFamily: 'inherit',
  },
  toggleInactive: {
    padding: '8px 24px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
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
    border: '1px solid rgba(255,255,255,0.15)',
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
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '10px',
    color: '#ffffff',
    fontSize: '0.95rem',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    textAlign: 'right',
    lineHeight: '1.6',
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
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'opacity 200ms',
    fontFamily: 'inherit',
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
  checkmark: {
    fontSize: '3rem',
    color: '#4ade80',
    marginBottom: '12px',
    animation: 'scaleIn 400ms ease',
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
