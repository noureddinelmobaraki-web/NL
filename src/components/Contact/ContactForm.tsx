import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY ?? '';

declare global {
  interface Window {
    grecaptcha?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => number;
      reset: (id?: number) => void;
      getResponse: (id?: number) => string;
    };
    __nl_recaptcha_loading?: boolean;
  }
}

export const ContactForm = () => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('anonymous');
  const [senderName, setSenderName] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const { isBlocked, remaining, recordSend } = useClientRateLimit();

  const captchaRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const captchaEnabled = RECAPTCHA_SITE_KEY.length > 0;

  // Load + render reCAPTCHA v2 widget (only when a site key is configured)
  useEffect(() => {
    if (!captchaEnabled || isBlocked) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !captchaRef.current || widgetIdRef.current !== null) return;
      if (!window.grecaptcha || typeof window.grecaptcha.render !== 'function') return;
      widgetIdRef.current = window.grecaptcha.render(captchaRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
        size: 'normal',
      });
    };

    if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
      renderWidget();
    } else {
      if (!window.__nl_recaptcha_loading) {
        window.__nl_recaptcha_loading = true;
        const script = document.createElement('script');
        script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
      const poll = window.setInterval(() => {
        if (window.grecaptcha && typeof window.grecaptcha.render === 'function') {
          window.clearInterval(poll);
          renderWidget();
        }
      }, 200);
      return () => {
        cancelled = true;
        window.clearInterval(poll);
      };
    }
    return () => { cancelled = true; };
  }, [captchaEnabled, isBlocked]);

  const handleSend = async () => {
    if (isBlocked) return;

    if (window.__nl_bot_detected) {
      setStatus('success');
      setMessage('');
      return;
    }

    if (!EMAILJS_SERVICE || !EMAILJS_TEMPLATE || !EMAILJS_KEY) {
      setErrorMsg(t('contact.configError'));
      return;
    }

    if (message.trim().length < 3) {
      setErrorMsg(t('contact.tooShort'));
      return;
    }

    if (remaining <= 0) return;

    let captchaToken = '';
    if (captchaEnabled) {
      captchaToken = window.grecaptcha?.getResponse(widgetIdRef.current ?? undefined) ?? '';
      if (!captchaToken) {
        setErrorMsg(t('contact.verifyHuman'));
        return;
      }
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
          'g-recaptcha-response': captchaToken,
        },
        EMAILJS_KEY
      );

      if (captchaEnabled) window.grecaptcha?.reset(widgetIdRef.current ?? undefined);
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
      setErrorMsg(t('contact.sendFailed'));
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
          <p style={styles.blocked}>{t('contact.blocked')}</p>
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

        <h2 style={styles.title}>{t('contact.title')}</h2>

        {/* بطاقات التواصل المباشر */}
        <ContactMethods />

        <div className="manga-divider mb-6 opacity-30" />

        {captchaEnabled && (
          <div
            ref={captchaRef}
            className="nl-recaptcha"
            style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}
          />
        )}

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
