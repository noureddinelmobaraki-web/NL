import { useRef, useState } from 'react';
import { m } from 'framer-motion';
import { spring } from '../../motion/tokens';

interface MeButtonProps {
  onClick: () => void;
  imageUrl: string;
}

export function MeButton({ onClick, imageUrl }: MeButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;

    // Limit rotation to maximum 15 degrees
    const rX = -(mouseY / (rect.height / 2)) * 15;
    const rY = (mouseX / (rect.width / 2)) * 15;

    setTilt({ x: rX, y: rY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div className="relative flex flex-col items-center justify-center py-6">
      {/* Spinning glow orb behind the button */}
      <div 
        className="absolute w-44 h-44 rounded-full bg-gradient-to-tr from-[#3cdc82]/25 via-sky-500/10 to-[#5db8ff]/25 blur-xl animate-spin pointer-events-none"
        style={{ animationDuration: '10s', mixBlendMode: 'plus-lighter' }}
      />

      {/* 3D tilt interactive container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={onClick}
        className="relative z-10 cursor-pointer group"
        style={{ perspective: 1000 }}
      >
        <m.div
          animate={{
            rotateX: tilt.x,
            rotateY: tilt.y,
            scale: 1.05
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          transition={spring.soft}
          className="nl-me-btn w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-white/20 hover:border-[#3cdc82]/60 shadow-[0_12px_36px_rgba(0,0,0,0.5),_inset_0_1px_2px_rgba(255,255,255,0.45)] group-hover:shadow-[0_16px_48px_rgba(0,0,0,0.65),_0_0_20px_rgba(60,220,130,0.3)] transition-all duration-300 overflow-hidden bg-slate-900"
        >
          {/* Main Avatar image */}
          <img
            src={imageUrl}
            alt="Noureddine M."
            className="w-full h-full object-cover rounded-full"
            referrerPolicy="no-referrer"
          />

          {/* Liquid highlight gloss overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        </m.div>
      </div>
    </div>
  );
}
