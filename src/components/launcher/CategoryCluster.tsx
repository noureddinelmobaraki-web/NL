import { motion } from 'framer-motion';
import { Monitor, Joystick, Gamepad2, LucideIcon } from 'lucide-react';
import { LeafItem } from './launcher.config';
import { spring, stagger } from '../../motion/tokens';
import { setGenieOriginFromElement } from '../../transitions/genieOrigin';

// Icon Map
const iconMap: Record<string, LucideIcon> = {
  'monitor': Monitor,
  'joystick': Joystick,
  'gamepad-2': Gamepad2,
};

interface CategoryClusterProps {
  label: string;
  tagline: string;
  items: LeafItem[];
  onItemClick: (e: React.MouseEvent<HTMLButtonElement>, item: LeafItem) => void;
}

export function CategoryCluster({ label, tagline, items, onItemClick }: CategoryClusterProps) {
  // Container variant for staggering children
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: stagger.children,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: spring.soft },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="nl-launcher-category w-full"
    >
      {/* Category Glass Card Header */}
      <div className="nl-launcher-category-pill nl-launcher-glass w-full rounded-t-2xl border-b-0">
        <h2 className="nl-launcher-category-title">{label}</h2>
        <p className="nl-launcher-category-tagline">{tagline}</p>
      </div>

      {/* Grid of compact sub-tiles */}
      <div className="nl-launcher-tiles-grid bg-black/20 p-4 border border-t-0 border-white/10 rounded-b-2xl shadow-inner w-full">
        {items.map((item) => {
          const IconComponent = iconMap[item.icon] || Monitor;
          return (
            <motion.button
              key={item.id}
              variants={itemVariants}
              whileHover={{ translateY: -4, scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={(e) => {
                setGenieOriginFromElement(e.currentTarget);
                onItemClick(e, item);
              }}
              className="nl-launcher-tile nl-launcher-glass hover:bg-white/15"
            >
              <div className="nl-launcher-tile-icon">
                <IconComponent size={24} />
              </div>
              <span>{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
