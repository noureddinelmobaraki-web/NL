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
  vaultPlaylistCoverUrl,
  youtubeHighlightsBgUrl: _y,
  onOpenTube,
}: HighlightsSectionProps) {
  const resolvedTheme = useResolvedTheme();
  const sectionRef = useFadeInOnView<HTMLElement>();

  useDevCSSVarCheck(REQUIRED_HIGHLIGHTS_VARS, resolvedTheme, 'Highlights Check');

  const vaultBgStyle = {
    backgroundImage: `var(--vault-playlist-bg, url('${vaultPlaylistCoverUrl || '/images/vault-playlist.webp'}'))`,
  };

  return (
    <section
      ref={sectionRef}
      className="fade-in-section grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch"
    >
      <div className="flex flex-col gap-4">
        <h3 lang="en" className="nl-lc-badge font-manga text-lg font-bold w-fit">
          ■ THE VAULT
        </h3>
        <a
          href="https://open.spotify.com/playlist/2NdDhxkVxypu1MkuVRCgId?si=R2iXNEuyQxOHwRwPPs_t7w"
          target="_blank"
          rel="noreferrer"
          id="vault-playlist"
          className="group relative overflow-hidden transition-all duration-300 flex-1 min-h-[220px] highlights-vault-link"
        >
          <div
            className="nl-vault-cover-bg absolute inset-0 bg-cover bg-center filter brightness-[0.86] group-hover:brightness-100 group-hover:scale-[1.04] transition-all duration-500"
            style={vaultBgStyle}
          />
          <div className="nl-vault-content-overlay absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-5">
            <span className="font-hand text-3xl text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">NL fv songs of all time</span>
            <div className="flex items-center gap-2 mt-1.5">
              <Music2 className="w-5 h-5 text-[#1DB954] drop-shadow-[0_0_8px_rgba(29,185,84,0.5)]" />
              <span className="text-sm text-white/85 uppercase font-manga tracking-widest">Listen on Spotify</span>
            </div>
          </div>
        </a>
      </div>


      <div className="flex flex-col gap-4">
        <h3 lang="en" className="nl-lc-badge font-manga text-lg font-bold w-fit">
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
