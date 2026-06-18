import { ArrowRight, ArrowLeft } from "lucide-react";

interface CinemaBackButtonProps {
  isRTL: boolean;
  onBack: () => void;
}

export function CinemaBackButton({ isRTL, onBack }: CinemaBackButtonProps) {
  const Icon = isRTL ? ArrowRight : ArrowLeft;
  return (
    <button
      onClick={onBack}
      aria-label="Back"
      data-glass-avoid
      className="fixed z-[7500] top-[max(0.75rem,env(safe-area-inset-top))] left-[max(0.75rem,env(safe-area-inset-left))] p-2.5 rounded-full text-white shadow-lg active:scale-90 transition bg-gradient-to-br from-red-600 via-rose-500 to-red-700 border border-red-400/60 backdrop-blur-md"
    >
      <Icon size={20} />
    </button>
  );
}
