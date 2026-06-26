import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { audioEngine } from '../engine/audioEngine';

interface Visualizer3DProps {
  themeColor?: string;
}

export function Visualizer3D({ themeColor = '#10b981' }: Visualizer3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let animationId: number = 0;
    let geometry: THREE.BufferGeometry | null = null;
    let material: THREE.PointsMaterial | null = null;

    try {
      // 1. Scene, Camera & WebGL Renderer setup
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x0f172a, 0.015);

      const rect = container.getBoundingClientRect();
      const camera = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
      camera.position.z = 250;

      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(rect.width, rect.height);

      // 2. Build 3D Particle Sphere
      const particleCount = 1800;
      geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const originalRadii = new Float32Array(particleCount);

      // Distribute particles evenly on a sphere using spherical coordinates
      for (let i = 0; i < particleCount; i++) {
        const u = Math.random();
        const v = Math.random();
        const theta = u * 2.0 * Math.PI;
        const phi = Math.acos(2.0 * v - 1.0);

        const r = 80 + Math.random() * 15; // base radius
        originalRadii[i] = r;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      // Create custom particle texture with a clean radial gradient circle
      const createCircularTexture = () => {
        const canvasTex = document.createElement('canvas');
        canvasTex.width = 64;
        canvasTex.height = 64;
        const ctxTex = canvasTex.getContext('2d');
        if (ctxTex) {
          const grad = ctxTex.createRadialGradient(32, 32, 0, 32, 32, 32);
          grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
          grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctxTex.fillStyle = grad;
          ctxTex.fillRect(0, 0, 64, 64);
        }
        return new THREE.CanvasTexture(canvasTex);
      };

      material = new THREE.PointsMaterial({
        color: new THREE.Color(themeColor),
        size: 3.2,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        map: createCircularTexture()
      });

      const particleSystem = new THREE.Points(geometry, material);
      scene.add(particleSystem);

      // Add subtle ambient light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
      scene.add(ambientLight);

      // 3. Dynamic Resize Observer
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (renderer) renderer.setSize(width, height);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      });
      resizeObserver.observe(container);

      // 4. Animation Frame Render Loop
      const clock = new THREE.Clock();

      const animate = () => {
        if (!renderer) return;
        animationId = requestAnimationFrame(animate);

        try {
          const delta = clock.getDelta();
          const elapsedTime = clock.getElapsedTime();

          // Retrieve audio analysis
          const analyser = audioEngine.getAnalyser();
          let avgFreq = 0;
          let bassFreq = 0;
          let trebleFreq = 0;
          let frequencyData: Uint8Array | null = null;

          if (analyser) {
            const binCount = analyser.frequencyBinCount;
            const data = new Uint8Array(binCount) as any;
            analyser.getByteFrequencyData(data);
            frequencyData = data;

            // Compute selective frequency averages
            let sum = 0;
            for (let i = 0; i < binCount; i++) {
              sum += data[i];
              if (i < 12) bassFreq += data[i]; // Bass bands
              if (i > 150 && i < 250) trebleFreq += data[i]; // High-end brilliance
            }
            avgFreq = sum / binCount;
            bassFreq = bassFreq / 12;
            trebleFreq = trebleFreq / 100;
          }

          // Sync color dynamics with highs
          const currentThemeColor = new THREE.Color(themeColor);
          if (trebleFreq > 10 && material) {
            // Shift particle color slightly towards pure white/cyan on high transients
            material.color.lerp(new THREE.Color('#ffffff'), 0.15);
          } else if (material) {
            material.color.lerp(currentThemeColor, 0.1);
          }

          // Rotate particle cloud organically
          const rotationSpeed = 0.1 + (avgFreq / 255) * 0.9;
          particleSystem.rotation.y += rotationSpeed * delta;
          particleSystem.rotation.x += rotationSpeed * 0.4 * delta;

          // Pulse and displace particles dynamically based on frequency spectrum
          if (geometry) {
            const posAttr = geometry.attributes.position as THREE.BufferAttribute;
            const posArray = posAttr.array as Float32Array;

            const pulseFactor = 1.0 + (bassFreq / 255) * 0.38; // expand sphere on beat

            for (let i = 0; i < particleCount; i++) {
              // Base coordinate vector direction from center
              const x = posArray[i * 3];
              const y = posArray[i * 3 + 1];
              const z = posArray[i * 3 + 2];

              // Normalize direction vector
              const len = Math.sqrt(x*x + y*y + z*z) || 1;
              const dx = x / len;
              const dy = y / len;
              const dz = z / len;

              // Apply frequency index displacement
              let displacement = 0;
              if (frequencyData) {
                const freqIndex = Math.floor((i / particleCount) * frequencyData.length * 0.4);
                const freqVal = frequencyData[freqIndex] || 0;
                displacement = (freqVal / 255) * 28;
              } else {
                // Soft ambient sine displacement
                displacement = Math.sin(elapsedTime * 3 + i * 0.05) * 2.5;
              }

              // Compute target distance
              const targetRadius = (originalRadii[i] + displacement) * pulseFactor;

              // Apply smooth lerp to vertex position
              posArray[i * 3] += (dx * targetRadius - x) * 0.15;
              posArray[i * 3 + 1] += (dy * targetRadius - y) * 0.15;
              posArray[i * 3 + 2] += (dz * targetRadius - z) * 0.15;
            }

            posAttr.needsUpdate = true;
          }

          // Animate Camera distance/drift luxurious effect
          camera.position.x = Math.sin(elapsedTime * 0.15) * 60;
          camera.position.y = Math.cos(elapsedTime * 0.1) * 40;
          camera.lookAt(scene.position);

          renderer.render(scene, camera);
        } catch (err) {
          console.error('[Visualizer3D] Render frame failed:', err);
        }
      };

      animate();
    } catch (err) {
      console.error('[Visualizer3D] WebGL init failed, falling back:', err);
    }

    // 5. Cleanup
    return () => {
      if (resizeObserver) {
        try { resizeObserver.disconnect(); } catch {}
      }
      if (animationId) cancelAnimationFrame(animationId);
      try { geometry?.dispose(); } catch {}
      try { material?.dispose(); } catch {}
      try { renderer?.dispose(); } catch {}
    };
  }, [themeColor]);

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden rounded-xl bg-slate-950/60 border border-white/5">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block pointer-events-none" />
    </div>
  );
}
export default Visualizer3D;
