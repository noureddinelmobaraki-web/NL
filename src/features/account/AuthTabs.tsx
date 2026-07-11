import type { AuthTab } from './useAuthForm'

type Props = {
  tab: AuthTab
  onSelect: (next: AuthTab) => void
}

export default function AuthTabs({ tab, onSelect }: Props) {
  return (
    <div className="auth-tabs">
      <button
        type="button"
        className={tab === 'signin' ? 'active' : ''}
        onClick={() => onSelect('signin')}
      >
        Login
      </button>
      <button
        type="button"
        className={tab === 'signup' ? 'active' : ''}
        onClick={() => onSelect('signup')}
      >
        Register
      </button>
    </div>
  )
}
