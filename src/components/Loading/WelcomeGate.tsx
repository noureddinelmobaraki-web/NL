import { useEffect, useState, useCallback } from 'react';
import { LogIn, UserRound, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileOrb } from '../../features/account/ProfileOrb';
import './welcome-gate.css';

export function WelcomeGate({ onDismiss }: { onDismiss: () => void }) {
  const { user, openAuthModal } = useAuth();
  const [leaving, setLeaving] = useState(false);

  // Warm the auth modal chunk the instant the gate appears (PART B).
  useEffect(() => { import('../../features/account/AuthModal').catch(() => {}); }, []);

  const dismiss = useCallback(() => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(onDismiss, 620);
  }, [leaving, onDismiss]);

  // Auto-dismiss when the user becomes authenticated while the gate is open.
  useEffect(() => { if (user) dismiss(); }, [user, dismiss]);

  return (
    <div className={`nl-gate${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Entrance Gate" dir="rtl">
      <div className="nl-gate__card">
        <ProfileOrb variant="gate" />
        {user ? (
          <>
            <p className="nl-gate__hi">Welcome Back</p>
            <button type="button" className="nl-gate__primary" onClick={dismiss}>
              <Sparkles size={16} /> Enter Site
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="nl-gate__primary"
              onPointerEnter={() => import('../../features/account/AuthModal').catch(() => {})}
              onClick={openAuthModal}
            >
              <LogIn size={16} /> Login
            </button>
            <p className="nl-gate__note">
              Log in to save your favorite songs and watch history for next time.
            </p>
            <button type="button" className="nl-gate__guest" onClick={dismiss}>
              <UserRound size={15} /> Continue as Guest
            </button>
          </>
        )}
      </div>
    </div>
  );
}
