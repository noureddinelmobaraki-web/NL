import { motion, Variants } from "framer-motion";
import { Music2, Youtube } from "lucide-react";
import { ResponsiveImage } from "../ResponsiveImage";

interface HighlightsSectionProps {
  vaultPlaylistCoverUrl: string;
  youtubeHighlightsBgUrl: string;
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

const STYLES = {
  SHADOW_BLACK_SOLID: { textShadow: '2px 2px 0 var(--manga-shadow-color)' },
};

export const HighlightsSection = ({ 
  vaultPlaylistCoverUrl, 
  youtubeHighlightsBgUrl 
}: HighlightsSectionProps) => {
  return (
    <motion.section 
      variants={itemVariants}
      className="grid grid-cols-1 md:grid-cols-2 gap-8"
    >
      {/* The Vault - Playlist Section */}
      <div className="flex flex-col gap-4">
        <h3 lang="en" className="font-manga text-xl font-bold bg-[var(--paper-color)] text-[var(--ink-color)] inline-block px-4 py-1 manga-border w-fit -rotate-2 shadow-[3px_3px_0px_var(--manga-shadow-color)] border-[var(--ink-color)]">
          ■ THE VAULT
        </h3>
        <a 
          href="https://open.spotify.com/playlist/2NdDhxkVxypu1MkuVRCgId?si=R2iXNEuyQxOHwRwPPs_t7w"
          target="_blank"
          rel="noreferrer"
          id="vault-playlist"
          className="group relative overflow-hidden border-[3px] border-[var(--ink-color)] transition-all duration-300 hover:scale-[1.02] flex-1 min-h-[200px]"
          style={{ borderRadius: '12px 5px 18px 8px / 8px 18px 5px 12px' }}
        >
          <ResponsiveImage 
            src={vaultPlaylistCoverUrl} 
            alt="NL fv songs of all time" 
            className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 transition-all"
            loading="lazy"
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

      {/* YouTube Highlights Section */}
      <div className="flex flex-col gap-4">
        <h3 lang="en" className="font-manga text-xl font-bold bg-[var(--ink-color)] text-[var(--text-inverse)] inline-block px-4 py-1 manga-border w-fit rotate-1 shadow-[3px_3px_0px_var(--manga-shadow-color)] border-[var(--border-strong)]">
          ■ HIGHLIGHTS
        </h3>
        <a 
          href="https://www.youtube.com/@nourdin_el_mobaraki"
          target="_blank"
          rel="noreferrer"
          className="group relative overflow-hidden border-[3px] border-[var(--ink-color)] transition-all duration-300 hover:scale-[1.02] flex-1 min-h-[200px]"
          style={{ borderRadius: '5px 15px 8px 20px / 15px 8px 20px 5px' }}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
            style={{ backgroundImage: `url('${youtubeHighlightsBgUrl}')` }}
          />
          <div className="absolute inset-0 bg-[var(--bg-page)]/40 group-hover:bg-[var(--bg-page)]/20 transition-colors" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <Youtube className="w-16 h-16 text-[var(--text-primary)] drop-shadow-[0_0_15px_red] mb-2" />
            <span className="font-manga text-3xl text-[var(--text-primary)] uppercase tracking-tighter" style={STYLES.SHADOW_BLACK_SOLID}>
              Watch on YouTube
            </span>
          </div>
        </a>
      </div>
    </motion.section>
  );
};
