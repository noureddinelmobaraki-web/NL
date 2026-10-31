// src/components/launcher/LauncherHeader.tsx
// Slim launcher top bar. Intentionally NO product name / build label — just the
// identity actions floating in the top-right corner.

import { m } from 'framer-motion';
import { LogIn, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';
import { ProfileOrb } from '../../features/account/ProfileOrb';
import { useGlassTier } from './glass/useGlassTier';

const LIQUID_HOVER = { scale: 1.03 };
const LIQUID_TAP = { scaleX: 1.045, scaleY: 0.93 };
const LIQUID_SPRING = { type: 'spring' as const, stiffness: 520, damping: 24, mass: 0.6 };

const FROST_TAP = { scale: 0.97 };
const FROST_TWEEN = { type: 'tween' as const, duration: 0.12 };

const LITE_TAP = { opacity: 0.8 };
const LITE_TWEEN = { type: 'tween' as const, duration: 0.08 };

const ORB_LIQUID_HOVER = { scale: 1.06 };
const ORB_LIQUID_TAP = { scale: 0.94 };

export function LauncherHeader() {
  const { user, openAuthModal } = useAuth();
  const { openAccounts, setLoaded } = useAppContext();
  const glassTier = useGlassTier();

  const onAccounts = (e: React.MouseEvent<HTMLButtonElement>) => {
    setGenieOriginFromElement(e.currentTarget);
    openAccounts();
    setLoaded(true);
  };

  const warmAccounts = () => {
    import('../../features/accounts/AccountsPage').catch(() => {});
  };

  const hoverProps = glassTier === 'liquid' ? LIQUID_HOVER : undefined;
  const tapProps =
    glassTier === 'liquid' ? LIQUID_TAP : glassTier === 'frost' ? FROST_TAP : LITE_TAP;
  const transitionProps =
    glassTier === 'liquid' ? LIQUID_SPRING : glassTier === 'frost' ? FROST_TWEEN : LITE_TWEEN;

  const orbHoverProps = glassTier === 'liquid' ? ORB_LIQUID_HOVER : undefined;
  const orbTapProps =
    glassTier === 'liquid' ? ORB_LIQUID_TAP : glassTier === 'frost' ? FROST_TAP : LITE_TAP;

  return (
    <div className="nl-launcher-topbar">
      <m.button
        type="button"
        whileHover={hoverProps}
        whileTap={tapProps}
        transition={transitionProps}
        onClick={onAccounts}
        onMouseEnter={warmAccounts}
        onPointerDown={warmAccounts}
        className="nl-topbar-btn"
        title="Accounts"
      >
        <Users size={14} className="nl-topbar-ico" />
        <span className="nl-topbar-label">Accounts</span>
      </m.button>

      {!user && (
        <m.button
          type="button"
          whileHover={hoverProps}
          whileTap={tapProps}
          transition={transitionProps}
          onClick={openAuthModal}
          className="nl-topbar-btn is-primary"
        >
          <LogIn size={14} />
          <span className="nl-topbar-label">Login</span>
        </m.button>
      )}

      <m.div
        whileHover={orbHoverProps}
        whileTap={orbTapProps}
        transition={transitionProps}
        className="nl-topbar-orb"
      >
        <ProfileOrb variant="welcome" />
      </m.div>
    </div>
  );
}
