import { motion, AnimatePresence } from 'framer-motion';

export interface ShareToastProps {
  visible: boolean;
}

export const ShareToast = ({ visible }: ShareToastProps) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 12px)',
            left: '16px',
            background: 'var(--bg-glass-strong)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--border-neutral)',
            padding: '8px 16px',
            borderRadius: '16px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            zIndex: 8100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500' }}>
            Link copied!
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
