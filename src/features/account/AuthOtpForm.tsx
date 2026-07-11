import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'

type Props = {
  otp: string
  busy: boolean
  onOtp: (value: string) => void
  onSubmit: (e: FormEvent) => void
}

export default function AuthOtpForm({ otp, busy, onOtp, onSubmit }: Props) {
  return (
    <form className="auth-form" onSubmit={onSubmit}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={8}
        placeholder="••••••"
        className="auth-otp"
        value={otp}
        onChange={(e) => onOtp(e.target.value)}
        disabled={busy}
      />
      <button type="submit" className="auth-primary" disabled={busy}>
        {busy && <Loader2 className="auth-spin" size={16} aria-hidden="true" />}
        Confirm Code
      </button>
    </form>
  )
}
