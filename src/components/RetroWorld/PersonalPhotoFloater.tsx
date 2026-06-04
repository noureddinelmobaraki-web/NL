import React, { memo, useMemo } from 'react';
import { PERSONAL_PHOTOS, PERSONAL_PHOTOS_CDN } from './personal-photos';

interface Props {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}

const PersonalPhotoFloaterInner: React.FC<Props> = ({ wrapperRef }) => {
  // استخدام useMemo لاختيار 20 صورة مبعثرة عشوائياً لضمان استقرار توزيعها وحفظ العمليات الحسابية
  const scatteredCards = useMemo(() => {
    // خلط عشوائي واختيار حتى 20 صورة
    const selectedPhotos = [...PERSONAL_PHOTOS]
      .sort(() => 0.5 - Math.random())
      .slice(0, 20);

    return selectedPhotos.map((photo, index) => {
      // تفريق الارتفاعات بشكل منتظم على امتداد صفحة الـ 16000px لتجنب التكدس والتصادم
      const segmentSize = 14200 / 20; // المسافة بين 800px و 15000px مقسمة على 20 مرحلة
      const segmentStart = 800 + index * segmentSize;
      const top = Math.floor(segmentStart + Math.random() * (segmentSize * 0.8));

      // توزيع عشوائي جهة اليمين أو اليسار بالتناوب لضمان مظهر متوازن وممتع بصرياً
      const side = index % 2 === 0 ? 'left' : 'right';
      const xOffset = `${2 + Math.random() * 6}%`; // إزاحة جانبية بين 2% و 8%
      const rotationVal = -15 + Math.random() * 30; // دوران عشوائي بين -15 و 15 درجة
      const rotation = `${rotationVal.toFixed(1)}deg`;

      // مدة وتأخير البدء لجعل كل صورة تسترخي وتتحرك بحرية مستقلة تماماً
      const bobDuration = `${(3 + Math.random() * 3).toFixed(1)}s`;
      const bobDelay = `${-(Math.random() * 6).toFixed(1)}s`;

      return {
        key: `static-card-${index}-${photo.file}`,
        photo,
        top,
        side,
        xOffset,
        rotation,
        bobDuration,
        bobDelay,
      };
    });
  }, []);

  return (
    <>
      <style>{`
        .personal-photo-card {
          background: white;
          padding: 8px 8px 24px 8px;
          box-shadow: 5px 5px 0 #000, 10px 10px 0 #ff00ff;
          border: 2px solid #000;
          width: 180px;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          pointer-events: auto;
        }
        @media (max-width: 768px) {
          .personal-photo-card { width: 120px; padding: 6px 6px 18px 6px; }
        }
        .personal-photo-card:hover {
          transform: scale(1.1) rotate(0deg) !important;
          box-shadow: 10px 10px 0 #000, 20px 20px 0 #00ffff;
          cursor: pointer;
        }
        @keyframes gentleBob {
          0% { transform: translateY(0); }
          100% { transform: translateY(-15px); }
        }
      `}</style>

      {/* الحاوية الخارجية الحرة المعرفة خارجياً بالـ ref والمسئولة عن التمرير الـ GPU-accelerated */}
      <div 
        ref={wrapperRef} 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100vh', 
          pointerEvents: 'none', 
          zIndex: 50,
          willChange: 'transform'
        }}
      >
        {scatteredCards.map(card => {
          const photo = card.photo;
          if (!photo) return null;

          return (
            <div 
              key={card.key} 
              style={{
                position: 'absolute',
                top: `${card.top}px`,
                left: card.side === 'left' ? card.xOffset : 'auto',
                right: card.side === 'right' ? card.xOffset : 'auto',
                animation: `gentleBob ${card.bobDuration} ease-in-out infinite alternate`,
                animationDelay: card.bobDelay,
                pointerEvents: 'auto',
              }}
            >
              <div className="personal-photo-card" style={{ transform: `rotate(${card.rotation})` }}>
                <img
                  src={`${PERSONAL_PHOTOS_CDN}/${photo.file}`}
                  alt={`Personal Retro ${card.photo.file}`}
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: 'auto', display: 'block', objectFit: 'cover', border: '1px solid #ddd' }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
};

export const PersonalPhotoFloater = memo(PersonalPhotoFloaterInner);