import { useState, useEffect } from 'react';
import emailjs from '@emailjs/browser';
import { styles } from './ContactForm.styles';
import { ContactMethods } from './ContactMethods';
import { ContactMessageForm } from './ContactMessageForm';

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
  const [isBlocked, setIsBlocked] = useState(false);
  const [sendLog, setSendLog] = useState<string[]>([]);

  // Hydrate send log from localStorage
  useEffect(() => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const saved = localStorage.getItem('nl-send-log-v1');
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
        localStorage.setItem('nl-send-log-v1', JSON.stringify(validEntries));
      }
    } catch (e) {
      console.warn('Failed to parse or access send log', e);
    }
  }, []);

  const handleSend = async () => {
    if (isBlocked) return;

    if (!EMAILJS_SERVICE || !EMAILJS_TEMPLATE || !EMAILJS_KEY) {
      setErrorMsg('خطأ في إعداد النموذج، تواصل معي مباشرة');
      return;
    }

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
      // Server-side rate limit check
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
        localStorage.setItem('nl-send-log-v1', JSON.stringify(updatedLog));
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
          remainingToday={3 - sendLog.length}
          onSend={handleSend}
          styles={styles}
        />
      </div>
    </section>
  );
};
