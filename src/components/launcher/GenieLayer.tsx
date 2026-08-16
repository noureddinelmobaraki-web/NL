import { ReactNode } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useGenieTransition } from '../../transitions/useGenieTransition';

interface GenieLayerProps {
  isOpen: boolean;
  children: ReactNode;
  className?: string;
}

export function GenieLayer({ isOpen, children, className = "" }: GenieLayerProps) {
  const genie = useGenieTransition(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <m.div
          initial={genie.initial}
          animate={genie.animate}
          exit={genie.exit}
          transition={genie.transition}
          style={genie.style}
          className={`w-full h-full ${className}`}
        >
          {children}
        </m.div>
      )}
    </AnimatePresence>
  );
}
