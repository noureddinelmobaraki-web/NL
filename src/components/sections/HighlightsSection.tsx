import { memo } from 'react';
import { Music2, Play, Volume2, Maximize2 } from 'lucide-react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useFadeInOnView } from '../../hooks/useFadeInOnView';
import { useDevCSSVarCheck } from '../../utils/dev/cssVarCheck';
import { REQUIRED_HIGHLIGHTS_VARS } from '../../constants/cssVarLists';

interface HighlightsSectionProps {
  vaultPlaylistCoverUrl: string;
  youtubeHighlightsBgUrl: string;
  onOpenTube: () => void;
}

const S = {
  SHADOW: { textShadow: '2px 2px 0 var(--manga-shadow-color)' },
  VAULT_BG: { backgroundImage: 'var(--vault-playlist-bg)' },
  YT_BG: { backgroundImage: 'var(--yt-highlights-bg)' },
};

export const HighlightsSection = memo(function HighlightsSection({
  vaultPlaylistCoverUrl: _v,
  youtubeHighlightsBgUrl: _y,
  onOpenTube,
}: HighlightsSectionProps) {
  const resolvedTheme = useResolvedTheme();
  const sectionRef = useFadeInOnView<HTMLElement>();

  useDevCSSVarCheck(REQUIRED_HIGHLIGHTS_VARS, resolvedTheme, 'Highlights Check');

  return (
    <section
      ref={sectionRef}
      className="fade-in-section grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch"
    >
      <div className="flex flex-col gap-4">
        <h3 lang="en" className="font-manga text-xl font-bold bg-[var(--paper-color)] text-[var(--ink-color)] inline-block px-4 py-1 manga-border w-fit -rotate-2 shadow-[3px_3px_0px_var(--manga-shadow-color)] border-[var(--ink-color)]">
          ■ THE VAULT
        </h3>
        <a
          href="https://open.spotify.com/playlist/2NdDhxkVxypu1MkuVRCgId?si=R2iXNEuyQxOHwRwPPs_t7w"
          target="_blank"
          rel="noreferrer"
          id="vault-playlist"
          className="group relative overflow-hidden border-[3px] border-[var(--ink-color)] transition-all duration-300 hover:scale-[1.02] flex-1 min-h-[220px] highlights-vault-link"
        >
          <div
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.8] group-hover:brightness-100 transition-all"
            style={S.VAULT_BG}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-page)]/80 to-transparent flex flex-col justify-end p-4">
            <span className="font-hand text-3xl text-[var(--text-primary)]">NL fv songs of all time</span>
            <div className="flex items-center gap-2 mt-1">
              <Music2 className="w-5 h-5 text-[#1DB954]" />
              <span className="text-sm text-[var(--text-muted)] uppercase font-manga tracking-widest">Listen on Spotify</span>
            </div>
          </div>
        </a>
      </div>

      <div className="flex flex-col gap-4">
        <h3 lang="en" className="font-manga text-xl font-bold bg-[var(--ink-color)] text-[var(--text-inverse)] inline-block px-4 py-1 manga-border w-fit rotate-1 shadow-[3px_3px_0px_var(--manga-shadow-color)] border-[var(--border-strong)]">
          ■ VIDEOS
        </h3>
        <button
          type="button"
          onClick={onOpenTube}
          title="Watch NL videos"
          aria-label="Open the NL YouTube viewer"
          className="nl-hl-player group flex-1 min-h-[220px] w-full text-start cursor-pointer"
        >
          <span className="nl-hl-chrome" aria-hidden="true">
            <span className="nl-hl-dot nl-hl-dot--r" />
            <span className="nl-hl-dot nl-hl-dot--y" />
            <span className="nl-hl-dot nl-hl-dot--g" />
            <span className="nl-hl-chrome-title">NL YOUTUBE</span>
          </span>

          <span className="nl-hl-screen">
            <span className="nl-hl-thumb" style={S.YT_BG} aria-hidden="true" />
            <span className="nl-hl-scrim" aria-hidden="true" />
            <span className="nl-hl-play" aria-hidden="true">
              <Play className="nl-hl-play-icon" />
            </span>
            <span className="nl-hl-badge" style={S.SHADOW}>Watch on YouTube</span>
          </span>

          <span className="nl-hl-controls" aria-hidden="true">
            <Play className="nl-hl-ctl-icon" />
            <span className="nl-hl-track"><span className="nl-hl-progress" /></span>
            <span className="nl-hl-time">3:12</span>
            <Volume2 className="nl-hl-ctl-icon" />
            <Maximize2 className="nl-hl-ctl-icon" />
          </span>
        </button>
      </div>
    </section>
  );
});
