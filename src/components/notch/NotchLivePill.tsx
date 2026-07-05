import { memo } from 'react';
import { SkipBack, SkipForward, Square, Play } from 'lucide-react';
import type { NotchTransport } from './notch.types';

/**
 * مشغّل النوتش بأيقونات lucide خفيفة (بلا صور CDN بطيئة).
 * أثناء التشغيل يظهر زر إيقاف (Square) → onStop → تنكمش الجزيرة.
 */
function NotchLivePillBase({
  t,
  onVibrate,
  compact,
  nameOnly,
}: {
  t: NotchTransport;
  onVibrate: () => void;
  compact?: boolean;
  nameOnly?: boolean;
}) {
  return (
    <div className={`notch-live${compact ? ' is-compact' : ''}${nameOnly ? ' is-name-only' : ''}`} onClick={(e) => e.stopPropagation()}>
      <span className="notch-eq" aria-hidden="true">
        <span className="notch-eq__bar" />
        <span className="notch-eq__bar" />
        <span className="notch-eq__bar" />
      </span>
      <span className="notch-live__title" title={t.title}>{t.title}</span>
      {!nameOnly && (
      <div className="notch-player">
        <button
          type="button"
          className="notch-btn"
          disabled={!t.canPrev}
          aria-label="Previous"
          title="Previous"
          onClick={(e) => { e.stopPropagation(); t.onPrev(); onVibrate(); }}
        >
          <SkipBack size={16} strokeWidth={2.4} />
        </button>
        <button
          type="button"
          className="notch-btn notch-btn--primary"
          aria-label={t.isPlaying ? 'Stop' : 'Play'}
          title={t.isPlaying ? 'Stop' : 'Play'}
          onClick={(e) => { e.stopPropagation(); (t.isPlaying ? t.onStop : t.onToggle)(); onVibrate(); }}
        >
          {t.isPlaying ? <Square size={14} strokeWidth={2.6} /> : <Play size={15} strokeWidth={2.6} />}
        </button>
        <button
          type="button"
          className="notch-btn"
          disabled={!t.canNext}
          aria-label="Next"
          title="Next"
          onClick={(e) => { e.stopPropagation(); t.onNext(); onVibrate(); }}
        >
          <SkipForward size={16} strokeWidth={2.4} />
        </button>
      </div>
      )}
    </div>
  );
}

export const NotchLivePill = memo(NotchLivePillBase);
