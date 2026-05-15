import { motion, Variants } from "framer-motion";
import { ASSETS } from "../../constants/assets";
import { ResponsiveImage } from "../ResponsiveImage";

import { useDeviceType } from '../../hooks/useDeviceType';

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

const STYLES = {
  SHADOW_BLACK_LG: { textShadow: '4px 4px 0px rgba(0,0,0,0.8)' },
  SHADOW_BLACK_SM: { textShadow: '2px 2px 0px rgba(0,0,0,0.5)' },
};

export const HeroSection = () => {
  const { isTablet } = useDeviceType();
  return (
    <motion.header 
      variants={itemVariants}
      className="flex flex-col md:flex-row items-end justify-between gap-6 w-full"
    >
      <div 
        lang="en"
        className="manga-border p-8 flex-1 min-w-[60%] relative group overflow-hidden border-[4px] border-black transition-all duration-500 hover:scale-[1.01] halftone-bg"
        id="header-card"
      >
        {/* Header Background Image with Zoom & Pan Hover Effect */}
        <div 
          className="absolute inset-0 z-[-1] bg-cover bg-center transition-all duration-700 blur-[3px] group-hover:blur-0 group-hover:scale-125 group-hover:translate-y-[-10%]"
          style={{ backgroundImage: `url('${ASSETS.profile.headerBg}')` }}
        />
        {/* Dark Overlay for Text Legibility */}
        <div className="absolute inset-0 z-[-1] bg-black/40 transition-opacity group-hover:opacity-30" />
        
        <h1 
          className="font-manga font-black uppercase tracking-tight text-white leading-none glitch-text"
          style={{ 
            fontSize: 'clamp(2rem, 6vw, 5rem)',
            ...STYLES.SHADOW_BLACK_LG 
          }}
          data-text="Noureddin El Mobaraki"
        >
          Noureddin El Mobaraki
        </h1>
        
        <div className="mt-6 flex items-center gap-4 text-white font-bold uppercase italic border-t-2 border-white/50 pt-4">
          <span className="text-xl font-manga" style={STYLES.SHADOW_BLACK_SM}>Casablanca 📍</span>
          <span className="text-sm bg-black text-white px-3 py-1 manga-border border-white/30 truncate">
            "NL" | "Nordine GB"
          </span>
        </div>
        <p 
          lang="en"
          className={`mt-4 font-hand ${isTablet ? 'text-xl' : 'text-2xl'} text-white leading-tight max-w-xl`}
          style={{ 
            textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.1)',
            filter: 'drop-shadow(2px 2px 2px #000)'
          }}
        >
          <span className="text-yellow-400">“24 years old.</span> Just a simple <span className="text-zinc-400">5/10</span> kind of person. I’m into <span className="border-b-2 border-dashed border-red-500">drawing</span>, cooking for fun, and overthinking <span className="text-cyan-300">random stuff</span> that probably helps nobody. That’s pretty much it.”
        </p>
      </div>

      {/* Profile Image Square Box */}
      <div 
        className={`manga-card bg-white p-0 flex flex-col items-center justify-center ${isTablet ? 'w-40 h-40' : 'w-48'} aspect-square hidden md:flex rotate-2 hover:rotate-0 transition-transform overflow-hidden border-[3px] border-black`}
      >
        <ResponsiveImage 
          src={ASSETS.profile.main} 
          alt="Profile" 
          className="w-full h-full object-cover" 
          loading="lazy"
        />
      </div>

    </motion.header>
  );
};
