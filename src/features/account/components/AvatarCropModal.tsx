import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Loader2, ZoomIn } from 'lucide-react';
import { cropToSquareWebp, loadImageElement } from '../utils/imageResize';
import '../../../styles/components/avatar-crop.css';

const VIEWPORT = 300; // px مربّع المعاينة

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
}

export function AvatarCropModal({ file, onCancel, onConfirm }: Props) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  // baseScale: يجعل الصورة تغطّي المربّع (cover)
  const baseScale = img ? VIEWPORT / Math.min(img.naturalWidth, img.naturalHeight) : 1;
  const dispW = img ? img.naturalWidth * baseScale * scale : 0;
  const dispH = img ? img.naturalHeight * baseScale * scale : 0;

  useEffect(() => {
    let revoke: string | null = null;
    loadImageElement(file)
      .then(({ img: el, objectUrl }) => {
        revoke = objectUrl;
        setImg(el);
      })
      .catch(() => setErr('Failed to read image'));
    document.documentElement.classList.add('nl-modal-open');
    return () => {
      document.documentElement.classList.remove('nl-modal-open');
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [file]);

  const clamp = useCallback((o: { x: number; y: number }) => {
    const maxX = Math.max(0, (dispW - VIEWPORT) / 2);
    const maxY = Math.max(0, (dispH - VIEWPORT) / 2);
    return { x: Math.min(maxX, Math.max(-maxX, o.x)), y: Math.min(maxY, Math.max(-maxY, o.y)) };
  }, [dispW, dispH]);

  useEffect(() => {
    setOffset((o) => clamp(o));
  }, [scale, clamp]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    setOffset(clamp({ x: e.clientX - dragRef.current.x, y: e.clientY - dragRef.current.y }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleConfirm = async () => {
    if (!img || busy) return;
    setBusy(true);
    setErr(null);
    try {
      // تحويل موضع/تكبير المعاينة إلى مستطيل قصّ بإحداثيات المصدر الطبيعية.
      const totalScale = baseScale * scale;              // مصدر → بكسل معاينة
      const cropSizeSrc = VIEWPORT / totalScale;         // ضلع القصّ بإحداثيات المصدر
      const centerSrcX = img.naturalWidth / 2 - offset.x / totalScale;
      const centerSrcY = img.naturalHeight / 2 - offset.y / totalScale;
      const sx = centerSrcX - cropSizeSrc / 2;
      const sy = centerSrcY - cropSizeSrc / 2;
      const blob = await cropToSquareWebp(img, { sx, sy, size: cropSizeSrc });
      await onConfirm(blob);
    } catch (e) {
      setErr(String((e as Error).message));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="nl-crop-overlay" onMouseDown={onCancel}>
      <div className="nl-crop aero-glass" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="aero-bubbles" aria-hidden />
        <button type="button" className="nl-crop__close" onClick={onCancel} aria-label="Close"><X size={18} /></button>
        <h3 className="nl-crop__title">Crop your picture (Square)</h3>

        <div
          className="nl-crop__viewport"
          style={{ width: VIEWPORT, height: VIEWPORT }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {img ? (
            <img
              src={img.src}
              alt=""
              draggable={false}
              style={{
                width: dispW,
                height: dispH,
                // المركزة + الإزاحة في transform واحد (لا تمزج translate المنفصلة)
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          ) : (
            <div className="nl-crop__loading"><Loader2 className="spin" size={20} /></div>
          )}
          <div className="nl-crop__ring" aria-hidden />
        </div>

        <label className="nl-crop__zoom">
          <ZoomIn size={16} />
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
          />
        </label>

        {err && <p className="nl-crop__err">{err}</p>}

        <div className="nl-crop__actions">
          <button type="button" className="aero-pill" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="aero-pill aero-pill--accent" onClick={handleConfirm} disabled={busy || !img}>
            {busy ? <Loader2 className="spin" size={16} /> : <Check size={16} />} Confirm
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
