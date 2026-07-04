import { motion } from 'framer-motion';
import { MODES } from './launcher.config';
import type { Theme } from '../../utils/userPrefs';
import { spring } from '../../motion/tokens';

interface ModePickerProps {
  onSelectTheme: (theme: Theme) => void;
}

export function ModePicker({ onSelectTheme }: ModePickerProps) {
  return (
    <div className="nl-mode-picker-container w-full max-w-[280px]">
      <span className="nl-mode-picker-title text-[10px] uppercase tracking-wider text-white/50 mb-2 font-mono">
        ENTER WITH SPECIAL SKINS
      </span>
      <div className="nl-mode-picker-chips">
        {MODES.map((mode) => (
          <motion.button
            key={mode.id}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={spring.snappy}
            onClick={() => onSelectTheme(mode.id)}
            className="nl-mode-chip hover:bg-white/10"
            style={{ borderColor: 'rgba(255, 255, 255, 0.15)' }}
          >
            <span 
              className="nl-mode-dot" 
              style={{ 
                backgroundColor: mode.color,
                color: mode.color,
              }} 
            />
            <span>{mode.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
