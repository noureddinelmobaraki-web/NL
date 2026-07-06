import { memo } from 'react';
import type { YouTubeVideo } from './types';
import { formatDate, formatViews, formatDuration } from './format';

interface VideoCardProps {
  video: YouTubeVideo;
  active: boolean;
  onSelect: (id: string) => void;
}

export const VideoCard = memo(function VideoCard({ video, active, onSelect }: VideoCardProps) {
  const cls = active ? 'nl-tube-card is-active' : 'nl-tube-card';
  return (
    <button className={cls} onClick={() => onSelect(video.id)}>
      <span className="nl-tube-card-thumb">
        <img src={video.thumbnail} alt={video.title} loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        {video.duration ? <span className="nl-tube-card-dur">{formatDuration(video.duration)}</span> : null}
      </span>
      <span className="nl-tube-card-body">
        <span className="nl-tube-card-title">{video.title}</span>
        <span className="nl-tube-card-meta">
          {formatDate(video.publishedAt)}{video.viewCount ? ' · ' + formatViews(video.viewCount) : ''}
        </span>
      </span>
    </button>
  );
});
