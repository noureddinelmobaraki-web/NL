import { motion, Variants } from "framer-motion";
import { Mail, MessageCircle, Send } from "lucide-react";
import { ContactMethod } from "../../types";

const CONTACT_METHODS: ContactMethod[] = [
  {
    name: "Gmail",
    value: "noureddinelmobaraki@gmail.com",
    url: "mailto:noureddinelmobaraki@gmail.com",
    icon: Mail,
    bg: 'linear-gradient(135deg, #EA4335 0%, #B31412 100%)',
    color: "#EA4335"
  },
  {
    name: "WhatsApp",
    value: "+212 612-806932",
    url: "https://wa.me/212612806932",
    icon: MessageCircle,
    bg: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
    color: "#25D366"
  },
  {
    name: "Telegram",
    value: "+212 612 806932",
    url: "https://t.me/212612806932",
    icon: Send,
    bg: 'linear-gradient(135deg, #0088CC 0%, #005580 100%)',
    color: "#0088CC"
  }
];

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

const STYLES = {
  SHADOW_WHITE: { textShadow: '2px 2px 0px rgba(255,255,255,0.8)' },
  CIRCLE: { borderRadius: '50%' }
};

export const ContactSection = () => {
  return (
    <motion.div 
      variants={itemVariants}
      className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full"
    >
    {CONTACT_METHODS.map((method) => (
      <a
        key={method.name}
        href={method.url}
        target="_blank"
        rel="noreferrer"
        className="manga-border group relative flex flex-col items-center justify-center p-6 border-[4px] border-[var(--ink-color)] overflow-hidden bg-[var(--paper-color)] transition-all duration-300 hover:scale-[1.05] hover:-rotate-1 active:scale-95 shadow-[8px_8px_0px_var(--manga-shadow-color)] manga-card-hover md:min-h-[120px]"
      >
        {/* GIF Background */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500 group-hover:scale-110 opacity-30 blur-[2px] group-hover:blur-0"
          style={{ background: method.bg }}
        />
        {/* Content Overlay */}
        <div className="relative z-10 flex flex-col items-center gap-2">
          <div 
            className="p-3 bg-[var(--ink-color)] text-[var(--text-inverse)] manga-border border-white/20 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] group-hover:bg-[var(--paper-color)] group-hover:text-[var(--ink-color)] transition-colors"
            style={STYLES.CIRCLE}
          >
            <method.icon className="w-8 h-8" aria-hidden="true" />
          </div>
          <span className="font-manga text-2xl font-black text-[var(--ink-color)] uppercase tracking-tighter">
            {method.name}
          </span>
          <span className="text-xs font-bold text-[var(--text-muted)] bg-[var(--bg-glass)] px-2 py-0.5 manga-border border-[var(--ink-color)] truncate max-w-full">
            {method.value}
          </span>
        </div>
      </a>
    ))}
  </motion.div>
  );
};
