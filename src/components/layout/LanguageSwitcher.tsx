import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { useButtonContext } from './ButtonOrchestrator';

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const { registerButton, unregisterButton } = useButtonContext();

  const currentLang = i18n.resolvedLanguage || i18n.language || 'ar';

  useEffect(() => {
    const languages = ['ar', 'en', 'fr'];
    const toggleLanguage = () => {
      const currentIndex = languages.indexOf(currentLang);
      const nextIndex = (currentIndex + 1) % languages.length;
      const nextLang = languages[nextIndex];
      i18n.changeLanguage(nextLang);
    };

    registerButton({
      id: 'language-switcher',
      priority: 2, // higher than theme (1) to render first or nicely side-by-side
      allowedContexts: ['page'],
      slot: 'topRight',
      render: () => (
        <button
          onClick={toggleLanguage}
          className="fab-button flex items-center justify-center gap-1 relative group"
          aria-label={t('buttons.changeLanguage') || 'Change Language'}
          title={`${t('buttons.changeLanguage') || 'Change Language'} (Current: ${currentLang.toUpperCase()})`}
          style={{ 
            touchAction: 'manipulation', 
            WebkitTapHighlightColor: 'transparent',
            position: 'relative'
          }}
        >
          <Languages className="w-4 h-4" aria-hidden="true" />
          <span className="text-[10px] font-mono font-bold tracking-tighter uppercase">
            {currentLang}
          </span>

          {/* Tooltip */}
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/90 text-white px-2 py-0.5 rounded text-[10px] font-mono tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5 uppercase">
            {currentLang === 'ar' ? 'English' : currentLang === 'en' ? 'Français' : 'العربية'}
          </div>
        </button>
      )
    });

    return () => {
      unregisterButton('language-switcher');
    };
  }, [currentLang, registerButton, unregisterButton, t, i18n]);

  return null;
}
