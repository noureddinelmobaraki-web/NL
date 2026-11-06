/**
 * src/features/liquid-glass/stages/audiobooks/components/ResumeStrip.tsx
 *
 * Horizontal strip of saved listening progress records.
 */

import React from 'react';
import { Play } from 'lucide-react';
import type { AudiobookItem } from '../../../services/types';
import type { AudiobookProgressRecord } from '../hooks/useListeningProgress';

export function formatDurationClock(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return '0:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export interface ResumeStripProps {
  records: AudiobookProgressRecord[];
  onResume: (book: AudiobookItem, autoResume?: boolean) => void;
}

export const ResumeStrip: React.FC<ResumeStripProps> = ({ records, onResume }) => {
  if (records.length === 0) return null;

  return (
    <div className="lg-resume-tubes-strip" onClick={(e) => e.stopPropagation()}>
      {records.map((rec) => (
        <button
          key={rec.audiobookId}
          type="button"
          onClick={() =>
            onResume(
              {
                id: rec.audiobookId,
                iaId: rec.iaId,
                title: rec.title,
                author: rec.author,
                coverUrl: rec.coverUrl,
                source: 'Saved',
              },
              true,
            )
          }
          className="lg-track-tube lg-resume-tube-item"
        >
          <span className="lg-orb-capsule-caustic" aria-hidden="true" />
          <span className="lg-orb-capsule-sheen" aria-hidden="true" />
          <span className="lg-tube-play-btn lg-tube-play-btn--sm">
            <Play size={13} fill="currentColor" />
          </span>
          <div className="lg-resume-tube-item__meta">
            <span className="lg-resume-tube-item__title">{rec.title}</span>
            <span className="lg-resume-tube-item__sub">
              Resume Ch. {rec.chapterIndex + 1} · {formatDurationClock(rec.currentTime)}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};
