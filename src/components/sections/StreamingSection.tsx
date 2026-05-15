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
  return (
    <main className="grid grid-cols-1 md:grid-cols-2 gap-10">
      {/* Streaming Platforms Section */}
      <motion.section variants={itemVariants} className="flex flex-col gap-6" lang="en">
        <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit -rotate-1 shadow-[4px_4px_0px_#000]">
          ■ STREAMING PLATFORMS
        </h2>
        <div className="manga-divider" />
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {STREAMING_PLATFORMS.map((platform, idx) => (
            <div
              key={platform.name}
              id={`stream-${idx}`}
            >
              <a
                href={platform.url}
                target="_blank"
                rel="noreferrer"
                className={`manga-button flex items-center gap-3 group manga-card-hover ${platform.isSpotify ? 'spotify-king' : ''}`}
              >
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
              </a>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Social Channels Section */}
      <motion.section variants={itemVariants} className="flex flex-col gap-6" lang="en">
        <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit rotate-1 shadow-[4px_4px_0px_#000]">
          ■ SOCIAL CHANNELS
        </h2>
        <div className="manga-divider" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SOCIAL_CHANNELS.map((channel, idx) => (
          <a
            key={channel.name}
            id={`social-${idx}`}
            href={channel.url}
            target="_blank"
            rel="noreferrer"
            className="manga-button flex justify-between items-center group overflow-hidden"
            style={{ 
              transform: `rotate(${idx % 2 === 0 ? '-0.5deg' : '0.5deg'})`,
              borderRadius: '8px 15px 5px 22px / 22px 5px 15px 8px'
            }}
          >
            <div className="flex items-center gap-4">
              <channel.icon className="w-6 h-6" aria-hidden="true" />
              <span className="text-xl">{channel.name}</span>
            </div>
            <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
          </a>
        ))}
      </div>
      </motion.section>
    </main>
  );
};
