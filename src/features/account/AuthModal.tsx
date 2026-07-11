import { createPortal } from 'react-dom'
import { useAuthForm } from './useAuthForm'
import AuthTabs from './AuthTabs'
import AuthOAuthButtons from './AuthOAuthButtons'
import AuthPasswordForm from './AuthPasswordForm'
import AuthOtpForm from './AuthOtpForm'
import AuthActions from './AuthActions'
import AuthMessages from './AuthMessages'
import '../../styles/components/auth-modal.css'

export default function AuthModal() {
  const {
    closeAuthModal,
    tab,
    selectTab,
    email,
    setEmail,
    password,
    setPassword,
    otp,
    setOtpDigits,
    otpSent,
    busy,
    error,
    notice,
    handlePasswordSubmit,
    handleSendOtp,
    handleVerifyOtp,
    handleOAuth,
    handleReset,
    backToPassword,
  } = useAuthForm()

  return createPortal(
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Account Window"
      onMouseDown={closeAuthModal}
    >
      <div className="auth-modal" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="auth-close"
          aria-label="Close"
          onClick={closeAuthModal}
        >
          ×
        </button>

        <h2 className="auth-title">{tab === 'signin' ? 'Login' : 'Create Account'}</h2>

        <AuthTabs tab={tab} onSelect={selectTab} />

        <AuthOAuthButtons busy={busy} onOAuth={handleOAuth} />

        <div className="auth-divider">
          <span>Or</span>
        </div>

        {!otpSent ? (
          <AuthPasswordForm
            tab={tab}
            email={email}
            password={password}
            busy={busy}
            onEmail={setEmail}
            onPassword={setPassword}
            onSubmit={handlePasswordSubmit}
          />
        ) : (
          <AuthOtpForm
            otp={otp}
            busy={busy}
            onOtp={setOtpDigits}
            onSubmit={handleVerifyOtp}
          />
        )}

        <AuthActions
          tab={tab}
          otpSent={otpSent}
          busy={busy}
          onSendOtp={handleSendOtp}
          onBack={backToPassword}
          onReset={handleReset}
        />

        <AuthMessages error={error} notice={notice} />
      </div>
    </div>,
    document.body,
  )
}
