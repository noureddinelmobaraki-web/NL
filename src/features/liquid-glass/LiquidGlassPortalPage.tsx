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
import { BooksStage } from './BooksStage';
import { AudiobooksStage } from './AudiobooksStage';
import type { AudiobookItem, BookItem } from './booksAudioService';

export type LiquidGlassMode = 'orbs' | 'video' | 'sun' | 'books' | 'audiobooks';

// ============================================================================
// [EDIT HERE: BACKGROUNDS & TITLES] — روابط الخلفيات وصور العناوين (X & ALBUMS & BOOKS & AUDIO BOOKS)
// ============================================================================
export const LIQUID_GLASS_BACKGROUNDS = {
  pc: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/pc.webp',
  phone: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/phone.webp',
  mobileBreakpointQuery: '(max-width: 768px)',
} as const;

export const LIQUID_GLASS_TITLE_IMAGES = {
  earthX: getLocalAssetUrl('X.webp'),
  sunAlbums: getLocalAssetUrl('ALBUMS.webp'),
  booksImage: 'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/books-removebg-preview.webp',
  audiobooksImage: 'https://cdn.jsdelivr.net/gh/noureddinelmobaraki-web/nl-audio-cdn@main/audio.books-removebg-preview.webp',
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
  initialMode?: LiquidGlassMode;
  onVideoAudioActiveChange?: (isVideoAudible: boolean) => void;
  onVideoElementMount?: (mediaEl: HTMLMediaElement | null) => void;
  externalMuted?: boolean;
  onToggleMute?: () => void;
}

// ============================================================================
// WebGL GLSL Shaders — محرك الزجاج السائل الرباعي (فقاعة الأرض + الشمس + الكتب + الكتب الصوتية)
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

    // Bubble C (Books Wireframe Sphere)
    uniform vec2 u_centerC;
    uniform vec2 u_sizeC;
    uniform float u_cornerC;
    uniform float u_wobbleC;
    uniform float u_alphaC;

    // Bubble D (Audio Books Wireframe Sphere)
    uniform vec2 u_centerD;
    uniform vec2 u_sizeD;
    uniform float u_cornerD;
    uniform float u_wobbleD;
    uniform float u_alphaD;

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
      float sdfC = (u_alphaC > 0.01)
        ? sdLiquidShape(fragCoord - u_centerC, u_sizeC, u_cornerC, u_wobbleC, u_time, 4.188)
        : 1e5;
      float sdfD = (u_alphaD > 0.01)
        ? sdLiquidShape(fragCoord - u_centerD, u_sizeD, u_cornerD, u_wobbleD, u_time, 1.047)
        : 1e5;

      vec2 coverUV = getCoverUV(v_texCoord, u_imageAspect, u_canvasAspect);
      vec3 baseTex = texture2D(u_texture, coverUV).rgb;

      // Analytical soft drop shadows for all 4 bubbles
      float shDistA = (u_alphaA > 0.01)
        ? sdLiquidShape((fragCoord - u_centerA) - u_shadowOffset, u_sizeA, u_cornerA, u_wobbleA, u_time, 0.0)
        : 1e5;
      float shDistB = (u_alphaB > 0.01)
        ? sdLiquidShape((fragCoord - u_centerB) - u_shadowOffset, u_sizeB, u_cornerB, u_wobbleB, u_time, 2.094)
        : 1e5;
      float shDistC = (u_alphaC > 0.01)
        ? sdLiquidShape((fragCoord - u_centerC) - u_shadowOffset, u_sizeC, u_cornerC, u_wobbleC, u_time, 4.188)
        : 1e5;
      float shDistD = (u_alphaD > 0.01)
        ? sdLiquidShape((fragCoord - u_centerD) - u_shadowOffset, u_sizeD, u_cornerD, u_wobbleD, u_time, 1.047)
        : 1e5;

      float shAlphaA = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistA)) * u_shadowIntensity * u_alphaA;
      float shAlphaB = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistB)) * u_shadowIntensity * u_alphaB;
      float shAlphaC = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistC)) * u_shadowIntensity * u_alphaC;
      float shAlphaD = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistD)) * u_shadowIntensity * u_alphaD;
      float shadowAlpha = max(max(shAlphaA, shAlphaB), max(shAlphaC, shAlphaD));
      vec3 shadowedBackground = baseTex * (1.0 - shadowAlpha);

      // Select closest active bubble (0: Earth, 1: Sun, 2: Books, 3: Audio Books)
      int activeIdx = 0;
      float sdf = sdfA;
      if (sdfB < sdf) { sdf = sdfB; activeIdx = 1; }
      if (sdfC < sdf) { sdf = sdfC; activeIdx = 2; }
      if (sdfD < sdf) { sdf = sdfD; activeIdx = 3; }

      float bubbleAlpha = (activeIdx == 1) ? u_alphaB : (activeIdx == 2) ? u_alphaC : (activeIdx == 3) ? u_alphaD : u_alphaA;

      if (sdf > 1.5 || bubbleAlpha <= 0.01) {
        gl_FragColor = vec4(shadowedBackground, 1.0);
        return;
      }

      vec2 activeCenter = (activeIdx == 1) ? u_centerB : (activeIdx == 2) ? u_centerC : (activeIdx == 3) ? u_centerD : u_centerA;
      vec2 activeSize = (activeIdx == 1) ? u_sizeB : (activeIdx == 2) ? u_sizeC : (activeIdx == 3) ? u_sizeD : u_sizeA;
      float activeCorner = (activeIdx == 1) ? u_cornerB : (activeIdx == 2) ? u_cornerC : (activeIdx == 3) ? u_cornerD : u_cornerA;
      float activeWobble = (activeIdx == 1) ? u_wobbleB : (activeIdx == 2) ? u_wobbleC : (activeIdx == 3) ? u_wobbleD : u_wobbleA;
      float activePhase = (activeIdx == 1) ? 2.094 : (activeIdx == 2) ? 4.188 : (activeIdx == 3) ? 1.047 : 0.0;

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

      vec3 activeTint = (activeIdx == 1)
        ? vec3(1.0, 0.985, 0.96)
        : u_tint;
      glassTex *= activeTint;

      float causticAngle = u_time * 0.55 + activePhase;
      vec2 lightDir1 = normalize(vec2(-0.707, -0.707) + u_lightShift * 0.35 + vec2(cos(causticAngle), sin(causticAngle)) * 0.18 * activeWobble);
      vec2 lightDir2 = normalize(vec2(0.65, 0.75) - u_lightShift * 0.25);
      float spec1 = pow(max(dot(grad, lightDir1), 0.0), 3.2);
      float spec2 = pow(max(dot(grad, lightDir2), 0.0), 4.0) * 0.55;

      float rimHighlight = smoothstep(-5.5, -0.6, sdf) * (1.0 - smoothstep(-0.6, 1.2, sdf));
      vec3 fresnelTint = (activeIdx == 1)
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
// 3D Wireframe Sphere Orb Button (Books & Audio Books) — 36 Meridians + 12 Latitudes + 2 Axes
// ============================================================================
const MERIDIAN_INDICES = Array.from({ length: 36 }, (_, i) => i + 1);
const LATITUDE_CLASSES = [
  'l300',
  'l290',
  'l280',
  'l270',
  'l260',
  'l235',
  'l30',
  'l90',
  'l80',
  'l70',
  'l60',
  'l35',
] as const;

const WireframeSphereOrbButton = React.memo(function WireframeSphereOrbButton({
  variant,
  onActivate,
  ariaLabel,
}: {
  variant: 'books' | 'audiobooks';
  onActivate: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      className={`lg-wireframe-trigger lg-wireframe-trigger--${variant}`}
      onClick={onActivate}
      aria-label={ariaLabel}
    >
      <div className="lg-wireframe-scale-wrap">
        <div className={`lg-sphere-wrapper lg-sphere-wrapper--${variant}`}>
          <div className="lg-wf-plane lg-wf-equator" />
          <div className="lg-wf-plane lg-wf-prime-meridian" />
          {MERIDIAN_INDICES.map((m) => (
            <div key={m} className={`lg-wf-meridian lg-wf-m${m}`} />
          ))}
          {LATITUDE_CLASSES.map((lat) => (
            <div key={lat} className={`lg-wf-latitude lg-wf-${lat}`} />
          ))}
          <div className="lg-wf-axis" />
          <div className="lg-wf-axis lg-wf-a90" />
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
  initialMode = 'orbs',
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
  // Switch between 4-in-a-row (wide desktop) and 2x2 balanced grid (medium desktop / tablet / phone)
  const isStackedLayout =
    viewport.width < 1140 || viewport.height > viewport.width * 0.95;

  // Compute dynamic fluid scale so all 4 orbs + their floating titles fit inside 100dvh
  const orbScale = React.useMemo(() => {
    const w = Math.max(viewport.width, 320);
    const h = Math.max(viewport.height, 480);
    if (isStackedLayout) {
      // 2x2 grid: 2 columns wide, 2 rows tall (including floating titles)
      const maxByWidth = (w - 48) / 680;
      const maxByHeight = (h - 140) / 820;
      return Math.min(Math.max(Math.min(maxByWidth, maxByHeight), 0.38), 0.82);
    }
    // 4-in-a-row on wide desktop: Books (286*s) + Earth (286*s) + Sun (329*s) + AudioBooks (286*s) + gaps
    const maxByWidth = (w - 140) / 1380;
    const maxByHeight = (h - 170) / 470;
    return Math.min(Math.max(Math.min(maxByWidth, maxByHeight), 0.52), 0.96);
  }, [viewport.width, viewport.height, isStackedLayout]);

  // WebGL texture readiness
  const [webglReady, setWebglReady] = useState(false);

  // Mode: 'orbs' initially -> 'video' (Earth) | 'sun' (Sun) | 'books' (Books) | 'audiobooks' (Audio Books)
  const [mode, setMode] = useState<LiquidGlassMode>(initialMode);
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
  const booksGlassBoxRef = useRef<HTMLDivElement | null>(null);
  const audiobooksGlassBoxRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shuffleBagRef = useRef<number[]>([]);
  const lastPickedRef = useRef<number>(-1);
  const seekTrackRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  // Mutable render state read inside rAF without re-creating the WebGL loop
  const renderStateRef = useRef({
    mode: 'orbs' as 'orbs' | 'video' | 'sun' | 'books' | 'audiobooks',
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
    // Bubble C (Books)
    currCenterCX: 0,
    currCenterCY: 0,
    currHalfCW: 142,
    currHalfCH: 142,
    currCornerC: 142,
    currWobbleC: 1,
    currAlphaC: 1,
    // Bubble D (Audio Books)
    currCenterDX: 0,
    currCenterDY: 0,
    currHalfDW: 142,
    currHalfDH: 142,
    currCornerD: 142,
    currWobbleD: 1,
    currAlphaD: 1,
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

  // Cross-linking state between BooksStage and AudiobooksStage
  const [crossBookQuery, setCrossBookQuery] = useState<string>('');
  const [crossSelectedBook, setCrossSelectedBook] = useState<BookItem | null>(null);
  const [crossAudiobookQuery, setCrossAudiobookQuery] = useState<string>('');
  const [crossSelectedAudiobook, setCrossSelectedAudiobook] = useState<AudiobookItem | null>(null);

  // Trigger initial random video if opened directly into 'video' mode from Launcher
  const initialVideoTriggeredRef = useRef(false);
  useEffect(() => {
    if (initialMode === 'video' && !initialVideoTriggeredRef.current) {
      initialVideoTriggeredRef.current = true;
      triggerRandomVideo();
    } else if (initialMode && initialMode !== 'orbs') {
      setMode(initialMode);
    }
  }, [initialMode, triggerRandomVideo]);

  // ── Handlers for Sun (Albums), Books, and Audio Books ──
  const onOpenSunWindow = useCallback(() => {
    setMode('sun');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange]);

  const onOpenBooksWindow = useCallback(() => {
    setCrossBookQuery('');
    setCrossSelectedBook(null);
    setMode('books');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange]);

  const onOpenAudiobooksWindow = useCallback(() => {
    setCrossAudiobookQuery('');
    setCrossSelectedAudiobook(null);
    setMode('audiobooks');
    onVideoAudioActiveChange?.(false);
  }, [onVideoAudioActiveChange]);

  const handleSwitchBookToAudiobook = useCallback(
    (query: string, matchedAudiobook?: AudiobookItem) => {
      setCrossAudiobookQuery(query);
      setCrossSelectedAudiobook(matchedAudiobook || null);
      setMode('audiobooks');
      onVideoAudioActiveChange?.(false);
    },
    [onVideoAudioActiveChange],
  );

  const handleSwitchAudiobookToBook = useCallback(
    (query: string, matchedBook?: BookItem) => {
      setCrossBookQuery(query);
      setCrossSelectedBook(matchedBook || null);
      setMode('books');
      onVideoAudioActiveChange?.(false);
    },
    [onVideoAudioActiveChange],
  );

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

  // ── WebGL Quad-Lens Liquid Glass Engine ──────────────────────────────────
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
      u_centerC: gl.getUniformLocation(program, 'u_centerC'),
      u_sizeC: gl.getUniformLocation(program, 'u_sizeC'),
      u_cornerC: gl.getUniformLocation(program, 'u_cornerC'),
      u_wobbleC: gl.getUniformLocation(program, 'u_wobbleC'),
      u_alphaC: gl.getUniformLocation(program, 'u_alphaC'),
      u_centerD: gl.getUniformLocation(program, 'u_centerD'),
      u_sizeD: gl.getUniformLocation(program, 'u_sizeD'),
      u_cornerD: gl.getUniformLocation(program, 'u_cornerD'),
      u_wobbleD: gl.getUniformLocation(program, 'u_wobbleD'),
      u_alphaD: gl.getUniformLocation(program, 'u_alphaD'),
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
      const boxC = booksGlassBoxRef.current;
      const boxD = audiobooksGlassBoxRef.current;

      const isOrbsOrVideo = st.mode === 'orbs' || st.mode === 'video';

      // Measure Earth Bubble (A)
      let targetAX = st.currCenterAX;
      let targetAY = st.currCenterAY;
      let targetAHW = st.currHalfAW;
      let targetAHH = st.currHalfAH;
      let targetCornerA = st.currCornerA;
      const targetWobbleA = st.mode === 'orbs' ? 1.0 : 0.0;
      const targetAlphaA = isOrbsOrVideo ? 1.0 : 0.0;

      if (boxA && isOrbsOrVideo) {
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

      // Measure Sun Bubble (B)
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

      // Measure Books Bubble (C)
      let targetCX = st.currCenterCX;
      let targetCY = st.currCenterCY;
      let targetCHW = st.currHalfCW;
      let targetCHH = st.currHalfCH;
      let targetCornerC = st.currCornerC;
      const targetWobbleC = st.mode === 'orbs' ? 1.0 : 0.0;
      const targetAlphaC = st.mode === 'orbs' ? 1.0 : 0.0;

      if (boxC && st.mode === 'orbs') {
        const rC = boxC.getBoundingClientRect();
        if (rC.width > 4 && rC.height > 4) {
          targetCX = (rC.left - canvasRect.left + rC.width * 0.5) * dpr;
          targetCY = (rC.top - canvasRect.top + rC.height * 0.5) * dpr;
          targetCHW = Math.max(rC.width * 0.5 * dpr, 20);
          targetCHH = Math.max(rC.height * 0.5 * dpr, 20);
          targetCornerC = Math.min(targetCHW, targetCHH);
        }
      }

      // Measure Audio Books Bubble (D)
      let targetDX = st.currCenterDX;
      let targetDY = st.currCenterDY;
      let targetDHW = st.currHalfDW;
      let targetDHH = st.currHalfDH;
      let targetCornerD = st.currCornerD;
      const targetWobbleD = st.mode === 'orbs' ? 1.0 : 0.0;
      const targetAlphaD = st.mode === 'orbs' ? 1.0 : 0.0;

      if (boxD && st.mode === 'orbs') {
        const rD = boxD.getBoundingClientRect();
        if (rD.width > 4 && rD.height > 4) {
          targetDX = (rD.left - canvasRect.left + rD.width * 0.5) * dpr;
          targetDY = (rD.top - canvasRect.top + rD.height * 0.5) * dpr;
          targetDHW = Math.max(rD.width * 0.5 * dpr, 20);
          targetDHH = Math.max(rD.height * 0.5 * dpr, 20);
          targetCornerD = Math.min(targetDHW, targetDHH);
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

        st.currCenterCX = targetCX;
        st.currCenterCY = targetCY;
        st.currHalfCW = targetCHW;
        st.currHalfCH = targetCHH;
        st.currCornerC = targetCornerC;
        st.currWobbleC = targetWobbleC;
        st.currAlphaC = targetAlphaC;

        st.currCenterDX = targetDX;
        st.currCenterDY = targetDY;
        st.currHalfDW = targetDHW;
        st.currHalfDH = targetDHH;
        st.currCornerD = targetCornerD;
        st.currWobbleD = targetWobbleD;
        st.currAlphaD = targetAlphaD;
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

        st.currCenterCX += (targetCX - st.currCenterCX) * ease;
        st.currCenterCY += (targetCY - st.currCenterCY) * ease;
        st.currHalfCW += (targetCHW - st.currHalfCW) * ease;
        st.currHalfCH += (targetCHH - st.currHalfCH) * ease;
        st.currCornerC += (targetCornerC - st.currCornerC) * ease;
        st.currWobbleC += (targetWobbleC - st.currWobbleC) * 0.14;
        st.currAlphaC += (targetAlphaC - st.currAlphaC) * 0.16;

        st.currCenterDX += (targetDX - st.currCenterDX) * ease;
        st.currCenterDY += (targetDY - st.currCenterDY) * ease;
        st.currHalfDW += (targetDHW - st.currHalfDW) * ease;
        st.currHalfDH += (targetDHH - st.currHalfDH) * ease;
        st.currCornerD += (targetCornerD - st.currCornerD) * ease;
        st.currWobbleD += (targetWobbleD - st.currWobbleD) * 0.14;
        st.currAlphaD += (targetAlphaD - st.currAlphaD) * 0.16;
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
      const clampedCornerC = Math.min(
        Math.max(st.currCornerC, 4),
        Math.min(st.currHalfCW, st.currHalfCH) - 0.5,
      );
      const clampedCornerD = Math.min(
        Math.max(st.currCornerD, 4),
        Math.min(st.currHalfDW, st.currHalfDH) - 0.5,
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

      gl.uniform2f(locs.u_centerC, st.currCenterCX, st.currCenterCY);
      gl.uniform2f(locs.u_sizeC, st.currHalfCW, st.currHalfCH);
      gl.uniform1f(locs.u_cornerC, clampedCornerC);
      gl.uniform1f(locs.u_wobbleC, st.currWobbleC);
      gl.uniform1f(locs.u_alphaC, st.currAlphaC);

      gl.uniform2f(locs.u_centerD, st.currCenterDX, st.currCenterDY);
      gl.uniform2f(locs.u_sizeD, st.currHalfDW, st.currHalfDH);
      gl.uniform1f(locs.u_cornerD, clampedCornerD);
      gl.uniform1f(locs.u_wobbleD, st.currWobbleD);
      gl.uniform1f(locs.u_alphaD, st.currAlphaD);

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

      {/* 2.1 Gradual 80% Background Dimming over 4 seconds for Books & Audio Books stages */}
      <div
        className={`lg-portal-stage-dimmer${
          mode === 'books' || mode === 'audiobooks' ? ' lg-portal-stage-dimmer--active' : ''
        }`}
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
          onClick={() => {
            if (mode !== 'orbs') {
              handleReturnToOrbs();
            } else {
              onClose();
            }
          }}
          aria-label={mode !== 'orbs' ? 'Return to Orbs' : 'Close Page'}
        >
          <X size={18} strokeWidth={2.3} />
        </button>
      )}

      {/* 4. Main Centered Stage: Dynamic Quad Orbs (Books + Earth + Sun + Audio Books), Video Player, Sun Albums, Books, or Audio Books */}
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
      ) : mode === 'books' ? (
        <BooksStage
          onBackToOrbs={handleReturnToOrbs}
          initialSearchQuery={crossBookQuery}
          initialSelectedBook={crossSelectedBook}
          onSwitchToAudiobook={handleSwitchBookToAudiobook}
        />
      ) : mode === 'audiobooks' ? (
        <AudiobooksStage
          externalMuted={effectiveMuted}
          onToggleMute={handleToggleMuteClick}
          onAudioActiveChange={onVideoAudioActiveChange}
          onAudioElementMount={onVideoElementMount}
          onBackToOrbs={handleReturnToOrbs}
          initialSearchQuery={crossAudiobookQuery}
          initialSelectedAudiobook={crossSelectedAudiobook}
          onSwitchToBook={handleSwitchAudiobookToBook}
        />
      ) : (
        <main
          className={`lg-stage ${
            mode === 'orbs'
              ? isStackedLayout
                ? 'lg-stage--orbs-grid'
                : 'lg-stage--orbs-row'
              : 'lg-stage--expanded'
          }`}
          onClick={(e) => {
            if (mode === 'video') {
              const target = e.target as HTMLElement;
              if (
                target.closest('.lg-main-glass--video') ||
                target.closest('.lg-progress-bar') ||
                target.closest('.lg-bottom-dock') ||
                target.closest('button')
              ) {
                return;
              }
              handleReturnToOrbs();
            }
          }}
        >
          {/* ── 1. BOOKS CELESTIAL COLUMN (3D Wireframe Sphere inside Liquid Glass Bubble + 'Books' Title) ── */}
          <div
            className={`lg-celestial-unit lg-celestial-unit--books${
              mode === 'video' ? ' lg-celestial-unit--hidden' : ''
            }`}
          >
            <div
              ref={booksGlassBoxRef}
              className={`lg-main-glass lg-main-glass--books${
                !webglReady ? ' lg-main-glass--css-fallback' : ''
              }`}
            >
              <div className="lg-main-glass__caustic lg-main-glass__caustic--books" aria-hidden="true" />
              <div className="lg-main-glass__rim lg-main-glass__rim--books" aria-hidden="true" />
              <div className="lg-main-glass__sheen" aria-hidden="true" />

              <WireframeSphereOrbButton
                variant="books"
                onActivate={onOpenBooksWindow}
                ariaLabel="اضغط لفتح مكتبة الكتب العالمية Books"
              />
            </div>

            {mode === 'orbs' &&
              (LIQUID_GLASS_TITLE_IMAGES.booksImage ? (
                <img
                  src={LIQUID_GLASS_TITLE_IMAGES.booksImage}
                  alt="Books"
                  width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
                  height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
                  onClick={onOpenBooksWindow}
                  className="lg-orb-title-img lg-orb-title-img--books"
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenBooksWindow}
                  className="lg-orb-title-text lg-orb-title-text--books"
                  aria-label="Books"
                >
                  Books
                </button>
              ))}
          </div>

          {/* ── 2. EARTH CELESTIAL COLUMN (Earth Liquid Glass Bubble + /X.webp Title) ── */}
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

          {/* ── 3. SUN CELESTIAL COLUMN (Sun 1.15x Liquid Glass Bubble + /ALBUMS.webp Title) ── */}
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

          {/* ── 4. AUDIO BOOKS CELESTIAL COLUMN (3D Wireframe Sphere inside Liquid Glass Bubble + 'audio books' Title) ── */}
          <div
            className={`lg-celestial-unit lg-celestial-unit--audiobooks${
              mode === 'video' ? ' lg-celestial-unit--hidden' : ''
            }`}
          >
            <div
              ref={audiobooksGlassBoxRef}
              className={`lg-main-glass lg-main-glass--audiobooks${
                !webglReady ? ' lg-main-glass--css-fallback' : ''
              }`}
            >
              <div
                className="lg-main-glass__caustic lg-main-glass__caustic--audiobooks"
                aria-hidden="true"
              />
              <div className="lg-main-glass__rim lg-main-glass__rim--audiobooks" aria-hidden="true" />
              <div className="lg-main-glass__sheen" aria-hidden="true" />

              <WireframeSphereOrbButton
                variant="audiobooks"
                onActivate={onOpenAudiobooksWindow}
                ariaLabel="اضغط لفتح مكتبة الكتب الصوتية audio books"
              />
            </div>

            {mode === 'orbs' &&
              (LIQUID_GLASS_TITLE_IMAGES.audiobooksImage ? (
                <img
                  src={LIQUID_GLASS_TITLE_IMAGES.audiobooksImage}
                  alt="audio books"
                  width={LIQUID_GLASS_TITLE_IMAGES.naturalWidth}
                  height={LIQUID_GLASS_TITLE_IMAGES.naturalHeight}
                  onClick={onOpenAudiobooksWindow}
                  className="lg-orb-title-img lg-orb-title-img--audiobooks"
                  decoding="async"
                  draggable={false}
                />
              ) : (
                <button
                  type="button"
                  onClick={onOpenAudiobooksWindow}
                  className="lg-orb-title-text lg-orb-title-text--audiobooks"
                  aria-label="audio books"
                >
                  audio books
                </button>
              ))}
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
// Scoped Styles — Quad Living Circular Liquid Bubbles (Books, Earth 1.0x, Sun 1.15x, Audio Books),
// Floating Transparent Titles (/X.webp, /ALBUMS.webp, Books, audio books), Dynamic Layout Switching
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

  /* 4-Second Gradual 80% Background Dimming for Books & Audio Books */
  .lg-portal-stage-dimmer {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 2;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(4, 7, 14, 0.88) 0%,
      rgba(2, 4, 8, 0.95) 100%
    );
    opacity: 0;
    transition: opacity 4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .lg-portal-stage-dimmer--active {
    opacity: 0.8;
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

  /* ── Center Stage & Dynamic Responsive Layout (4-in-a-Row on Wide PC, 2x2 Grid on Tablet/Phone) ─ */
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
    gap: clamp(18px, 3vw, 56px);
  }

  .lg-stage--orbs-grid {
    display: grid;
    grid-template-columns: repeat(2, auto);
    align-content: center;
    justify-content: center;
    align-items: center;
    justify-items: center;
    gap: clamp(12px, 2.2dvh, 28px) clamp(16px, 4vw, 48px);
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

  /* Books image title under Books wireframe orb */
  .lg-orb-title-img--books {
    width: calc(var(--lg-earth-bubble, 286px) * 0.62);
    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.42));
    animation: lgTitleFloatEarth 4.6s ease-in-out infinite;
  }

  .lg-orb-title-img--books:hover {
    filter: drop-shadow(0 10px 22px rgba(56, 189, 248, 0.55));
  }

  /* audio books image title under Audio Books wireframe orb */
  .lg-orb-title-img--audiobooks {
    width: calc(var(--lg-earth-bubble, 286px) * 0.62);
    filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.42));
    animation: lgTitleFloatSun 5.0s ease-in-out infinite;
  }

  .lg-orb-title-img--audiobooks:hover {
    filter: drop-shadow(0 10px 22px rgba(192, 132, 252, 0.58));
  }

  /* ── Floating Crystal Titles ('Books' & 'audio books') ─────────────────── */
  .lg-orb-title-text {
    pointer-events: auto;
    cursor: pointer;
    background: transparent;
    border: none;
    padding: 4px 10px;
    margin: 0;
    font-family: 'Outfit', 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-weight: 900;
    font-size: calc(var(--lg-earth-bubble, 286px) * 0.145);
    line-height: 1.1;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    white-space: nowrap;
    will-change: transform;
    transition: transform 0.3s ease, filter 0.3s ease;
  }

  .lg-orb-title-text--books {
    background: linear-gradient(180deg, #ffffff 0%, #bae6fd 52%, #34d399 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter:
      drop-shadow(0 6px 16px rgba(0, 0, 0, 0.65))
      drop-shadow(0 0 18px rgba(56, 189, 248, 0.45));
    animation: lgTitleFloatEarth 4.6s ease-in-out infinite;
  }

  .lg-orb-title-text--books:hover {
    filter:
      drop-shadow(0 8px 20px rgba(0, 0, 0, 0.75))
      drop-shadow(0 0 26px rgba(52, 211, 153, 0.78));
  }

  .lg-orb-title-text--audiobooks {
    background: linear-gradient(180deg, #ffffff 0%, #f5d0fe 50%, #c084fc 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter:
      drop-shadow(0 6px 16px rgba(0, 0, 0, 0.65))
      drop-shadow(0 0 18px rgba(192, 132, 252, 0.48));
    animation: lgTitleFloatSun 5.0s ease-in-out infinite;
  }

  .lg-orb-title-text--audiobooks:hover {
    filter:
      drop-shadow(0 8px 20px rgba(0, 0, 0, 0.75))
      drop-shadow(0 0 26px rgba(244, 114, 182, 0.78));
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

  /* ── Liquid Glass Bubble Containers (Earth 1.0x, Sun 1.15x, Books 1.0x, Audio Books 1.0x) ── */
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

  /* Books Bubble (1.0x scale — Exact same crystal-clear bubble as Earth & Sun, 100% transparent interior so background shows through the mesh!) */
  .lg-main-glass--books {
    width: var(--lg-earth-bubble, 286px);
    height: var(--lg-earth-bubble, 286px);
    border-radius: 53% 47% 52% 48% / 48% 53% 47% 52%;
    background:
      radial-gradient(
        circle at 50% 50%,
        rgba(255, 255, 255, 0.0) 0%,
        rgba(255, 255, 255, 0.0) 76%,
        rgba(185, 232, 255, 0.12) 90%,
        rgba(255, 255, 255, 0.28) 97%,
        rgba(255, 255, 255, 0.48) 100%
      );
    box-shadow:
      0 20px 48px -10px rgba(0, 0, 0, 0.32),
      0 0 28px -4px rgba(165, 230, 255, 0.22),
      inset 0 2px 3px rgba(255, 255, 255, 0.85),
      inset 0 -3px 6px rgba(135, 210, 255, 0.26);
    animation: lgBubbleWobble 4.4s ease-in-out infinite;
  }

  /* Audio Books Bubble (1.0x scale — Exact same crystal-clear bubble as Earth & Sun, 100% transparent interior so background shows through the mesh!) */
  .lg-main-glass--audiobooks {
    width: var(--lg-earth-bubble, 286px);
    height: var(--lg-earth-bubble, 286px);
    border-radius: 48% 52% 47% 53% / 52% 48% 53% 47%;
    background:
      radial-gradient(
        circle at 50% 50%,
        rgba(255, 255, 255, 0.0) 0%,
        rgba(255, 255, 255, 0.0) 76%,
        rgba(185, 232, 255, 0.12) 90%,
        rgba(255, 255, 255, 0.28) 97%,
        rgba(255, 255, 255, 0.48) 100%
      );
    box-shadow:
      0 20px 48px -10px rgba(0, 0, 0, 0.32),
      0 0 28px -4px rgba(165, 230, 255, 0.22),
      inset 0 2px 3px rgba(255, 255, 255, 0.85),
      inset 0 -3px 6px rgba(135, 210, 255, 0.26);
    animation: lgBubbleWobbleSun 4.8s ease-in-out infinite;
  }

  /* Keep the interior of Books & Audio Books bubbles 100% free of white sheen wash */
  .lg-main-glass--books .lg-main-glass__sheen,
  .lg-main-glass--audiobooks .lg-main-glass__sheen {
    opacity: 0.22;
    background: radial-gradient(
      95% 55% at 50% 4%,
      rgba(255, 255, 255, 0.42) 0%,
      rgba(255, 255, 255, 0.0) 46%
    );
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
  .lg-main-glass--css-fallback.lg-main-glass--sun,
  .lg-main-glass--css-fallback.lg-main-glass--books,
  .lg-main-glass--css-fallback.lg-main-glass--audiobooks {
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

  .lg-main-glass__caustic--books {
    background: conic-gradient(
      from 110deg at 50% 50%,
      rgba(255, 255, 255, 0.94) 0deg,
      rgba(56, 189, 248, 0.55) 65deg,
      rgba(255, 255, 255, 0.10) 130deg,
      rgba(52, 211, 153, 0.55) 200deg,
      rgba(255, 255, 255, 0.12) 265deg,
      rgba(250, 204, 21, 0.45) 320deg,
      rgba(255, 255, 255, 0.94) 360deg
    );
  }

  .lg-main-glass__caustic--audiobooks {
    background: conic-gradient(
      from 240deg at 50% 50%,
      rgba(255, 255, 255, 0.94) 0deg,
      rgba(192, 132, 252, 0.58) 65deg,
      rgba(255, 255, 255, 0.10) 130deg,
      rgba(244, 114, 182, 0.55) 200deg,
      rgba(255, 255, 255, 0.12) 265deg,
      rgba(251, 191, 36, 0.45) 320deg,
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

  .lg-main-glass__rim--books {
    box-shadow:
      inset 0 2px 2px rgba(255, 255, 255, 0.85),
      inset 0 -2px 3px rgba(52, 211, 153, 0.32),
      inset 2px 0 3px rgba(255, 255, 255, 0.30),
      inset -2px 0 3px rgba(56, 189, 248, 0.28);
  }

  .lg-main-glass__rim--audiobooks {
    box-shadow:
      inset 0 2px 2px rgba(255, 255, 255, 0.85),
      inset 0 -2px 3px rgba(192, 132, 252, 0.34),
      inset 2px 0 3px rgba(255, 255, 255, 0.30),
      inset -2px 0 3px rgba(244, 114, 182, 0.28);
  }

  /* ── 3D Wireframe Sphere Orbs (Books & Audio Books — 36 Meridians + 12 Latitudes + 2 Axes) ── */
  .lg-wireframe-trigger {
    position: relative;
    z-index: 3;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    perspective: 900px;
    transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), filter 0.38s ease;
  }

  .lg-wireframe-trigger--books:hover {
    transform: scale(1.05);
    filter: drop-shadow(0 0 22px rgba(56, 189, 248, 0.55));
  }

  .lg-wireframe-trigger--audiobooks:hover {
    transform: scale(1.05);
    filter: drop-shadow(0 0 22px rgba(192, 132, 252, 0.58));
  }

  .lg-wireframe-trigger:active {
    transform: scale(0.95);
  }

  /* Scale the native 300x300 3D sphere proportionally with --lg-orb-scale */
  .lg-wireframe-scale-wrap {
    width: 300px;
    height: 300px;
    display: flex;
    align-items: center;
    justify-content: center;
    transform-style: preserve-3d;
    transform: scale(calc(0.685 * var(--lg-orb-scale, 1)));
    transform-origin: center center;
    pointer-events: none;
  }

  @keyframes lgWireframeRotateBooks {
    0% {
      transform: rotate3d(1, 1, 0.35, 0deg);
    }
    100% {
      transform: rotate3d(1, 1, 0.35, 360deg);
    }
  }

  @keyframes lgWireframeRotateAudiobooks {
    0% {
      transform: rotate3d(-0.85, 1, 0.45, 0deg);
    }
    100% {
      transform: rotate3d(-0.85, 1, 0.45, 360deg);
    }
  }

  .lg-sphere-wrapper {
    transform-style: preserve-3d;
    width: 300px;
    height: 300px;
    position: relative;
  }

  .lg-sphere-wrapper--books {
    animation: lgWireframeRotateBooks 14s linear infinite;
  }

  .lg-sphere-wrapper--audiobooks {
    animation: lgWireframeRotateAudiobooks 12.5s linear infinite;
  }

  .lg-wf-plane {
    position: absolute;
    transform-style: preserve-3d;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
  }

  .lg-wf-meridian,
  .lg-wf-equator {
    position: absolute;
    transform-style: preserve-3d;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    border-radius: 50%;
  }

  /* Books & Audio Books Wireframe: See-Through Crystal Filaments (Background shows clearly through the mesh!) */
  .lg-sphere-wrapper--books .lg-wf-meridian,
  .lg-sphere-wrapper--books .lg-wf-equator {
    background: transparent !important;
    border: 1px solid rgba(15, 28, 46, 0.36);
    box-shadow: inset 0 0 1px rgba(255, 255, 255, 0.55);
  }

  .lg-sphere-wrapper--books .lg-wf-meridian:not(:nth-child(3n)) {
    border-color: rgba(15, 28, 46, 0.12);
    box-shadow: none;
  }

  .lg-sphere-wrapper--books .lg-wf-latitude {
    background: transparent !important;
    border: 1px solid rgba(12, 42, 52, 0.40);
    box-shadow: inset 0 0 1px rgba(255, 255, 255, 0.58);
  }

  .lg-sphere-wrapper--books .lg-wf-axis {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(15, 28, 46, 0.38) 50%,
      transparent 100%
    );
    box-shadow: none;
  }

  /* Audio Books Variant: See-Through Crystal Filaments */
  .lg-sphere-wrapper--audiobooks .lg-wf-meridian,
  .lg-sphere-wrapper--audiobooks .lg-wf-equator {
    background: transparent !important;
    border: 1px solid rgba(32, 18, 52, 0.36);
    box-shadow: inset 0 0 1px rgba(255, 255, 255, 0.55);
  }

  .lg-sphere-wrapper--audiobooks .lg-wf-meridian:not(:nth-child(3n)) {
    border-color: rgba(32, 18, 52, 0.12);
    box-shadow: none;
  }

  .lg-sphere-wrapper--audiobooks .lg-wf-latitude {
    background: transparent !important;
    border: 1px solid rgba(46, 18, 58, 0.40);
    box-shadow: inset 0 0 1px rgba(255, 255, 255, 0.58);
  }

  .lg-sphere-wrapper--audiobooks .lg-wf-axis {
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(32, 18, 52, 0.38) 50%,
      transparent 100%
    );
    box-shadow: none;
  }

  .lg-wf-m1  { transform: rotateY(5deg); }
  .lg-wf-m2  { transform: rotateY(10deg); }
  .lg-wf-m3  { transform: rotateY(15deg); }
  .lg-wf-m4  { transform: rotateY(20deg); }
  .lg-wf-m5  { transform: rotateY(25deg); }
  .lg-wf-m6  { transform: rotateY(30deg); }
  .lg-wf-m7  { transform: rotateY(35deg); }
  .lg-wf-m8  { transform: rotateY(40deg); }
  .lg-wf-m9  { transform: rotateY(45deg); }
  .lg-wf-m10 { transform: rotateY(50deg); }
  .lg-wf-m11 { transform: rotateY(55deg); }
  .lg-wf-m12 { transform: rotateY(60deg); }
  .lg-wf-m13 { transform: rotateY(65deg); }
  .lg-wf-m14 { transform: rotateY(70deg); }
  .lg-wf-m15 { transform: rotateY(75deg); }
  .lg-wf-m16 { transform: rotateY(80deg); }
  .lg-wf-m17 { transform: rotateY(85deg); }
  .lg-wf-m18 { transform: rotateY(90deg); }
  .lg-wf-m19 { transform: rotateY(95deg); }
  .lg-wf-m20 { transform: rotateY(100deg); }
  .lg-wf-m21 { transform: rotateY(105deg); }
  .lg-wf-m22 { transform: rotateY(110deg); }
  .lg-wf-m23 { transform: rotateY(115deg); }
  .lg-wf-m24 { transform: rotateY(120deg); }
  .lg-wf-m25 { transform: rotateY(125deg); }
  .lg-wf-m26 { transform: rotateY(130deg); }
  .lg-wf-m27 { transform: rotateY(135deg); }
  .lg-wf-m28 { transform: rotateY(140deg); }
  .lg-wf-m29 { transform: rotateY(145deg); }
  .lg-wf-m30 { transform: rotateY(150deg); }
  .lg-wf-m31 { transform: rotateY(155deg); }
  .lg-wf-m32 { transform: rotateY(160deg); }
  .lg-wf-m33 { transform: rotateY(165deg); }
  .lg-wf-m34 { transform: rotateY(170deg); }
  .lg-wf-m35 { transform: rotateY(175deg); }
  .lg-wf-m36 { transform: rotateY(180deg); }

  .lg-wf-latitude {
    position: absolute;
    transform-style: preserve-3d;
    width: 300px;
    height: 300px;
    border-radius: 50%;
    box-sizing: border-box;
  }

  .lg-wf-l300 {
    width: 295px;
    height: 295px;
    top: 2.5px;
    left: 2.5px;
    transform: rotateX(90deg) translateZ(25px);
  }
  .lg-wf-l290 {
    width: 280px;
    height: 280px;
    top: 10px;
    left: 10px;
    transform: rotateX(90deg) translateZ(50px);
  }
  .lg-wf-l280 {
    width: 260px;
    height: 260px;
    top: 20px;
    left: 20px;
    transform: rotateX(90deg) translateZ(75px);
  }
  .lg-wf-l270 {
    width: 220px;
    height: 220px;
    top: 40px;
    left: 40px;
    transform: rotateX(90deg) translateZ(100px);
  }
  .lg-wf-l260 {
    width: 160px;
    height: 160px;
    top: 70px;
    left: 70px;
    transform: rotateX(90deg) translateZ(125px);
  }
  .lg-wf-l235 {
    width: 60px;
    height: 60px;
    top: 120px;
    left: 120px;
    transform: rotateX(90deg) translateZ(148px);
  }
  .lg-wf-l30 {
    width: 295px;
    height: 295px;
    top: 2.5px;
    left: 2.5px;
    transform: rotateX(90deg) translateZ(-25px);
  }
  .lg-wf-l90 {
    width: 280px;
    height: 280px;
    top: 10px;
    left: 10px;
    transform: rotateX(90deg) translateZ(-50px);
  }
  .lg-wf-l80 {
    width: 260px;
    height: 260px;
    top: 20px;
    left: 20px;
    transform: rotateX(90deg) translateZ(-75px);
  }
  .lg-wf-l70 {
    width: 220px;
    height: 220px;
    top: 40px;
    left: 40px;
    transform: rotateX(90deg) translateZ(-100px);
  }
  .lg-wf-l60 {
    width: 160px;
    height: 160px;
    top: 70px;
    left: 70px;
    transform: rotateX(90deg) translateZ(-125px);
  }
  .lg-wf-l35 {
    width: 60px;
    height: 60px;
    top: 120px;
    left: 120px;
    transform: rotateX(90deg) translateZ(-148px);
  }

  .lg-wf-axis {
    position: absolute;
    width: 300px;
    height: 1px;
    top: calc(50% - 0.5px);
    left: 0;
    transform: rotateZ(90deg);
  }

  .lg-wf-axis.lg-wf-a90 {
    transform: rotateZ(90deg) rotateX(90deg);
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
   * FULL-PAGE SUN ALBUMS STAGE — INFINITE 2D SILK-THREAD FISHEYE GRID,
   * TRUE SUN/EARTH CLEAR BUBBLE GLASS, TEXT/BUTTON-ONLY YELLOW GLOW,
   * STRICTLY 2-LINE iOS 26 LYRICS, & SMART YOUTUBE / ALBUM COVER BACKGROUND
   * ========================================================================== */
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
    perspective: 1200px;
  }

  /* ── Subtle Atmospheric Backdrop Over Current Background ───────────────── */
  .lg-sun-backdrop-dim {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    background:
      radial-gradient(
        circle at 50% 48%,
        rgba(6, 10, 18, 0.22) 0%,
        rgba(4, 7, 14, 0.48) 72%,
        rgba(2, 4, 10, 0.72) 100%
      );
    transition: background 0.4s ease;
  }

  .lg-sun-backdrop-dim--detail {
    background:
      radial-gradient(
        circle at 50% 35%,
        rgba(6, 9, 16, 0.18) 0%,
        rgba(4, 7, 14, 0.44) 72%,
        rgba(2, 4, 10, 0.68) 100%
      );
  }

  /* ── Smart Background Stage: Album Cover Fallback + Verified YouTube ───── */
  .lg-yt-bg-stage {
    position: absolute;
    inset: 0;
    z-index: 1;
    overflow: hidden;
    pointer-events: none;
    animation: lgFadeSlideUp 0.55s ease both;
  }

  /* Always-present Album Cover Background (shown whenever YouTube is unavailable/off) */
  .lg-yt-bg-stage__album-fallback {
    position: absolute;
    inset: -8%;
    width: 116%;
    height: 116%;
    background-size: cover;
    background-position: center;
    filter: blur(28px) saturate(155%) brightness(0.68);
    transform: scale(1.06);
    opacity: 0.88;
    transition: opacity 0.65s ease;
  }

  .lg-yt-bg-stage__album-fallback--dimmed {
    opacity: 0.18;
  }

  /* YouTube iframe stays 100% invisible (opacity: 0) until verified PLAYING */
  .lg-yt-bg-stage__frame-wrap {
    position: absolute;
    top: 50%;
    left: 50%;
    width: max(100dvw, 177.78dvh);
    height: max(100dvh, 56.25dvw);
    transform: translate(-50%, -50%) scale(1.14);
    pointer-events: none;
    opacity: 0;
    filter: saturate(1.25) contrast(1.05);
    transition: opacity 0.7s ease;
  }

  .lg-yt-bg-stage__frame-wrap--playing {
    opacity: 0.54;
  }

  .lg-yt-bg-stage__iframe {
    width: 100%;
    height: 100%;
    border: 0;
    pointer-events: none;
  }

  .lg-yt-bg-stage__vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(
        circle at 50% 50%,
        rgba(6, 9, 16, 0.16) 0%,
        rgba(4, 7, 14, 0.45) 75%,
        rgba(2, 4, 10, 0.74) 100%
      );
  }

  /* ── VIEW 1: Connected Spherical-Dome Fisheye Mesh Viewport ────────────── */
  .lg-brick-viewport {
    position: relative;
    z-index: 3;
    width: 100%;
    height: 100%;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    cursor: grab;
  }

  .lg-brick-viewport--dragging {
    cursor: grabbing;
  }

  .lg-fisheye-mesh-canvas {
    width: 100%;
    height: 100%;
    display: block;
    pointer-events: none;
  }

  /* ==========================================================================
   * VIEW 2: SELECTED ALBUM WORKSPACE (True Sun/Earth Clear Bubble Glass)
   * ========================================================================== */
  .lg-album-detail-workspace {
    position: relative;
    z-index: 5;
    width: min(95dvw, 1220px);
    height: 100dvh;
    padding:
      max(52px, calc(env(safe-area-inset-top) + 40px))
      0
      max(20px, calc(env(safe-area-inset-bottom) + 14px));
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 28px;
    overflow: visible;
  }

  .lg-album-player-column {
    flex: 1 1 580px;
    max-width: 650px;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    overflow: visible;
    transition: max-width 0.38s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-album-detail-workspace--with-lyrics .lg-album-player-column {
    max-width: 560px;
  }

  /* ── Selected Album Cover: Full-Bleed Image + Ultra-Thin Sun/Earth Bubble Rim ── */
  .lg-ascended-album-hero {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    text-align: center;
    animation: lgAscendHeroIn 0.42s cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  @keyframes lgAscendHeroIn {
    0% {
      opacity: 0;
      transform: translate3d(0, 28px, 0) scale(0.84);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  /* Zero white padding box! Image fills 100% of the wobbling Sun/Earth bubble */
  .lg-ascended-album-cover--sun-bubble {
    position: relative;
    width: clamp(148px, 21dvh, 206px);
    height: clamp(148px, 21dvh, 206px);
    aspect-ratio: 1 / 1;
    border-radius: 28% 24% 27% 25% / 25% 28% 24% 27%;
    padding: 0;
    box-sizing: border-box;
    overflow: hidden;
    isolation: isolate;
    background: transparent;
    box-shadow:
      0 20px 48px -10px rgba(0, 0, 0, 0.56),
      inset 0 2px 3px rgba(255, 255, 255, 0.88),
      inset 0 -2px 4px rgba(255, 195, 130, 0.36);
    animation: lgWaterDropletFloat 6s ease-in-out infinite;
    will-change: border-radius, transform;
  }

  @keyframes lgWaterDropletFloat {
    0%, 100% {
      transform: translate3d(0, 0, 0) scale3d(1, 1, 1);
    }
    33% {
      transform: translate3d(0, -4px, 0) scale3d(1.022, 0.982, 1);
    }
    66% {
      transform: translate3d(0, 2px, 0) scale3d(0.985, 1.02, 1);
    }
  }

  .lg-ascended-album-cover__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: inherit;
    display: block;
  }

  .lg-ascended-album-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    max-width: 90vw;
  }

  .lg-ascended-album-title {
    margin: 0;
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: clamp(1.16rem, 1.0rem + 0.65vw, 1.52rem);
    font-weight: 800;
    letter-spacing: -0.015em;
    background-image: linear-gradient(
      180deg,
      #ffffff 0%,
      #fff099 45%,
      #ffd447 85%,
      #ffba26 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: #ffe678;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.72));
  }

  .lg-ascended-album-artist {
    margin: 0;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: clamp(0.78rem, 0.72rem + 0.22vw, 0.90rem);
    font-weight: 600;
    color: rgba(255, 244, 200, 0.9);
    text-shadow: none;
  }

  /* ── Shared Sun/Earth Bubble Caustic Rim & Specular Sheen for Capsules ─── */
  .lg-orb-capsule-caustic {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    padding: 1.4px;
    pointer-events: none;
    z-index: 3;
    background: conic-gradient(
      from 20deg at 50% 50%,
      rgba(255, 255, 255, 0.94) 0deg,
      rgba(255, 205, 135, 0.50) 60deg,
      rgba(255, 255, 255, 0.12) 125deg,
      rgba(195, 238, 255, 0.52) 195deg,
      rgba(255, 255, 255, 0.12) 265deg,
      rgba(255, 195, 125, 0.48) 320deg,
      rgba(255, 255, 255, 0.94) 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    opacity: 0.92;
  }

  .lg-orb-capsule-sheen {
    position: absolute;
    inset: 2px 10px auto 10px;
    height: 42%;
    border-radius: inherit;
    pointer-events: none;
    z-index: 2;
    background: radial-gradient(
      90% 85% at 30% 10%,
      rgba(255, 255, 255, 0.36) 0%,
      rgba(255, 255, 255, 0.08) 48%,
      rgba(255, 255, 255, 0) 82%
    );
  }

  /* ── Track Tubes List ──────────────────────────────────────────────────── */
  .lg-track-tubes-list {
    width: 100%;
    flex: 1 1 auto;
    overflow-y: auto;
    overflow-x: visible;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    padding: 6px 10px 28px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
  }

  .lg-track-tubes-list::-webkit-scrollbar {
    width: 5px;
  }

  .lg-track-tubes-list::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.28);
    border-radius: 999px;
  }

  /* ── True Clear Sun/Earth Bubble Glass Tube (NO yellow fog around box!) ── */
  .lg-track-tube {
    position: relative;
    width: 100%;
    border-radius: 999px;
    padding: 11px 16px;
    box-sizing: border-box;
    cursor: pointer;
    isolation: isolate;
    color: #ffffff;
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.16) 0%,
        rgba(255, 255, 255, 0.02) 45%,
        transparent 75%
      );
    -webkit-backdrop-filter: blur(8px) saturate(145%);
    backdrop-filter: blur(8px) saturate(145%);
    box-shadow:
      0 14px 34px -10px rgba(0, 0, 0, 0.38),
      inset 0 1.5px 2px rgba(255, 255, 255, 0.84),
      inset 0 -1.5px 3px rgba(255, 195, 130, 0.26),
      inset 1.5px 0 3px rgba(255, 255, 255, 0.24),
      inset -1.5px 0 3px rgba(195, 230, 255, 0.22);
    opacity: 0;
    transform: translate3d(0, 10px, 0);
    animation: lgTubeEnter 0.34s cubic-bezier(0.2, 0.9, 0.25, 1) forwards;
    animation-delay: var(--tube-delay, 0ms);
    transition:
      padding 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.28s ease,
      box-shadow 0.28s ease,
      transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  }

  .lg-track-tube:hover:not(.lg-track-tube--expanded-player) {
    transform: translateY(-1.5px) scale(1.008);
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.22) 0%,
        rgba(255, 255, 255, 0.04) 50%,
        transparent 80%
      );
    box-shadow:
      0 16px 38px -10px rgba(0, 0, 0, 0.44),
      inset 0 2px 2.5px rgba(255, 255, 255, 0.92),
      inset 0 -1.5px 3px rgba(255, 205, 140, 0.32);
  }

  /* ── Expanded Clear Sun/Earth Bubble Glass Player Card (No yellow box fog) ─ */
  .lg-track-tube--expanded-player {
    border-radius: 32px;
    padding: 18px 20px 18px;
    cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Cpath d='M5.5 3.2L19 12.8L12.2 13.9L15.3 20.3L12.4 21.6L9.4 15.1L5.5 18.8V3.2Z' fill='%23000000' stroke='%23ffffff' stroke-width='1.8' stroke-linejoin='round'/%3E%3C/svg%3E") 5 3, grab;
    touch-action: none;
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.18) 0%,
        rgba(255, 255, 255, 0.03) 48%,
        transparent 78%
      );
    -webkit-backdrop-filter: blur(10px) saturate(155%);
    backdrop-filter: blur(10px) saturate(155%);
    box-shadow:
      0 24px 56px -12px rgba(0, 0, 0, 0.48),
      inset 0 2px 2.5px rgba(255, 255, 255, 0.88),
      inset 0 -2px 3.5px rgba(255, 195, 130, 0.28),
      inset 2px 0 3px rgba(255, 255, 255, 0.28),
      inset -2px 0 3px rgba(195, 225, 255, 0.24);
    transition:
      padding 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.34s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.28s ease,
      box-shadow 0.28s ease;
  }

  .lg-track-tube--dragging-player {
    box-shadow:
      0 32px 70px -10px rgba(0, 0, 0, 0.58),
      inset 0 2.5px 3px #ffffff,
      inset 0 -2px 4px rgba(255, 205, 140, 0.34);
  }

  @keyframes lgTubeEnter {
    0% {
      opacity: 0;
      transform: translate3d(0, 10px, 0);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0);
    }
  }

  .lg-track-tube__header {
    position: relative;
    z-index: 4;
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 28px;
  }

  /* ── Self-Luminous Golden-Yellow Letters (Zero Rectangular Glow Box!) ──── */
  .lg-track-tube__num {
    min-width: 27px;
    height: 27px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.65);
    flex-shrink: 0;
  }

  .lg-track-tube__num--inline {
    min-width: auto;
    height: auto;
    background: transparent;
    box-shadow: none;
    margin-right: 6px;
  }

  .lg-track-tube__num-glyph {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.76rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    background-image: linear-gradient(
      180deg,
      #fffef5 0%,
      #ffec82 38%,
      #ffd038 78%,
      #ffae19 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: #ffe266;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
  }

  .lg-track-tube__title-wrap {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    align-items: center;
    cursor: pointer;
    filter: drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.65));
  }

  /* Letters themselves are painted with a radiant golden-yellow gradient — NO clipped text-shadow box! */
  .lg-track-tube__title {
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: clamp(0.86rem, 0.8rem + 0.22vw, 0.98rem);
    font-weight: 800;
    letter-spacing: -0.005em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background-image: linear-gradient(
      180deg,
      #fffef6 0%,
      #ffec85 36%,
      #ffd13b 76%,
      #ffb01f 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: #ffe266;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
  }

  .lg-track-tube:hover .lg-track-tube__title,
  .lg-track-tube--current .lg-track-tube__title {
    background-image: linear-gradient(
      180deg,
      #ffffff 0%,
      #fff39e 35%,
      #ffda47 75%,
      #ffbe2e 100%
    );
  }

  .lg-tube-play-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border: none;
    border-radius: 50%;
    color: #ffe578;
    background: rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 1.2px 1px rgba(255, 255, 255, 0.85);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .lg-tube-play-btn:hover {
    transform: scale(1.08);
    background: rgba(255, 255, 255, 0.20);
  }

  .lg-tube-mini-spinner {
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.28);
    border-top-color: #ffe57f;
    animation: lgSpin 0.75s linear infinite;
  }

  .lg-track-tube__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .lg-tube-time-readout {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.74rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    background-image: linear-gradient(
      180deg,
      #fffef5 0%,
      #ffec85 45%,
      #ffd13b 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: #ffe266;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
  }

  .lg-tube-icon-btn {
    width: 34px;
    height: 34px;
    min-width: 34px;
    border: none;
    border-radius: 50%;
    color: #ffe885;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.68);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.18s ease, transform 0.18s ease;
  }

  .lg-tube-icon-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: scale(1.08);
  }

  .lg-yt-toggle-btn--active {
    color: #ffe675;
    background: rgba(255, 255, 255, 0.14);
  }

  /* Icon-Only Expressive Lyrics Button */
  .lg-tube-lyrics-btn {
    position: relative;
    width: 34px;
    height: 34px;
    min-width: 34px;
    padding: 0;
    border: none;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #ffe885;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.72);
    cursor: pointer;
    transition:
      background 0.2s ease,
      transform 0.18s ease;
  }

  .lg-tube-lyrics-btn--ready {
    color: #ffea8a;
  }

  .lg-tube-lyrics-btn--active {
    color: #ffef99;
    background: rgba(255, 255, 255, 0.20);
    box-shadow: inset 0 1.4px 1.5px #ffffff;
  }

  .lg-tube-lyrics-btn:hover {
    transform: scale(1.08);
  }

  .lg-tube-lyrics-dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #ffe57f;
    box-shadow: 0 0 8px #ffe57f;
  }

  /* ── Expanded Clear Glass Player Card Inner Layout ─────────────────────── */
  .lg-expanded-player-card {
    position: relative;
    z-index: 4;
    display: flex;
    flex-direction: column;
    gap: 14px;
    animation: lgFadeSlideUp 0.26s cubic-bezier(0.22, 1, 0.36, 1) both;
  }

  .lg-expanded-player__top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .lg-expanded-player__identity {
    display: flex;
    align-items: center;
    gap: 13px;
    min-width: 0;
    flex: 1 1 auto;
  }

  .lg-expanded-player__thumb-wrap {
    position: relative;
    width: 48px;
    height: 48px;
    min-width: 48px;
    border-radius: 50%;
    padding: 0;
    box-sizing: border-box;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.42);
  }

  .lg-expanded-player__thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }

  .lg-expanded-player__thumb-wrap--playing .lg-expanded-player__thumb {
    animation: lgSpin 18s linear infinite;
  }

  .lg-expanded-player__thumb-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    pointer-events: none;
    border: 1.4px solid rgba(255, 255, 255, 0.88);
    box-shadow: inset 0 1px 2px #ffffff;
  }

  .lg-expanded-player__titles {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    filter: drop-shadow(0 1.5px 2px rgba(0, 0, 0, 0.68));
  }

  .lg-expanded-player__song-title {
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-size: clamp(0.98rem, 0.9rem + 0.28vw, 1.14rem);
    font-weight: 800;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    background-image: linear-gradient(
      180deg,
      #ffffff 0%,
      #fff094 36%,
      #ffd23b 78%,
      #ffb01f 100%
    );
    -webkit-background-clip: text;
    background-clip: text;
    color: #ffe46b;
    -webkit-text-fill-color: transparent;
    text-shadow: none;
  }

  .lg-expanded-player__album-sub {
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: 0.76rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: rgba(255, 244, 198, 0.92);
    text-shadow: none;
  }

  .lg-expanded-player__top-actions {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-shrink: 0;
  }

  .lg-expanded-player__progress-section {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .lg-expanded-player__time-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 0.73rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: #ffe880;
    padding: 0 2px;
    text-shadow: none;
  }

  .lg-expanded-player__controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 2px;
  }

  .lg-player-side-btn {
    width: 38px;
    height: 38px;
    border: none;
    border-radius: 50%;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.68);
    filter: drop-shadow(0 0 8px rgba(255, 218, 78, 0.75));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease, filter 0.18s ease;
  }

  .lg-player-side-btn:hover {
    background: rgba(255, 255, 255, 0.18);
    transform: scale(1.08);
    filter: drop-shadow(0 0 12px rgba(255, 224, 92, 0.98));
  }

  .lg-player-center-trio {
    display: flex;
    align-items: center;
    gap: 18px;
  }

  .lg-player-trio-btn {
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 50%;
    color: #ffffff;
    background: rgba(255, 255, 255, 0.10);
    box-shadow: inset 0 1.2px 1.2px rgba(255, 255, 255, 0.82);
    filter: drop-shadow(0 0 9px rgba(255, 218, 78, 0.82));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease, filter 0.18s ease;
  }

  .lg-player-trio-btn:hover {
    background: rgba(255, 255, 255, 0.20);
    transform: scale(1.08);
    filter: drop-shadow(0 0 14px rgba(255, 226, 96, 1));
  }

  .lg-player-trio-btn--primary {
    width: 52px;
    height: 52px;
    color: #ffffff;
    background:
      radial-gradient(
        circle at 32% 24%,
        rgba(255, 255, 255, 0.34) 0%,
        rgba(255, 255, 255, 0.08) 65%,
        transparent 100%
      );
    box-shadow: inset 0 1.8px 2px #ffffff;
    filter: drop-shadow(0 0 12px rgba(255, 220, 82, 0.95));
  }

  .lg-player-trio-btn--primary:hover {
    transform: scale(1.1);
    filter: drop-shadow(0 0 16px rgba(255, 228, 100, 1));
  }

  /* ── Capillary Liquid Seek Bar inside Expanded Player ──────────────────── */
  .lg-tube-seek-hit {
    height: 28px;
  }

  .lg-tube-seek-track {
    height: 11px;
  }

  .lg-tube-seek-fill {
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.95) 0%,
        rgba(255, 224, 96, 0.95) 50%,
        rgba(255, 195, 55, 0.95) 100%
      );
    box-shadow:
      0 0 12px rgba(255, 220, 82, 0.78),
      inset 0 1px 1.5px #ffffff;
  }

  .lg-tube-seek-thumb {
    width: 15px;
    height: 15px;
    background:
      radial-gradient(
        circle at 34% 28%,
        #ffffff 0%,
        rgba(255, 228, 105, 0.98) 60%,
        rgba(255, 195, 55, 0.98) 100%
      );
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.45),
      0 0 14px rgba(255, 224, 92, 0.95),
      inset 0 1.5px 1.5px #ffffff;
  }

  /* ==========================================================================
   * "LIQUID GLASS iOS 26" DIAGONAL 3-CAPSULE LYRICS STAGE (STRICTLY 2 LINES!)
   * ========================================================================== */
  .lg-ios26-lyrics-stage {
    position: relative;
    flex: 0 1 450px;
    max-width: 480px;
    align-self: center;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 8px 6px;
    box-sizing: border-box;
    animation: lgLyricsWindowSlideIn 0.38s cubic-bezier(0.2, 0.9, 0.25, 1) both;
  }

  @keyframes lgLyricsWindowSlideIn {
    0% {
      opacity: 0;
      transform: translate3d(22px, 0, 0) scale(0.94);
    }
    100% {
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  .lg-ios26-quote-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-bottom: -6px;
    z-index: 6;
  }

  .lg-ios26-lyrics-close {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    color: #ffffff;
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.18) 0%,
        rgba(255, 255, 255, 0.03) 60%,
        transparent 100%
      );
    -webkit-backdrop-filter: blur(8px) saturate(145%);
    backdrop-filter: blur(8px) saturate(145%);
    box-shadow:
      0 6px 16px rgba(0, 0, 0, 0.32),
      inset 0 1.2px 1.5px rgba(255, 255, 255, 0.85);
    filter: drop-shadow(0 0 7px rgba(255, 218, 75, 0.65));
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: transform 0.18s ease, background 0.18s ease;
  }

  .lg-ios26-lyrics-close:hover {
    transform: scale(1.08);
    background: rgba(255, 255, 255, 0.22);
  }

  /* 3-Capsule Diagonal Spatial Assembly (Compact & Hugging Only 2 Lines) */
  .lg-ios26-diagonal-assembly {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* 1 & 3: Small Quote Capsules with Double-Layered Rim & Milky Frosted Core */
  .lg-ios26-quote-capsule {
    display: flex;
    z-index: 6;
  }

  .lg-ios26-quote-capsule--open {
    align-self: flex-start;
    margin-left: 2px;
  }

  .lg-ios26-quote-capsule--close {
    align-self: flex-end;
    margin-right: 2px;
    margin-top: -6px;
  }

  .lg-ios26-quote-capsule__outer-rim {
    padding: 4.5px;
    border-radius: 999px;
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.22) 0%,
        rgba(255, 255, 255, 0.04) 60%,
        transparent 100%
      );
    -webkit-backdrop-filter: blur(10px) saturate(155%);
    backdrop-filter: blur(10px) saturate(155%);
    border: 1.4px solid rgba(255, 255, 255, 0.82);
    box-shadow:
      0 12px 28px -6px rgba(0, 0, 0, 0.42),
      inset 0 1.5px 2px #ffffff;
  }

  .lg-ios26-quote-capsule__milky-core {
    min-width: 54px;
    height: 36px;
    padding: 0 16px;
    border-radius: 999px;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.86) 0%,
        rgba(240, 245, 255, 0.68) 100%
      );
    box-shadow:
      0 4px 10px rgba(0, 0, 0, 0.20),
      inset 0 1.5px 2px #ffffff;
  }

  .lg-ios26-quote-glyph {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 1.95rem;
    font-weight: 900;
    line-height: 1;
    color: rgba(24, 30, 48, 0.78);
    text-shadow: 0 1px 0 #ffffff;
    transform: translateY(5px);
    user-select: none;
  }

  /* 2: Wide Central Container — True Sun/Earth Clear Bubble Glass Hugging ONLY 2 Lines */
  .lg-ios26-central-capsule {
    position: relative;
    width: 100%;
    border-radius: 34px;
    padding: 20px 24px;
    box-sizing: border-box;
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(
        140% 100% at 20% 0%,
        rgba(255, 255, 255, 0.16) 0%,
        rgba(255, 255, 255, 0.02) 48%,
        transparent 78%
      );
    -webkit-backdrop-filter: blur(8px) saturate(150%);
    backdrop-filter: blur(8px) saturate(150%);
    box-shadow:
      0 22px 52px -12px rgba(0, 0, 0, 0.46),
      inset 0 2px 2.5px rgba(255, 255, 255, 0.88),
      inset 0 -2px 3.5px rgba(255, 195, 130, 0.28),
      inset 2px 0 3px rgba(255, 255, 255, 0.26),
      inset -2px 0 3px rgba(195, 225, 255, 0.24);
  }

  .lg-ios26-lyrics-empty {
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    text-align: center;
    font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
    font-size: 0.92rem;
    font-weight: 700;
    font-style: italic;
    color: rgba(255, 255, 255, 0.9);
  }

  /* Strictly 2-Line Spotlight (No extra stream or empty space below!) */
  .lg-ios26-two-line-spotlight {
    position: relative;
    z-index: 4;
    padding: 4px 2px;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 8px;
    text-align: left;
    isolation: isolate;
  }

  /* Softly Blurred Miniature Patch of the Album Cover Moving Behind the Active Spoken Words */
  .lg-ios26-word-cover-aura {
    position: absolute;
    top: -4%;
    left: var(--word-aura-x, 28%);
    width: 52%;
    height: 108%;
    transform: translateX(-25%);
    background-size: cover;
    background-position: center;
    border-radius: 999px;
    filter: blur(15px) saturate(185%) brightness(1.06);
    opacity: 0.65;
    z-index: 0;
    pointer-events: none;
    transition: left 0.28s linear, background-image 0.35s ease;
  }

  .lg-ios26-line {
    position: relative;
    z-index: 2;
    margin: 0;
    width: 100%;
    font-family: 'Plus Jakarta Sans', 'Outfit', system-ui, -apple-system, sans-serif;
    font-style: italic;
    text-align: left;
    letter-spacing: -0.01em;
    transition: transform 0.26s ease, opacity 0.26s ease;
  }

  .lg-ios26-line--primary {
    font-size: clamp(1.16rem, 1.02rem + 0.48vw, 1.44rem);
    font-weight: 800;
    line-height: 1.28;
    color: #ffffff;
    text-shadow:
      0 3px 14px rgba(0, 0, 0, 0.76),
      0 1px 3px rgba(0, 0, 0, 0.58);
  }

  .lg-ios26-line--secondary {
    font-size: clamp(0.98rem, 0.9rem + 0.34vw, 1.18rem);
    font-weight: 700;
    line-height: 1.32;
    color: rgba(255, 255, 255, 0.78);
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.65);
  }

  /* Responsive stacking for Selected Album + iOS 26 Lyrics on Mobile */
  @media (max-width: 880px) {
    .lg-album-detail-workspace {
      flex-direction: column;
      gap: 12px;
      padding-top: max(50px, calc(env(safe-area-inset-top) + 38px));
      overflow-y: auto;
    }

    .lg-album-player-column,
    .lg-album-detail-workspace--with-lyrics .lg-album-player-column {
      max-width: 100%;
      flex: 1 1 56%;
    }

    .lg-ascended-album-cover--sun-bubble {
      width: clamp(116px, 16dvh, 148px);
      height: clamp(116px, 16dvh, 148px);
    }

    .lg-ios26-lyrics-stage {
      max-width: 100%;
      width: 100%;
      flex: 0 0 auto;
      padding: 4px 4px 14px;
    }
  }

  @media (max-width: 640px) {
    .lg-glass-pill {
      -webkit-backdrop-filter: blur(10px) saturate(145%);
      backdrop-filter: blur(10px) saturate(145%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lg-main-glass,
    .lg-earth-scale-wrap,
    .lg-sun-scale-wrap,
    .lg-orb-title-img,
    .lg-glass-pill,
    .lg-next-random-btn,
    .lg-silk-tile,
    .lg-track-tube {
      transition: none;
      animation: none;
      opacity: 1;
    }
  }
`;


