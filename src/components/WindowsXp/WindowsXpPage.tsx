import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DesktopViewportProvider } from '../DesktopViewportProvider';

interface WindowsXpPageProps {
  onClose: () => void;
}

const XP_SRC = 'https://noureddinelmobaraki-web.github.io/nl-audio-cdn/xp/index.html';

export const WindowsXpPage: React.FC<WindowsXpPageProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [showNotice, setShowNotice] = useState(true);

  // قفل تمرير الموقع خلف المحاكي + كلاس للتحكم في CSS
  useEffect(() => {
    document.body.classList.add('xp-active');
    return () => document.body.classList.remove('xp-active');
  }, []);

  // إخفاء الإشعار تلقائيًا بعد 5 ثوانٍ
  useEffect(() => {
    const timer = window.setTimeout(() => setShowNotice(false), 5000);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <DesktopViewportProvider desktopWidth={1024}>
      <div className="xp-page-root">
        {/* زر الخروج العائم */}
        <button
          onClick={onClose}
          className="xp-exit-btn hover:scale-105 active:scale-95 transition-transform"
          aria-label={t('xp.exit')}
          title={t('xp.exit')}
        >
          <X size={18} />
        </button>

        {/* إشعار "أفضل على الحاسوب" يظهر بضع ثوانٍ ثم يختفي */}
        {showNotice && (
          <div className="xp-desktop-notice" role="status" aria-live="polite">
            {t('xp.desktopNotice')}
          </div>
        )}

        {/* المحاكي داخل iframe معزول من نفس النطاق */}
        <iframe
          src={XP_SRC}
          title="Windows XP Simulator"
          className="xp-iframe"
          allow="autoplay; fullscreen; clipboard-read; clipboard-write; gamepad; pointer-lock"
          loading="eager"
        />
      </div>
    </DesktopViewportProvider>
  );
};

export default WindowsXpPage;
