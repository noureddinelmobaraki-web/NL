/**
 * src/features/liquid-glass/LiquidGlassPortalPage.tsx
 *
 * Single-file, zero-bloat WebGL Liquid Glass interactive page for NL:
 *  - Responsive PC & Phone WebP backgrounds rendered with real-time GLSL refraction
 *  - Initial centerpiece: Rotating Earth + 7 twinkling curved-corner stars inside a
 *    living, wobbling, crystal-clear circular Liquid Glass bubble just slightly larger than Earth
 *  - Click Earth -> the bubble itself smoothly morphs into an adaptive-aspect HLS (.m3u8) video player
 *  - Cylindrical transparent glass tube progress bar beneath the player with flowing blood-red liquid
 *  - Small Liquid Glass random-next video button at the bottom of the viewport
 *  - Clean audio lifecycle hooks for NL's central audioManager & soundGovernor (no unmanaged audio)
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, Shuffle, Volume2, VolumeX, X } from 'lucide-react';
import type Hls from 'hls.js';
import { useLiquidGlassAudio } from './useLiquidGlassAudio';

// ============================================================================
// [EDIT HERE: BACKGROUNDS] — روابط خلفيتي الحاسوب والهاتف
// ============================================================================
export const LIQUID_GLASS_BACKGROUNDS = {
  pc: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/pc.webp',
  phone: 'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/phone.webp',
  mobileBreakpointQuery: '(max-width: 768px)',
} as const;

// ============================================================================
// [EDIT HERE: VIDEO STREAMS] — قائمة الـ 21 فيديو بتقنية البث HLS (.m3u8)
// ============================================================================
export const LIQUID_GLASS_HLS_VIDEOS: readonly string[] = [
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/1/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/2/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/3/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/4/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/5/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/6/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/7/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/8/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/9/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/10/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/11/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/12/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/13/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/14/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/15/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/16/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/17/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/18/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/19/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/20/index.m3u8',
  'https://pub-5c31533ba4144f3cae2fd56daa14c951.r2.dev/21/index.m3u8',
];

// ============================================================================
// [EDIT HERE: GLASS SHADER UNIFORMS] — إعدادات فيزياء الزجاج السائل وسلوك المشغل
// ============================================================================
const GLASS_CONFIG = {
  tint: [0.99, 0.995, 1.0] as const,
  saturation: 1.18,
  distortion: 1.45,
  blurEarthMode: 0.35,
  blurVideoRim: 0.55,
  chromaticAberration: 1.35,
  shadowIntensity: 0.22,
  shadowOffsetX: 0,
  shadowOffsetY: 14,
  shadowBlur: 28,
  cornerRadiusDesktop: 32,
  cornerRadiusMobile: 24,
  /** عند انتهاء الفيديو ينتقل تلقائياً لفيديو عشوائي آخر */
  autoAdvanceOnEnded: true,
} as const;

// ============================================================================
// [EDIT HERE: EARTH TEXTURE] — خامة كوكب الأرض الأصلية الكاملة (Base64 JPEG)
// ============================================================================
const EARTH_TEXTURE_DATA_URI =
  'data:image/jpeg;base64,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';

// ============================================================================
// [EDIT HERE: AUDIO BRIDGE] — واجهة الربط مع نظام الصوت والتوجيه في موقع NL
// ============================================================================
export interface LiquidGlassPortalPageProps {
  /** إغلاق الصفحة والعودة للموقع (يُمرَّر closeLiquidGlass من AppContext) */
  onClose?: () => void;
  /**
   * يُستدعى تلقائياً عند تغيّر حالة صوت الفيديو (true = فيديو يعمل، أوقف موسيقى خلفية الصفحة؛
   * false = لا فيديو يعمل) لربط الصفحة بخطاف الصوت المركزي (audioManager / soundGovernor) دون تراكب
   */
  onVideoAudioActiveChange?: (isVideoAudible: boolean) => void;
  /**
   * يتيح تمرير عنصر <video> إلى audioManager.registerExternal('video', ...)
   */
  onVideoElementMount?: (videoEl: HTMLVideoElement | null) => void;
  /** حالة الكتم العالمي القادمة من NotchIsland (audioManager.isMuted) */
  externalMuted?: boolean;
  /** تبديل الكتم العالمي إن أراد المستخدم التحكم به من شريط الفيديو أيضاً */
  onToggleMute?: () => void;
}

// ============================================================================
// WebGL GLSL Shaders — محرك الزجاج السائل الحقيقي (فقاعة كريستالية متذبذبة + تحوّل سلس)
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

function buildFragmentShaderSource(hasDerivatives: boolean): string {
  const gradientBlock = hasDerivatives
    ? `
      #ifdef GL_OES_standard_derivatives
      vec2 grad = normalize(vec2(dFdx(sdf), dFdy(sdf)) + vec2(1e-5));
      #else
      vec2 grad = normalize(centeredUV + vec2(1e-5));
      #endif
    `
    : `
      float eps = 2.0;
      vec2 h = vec2(eps, 0.0);
      float sdf1 = sdLiquidShape((fragCoord + h.xy) - u_center, vec2(u_width, u_height), u_cornerRadius, u_wobbleAmp, u_time);
      float sdf2 = sdLiquidShape((fragCoord - h.xy) - u_center, vec2(u_width, u_height), u_cornerRadius, u_wobbleAmp, u_time);
      float sdf3 = sdLiquidShape((fragCoord + h.yx) - u_center, vec2(u_width, u_height), u_cornerRadius, u_wobbleAmp, u_time);
      float sdf4 = sdLiquidShape((fragCoord - h.yx) - u_center, vec2(u_width, u_height), u_cornerRadius, u_wobbleAmp, u_time);
      vec2 grad = normalize(vec2(sdf1 - sdf2, sdf3 - sdf4) + vec2(1e-5));
    `;

  return `
    #ifdef GL_OES_standard_derivatives
    #extension GL_OES_standard_derivatives : enable
    #endif

    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_center;
    uniform vec2 u_lightShift;
    uniform sampler2D u_texture;
    uniform float u_width;
    uniform float u_height;
    uniform vec3 u_tint;
    uniform float u_saturation;
    uniform float u_distortion;
    uniform float u_blur;
    uniform float u_imageAspect;
    uniform float u_canvasAspect;
    uniform float u_shadowIntensity;
    uniform vec2 u_shadowOffset;
    uniform float u_shadowBlur;
    uniform float u_cornerRadius;
    uniform float u_chromaticAberration;
    uniform float u_wobbleAmp;

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

    // Organic Siri/NotchIsland liquid droplet surface ripple
    float sdLiquidShape(vec2 pos, vec2 halfSize, float radius, float wobbleAmp, float t) {
      float base = sdRoundedRect(pos, halfSize, vec4(radius));
      if (wobbleAmp <= 0.001) return base;
      float ang = atan(pos.y, pos.x);
      float minDim = min(halfSize.x, halfSize.y);
      float wave =
        sin(ang * 2.0 + t * 1.65) * 0.44 +
        cos(ang * 3.0 - t * 2.15) * 0.34 +
        sin(ang * 4.0 + t * 1.25) * 0.22;
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
      vec2 centeredUV = fragCoord - u_center;
      float sdf = sdLiquidShape(centeredUV, vec2(u_width, u_height), u_cornerRadius, u_wobbleAmp, u_time);

      vec2 coverUV = getCoverUV(v_texCoord, u_imageAspect, u_canvasAspect);
      vec3 baseTex = texture2D(u_texture, coverUV).rgb;

      // Analytical O(1) soft drop shadow around the liquid glass boundary
      float shadowDist = sdLiquidShape(centeredUV - u_shadowOffset, vec2(u_width, u_height), u_cornerRadius, u_wobbleAmp, u_time);
      float shadowAlpha = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shadowDist)) * u_shadowIntensity;
      vec3 shadowedBackground = baseTex * (1.0 - shadowAlpha);

      // Fast exit outside the glass boundary
      if (sdf > 1.5) {
        gl_FragColor = vec4(shadowedBackground, 1.0);
        return;
      }

      float minHalfDim = max(min(u_width, u_height), 1.0);
      float normalizedInside = clamp((sdf / minHalfDim) + 1.0, 0.0, 1.0);
      // Meniscus lens curve: crystal clear in the interior, strong curved glass lensing at the outer rim
      float rimCurve = pow(normalizedInside, 3.8);
      float outerMeniscus = pow(normalizedInside, 8.5);

      ${gradientBlock}

      vec2 refractVec = grad * (-0.042 * u_distortion * rimCurve) + u_lightShift * 0.003 * rimCurve;
      vec2 sampleUV = v_texCoord + refractVec;

      // Keep interior 100% transparent/sharp; subtle optical softening only at the curved glass bevel
      float rimBlurPx = outerMeniscus * 2.4 * u_blur;
      vec3 glassTex = sampleCrystalGlass(sampleUV, refractVec, rimBlurPx);
      glassTex = mix(glassTex, saturateColor(glassTex, u_saturation), rimCurve * 0.55);
      glassTex *= u_tint;

      // Rotating liquid caustic + pointer-reactive fresnel specular highlight
      float causticAngle = u_time * 0.55;
      vec2 lightDir1 = normalize(vec2(-0.707, -0.707) + u_lightShift * 0.35 + vec2(cos(causticAngle), sin(causticAngle)) * 0.18 * u_wobbleAmp);
      vec2 lightDir2 = normalize(vec2(0.65, 0.75) - u_lightShift * 0.25);
      float spec1 = pow(max(dot(grad, lightDir1), 0.0), 3.2);
      float spec2 = pow(max(dot(grad, lightDir2), 0.0), 4.0) * 0.55;

      // Crisp crystal bubble rim + subtle iridescent fresnel sheen
      float rimHighlight = smoothstep(-5.5, -0.6, sdf) * (1.0 - smoothstep(-0.6, 1.2, sdf));
      vec3 fresnelTint = mix(vec3(0.84, 0.95, 1.0), vec3(1.0, 0.96, 0.99), spec1);
      glassTex += fresnelTint * ((spec1 + spec2) * outerMeniscus * 0.36 + rimHighlight * 0.32);

      float boxMask = 1.0 - smoothstep(-0.85, 0.85, sdf);
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
// Rotating Earth + 7 Curved-Corner Twinkling Stars (Exact Scoped Conversion)
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
      aria-label="اضغط على الكوكب لبدء عرض الفيديوهات"
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

  // Responsive viewport mode (phone <= 768px vs PC > 768px)
  const [isMobileView, setIsMobileView] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia(LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery).matches
      : false,
  );

  // WebGL texture readiness (falls back cleanly to <picture> + CSS glass if WebGL/CORS fails)
  const [webglReady, setWebglReady] = useState(false);

  // Mode: 'earth' initially -> 'video' once Earth is clicked
  const [mode, setMode] = useState<'earth' | 'video'>('earth');
  const [currentVideoIndex, setCurrentVideoIndex] = useState<number | null>(null);
  const [videoAspect, setVideoAspect] = useState<number>(16 / 9);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [localMuted, setLocalMuted] = useState(false);

  const effectiveMuted = externalMuted || localMuted;

  // Refs for WebGL, HLS, shuffle bag, and smooth geometry interpolation
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glassBoxRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shuffleBagRef = useRef<number[]>([]);
  const lastPickedRef = useRef<number>(-1);
  const seekTrackRef = useRef<HTMLDivElement | null>(null);
  const isScrubbingRef = useRef(false);

  // Mutable render state read inside rAF without re-creating the WebGL loop
  const renderStateRef = useRef({
    mode: 'earth' as 'earth' | 'video',
    isMobile: isMobileView,
    imageAspect: isMobileView ? 9 / 16 : 16 / 9,
    currCenterX: 0,
    currCenterY: 0,
    currHalfW: 142,
    currHalfH: 142,
    currCorner: 142,
    currWobble: 1,
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
      // Fisher-Yates shuffle
      for (let i = fresh.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fresh[i], fresh[j]] = [fresh[j], fresh[i]];
      }
      // Prevent immediate repeat across bag boundary
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

  // ── Media query listener for PC <-> Phone background switching ───────────
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(LIQUID_GLASS_BACKGROUNDS.mobileBreakpointQuery);
    const onChange = (e: MediaQueryListEvent) => setIsMobileView(e.matches);
    setIsMobileView(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // ── Escape key closes fullscreen page ────────────────────────────────────
  useEffect(() => {
    if (!onClose) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  // ── Desktop subtle pointer specular/refraction tracking (no free drag) ───
  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const vw = Math.max(window.innerWidth, 1);
    const vh = Math.max(window.innerHeight, 1);
    renderStateRef.current.targetLightX = ((e.clientX / vw) - 0.5) * 2;
    renderStateRef.current.targetLightY = ((e.clientY / vh) - 0.5) * 2;
  }, []);

  const handlePointerLeave = useCallback(() => {
    renderStateRef.current.targetLightX = 0;
    renderStateRef.current.targetLightY = 0;
  }, []);

  // ── WebGL Liquid Glass Engine ────────────────────────────────────────────
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

    const hasDerivatives = Boolean(gl.getExtension('OES_standard_derivatives'));

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
    const fs = compileShader(gl.FRAGMENT_SHADER, buildFragmentShaderSource(hasDerivatives));
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

    // Fullscreen quad: v_texCoord (0,0) = top-left, (1,1) = bottom-right (matches DOM client coords)
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
      u_center: gl.getUniformLocation(program, 'u_center'),
      u_lightShift: gl.getUniformLocation(program, 'u_lightShift'),
      u_texture: gl.getUniformLocation(program, 'u_texture'),
      u_width: gl.getUniformLocation(program, 'u_width'),
      u_height: gl.getUniformLocation(program, 'u_height'),
      u_tint: gl.getUniformLocation(program, 'u_tint'),
      u_saturation: gl.getUniformLocation(program, 'u_saturation'),
      u_distortion: gl.getUniformLocation(program, 'u_distortion'),
      u_blur: gl.getUniformLocation(program, 'u_blur'),
      u_imageAspect: gl.getUniformLocation(program, 'u_imageAspect'),
      u_canvasAspect: gl.getUniformLocation(program, 'u_canvasAspect'),
      u_shadowIntensity: gl.getUniformLocation(program, 'u_shadowIntensity'),
      u_shadowOffset: gl.getUniformLocation(program, 'u_shadowOffset'),
      u_shadowBlur: gl.getUniformLocation(program, 'u_shadowBlur'),
      u_cornerRadius: gl.getUniformLocation(program, 'u_cornerRadius'),
      u_chromaticAberration: gl.getUniformLocation(program, 'u_chromaticAberration'),
      u_wobbleAmp: gl.getUniformLocation(program, 'u_wobbleAmp'),
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

    // Store gl + texture on canvas element for the responsive image swapper effect
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

      // Measure actual DOM glass container so WebGL SDF morphs 1:1 from circular bubble to video player
      const st = renderStateRef.current;
      const boxEl = glassBoxRef.current;
      if (boxEl) {
        const rect = boxEl.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const targetCX = (rect.left - canvasRect.left + rect.width * 0.5) * dpr;
        const targetCY = (rect.top - canvasRect.top + rect.height * 0.5) * dpr;
        const targetHW = Math.max(rect.width * 0.5 * dpr, 20);
        const targetHH = Math.max(rect.height * 0.5 * dpr, 20);

        const baseVideoCorner =
          (st.isMobile ? GLASS_CONFIG.cornerRadiusMobile : GLASS_CONFIG.cornerRadiusDesktop) * dpr;
        const targetCorner =
          st.mode === 'earth'
            ? Math.min(targetHW, targetHH)
            : Math.min(baseVideoCorner, Math.min(targetHW, targetHH) - 1);
        const targetWobble = st.mode === 'earth' ? 1.0 : 0.0;

        if (!st.geometryInitialized) {
          st.currCenterX = targetCX;
          st.currCenterY = targetCY;
          st.currHalfW = targetHW;
          st.currHalfH = targetHH;
          st.currCorner = targetCorner;
          st.currWobble = targetWobble;
          st.geometryInitialized = true;
        } else {
          const ease = 0.18;
          st.currCenterX += (targetCX - st.currCenterX) * ease;
          st.currCenterY += (targetCY - st.currCenterY) * ease;
          st.currHalfW += (targetHW - st.currHalfW) * ease;
          st.currHalfH += (targetHH - st.currHalfH) * ease;
          st.currCorner += (targetCorner - st.currCorner) * ease;
          st.currWobble += (targetWobble - st.currWobble) * 0.14;
        }
      }

      st.lightX += (st.targetLightX - st.lightX) * 0.08;
      st.lightY += (st.targetLightY - st.lightY) * 0.08;

      const clampedCorner = Math.min(
        Math.max(st.currCorner, 4),
        Math.min(st.currHalfW, st.currHalfH) - 0.5,
      );

      gl.useProgram(program);
      gl.uniform1f(locs.u_time, (now - t0) * 0.001);
      gl.uniform2f(locs.u_resolution, canvas.width, canvas.height);
      gl.uniform2f(locs.u_center, st.currCenterX, st.currCenterY);
      gl.uniform2f(locs.u_lightShift, st.lightX, st.lightY);
      gl.uniform1i(locs.u_texture, 0);
      gl.uniform1f(locs.u_width, st.currHalfW);
      gl.uniform1f(locs.u_height, st.currHalfH);
      gl.uniform3f(locs.u_tint, GLASS_CONFIG.tint[0], GLASS_CONFIG.tint[1], GLASS_CONFIG.tint[2]);
      gl.uniform1f(locs.u_saturation, GLASS_CONFIG.saturation);
      gl.uniform1f(locs.u_distortion, GLASS_CONFIG.distortion);
      gl.uniform1f(
        locs.u_blur,
        st.mode === 'video' ? GLASS_CONFIG.blurVideoRim : GLASS_CONFIG.blurEarthMode,
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
      gl.uniform1f(locs.u_cornerRadius, clampedCorner);
      gl.uniform1f(locs.u_chromaticAberration, GLASS_CONFIG.chromaticAberration);
      gl.uniform1f(locs.u_wobbleAmp, st.currWobble);

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
        // Graceful fallback to <picture> + CSS glass if canvas is tainted
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

  // ── Dynamic HLS (.m3u8) Streaming Lifecycle — Zero upfront page load ─────
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
        // Fallback if browser requires muted start before unmuting
        setIsPlaying(false);
      });
    };

    void (async () => {
      // Prefer hls.js where MediaSource is supported; fallback to native Safari HLS
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

  // Ensure audio system resets cleanly on unmount
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

  // Dynamic CSS custom properties for adaptive video aspect ratio
  const cornerRadiusPx = isMobileView
    ? GLASS_CONFIG.cornerRadiusMobile
    : GLASS_CONFIG.cornerRadiusDesktop;

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
        } as React.CSSProperties
      }
    >
      <style>{SCOPED_STYLES}</style>

      {/* 1. Instant LCP Responsive Background (<picture>) + Fallback if WebGL CORS fails */}
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

      {/* 2. Real-time WebGL GLSL Liquid Glass Shader Canvas */}
      <canvas
        ref={canvasRef}
        className={`lg-webgl-canvas${webglReady ? ' lg-webgl-canvas--ready' : ''}`}
        aria-hidden="true"
      />

      {/* 3. Optional Fullscreen Close Button (✕) */}
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

      {/* 4. Main Centered Stage: Single Unified Liquid Glass Bubble that Morphs into the Video Player */}
      <main className="lg-stage">
        <div
          ref={glassBoxRef}
          className={`lg-main-glass ${
            mode === 'video' ? 'lg-main-glass--video' : 'lg-main-glass--earth'
          }${!webglReady ? ' lg-main-glass--css-fallback' : ''}`}
        >
          {/* Crystal-clear liquid bubble specular caustic & rim layers */}
          <div className="lg-main-glass__caustic" aria-hidden="true" />
          <div className="lg-main-glass__rim" aria-hidden="true" />
          <div className="lg-main-glass__sheen" aria-hidden="true" />

          {/* Earth stays mounted during the morph so the bubble itself transforms seamlessly */}
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

      {/* 6. Small Liquid Glass Random Video Navigation Button at Bottom of Page */}
      {mode === 'video' && (
        <div className="lg-bottom-dock">
          <button
            type="button"
            className="lg-glass-pill lg-next-random-btn"
            onClick={triggerRandomVideo}
            aria-label="عرض فيديو عشوائي آخر"
          >
            <Shuffle size={15} strokeWidth={2.2} />
            <span>فيديو آخر</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Scoped Styles — Living Circular Liquid Bubble around Earth, Seamless Morph
// into Video Player, and Cylindrical Glass Tube Progress Bar with Blood-Red Liquid
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

  .lg-close-btn:hover {
    transform: scale(1.05);
  }

  .lg-close-btn:active {
    transform: scale(0.95);
  }

  /* ── Center Stage & Unified Morphing Liquid Glass Bubble ───────────────── */
  .lg-stage {
    position: relative;
    z-index: 10;
    width: 100%;
    height: 100%;
    padding:
      max(68px, calc(env(safe-area-inset-top) + 56px))
      max(16px, env(safe-area-inset-left))
      max(82px, calc(env(safe-area-inset-bottom) + 74px))
      max(16px, env(safe-area-inset-right));
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    box-sizing: border-box;
    pointer-events: none;
  }

  .lg-main-glass {
    position: relative;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    isolation: isolate;
    transform-origin: center center;
    transition:
      width 0.72s cubic-bezier(0.22, 1, 0.36, 1),
      height 0.72s cubic-bezier(0.22, 1, 0.36, 1),
      border-radius 0.72s cubic-bezier(0.22, 1, 0.36, 1),
      box-shadow 0.55s cubic-bezier(0.22, 1, 0.36, 1),
      background 0.55s ease;
  }

  /*
   * Initial Earth State:
   * Circular, crystal-clear liquid glass bubble wrapping closely around the 250px Earth
   * (only ~18px of liquid glass shell around the planet) with continuous Siri/NotchIsland
   * organic water-droplet wobble & breathing motion.
   */
  .lg-main-glass--earth {
    width: 286px;
    height: 286px;
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

  @media (max-width: 480px) {
    .lg-main-glass--earth {
      width: 216px;
      height: 216px;
    }
  }

  /*
   * Video Player State:
   * The exact same bubble smoothly expands and morphs its curvature into the video player
   */
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

  /* CSS fallback glass only if WebGL or CORS fails */
  .lg-main-glass--css-fallback.lg-main-glass--earth {
    -webkit-backdrop-filter: blur(6px) saturate(145%);
    backdrop-filter: blur(6px) saturate(145%);
  }

  .lg-main-glass--css-fallback.lg-main-glass--video {
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

  .lg-main-glass--video .lg-main-glass__sheen {
    opacity: 0.38;
  }

  /* ── Video Viewport Morphs Directly Inside the Same Bubble ─────────────── */
  .lg-video-viewport {
    position: absolute;
    inset: 0;
    z-index: 2;
    width: 100%;
    height: 100%;
    border-radius: inherit;
    overflow: hidden;
    background: rgba(3, 5, 10, 0.55);
    cursor: pointer;
    animation: lgBubbleMorphIn 0.62s cubic-bezier(0.22, 1, 0.36, 1) both;
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

  /* Hollow 3D Cylindrical Glass Tube */
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

  /* Continuous glass tube specular reflection sitting ABOVE the blood-red liquid */
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

  /* Translucent Blood-Red Liquid Flowing Inside the Glass Tube */
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

  /* Subtle internal crimson liquid wave shimmer */
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

  /* Blood-Red Liquid Meniscus Droplet Thumb inside/around the Tube */
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

  /* ── Small Liquid Glass Random Navigation Button at Page Bottom ────────── */
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
    pointer-events: auto;
    min-height: 44px;
    padding: 0 18px;
    gap: 8px;
    font-size: 0.84rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    cursor: pointer;
    animation: lgFadeSlideUp 0.44s cubic-bezier(0.16, 1, 0.3, 1) both;
  }

  .lg-next-random-btn:hover {
    transform: translateY(-2px) scale(1.03);
  }

  .lg-next-random-btn:active {
    transform: translateY(0) scale(0.96);
  }

  /* ==========================================================================
   * [EDIT HERE: EARTH & STARS] — الكوكب الدوّار والنجوم الـ 7 (مطابق للأصل 100%)
   * ========================================================================== */
  .lg-earth-trigger {
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

  .lg-earth-trigger--morphed {
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
    transform: scale(1);
    transition: transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.32s ease;
  }

  .lg-earth-trigger:hover .lg-earth-scale-wrap {
    transform: scale(1.035);
    filter: drop-shadow(0 0 18px rgba(195, 244, 255, 0.36));
  }

  .lg-earth-trigger:active .lg-earth-scale-wrap {
    transform: scale(0.96);
  }

  @media (max-width: 480px) {
    .lg-earth-scale-wrap {
      transform: scale(0.74);
    }
    .lg-earth-trigger:hover .lg-earth-scale-wrap {
      transform: scale(0.765);
    }
    .lg-earth-trigger:active .lg-earth-scale-wrap {
      transform: scale(0.71);
    }
  }

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

  .lg-star {
    position: absolute;
    pointer-events: none;
  }

  .lg-star-1 {
    left: -20px;
    animation: lgTwinkling 3s infinite;
  }

  .lg-star-2 {
    left: -40px;
    top: 30px;
    animation: lgTwinkling 2s infinite;
  }

  .lg-star-3 {
    left: 350px;
    top: 90px;
    animation: lgTwinkling 4s infinite;
  }

  .lg-star-4 {
    left: 200px;
    top: 290px;
    animation: lgTwinkling 3s infinite;
  }

  .lg-star-5 {
    left: 50px;
    top: 270px;
    animation: lgTwinkling 1.5s infinite;
  }

  .lg-star-6 {
    left: 250px;
    top: -50px;
    animation: lgTwinkling 4s infinite;
  }

  .lg-star-7 {
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

  /* Smooth performance tier on mobile touch devices */
  @media (max-width: 640px) {
    .lg-glass-pill {
      -webkit-backdrop-filter: blur(12px) saturate(150%);
      backdrop-filter: blur(12px) saturate(150%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .lg-main-glass,
    .lg-earth-scale-wrap,
    .lg-glass-pill {
      transition: none;
      animation: none;
    }
  }
`;
