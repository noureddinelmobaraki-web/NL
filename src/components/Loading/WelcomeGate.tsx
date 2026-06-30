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
    <div className={`nl-gate${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="بوابة الدخول" dir="rtl">
      <div className="nl-gate__card">
        <ProfileOrb variant="gate" />
        {user ? (
          <>
            <p className="nl-gate__hi">مرحباً بعودتك</p>
            <button type="button" className="nl-gate__primary" onClick={dismiss}>
              <Sparkles size={16} /> الدخول إلى الموقع
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
              <LogIn size={16} /> تسجيل الدخول
            </button>
            <p className="nl-gate__note">
              بتسجيل الدخول نحفظ لك معلوماتك وأغانيك المفضّلة وسِجلّ مشاهداتك لكل مرّة قادمة.
            </p>
            <button type="button" className="nl-gate__guest" onClick={dismiss}>
              <UserRound size={15} /> المتابعة كضيف
            </button>
          </>
        )}
      </div>
    </div>
  );
}
