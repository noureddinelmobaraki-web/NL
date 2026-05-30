import { Variants } from "framer-motion";
import { ASSETS } from "../../constants/assets";

export const CONFIG_ASSETS = {
  mainBackground: ASSETS.profile.heroBg,
  nameHeaderBg: ASSETS.profile.headerBg,
  footerDecoration: ASSETS.profile.footerDeco,
  profileImg: ASSETS.profile.main,
  vaultPlaylistCover: ASSETS.songs.playlistCover,
  youtubeHighlightsBg: ASSETS.songs.ytHighlights,
};

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 }
  }
};

export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

export const ME_BIT_IMAGES = ASSETS.profile.me_bits;
