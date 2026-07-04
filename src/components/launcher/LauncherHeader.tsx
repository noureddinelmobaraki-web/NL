// src/components/launcher/LauncherHeader.tsx
// Slim launcher top bar. Intentionally NO product name / build label — just the
// identity actions floating in the top-right corner.
// motion props are single-brace variables (no inline double braces).

import { motion } from 'framer-motion';
import { LogIn, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAppContext } from '../../context/AppContext';
import { ProfileOrb } from '../../features/account/ProfileOrb';
import { spring } from '../../motion/tokens';

const hover = { scale: 1.06 };
const tap = { scale: 0.95 };
const orbHover = { scale: 1.08 };
const orbTap = { scale: 0.94 };

export function LauncherHeader() {
  const { user, openAuthModal } = useAuth();
  const { openAccounts } = useAppContext();

  return (
    <div className="nl-launcher-topbar">
      <motion.button
        type="button"
        whileHover={hover}
        whileTap={tap}
        transition={spring.snappy}
        onClick={openAccounts}
        className="nl-topbar-btn"
        title="Accounts"
      >
        <Users size={14} className="nl-topbar-ico" />
        <span className="nl-topbar-label">Accounts</span>
      </motion.button>

      {!user && (
        <motion.button
          type="button"
          whileHover={hover}
          whileTap={tap}
          transition={spring.snappy}
          onClick={openAuthModal}
          className="nl-topbar-btn is-primary"
        >
          <LogIn size={14} />
          <span className="nl-topbar-label">Login</span>
        </motion.button>
      )}

      <motion.div whileHover={orbHover} whileTap={orbTap} transition={spring.snappy} className="nl-topbar-orb">
        <ProfileOrb variant="welcome" />
      </motion.div>
    </div>
  );
}
