import type { AuthTab } from './useAuthForm'

type Props = {
  tab: AuthTab
  otpSent: boolean
  busy: boolean
  onSendOtp: () => void
  onBack: () => void
  onReset: () => void
}

export default function AuthActions({
  tab,
  otpSent,
  busy,
  onSendOtp,
  onBack,
  onReset,
}: Props) {
  return (
    <div className="auth-actions">
      {!otpSent ? (
        <button type="button" className="auth-link" disabled={busy} onClick={onSendOtp}>
          Login with email code instead of password
        </button>
      ) : (
        <button type="button" className="auth-link" disabled={busy} onClick={onBack}>
          Go Back
        </button>
      )}
      {tab === 'signin' && !otpSent && (
        <button type="button" className="auth-link" disabled={busy} onClick={onReset}>
          Forgot Password?
        </button>
      )}
    </div>
  )
}
