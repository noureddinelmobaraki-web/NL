import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

const OPTIONS = [
  { value: 'none', label: 'No Viz' },
  { value: '2d-bars', label: 'Spectrum' },
  { value: '2d-radial', label: 'Radial' },
  { value: '2d-wave', label: 'Wave' },
  { value: 'lyrics', label: 'Lyrics' },
  { value: '3d-sphere', label: '3D' },
] as const;

export function VizSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { 
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); 
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  
  const current = OPTIONS.find(o => o.value === value) ?? OPTIONS[0];
  
  return (
    <div ref={ref} className="relative shrink-0">
      <button 
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 py-2 px-4 rounded-full text-sm font-semibold text-slate-800 bg-white/40 border border-white/60 shadow-[0_4px_14px_rgba(255,122,26,0.15),inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md hover:bg-white/60 transition-all focus:outline-none"
      >
        {current.label}
        <motion.span animate={{ rotate: open ? 180 : 0 }}><ChevronDown size={16} /></motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.16 }}
            className="absolute bottom-full mb-2 right-0 z-50 min-w-[160px] p-1.5 rounded-2xl bg-white/70 border border-white/70 shadow-[0_12px_40px_rgba(0,0,0,0.18)] backdrop-blur-2xl saturate-150 m-0 list-none"
          >
            {OPTIONS.map(o => {
              const active = o.value === value;
              return (
                <li key={o.value} className="m-0 p-0">
                  <button 
                    onClick={() => { onChange(o.value); setOpen(false); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-colors focus:outline-none ${
                      active 
                        ? 'bg-gradient-to-r from-[#FF7A1A] to-[#34E89E] text-white font-bold shadow'
                        : 'text-slate-700 hover:bg-white/70'
                    }`}
                  >
                    {o.label}
                    {active && <Check size={15} />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
