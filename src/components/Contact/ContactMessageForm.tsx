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
  onSend: () => void;
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
  onSend,
  styles: passedStyles,
}: ContactMessageFormProps) => {
  const currentStyles = passedStyles || styles;

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
          style={mode === 'anonymous' ? currentStyles.toggleActive : currentStyles.toggleInactive}
          onClick={() => setMode('anonymous')}
          disabled={isBlocked}
        >
          مجهول
        </button>
        <button
          style={mode === 'named' ? currentStyles.toggleActive : currentStyles.toggleInactive}
          onClick={() => setMode('named')}
          disabled={isBlocked}
        >
          باسمي
        </button>
      </div>

      {mode === 'named' && (
        <input
          type="text"
          placeholder="اكتب اسمك..."
          value={senderName}
          onChange={e => setSenderName(e.target.value)}
          maxLength={50}
          style={currentStyles.input}
          disabled={isBlocked}
        />
      )}

      <div style={{ position: 'relative' }}>
        <textarea
          placeholder="قوليا"
          value={message}
          onChange={e => setMessage(e.target.value)}
          maxLength={2000}
          style={currentStyles.textarea}
          className="focus:!border-[var(--accent-indigo)] focus:!ring-2 focus:!ring-[var(--accent-indigo)]/30"
          disabled={isBlocked}
        />
        <span style={{
          ...currentStyles.charCount,
          color: message.length > 1900 ? 'var(--accent-red)' : 'var(--text-muted)'
        }}>
          {message.length} / 2000
        </span>
      </div>

      {errorMsg && <p style={currentStyles.error}>{errorMsg}</p>}

      <button
        onClick={onSend}
        disabled={status === 'sending' || isBlocked}
        style={{
          ...currentStyles.sendBtn,
          opacity: (status === 'sending' || isBlocked) ? 0.6 : 1,
          cursor: (status === 'sending' || isBlocked) ? 'not-allowed' : 'pointer'
        }}
        className="manga-card-hover hover:-translate-x-0.5 hover:-translate-y-0.5 hover:!shadow-[7px_7px_0_var(--manga-shadow-color)] active:translate-x-0.5 active:translate-y-0.5 active:!shadow-[3px_3px_0_var(--manga-shadow-color)]"
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
          {3 - (3 - remainingToday < 0 ? 0 : 3 - remainingToday)} رسالة متبقية اليوم
        </p>
      )}
    </>
  );
};
