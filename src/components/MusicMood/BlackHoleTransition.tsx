import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface BlackHoleTransitionProps {
  onComplete: () => void;
  onNearComplete?: () => void;
}

const TOTAL_DURATION = 3000; // 3.0 seconds
const NEAR_COMPLETE_AT = 0.8333; // fire exactly 500ms before transition ends (2500ms / 3000ms)

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isDesktopDevice = (): boolean =>
  typeof window !== 'undefined' && window.innerWidth >= 1024;

// ── Exposed helper: warm-import three.js on hover/focus so it is cached before click ──
export const preloadBlackHoleTransition = (): void => {
  if (!isDesktopDevice() || prefersReducedMotion()) return;
  import('three').catch(() => {});
};

export const BlackHoleTransition = ({ onComplete, onNearComplete }: BlackHoleTransitionProps) => {
  const wrapperRef      = useRef<HTMLDivElement>(null);
  const glContainerRef  = useRef<HTMLDivElement>(null);
  const animFrameRef    = useRef<number>(0);
  const startTimeRef    = useRef<number>(0);
  const nearFiredRef    = useRef(false);
  const completedRef    = useRef(false);
  const mountedRef      = useRef(true);

  const [mode, setMode] = useState<'css' | 'webgl' | 'deciding'>('deciding');

  // ── Safety timeout — guarantees we NEVER freeze permanently ──
  useEffect(() => {
    const safety = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onNearComplete?.();
        onComplete();
      }
    }, TOTAL_DURATION + 1000);
    return () => window.clearTimeout(safety);
  }, [onComplete, onNearComplete]);

  // ── Track mount state to avoid setState after unmount ──
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Decide strategy once ──
  useEffect(() => {
    const useWebGL = isDesktopDevice() && !prefersReducedMotion();
    setMode(useWebGL ? 'webgl' : 'css');
  }, []);

  // ── Scroll lock on <html>, NOT on body (preserves body transforms safety) ──
  useEffect(() => {
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.classList.add('bh-transitioning');
    return () => {
      document.documentElement.style.overflow = prev;
      document.body.classList.remove('bh-transitioning');
    };
  }, []);

  // ──────────────────────────────────────────────────────────
  // CSS PATH — mobile, reduced-motion, and WebGL fallback
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'css') return;
    let raf = 0;
    const tick = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;
      const p = Math.min((ts - startTimeRef.current) / TOTAL_DURATION, 1);
      if (!nearFiredRef.current && p >= NEAR_COMPLETE_AT) {
        nearFiredRef.current = true;
        onNearComplete?.();
      }
      if (p >= 1) {
        if (!completedRef.current) {
          completedRef.current = true;
          onComplete();
        }
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [mode, onComplete, onNearComplete]);

  // ──────────────────────────────────────────────────────────
  // WEBGL PATH — desktop only, fast shader (no raytracing)
  // ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'webgl') return;

    // Use local variables for cleanup — never store on renderer
    let disposed = false;
    let cleanupFns: (() => void)[] = [];

    const run = async () => {
      const THREE = await import('three').catch(() => null);

      // Guard: component may have unmounted while three.js was loading
      if (!THREE || disposed || !mountedRef.current) {
        if (mountedRef.current) setMode('css'); // fallback
        return;
      }

      const container = glContainerRef.current;
      if (!container) return;

      const W = window.innerWidth;
      const H = window.innerHeight;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'high-performance' });
      } catch {
        if (mountedRef.current) setMode('css');
        return;
      }

      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);

      const scene  = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const uniforms = {
        uTime:       { value: 0.0 },
        uProgress:   { value: 0.0 },
        uResolution: { value: new THREE.Vector2(W, H) },
      };

      // ── Lightweight 2D shader — swirl + chromatic + iris + bloom ──
      const fragmentShader = `
        precision highp float;
        uniform float uTime;
        uniform float uProgress;
        uniform vec2  uResolution;

        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p), f = p - i;
          float a = hash(i), b = hash(i+vec2(1.,0.)), c = hash(i+vec2(0.,1.)), d = hash(i+vec2(1.,1.));
          vec2 u = f*f*(3.-2.*f);
          return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        }
        float fbm(vec2 p){
          float v=0.; float a=0.5;
          for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.1; a*=0.5; }
          return v;
        }

        void main(){
          vec2 uv = gl_FragCoord.xy / uResolution.xy;
          vec2 c  = uv - 0.5;
          c.x *= uResolution.x / uResolution.y;
          float r = length(c);
          float a = atan(c.y, c.x);

          float swirlAmt = smoothstep(0.08, 0.55, uProgress) * (1. - smoothstep(0.7, 0.95, uProgress));
          a += swirlAmt * (1.8 - r) * 3.5 + uTime * 0.4 * swirlAmt;
          vec2 swUV = vec2(cos(a), sin(a)) * r + 0.5;

          float fog = fbm(swUV * 2.8 + uTime * 0.25);
          fog = pow(fog, 1.4);

          // Chromatic aberration offset
          float chr = swirlAmt * 0.012;
          float rr = fbm((swUV + vec2(chr, 0.)) * 2.8 + uTime * 0.25);
          float bb = fbm((swUV - vec2(chr, 0.)) * 2.8 + uTime * 0.25);

          // Iris: uses smooth radius falloff (no radial-gradient, pure GLSL)
          float irisClose = smoothstep(0., 0.68, uProgress);
          float irisOpen  = smoothstep(0.76, 1.0, uProgress);
          float irisR = mix(1.6, 0.0, irisClose);
          irisR = mix(irisR, 1.6, irisOpen);
          float iris = smoothstep(irisR, irisR - 0.04, r);

          // Heartbeat
          float beat = 0.5 + 0.5 * sin(uTime * 13.0);
          float dot  = smoothstep(0.05 + beat*0.01, 0., r)
                      * smoothstep(0.58, 0.82, uProgress)
                      * (1. - smoothstep(0.84, 1., uProgress));

          vec3 violet = vec3(0.52, 0.30, 0.98);
          vec3 indigo = vec3(0.18, 0.12, 0.55);
          vec3 base   = mix(indigo, violet, vec3(rr, fog, bb));
          base *= (1. - irisClose * 0.9);
          base  = mix(base, vec3(0.), iris * irisClose);
          base += dot * vec3(1.0, 0.96, 0.88);

          float bloom = irisOpen * (1. - r * 0.65);
          base = mix(base, vec3(1.), clamp(bloom * 1.3, 0., 1.));

          float alpha = 1. - smoothstep(0.90, 1.0, uProgress) * 0.5;
          gl_FragColor = vec4(base, alpha);
        }
      `;
      const vertexShader = `void main(){ gl_Position = vec4(position, 1.0); }`;

      const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, transparent: true });
      const geometry = new THREE.PlaneGeometry(2, 2);
      const mesh     = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const animate = (ts: number) => {
        if (disposed) return;
        if (!startTimeRef.current) startTimeRef.current = ts;
        const elapsed = ts - startTimeRef.current;
        const p = Math.min(elapsed / TOTAL_DURATION, 1);

        uniforms.uTime.value     = elapsed / 1000;
        uniforms.uProgress.value = p;

        // Screen shake via wrapper div — NEVER via body or canvas.style.transform
        if (wrapperRef.current && p > 0.22 && p < 0.65) {
          const shk = Math.sin(p * Math.PI) * 5;
          const sx  = (Math.random() - 0.5) * shk;
          const sy  = (Math.random() - 0.5) * shk;
          wrapperRef.current.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
        } else if (wrapperRef.current && p >= 0.65) {
          wrapperRef.current.style.transform = '';
        }

        renderer.render(scene, camera);

        if (!nearFiredRef.current && p >= NEAR_COMPLETE_AT) {
          nearFiredRef.current = true;
          onNearComplete?.();
        }
        if (p >= 1) {
          if (!completedRef.current) {
            completedRef.current = true;
            wrapperRef.current && (wrapperRef.current.style.transform = '');
            onComplete();
          }
          return;
        }
        animFrameRef.current = requestAnimationFrame(animate);
      };
      animFrameRef.current = requestAnimationFrame(animate);

      const onResize = () => {
        const nW = window.innerWidth, nH = window.innerHeight;
        renderer.setSize(nW, nH);
        uniforms.uResolution.value.set(nW, nH);
      };
      window.addEventListener('resize', onResize, { passive: true });

      // Store cleanup in local array
      cleanupFns.push(
        () => window.removeEventListener('resize', onResize),
        () => {
          cancelAnimationFrame(animFrameRef.current);
          if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
        }
      );
    };

    run();

    return () => {
      disposed = true;
      cleanupFns.forEach(fn => { try { fn(); } catch {} });
    };
  }, [mode, onComplete, onNearComplete]);

  // ──────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────
  return createPortal(
    <div
      ref={wrapperRef}
      aria-hidden="true"
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          2147483647,
        width:           '100dvw',
        height:          '100dvh',
        pointerEvents:   'auto',
        overflow:        'hidden',
        contain:         'strict',
        // NEVER apply transform on body — only on this wrapper
        willChange:      'transform',
        background:      mode === 'css' ? '#030010' : 'transparent',
      }}
    >
      {/* WebGL canvas container */}
      {mode === 'webgl' && <div ref={glContainerRef} style={{ position: 'absolute', inset: 0 }} />}

      {/* ──────────── CSS / MOBILE LAYERS ──────────── */}
      {mode === 'css' && (
        <>
          {/* SVG filter definition */}
          <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }} aria-hidden="true">
            <defs>
              <filter id="bh-dream-filter" x="-20%" y="-20%" width="140%" height="140%">
                <feTurbulence type="fractalNoise" baseFrequency="0.015 0.010" numOctaves="3" seed="7">
                  <animate attributeName="baseFrequency" dur="2.4s" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1" values="0.015 0.010; 0.055 0.040; 0.015 0.010" repeatCount="1" fill="freeze" />
                </feTurbulence>
                <feDisplacementMap in="SourceGraphic" scale="30" xChannelSelector="R" yChannelSelector="G" />
              </filter>
            </defs>
          </svg>

          {/* Fog background layer */}
          <div className="bh-fog" />

          {/* Iris — clip-path:circle() is the ONLY correct way to animate smoothly */}
          <div className="bh-iris" />

          {/* Heartbeat dot */}
          <div className="bh-dot" />

          {/* 30 streak particles */}
          <div className="bh-particles" aria-hidden="true">
            {Array.from({ length: 30 }).map((_, i) => (
              <span key={i} className="bh-p" style={{ ['--i' as string]: String(i) } as React.CSSProperties} />
            ))}
          </div>

          {/* White bloom */}
          <div className="bh-bloom" />
        </>
      )}

      <style>{`
        /* ── Wrapper shake (applies to both modes via CSS animation on the wrapper) ── */
        @keyframes bh-shake {
          0%,100%{ transform:translate3d(0,0,0); }
          20%{ transform:translate3d(-5px,2px,0); }
          40%{ transform:translate3d(4px,-4px,0); }
          60%{ transform:translate3d(-3px,5px,0); }
          80%{ transform:translate3d(3px,-2px,0); }
        }

        /* ── FOG ── */
        .bh-fog{
          position:absolute; inset:-15%; border-radius:50%;
          background:
            radial-gradient(circle at 50% 50%, rgba(100,50,255,0.6) 0%, rgba(30,10,100,0.8) 40%, rgba(3,0,16,0.98) 75%),
            radial-gradient(circle at 30% 40%, rgba(160,90,255,0.3) 0%, transparent 40%);
          filter: url(#bh-dream-filter) blur(18px);
          animation: bh-fog-anim 2400ms cubic-bezier(0.5,0,0.5,1) forwards;
          will-change: transform, opacity;
        }
        @keyframes bh-fog-anim{
          0%  { transform:scale(1.2) rotate(0deg);   opacity:0;   filter:url(#bh-dream-filter) blur(0px); }
          15% { opacity:1; }
          28% { transform:scale(1.05) rotate(15deg); filter:url(#bh-dream-filter) blur(14px); }
          65% { transform:scale(0.20) rotate(160deg); opacity:1; filter:url(#bh-dream-filter) blur(22px); }
          82% { transform:scale(0.02) rotate(230deg); opacity:1; }
          100%{ transform:scale(3.0)  rotate(280deg); opacity:0; filter:url(#bh-dream-filter) blur(0px); }
        }

        /* ── IRIS — clip-path:circle() is the ONLY browser-safe animatable iris ── */
        .bh-iris{
          position:absolute; inset:0;
          background:#000;
          /* Start with clip-path fully open (circle 100%), close to 0%, re-open */
          animation: bh-iris-anim 2400ms cubic-bezier(0.6,0,0.4,1) forwards;
          will-change: clip-path;
        }
        @keyframes bh-iris-anim{
          0%   { clip-path: circle(140% at 50% 50%); opacity:0; }
          8%   { opacity:1; clip-path: circle(140% at 50% 50%); }
          58%  { clip-path: circle(4px at 50% 50%); }
          78%  { clip-path: circle(2px at 50% 50%); }
          85%  { clip-path: circle(3px at 50% 50%); }
          100% { clip-path: circle(140% at 50% 50%); opacity:0; }
        }

        /* ── HEARTBEAT DOT ── */
        .bh-dot{
          position:absolute; left:50%; top:50%;
          width:20px; height:20px; margin:-10px 0 0 -10px;
          border-radius:50%;
          background:radial-gradient(circle, #fff 0%, #c8a0ff 50%, transparent 100%);
          box-shadow: 0 0 30px 10px rgba(200,160,255,0.9);
          opacity:0;
          animation: bh-dot-anim 2400ms ease-in-out forwards;
          will-change: transform, opacity;
        }
        @keyframes bh-dot-anim{
          0%,56%{ opacity:0; transform:scale(0.1); }
          63%{ opacity:1; transform:scale(1.0); }
          70%{ transform:scale(0.65); }
          76%{ transform:scale(1.4); }
          83%{ transform:scale(0.85); }
          88%{ opacity:1; transform:scale(1.1); }
          100%{ opacity:0; transform:scale(60); }
        }

        /* ── PARTICLES ── */
        .bh-particles{ position:absolute; inset:0; pointer-events:none; }
        .bh-p{
          position:absolute; left:50%; top:50%;
          width:3px; height:3px; border-radius:50%;
          background:rgba(200,170,255,0.95);
          box-shadow:0 0 6px 2px rgba(180,140,255,0.8);
          /* Use CSS custom property --i for angle/distance variation */
          --angle: calc(calc(var(--i) + 0) * 12deg);
          --dist: calc(45vmax - calc(var(--i) * 0.5px));
          transform: rotate(var(--angle)) translateX(var(--dist)) scale(0);
          animation: bh-p-fall 2.4s ease-in forwards;
          animation-delay: calc(var(--i) * 20ms);
          will-change: transform, opacity;
        }
        @keyframes bh-p-fall{
          0%  { transform:rotate(var(--angle)) translateX(var(--dist)) scale(0); opacity:0; }
          12% { transform:rotate(var(--angle)) translateX(var(--dist)) scale(1); opacity:1; }
          72% { transform:rotate(calc(var(--angle) + 100deg)) translateX(6px) scale(0.5); opacity:0.7; }
          100%{ transform:rotate(calc(var(--angle) + 200deg)) translateX(0) scale(0); opacity:0; }
        }

        /* ── WHITE BLOOM ── */
        .bh-bloom{
          position:absolute; inset:0;
          background:radial-gradient(circle at 50% 50%, #fff 0%, rgba(255,255,255,0.5) 25%, transparent 65%);
          opacity:0;
          animation: bh-bloom-anim 2400ms ease-out forwards;
          will-change: transform, opacity;
        }
        @keyframes bh-bloom-anim{
          0%,76%{ opacity:0; transform:scale(0.05); }
          86%   { opacity:1; transform:scale(1.1); }
          100%  { opacity:0; transform:scale(1.8); }
        }
      `}</style>
    </div>,
    document.body
  );
};
