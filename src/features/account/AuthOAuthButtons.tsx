import type { OAuthProvider } from '../../context/AuthContext'
import { GoogleIcon, GitHubIcon } from './AuthIcons'

type Props = {
  busy: boolean
  onOAuth: (provider: OAuthProvider) => void
}

export default function AuthOAuthButtons({ busy, onOAuth }: Props) {
  return (
    <div className="auth-oauth">
      <button
        type="button"
        className="auth-oauth-btn google"
        disabled={busy}
        onClick={() => onOAuth('google')}
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <button
        type="button"
        className="auth-oauth-btn github"
        disabled={busy}
        onClick={() => onOAuth('github')}
      >
        <GitHubIcon />
        Continue with GitHub
      </button>
    </div>
  )
}
