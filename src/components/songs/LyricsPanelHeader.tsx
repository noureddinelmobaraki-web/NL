/**
 * LyricsPanelHeader — title row inside the mobile lyrics bottom-sheet.
 * Pure presentational. Visual contract byte-identical to the inline header
 * that previously lived in SongCardLyricsPanel (lines 380-415).
 */
interface LyricsPanelHeaderProps {
  title: string;
  onClose: () => void;
}

export const LyricsPanelHeader = ({ title, onClose }: LyricsPanelHeaderProps) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px 20px',
      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
      flexShrink: 0,
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flex: 1,
        marginRight: '12px',
        textAlign: 'left',
      }}
    >
      <span
        // Announce the now-playing title for screen readers (improvement
        // over the previous version which had no live region).
        aria-live="polite"
        style={{
          fontSize: '15px',
          fontWeight: 700,
          color: '#fff',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {title}
      </span>
      <span
        style={{
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.5)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginTop: '2px',
        }}
      >
        NOW PLAYING
      </span>
    </div>
    <button
      onClick={onClose}
      aria-label="إغلاق الكلمات"
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.1)',
        border: '1px solid rgba(255,255,255,0.15)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '15px',
        fontWeight: 'bold',
        cursor: 'pointer',
        touchAction: 'manipulation',
      }}
    >
      ✕
    </button>
  </div>
);
