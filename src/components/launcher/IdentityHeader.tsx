import { motion } from 'framer-motion';
import { LogIn, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ProfileOrb } from '../../features/account/ProfileOrb';
import { useAppContext } from '../../context/AppContext';
import { spring } from '../../motion/tokens';

export function IdentityHeader() {
  const { user, openAuthModal } = useAuth();
  const { openAccounts } = useAppContext();

  return (
    <div className="w-full flex items-center justify-between px-2 py-4 border-b border-white/5 z-20">
      {/* Brand Label */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#3cdc82] to-[#5db8ff] flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <span className="font-bold text-xs text-slate-900 tracking-wider">NL</span>
        </div>
        <div className="flex flex-col">
          <h1 className="font-bold text-sm tracking-widest text-white/90 uppercase font-sans">
            NL Launcher
          </h1>
          <span className="text-[10px] text-white/45 tracking-wider font-mono">BUILD 2026</span>
        </div>
      </div>

      {/* Profile & Accounts Inline Actions */}
      <div className="flex items-center gap-3">
        {/* Accounts Directory Link */}
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          transition={spring.snappy}
          onClick={openAccounts}
          className="flex items-center gap-2 h-9 px-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/25 text-white text-xs font-semibold tracking-wide transition-colors shadow-sm"
          title="View accounts directory"
        >
          <Users size={14} className="text-[#3cdc82]" />
          <span className="hidden sm:inline">Accounts</span>
        </motion.button>

        {/* Optional explicit Login Button when guest */}
        {!user && (
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={spring.snappy}
            onClick={openAuthModal}
            className="flex items-center gap-2 h-9 px-4 rounded-full bg-[#3cdc82]/10 border border-[#3cdc82]/25 hover:bg-[#3cdc82]/20 hover:border-[#3cdc82]/40 text-[#3cdc82] text-xs font-semibold tracking-wide transition-colors shadow-sm"
          >
            <LogIn size={14} />
            <span>Login</span>
          </motion.button>
        )}

        {/* Profile Orb Wrapper with Framer Motion spring */}
        <motion.div
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={spring.snappy}
          className="relative flex items-center justify-center w-9 h-9 rounded-full overflow-hidden shadow-md"
        >
          <ProfileOrb variant="welcome" />
        </motion.div>
      </div>
    </div>
  );
}
