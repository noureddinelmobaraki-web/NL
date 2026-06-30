import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useBubbleAvoidance } from '../../system/useBubbleAvoidance'
import '../../styles/components/auth-launcher.css'

export default function AuthLauncher() {
  const { user, openAuthModal } = useAuth()
  const ref = useRef<HTMLButtonElement>(null)
  useBubbleAvoidance(ref, true)

  // يختفي تلقائيًا بعد تسجيل الدخول — تصبح بوابة الحساب داخل الفقاعة («حسابي»)
  if (user) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <button
      ref={ref}
      type="button"
      className="auth-launcher"
      data-glass-avoid=""
      onPointerEnter={() => import('./AuthModal').catch(() => {})}
      onFocus={() => import('./AuthModal').catch(() => {})}
      onClick={openAuthModal}
      aria-label="تسجيل الدخول"
    >
      <span className="auth-launcher__glow" aria-hidden="true" />
      <span className="auth-launcher__dot" aria-hidden="true" />
      <LogIn className="auth-launcher__icon" size={15} strokeWidth={2.5} aria-hidden="true" />
      <span className="auth-launcher__label">تسجيل الدخول</span>
    </button>,
    document.body,
  )
}
