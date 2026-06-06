import { useState } from 'react';
import emailjs from '@emailjs/browser';
import { styles } from './ContactForm.styles';
import { ContactMethods } from './ContactMethods';
import { ContactMessageForm } from './ContactMessageForm';
import { useClientRateLimit } from '../../hooks/useClientRateLimit';

type Mode = 'anonymous' | 'named';
type Status = 'idle' | 'sending' | 'success' | 'error';

const EMAILJS_SERVICE = import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '';
const EMAILJS_TEMPLATE = import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '';
const EMAILJS_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '';

export const ContactForm = () => {
  const [mode, setMode] = useState<Mode>('anonymous');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { isBlocked, remaining, recordSend } = useClientRateLimit();

  const handleSend = async () => {
    if (isBlocked) return;

    if (window.__nl_bot_detected) {
      setStatus('success');
      setMessage('');
      return;
    }

    if (!EMAILJS_SERVICE || !EMAILJS_TEMPLATE || !EMAILJS_KEY) {
      setErrorMsg('خطأ في إعداد النموذج، تواصل معي مباشرة');
      return;
    }

    if (message.trim().length < 3) {
      setErrorMsg('الرسالة قصيرة جداً');
      return;
    }

    if (remaining <= 0) return;

    setStatus('sending');
    setErrorMsg('');

    try {
      try {
        const rateLimitRes = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            sender_name: mode === 'anonymous' ? 'مجهول' : (senderName.trim() || 'مجهول'), 
            message: message.trim() 
          })
        });

        if (rateLimitRes.status === 429) {
          setErrorMsg('وصلت الحد اليومي، حاول غداً');
          setStatus('idle');
          return;
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.info('[ContactForm] /api/contact unreachable, falling back to emailjs-only:', err);
        }
      }

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

      recordSend();

      setStatus('success');
      setMessage('');
      setSenderName('');

      setTimeout(() => {
        setStatus('idle');
      }, 4000);
    } catch (err) {
      console.error('[ContactForm] emailjs.send failed:', err);
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
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }} aria-hidden="true">
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
      <form 
        className="manga-panel"
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        noValidate
        style={{
          ...styles.card,
          border: '4px solid var(--ink-color)',
          boxShadow: '8px 8px 0 var(--manga-shadow-color), 14px 14px 0 rgba(var(--bg-page-rgb), 0.15)'
        }}
      >
        {/* MacOS traffic light buttons */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }} aria-hidden="true">
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f56', border: '1px solid var(--border-subtle)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffbd2e', border: '1px solid var(--border-subtle)' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#27c93f', border: '1px solid var(--border-subtle)' }} />
        </div>

        <h2 style={styles.title}>صارحني</h2>

        {/* بطاقات التواصل المباشر */}
        <ContactMethods />

        <div className="manga-divider mb-6 opacity-30" />

        <ContactMessageForm
          mode={mode}
          setMode={setMode}
          senderName={senderName}
          setSenderName={setSenderName}
          message={message}
          setMessage={setMessage}
          status={status}
          errorMsg={errorMsg}
          isBlocked={isBlocked}
          remainingToday={remaining}
          styles={styles}
        />
      </form>
    </section>
  );
};
