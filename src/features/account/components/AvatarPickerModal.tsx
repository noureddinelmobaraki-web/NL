import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Upload, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { DEFAULT_AVATARS } from '../../../config/defaultAvatars';
import { AccountsBackgroundVideo } from '../../accounts/AccountsBackgroundVideo';
import '../../../styles/components/avatar-picker.css';

interface Props {
  onClose: () => void;
  onPickDefault: (webpUrl: string) => void | Promise<void>;
  onUploadClick: () => void; // يفتح منتقي الملفات (نفس fileRef)
}

const N = DEFAULT_AVATARS.length;
// أقصر مسافة دائرية بين فهرسين (للالتفاف اللانهائي)
function circularDelta(i: number, active: number): number {
  let d = i - active;
  if (d > N / 2) d -= N;
  if (d < -N / 2) d += N;
  return d;
}

export function AvatarPickerModal({ onClose, onPickDefault, onUploadClick }: Props) {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const dragX = useRef<number | null>(null);
  const moved = useRef(false);

  const go = useCallback((dir: number) => {
    setActive((a) => (a + dir + N) % N);
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('nl-modal-open');
    // يعزل صفحة البروفيل خلفنا: تتوقف عن الرسم لتخفيف الحمل ولمنع ظهورها خلف الأفاتارات
    document.documentElement.classList.add('nl-avpick-active');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('nl-modal-open');
      document.documentElement.classList.remove('nl-avpick-active');
      window.removeEventListener('keydown', onKey);
    };
  }, [go, onClose]);

  const onPointerDown = (e: React.PointerEvent) => {
    dragX.current = e.clientX;
    moved.current = false;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragX.current == null) return;
    const dx = e.clientX - dragX.current;
    if (Math.abs(dx) > 45) {
      go(dx < 0 ? 1 : -1);
      dragX.current = e.clientX;
      moved.current = true;
    }
  };
  const onPointerUp = () => {
    dragX.current = null;
  };

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await onPickDefault(DEFAULT_AVATARS[active].webp);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    // خلفية شبه شفافة — لا نافذة مرئية
    <div className="nl-avpick-overlay" onMouseDown={onClose}>
      <AccountsBackgroundVideo />
      <div className="nl-avpick" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className="nl-avpick__close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        {/* زر الرفع: أيقونة فقط */}
        <button
          type="button"
          className="nl-avpick__icon nl-avpick__icon--upload nl-avpick__upload"
          onClick={onUploadClick}
          aria-label="Upload from my device"
          title="Upload from my device"
        >
          <Upload size={18} />
        </button>

        {/* الأفاتارات تطفو في الهواء (بلا نافذة) فوق شريط زجاجي */}
        <div
          className="nl-avpick__stage"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {DEFAULT_AVATARS.map((a, i) => {
            const d = circularDelta(i, active);
            const abs = Math.abs(d);
            if (abs > 3) return null; // نرسم القريبة فقط (أداء)
            const isActive = d === 0;
            const style: React.CSSProperties = {
              transform: `translateX(${d * 82}px) translateZ(${-abs * 64}px) rotateY(${d * -22}deg) scale(${Math.max(0.55, 1 - abs * 0.16)})`,
              opacity: Math.max(0.28, 1 - abs * 0.26),
              zIndex: 100 - abs,
            };
            return (
              <button
                type="button"
                key={a.id}
                className={`nl-avpick__item${isActive ? ' is-active' : ''}`}
                style={style}
                onClick={() => {
                  if (!moved.current) setActive(i);
                }}
                aria-label={`Avatar ${a.id}`}
              >
                <picture>
                  <source srcSet={a.avif} type="image/avif" />
                  <img src={a.webp} alt="" loading="lazy" decoding="async" draggable={false} />
                </picture>
              </button>
            );
          })}

          {/* الشريط الزجاجي — حافة النافذة غير المرئية */}
          <div className="nl-avpick__shelf" aria-hidden />
        </div>

        {/* التحكم: سابق / Select (✓) / تالي */}
        <div className="nl-avpick__nav">
          <button type="button" className="nl-avpick__arrow" onClick={() => go(-1)} aria-label="Prev"><ChevronRight size={20} /></button>
          <button
            type="button"
            className="nl-avpick__icon nl-avpick__icon--confirm"
            onClick={confirm}
            disabled={busy}
            aria-label="Select this"
            title="Select this"
          >
            {busy ? <Loader2 className="spin" size={18} /> : <Check size={22} />}
          </button>
          <button type="button" className="nl-avpick__arrow" onClick={() => go(1)} aria-label="Next"><ChevronLeft size={20} /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
