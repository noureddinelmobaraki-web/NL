import { Component, useCallback, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Volume2, VolumeX, LogOut } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { useDeviceType } from '../../hooks/useDeviceType';
import { audioManager } from '../../audio/audioManager';
import type { Theme } from '../../utils/userPrefs';
import '../../styles/components/glass-switcher.css';

const MODES: { id: Theme; label: string }[] = [
  { id: 'dark', label: 'Dark' }, { id: 'light', label: 'Light' },
  { id: 'midnight', label: 'Midnight' }, { id: 'bit', label: 'Bit' },
  { id: 'lite', label: 'Lite' }, { id: 'retro', label: 'Retro' },
];

const SOURCES = ['bg', 'song', 'lens', 'mebit', 'video', 'intro'] as const;

// عناصر يجب ألّا تغطّيها الفقاعة (أزرار الإغلاق/الخروج). أضف data-glass-avoid لأي زر تريد تجنّبه.
const AVOID_SELECTOR =
  '[data-glass-avoid],[aria-label="Close"],[aria-label="إغلاق"],.modal-close-btn,.gallery-close-btn';

// يبقي الفقاعة داخل حدود الشاشة بعد حساب الإزاحة (dx لليسار، dy للأسفل). نقية وقابلة للاختبار.
export function clampOffset(
  base: { left: number; right: number; top: number; bottom: number },
  dx: number,
  dy: number,
  vw: number,
  vh: number,
  margin = 8,
): { x: number; y: number } {
  let nx = dx;
  let ny = dy;
  if (base.left + nx < margin) nx += margin - (base.left + nx);
  if (base.right + nx > vw - margin) nx -= base.right + nx - (vw - margin);
  if (base.top + ny < margin) ny += margin - (base.top + ny);
  if (base.bottom + ny > vh - margin) ny -= base.bottom + ny - (vh - margin);
  return { x: nx, y: ny };
}

/** هل توجد طبقة علوية نشطة (معرض/كلمات/Music Mood/أي modal)؟ */
function useOverlayActive(): boolean {
  const subscribe = useCallback((cb: () => void) => {
    const obs = new MutationObserver(cb);
    obs.observe(document.body, {
      attributes: true,
      attributeFilter: ['class', 'data-modal-context'],
    });
    return () => obs.disconnect();
  }, []);
  const getSnapshot = useCallback(() => {
    const b = document.body;
    const ctx = b.getAttribute('data-modal-context');
    return (
      b.classList.contains('has-active-modal') ||
      b.classList.contains('gallery-immersive') ||
      (ctx !== null && ctx !== 'page')
    );
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// حدّ أمان: إذا انهار مبدّل الأوضاع، يُخفى بهدوء ولا يكسر بقية الصفحة
class GlassSwitcherBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.warn('[GlassModeSwitcher] crashed, hidden:', err); }
  render() { return this.state.hasError ? null : this.props.children; }
}

function GlassModeSwitcherInner() {
  const { isDesktop } = useDeviceType();
  const { theme, setTheme, returnToWelcome } = useAppContext();
  const reduceMotion = useReducedMotion();
  const overlayActive = useOverlayActive();

  const [open, setOpen] = useState(false);
  const [peek, setPeek] = useState(false);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const anchorRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const idleTimerRef = useRef<number | null>(null);

  // يعيد ضبط مؤقّت 5ث: عند انتهائه تعود الفقاعة للحالة الصغيرة
  const scheduleIdleCollapse = useCallback(() => {
    if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
    idleTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setPeek(false);
    }, 5000);
  }, []);

  const isPlaying = useSyncExternalStore(
    (cb) => {
      const unsubs = SOURCES.map((s) => audioManager.subscribeState(s, cb));
      return () => unsubs.forEach((u) => u && u());
    },
    () => SOURCES.some((s) => audioManager.isSourceActive(s)),
    () => false,
  );

  // صفر peek عند اختفاء الطبقة العلوية
  useEffect(() => {
    if (!overlayActive) setPeek(false);
  }, [overlayActive]);

  // إزاحة ذكية: نقيس صندوق الـ anchor الثابت (غير متحوّل) ونزيح السطح بـtranslate فقط
  // بما يكفي لعدم تغطية أزرار الإغلاق، مع البقاء أعلى-اليمين. لا تبديل left/right.
  useEffect(() => {
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const base = el.getBoundingClientRect();
      let dx = 0;
      let dy = 0;
      const avoids = document.querySelectorAll<HTMLElement>(AVOID_SELECTOR);
      avoids.forEach((a) => {
        const r = a.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return;
        const ox = Math.min(base.right, r.right) - Math.max(base.left, r.left);
        const oy = Math.min(base.bottom, r.bottom) - Math.max(base.top, r.top);
        if (ox > 0 && oy > 0) {
          dx = Math.min(dx, -(ox + 14)); // إزاحة لليسار
          dy = Math.max(dy, oy + 14);    // وإلى الأسفل
        }
      });
      const clamped = clampOffset(base, dx, dy, window.innerWidth, window.innerHeight);
      setOffset((prev) => (prev.x === clamped.x && prev.y === clamped.y ? prev : clamped));
    };

    measure();
    const obs = new MutationObserver(measure);
    obs.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class', 'data-modal-context', 'style'],
    });
    window.addEventListener('resize', measure);
    const id = window.setInterval(measure, 600);
    return () => {
      obs.disconnect();
      window.removeEventListener('resize', measure);
      window.clearInterval(id);
    };
  }, [open, overlayActive]);

  // الإغلاق عند النقر خارجها (هاتف فقط)
  useEffect(() => {
    if (!open || isDesktop) return;
    const onDown = (e: PointerEvent) => {
      if (surfaceRef.current && !surfaceRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [open, isDesktop]);

  // مؤقّت العودة التلقائية للحجم الصغير بعد 5ث خمول
  useEffect(() => {
    if (open || peek) {
      scheduleIdleCollapse();
    } else if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    return () => {
      if (idleTimerRef.current) {
        window.clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
  }, [open, peek, scheduleIdleCollapse]);

  const toggleAudio = useCallback(() => {
    const active = SOURCES.find((s) => audioManager.isSourceActive(s));
    if (active) audioManager.pause(active);
    else audioManager.play('bg').catch(() => audioManager.armUserGestureResume());
  }, []);

  if (typeof window === 'undefined') return null;

  const state: 'dot' | 'orb' | 'open' = open ? 'open' : overlayActive && !peek ? 'dot' : 'orb';

  const spring = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.9 };

  return createPortal(
    <div ref={anchorRef} className="glass-switcher-anchor">
      <motion.div
        ref={surfaceRef}
        layout
        data-state={state}
        className={`glass-switcher ${isDesktop ? 'is-desktop' : 'is-mobile'}`}
        animate={{ x: offset.x, y: offset.y }}
        transition={spring}
        onMouseEnter={() => { if (isDesktop) { if (overlayActive && !peek) setPeek(true); else setOpen(true); scheduleIdleCollapse(); } }}
        onMouseLeave={() => { if (isDesktop) { setOpen(false); setPeek(false); } }}
        onPointerMove={() => { if (open || peek) scheduleIdleCollapse(); }}
        onClick={() => { if (!isDesktop) { if (overlayActive && !peek) setPeek(true); else setOpen((v) => !v); } scheduleIdleCollapse(); }}
        role="group"
        aria-label="Mode switcher"
      >
        <span className="glass-switcher__smoke" aria-hidden="true" />
        <span className="glass-switcher__sheen" aria-hidden="true" />

        <AnimatePresence>
          {state === 'open' && (
            <motion.div
              key="grid"
              className="glass-switcher__grid"
              role="menu"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.18 }}
            >
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === m.id}
                  className={`gs-cell ${theme === m.id ? 'is-active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); setTheme(m.id); setOpen(false); }}
                >
                  {m.label}
                </button>
              ))}
              <button
                type="button"
                className="gs-cell gs-icon"
                aria-label="Sound"
                onClick={(e) => { e.stopPropagation(); toggleAudio(); }}
              >
                {isPlaying ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </button>
              <button
                type="button"
                className="gs-cell gs-icon gs-exit"
                aria-label="Exit"
                onClick={(e) => { e.stopPropagation(); returnToWelcome(); }}
              >
                <LogOut size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>,
    document.body,
  );
}

export function GlassModeSwitcher() {
  return (
    <GlassSwitcherBoundary>
      <GlassModeSwitcherInner />
    </GlassSwitcherBoundary>
  );
}
export default GlassModeSwitcher;
