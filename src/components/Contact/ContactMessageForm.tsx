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
}: ContactMessageFormProps) => {

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
    <div className="nl-contact-message">
      <div className="nl-contact-mode">
        <button
          type="button"
          className={`nl-contact-mode__button ${mode === 'anonymous' ? 'is-active' : ''}`}
          onClick={() => setMode('anonymous')}
          disabled={isBlocked}
          aria-pressed={mode === 'anonymous'}
          aria-label="Send Anonymously"
        >
          Anonymous
        </button>
        <button
          type="button"
          className={`nl-contact-mode__button ${mode === 'named' ? 'is-active' : ''}`}
          onClick={() => setMode('named')}
          disabled={isBlocked}
          aria-pressed={mode === 'named'}
          aria-label="Send as Myself"
        >
          By Me
        </button>
      </div>

      {mode === 'named' && (
        <>
          <label htmlFor="sender-name" className="sr-only">Your Name</label>
          <input
            id="sender-name"
            type="text"
            className="nl-contact-input"
            placeholder="Type your name..."
            value={senderName}
            onChange={e => setSenderName(e.target.value)}
            maxLength={50}
            disabled={isBlocked}
            enterKeyHint="next"
            inputMode="text"
            autoComplete="name"
            onFocus={handleInputFocus}
          />
        </>
      )}

      <div className="nl-contact-field">
        <label htmlFor="message-body" className="sr-only">Your Message</label>
        <textarea
          id="message-body"
          className="nl-contact-textarea"
          placeholder="Tell me"
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={2000}
          disabled={isBlocked}
          enterKeyHint="done"
          inputMode="text"
          autoComplete="off"
          onFocus={handleInputFocus}
        />
        <span className={`nl-contact-counter ${message.length > 1900 ? 'is-danger' : ''}`}>
          {message.length} / 2000
        </span>
      </div>

      {errorMsg && <p className="nl-contact-error">{errorMsg}</p>}

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
        className="nl-contact-submit"
        disabled={status === 'sending' || isBlocked}
        aria-label={status === 'sending' ? 'Sending...' : 'Send Message'}
        aria-busy={status === 'sending'}
      >
        {status === 'sending' ? (
          <span className="nl-contact-spinner" />
        ) : 'Send →'}
      </button>

      {!isBlocked && (
        <p className="nl-contact-remaining">
          {Math.max(0, remainingToday)} messages remaining today
        </p>
      )}

      {/* Modern Toast Notification */}
      {showToast && (
        <div className={`nl-contact-toast ${status === 'success' ? 'is-success' : 'is-error'}`} role="alert" aria-live="assertive">
          {status === 'success' ? (
            <>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Sent successfully!
            </>
          ) : (
            <>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Send failed
            </>
          )}
        </div>
      )}
    </div>
  );
};
