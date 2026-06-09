import { useState, useEffect } from 'react';
import { styles } from './ContactForm.styles';

export interface ContactMessageFormProps {
  mode: 'anonymous' | 'named';
  setMode: (m: 'anonymous' | 'named') => void;
  senderName: string;
  setSenderName: (s: string) => void;
  message: string;
  setMessage: (s: string) => void;
  status: 'idle' | 'sending' | 'success' | 'error';
  errorMsg: string;
  isBlocked: boolean;
  remainingToday: number;
  styles: typeof styles;
}

export const ContactMessageForm = ({
  mode,
  setMode,
  senderName,
  setSenderName,
  message,
  setMessage,
  status,
  errorMsg,
  isBlocked,
  remainingToday,
  styles: passedStyles,
}: ContactMessageFormProps) => {
  const currentStyles = passedStyles || styles;

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setTimeout(() => e.target.scrollIntoView({ behavior: 'smooth', block: 'center' }), 300);
  };

  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (status === 'success' || status === 'error') {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 3500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [status]);

  return (
    <>
      <div style={currentStyles.toggleRow}>
        <button
          type="button"
          style={mode === 'anonymous' ? currentStyles.toggleActive : currentStyles.toggleInactive}
          onClick={() => setMode('anonymous')}
          disabled={isBlocked}
          aria-pressed={mode === 'anonymous'}
          aria-label="إرسال كمجهول"
        >
          مجهول
        </button>
        <button
          type="button"
          style={mode === 'named' ? currentStyles.toggleActive : currentStyles.toggleInactive}
          onClick={() => setMode('named')}
          disabled={isBlocked}
          aria-pressed={mode === 'named'}
          aria-label="إرسال باسمي"
        >
          باسمي
        </button>
      </div>

      {mode === 'named' && (
        <>
          <label htmlFor="sender-name" className="sr-only">اسمك</label>
          <input
            id="sender-name"
            type="text"
            placeholder="اكتب اسمك..."
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            maxLength={50}
            style={{ ...currentStyles.input, fontSize: '16px' }}
            disabled={isBlocked}
            enterKeyHint="next"
            inputMode="text"
            autoComplete="name"
            onFocus={handleInputFocus}
          />
        </>
      )}

      <div style={{ position: 'relative' }}>
        <label htmlFor="message-body" className="sr-only">رسالتك</label>
        <textarea
          id="message-body"
          placeholder="قوليا"
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={2000}
          style={{ ...currentStyles.textarea, fontSize: '16px' }}
          className="focus:!border-[var(--accent-indigo)] focus:!ring-2 focus:!ring-[var(--accent-indigo)]/30"
          disabled={isBlocked}
          enterKeyHint="done"
          inputMode="text"
          autoComplete="off"
          onFocus={handleInputFocus}
        />
        <span style={{
          ...currentStyles.charCount,
          color: message.length > 1900 ? 'var(--accent-red)' : 'var(--text-muted)'
        }}>
          {message.length} / 2000
        </span>
      </div>

      {errorMsg && <p style={currentStyles.error}>{errorMsg}</p>}

      {/* Honeypot — invisible to humans, bots will fill it */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '-9999px',
          width: '1px',
          height: '1px',
          opacity: 0,
          pointerEvents: 'none'
        }}
        onChange={(e) => {
          // If changed = bot, set flag
          if (e.target.value) {
            window.__nl_bot_detected = true;
          }
        }}
      />

      <button
        type="submit"
        disabled={status === 'sending' || isBlocked}
        aria-label={status === 'sending' ? 'جاري الإرسال...' : 'إرسال الرسالة'}
        aria-busy={status === 'sending'}
        style={{
          ...currentStyles.sendBtn,
          opacity: (status === 'sending' || isBlocked) ? 0.6 : 1,
          cursor: (status === 'sending' || isBlocked) ? 'not-allowed' : 'pointer'
        }}
        className="w-full !h-[52px] manga-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 hover:!shadow-[7px_7px_0_var(--manga-shadow-color)] active:translate-x-0.5 active:translate-y-0.5 active:!shadow-[3px_3px_0_var(--manga-shadow-color)]"
      >
        {status === 'sending' ? (
          <span style={currentStyles.spinner} />
        ) : 'أرسل →'}
      </button>

      {!isBlocked && (
        <p style={{ 
          textAlign: 'center', 
          color: 'var(--text-muted)', 
          fontSize: '0.72rem',
          marginTop: '8px'
        }}>
          {Math.max(0, remainingToday)} رسالة متبقية اليوم
        </p>
      )}

      {/* Modern Toast Notification */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: status === 'success' ? '#27c93f' : '#ff5f56',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: '24px',
          boxShadow: '0 4px 14px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.05)',
          fontFamily: 'var(--font-manga), sans-serif',
          fontWeight: 'bold',
          fontSize: '1rem',
          zIndex: 10000,
          animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }} role="alert" aria-live="assertive">
          {status === 'success' ? (
            <>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              تم الإرسال بنجاح!
            </>
          ) : (
            <>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              فشل الإرسال
            </>
          )}
        </div>
      )}
    </>
  );
};
