import { motion } from 'framer-motion';
import { Shuffle } from 'lucide-react';
import { useMusicStore } from '../store/musicStore';
import styles from '../music.module.css';

export function ShuffleBubble() {
  const actions = useMusicStore((s) => s.actions);
  const tracks = useMusicStore((s) => s.tracks);

  const playRandom = () => {
    if (!tracks.length) return;
    const r = tracks[Math.floor(Math.random() * tracks.length)];
    actions.playTrack(r.id, true);
  };

  return (
    <motion.button
      onClick={playRandom}
      aria-label="Play random song"
      className={styles['nlp-shuffle-bubble']}
      whileTap={{ scale: 0.88 }}
      whileHover={{ scale: 1.08 }}
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <span className={styles['nlp-shuffle-bubble__sheen']} aria-hidden />
      <Shuffle size={22} className="relative z-10" />
    </motion.button>
  );
}
