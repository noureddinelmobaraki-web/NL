import React, { useRef, useEffect } from 'react';
import OsWindow from './OsWindow'; // تأكد من مسار مكوّن OsWindow لديك في المشروع
import { useTranslation } from 'react-i18next';

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string | null;
}

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
}) => {
  const { t } = useTranslation();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !imageUrl) return;

    const handleLoad = () => {
      if (iframeRef.current?.contentWindow) {
        // إرسال رابط الصورة لمحرر Image95 عبر postMessage
        iframeRef.current.contentWindow.postMessage(
          {
            type: 'LOAD_IMAGE',
            url: imageUrl,
          },
          '*'
        );
      }
    };

    const iframe = iframeRef.current;
    if (iframe) {
      iframe.addEventListener('load', handleLoad);
    }

    return () => {
      if (iframe) {
        iframe.removeEventListener('load', handleLoad);
      }
    };
  }, [isOpen, imageUrl]);

  if (!isOpen) return null;

  const srcUrl = imageUrl
    ? `/image95/index.html?src=${encodeURIComponent(imageUrl)}`
    : '/image95/index.html';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-6 bg-black/70 backdrop-blur-sm pointer-events-auto">
      <div className="w-full max-w-5xl h-[85vh] max-h-[850px] shadow-2xl flex flex-col">
        <OsWindow
          title={t('lens.edit_photo', 'Image95 - Photo Editor')}
          onClose={onClose}
          icon="/image95/assets/icons8-windows-95-144.png"
          contentPadding={0}
          className="w-full max-w-[920px] h-[640px] max-h-[90vh] flex flex-col"
        >
          <div className="w-full h-full bg-[#c0c0c0] flex flex-col">
            <iframe
              ref={iframeRef}
              src={srcUrl}
              title="Image95"
              className="w-full h-full border-none flex-1"
            />
          </div>
        </OsWindow>
      </div>
    </div>
  );
};

export default ImageEditorModal;
