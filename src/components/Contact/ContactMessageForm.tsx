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

  if (status === 'success') {
    return (
      <div style={currentStyles.successBox}>
        <div style={{
          fontSize: '3rem',
          fontFamily: 'var(--font-manga)',
          color: '#27c93f',
          textShadow: '3px 3px 0 var(--manga-shadow-color)',
          animation: 'scaleIn 400ms ease',
          letterSpacing: '0.05em',
        }}>✓ OK</div>
        <p style={currentStyles.successText}>وصلت الرسالة لنورالدين</p>
        <p style={currentStyles.successSub}>شكراً على صراحتك</p>
      </div>
    );
  }

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
    </>
  );
};
