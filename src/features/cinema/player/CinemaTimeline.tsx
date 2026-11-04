import React, { useState } from "react";
import { Pause, Play, RotateCcw, RotateCw, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clockPause, clockPlay, clockSeek, useClockState, useClockTime } from "./playbackClock";
import type { IframePlayerCommand } from "./iframeBridge";

export type PlayerControlMode = "direct" | "bridged" | "none";

export const formatClock = (s: number): string => {
  const v = Number.isFinite(s) && s > 0 ? s : 0;
  const h = Math.floor(v / 3600);
  const m = String(Math.floor((v % 3600) / 60)).padStart(2, "0");
  const sec = String(Math.floor(v % 60)).padStart(2, "0");
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
};

const pill = "lg-cinema-action-pill h-8 px-3 rounded-full text-[11px] font-bold text-white flex items-center gap-1 cursor-pointer";

export const CinemaTimeline = React.memo(function CinemaTimeline({
  mode,
  videoRef,
  fallbackDurationSec = 0,
  hasSubtitles,
  onIframeCommand,
  onCommitEmbedSeek,
}: {
  mode: PlayerControlMode;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  fallbackDurationSec?: number;
  hasSubtitles: boolean;
  onIframeCommand?: (cmd: IframePlayerCommand) => void;
  onCommitEmbedSeek?: (targetSec: number) => void;
}) {
  const { t } = useTranslation();
  const liveTime = useClockTime(200);
  const clock = useClockState();
  const [scrubTime, setScrubTime] = useState<number | null>(null);

  const time = scrubTime !== null ? scrubTime : liveTime;
  const duration = clock.duration || fallbackDurationSec || 7200;
  const displayDuration = clock.duration || fallbackDurationSec;

  const applySeek = (nextSec: number, commitToEmbed = false) => {
    const clamped = Math.max(0, Math.min(duration, nextSec));
    clockSeek(clamped);
    if (mode === "direct") {
      const el = videoRef.current;
      if (el) el.currentTime = clamped;
    } else {
      onIframeCommand?.({ type: "seek", time: clamped });
      if (commitToEmbed) {
        onCommitEmbedSeek?.(clamped);
      }
    }
  };

  const handleTogglePlay = () => {
    if (mode === "direct") {
      const v = videoRef.current;
      if (!v) return;
      if (v.paused) {
        clockPlay();
        void v.play().catch(() => {});
      } else {
        clockPause();
        v.pause();
      }
      return;
    }
    if (clock.paused) {
      clockPlay();
      onIframeCommand?.({ type: "play" });
    } else {
      clockPause();
      onIframeCommand?.({ type: "pause" });
    }
  };

  const commitScrub = () => {
    if (scrubTime === null) return;
    const finalTime = scrubTime;
    setScrubTime(null);
    applySeek(finalTime, true);
  };

  return (
    <div className="flex flex-col gap-1.5 w-full" dir="ltr">
      <div className="flex items-center gap-2 text-[10px] font-bold text-white/85 tabular-nums">
        <span className="min-w-[36px]">{formatClock(time)}</span>
        <input
          type="range"
          min={0}
          max={duration}
          step={0.5}
          value={Math.min(time, duration)}
          onChange={(e) => {
            const next = Number(e.target.value);
            setScrubTime(next);
            applySeek(next, false);
          }}
          onMouseUp={commitScrub}
          onTouchEnd={commitScrub}
          onPointerUp={commitScrub}
          onKeyUp={commitScrub}
          className={`flex-1 cursor-pointer ${
            mode === "none" ? "accent-amber-400" : "accent-red-600"
          }`}
          aria-label={t("movies.player.seek", "Seek")}
        />
        <span className="min-w-[36px] text-end">
          {displayDuration > 0 ? formatClock(displayDuration) : "--:--"}
        </span>
        {mode === "bridged" && (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] whitespace-nowrap">
            {t("movies.player.synced", "Synced with player")}
          </span>
        )}
        {mode === "none" && hasSubtitles && (
          <span
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[9px] whitespace-nowrap"
            title={t(
              "movies.subs.clockHint",
              "The movie player is separate. Start/pause this clock together with the movie.",
            )}
          >
            <Timer size={11} /> {t("movies.subs.clock", "Subtitle clock")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={pill}
          onClick={handleTogglePlay}
          aria-label={
            clock.paused
              ? t("movies.player.play", "Play")
              : t("movies.player.pause", "Pause")
          }
        >
          {clock.paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <button
          type="button"
          className={pill}
          onClick={() => applySeek(time - 10, true)}
        >
          <RotateCcw size={12} /> 10s
        </button>
        <button
          type="button"
          className={pill}
          onClick={() => applySeek(time + 10, true)}
        >
          <RotateCw size={12} /> 10s
        </button>
      </div>
    </div>
  );
});
