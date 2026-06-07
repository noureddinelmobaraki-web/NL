import { useEffect, memo } from 'react';
import { 
  Instagram, 
  Facebook, 
  Music2, 
  Disc, 
  Cloud, 
  Video, 
  ExternalLink,
} from "lucide-react";
import { StreamingPlatform, SocialChannel } from "../../types";
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useDeviceType } from '../../hooks/useDeviceType'; // MOBILE-ONLY
import { getLocalAssetUrl } from '../../constants/assets';
import { useFadeInOnView } from '../../hooks/useFadeInOnView';

const STREAMING_PLATFORMS: StreamingPlatform[] = [
  {
    name: "Spotify",
    url: "https://open.spotify.com/artist/5nwGOyilF1p4uv35v6vb2u",
    icon: Music2,
    color: "#1DB954",
    isSpotify: true,
  },
  {
    name: "Apple Music",
    url: "https://music.apple.com/us/artist/nl/1535833912",
    icon: Music2,
    color: "#FA243C",
  },
  {
    name: "Deezer",
    url: "https://www.deezer.com/en/artist/362375722",
    icon: Disc,
    color: "#FF0000",
  },
  {
    name: "Amazon Music",
    url: "https://music.amazon.fr/artists/B0025ODH90/nl",
    icon: Music2,
    color: "#00A8E1",
  },
  {
    name: "Anghami",
    url: "https://play.anghami.com/artist/1430009",
    icon: Music2,
    color: "#ED1B24",
  },
  {
    name: "SoundCloud",
    url: "https://on.soundcloud.com/Ok8zBgOjCPqjvStEA",
    icon: Cloud,
    color: "#FF3300",
  },
];

const SOCIAL_CHANNELS: SocialChannel[] = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/nordine_el_mobaraki/",
    icon: Instagram,
    color: "#E4405F",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@nourdine_el_mobaraki",
    icon: Video,
    color: "#000000",
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61558584390374",
    icon: Facebook,
    color: "#1877F2",
  },
];

const SpotifyLogo = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <path
      fill="#1DB954"
      d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.196.287-.573.373-.86.177-2.292-1.558-5.268-1.887-8.877-1.06-.328.075-.654-.128-.73-.457-.075-.328.128-.654.457-.73 3.941-.902 7.242-.52 9.833 1.238.287.196.373.573.177.86zm1.257-2.692c-.247.362-.724.47-1.086.223-2.44-1.657-6.187-2.096-9.113-1.208-.409.124-.845-.109-.969-.518-.124-.408.109-.844.518-.968 3.348-1.017 7.485-.516 10.287 1.386.362.246.47.724.223 1.085zm.096-2.774c-2.88-1.915-7.858-2.097-10.722-1.228-.492.149-1.02-.128-1.17-.62-.149-.492.128-1.02.62-1.17 3.305-1.005 8.793-.8 12.14 1.42.445.295.568.89.273 1.335-.295.445-.89.568-1.335.273z"
    />
  </svg>
);

export const StreamingSection = memo(() => {
  const resolvedTheme = useResolvedTheme();
  const { isMobile, isTablet } = useDeviceType(); // MOBILE-ONLY
  const section1Ref = useFadeInOnView<HTMLElement>();
  const section2Ref = useFadeInOnView<HTMLElement>();

  // Runtime CSS variable assertion
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const REQUIRED_STREAMING_VARS = [
        '--streaming-titlebar-display',
        '--streaming-h2-display',
        '--streaming-divider-display',
        '--social-titlebar-display',
        '--social-h2-display',
        '--stream-card-border',
        '--stream-card-shadow',
        '--stream-card-bg',
        '--stream-card-flex-dir',
        '--stream-mini-titlebar-display',
        '--stream-content-dark-display',
        '--stream-content-light-display',
        '--stream-content-default-display',
        '--social-content-dark-display',
        '--social-content-light-display',
        '--social-content-default-display',
        '--social-card-rotate',
        '--social-card-radius',
        '--social-card-shadow'
      ];
      const style = getComputedStyle(document.documentElement);
      REQUIRED_STREAMING_VARS.forEach((v) => {
        const value = style.getPropertyValue(v).trim();
        if (!value) {
          console.warn(`[Theme Check] Warning: Required CSS variable "${v}" is not resolved in active theme.`);
        }
      });
    }
  }, [resolvedTheme]);

  return (
    <main className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Streaming Platforms Section */}
      <section ref={section1Ref} className="fade-in-section flex flex-col gap-6" lang="en">
        <div className="streaming-header-container">
          {/* Titlebar Style for light theme */}
          <div className="streaming-titlebar-refactored">
            <div className="stream-titlebar-dots">
              <div className="stream-titlebar-dot red" />
              <div className="stream-titlebar-dot yellow" />
              <div className="stream-titlebar-dot green" />
            </div>
            <span className="text-black flex-1 text-center">STREAMING_PLATFORMS.exe</span>
          </div>

          {/* Header 2 Style for standard themes */}
          <h2 className="streaming-h2-refactored px-5 py-2 select-none">
            ■ STREAMING PLATFORMS
          </h2>
        </div>

        {/* Divider */}
        <div className="manga-divider streaming-divider-refactored" />

        {/* Streaming Cards Grid Container */}
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-2 min-[480px]:grid-cols-3' // MOBILE-ONLY
            : isTablet 
              ? 'grid-cols-5' // MOBILE-ONLY
              : 'grid-cols-2 md:grid-cols-3'
        }`}>
          {STREAMING_PLATFORMS.map((platform, idx) => (
            <div
              key={platform.name}
              id={`stream-${idx}`}
              className="stream-card-container"
            >
              {/* Mini Window Header (visible in light theme only) */}
              <div className="stream-mini-titlebar">
                <div className="stream-titlebar-dots">
                  <div className="stream-titlebar-dot mini red" />
                  <div className="stream-titlebar-dot mini yellow" />
                </div>
                <span className="stream-mini-titlebar-text">{platform.name}</span>
                <div className="stream-spacer-12" />
              </div>

              {/* Underlying Unified Anchor element styled via CSS custom properties */}
              <a
                href={platform.url}
                target="_blank"
                rel="noreferrer"
                className={`stream-link-refactored manga-button group manga-card-hover ${platform.isSpotify ? 'spotify-king' : ''}`}
              >
                {/* Dark Theme Content */}
                <span className="stream-link-content-dark">{platform.name}</span>

                {/* Light Theme Content */}
                <span className="stream-link-content-light">
                  <span className="text-[#000080]" style={{ fontFamily: 'Geneva, sans-serif' }}>Open Link</span>
                  <ExternalLink className="w-3 h-3 text-[#0000CC]" />
                </span>

                {/* Midnight / Bit Theme Content */}
                <span className="stream-link-content-default">
                  {platform.isSpotify ? (
                    <SpotifyLogo className="w-8 h-8 shrink-0 drop-shadow-[0_0_8px_#1DB954]" />
                  ) : platform.name === "Apple Music" ? (
                    <img 
                      src={getLocalAssetUrl('apple-music.svg')} 
                      className="w-6 h-6 shrink-0 object-contain" 
                      style={{ filter: 'invert(1)' }} 
                      alt={`${platform.name} logo`} 
                    />
                  ) : (
                    <platform.icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                  )}
                  <span className="text-base sm:text-lg whitespace-nowrap overflow-hidden text-ellipsis">{platform.name}</span>
                </span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Social Channels Section */}
      <section ref={section2Ref} className="fade-in-section flex flex-col gap-6" lang="en">
        <div className="social-header-container">
          {/* Titlebar Style for light theme */}
          <div className="social-titlebar-refactored">
            SOCIAL_CHANNELS
          </div>

          {/* Header 2 Style for standard themes */}
          <h2 className="social-h2-refactored px-5 py-2 select-none">
            ■ SOCIAL CHANNELS
          </h2>
        </div>

        {/* Divider */}
        <div className="manga-divider streaming-divider-refactored" />

        {/* Social Cards Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SOCIAL_CHANNELS.map((channel, idx) => (
            <a
              key={channel.name}
              id={`social-${idx}`}
              href={channel.url}
              target="_blank"
              rel="noreferrer"
              className="social-link-refactored manga-button group overflow-hidden"
              style={{
                transform: `rotate(calc(${idx % 2 === 0 ? '-1' : '1'} * var(--social-card-rotate)))`,
                borderRadius: 'var(--social-card-radius)',
                boxShadow: 'var(--social-card-shadow)',
              }}
            >
              {/* Dark Theme Content */}
              <span className="social-link-content-dark">{channel.name}</span>

              {/* Light Theme Content */}
              <span className="social-link-content-light">
                <span className="flex items-center gap-3">
                  <channel.icon className="w-4 h-4 text-[#0000CC]" aria-hidden="true" />
                  <span>{channel.name}</span>
                </span>
                <ExternalLink className="w-3 h-3 text-[#0000CC]" />
              </span>

              {/* Midnight / Bit Theme Content */}
              <span className="social-link-content-default">
                <span className="flex items-center gap-4">
                  <channel.icon className="w-6 h-6" aria-hidden="true" />
                  <span className="text-xl">{channel.name}</span>
                </span>
                <ExternalLink className={`w-4 h-4 opacity-0 transition-opacity ${
                  isMobile ? 'group-active:opacity-100' : 'group-hover:opacity-100' // MOBILE-ONLY
                }`} aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
});
