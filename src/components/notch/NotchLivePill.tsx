import { memo } from "react";
import { SkipBack, SkipForward, Square, Play, Pause } from "lucide-react";
import type { NotchTransport } from "./notch.types";

/**
 * Dynamic Island Live Pill:
 * Displays optional artwork thumbnail (28x28 rounded 8px), equalizer bars (paused when !isPlaying),
 * track title, and full transport controls (Prev, Play/Pause toggle, Next, Stop).
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
    <div
      className={`notch-live${compact ? " is-compact" : ""}${nameOnly ? " is-name-only" : ""}`}
    >
      {t.artworkUrl ? (
        <img
          src={t.artworkUrl}
          alt=""
          className="notch-live__art"
          width={28}
          height={28}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span
        className="notch-eq"
        data-paused={!t.isPlaying ? "true" : "false"}
        aria-hidden="true"
      >
        <span className="notch-eq__bar" />
        <span className="notch-eq__bar" />
        <span className="notch-eq__bar" />
      </span>
      <span className="notch-live__title" title={t.subtitle ? `${t.title} — ${t.subtitle}` : t.title}>
        {t.title}
      </span>
      {!nameOnly && (
        <div className="notch-player">
          <button
            type="button"
            className="notch-btn"
            disabled={!t.canPrev}
            aria-label="Previous"
            title="Previous"
            onClick={(e) => {
              e.stopPropagation();
              t.onPrev();
              onVibrate();
            }}
          >
            <SkipBack size={15} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="notch-btn notch-btn--primary"
            aria-label={t.isPlaying ? "Pause" : "Play"}
            title={t.isPlaying ? "Pause" : "Play"}
            onClick={(e) => {
              e.stopPropagation();
              t.onToggle();
              onVibrate();
            }}
          >
            {t.isPlaying ? (
              <Pause size={15} strokeWidth={2.6} />
            ) : (
              <Play size={15} strokeWidth={2.6} />
            )}
          </button>
          <button
            type="button"
            className="notch-btn"
            disabled={!t.canNext}
            aria-label="Next"
            title="Next"
            onClick={(e) => {
              e.stopPropagation();
              t.onNext();
              onVibrate();
            }}
          >
            <SkipForward size={15} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            className="notch-btn notch-btn--stop"
            aria-label="Stop"
            title="Stop"
            onClick={(e) => {
              e.stopPropagation();
              t.onStop();
              onVibrate();
            }}
          >
            <Square size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}
    </div>
  );
}

export const NotchLivePill = memo(NotchLivePillBase);
