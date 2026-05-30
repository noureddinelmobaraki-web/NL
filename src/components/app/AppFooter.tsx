import { motion } from 'framer-motion';
import { ResponsiveImage } from '../ResponsiveImage';
import { itemVariants } from './appConstants';

interface AppFooterProps {
  footerDecorationUrl: string;
}

export function AppFooter({ footerDecorationUrl }: AppFooterProps) {
  return (
    <motion.footer 
      variants={itemVariants}
      className="mt-10 flex flex-col items-center gap-8 border-t-4 border-[var(--ink-color)] pt-10 pb-[calc(80px+env(safe-area-inset-bottom))] sm:pb-20 retro-shadow-white"
    >
      <ResponsiveImage 
        src={footerDecorationUrl}
        alt="Footer Decoration"
        className="w-full max-w-[90%] sm:max-w-[600px] border-[3px] border-[var(--ink-color)] shadow-[10px_10px_0px_var(--manga-shadow-color)] rounded-xl hover:scale-[1.02] transition-transform animate-float"
        loading="lazy"
      />

      <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
        <div className="flex gap-4">
          <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
          <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
          <div className="w-4 h-4 bg-[var(--ink-color)] manga-border rounded-none" />
        </div>
        <p className="font-manga text-base sm:text-2xl text-[var(--text-primary)] bg-[var(--paper-color)] px-3 sm:px-6 py-1 manga-border -rotate-1 shadow-[4px_4px_0px_var(--manga-shadow-color)] italic text-center md:text-left max-w-full break-words">
          NL // NOUREDDIN GB © 2026
        </p>
      </div>
    </motion.footer>
  );
}
