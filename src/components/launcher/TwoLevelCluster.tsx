import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones, Play, Music, Film, Tv, ArrowLeft, LucideIcon } from 'lucide-react';
import { Branch, LeafItem } from './launcher.config';
import { spring } from '../../motion/tokens';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';

const iconMap: Record<string, LucideIcon> = {
  'headphones': Headphones,
  'play': Play,
  'music': Music,
  'film': Film,
  'tv': Tv,
};

interface TwoLevelClusterProps {
  label: string;
  tagline: string;
  branches: Branch[];
  onItemClick: (e: React.MouseEvent<HTMLButtonElement>, item: LeafItem) => void;
}

export function TwoLevelCluster({ label, tagline, branches, onItemClick }: TwoLevelClusterProps) {
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const activeBranch = branches.find((b) => b.id === activeBranchId);

  // Motion animation variants for sliding
  const slideVariants = {
    initial: (custom: number) => ({
      opacity: 0,
      x: custom > 0 ? 50 : -50,
      filter: 'blur(4px)',
    }),
    animate: {
      opacity: 1,
      x: 0,
      filter: 'blur(0px)',
      transition: spring.soft,
    },
    exit: (custom: number) => ({
      opacity: 0,
      x: custom > 0 ? -50 : 50,
      filter: 'blur(4px)',
      transition: { duration: 0.2 },
    }),
  };

  return (
    <div className="nl-launcher-category w-full">
      {/* Category Glass Card Header */}
      <div className="nl-launcher-category-pill nl-launcher-glass w-full rounded-t-2xl border-b-0">
        <h2 className="nl-launcher-category-title">{label}</h2>
        <p className="nl-launcher-category-tagline">
          {activeBranch ? `${tagline} › ${activeBranch.label}` : tagline}
        </p>
      </div>

      {/* Main interactive panel */}
      <div className="relative overflow-hidden w-full bg-black/20 p-4 border border-t-0 border-white/10 rounded-b-2xl shadow-inner min-h-[168px] flex flex-col justify-center">
        <AnimatePresence mode="wait" initial={false} custom={activeBranchId ? 1 : -1}>
          {!activeBranchId ? (
            /* LEVEL 1: Sub-branches ("Listen", "Watch") */
            <motion.div
              key="level1"
              custom={-1}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col gap-3 w-full"
            >
              {branches.map((branch) => {
                const IconComponent = iconMap[branch.icon] || Headphones;
                return (
                  <motion.button
                    key={branch.id}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveBranchId(branch.id)}
                    className="nl-branch-sub-pill nl-launcher-glass flex items-center justify-between text-left hover:bg-white/10"
                  >
                    <div className="flex items-center gap-3">
                      <IconComponent size={20} className="text-[#3cdc82]" />
                      <span>{branch.label}</span>
                    </div>
                    <span className="text-white/40 text-xs font-mono select-none">Explore &rsaquo;</span>
                  </motion.button>
                );
              })}
            </motion.div>
          ) : (
            /* LEVEL 2: Leaves (NL Music, Movies, NL TV) */
            <motion.div
              key="level2"
              custom={1}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full flex flex-col"
            >
              {/* Back Button */}
              <button
                onClick={() => setActiveBranchId(null)}
                className="nl-launcher-back-btn"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>

              {/* Sub-items grid */}
              <div className="grid grid-cols-2 gap-3 w-full">
                {activeBranch?.items.map((item) => {
                  const LeafIcon = iconMap[item.icon] || Music;
                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ translateY: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={(e) => {
                        setGenieOriginFromElement(e.currentTarget);
                        onItemClick(e, item);
                      }}
                      className="nl-launcher-tile nl-launcher-glass hover:bg-white/15"
                    >
                      <div className="nl-launcher-tile-icon">
                        <LeafIcon size={24} />
                      </div>
                      <span>{item.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
