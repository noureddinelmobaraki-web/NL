import { createPortal } from 'react-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import '../../styles/components/auth-launcher.css';

export default function AuthLauncher() {
  const { user, openAuthModal } = useAuth();

  // Hidden once signed in (the account lives inside the bubble afterwards).
  if (user) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <button
      type="button"
      className="auth-launcher"
      onPointerEnter={() => import('./AuthModal').catch(() => {})}
      onFocus={() => import('./AuthModal').catch(() => {})}
      onClick={openAuthModal}
      aria-label="Login"
    >
      <span className="auth-launcher__glow" aria-hidden="true" />
      <span className="auth-launcher__dot" aria-hidden="true" />
      <LogIn className="auth-launcher__icon" size={15} strokeWidth={2.5} aria-hidden="true" />
      <span className="auth-launcher__label">Login</span>
    </button>,
    document.body,
  );
}
