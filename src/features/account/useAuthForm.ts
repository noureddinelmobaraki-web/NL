import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { useAuth, type OAuthProvider } from '../../context/AuthContext'

export type AuthTab = 'signin' | 'signup'

/**
 * useAuthForm — كل حالة ومنطق نافذة الدخول في مكان واحد.
 * السلوك مطابق تمامًا للنسخة السابقة؛ فقط أعيد تنظيمه في hook.
 */
export function useAuthForm() {
  const {
    closeAuthModal,
    signInWithPassword,
    signUpWithPassword,
    sendEmailOtp,
    verifyEmailOtp,
    signInWithOAuth,
    resetPassword,
  } = useAuth()

  const [tab, setTab] = useState<AuthTab>('signin')
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

  // قفل تمرير الخلفية أثناء فتح النافذة
  useEffect(() => {
    if (typeof document === 'undefined') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  const clearMsg = useCallback(() => {
    setError('')
    setNotice('')
  }, [])

  const selectTab = useCallback(
    (next: AuthTab) => {
      setTab(next)
      clearMsg()
    },
    [clearMsg],
  )

  const setOtpDigits = useCallback((value: string) => {
    setOtp(value.replace(/\D/g, '').slice(0, 8))
  }, [])

  const handlePasswordSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      clearMsg()
      if (!email || !password) {
        setError('Enter email and password.')
        return
      }
      setBusy(true)
      const res =
        tab === 'signin'
          ? await signInWithPassword(email, password)
          : await signUpWithPassword(email, password)
      setBusy(false)
      if (!res.ok) {
        setError(res.error ?? 'Operation failed.')
        return
      }
      if (tab === 'signup') {
        setNotice('Confirmation sent to your email. Check it to complete registration.')
      }
    },
    [tab, email, password, signInWithPassword, signUpWithPassword, clearMsg],
  )

  const handleSendOtp = useCallback(async () => {
    clearMsg()
    if (!email) {
      setError('Enter your email first.')
      return
    }
    setBusy(true)
    const res = await sendEmailOtp(email)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Failed to send code.')
      return
    }
    setOtpSent(true)
    setNotice('We sent a login code to your email.')
  }, [email, sendEmailOtp, clearMsg])

  const handleVerifyOtp = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      clearMsg()
      if (otp.length < 6 || otp.length > 8) {
        setError('The code consists of 6 to 8 digits.')
        return
      }
      setBusy(true)
      const res = await verifyEmailOtp(email, otp)
      setBusy(false)
      if (!res.ok) setError(res.error ?? 'Incorrect code.')
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
        setError(res.error ?? 'Login failed.')
      }
      // عند النجاح تتم إعادة التوجيه خارج الصفحة
    },
    [signInWithOAuth, clearMsg],
  )

  const handleReset = useCallback(async () => {
    clearMsg()
    if (!email) {
      setError('Enter email to reset password.')
      return
    }
    setBusy(true)
    const res = await resetPassword(email)
    setBusy(false)
    if (!res.ok) {
      setError(res.error ?? 'Failed to send.')
      return
    }
    setNotice('We sent a password reset link to your email.')
  }, [email, resetPassword, clearMsg])

  const backToPassword = useCallback(() => {
    setOtpSent(false)
    setOtp('')
    clearMsg()
  }, [clearMsg])

  return {
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
  }
}
