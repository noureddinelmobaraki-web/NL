import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canvasFragmentShader } from './shaders/blackHoleFragment';

interface BlackHoleTransitionProps {
  onComplete: () => void;
  onNearComplete?: () => void;
}

// Respect user's motion preferences
const userPrefersReducedMotion = 
  typeof window !== 'undefined' && 
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const TOTAL_DURATION = 5500; // 5.5 Seconds

// Vertex Shader — Same as original project's canvasVertexShader.ts
const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const BlackHoleTransition = ({
  onComplete,
  onNearComplete,
}: BlackHoleTransitionProps) => {
  const containerRef      = useRef<HTMLDivElement>(null);
  const animFrameRef      = useRef<number>(0);
  const startTimeRef      = useRef<number>(0);
  const nearFiredRef      = useRef(false);
  const [threeModule, setThreeModule] = useState<typeof import('three') | null>(null);

  // Freeze pointer events during transition
  useEffect(() => {
    const origPointer  = document.body.style.pointerEvents;
    document.body.style.pointerEvents = 'none';
    return () => {
      document.body.style.pointerEvents = origPointer;
    };
  }, []);

  // Three.js setup
  useEffect(() => {
    if (userPrefersReducedMotion) {
      // Skip animation, go directly to completion
      onNearComplete?.();
      setTimeout(onComplete, 100);
      return;
    }

    if (!threeModule) {
      import('three').then((mod) => setThreeModule(mod));
      return;
    }
    const THREE = threeModule;

    const container = containerRef.current;
    if (!container) return;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Three.js core objects
    const scene    = new THREE.Scene();
    const camera   = new THREE.PerspectiveCamera(50, W / H, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });

    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    camera.position.z = 8;

    // Shader Material matching the uniform structure of the original simulation plus custom additions
    const uniforms: Record<string, { value: any }> = {
      uAccretionDisk:   { value: 1 },
      uMaxIterations:   { value: 100 },
      uStepSize:        { value: 2.5 / 100 },
      uResolution:      { value: new THREE.Vector2(W, H) },
      uTime:            { value: 0.0 },
      uCameraTranslate: { value: new THREE.Vector3(0, 0, 8) },
      uPov:             { value: 50 },
      uCanvasTexture:   { value: new THREE.Texture() },

      // Custom attributes for transition progress
      u_progress:       { value: 0.0 },
      u_cameraZ:        { value: 8.0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader:   VERTEX_SHADER,
      fragmentShader: canvasFragmentShader,
    });

    // Plane Geometry covering screen view
    const fovY     = camera.position.z * Math.tan((camera.fov * Math.PI) / 360) * 2;
    const geometry = new THREE.PlaneGeometry(fovY * camera.aspect, fovY);
    const mesh     = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    renderer.render(scene, camera);

    // Animation Loop
    const animate = (ts: number) => {
      if (!startTimeRef.current) startTimeRef.current = ts;

      const elapsed  = ts - startTimeRef.current;
      const progress = Math.min(elapsed / TOTAL_DURATION, 1);

      // Update uniforms inside shader
      material.uniforms.u_progress.value = progress;
      material.uniforms.uTime.value      = elapsed / 1000;

      // Bring camera closer to the black hole event horizon: Z goes 8 -> 0.2
      const eased  = Math.pow(progress, 3);
      const camZ   = 8.0 - eased * 7.8;
      material.uniforms.u_cameraZ.value        = camZ;
      material.uniforms.uCameraTranslate.value.z = camZ;

      renderer.render(scene, camera);

      // Fire near complete at 75%
      if (progress >= 0.75 && !nearFiredRef.current) {
        nearFiredRef.current = true;
        onNearComplete?.();
      }

      if (progress >= 1) {
        onComplete();
        return;
      }
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    // Resize Handler
    const onResize = () => {
      const nW = window.innerWidth;
      const nH = window.innerHeight;
      camera.aspect = nW / nH;
      camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
      material.uniforms.uResolution.value.set(nW, nH);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', onResize);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [onComplete, onNearComplete, threeModule]);

  return createPortal(
    <div
      ref={containerRef}
      style={{
        position:       'fixed',
        inset:          0,
        zIndex:         2147483647,
        width:          '100dvw',
        height:         '100dvh',
        background:     '#000',
        pointerEvents:  'all',
      }}
    />,
    document.body
  );
};
