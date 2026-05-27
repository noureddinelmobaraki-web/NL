import { motion } from 'framer-motion';
import { 
  Play
} from 'lucide-react';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';
import { useDeviceType } from '../../hooks/useDeviceType';

export function Win12Section() {
  const resolvedTheme = useResolvedTheme();
  const { isMobile } = useDeviceType();

  // Theme settings mapping matching the aesthetics
  const themeCardStyles = {
    light: {
      border: '2px solid rgba(0,0,0,0)',
      borderColor: '#FFF #999 #999 #FFF',
      boxShadow: '4px 4px 0 #444, 8px 8px 0 rgba(0,0,0,0.15)',
      containerBg: 'bg-[#F0EBE3]',
      headerBg: 'bg-gradient-to-r from-zinc-200 to-zinc-350',
      headerText: 'text-zinc-800 font-sans',
      title: 'win12_subsystem.exe',
      buttonClass: 'bg-[#CCCCCC] hover:bg-[#DDDDDD] text-black border border-zinc-650 shadow-[inset_1px_1px_0_#FFF,inset_-1px_-1px_0_#666,2px_2px_0_#000]',
    },
    dark: {
      border: '1px solid #1f1f1f',
      boxShadow: '0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(184,255,63,0.15)',
      containerBg: 'bg-[#111111]',
      headerBg: 'bg-[#151515]',
      headerText: 'text-[#B8FF3F] font-mono',
      title: 'win12_vmm_hypervisor.sh',
      buttonClass: 'bg-[#B8FF3F] hover:bg-[#a3e635] text-black hover:scale-105 duration-200 shadow-[0_0_15px_rgba(184,255,63,0.4)]',
    },
    bit: {
      border: '3px solid #ff00ff',
      boxShadow: '0 0 0 3px #00ffff, 0 0 0 6px #ff00ff',
      containerBg: 'bg-[#120b25]',
      headerBg: 'bg-[#2d1b69]',
      headerText: 'text-[#ff00ff] font-mono uppercase',
      title: 'WIN12_SANDBOX_8BIT.EXE',
      buttonClass: 'bg-[#2d1b69] hover:bg-[#ff00ff] border-2 border-[#ff00ff] text-[#00ffff] hover:text-black font-mono shadow-[3px_3px_0_#00ffff]',
    },
    midnight: {
      border: '1px solid #1e3a5f',
      boxShadow: '0 10px 30px rgba(12,25,41,0.5), 0 0 20px rgba(56,189,248,0.15)',
      containerBg: 'bg-[#0c1929]',
      headerBg: 'bg-[#091523]',
      headerText: 'text-[#38bdf8] font-sans',
      title: 'win12_container_host.o',
      buttonClass: 'bg-[#1e3a5f] hover:bg-[#2563eb] text-white border border-[#38bdf8] shadow-[0_4px_12px_rgba(56,189,248,0.2)] border-sky-450',
    }
  }[resolvedTheme] || {
    border: '1px solid #1f1f1f',
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
    containerBg: 'bg-[#111111]',
    headerBg: 'bg-[#151515]',
    headerText: 'text-[#B8FF3F] font-mono',
    title: 'win12_system.sh',
    buttonClass: 'bg-[#B8FF3F] hover:bg-[#a3e635] text-black',
  };

  const handleLaunch = () => {
    if (isMobile) {
      const confirmOpen = window.confirm("هذه التجربة مصممة ومحسنة لأجهزة الكمبيوتر. هل ترغب في فتحها على أي حال؟");
      if (!confirmOpen) return;
    }
    window.open(`${import.meta.env.BASE_URL}win12/desktop.html`, '_blank');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 select-none" id="win12-launcher-section">
      <div className="text-center mb-6">
        <p className="text-sm font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-5 py-2.5 inline-block rounded-xl shadow-sm tracking-wide">
          هاته الخصية موجهة للحواسيب فقط
        </p>
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full"
      >
        <div
          className={`rounded-xl overflow-hidden w-full border transition-all duration-300`}
          style={{
            backgroundColor: themeCardStyles.containerBg,
            borderColor: resolvedTheme === 'light' ? '#71717a' : undefined,
            border: themeCardStyles.border,
            boxShadow: themeCardStyles.boxShadow,
            imageRendering: resolvedTheme === 'bit' ? 'pixelated' : 'auto'
          }}
        >
          {/* Theme-Aware OS Container Header */}
          <div className={`px-4 py-2.5 text-[10px] font-bold tracking-wider flex items-center justify-between border-b ${
            resolvedTheme === 'dark' ? 'bg-[#151515] text-[#B8FF3F] border-[#1c1c1c] font-mono' :
            resolvedTheme === 'bit' ? 'bg-[#2d1b69] text-[#ff00ff] border-[#ff00ff] font-mono' :
            resolvedTheme === 'light' ? 'bg-[#CCCCCC] text-black border-zinc-400 font-sans shadow-[inset_1px_1px_0_#FFF,inset_-1px_-1px_0_#999]' :
            'bg-[#091523] text-[#38bdf8] border-[#11243d] font-sans'
          }`}>
            <span className="flex items-center gap-1.5 uppercase">
              <span className="inline-block w-2 h-2 rounded-full animate-pulse bg-green-500" />
              {themeCardStyles.title}
            </span>
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            </div>
          </div>

          {/* Poster Card */}
          <div 
            onClick={handleLaunch}
            className="relative w-full h-[320px] overflow-hidden cursor-pointer group"
          >
            <img 
              src="https://noureddinelmobaraki-web.github.io/nl-audio-cdn/win12.webp"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              alt="NL OS Background Preview"
              referrerPolicy="no-referrer"
            />
            {/* Dark overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/30" />
            
            {/* Centered Typography & Launch Control */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center gap-5">
              <div className="flex flex-col gap-1.5">
                <h3 className="text-white text-3xl md:text-4xl font-black tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
                  NL OS
                </h3>
                <p className="text-zinc-200 text-sm md:text-base font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]" style={{ direction: 'rtl' }}>
                   OoO   
                </p>
              </div>

              <div
                className={`py-2 px-6 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transform transition-all group-hover:scale-105 active:scale-95 duration-200 rounded shadow-md ${themeCardStyles.buttonClass}`}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                LAUNCH
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
