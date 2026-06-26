import React from 'react';
import { useNowPlaying } from '../hooks/useNowPlaying';
import styles from '../music.module.css';

export function ProgressBar() {
  const {
    currentTime,
    duration,
    formattedCurrentTime,
    formattedDuration,
    seek
  } = useNowPlaying();

  const max = duration && isFinite(duration) && duration > 0 ? duration : 0;
  const pct = max > 0 ? Math.min(100, Math.max(0, (currentTime / max) * 100)) : 0;

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seek(parseFloat(e.target.value));
  };

  return (
    <div className={styles['nlp-seek']}>
      <div className={styles['nlp-seek__track']}>
        <div className={styles['nlp-seek__fill']} style={{ width: `${pct}%` }} />
        {/* فقاعة الرأس */}
        <div className={styles['nlp-seek__bubble']} style={{ left: `${pct}%` }} aria-hidden />
      </div>
      {/* مدخل شفّاف فوق الشريط للسحب (لا ارتفاع بصري) */}
      <input
        type="range" 
        min={0} 
        max={max || 1} 
        step={0.1}
        value={Math.min(currentTime, max || 1)}
        onChange={handleProgressChange}
        className={styles['nlp-seek__input']}
        aria-label="Seek"
      />
      <div className="flex justify-between text-[11px] font-mono text-slate-600 mt-1">
        <span>{formattedCurrentTime}</span>
        <span>{formattedDuration}</span>
      </div>
    </div>
  );
}
