import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { useAuth, type OAuthProvider } from '../../context/AuthContext'
import '../../styles/components/auth-modal.css'

type Tab = 'signin' | 'signup'

export default function AuthModal() {
  const {
    closeAuthModal,
    signInWithPassword,
    signUpWithPassword,
    sendEmailOtp,
    verifyEmailOtp,
    signInWithOAuth,
    resetPassword,
  } = useAuth()

  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // إغلاق بمفتاح Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeAuthModal])

  const clearMsg = useCallback(() => {
    setError('')
    setNotice('')
  }, [])

  const handlePasswordSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      clearMsg()
      if (!email || !password) {
        setError('أدخل البريد وكلمة السر.')
        return
      }
      setBusy(true)
      const res =
        tab === 'signin'
          ? await signInWithPassword(email, password)
          : await signUpWithPassword(email, password)
      setBusy(false)
      if (!res.ok) {
        setError(res.error ?? 'تعذّر إتمام العملية.')
        return
      }
      if (tab === 'signup') {
        setNotice('أُرسلت رسالة تأكيد إلى بريدك. تحقّق منه لإكمال التسجيل.')
      }
    },
    [tab, email, password, signInWithPassword, signUpWithPassword, clearMsg],
  )

  const handleSendOtp = useCallback(async () => {
    clearMsg()
    if (!email) {
      setError('أدخل بريدك أولًا.')
      return
    }
    setBusy(true)
    const res = await sendEmailOtp(email)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'تعذّر إرسال الرمز.')
      return
    }
    setOtpSent(true)
    setNotice('أرسلنا رمز الدخول إلى بريدك.')
  }, [email, sendEmailOtp, clearMsg])

  const handleVerifyOtp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      clearMsg()
      if (otp.length < 6 || otp.length > 8) {
        setError('الرمز مكوّن من 6 إلى 8 أرقام.')
        return
      }
      setBusy(true)
      const res = await verifyEmailOtp(email, otp)
      setBusy(false)
      if (!res.ok) setError(res.error ?? 'رمز غير صحيح.')
      // عند النجاح يغلق المزوّد النافذة تلقائيًا
    },
    [otp, email, verifyEmailOtp, clearMsg],
  )

  const handleOAuth = useCallback(
    async (provider: OAuthProvider) => {
      clearMsg()
      setBusy(true)
      const res = await signInWithOAuth(provider)
      if (!res.ok) {
        setBusy(false)
        setError(res.error ?? 'تعذّر تسجيل الدخول.')
      }
      // عند النجاح تتم إعادة التوجيه خارج الصفحة
    },
    [signInWithOAuth, clearMsg],
  )

  const handleReset = useCallback(async () => {
    clearMsg()
    if (!email) {
      setError('أدخل بريدك لاسترجاع كلمة السر.')
      return
    }
    setBusy(true)
    const res = await resetPassword(email)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'تعذّر الإرسال.')
      return
    }
    setNotice('أرسلنا رابط استرجاع كلمة السر إلى بريدك.')
  }, [email, resetPassword, clearMsg])

  return createPortal(
    <div
      className="auth-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="نافذة الحساب"
      onMouseDown={closeAuthModal}
    >
      <div
        className="auth-modal"
        dir="rtl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="auth-close"
          aria-label="إغلاق"
          onClick={closeAuthModal}
        >
          ×
        </button>

        <h2 className="auth-title">
          {tab === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
        </h2>

        <div className="auth-tabs">
          <button
            type="button"
            className={tab === 'signin' ? 'active' : ''}
            onClick={() => {
              setTab('signin')
              clearMsg()
            }}
          >
            دخول
          </button>
          <button
            type="button"
            className={tab === 'signup' ? 'active' : ''}
            onClick={() => {
              setTab('signup')
              clearMsg()
            }}
          >
            تسجيل
          </button>
        </div>

        <div className="auth-oauth">
          <button
            type="button"
            className="auth-oauth-btn google"
            disabled={busy}
            onClick={() => handleOAuth('google')}
          >
            المتابعة عبر Google
          </button>
          <button
            type="button"
            className="auth-oauth-btn github"
            disabled={busy}
            onClick={() => handleOAuth('github')}
          >
            المتابعة عبر GitHub
          </button>
        </div>

        <div className="auth-divider">
          <span>أو</span>
        </div>

        {!otpSent ? (
          <form className="auth-form" onSubmit={handlePasswordSubmit}>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
            />
            <input
              type="password"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              placeholder="كلمة السر"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
            <button type="submit" className="auth-primary" disabled={busy}>
              {tab === 'signin' ? 'دخول' : 'إنشاء الحساب'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerifyOtp}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="••••••"
              className="auth-otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              disabled={busy}
            />
            <button type="submit" className="auth-primary" disabled={busy}>
              تأكيد الرمز
            </button>
          </form>
        )}

        <div className="auth-actions">
          {!otpSent ? (
            <button
              type="button"
              className="auth-link"
              disabled={busy}
              onClick={handleSendOtp}
            >
              الدخول برمز عبر البريد بدل كلمة السر
            </button>
          ) : (
            <button
              type="button"
              className="auth-link"
              disabled={busy}
              onClick={() => {
                setOtpSent(false)
                setOtp('')
                clearMsg()
              }}
            >
              الرجوع
            </button>
          )}
          {tab === 'signin' && !otpSent && (
            <button
              type="button"
              className="auth-link"
              disabled={busy}
              onClick={handleReset}
            >
              نسيت كلمة السر؟
            </button>
          )}
        </div>

        {error && (
          <p className="auth-msg auth-error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="auth-msg auth-notice">{notice}</p>}
      </div>
    </div>,
    document.body,
  )
}
