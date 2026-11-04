import React, { useEffect, useState } from "react";
import type { SubtitleCue } from "../../../services/videoExtractor";
import { clockNow } from "../player/playbackClock";
import { buildSubtitleTextStyle, useSubtitlePrefs } from "./subtitlePrefs";

export function findActiveCueText(cues: SubtitleCue[], t: number): string {
  let lo = 0;
  let hi = cues.length - 1;
  let idx = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (cues[mid].start <= t) { idx = mid; lo = mid + 1; } else hi = mid - 1;
  }
  const out: string[] = [];
  for (let i = idx; i >= 0 && i > idx - 4; i -= 1) if (cues[i].end > t) out.unshift(cues[i].text);
  return out.join("\n");
}

/** offsetSec > 0 delays subtitles (show later). */
export const SubtitleOverlay = React.memo(function SubtitleOverlay({
  cues,
  offsetSec,
  liftPx = 0,
}: {
  cues: SubtitleCue[];
  offsetSec: number;
  liftPx?: number;
}) {
  const prefs = useSubtitlePrefs();
  const [text, setText] = useState("");

  useEffect(() => {
    if (!cues.length) { setText(""); return undefined; }
    let raf = 0;
    let last = "\u0000";
    const tick = () => {
      const next = findActiveCueText(cues, clockNow() - offsetSec);
      if (next !== last) { last = next; setText(next); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cues, offsetSec]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[40] flex justify-center px-[4%]"
      style={{ bottom: `calc(${prefs.bottomPercent}% + ${liftPx}px)`, containerType: "inline-size" } as React.CSSProperties}
      aria-hidden={!text}
    >
      {text && (
        <span
          dir="auto"
          className="max-w-[88%] whitespace-pre-line text-center rounded-lg px-[0.45em] py-[0.1em] transition-opacity duration-100"
          style={buildSubtitleTextStyle(prefs)}
        >
          {text}
        </span>
      )}
    </div>
  );
});
