import { Variants } from "framer-motion";
import { ASSETS } from "../../constants/assets";

import { isAutomatedEnv } from '../../utils/env';

export const CONFIG_ASSETS = {
  mainBackground: ASSETS.profile.heroBg,
  nameHeaderBg: ASSETS.profile.headerBg,
  footerDecoration: ASSETS.profile.footerDeco,
  profileImg: ASSETS.profile.main,
  vaultPlaylistCover: ASSETS.songs.playlistCover,
  youtubeHighlightsBg: ASSETS.songs.ytHighlights,
};

const isAutomated = isAutomatedEnv();

export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { 
      staggerChildren: isAutomated ? 0 : 0.15, 
      delayChildren: isAutomated ? 0 : 0.3 
    }
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
