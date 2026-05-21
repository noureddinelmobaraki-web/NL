import { motion, Variants } from "framer-motion";
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

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

const SPOTIFY_ICON = "https://img.icons8.com/plasticine/1200/spotify--v2.jpg";

export const StreamingSection = () => {
  const resolvedTheme = useResolvedTheme();
  return (
    <main className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Streaming Platforms Section */}
      <motion.section variants={itemVariants} className="flex flex-col gap-6" lang="en">
        {resolvedTheme === 'light' ? (
          <div
            style={{
              background: 'linear-gradient(180deg, #CCCCCC 0%, #AAAAAA 100%)',
              border: '1px solid #999',
              padding: '4px 8px',
              fontFamily: 'Geneva, "Lucida Sans Unicode", sans-serif',
              fontSize: '11px',
              fontWeight: 'bold',
              boxShadow: '3px 3px 0px #666, 5px 5px 0px #444',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              width: '100%',
              userSelect: 'none',
              height: '24px',
            }}
          >
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F56', border: '0.5px solid #E0443E' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E', border: '0.5px solid #DEA123' }} />
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#27C93F', border: '0.5px solid #1AAB29' }} />
            </div>
            <span style={{ color: '#000', flex: 1, textAlign: 'center' }}>
              STREAMING_PLATFORMS.exe
            </span>
          </div>
        ) : (
          <h2 className={`inline-block px-5 py-2 w-fit shadow-[4px_4px_0px_var(--manga-shadow-color)] border-[var(--ink-color)] ${resolvedTheme === 'dark' ? 'bg-transparent border border-[#B8FF3F] text-[#B8FF3F] text-[0.8rem] tracking-[0.2em] uppercase font-mono' : 'font-manga text-2xl font-bold bg-[var(--paper-color)] text-[var(--ink-color)] manga-border -rotate-1'}`}>
            ■ STREAMING PLATFORMS
          </h2>
        )}
        {resolvedTheme !== 'light' && <div className="manga-divider" />}
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STREAMING_PLATFORMS.map((platform, idx) => (
            <div
              key={platform.name}
              id={`stream-${idx}`}
              style={resolvedTheme === 'light' ? {
                border: '1px solid #999',
                boxShadow: 'inset 1px 1px 0 #fff, inset -1px -1px 0 #555, 2px 2px 0px #999',
                background: '#F0EBE3',
                display: 'flex',
                flexDirection: 'column',
              } : {}}
            >
              {resolvedTheme === 'light' && (
                <div
                  style={{
                    background: 'linear-gradient(180deg, #CCCCCC 0%, #AAAAAA 100%)',
                    borderBottom: '1px solid #999',
                    padding: '2px 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    height: '16px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '3px' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF5F56', border: '0.5px solid #E0443E' }} />
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FFBD2E', border: '0.5px solid #DEA123' }} />
                  </div>
                  <span
                    style={{
                      fontFamily: 'Geneva, sans-serif',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      color: '#000',
                      textAlign: 'center',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {platform.name}
                  </span>
                  <div style={{ width: 12 }} />
                </div>
              )}
              <a
                href={platform.url}
                target="_blank"
                rel="noreferrer"
                className={resolvedTheme === 'dark' ? 
                  'bg-transparent border border-white/20 text-white text-[0.65rem] tracking-[0.15em] uppercase hover:bg-white hover:text-black transition-all duration-300 font-mono flex items-center justify-center p-4 h-full text-center' : 
                  (resolvedTheme === 'light' ? 
                    'bg-[#F0EBE3] text-black text-[0.7rem] font-bold p-3 flex items-center justify-between hover:bg-[#DDD] transition-all flex-1' : 
                    `manga-button flex items-center gap-3 group manga-card-hover ${platform.isSpotify ? 'spotify-king' : ''}`
                  )
                }
                style={resolvedTheme === 'light' ? {
                  fontFamily: 'Geneva, sans-serif'
                } : {}}
              >
                {resolvedTheme === 'dark' ? (
                  <span>{platform.name}</span>
                ) : resolvedTheme === 'light' ? (
                  <>
                    <span className="text-[#000080]" style={{ fontFamily: 'Geneva, sans-serif' }}>Open Link</span>
                    <ExternalLink className="w-3 h-3 text-[#0000CC]" />
                  </>
                ) : (
                  <>
                    {platform.isSpotify ? (
                      <img 
                        src={SPOTIFY_ICON} 
                        alt="Spotify" 
                        className="w-8 h-8 shrink-0 object-contain drop-shadow-[0_0_8px_#1DB954]" 
                        referrerPolicy="no-referrer" 
                        loading="lazy" 
                      />
                    ) : (
                      <platform.icon className="w-6 h-6 shrink-0" aria-hidden="true" />
                    )}
                    <span className="text-base sm:text-lg whitespace-nowrap overflow-hidden text-ellipsis">{platform.name}</span>
                  </>
                )}
              </a>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Social Channels Section */}
      <motion.section variants={itemVariants} className="flex flex-col gap-6" lang="en">
        {resolvedTheme === 'light' ? (
          <div
            style={{
              background: 'linear-gradient(180deg, #CCCCCC 0%, #AAAAAA 100%)',
              border: '1px solid #999',
              padding: '3px 12px',
              fontFamily: 'Geneva, sans-serif',
              fontSize: '11px',
              fontWeight: 'bold',
              boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000',
              display: 'inline-block',
              width: 'fit-content'
            }}
          >
            SOCIAL_CHANNELS
          </div>
        ) : (
          <h2 className={`inline-block px-5 py-2 w-fit shadow-[4px_4px_0px_var(--manga-shadow-color)] border-[var(--ink-color)] ${resolvedTheme === 'dark' ? 'bg-transparent border border-[#B8FF3F] text-[#B8FF3F] text-[0.8rem] tracking-[0.2em] uppercase font-mono' : 'font-manga text-2xl font-bold bg-[var(--paper-color)] text-[var(--ink-color)] manga-border rotate-1'}`}>
            ■ SOCIAL CHANNELS
          </h2>
        )}
        {resolvedTheme !== 'light' && <div className="manga-divider" />}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOCIAL_CHANNELS.map((channel, idx) => (
          <a
            key={channel.name}
            id={`social-${idx}`}
            href={channel.url}
            target="_blank"
            rel="noreferrer"
            className={resolvedTheme === 'dark' ? 
              'bg-transparent border border-white/20 text-white text-[0.65rem] tracking-[0.15em] uppercase hover:bg-white hover:text-black transition-all duration-300 font-mono flex items-center justify-center p-4' : 
              (resolvedTheme === 'light' ? 
                'bg-[#F0EBE3] border border-[#999] text-black text-[0.75rem] font-bold p-4 flex items-center justify-between hover:bg-[#DDD] transition-all' : 
                'manga-button flex justify-between items-center group overflow-hidden'
              )
            }
            style={resolvedTheme === 'dark' ? {} : (resolvedTheme === 'light' ? {
              boxShadow: 'inset 1px 1px 0px #FFF, inset -1px -1px 0px #555, 1px 1px 0px #000',
              fontFamily: 'Geneva, sans-serif'
            } : { 
              transform: `rotate(${idx % 2 === 0 ? '-0.5deg' : '0.5deg'})`,
              borderRadius: '8px 15px 5px 22px / 22px 5px 15px 8px'
            })}
          >
            {resolvedTheme === 'dark' ? (
              <span>{channel.name}</span>
            ) : resolvedTheme === 'light' ? (
              <>
                <div className="flex items-center gap-3">
                  <channel.icon className="w-4 h-4 text-[#0000CC]" aria-hidden="true" />
                  <span>{channel.name}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-[#0000CC]" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <channel.icon className="w-6 h-6" aria-hidden="true" />
                  <span className="text-xl">{channel.name}</span>
                </div>
                <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
              </>
            )}
          </a>
        ))}
      </div>
      </motion.section>
    </main>
  );
};
