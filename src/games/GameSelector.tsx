import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bug, 
  Grid3X3, 
  Car, 
  Target, 
  Footprints,
  Type
} from 'lucide-react';

const GAMES = [
  { id: 'tetris',   label: 'TETRIS',   icon: Grid3X3,   desc: 'رتّب المكعبات', color: '#ff3e3e' },
  { id: 'snake',    label: 'SNAKE',    icon: Bug,       desc: 'كبّر الثعبان',  color: '#3eff3e' },
  { id: 'breakout', label: 'BREAKOUT', icon: Type,      desc: 'دمّر الطوب',    color: '#3e3eff' },
  { id: 'racing',   label: 'RACING',   icon: Car,       desc: 'تفادى السيارات', color: '#ffff3e' },
  { id: 'tank',     label: 'TANK',     icon: Target,    desc: 'احمِ القاعدة',  color: '#ff3eff' },
  { id: 'frogger',  label: 'FROGGER',  icon: Footprints, desc: 'اعبر الطريق',  color: '#3effff' },
];

interface GameSelectorProps {
  onSelect: (id: string) => void;
}

export const GameSelector = ({ onSelect }: GameSelectorProps) => {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-lg p-6">
      {GAMES.map((game, idx) => {
        const Icon = game.icon;
        const isHovered = hovered === game.id;
        
        return (
          <motion.button
            key={game.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(game.id)}
            onMouseEnter={() => setHovered(game.id)}
            onMouseLeave={() => setHovered(null)}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl relative group overflow-hidden"
            style={{
              background: isHovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
              border: `2px solid ${isHovered ? game.color : 'rgba(255,255,255,0.1)'}`,
              boxShadow: isHovered ? `0 0 20px ${game.color}33` : 'none',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer',
            }}
          >
            {/* Animated Glow Effect */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(circle, ${game.color}22 0%, transparent 70%)`
                  }}
                />
              )}
            </AnimatePresence>

            {/* Icon with nostalgic 2D animation */}
            <motion.div
              animate={isHovered ? {
                y: [0, -8, 0],
                rotate: [0, -5, 5, 0],
                scale: [1, 1.1, 1]
              } : {
                y: [0, -2, 0]
              }}
              transition={{
                duration: isHovered ? 0.6 : 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{ color: isHovered ? game.color : 'white' }}
              className="relative z-10"
            >
              <Icon size={40} strokeWidth={1.5} />
            </motion.div>

            <div className="flex flex-col items-center relative z-10">
              <span className="font-manga text-sm tracking-widest text-white mb-1">
                {game.label}
              </span>
              <span className="text-[10px] text-white/50 font-sans font-medium uppercase tracking-tighter">
                {game.desc}
              </span>
            </div>

            {/* Scanline pattern overlay (nostalgic feel) */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay"
              style={{
                backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06))',
                backgroundSize: '100% 2px, 3px 100%'
              }}
            />
          </motion.button>
        );
      })}
    </div>
  );
};
