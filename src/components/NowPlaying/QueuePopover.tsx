import { motion } from 'framer-motion';

export interface QueuePopoverProps {
  nextSongs: { id: number; title: string; cover?: string }[];
  isMobile: boolean;
  onClose: () => void;
}

export const QueuePopover = ({ nextSongs, isMobile, onClose }: QueuePopoverProps) => {
  if (!nextSongs || nextSongs.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 12px)',
        right: '16px',
        width: '240px',
        background: 'var(--bg-elevated)',
        backdropFilter: 'blur(16px)',
        borderRadius: '20px',
        border: '1px solid var(--border-subtle)',
        padding: '16px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        zIndex: 8001
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 'bold', letterSpacing: '0.1em', margin: 0 }}>
          UP NEXT
        </h4>
        {isMobile && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px',
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {nextSongs.map(song => (
          <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={song.cover || (song as any).backgroundImage || ''} 
              alt="" 
              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover' }} 
            />
            <span style={{ 
              fontSize: '12px', 
              color: 'var(--text-primary)', 
              fontWeight: '500', 
              whiteSpace: 'nowrap', 
              overflow: 'hidden', 
              textOverflow: 'ellipsis' 
            }}>
              {song.title}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
