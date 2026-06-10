// src/transitions/GenieSurface.tsx
import type { ReactNode, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGenieTransition } from './useGenieTransition';

interface GenieSurfaceProps {
  open: boolean;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  role?: string;
  ariaLabel?: string;
  ariaModal?: boolean;
  onExitComplete?: () => void;
  portal?: boolean;
}

/** مغلّف جاهز: يتكفّل بـ AnimatePresence + motion.div + الانتقال genie. */
export const GenieSurface = ({
  open,
  children,
  className,
  style,
  role = 'dialog',
  ariaLabel,
  ariaModal = true,
  onExitComplete,
  portal = true,
}: GenieSurfaceProps) => {
  const genie = useGenieTransition(open);

  const tree = (
    <AnimatePresence onExitComplete={onExitComplete}>
      {open && (
        <motion.div
          role={role}
          aria-modal={ariaModal || undefined}
          aria-label={ariaLabel}
          className={className}
          initial={genie.initial}
          animate={genie.animate}
          exit={genie.exit}
          transition={genie.transition}
          style={{ ...genie.style, ...style }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (!portal || typeof document === 'undefined') return tree;
  return createPortal(tree, document.body);
};
