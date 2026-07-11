import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import type { AuthTab } from './useAuthForm'

type Props = {
  tab: AuthTab
  email: string
  password: string
  busy: boolean
  onEmail: (value: string) => void
  onPassword: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export default function AuthPasswordForm({
  tab,
  email,
  password,
  busy,
  onEmail,
  onPassword,
  onSubmit,
}: Props) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="Email"
        value={email}
        onChange={(e) => onEmail(e.target.value)}
        disabled={busy}
      />
      <div className="auth-field">
        <input
          type={showPassword ? 'text' : 'password'}
          autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
          placeholder="Password"
          value={password}
          onChange={(e) => onPassword(e.target.value)}
          disabled={busy}
        />
        <button
          type="button"
          className="auth-eye"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          onClick={() => setShowPassword((v) => !v)}
        >
          {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
        </button>
      </div>
      <button type="submit" className="auth-primary" disabled={busy}>
        {busy && <Loader2 className="auth-spin" size={16} aria-hidden="true" />}
        {tab === 'signin' ? 'Login' : 'Create Account'}
      </button>
    </form>
  )
}
