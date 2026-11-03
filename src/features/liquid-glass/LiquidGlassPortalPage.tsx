/**
 * src/features/liquid-glass/LiquidGlassPortalPage.tsx
 *
 * Dual-Orb WebGL Liquid Glass interactive page for NL:
 *  - Responsive PC & Phone WebP backgrounds rendered with real-time Dual-Lens GLSL refraction
 *  - Dual centerpiece in 'orbs' mode:
 *      1. Rotating Earth + 7 twinkling curved-corner stars inside a living, wobbling Liquid Glass bubble,
 *         with transparent '/X.webp' (2400x1340) floating title centered underneath
 *      2. Rotating Sun (15% larger than Earth) + 7 twinkling curved-corner stars + pulsing solar corona
 *         inside its own living, wobbling Liquid Glass bubble, with transparent '/ALBUMS.webp' (2400x1340)
 *         floating title centered underneath
 *  - Dynamic responsive layout: side-by-side on desktop/landscape, stacked vertically on phone/portrait,
 *    with continuous fluid viewport scaling and smooth position/size transitions on window resize
 *  - Click Earth -> morphs Earth's bubble into the adaptive-aspect HLS (.m3u8) video player
 *  - Click Sun -> prepared handler (`onOpenSunWindow`) that morphs Sun's bubble into a window
 *    displaying the current background image (ready for future Albums content)
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, Shuffle, Volume2, VolumeX, X } from 'lucide-react';
import type Hls from 'hls.js';
import { getLocalAssetUrl } from '../../constants/assets';
import { useLiquidGlassAudio } from './useLiquidGlassAudio';
import { EARTH_TEXTURE_DATA_URI, SUN_TEXTURE_DATA_URI } from './sunTexture';
import { LIQUID_GLASS_ALL_HLS_VIDEOS } from './albumsData';
import { SunAlbumsStage } from './SunAlbumsStage';

// ============================================================================
// [EDIT HERE: BACKGROUNDS & TITLES] — روابط الخلفيات وصور العناوين (X & ALBUMS)
// ============================================================================
export const LIQUID_GLASS_BACKGROUNDS = {
  pc: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/pc.webp',
  phone: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/phone.webp',
  mobileBreakpointQuery: '(max-width: 768px)',
} as const;

export const LIQUID_GLASS_TITLE_IMAGES = {
  earthX: getLocalAssetUrl('X.webp'),
  sunAlbums: getLocalAssetUrl('ALBUMS.webp'),
  naturalWidth: 2400,
  naturalHeight: 1340,
} as const;

/** مجسم الشمس أكبر بنسبة 15% من مجسم كوكب الأرض */
export const SUN_SCALE_MULTIPLIER = 1.15;

// ============================================================================
// [EDIT HERE: VIDEO STREAMS] — القائمة الكاملة الموحدة لجميع الفيديوهات (من 1 إلى 45 شاملة 21.5)
// ============================================================================
export const LIQUID_GLASS_HLS_VIDEOS: readonly string[] = LIQUID_GLASS_ALL_HLS_VIDEOS;

// ============================================================================
// [EDIT HERE: GLASS SHADER UNIFORMS] — إعدادات فيزياء الزجاج السائل وسلوك المشغل
// ============================================================================
const GLASS_CONFIG = {
  tint: [0.99, 0.995, 1.0] as const,
  saturation: 1.18,
  distortion: 1.45,
  blurOrbMode: 0.35,
  blurWindowRim: 0.55,
  chromaticAberration: 1.35,
  shadowIntensity: 0.22,
  shadowOffsetX: 0,
  shadowOffsetY: 14,
  shadowBlur: 28,
  cornerRadiusDesktop: 32,
  cornerRadiusMobile: 24,
  autoAdvanceOnEnded: true,
} as const;

// ============================================================================
// [EDIT HERE: AUDIO BRIDGE] — واجهة الربط مع نظام الصوت والتوجيه في موقع NL
// ============================================================================
export interface LiquidGlassPortalPageProps {
  onClose?: () => void;
  onVideoAudioActiveChange?: (isVideoAudible: boolean) => void;
  onVideoElementMount?: (mediaEl: HTMLMediaElement | null) => void;
  externalMuted?: boolean;
  onToggleMute?: () => void;
}

// ============================================================================
// WebGL GLSL Shaders — محرك الزجاج السائل المزدوج (فقاعة الأرض + فقاعة الشمس)
// ============================================================================
const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

function buildFragmentShaderSource(): string {
  return `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_lightShift;
    uniform sampler2D u_texture;

    // Bubble A (Earth / Video Player)
    uniform vec2 u_centerA;
    uniform vec2 u_sizeA;
    uniform float u_cornerA;
    uniform float u_wobbleA;
    uniform float u_alphaA;

    // Bubble B (Sun / Albums Window)
    uniform vec2 u_centerB;
    uniform vec2 u_sizeB;
    uniform float u_cornerB;
    uniform float u_wobbleB;
    uniform float u_alphaB;

    uniform vec3 u_tint;
    uniform float u_saturation;
    uniform float u_distortion;
    uniform float u_blur;
    uniform float u_imageAspect;
    uniform float u_canvasAspect;
    uniform float u_shadowIntensity;
    uniform vec2 u_shadowOffset;
    uniform float u_shadowBlur;
    uniform float u_chromaticAberration;

    varying vec2 v_texCoord;

    vec2 getCoverUV(vec2 uv, float imageAspect, float canvasAspect) {
      vec2 coverUV = uv;
      if (imageAspect > canvasAspect) {
        float scale = canvasAspect / max(imageAspect, 0.0001);
        coverUV.x = (uv.x - 0.5) * scale + 0.5;
      } else {
        float scale = imageAspect / max(canvasAspect, 0.0001);
        coverUV.y = (uv.y - 0.5) * scale + 0.5;
      }
      return clamp(coverUV, 0.001, 0.999);
    }

    float sdRoundedRect(vec2 pos, vec2 halfSize, vec4 cornerRadius) {
      cornerRadius.xy = (pos.x > 0.0) ? cornerRadius.xy : cornerRadius.zw;
      cornerRadius.x = (pos.y > 0.0) ? cornerRadius.x : cornerRadius.y;
      vec2 q = abs(pos) - halfSize + cornerRadius.x;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - cornerRadius.x;
    }

    float sdLiquidShape(vec2 pos, vec2 halfSize, float radius, float wobbleAmp, float t, float phase) {
      float base = sdRoundedRect(pos, halfSize, vec4(radius));
      if (wobbleAmp <= 0.001) return base;
      float ang = atan(pos.y, pos.x);
      float minDim = min(halfSize.x, halfSize.y);
      float wave =
        sin(ang * 2.0 + t * 1.65 + phase) * 0.44 +
        cos(ang * 3.0 - t * 2.15 - phase * 0.7) * 0.34 +
        sin(ang * 4.0 + t * 1.25 + phase * 1.3) * 0.22;
      return base + wave * minDim * 0.042 * wobbleAmp;
    }

    vec3 sampleCleanDispersion(vec2 uv, vec2 refractVec, float aberrationStrength) {
      vec2 coverUV = getCoverUV(uv, u_imageAspect, u_canvasAspect);
      vec2 disp = refractVec * aberrationStrength * 0.18;
      float r = texture2D(u_texture, clamp(coverUV + disp * 1.15, 0.001, 0.999)).r;
      float g = texture2D(u_texture, clamp(coverUV, 0.001, 0.999)).g;
      float b = texture2D(u_texture, clamp(coverUV - disp * 1.15, 0.001, 0.999)).b;
      return vec3(r, g, b);
    }

    vec3 sampleCrystalGlass(vec2 uv, vec2 refractVec, float rimBlurRadius) {
      vec2 stepUV = vec2(rimBlurRadius) / max(u_resolution, vec2(1.0));
      vec3 c0 = sampleCleanDispersion(uv, refractVec, u_chromaticAberration);
      if (rimBlurRadius <= 0.05) return c0;
      vec3 c1 = sampleCleanDispersion(uv + vec2( stepUV.x,  0.0), refractVec, u_chromaticAberration);
      vec3 c2 = sampleCleanDispersion(uv + vec2(-stepUV.x,  0.0), refractVec, u_chromaticAberration);
      vec3 c3 = sampleCleanDispersion(uv + vec2( 0.0,  stepUV.y), refractVec, u_chromaticAberration);
      vec3 c4 = sampleCleanDispersion(uv + vec2( 0.0, -stepUV.y), refractVec, u_chromaticAberration);
      return c0 * 0.44 + (c1 + c2 + c3 + c4) * 0.14;
    }

    vec3 saturateColor(vec3 color, float factor) {
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(gray), color, factor);
    }

    void main() {
      vec2 fragCoord = v_texCoord * u_resolution;

      float sdfA = (u_alphaA > 0.01)
        ? sdLiquidShape(fragCoord - u_centerA, u_sizeA, u_cornerA, u_wobbleA, u_time, 0.0)
        : 1e5;
      float sdfB = (u_alphaB > 0.01)
        ? sdLiquidShape(fragCoord - u_centerB, u_sizeB, u_cornerB, u_wobbleB, u_time, 2.094)
        : 1e5;

      vec2 coverUV = getCoverUV(v_texCoord, u_imageAspect, u_canvasAspect);
      vec3 baseTex = texture2D(u_texture, coverUV).rgb;

      // Analytical soft drop shadows for both bubbles
      float shDistA = (u_alphaA > 0.01)
        ? sdLiquidShape((fragCoord - u_centerA) - u_shadowOffset, u_sizeA, u_cornerA, u_wobbleA, u_time, 0.0)
        : 1e5;
      float shDistB = (u_alphaB > 0.01)
        ? sdLiquidShape((fragCoord - u_centerB) - u_shadowOffset, u_sizeB, u_cornerB, u_wobbleB, u_time, 2.094)
        : 1e5;

      float shAlphaA = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistA)) * u_shadowIntensity * u_alphaA;
      float shAlphaB = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistB)) * u_shadowIntensity * u_alphaB;
      float shadowAlpha = max(shAlphaA, shAlphaB);
      vec3 shadowedBackground = baseTex * (1.0 - shadowAlpha);

      bool isSunBubble = (sdfB < sdfA);
      float sdf = isSunBubble ? sdfB : sdfA;
      float bubbleAlpha = isSunBubble ? u_alphaB : u_alphaA;

      if (sdf > 1.5 || bubbleAlpha <= 0.01) {
        gl_FragColor = vec4(shadowedBackground, 1.0);
        return;
      }

      vec2 activeCenter = isSunBubble ? u_centerB : u_centerA;
      vec2 activeSize = isSunBubble ? u_sizeB : u_sizeA;
      float activeCorner = isSunBubble ? u_cornerB : u_cornerA;
      float activeWobble = isSunBubble ? u_wobbleB : u_wobbleA;
      float activePhase = isSunBubble ? 2.094 : 0.0;

      float minHalfDim = max(min(activeSize.x, activeSize.y), 1.0);
      float normalizedInside = clamp((sdf / minHalfDim) + 1.0, 0.0, 1.0);
      float rimCurve = pow(normalizedInside, 3.8);
      float outerMeniscus = pow(normalizedInside, 8.5);

      float eps = 2.0;
      vec2 h = vec2(eps, 0.0);
      float sdf1 = sdLiquidShape((fragCoord + h.xy) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      float sdf2 = sdLiquidShape((fragCoord - h.xy) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      float sdf3 = sdLiquidShape((fragCoord + h.yx) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      float sdf4 = sdLiquidShape((fragCoord - h.yx) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      vec2 grad = normalize(vec2(sdf1 - sdf2, sdf3 - sdf4) + vec2(1e-5));

      vec2 refractVec = grad * (-0.042 * u_distortion * rimCurve) + u_lightShift * 0.003 * rimCurve;
      vec2 sampleUV = v_texCoord + refractVec;

      float rimBlurPx = outerMeniscus * 2.4 * u_blur;
      vec3 glassTex = sampleCrystalGlass(sampleUV, refractVec, rimBlurPx);
      glassTex = mix(glassTex, saturateColor(glassTex, u_saturation), rimCurve * 0.55);

      vec3 activeTint = isSunBubble ? vec3(1.0, 0.985, 0.96) : u_tint;
      glassTex *= activeTint;

      float causticAngle = u_time * 0.55 + activePhase;
      vec2 lightDir1 = normalize(vec2(-0.707, -0.707) + u_lightShift * 0.35 + vec2(cos(causticAngle), sin(causticAngle)) * 0.18 * activeWobble);
      vec2 lightDir2 = normalize(vec2(0.65, 0.75) - u_lightShift * 0.25);
      float spec1 = pow(max(dot(grad, lightDir1), 0.0), 3.2);
      float spec2 = pow(max(dot(grad, lightDir2), 0.0), 4.0) * 0.55;

      float rimHighlight = smoothstep(-5.5, -0.6, sdf) * (1.0 - smoothstep(-0.6, 1.2, sdf));
      vec3 fresnelTint = isSunBubble
        ? mix(vec3(1.0, 0.90, 0.74), vec3(1.0, 0.97, 0.90), spec1)
        : mix(vec3(0.84, 0.95, 1.0), vec3(1.0, 0.96, 0.99), spec1);
      glassTex += fresnelTint * ((spec1 + spec2) * outerMeniscus * 0.36 + rimHighlight * 0.32);

      float boxMask = (1.0 - smoothstep(-0.85, 0.85, sdf)) * bubbleAlpha;
      gl_FragColor = vec4(mix(shadowedBackground, glassTex, boxMask), 1.0);
    }
  `;
}

// ============================================================================
// Helper: Format seconds into MM:SS (or HH:MM:SS)
// ============================================================================
function formatDuration(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00';
  const total = Math.floor(sec);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  return hrs > 0 ? `${hrs}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ============================================================================
// Rotating Earth + 7 Curved-Corner Twinkling Stars (100% Preserved)
// ============================================================================
const STAR_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

const RotatingEarthButton = React.memo(function RotatingEarthButton({
  onActivate,
  hidden,
}: {
  onActivate: () => void;
  hidden: boolean;
}) {
  return (
    <button
      type="button"
      className={`lg-earth-trigger${hidden ? ' lg-earth-trigger--morphed' : ''}`}
      onClick={onActivate}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      aria-label="اضغط على كوكب الأرض لبدء عرض الفيديوهات"
    >
      <div className="lg-earth-scale-wrap">
        <div className="lg-section-banner">
          {STAR_IDS.map((n) => (
            <div key={n} className={`lg-star lg-star-${n}`} aria-hidden="true">
              <div className="lg-curved-corner-star">
                <div className="lg-cc-br" />
                <div className="lg-cc-bl" />
              </div>
              <div className="lg-curved-corner-star">
                <div className="lg-cc-tr" />
                <div className="lg-cc-tl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
});

// ============================================================================
// Rotating Sun + 7 Curved-Corner Twinkling Stars (Exact Scoped Conversion)
// ============================================================================
const RotatingSunButton = React.memo(function RotatingSunButton({
  onActivate,
  hidden,
}: {
  onActivate: () => void;
  hidden: boolean;
}) {
  return (
    <button
      type="button"
      className={`lg-sun-trigger${hidden ? ' lg-sun-trigger--morphed' : ''}`}
      onClick={onActivate}
      tabIndex={hidden ? -1 : 0}
      aria-hidden={hidden}
      aria-label="اضغط على مجسم الشمس لفتح الألبومات"
    >
      <div className="lg-sun-scale-wrap">
        <div className="lg-section-banner-sun">
          {STAR_IDS.map((n) => (
            <div key={n} className={`lg-sun-star lg-sun-star-${n}`} aria-hidden="true">
              <div className="lg-curved-corner-star">
                <div className="lg-cc-br" />
                <div className="lg-cc-bl" />
              </div>
              <div className="lg-curved-corner-star">
                <div className="lg-cc-tr" />
                <div className="lg-cc-tl" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </button>
  );
});

// ============================================================================
// Main Single-File Component
// ============================================================================
export default function LiquidGlassPortalPage({
  onClose,
  onVideoAudioActiveChange: onVideoAudioActiveChangeProp,
  onVideoElementMount: onVideoElementMountProp,
  externalMuted: externalMutedProp,
  onToggleMute: onToggleMuteProp,
}: LiquidGlassPortalPageProps) {
  const scopeId = useId();
  const managedAudio = useLiquidGlassAudio();

  const onVideoAudioActiveChange =
    onVideoAudioActiveChangeProp ?? managedAudio.onVideoAudioActiveChange;
  const onVideoElementMount =
    onVideoElementMountProp ?? managedAudio.onVideoElementMount;
  const externalMuted = externalMutedProp ?? managedAudio.externalMuted;
  const onToggleMute = onToggleMuteProp ?? managedAudio.onToggleMute;

  // Responsive viewport mode & dynamic layout calculation
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
    isMobile:
      typeof window !== 'undefined'
        ? window.matchMedia(LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery).matches
        : false,
  }));

  const isMobileView = viewport.isMobile;
  // Switch between side-by-side (PC / landscape) and stacked vertical (phone / narrow window)
  const isStackedLayout =
    viewport.width <= 768 || (viewport.width < 920 && viewport.height > viewport.width * 1.08);

  // Compute dynamic fluid scale for Earth (1.0x) and Sun (1.15x) so both orbs + titles always fit
  const orbScale = React.useMemo(() => {
    const w = Math.max(viewport.width, 320);
    const h = Math.max(viewport.height, 480);
    if (isStackedLayout) {
      // Vertical stack: Earth bubble (286*s) + X title + gap + Sun bubble (329*s) + ALBUMS title
      const maxByHeight = (h - 140) / 760;
      const maxByWidth = (w - 40) / 360;
      return Math.min(Math.max(Math.min(maxByHeight, maxByWidth), 0.48), 0.92);
    }
    // Horizontal side-by-side: Earth bubble (286*s) + gap + Sun bubble (329*s)
    const maxByWidth = (w - 120) / 740;
    const maxByHeight = (h - 170) / 470;
    return Math.min(Math.max(Math.min(maxByWidth, maxByHeight), 0.56), 1.08);
  }, [viewport.width, viewport.height, isStackedLayout]);

  // WebGL texture readiness
  const [webglReady, setWebglReady] = useState(false);

  // Mode: 'orbs' initially -> 'video' when Earth clicked -> 'sun' when Sun clicked
  const [mode, setMode] = useState<'orbs' | 'video' | 'sun'>('orbs');
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localMuted, setLocalMuted] = useState(false);

  const effectiveMuted = externalMuted || localMuted;

  // Refs for WebGL, DOM glass boxes, HLS, shuffle bag, and seek track
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glassBoxRef = useRef<HTMLDivElement | null>(null);
  const sunGlassBoxRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shuffleBagRef = useRef<number[]>([]);
  const lastPickedRef = useRef<number>(-1);
  const seekTrackRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  // Mutable render state read inside rAF without re-creating the WebGL loop
  const renderStateRef = useRef({
    mode: 'orbs' as 'orbs' | 'video' | 'sun',
    isMobile: isMobileView,
    imageAspect: isMobileView ? 9 / 16 : 16 / 9,
    // Bubble A (Earth)
    currCenterAX: 0,
    currCenterAY: 0,
    currHalfAW: 142,
    currHalfAH: 142,
    currCornerA: 142,
    currWobbleA: 1,
    currAlphaA: 1,
    // Bubble B (Sun — 15% larger)
    currCenterBX: 0,
    currCenterBY: 0,
    currHalfBW: 164,
    currHalfBH: 164,
    currCornerB: 164,
    currWobbleB: 1,
    currAlphaB: 1,
    geometryInitialized: false,
    lightX: 0,
    lightY: 0,
    targetLightX: 0,
    targetLightY: 0,
  });

  useEffect(() => {
    renderStateRef.current.mode = mode;
    renderStateRef.current.isMobile = isMobileView;
  }, [mode, isMobileView]);

  // ── Non-repeating Shuffle Bag across all 21 streams ──────────────────────
  const pickNextRandomVideoIndex = useCallback((): number => {
    const total = LIQUID_GLASS_HLS_VIDEOS.length;
    if (total <= 1) return 0;

    if (shuffleBagRef.current.length === 0) {
      const fresh = Array.from({ length: total }, (_, i) => i);
      for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
      }
      if (fresh[fresh.length - 1] === lastPickedRef.current && fresh.length > 1) {
        [fresh[0], fresh[fresh.length - 1]] = [fresh[fresh.length - 1], fresh[0]];
      }
      shuffleBagRef.current = fresh;
    }

    const nextIdx = shuffleBagRef.current.pop() ?? 0;
    lastPickedRef.current = nextIdx;
    return nextIdx;
  }, []);

  const triggerRandomVideo = useCallback(() => {
    const nextIdx = pickNextRandomVideoIndex();
    setMode('video');
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    setCurrentVideoIndex(nextIdx);
    onVideoAudioActiveChange?.(true);
  }, [pickNextRandomVideoIndex, onVideoAudioActiveChange]);

  // ── Prepared empty handler for Sun -> opens window showing current background ──
  const onOpenSunWindow = useCallback(() => {
    // دالة مجهزة لفتح نافذة الشمس (تعرض حالياً صورة الخلفية الحالية فقط وجاهزة للبرومتات القادمة)
    setMode('sun');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange]);

  const handleReturnToOrbs = useCallback(() => {
    setMode('orbs');
    setIsPlaying(false);
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange]);

  // ── Window resize & orientation listener for dynamic sizing and layout swap ──
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery);

    const updateViewport = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: mq.matches,
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport, { passive: true });
    window.addEventListener('orientationchange', updateViewport, { passive: true });
    mq.addEventListener('change', updateViewport);

    return () => {
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      mq.removeEventListener('change', updateViewport);
    };
  }, []);

  // ── Escape key returns to orbs or closes fullscreen page ─────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (mode !== 'orbs') {
          handleReturnToOrbs();
        } else if (onClose) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, handleReturnToOrbs, onClose]);

  // ── Desktop subtle pointer specular/refraction tracking ──────────────────
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const vw = Math.max(window.innerWidth, 1);
    const vh = Math.max(window.innerHeight, 1);
    renderStateRef.current.targetLightX = (e.clientX / vw - 0.5) * 2;
    renderStateRef.current.targetLightY = (e.clientY / vh - 0.5) * 2;
  }, []);

  const handlePointerLeave = useCallback(() => {
    renderStateRef.current.targetLightX = 0;
    renderStateRef.current.targetLightY = 0;
  }, []);

  // ── WebGL Dual-Lens Liquid Glass Engine ──────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      setWebglReady(false);
      return undefined;
    }

    const compileShader = (type: number, src: string): WebGLShader | null => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fs = compileShader(gl.FRAGMENT_SHADER, buildFragmentShaderSource());
    if (!vs || !fs) {
      setWebglReady(false);
      return undefined;
    }

    const program = gl.createProgram();
    if (!program) {
      setWebglReady(false);
      return undefined;
    }
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      setWebglReady(false);
      return undefined;
    }

    gl.useProgram(program);

    const quad = new Float32Array([
      -1, -1, 0, 1,
       1, -1, 1, 1,
      -1,  1, 0, 0,
       1,  1, 1, 0,
    ]);
    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

    const aPos = gl.getAttribLocation(program, 'a_position');
    const aUv = gl.getAttribLocation(program, 'a_texCoord');
    gl.enableVertexAttribArray(aPos);
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

    const locs = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_lightShift: gl.getUniformLocation(program, 'u_lightShift'),
      u_texture: gl.getUniformLocation(program, 'u_texture'),
      u_centerA: gl.getUniformLocation(program, 'u_centerA'),
      u_sizeA: gl.getUniformLocation(program, 'u_sizeA'),
      u_cornerA: gl.getUniformLocation(program, 'u_cornerA'),
      u_wobbleA: gl.getUniformLocation(program, 'u_wobbleA'),
      u_alphaA: gl.getUniformLocation(program, 'u_alphaA'),
      u_centerB: gl.getUniformLocation(program, 'u_centerB'),
      u_sizeB: gl.getUniformLocation(program, 'u_sizeB'),
      u_cornerB: gl.getUniformLocation(program, 'u_cornerB'),
      u_wobbleB: gl.getUniformLocation(program, 'u_wobbleB'),
      u_alphaB: gl.getUniformLocation(program, 'u_alphaB'),
      u_tint: gl.getUniformLocation(program, 'u_tint'),
      u_saturation: gl.getUniformLocation(program, 'u_saturation'),
      u_distortion: gl.getUniformLocation(program, 'u_distortion'),
      u_blur: gl.getUniformLocation(program, 'u_blur'),
      u_imageAspect: gl.getUniformLocation(program, 'u_imageAspect'),
      u_canvasAspect: gl.getUniformLocation(program, 'u_canvasAspect'),
      u_shadowIntensity: gl.getUniformLocation(program, 'u_shadowIntensity'),
      u_shadowOffset: gl.getUniformLocation(program, 'u_shadowOffset'),
      u_shadowBlur: gl.getUniformLocation(program, 'u_shadowBlur'),
      u_chromaticAberration: gl.getUniformLocation(program, 'u_chromaticAberration'),
    };

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([12, 16, 24, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    let rafId = 0;
    let disposed = false;
    let lastSizeKey = '';
    const t0 = performance.now();

    (canvas as HTMLCanvasElement & { __lgCtx?: { gl: WebGLRenderingContext; texture: WebGLTexture | null } }).__lgCtx = {
      gl,
      texture,
    };

    const renderFrame = (now: number) => {
      if (disposed) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cssW = Math.max(canvas.clientWidth, 1);
      const cssH = Math.max(canvas.clientHeight, 1);
      const sizeKey = `${cssW}x${cssH}@${dpr}`;

      if (sizeKey !== lastSizeKey) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
        lastSizeKey = sizeKey;
      }

      const st = renderStateRef.current;
      const canvasRect = canvas.getBoundingClientRect();
      const baseWindowCorner =
        (st.isMobile ? GLASS_CONFIG.cornerRadiusMobile : GLASS_CONFIG.cornerRadiusDesktop) * dpr;

      const boxA = glassBoxRef.current;
      const boxB = sunGlassBoxRef.current;

      // Measure Earth Bubble (A)
      let targetAX = st.currCenterAX;
      let targetAY = st.currCenterAY;
      let targetAHW = st.currHalfAW;
      let targetAHH = st.currHalfAH;
      let targetCornerA = st.currCornerA;
      const targetWobbleA = st.mode === 'orbs' ? 1.0 : 0.0;
      const targetAlphaA = st.mode === 'sun' ? 0.0 : 1.0;

      if (boxA && st.mode !== 'sun') {
        const rA = boxA.getBoundingClientRect();
        if (rA.width > 4 && rA.height > 4) {
          targetAX = (rA.left - canvasRect.left + rA.width * 0.5) * dpr;
          targetAY = (rA.top - canvasRect.top + rA.height * 0.5) * dpr;
          targetAHW = Math.max(rA.width * 0.5 * dpr, 20);
          targetAHH = Math.max(rA.height * 0.5 * dpr, 20);
          targetCornerA =
            st.mode === 'orbs'
              ? Math.min(targetAHW, targetAHH)
              : Math.min(baseWindowCorner, Math.min(targetAHW, targetAHH) - 1);
        }
      }

      // Measure Sun Bubble (B) — dissolves cleanly when entering full-page 'sun' mode
      let targetBX = st.currCenterBX;
      let targetBY = st.currCenterBY;
      let targetBHW = st.currHalfBW;
      let targetBHH = st.currHalfBH;
      let targetCornerB = st.currCornerB;
      const targetWobbleB = st.mode === 'orbs' ? 1.0 : 0.0;
      const targetAlphaB = st.mode === 'orbs' ? 1.0 : 0.0;

      if (boxB && st.mode === 'orbs') {
        const rB = boxB.getBoundingClientRect();
        if (rB.width > 4 && rB.height > 4) {
          targetBX = (rB.left - canvasRect.left + rB.width * 0.5) * dpr;
          targetBY = (rB.top - canvasRect.top + rB.height * 0.5) * dpr;
          targetBHW = Math.max(rB.width * 0.5 * dpr, 20);
          targetBHH = Math.max(rB.height * 0.5 * dpr, 20);
          targetCornerB = Math.min(targetBHW, targetBHH);
        }
      }

      if (!st.geometryInitialized) {
        st.currCenterAX = targetAX;
        st.currCenterAY = targetAY;
        st.currHalfAW = targetAHW;
        st.currHalfAH = targetAHH;
        st.currCornerA = targetCornerA;
        st.currWobbleA = targetWobbleA;
        st.currAlphaA = targetAlphaA;

        st.currCenterBX = targetBX;
        st.currCenterBY = targetBY;
        st.currHalfBW = targetBHW;
        st.currHalfBH = targetBHH;
        st.currCornerB = targetCornerB;
        st.currWobbleB = targetWobbleB;
        st.currAlphaB = targetAlphaB;
        st.geometryInitialized = true;
      } else {
        const ease = 0.18;
        st.currCenterAX += (targetAX - st.currCenterAX) * ease;
        st.currCenterAY += (targetAY - st.currCenterAY) * ease;
        st.currHalfAW += (targetAHW - st.currHalfAW) * ease;
        st.currHalfAH += (targetAHH - st.currHalfAH) * ease;
        st.currCornerA += (targetCornerA - st.currCornerA) * ease;
        st.currWobbleA += (targetWobbleA - st.currWobbleA) * 0.14;
        st.currAlphaA += (targetAlphaA - st.currAlphaA) * 0.16;

        st.currCenterBX += (targetBX - st.currCenterBX) * ease;
        st.currCenterBY += (targetBY - st.currCenterBY) * ease;
        st.currHalfBW += (targetBHW - st.currHalfBW) * ease;
        st.currHalfBH += (targetBHH - st.currHalfBH) * ease;
        st.currCornerB += (targetCornerB - st.currCornerB) * ease;
        st.currWobbleB += (targetWobbleB - st.currWobbleB) * 0.14;
        st.currAlphaB += (targetAlphaB - st.currAlphaB) * 0.16;
      }

      st.lightX += (st.targetLightX - st.lightX) * 0.08;
      st.lightY += (st.targetLightY - st.lightY) * 0.08;

      const clampedCornerA = Math.min(
        Math.max(st.currCornerA, 4),
        Math.min(st.currHalfAW, st.currHalfAH) - 0.5,
      );
      const clampedCornerB = Math.min(
        Math.max(st.currCornerB, 4),
        Math.min(st.currHalfBW, st.currHalfBH) - 0.5,
      );

      gl.useProgram(program);
      gl.uniform1f(locs.u_time, (now - t0) * 0.001);
      gl.uniform2f(locs.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(locs.u_lightShift, st.lightX, st.lightY);
      gl.uniform1i(locs.u_texture, 0);

      gl.uniform2f(locs.u_centerA, st.currCenterAX, st.currCenterAY);
      gl.uniform2f(locs.u_sizeA, st.currHalfAW, st.currHalfAH);
      gl.uniform1f(locs.u_cornerA, clampedCornerA);
      gl.uniform1f(locs.u_wobbleA, st.currWobbleA);
      gl.uniform1f(locs.u_alphaA, st.currAlphaA);

      gl.uniform2f(locs.u_centerB, st.currCenterBX, st.currCenterBY);
      gl.uniform2f(locs.u_sizeB, st.currHalfBW, st.currHalfBH);
      gl.uniform1f(locs.u_cornerB, clampedCornerB);
      gl.uniform1f(locs.u_wobbleB, st.currWobbleB);
      gl.uniform1f(locs.u_alphaB, st.currAlphaB);

      gl.uniform3f(locs.u_tint, GLASS_CONFIG.tint[0], GLASS_CONFIG.tint[1], GLASS_CONFIG.tint[2]);
      gl.uniform1f(locs.u_saturation, GLASS_CONFIG.saturation);
      gl.uniform1f(locs.u_distortion, GLASS_CONFIG.distortion);
      gl.uniform1f(
        locs.u_blur,
        st.mode === 'orbs' ? GLASS_CONFIG.blurOrbMode : GLASS_CONFIG.blurWindowRim,
      );
      gl.uniform1f(locs.u_imageAspect, st.imageAspect);
      gl.uniform1f(locs.u_canvasAspect, canvas.width / Math.max(canvas.height, 1));
      gl.uniform1f(locs.u_shadowIntensity, GLASS_CONFIG.shadowIntensity);
      gl.uniform2f(
        locs.u_shadowOffset,
        GLASS_CONFIG.shadowOffsetX * dpr,
        GLASS_CONFIG.shadowOffsetY * dpr,
      );
      gl.uniform1f(locs.u_shadowBlur, GLASS_CONFIG.shadowBlur * dpr);
      gl.uniform1f(locs.u_chromaticAberration, GLASS_CONFIG.chromaticAberration);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      delete (canvas as HTMLCanvasElement & { __lgCtx?: unknown }).__lgCtx;
      gl.deleteTexture(texture);
      gl.deleteBuffer(vbo);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  // ── Load PC or Phone WebP texture into WebGL whenever breakpoint changes ─
  useEffect(() => {
    const canvas = canvasRef.current as
      | (HTMLCanvasElement & { __lgCtx?: { gl: WebGLRenderingContext; texture: WebGLTexture | null } })
      | null;
    const ctx = canvas?.__lgCtx;
    if (!ctx || !ctx.texture) return undefined;

    let cancelled = false;
    const targetUrl = isMobileView
      ? LIQUID_GLASS_BACKGROUNDS.phone
      : LIQUID_GLASS_BACKGROUNDS.pc;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.onload = () => {
      if (cancelled || !ctx.texture) return;
      renderStateRef.current.imageAspect =
        img.naturalWidth > 0 && img.naturalHeight > 0
          ? img.naturalWidth / img.naturalHeight
          : isMobileView
            ? 9 / 16
            : 16 / 9;
      try {
        ctx.gl.bindTexture(ctx.gl.TEXTURE_2D, ctx.texture);
        ctx.gl.texImage2D(
          ctx.gl.TEXTURE_2D,
          0,
          ctx.gl.RGBA,
          ctx.gl.RGBA,
          ctx.gl.UNSIGNED_BYTE,
          img,
        );
        setWebglReady(true);
      } catch {
        setWebglReady(false);
      }
    };
    img.onerror = () => {
      if (!cancelled) setWebglReady(false);
    };
    img.src = targetUrl;

    return () => {
      cancelled = true;
    };
  }, [isMobileView]);

  // ── Expose <video> element to NL's audioManager external registry ────────
  useEffect(() => {
    if (mode !== 'video') {
      onVideoElementMount?.(null);
      return undefined;
    }
    const el = videoRef.current;
    onVideoElementMount?.(el);
    return () => {
      onVideoElementMount?.(null);
    };
  }, [mode, onVideoElementMount]);

  // ── Sync mute state with video element ───────────────────────────────────
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = effectiveMuted;
    }
  }, [effectiveMuted, currentVideoIndex]);

  // ── Dynamic HLS (.m3u8) Streaming Lifecycle ──────────────────────────────
  useEffect(() => {
    if (mode !== 'video' || currentVideoIndex === null) return undefined;
    const video = videoRef.current;
    if (!video) return undefined;

    const streamUrl = LIQUID_GLASS_HLS_VIDEOS[currentVideoIndex];
    let cancelled = false;

    const destroyCurrentHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.stopLoad();
          hlsRef.current.detachMedia();
          hlsRef.current.destroy();
        } catch {
          /* ignore */
        }
        hlsRef.current = null;
      }
    };

    destroyCurrentHls();
    setIsBuffering(true);
    video.muted = effectiveMuted;

    const onLoadedMetadata = () => {
      if (cancelled) return;
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        const ratio = Math.min(Math.max(video.videoWidth / video.videoHeight, 0.45), 2.4);
        setVideoAspect(ratio);
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      setIsBuffering(false);
    };

    const onTimeUpdate = () => {
      if (!isScrubbingRef.current) {
        setCurrentTime(video.currentTime || 0);
      }
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
    };

    const onPlay = () => {
      setIsPlaying(true);
      setIsBuffering(false);
      onVideoAudioActiveChange?.(true);
    };

    const onPause = () => {
      setIsPlaying(false);
    };

    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);

    const onEnded = () => {
      setIsPlaying(false);
      if (GLASS_CONFIG.autoAdvanceOnEnded) {
        triggerRandomVideo();
      } else {
        onVideoAudioActiveChange?.(false);
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('play', onPlay);
    video.addEventListener('playing', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEnded);

    const startPlayback = () => {
      if (cancelled) return;
      video.play().catch(() => {
        setIsPlaying(false);
      });
    };

    void (async () => {
      const { default: HlsLib } = await import('hls.js');
      if (cancelled) return;

      if (HlsLib.isSupported()) {
        const hls = new HlsLib({
          enableWorker: true,
          startPosition: 0,
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          backBufferLength: 15,
        });
        hlsRef.current = hls;

        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          startPlayback();
        });

        hls.on(HlsLib.Events.ERROR, (_evt, data) => {
          if (!data.fatal) return;
          if (data.type === HlsLib.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === HlsLib.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            destroyCurrentHls();
            setIsBuffering(false);
          }
        });

        hls.loadSource(streamUrl);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = streamUrl;
        video.addEventListener('loadedmetadata', startPlayback, { once: true });
      }
    })();

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('playing', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEnded);
      destroyCurrentHls();
      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        /* ignore */
      }
    };
  }, [mode, currentVideoIndex, effectiveMuted, onVideoAudioActiveChange, triggerRandomVideo]);

  useEffect(() => {
    return () => {
      onVideoAudioActiveChange?.(false);
    };
  }, [onVideoAudioActiveChange]);

  // ── Player Controls (Play/Pause & Pointer Scrubbing) ─────────────────────
  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) {
      void v.play().catch(() => {});
    } else {
      v.pause();
    }
  }, []);

  const handleToggleMuteClick = useCallback(() => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      setLocalMuted((m) => !m);
    }
  }, [onToggleMute]);

  const seekToClientX = useCallback(
    (clientX: number) => {
      const bar = seekTrackRef.current;
      const v = videoRef.current;
      if (!bar || !v || !Number.isFinite(duration) || duration <= 0) return;
      const rect = bar.getBoundingClientRect();
      const ratio = Math.min(Math.max((clientX - rect.left) / Math.max(rect.width, 1), 0), 1);
      const nextTime = ratio * duration;
      v.currentTime = nextTime;
      setCurrentTime(nextTime);
    },
    [duration],
  );

  const handleSeekPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      isScrubbingRef.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const handleSeekPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isScrubbingRef.current) return;
      seekToClientX(e.clientX);
    },
    [seekToClientX],
  );

  const handleSeekPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbingRef.current) return;
    isScrubbingRef.current = false;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }, []);

  const progressPercent =
    duration > 0 ? Math.min(Math.max((currentTime / duration) * 100, 0), 100) : 0;

  const cornerRadiusPx = isMobileView
    ? GLASS_CONFIG.cornerRadiusMobile
    : GLASS_CONFIG.cornerRadiusDesktop;

  const earthBubblePx = Math.round(286 * orbScale);
  const sunBubblePx = Math.round(286 * orbScale * SUN_SCALE_MULTIPLIER);

  return (
    <div
      data-lg-scope={scopeId}
      className="lg-portal-root"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          '--lg-video-aspect': String(videoAspect),
          '--lg-corner': `${cornerRadiusPx}px`,
          '--lg-orb-scale': String(orbScale),
          '--lg-earth-bubble': `${earthBubblePx}px`,
          '--lg-sun-bubble': `${sunBubblePx}px`,
        } as React.CSSProperties
      }
    >
      <style>{SCOPED_STYLES}</style>

      {/* 1. Instant LCP Responsive Background (<picture>) */}
      <picture className="lg-bg-picture" aria-hidden="true">
        <source
          media={LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery}
          srcSet={LIQUID_GLASS_BACKGROUNDS.phone}
        />
        <img
          src={LIQUID_GLASS_BACKGROUNDS.pc}
          alt=""
          className="lg-bg-img"
          fetchPriority="high"
          decoding="async"
          draggable={false}
        />
      </picture>

      {/* 2. Real-time Dual-Lens WebGL GLSL Liquid Glass Shader Canvas */}
      <canvas
        ref={canvasRef}
        className={`lg-webgl-canvas${webglReady ? ' lg-webgl-canvas--ready' : ''}`}
        aria-hidden="true"
      />

      {/* 3. Top Controls: Return to Orbs button (in video mode) + Close Button (✕) */}
      {mode === 'video' && (
        <button
          type="button"
          className="lg-glass-pill lg-back-orbs-btn"
          onClick={handleReturnToOrbs}
          aria-label="العودة إلى كوكب الأرض والشمس"
        >
          <ArrowLeft size={18} strokeWidth={2.3} />
        </button>
      )}

      {onClose && (
        <button
          type="button"
          className="lg-glass-pill lg-close-btn"
          onClick={onClose}
          aria-label="إغلاق الصفحة"
        >
          <X size={18} strokeWidth={2.3} />
        </button>
      )}

      {/* 4. Main Centered Stage: Dynamic Dual Orbs (Earth + Sun), Video Player, or Full-Page Sun Albums */}
      {mode === 'sun' ? (
        <SunAlbumsStage
          viewportWidth={viewport.width}
          viewportHeight={viewport.height}
          externalMuted={effectiveMuted}
          onToggleMute={handleToggleMuteClick}
          onAudioActiveChange={onVideoAudioActiveChange}
          onAudioElementMount={onVideoElementMount}
          onBackToOrbs={handleReturnToOrbs}
        />
      ) : (
        <main
          className={`lg-stage ${
            mode === 'orbs'
              ? isStackedLayout
                ? 'lg-stage--orbs-column'
                : 'lg-stage--orbs-row'
              : 'lg-stage--expanded'
          }`}
        >
          {/* ── EARTH CELESTIAL COLUMN (Earth Liquid Glass Bubble + /X.webp Title) ── */}
          <div
            className={`lg-celestial-unit lg-celestial-unit--earth${
              mode === 'video' ? ' lg-celestial-unit--expanded' : ''
            }`}
          >
            <div
              ref={glassBoxRef}
              className={`lg-main-glass ${
                mode === 'video' ? 'lg-main-glass--video' : 'lg-main-glass--earth'
              }${!webglReady ? ' lg-main-glass--css-fallback' : ''}`}
            >
              <div className="lg-main-glass__caustic" aria-hidden="true" />
              <div className="lg-main-glass__rim" aria-hidden="true" />
              <div className="lg-main-glass__sheen" aria-hidden="true" />

              <RotatingEarthButton
                onActivate={triggerRandomVideo}
                hidden={mode === 'video'}
              />

              {mode === 'video' && (
                <div className="lg-video-viewport" onClick={togglePlayPause}>
                  <video
                    ref={videoRef}
                    className="lg-video-el"
                    width={1280}
                    height={720}
                    playsInline
                    preload="none"
                  />

                  {isBuffering && (
                    <div className="lg-video-spinner-wrap" aria-hidden="true">
                      <div className="lg-video-spinner" />
                    </div>
                  )}

                  {!isPlaying && !isBuffering && (
                    <div className="lg-video-paused-badge" aria-hidden="true">
                      <Play size={26} fill="currentColor" />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Transparent /X.webp (2400x1340) Title Centered Beneath Earth — No bubble around it */}
            {mode === 'orbs' && (
              <img
                src={LIQUID_GLASS_TITLE_IMAGES.earthX}
                alt="X"
                width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
                height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
                onClick={triggerRandomVideo}
                className="lg-orb-title-img lg-orb-title-img--earth"
                decoding="async"
                draggable={false}
              />
            )}
          </div>

          {/* ── SUN CELESTIAL COLUMN (Sun 1.15x Liquid Glass Bubble + /ALBUMS.webp Title) ── */}
          <div
            className={`lg-celestial-unit lg-celestial-unit--sun${
              mode === 'video' ? ' lg-celestial-unit--hidden' : ''
            }`}
          >
            <div
              ref={sunGlassBoxRef}
              className={`lg-main-glass lg-main-glass--sun${
                !webglReady ? ' lg-main-glass--css-fallback' : ''
              }`}
            >
              <div className="lg-main-glass__caustic lg-main-glass__caustic--sun" aria-hidden="true" />
              <div className="lg-main-glass__rim lg-main-glass__rim--sun" aria-hidden="true" />
              <div className="lg-main-glass__sheen" aria-hidden="true" />

              <RotatingSunButton
                onActivate={onOpenSunWindow}
                hidden={false}
              />
            </div>

            {/* Transparent /ALBUMS.webp (2400x1340) Title Centered Beneath Sun — No bubble around it */}
            {mode === 'orbs' && (
              <img
                src={LIQUID_GLASS_TITLE_IMAGES.sunAlbums}
                alt="ALBUMS"
                width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
                height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
                onClick={onOpenSunWindow}
                className="lg-orb-title-img lg-orb-title-img--sun"
                decoding="async"
                draggable={false}
              />
            )}
          </div>

          {/* 5. Transparent Glass Capillary Tube Progress Bar with Flowing Blood-Red Liquid */}
          {mode === 'video' && (
            <div
              className="lg-glass-pill lg-progress-bar"
              role="region"
              aria-label="شريط تقدم الفيديو"
            >
              <button
                type="button"
                className="lg-icon-tap"
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
              >
                {isPlaying ? (
                  <Pause size={15} fill="currentColor" />
                ) : (
                  <Play size={15} fill="currentColor" />
                )}
              </button>

              <div
                ref={seekTrackRef}
                className="lg-seek-hit"
                role="slider"
                tabIndex={0}
                aria-label="تقديم أو ترجيع الفيديو"
                aria-valuemin={0}
                aria-valuemax={Math.round(duration || 0)}
                aria-valuenow={Math.round(currentTime || 0)}
                onPointerDown={handleSeekPointerDown}
                onPointerMove={handleSeekPointerMove}
                onPointerUp={handleSeekPointerUp}
                onPointerCancel={handleSeekPointerUp}
              >
                <div className="lg-seek-track">
                  <div
                    className="lg-seek-fill"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <span className="lg-seek-fill__wave" aria-hidden="true" />
                  </div>
                  <div
                    className="lg-seek-thumb"
                    style={{ left: `${progressPercent}%` }}
                  />
                  <div className="lg-seek-tube-gloss" aria-hidden="true" />
                </div>
              </div>

              <span className="lg-time-readout">
                {formatDuration(currentTime)} / {formatDuration(duration)}
              </span>

              <button
                type="button"
                className="lg-icon-tap"
                onClick={handleToggleMuteClick}
                aria-label={effectiveMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
              >
                {effectiveMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          )}
        </main>
      )}

      {/* 6. Icon-Only Professional Liquid Glass Shuffle Bubble at Bottom of Page */}
      {mode === 'video' && (
        <div className="lg-bottom-dock">
          <button
            type="button"
            className="lg-next-random-btn"
            onClick={triggerRandomVideo}
            aria-label="عرض فيديو عشوائي آخر"
          >
            <span className="lg-next-random-btn__sheen" aria-hidden="true" />
            <span className="lg-next-random-btn__caustic" aria-hidden="true" />
            <Shuffle size={20} strokeWidth={2.3} className="lg-next-random-btn__icon" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Scoped Styles — Dual Living Circular Liquid Bubbles (Earth 1.0x + Sun 1.15x),
// Floating Transparent Titles (/X.webp & /ALBUMS.webp), Dynamic Layout Switching
// ============================================================================
const SCOPED_STYLES = `
  .lg-portal-root {
    position: fixed;
    inset: 0;
    width: 100dvw;
    height: 100dvh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #060911;
    overscroll-behavior: contain;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    isolation: isolate;
  }

  .lg-bg-picture,
  .lg-bg-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    pointer-events: none;
    z-index: 0;
  }

  .lg-webgl-canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.35s ease;
  }

  .lg-webgl-canvas--ready {
    opacity: 1;
  }

  /* ── Shared iOS 26 / NL VisionOS Liquid Glass Pill Surface ─────────────── */
  .lg-glass-pill {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.95);
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0.04) 100%),
      rgba(12, 16, 24, 0.26);
    -webkit-backdrop-filter: blur(18px) saturate(180%);
    backdrop-filter: blur(18px) saturate(180%);
    box-shadow:
      0 12px 30px rgba(0, 0, 0, 0.28),
      inset 0 1.2px 0.8px rgba(255, 255, 255, 0.62),
      inset 0 -1px 0 rgba(0, 0, 0, 0.22);
    isolation: isolate;
    transition: transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.22s ease;
  }

  .lg-glass-pill::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    pointer-events: none;
    background: conic-gradient(
      from 200deg at 50% 50%,
      rgba(255, 255, 255, 0.85) 0deg,
      rgba(138, 214, 255, 0.42) 70deg,
      rgba(126, 240, 180, 0.32) 130deg,
      rgba(255, 255, 255, 0.14) 190deg,
      rgba(232, 168, 255, 0.34) 255deg,
      rgba(146, 212, 255, 0.42) 315deg,
      rgba(255, 255, 255, 0.85) 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }

  .lg-close-btn {
    position: fixed;
    top: max(16px, env(safe-area-inset-top));
    right: max(16px, env(safe-area-inset-right));
    z-index: 30;
    width: 44px;
    height: 44px;
    cursor: pointer;
  }

  .lg-back-orbs-btn {
    position: fixed;
    top: max(16px, env(safe-area-inset-top));
    left: max(16px, env(safe-area-inset-left));
    z-index: 30;
    width: 44px;
    height: 44px;
    cursor: pointer;
  }

  .lg-close-btn:hover,
  .lg-back-orbs-btn:hover {
    transform: scale(1.05);
  }

  .lg-close-btn:active,
  .lg-back-orbs-btn:active {
    transform: scale(0.95);
  }

  /* ── Center Stage & Dynamic Responsive Layout (Row on PC, Column on Phone) ─ */
  .lg-stage {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    padding:
      max(58px, calc(env(safe-area-inset-top) + 46px))
      max(16px, env(safe-area-inset-left))
      max(32px, calc(env(safe-area-inset-bottom) + 24px))
      max(16px, env(safe-area-inset-right));
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    pointer-events: none;
    transition: gap 0.52s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-stage--orbs-row {
    flex-direction: row;
    gap: clamp(32px, 6.5vw, 108px);
  }

  .lg-stage--orbs-column {
    flex-direction: column;
    gap: clamp(14px, 2.6dvh, 34px);
  }

  .lg-stage--expanded {
    flex-direction: column;
    gap: 16px;
    padding-bottom: max(82px, calc(env(safe-area-inset-bottom) + 74px));
  }

  /* ── Individual Celestial Unit (Orb Bubble + Centered Floating Title) ──── */
  .lg-celestial-unit {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(10px * var(--lg-orb-scale, 1));
    pointer-events: none;
    transition:
      transform 0.58s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-celestial-unit--hidden {
    opacity: 0;
    transform: scale(0.72);
    pointer-events: none;
    position: absolute;
    visibility: hidden;
  }

  .lg-celestial-unit--expanded {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ── Transparent Floating Title Images (/X.webp & /ALBUMS.webp) ────────── */
  .lg-orb-title-img {
    pointer-events: auto;
    cursor: pointer;
    height: auto;
    aspect-ratio: 2400 / 1340;
    object-fit: contain;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0;
    margin: 0;
    display: block;
    flex-shrink: 0;
    will-change: transform;
    transition:
      width 0.45s cubic-bezier(0.22, 1, 0.36, 1),
      filter 0.32s ease;
  }

  /* X under Earth — smaller than the Earth orb to fit proportionally as a title */
  .lg-orb-title-img--earth {
    width: calc(var(--lg-earth-bubble, 286px) * 0.62);
    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.42));
    animation: lgTitleFloatEarth 4.4s ease-in-out infinite;
  }

  .lg-orb-title-img--earth:hover {
    filter: drop-shadow(0 10px 22px rgba(185, 238, 255, 0.48));
  }

  /* ALBUMS under Sun — smaller than the Sun orb to fit proportionally as a title */
  .lg-orb-title-img--sun {
    width: calc(var(--lg-sun-bubble, 329px) * 0.62);
    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.42));
    animation: lgTitleFloatSun 4.8s ease-in-out infinite;
  }

  .lg-orb-title-img--sun:hover {
    filter: drop-shadow(0 10px 22px rgba(255, 170, 75, 0.48));
  }

  @keyframes lgTitleFloatEarth {
    0%, 100% {
      transform: translate3d(0, 0px, 0) scale3d(1, 1, 1) rotate(0deg);
    }
    25% {
      transform: translate3d(0, -3.5px, 0) scale3d(1.018, 0.986, 1) rotate(0.7deg);
    }
    50% {
      transform: translate3d(0, 2px, 0) scale3d(0.988, 1.014, 1) rotate(-0.7deg);
    }
    75% {
      transform: translate3d(0, -2px, 0) scale3d(1.01, 0.992, 1) rotate(0.35deg);
    }
  }

  @keyframes lgTitleFloatSun {
    0%, 100% {
      transform: translate3d(0, 0px, 0) scale3d(1, 1, 1) rotate(0deg);
    }
    25% {
      transform: translate3d(0, 2.5px, 0) scale3d(0.988, 1.015, 1) rotate(-0.7deg);
    }
    50% {
      transform: translate3d(0, -3.5px, 0) scale3d(1.018, 0.986, 1) rotate(0.75deg);
    }
    75% {
      transform: translate3d(0, 1.5px, 0) scale3d(1.008, 0.994, 1) rotate(-0.35deg);
    }
  }

  /* ── Liquid Glass Bubble Containers (Earth 1.0x & Sun 1.15x) ───────────── */
  .lg-main-glass {
    position: relative;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    isolation: isolate;
    transform-origin: center center;
    transition:
      width 0.68s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.68s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.68s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.55s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.55s ease;
  }

  /* Earth Bubble (Base 1.0x scale) */
  .lg-main-glass--earth {
    width: var(--lg-earth-bubble, 286px);
    height: var(--lg-earth-bubble, 286px);
    border-radius: 53% 47% 52% 48% / 48% 53% 47% 52%;
    background:
      radial-gradient(
        circle at 30% 22%,
        rgba(255, 255, 255, 0.42) 0%,
        rgba(255, 255, 255, 0.10) 26%,
        rgba(255, 255, 255, 0.0) 56%
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(255, 255, 255, 0.0) 68%,
        rgba(185, 232, 255, 0.14) 88%,
        rgba(255, 255, 255, 0.34) 97%,
        rgba(255, 255, 255, 0.55) 100%
      );
    box-shadow:
      0 20px 48px -10px rgba(0, 0, 0, 0.32),
      0 0 28px -4px rgba(165, 230, 255, 0.24),
      inset 0 2px 3px rgba(255, 255, 255, 0.85),
      inset 0 -3px 6px rgba(135, 210, 255, 0.28),
      inset 0 0 18px rgba(255, 255, 255, 0.16);
    animation: lgBubbleWobble 4.4s ease-in-out infinite;
  }

  /* Sun Bubble (1.15x scale — 15% larger than Earth, with same liquid glass bubble effect) */
  .lg-main-glass--sun {
    width: var(--lg-sun-bubble, 329px);
    height: var(--lg-sun-bubble, 329px);
    border-radius: 48% 52% 47% 53% / 52% 48% 53% 47%;
    background:
      radial-gradient(
        circle at 30% 22%,
        rgba(255, 255, 255, 0.44) 0%,
        rgba(255, 230, 195, 0.12) 28%,
        rgba(255, 255, 255, 0.0) 58%
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(255, 255, 255, 0.0) 66%,
        rgba(255, 195, 125, 0.16) 87%,
        rgba(255, 240, 215, 0.36) 97%,
        rgba(255, 255, 255, 0.58) 100%
      );
    box-shadow:
      0 22px 52px -10px rgba(0, 0, 0, 0.34),
      0 0 36px -4px rgba(255, 155, 50, 0.28),
      inset 0 2px 3px rgba(255, 255, 255, 0.88),
      inset 0 -3px 6px rgba(255, 185, 110, 0.32),
      inset 0 0 20px rgba(255, 235, 205, 0.18);
    animation: lgBubbleWobbleSun 4.8s ease-in-out infinite;
  }

  /* Video Player State (when Earth is clicked) */
  .lg-main-glass--video {
    --lg-avail-w: min(92dvw, 1080px);
    --lg-avail-h: calc(100dvh - 210px);
    aspect-ratio: var(--lg-video-aspect, 1.7778);
    width: min(var(--lg-avail-w), calc(var(--lg-avail-h) * var(--lg-video-aspect, 1.7778)));
    height: min(var(--lg-avail-h), calc(var(--lg-avail-w) / var(--lg-video-aspect, 1.7778)));
    max-width: var(--lg-avail-w);
    max-height: var(--lg-avail-h);
    border-radius: var(--lg-corner, 32px);
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.18) 0%,
        rgba(255, 255, 255, 0.02) 45%,
        transparent 75%
      );
    box-shadow:
      0 26px 64px -12px rgba(0, 0, 0, 0.52),
      0 0 32px -8px rgba(145, 215, 255, 0.2),
      inset 0 1.5px 2px rgba(255, 255, 255, 0.78),
      inset 0 -1.5px 3px rgba(145, 215, 255, 0.22);
    animation: none;
  }

  /* Prepared Sun Window State (when Sun is clicked — shows current background image) */
  .lg-main-glass--sun-window {
    width: min(92dvw, 1040px);
    height: min(calc(100dvh - 150px), 680px);
    border-radius: var(--lg-corner, 32px);
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.18) 0%,
        rgba(255, 255, 255, 0.02) 45%,
        transparent 75%
      );
    box-shadow:
      0 26px 64px -12px rgba(0, 0, 0, 0.52),
      0 0 36px -8px rgba(255, 165, 75, 0.24),
      inset 0 1.5px 2px rgba(255, 255, 255, 0.82),
      inset 0 -1.5px 3px rgba(255, 190, 120, 0.24);
    animation: none;
  }

  /* CSS fallback glass if WebGL or CORS fails */
  .lg-main-glass--css-fallback.lg-main-glass--earth,
  .lg-main-glass--css-fallback.lg-main-glass--sun {
    -webkit-backdrop-filter: blur(6px) saturate(145%);
    backdrop-filter: blur(6px) saturate(145%);
  }

  .lg-main-glass--css-fallback.lg-main-glass--video,
  .lg-main-glass--css-fallback.lg-main-glass--sun-window {
    -webkit-backdrop-filter: blur(16px) saturate(170%);
    backdrop-filter: blur(16px) saturate(170%);
  }

  /* Organic Siri/NotchIsland liquid droplet wobble keyframes */
  @keyframes lgBubbleWobble {
    0%, 100% {
      border-radius: 53% 47% 52% 48% / 48% 53% 47% 52%;
      transform: scale3d(1, 1, 1) rotate(0deg);
    }
    25% {
      border-radius: 46% 54% 48% 52% / 54% 47% 53% 46%;
      transform: scale3d(1.018, 0.984, 1) rotate(0.8deg);
    }
    50% {
      border-radius: 55% 45% 54% 46% / 46% 55% 45% 54%;
      transform: scale3d(0.986, 1.016, 1) rotate(-0.8deg);
    }
    75% {
      border-radius: 48% 52% 46% 54% / 52% 46% 54% 48%;
      transform: scale3d(1.012, 0.99, 1) rotate(0.4deg);
    }
  }

  @keyframes lgBubbleWobbleSun {
    0%, 100% {
      border-radius: 48% 52% 47% 53% / 52% 48% 53% 47%;
      transform: scale3d(1, 1, 1) rotate(0deg);
    }
    25% {
      border-radius: 54% 46% 53% 47% / 47% 53% 46% 54%;
      transform: scale3d(0.986, 1.016, 1) rotate(-0.75deg);
    }
    50% {
      border-radius: 46% 54% 48% 52% / 54% 46% 52% 48%;
      transform: scale3d(1.018, 0.984, 1) rotate(0.8deg);
    }
    75% {
      border-radius: 52% 48% 54% 46% / 48% 54% 46% 52%;
      transform: scale3d(1.01, 0.992, 1) rotate(-0.4deg);
    }
  }

  /* Rotating liquid caustic light ring inside the glass wall */
  .lg-main-glass__caustic {
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1.6px;
    pointer-events: none;
    z-index: 5;
    background: conic-gradient(
      from 0deg at 50% 50%,
      rgba(255, 255, 255, 0.92) 0deg,
      rgba(165, 232, 255, 0.45) 60deg,
      rgba(255, 255, 255, 0.08) 125deg,
      rgba(195, 240, 255, 0.52) 195deg,
      rgba(255, 255, 255, 0.10) 265deg,
      rgba(180, 228, 255, 0.48) 320deg,
      rgba(255, 255, 255, 0.92) 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0.9;
  }

  .lg-main-glass__caustic--sun {
    background: conic-gradient(
      from 20deg at 50% 50%,
      rgba(255, 255, 255, 0.94) 0deg,
      rgba(255, 205, 135, 0.52) 60deg,
      rgba(255, 255, 255, 0.10) 125deg,
      rgba(255, 220, 165, 0.55) 195deg,
      rgba(255, 255, 255, 0.12) 265deg,
      rgba(255, 195, 125, 0.50) 320deg,
      rgba(255, 255, 255, 0.94) 360deg
    );
  }

  .lg-main-glass__rim {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 4;
    box-shadow:
      inset 0 2px 2px rgba(255, 255, 255, 0.82),
      inset 0 -2px 3px rgba(170, 230, 255, 0.28),
      inset 2px 0 3px rgba(255, 255, 255, 0.28),
      inset -2px 0 3px rgba(195, 225, 255, 0.24);
  }

  .lg-main-glass__rim--sun {
    box-shadow:
      inset 0 2px 2px rgba(255, 255, 255, 0.85),
      inset 0 -2px 3px rgba(255, 195, 130, 0.32),
      inset 2px 0 3px rgba(255, 255, 255, 0.30),
      inset -2px 0 3px rgba(255, 210, 155, 0.26);
  }

  .lg-main-glass__sheen {
    position: absolute;
    inset: 3px 6px auto 6px;
    height: 42%;
    border-radius: inherit;
    pointer-events: none;
    z-index: 4;
    background: radial-gradient(
      90% 85% at 36% 14%,
      rgba(255, 255, 255, 0.48) 0%,
      rgba(255, 255, 255, 0.12) 45%,
      rgba(255, 255, 255, 0) 78%
    );
    transition: opacity 0.45s ease;
  }

  .lg-main-glass--video .lg-main-glass__sheen,
  .lg-main-glass--sun-window .lg-main-glass__sheen {
    opacity: 0.38;
  }

  /* ── Video Viewport & Prepared Sun Window Viewport ─────────────────────── */
  .lg-video-viewport,
  .lg-sun-window-viewport {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    overflow: hidden;
    animation: lgBubbleMorphIn 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .lg-video-viewport {
    background: rgba(3, 5, 10, 0.55);
    cursor: pointer;
  }

  .lg-sun-window-viewport {
    background: transparent;
  }

  .lg-sun-window-bg-picture,
  .lg-sun-window-bg-img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
    border-radius: inherit;
    pointer-events: none;
  }

  .lg-video-el {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    border-radius: inherit;
  }

  .lg-video-spinner-wrap,
  .lg-video-paused-badge {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .lg-video-spinner {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2.5px solid rgba(255, 255, 255, 0.22);
    border-top-color: rgba(255, 255, 255, 0.95);
    animation: lgSpin 0.8s linear infinite;
  }

  .lg-video-paused-badge {
    width: 56px;
    height: 56px;
    margin: auto;
    border-radius: 50%;
    color: #fff;
    background: rgba(12, 16, 26, 0.45);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55), 0 8px 24px rgba(0, 0, 0, 0.35);
  }

  /* ── Transparent Glass Capillary Tube Progress Bar + Blood-Red Liquid ──── */
  .lg-progress-bar {
    pointer-events: auto;
    width: min(90dvw, 530px);
    min-height: 46px;
    padding: 5px 12px;
    gap: 10px;
    box-sizing: border-box;
    background:
      linear-gradient(180deg, rgba(255, 255, 255, 0.20) 0%, rgba(255, 255, 255, 0.03) 55%, rgba(120, 12, 26, 0.08) 100%),
      rgba(10, 12, 18, 0.18);
    -webkit-backdrop-filter: blur(16px) saturate(185%);
    backdrop-filter: blur(16px) saturate(185%);
    box-shadow:
      0 14px 34px rgba(0, 0, 0, 0.26),
      0 0 20px rgba(175, 16, 36, 0.12),
      inset 0 1.5px 1px rgba(255, 255, 255, 0.72),
      inset 0 -1px 2px rgba(255, 120, 135, 0.18);
    animation: lgFadeSlideUp 0.42s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .lg-icon-tap {
    width: 36px;
    height: 36px;
    min-width: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.06);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38);
    color: rgba(255, 255, 255, 0.95);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
  }

  .lg-icon-tap:hover {
    background: rgba(255, 255, 255, 0.15);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 0 12px rgba(255, 255, 255, 0.15);
  }

  .lg-icon-tap:active {
    transform: scale(0.92);
  }

  .lg-seek-hit {
    flex: 1;
    height: 34px;
    display: flex;
    align-items: center;
    cursor: pointer;
    touch-action: none;
  }

  .lg-seek-track {
    position: relative;
    width: 100%;
    height: 11px;
    border-radius: 999px;
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.24) 0%,
        rgba(255, 255, 255, 0.04) 38%,
        rgba(8, 10, 16, 0.22) 78%,
        rgba(255, 255, 255, 0.14) 100%
      );
    border: 1px solid rgba(255, 255, 255, 0.34);
    box-shadow:
      inset 0 1.5px 2px rgba(255, 255, 255, 0.65),
      inset 0 -1.5px 2.5px rgba(0, 0, 0, 0.45),
      0 2px 8px rgba(0, 0, 0, 0.22);
    overflow: visible;
  }

  .lg-seek-tube-gloss {
    position: absolute;
    inset: 1px 2px auto 2px;
    height: 38%;
    border-radius: 999px;
    pointer-events: none;
    z-index: 3;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.72) 0%,
      rgba(255, 255, 255, 0.12) 100%
    );
  }

  .lg-seek-fill {
    position: absolute;
    left: 1px;
    top: 1px;
    bottom: 1px;
    border-radius: 999px;
    overflow: hidden;
    z-index: 1;
    background:
      linear-gradient(
        180deg,
        rgba(255, 95, 112, 0.88) 0%,
        rgba(198, 12, 34, 0.86) 45%,
        rgba(122, 4, 18, 0.92) 82%,
        rgba(220, 48, 68, 0.88) 100%
      );
    box-shadow:
      0 0 12px rgba(205, 14, 38, 0.62),
      0 0 22px rgba(165, 8, 26, 0.35),
      inset 0 1px 1.5px rgba(255, 185, 195, 0.72),
      inset 0 -1px 2px rgba(72, 0, 10, 0.75);
    transition: width 0.08s linear;
  }

  .lg-seek-fill__wave {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      -65deg,
      rgba(255, 255, 255, 0.0) 0px,
      rgba(255, 150, 165, 0.22) 10px,
      rgba(130, 4, 18, 0.18) 20px,
      rgba(255, 255, 255, 0.0) 30px
    );
    background-size: 42px 100%;
    animation: lgBloodWave 2.2s linear infinite;
  }

  @keyframes lgBloodWave {
    from {
      background-position: 0 0;
    }
    to {
      background-position: 42px 0;
    }
  }

  .lg-seek-thumb {
    position: absolute;
    top: 50%;
    z-index: 4;
    width: 14px;
    height: 14px;
    border-radius: 54% 46% 52% 48% / 48% 54% 46% 52%;
    background:
      radial-gradient(
        circle at 34% 28%,
        rgba(255, 235, 238, 0.96) 0%,
        rgba(245, 58, 80, 0.92) 32%,
        rgba(175, 8, 28, 0.94) 72%,
        rgba(105, 2, 14, 0.98) 100%
      );
    border: 1px solid rgba(255, 210, 218, 0.75);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.45),
      0 0 12px rgba(220, 20, 45, 0.85),
      inset 0 1.5px 1.5px rgba(255, 255, 255, 0.88);
    transform: translate(-50%, -50%);
    transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease;
  }

  .lg-seek-hit:hover .lg-seek-thumb,
  .lg-seek-hit:active .lg-seek-thumb {
    transform: translate(-50%, -50%) scale(1.28);
    box-shadow:
      0 2px 10px rgba(0, 0, 0, 0.5),
      0 0 18px rgba(245, 30, 58, 0.95),
      inset 0 1.5px 2px rgba(255, 255, 255, 0.95);
  }

  .lg-time-readout {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: clamp(0.72rem, 0.66rem + 0.25vw, 0.82rem);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    color: rgba(255, 255, 255, 0.92);
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  }

  /* ── Icon-Only Liquid Glass Shuffle Bubble at Page Bottom ──────────────── */
  .lg-bottom-dock {
    position: fixed;
    left: 0;
    right: 0;
    bottom: max(14px, env(safe-area-inset-bottom));
    z-index: 25;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .lg-next-random-btn {
    position: relative;
    pointer-events: auto;
    width: 56px;
    height: 56px;
    padding: 0;
    border: none;
    border-radius: 53% 47% 52% 48% / 48% 53% 47% 52%;
    color: rgba(255, 255, 255, 0.96);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    isolation: isolate;
    background:
      radial-gradient(
        circle at 30% 22%,
        rgba(255, 255, 255, 0.52) 0%,
        rgba(255, 255, 255, 0.14) 28%,
        rgba(255, 255, 255, 0.0) 58%
      ),
      radial-gradient(
        circle at 50% 50%,
        rgba(14, 20, 32, 0.18) 0%,
        rgba(165, 228, 255, 0.18) 84%,
        rgba(255, 255, 255, 0.46) 97%,
        rgba(255, 255, 255, 0.68) 100%
      );
    -webkit-backdrop-filter: blur(16px) saturate(190%);
    backdrop-filter: blur(16px) saturate(190%);
    box-shadow:
      0 16px 36px -6px rgba(0, 0, 0, 0.42),
      0 0 24px -2px rgba(165, 232, 255, 0.34),
      inset 0 2px 3px rgba(255, 255, 255, 0.9),
      inset 0 -3px 6px rgba(135, 210, 255, 0.36),
      inset 0 0 14px rgba(255, 255, 255, 0.22);
    animation:
      lgFadeSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) both,
      lgShuffleBubbleWobble 3.8s ease-in-out infinite;
    transition:
      transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.24s ease;
  }

  .lg-next-random-btn__sheen {
    position: absolute;
    inset: 3px 7px auto 7px;
    height: 40%;
    border-radius: 50%;
    pointer-events: none;
    background: radial-gradient(
      85% 85% at 38% 18%,
      rgba(255, 255, 255, 0.68) 0%,
      rgba(255, 255, 255, 0.16) 52%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  .lg-next-random-btn__caustic {
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 1.4px;
    pointer-events: none;
    background: conic-gradient(
      from 45deg at 50% 50%,
      rgba(255, 255, 255, 0.95) 0deg,
      rgba(155, 228, 255, 0.55) 75deg,
      rgba(255, 255, 255, 0.12) 145deg,
      rgba(210, 175, 255, 0.48) 225deg,
      rgba(145, 225, 255, 0.52) 300deg,
      rgba(255, 255, 255, 0.95) 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }

  .lg-next-random-btn__icon {
    position: relative;
    z-index: 2;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
    transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-next-random-btn:hover {
    box-shadow:
      0 18px 42px -6px rgba(0, 0, 0, 0.48),
      0 0 32px rgba(175, 238, 255, 0.52),
      inset 0 2.5px 3.5px rgba(255, 255, 255, 0.95),
      inset 0 -3px 7px rgba(145, 220, 255, 0.45),
      inset 0 0 18px rgba(255, 255, 255, 0.28);
  }

  .lg-next-random-btn:hover .lg-next-random-btn__icon {
    transform: scale(1.14) rotate(12deg);
  }

  .lg-next-random-btn:active .lg-next-random-btn__icon {
    transform: scale(0.9);
  }

  @keyframes lgShuffleBubbleWobble {
    0%, 100% {
      border-radius: 53% 47% 52% 48% / 48% 53% 47% 52%;
      transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
    }
    25% {
      border-radius: 47% 53% 48% 52% / 53% 47% 52% 48%;
      transform: translate3d(0, -3px, 0) scale3d(1.03, 0.97, 1);
    }
    50% {
      border-radius: 54% 46% 53% 47% / 46% 54% 47% 53%;
      transform: translate3d(0, 1px, 0) scale3d(0.975, 1.028, 1);
    }
    75% {
      border-radius: 48% 52% 47% 53% / 52% 48% 53% 47%;
      transform: translate3d(0, -2px, 0) scale3d(1.018, 0.985, 1);
    }
  }

  /* ==========================================================================
   * [EDIT HERE: EARTH & SUN ORBS + 7 TWINKLING STARS]
   * ========================================================================== */
  .lg-earth-trigger,
  .lg-sun-trigger {
    position: relative;
    z-index: 5;
    width: 100%;
    height: 100%;
    border: none;
    background: transparent;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: inherit;
    opacity: 1;
    transform: scale(1);
    transition:
      opacity 0.38s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.48s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-earth-trigger--morphed,
  .lg-sun-trigger--morphed {
    opacity: 0;
    transform: scale(1.16);
    pointer-events: none;
    position: absolute;
    inset: 0;
  }

  .lg-earth-scale-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    transform: scale(var(--lg-orb-scale, 1));
    transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.32s ease;
  }

  .lg-earth-trigger:hover .lg-earth-scale-wrap {
    transform: scale(calc(var(--lg-orb-scale, 1) * 1.035));
    filter: drop-shadow(0 0 18px rgba(195, 244, 255, 0.36));
  }

  .lg-earth-trigger:active .lg-earth-scale-wrap {
    transform: scale(calc(var(--lg-orb-scale, 1) * 0.96));
  }

  /*
   * Sun inner banner is 300px native vs Earth's 250px native.
   * Scaling 300px by (var(--lg-orb-scale) * 0.9583) yields 287.5px = 250px * 1.15,
   * so the Sun orb and its surrounding Liquid Glass bubble are both 15% larger than Earth.
   */
  .lg-sun-scale-wrap {
    display: flex;
    align-items: center;
    justify-content: center;
    transform: scale(calc(var(--lg-orb-scale, 1) * 0.9583));
    transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.32s ease;
  }

  .lg-sun-trigger:hover .lg-sun-scale-wrap {
    transform: scale(calc(var(--lg-orb-scale, 1) * 0.992));
    filter: drop-shadow(0 0 22px rgba(255, 155, 45, 0.48));
  }

  .lg-sun-trigger:active .lg-sun-scale-wrap {
    transform: scale(calc(var(--lg-orb-scale, 1) * 0.92));
  }

  /* Rotating Earth Sphere (250x250 base) */
  .lg-section-banner {
    height: 250px;
    width: 250px;
    position: relative;
    transition: left 0.3s linear;
    background: url("${EARTH_TEXTURE_DATA_URI}");
    background-size: cover;
    background-position: left;
    bottom: 0px;
    border-radius: 50%;
    animation: lgEarthRotate 30s linear 0s infinite;
    box-shadow:
      0px 0 20px rgba(255, 255, 255, 0.2),
      -5px 0px 8px #c3f4ff inset,
      15px 2px 25px #000 inset,
      -24px -2px 34px #c3f4ff99 inset,
      250px 0px 44px #00000066 inset,
      150px 0px 38px #000000aa inset;
  }

  @keyframes lgEarthRotate {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 400px 0;
    }
  }

  /* Rotating & Pulsing Sun Sphere (300x300 from user snippet, scaled to 1.15x Earth) */
  .lg-section-banner-sun {
    height: 300px;
    width: 300px;
    position: relative;
    transition: left 0.3s linear;
    background: url("${SUN_TEXTURE_DATA_URI}");
    background-size: cover;
    background-position: left;
    bottom: 0px;
    border-radius: 50%;
    animation:
      lgSunRotate 30s linear 0s infinite,
      lgSunShadowPulse 5s ease-in-out infinite;
    box-shadow:
      0px 0px 40px 20px rgba(255, 140, 0, 0.8),
      -5px 0px 10px 1px #ffb453 inset,
      15px 2px 40px 20px #bb6d01c5 inset,
      -24px -2px 50px 25px #ffa265c2 inset,
      150px 0px 80px 35px #c55f00aa inset;
  }

  @keyframes lgSunRotate {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 400px 0;
    }
  }

  @keyframes lgSunShadowPulse {
    0%,
    100% {
      box-shadow:
        0px 0px 40px 20px rgba(255, 140, 0, 0.8),
        -5px 0px 10px 1px #ffb453 inset,
        15px 2px 40px 20px #bb6d01c5 inset,
        -24px -2px 50px 25px #ffa265c2 inset,
        150px 0px 80px 35px #c55f00aa inset;
    }
    50% {
      box-shadow:
        0px 0px 60px 30px rgba(255, 140, 0, 0.9),
        -5px 0px 20px 5px #ffb453 inset,
        15px 2px 60px 30px #bb6d01c5 inset,
        -24px -2px 70px 35px #ffa265c2 inset,
        150px 0px 100px 45px #c55f00aa inset;
    }
  }

  .lg-curved-corner-star {
    display: flex;
    position: relative;
  }

  .lg-cc-bl,
  .lg-cc-br,
  .lg-cc-tl,
  .lg-cc-tr {
    width: 4px;
    height: 5px;
    overflow: hidden;
    position: relative;
  }

  .lg-cc-bl::before,
  .lg-cc-br::before,
  .lg-cc-tl::before,
  .lg-cc-tr::before {
    content: "";
    display: block;
    width: 200%;
    height: 200%;
    position: absolute;
    border-radius: 50%;
  }

  .lg-cc-bl::before {
    bottom: 0;
    left: 0;
    box-shadow: -5px 5px 0 0 white;
  }

  .lg-cc-br::before {
    bottom: 0;
    right: 0;
    box-shadow: 5px 5px 0 0 white;
  }

  .lg-cc-tl::before {
    top: 0;
    left: 0;
    box-shadow: -5px -5px 0 0 white;
  }

  .lg-cc-tr::before {
    top: 0;
    right: 0;
    box-shadow: 5px -5px 0 0 white;
  }

  @keyframes lgTwinkling {
    0%,
    100% {
      opacity: 0.1;
    }
    50% {
      opacity: 1;
    }
  }

  .lg-star,
  .lg-sun-star {
    position: absolute;
    pointer-events: none;
  }

  .lg-star-1,
  .lg-sun-star-1 {
    left: -20px;
    animation: lgTwinkling 3s infinite;
  }

  .lg-star-2,
  .lg-sun-star-2 {
    left: -40px;
    top: 30px;
    animation: lgTwinkling 2s infinite;
  }

  .lg-star-3,
  .lg-sun-star-3 {
    left: 350px;
    top: 90px;
    animation: lgTwinkling 4s infinite;
  }

  .lg-star-4,
  .lg-sun-star-4 {
    left: 200px;
    top: 290px;
    animation: lgTwinkling 3s infinite;
  }

  .lg-star-5,
  .lg-sun-star-5 {
    left: 50px;
    top: 270px;
    animation: lgTwinkling 1.5s infinite;
  }

  .lg-star-6,
  .lg-sun-star-6 {
    left: 250px;
    top: -50px;
    animation: lgTwinkling 4s infinite;
  }

  .lg-star-7,
  .lg-sun-star-7 {
    left: 290px;
    top: 60px;
    animation: lgTwinkling 2s infinite;
  }

  @keyframes lgSpin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes lgBubbleMorphIn {
    from {
      opacity: 0;
      transform: scale(0.78);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes lgFadeSlideUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* ==========================================================================
   * FULL-PAGE SUN ALBUMS STAGE (8x4 PC / 4x6 Phone Grid, 1:1 Luxury Glass Tile,
   * Ascended Album Cover, Expandable Liquid Glass Track Tubes, & Synced Lyrics)
   * ========================================================================== */
  .lg-shared-glass-defs {
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .lg-sun-fullstage {
    position: relative;
    z-index: 15;
    width: 100dvw;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    overflow: hidden;
  }

  /* ── Scrollable Full-Page Viewport Hosting the 99 Albums Grid ──────────── */
  .lg-albums-scroll-viewport {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding:
      max(64px, calc(env(safe-area-inset-top) + 52px))
      max(14px, env(safe-area-inset-right))
      max(36px, calc(env(safe-area-inset-bottom) + 28px))
      max(14px, env(safe-area-inset-left));
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
    transition:
      opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1),
      transform 0.24s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-albums-scroll-viewport::-webkit-scrollbar {
    width: 6px;
  }

  .lg-albums-scroll-viewport::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.26);
    border-radius: 999px;
  }

  .lg-albums-scroll-viewport--exiting {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
    pointer-events: none;
  }

  /* 8 columns on Desktop / 4 columns on Phone, dynamically sized */
  .lg-albums-grid {
    width: var(--lg-grid-w, 100%);
    max-width: 100%;
    display: grid;
    grid-template-columns: repeat(var(--lg-grid-cols, 8), var(--lg-tile-size, 110px));
    justify-content: center;
    column-gap: var(--lg-col-gap, 16px);
    row-gap: var(--lg-row-gap, 14px);
    box-sizing: border-box;
  }

  /* ── Single Album Cell (1:1 Glass Square + Album Title Underneath) ─────── */
  .lg-album-cell {
    appearance: none;
    border: none;
    background: transparent;
    padding: 0;
    margin: 0;
    width: var(--lg-tile-size, 110px);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    text-align: center;
    color: #ffffff;
    contain: layout style;
    opacity: 0;
    transform: translate3d(0, 16px, 0) scale(0.86);
    animation: lgAlbumTileIn 0.42s cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
    animation-delay: var(--tile-delay, 0ms);
  }

  @keyframes lgAlbumTileIn {
    0% {
      opacity: 0;
      transform: translate3d(0, 16px, 0) scale(0.86);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  /* ── 1:1 Luxury Liquid Glass Square Frame ──────────────────────────────── */
  .lg-album-square {
    position: relative;
    width: var(--lg-tile-size, 110px);
    height: var(--lg-tile-size, 110px);
    aspect-ratio: 1 / 1;
    border-radius: 18.5%;
    padding: 5.5%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    isolation: isolate;
    background:
      linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.26) 0%,
        rgba(var(--album-rgb, 255, 168, 76), 0.14) 48%,
        rgba(12, 16, 26, 0.28) 100%
      );
    box-shadow:
      0 10px 24px -6px rgba(0, 0, 0, 0.46),
      0 0 20px -4px rgba(var(--album-rgb, 255, 168, 76), 0.36),
      inset 0 1.5px 2px rgba(255, 255, 255, 0.78),
      inset 0 -2px 5px rgba(var(--album-rgb, 255, 168, 76), 0.34);
    transition:
      transform 0.24s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.24s ease;
  }

  .lg-album-cell:hover .lg-album-square {
    transform: translateY(-4px) scale(1.045);
    box-shadow:
      0 14px 30px -6px rgba(0, 0, 0, 0.55),
      0 0 28px -2px rgba(var(--album-rgb, 255, 168, 76), 0.68),
      inset 0 2px 3px rgba(255, 255, 255, 0.92),
      inset 0 -2.5px 7px rgba(var(--album-rgb, 255, 168, 76), 0.52);
  }

  .lg-album-cell:active .lg-album-square {
    transform: translateY(0) scale(0.96);
  }

  /* Color-matched internal glow aura */
  .lg-album-square__aura {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 0;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(var(--album-rgb, 255, 168, 76), 0.32) 0%,
      rgba(var(--album-rgb, 255, 168, 76), 0.08) 68%,
      transparent 100%
    );
  }

  .lg-album-square__img {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 14.5%;
    display: block;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.36);
  }

  /* Subtle color-reactive surface shimmer over the cover */
  .lg-album-square__color-sheen {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    z-index: 2;
    background:
      linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.34) 0%,
        rgba(var(--album-rgb, 255, 168, 76), 0.16) 28%,
        rgba(255, 255, 255, 0.0) 56%,
        rgba(var(--album-rgb, 255, 168, 76), 0.22) 100%
      );
    mix-blend-mode: screen;
    opacity: 0.78;
    transition: opacity 0.24s ease;
  }

  .lg-album-cell:hover .lg-album-square__color-sheen {
    opacity: 1;
  }

  /* Cloned <use href="#lg-shared-glass-1x1"> overlay */
  .lg-album-square__glass-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 3;
  }

  /* Professional Album Name Underneath Each Square */
  .lg-album-title {
    width: 100%;
    height: calc(var(--lg-title-h, 28px) - 6px);
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: clamp(0.66rem, 0.56rem + 0.28vw, 0.78rem);
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: 0.01em;
    color: rgba(255, 255, 255, 0.95);
    text-shadow:
      0 1px 3px rgba(0, 0, 0, 0.85),
      0 0 10px rgba(0, 0, 0, 0.45);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 2px;
    box-sizing: border-box;
    transition: color 0.2s ease, transform 0.2s ease;
  }

  .lg-album-cell:hover .lg-album-title {
    color: #ffffff;
    text-shadow:
      0 1px 4px rgba(0, 0, 0, 0.9),
      0 0 12px rgba(var(--album-rgb, 255, 168, 76), 0.75);
  }

  /* ==========================================================================
   * VIEW 2: SELECTED ALBUM WORKSPACE (Ascended Cover + Track Tubes + Lyrics)
   * ========================================================================== */
  .lg-album-detail-workspace {
    width: min(94dvw, 1140px);
    height: 100dvh;
    padding:
      max(58px, calc(env(safe-area-inset-top) + 46px))
      0
      max(24px, calc(env(safe-area-inset-bottom) + 18px));
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: stretch;
    justify-content: center;
    gap: 20px;
    overflow: hidden;
  }

  .lg-album-player-column {
    flex: 1 1 560px;
    max-width: 640px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    overflow: hidden;
    transition: max-width 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-album-detail-workspace--with-lyrics .lg-album-player-column {
    max-width: 560px;
  }

  /* ── Ascended Album Cover at Top of Page ───────────────────────────────── */
  .lg-ascended-album-hero {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    animation: lgAscendHeroIn 0.52s cubic-bezier(0.18, 0.9, 0.26, 1) both;
  }

  @keyframes lgAscendHeroIn {
    0% {
      opacity: 0;
      transform: translate3d(0, 48px, 0) scale(0.76);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  .lg-ascended-album-cover {
    --album-rgb: var(--selected-album-rgb, 255, 168, 76);
    position: relative;
    width: clamp(124px, 18dvh, 172px);
    height: clamp(124px, 18dvh, 172px);
    aspect-ratio: 1 / 1;
    border-radius: 18.5%;
    padding: 5.5%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    isolation: isolate;
    background:
      linear-gradient(
        145deg,
        rgba(255, 255, 255, 0.30) 0%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.20) 50%,
        rgba(12, 16, 26, 0.32) 100%
      );
    box-shadow:
      0 18px 42px -8px rgba(0, 0, 0, 0.55),
      0 0 34px -4px rgba(var(--selected-album-rgb, 255, 168, 76), 0.58),
      inset 0 2px 3px rgba(255, 255, 255, 0.88),
      inset 0 -3px 7px rgba(var(--selected-album-rgb, 255, 168, 76), 0.45);
  }

  .lg-ascended-album-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    max-width: 90vw;
  }

  .lg-ascended-album-title {
    margin: 0;
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: clamp(1.08rem, 0.92rem + 0.65vw, 1.42rem);
    font-weight: 800;
    letter-spacing: -0.01em;
    color: #ffffff;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
  }

  .lg-ascended-album-artist {
    margin: 0;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: clamp(0.76rem, 0.7rem + 0.25vw, 0.88rem);
    font-weight: 600;
    color: rgba(255, 255, 255, 0.78);
    text-shadow: 0 1px 6px rgba(0, 0, 0, 0.65);
  }

  /* ── Liquid Glass Track Tubes List Below Ascended Album ────────────────── */
  .lg-track-tubes-list {
    width: 100%;
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 4px 6px 24px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 9px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.26) transparent;
  }

  .lg-track-tubes-list::-webkit-scrollbar {
    width: 5px;
  }

  .lg-track-tubes-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.24);
    border-radius: 999px;
  }

  /* Individual Liquid Glass Tube / Window */
  .lg-track-tube {
    position: relative;
    width: 100%;
    border-radius: 22px;
    padding: 10px 14px;
    box-sizing: border-box;
    cursor: pointer;
    isolation: isolate;
    color: rgba(255, 255, 255, 0.95);
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.20) 0%,
        rgba(255, 255, 255, 0.04) 100%
      ),
      rgba(10, 14, 24, 0.34);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    backdrop-filter: blur(16px) saturate(180%);
    box-shadow:
      0 10px 24px -6px rgba(0, 0, 0, 0.34),
      inset 0 1.2px 0.8px rgba(255, 255, 255, 0.62),
      inset 0 -1px 1px rgba(0, 0, 0, 0.26);
    opacity: 0;
    transform: translate3d(0, 12px, 0);
    animation: lgTubeEnter 0.38s cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
    animation-delay: var(--tube-delay, 0ms);
    transition:
      padding 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.28s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.28s ease,
      box-shadow 0.28s ease,
      transform 0.22s ease;
  }

  .lg-track-tube::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1px;
    pointer-events: none;
    background: linear-gradient(
      135deg,
      rgba(255, 255, 255, 0.72) 0%,
      rgba(var(--selected-album-rgb, 255, 168, 76), 0.38) 45%,
      rgba(255, 255, 255, 0.14) 75%,
      rgba(255, 255, 255, 0.58) 100%
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }

  .lg-track-tube:hover:not(.lg-track-tube--expanded) {
    transform: translateY(-1.5px) scale(1.008);
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.26) 0%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.10) 100%
      ),
      rgba(12, 16, 28, 0.42);
    box-shadow:
      0 12px 28px -6px rgba(0, 0, 0, 0.42),
      0 0 18px -4px rgba(var(--selected-album-rgb, 255, 168, 76), 0.38),
      inset 0 1.4px 1px rgba(255, 255, 255, 0.75);
  }

  /* Expanded Active Track Tube */
  .lg-track-tube--expanded {
    cursor: default;
    border-radius: 26px;
    padding: 13px 16px 14px;
    background:
      linear-gradient(
        165deg,
        rgba(255, 255, 255, 0.26) 0%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.16) 52%,
        rgba(10, 14, 24, 0.48) 100%
      );
    box-shadow:
      0 16px 38px -8px rgba(0, 0, 0, 0.52),
      0 0 28px -4px rgba(var(--selected-album-rgb, 255, 168, 76), 0.46),
      inset 0 1.6px 1.5px rgba(255, 255, 255, 0.85),
      inset 0 -1.5px 3px rgba(var(--selected-album-rgb, 255, 168, 76), 0.28);
  }

  @keyframes lgTubeEnter {
    0% {
      opacity: 0;
      transform: translate3d(0, 12px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  .lg-track-tube__header {
    display: flex;
    align-items: center;
    gap: 11px;
    min-height: 28px;
  }

  .lg-track-tube__num {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.76rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.78);
    min-width: 26px;
    height: 26px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.10);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.38);
    flex-shrink: 0;
  }

  .lg-track-tube__num--inline {
    min-width: auto;
    height: auto;
    background: transparent;
    box-shadow: none;
    margin-right: 6px;
    color: rgba(var(--selected-album-rgb, 255, 200, 120), 1);
  }

  .lg-track-tube__title-wrap {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    cursor: pointer;
  }

  .lg-track-tube__title {
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: clamp(0.84rem, 0.78rem + 0.22vw, 0.95rem);
    font-weight: 700;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
  }

  .lg-tube-play-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border: none;
    border-radius: 50%;
    color: #ffffff;
    background:
      radial-gradient(
        circle at 32% 24%,
        rgba(255, 255, 255, 0.55) 0%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.45) 55%,
        rgba(18, 24, 38, 0.65) 100%
      );
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.35),
      inset 0 1.2px 1px rgba(255, 255, 255, 0.82);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .lg-tube-play-btn:hover {
    transform: scale(1.07);
  }

  .lg-tube-play-btn:active {
    transform: scale(0.93);
  }

  .lg-tube-mini-spinner {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.28);
    border-top-color: #ffffff;
    animation: lgSpin 0.75s linear infinite;
  }

  .lg-track-tube__actions {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
  }

  .lg-tube-time-readout {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.74rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.92);
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
  }

  .lg-tube-icon-btn {
    width: 30px;
    height: 30px;
    min-width: 30px;
    border: none;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.92);
    background: rgba(255, 255, 255, 0.10);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease;
  }

  .lg-tube-icon-btn:hover {
    background: rgba(255, 255, 255, 0.20);
    transform: scale(1.06);
  }

  /* Small Lyrics / Translation Button inside Expanded Tube */
  .lg-tube-lyrics-btn {
    position: relative;
    height: 30px;
    padding: 0 10px;
    border: none;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: 0.73rem;
    font-weight: 700;
    color: rgba(255, 255, 255, 0.94);
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.24) 0%,
        rgba(255, 255, 255, 0.06) 100%
      );
    box-shadow:
      0 4px 12px rgba(0, 0, 0, 0.24),
      inset 0 1px 0 rgba(255, 255, 255, 0.65);
    cursor: pointer;
    white-space: nowrap;
    transition:
      background 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.18s ease;
  }

  .lg-tube-lyrics-btn--ready {
    box-shadow:
      0 4px 14px rgba(var(--selected-album-rgb, 255, 168, 76), 0.35),
      inset 0 1px 1px rgba(255, 255, 255, 0.82);
  }

  .lg-tube-lyrics-btn--active {
    background:
      linear-gradient(
        180deg,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.55) 0%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.24) 100%
      );
    box-shadow:
      0 0 18px rgba(var(--selected-album-rgb, 255, 168, 76), 0.65),
      inset 0 1.2px 1px rgba(255, 255, 255, 0.92);
  }

  .lg-tube-lyrics-btn:hover {
    transform: scale(1.04);
  }

  .lg-tube-lyrics-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffffff;
    opacity: 0.75;
  }

  /* ── Capillary Liquid Seek Bar inside Expanded Track Tube ──────────────── */
  .lg-track-tube__player-body {
    margin-top: 10px;
    padding-top: 6px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    animation: lgFadeSlideUp 0.24s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .lg-tube-seek-hit {
    height: 28px;
  }

  .lg-tube-seek-track {
    height: 12px;
  }

  /* Flowing Liquid inside Track Tube (Tinted with Album Cover Color + Ruby Core) */
  .lg-tube-seek-fill {
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.85) 0%,
        rgba(var(--selected-album-rgb, 255, 140, 65), 0.92) 42%,
        rgba(215, 28, 56, 0.92) 82%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.95) 100%
      );
    box-shadow:
      0 0 14px rgba(var(--selected-album-rgb, 255, 140, 65), 0.72),
      0 0 24px rgba(215, 28, 56, 0.42),
      inset 0 1px 1.5px rgba(255, 255, 255, 0.82),
      inset 0 -1px 2px rgba(45, 0, 12, 0.65);
  }

  .lg-tube-seek-thumb {
    width: 15px;
    height: 15px;
    background:
      radial-gradient(
        circle at 34% 28%,
        #ffffff 0%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.96) 45%,
        rgba(195, 22, 48, 0.96) 100%
      );
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.48),
      0 0 14px rgba(var(--selected-album-rgb, 255, 168, 76), 0.92),
      inset 0 1.5px 1.5px #ffffff;
  }

  /* ==========================================================================
   * SIDE-BY-SIDE LIQUID GLASS SYNCED LYRICS WINDOW (nl music Lyrics Engine)
   * ========================================================================== */
  .lg-lyrics-glass-window {
    position: relative;
    flex: 1 1 380px;
    max-width: 440px;
    height: calc(100% - 8px);
    align-self: center;
    border-radius: 28px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    isolation: isolate;
    background:
      linear-gradient(
        160deg,
        rgba(255, 255, 255, 0.24) 0%,
        rgba(var(--selected-album-rgb, 255, 168, 76), 0.12) 48%,
        rgba(10, 14, 24, 0.46) 100%
      );
    -webkit-backdrop-filter: blur(22px) saturate(190%);
    backdrop-filter: blur(22px) saturate(190%);
    box-shadow:
      0 22px 54px -10px rgba(0, 0, 0, 0.52),
      0 0 32px -6px rgba(var(--selected-album-rgb, 255, 168, 76), 0.42),
      inset 0 1.8px 1.5px rgba(255, 255, 255, 0.82),
      inset 0 -2px 4px rgba(var(--selected-album-rgb, 255, 168, 76), 0.26);
    animation: lgLyricsWindowSlideIn 0.38s cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  .lg-lyrics-glass-window::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.2px;
    pointer-events: none;
    background: conic-gradient(
      from 180deg at 50% 50%,
      rgba(255, 255, 255, 0.88) 0deg,
      rgba(var(--selected-album-rgb, 255, 168, 76), 0.52) 90deg,
      rgba(255, 255, 255, 0.16) 180deg,
      rgba(var(--selected-album-rgb, 255, 168, 76), 0.48) 270deg,
      rgba(255, 255, 255, 0.88) 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
  }

  @keyframes lgLyricsWindowSlideIn {
    0% {
      opacity: 0;
      transform: translate3d(24px, 0, 0) scale(0.94);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  .lg-lyrics-glass-window__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 14px 16px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.15);
    flex-shrink: 0;
  }

  .lg-lyrics-glass-window__title-group {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  .lg-lyrics-sparkle {
    color: rgba(var(--selected-album-rgb, 255, 210, 140), 1);
    flex-shrink: 0;
  }

  .lg-lyrics-glass-window__meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .lg-lyrics-glass-window__song {
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: 0.88rem;
    font-weight: 800;
    color: #ffffff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-lyrics-glass-window__artist {
    font-size: 0.72rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.72);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .lg-lyrics-glass-window__body {
    flex: 1 1 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .lg-lyrics-status {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    text-align: center;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: 0.88rem;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.75);
  }

  .lg-lyrics-synced-stage {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .lg-lyrics-scroll-list,
  .lg-lyrics-plain-scroll {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    padding: 36px 18px 64px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    text-align: center;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.24) transparent;
    -webkit-mask-image: linear-gradient(
      180deg,
      transparent 0%,
      #000 12%,
      #000 88%,
      transparent 100%
    );
    mask-image: linear-gradient(
      180deg,
      transparent 0%,
      #000 12%,
      #000 88%,
      transparent 100%
    );
  }

  .lg-lyric-line {
    appearance: none;
    border: none;
    background: transparent;
    padding: 6px 10px;
    border-radius: 14px;
    width: 100%;
    cursor: pointer;
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: clamp(0.92rem, 0.84rem + 0.28vw, 1.06rem);
    font-weight: 600;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.42);
    transition:
      color 0.26s ease,
      transform 0.26s cubic-bezier(0.22, 1, 0.36, 1),
      text-shadow 0.26s ease,
      background 0.22s ease;
  }

  .lg-lyric-line:hover {
    color: rgba(255, 255, 255, 0.78);
    background: rgba(255, 255, 255, 0.06);
  }

  .lg-lyric-line--passed {
    color: rgba(255, 255, 255, 0.52);
  }

  .lg-lyric-line--active {
    font-size: clamp(1.06rem, 0.96rem + 0.4vw, 1.26rem);
    font-weight: 800;
    color: #ffffff;
    transform: scale(1.05);
    background: rgba(var(--selected-album-rgb, 255, 168, 76), 0.16);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35);
    text-shadow:
      0 2px 12px rgba(0, 0, 0, 0.65),
      0 0 18px rgba(var(--selected-album-rgb, 255, 168, 76), 0.85);
  }

  .lg-lyric-plain-line {
    margin: 0;
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.88);
    text-shadow: 0 1px 4px rgba(0, 0, 0, 0.55);
  }

  /* Responsive stacking for Selected Album + Side Lyrics Window on Mobile */
  @media (max-width: 860px) {
    .lg-album-detail-workspace {
      flex-direction: column;
      gap: 12px;
      padding-top: max(54px, calc(env(safe-area-inset-top) + 42px));
    }

    .lg-album-player-column,
    .lg-album-detail-workspace--with-lyrics .lg-album-player-column {
      max-width: 100%;
      flex: 1 1 55%;
    }

    .lg-ascended-album-cover {
      width: clamp(92px, 13dvh, 128px);
      height: clamp(92px, 13dvh, 128px);
    }

    .lg-lyrics-glass-window {
      max-width: 100%;
      width: 100%;
      flex: 1 1 42%;
      height: auto;
    }
  }

  @media (max-width: 640px) {
    .lg-glass-pill {
      -webkit-backdrop-filter: blur(12px) saturate(150%);
      backdrop-filter: blur(12px) saturate(150%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lg-main-glass,
    .lg-earth-scale-wrap,
    .lg-sun-scale-wrap,
    .lg-orb-title-img,
    .lg-glass-pill,
    .lg-next-random-btn,
    .lg-album-cell,
    .lg-track-tube {
      transition: none;
      animation: none;
      opacity: 1;
      transform: none;
    }
  }
`;

