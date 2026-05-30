interface LoadingDisclaimerProps {
  visible: boolean;
}

export const LoadingDisclaimer = ({ visible }: LoadingDisclaimerProps) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'absolute',
      bottom: 'clamp(28px,6vh,56px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2,
      textAlign: 'left',
      width: 'min(360px,88vw)',
      padding: '18px 22px',
      background: 'rgba(0,0,0,0.45)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderLeft: '2px solid rgba(255,255,255,0.35)',
      backdropFilter: 'blur(6px)',
      WebkitBackdropFilter: 'blur(6px)',
      animation: 'nl-disclaimer-in 1s ease-out both',
    }}>
      <p style={{
        color: 'rgba(255,255,255,0.82)',
        fontSize: 'clamp(0.68rem,2.2vw,0.78rem)',
        fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
        letterSpacing: '0.04em', lineHeight: 1.6,
        margin: 0,
        animation: 'nl-line-in 0.7s 0.10s ease-out both',
      }}>
        This is just my personal website.
      </p>

      <p style={{
        color: 'rgba(255,255,255,0.70)',
        fontSize: 'clamp(0.65rem,2vw,0.75rem)',
        fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
        letterSpacing: '0.04em', lineHeight: 1.6,
        marginTop: '4px', marginBottom: '10px',
        animation: 'nl-line-in 0.7s 0.25s ease-out both',
      }}>
        I built it for two reasons:
      </p>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '5px', animation: 'nl-line-in 0.7s 0.42s ease-out both' }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.55rem', marginTop: '3px', flexShrink: 0, fontFamily: 'monospace' }}>◆</span>
        <p style={{
          color: 'rgba(255,255,255,0.62)',
          fontSize: 'clamp(0.60rem,1.9vw,0.70rem)',
          fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
          letterSpacing: '0.03em', lineHeight: 1.55, margin: 0,
        }}>
          First, just for fun because I have no life,
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', animation: 'nl-line-in 0.7s 0.58s ease-out both' }}>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.55rem', marginTop: '3px', flexShrink: 0, fontFamily: 'monospace' }}>◆</span>
        <p style={{
          color: 'rgba(255,255,255,0.62)',
          fontSize: 'clamp(0.60rem,1.9vw,0.70rem)',
          fontFamily: 'var(--font-hand,"Patrick Hand",Georgia,serif)',
          letterSpacing: '0.03em', lineHeight: 1.55, margin: 0,
        }}>
          And second, to practice my coding skills.
        </p>
      </div>
    </div>
  );
};
