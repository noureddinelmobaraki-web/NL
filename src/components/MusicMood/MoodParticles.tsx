// src/components/MusicMood/MoodParticles.tsx
// AUDIO-REACTIVE 3D COSMIC & OCEANIC ENGINE v2026.2 — Production
// شبكة فضاء ملاحية ثلاثية الأبعاد + دوران كامل حول المحاور + ثقب أسود وصدمات دقات Bass

import { useEffect, useRef, memo, RefObject } from 'react';

interface MoodParticlesProps {
  glowIntensity?: number;
  audioRef?: RefObject<HTMLAudioElement | null>;
}

export const MoodParticles = memo(({ glowIntensity = 0, audioRef }: MoodParticlesProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const glowIntensityRef = useRef(glowIntensity);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    glowIntensityRef.current = glowIntensity;
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'glow',
        data: { value: glowIntensity }
      });
    }
  }, [glowIntensity]);

  useEffect(() => {
    const styleId = 'mood-cosmos-styles';
    let styleEl = document.getElementById(styleId);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        #music-mood-immersive-overlay.scene-dark {
          background-color: #000000 !important;
          transition: background-color 0.8s ease;
        }
        #music-mood-immersive-overlay.scene-dark p,
        #music-mood-immersive-overlay.scene-dark div:not(#dice-btn):not(.particles-container),
        #music-mood-immersive-overlay.scene-dark span {
          color: rgba(255, 255, 255, 0.85) !important;
          text-shadow: 0 1px 8px rgba(255, 255, 255, 0.1) !important;
        }
        #music-mood-immersive-overlay.scene-dark button {
          color: rgba(255, 255, 255, 0.7) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          background: rgba(0, 0, 0, 0.5) !important;
        }
        #music-mood-immersive-overlay.scene-dark button svg {
          stroke: rgba(255, 255, 255, 0.8) !important;
        }
        #music-mood-immersive-overlay.scene-dark svg polygon {
          fill: rgba(255, 255, 255, 0.8) !important;
        }
      `;
      document.head.appendChild(styleEl);
    }
    return () => {
      document.getElementById(styleId)?.remove();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '1';
    container.appendChild(canvas);

    // Check if OffscreenCanvas is supported
    const hasOffscreen = typeof OffscreenCanvas !== 'undefined' && canvas.transferControlToOffscreen;

    if (hasOffscreen) {
      const offscreen = canvas.transferControlToOffscreen();
      const worker = new Worker(
        new URL('./particles.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      // Send initial configurations and transfer control of OffscreenCanvas to the worker
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      worker.postMessage({
        type: 'init',
        data: {
          canvas: offscreen,
          width: window.innerWidth,
          height: window.innerHeight,
          dpr: dpr,
          prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
          cores: navigator.hardwareConcurrency || 4,
          memGb: navigator.deviceMemory ?? 4,
        }
      }, [offscreen]); // transfers ownership with zero copy cost

      // Listen to sceneState updates from worker to update main thread DOM classes
      worker.onmessage = (e) => {
        const { type, value } = e.data;
        if (type === 'sceneState') {
          const cachedOverlayElement = document.getElementById('music-mood-immersive-overlay');
          if (cachedOverlayElement) {
            if (value === 0 || value === 1) {
              if (!cachedOverlayElement.classList.contains('scene-dark')) {
                cachedOverlayElement.classList.add('scene-dark');
              }
            } else {
              cachedOverlayElement.classList.remove('scene-dark');
            }
          }
        }
      };

      let mainAnimId = 0;
      let cachedFreqData: Uint8Array | null = null;
      const isVisibleRef = { current: true };
      
      const io = new IntersectionObserver(
        (entries) => {
          isVisibleRef.current = entries[0].isIntersecting;
        },
        { threshold: 0.01 }
      );
      io.observe(canvas);

      // Web Audio Analyser query frequency tick
      const tick = () => {
        if (isVisibleRef.current && !document.hidden) {
          const audioEl = audioRef?.current;
          const analyser = audioEl ? (audioEl as any).__analyser : null;
          const isPlaying = !!(audioEl && !audioEl.paused && !audioEl.ended);
          
          let freqDataArray: Uint8Array | null = null;
          let bands: { subBass: number; bass: number; lowMid: number; mid: number; treble: number; level: number } | null = null;
          if (analyser && isPlaying) {
            const binCount = analyser.frequencyBinCount;
            if (!cachedFreqData || cachedFreqData.length !== binCount) {
              cachedFreqData = new Uint8Array(binCount);
            }
            analyser.getByteFrequencyData(cachedFreqData);
            freqDataArray = cachedFreqData;

            // حساب النطاقات بلا allocation داخل الحلقة
            let sb = 0, bs = 0, lm = 0, md = 0, tr = 0, tot = 0;
            const n = cachedFreqData.length;
            for (let i = 0; i < n; i++) {
              const v = cachedFreqData[i];
              tot += v;
              if (i < 8) sb += v;
              else if (i < 30) bs += v;
              else if (i < 80) lm += v;
              else if (i < 200) md += v;
              else if (i < 500) tr += v;
            }
            bands = {
              subBass: sb / 8 / 255,
              bass: bs / 22 / 255,
              lowMid: lm / 50 / 255,
              mid: md / 120 / 255,
              treble: tr / Math.min(300, Math.max(1, n - 200)) / 255,
              level: tot / n / 255,
            };
          }

          worker.postMessage({
            type: 'audioFrame',
            data: {
              isPlaying,
              freqDataArray,
              bands,
            }
          });
        }
        mainAnimId = requestAnimationFrame(tick);
      };
      
      tick();

      const resizeObserver = new ResizeObserver(() => {
        const dprVal = Math.min(window.devicePixelRatio || 1, 2);
        worker.postMessage({
          type: 'resize',
          data: {
            width: window.innerWidth,
            height: window.innerHeight,
            dpr: dprVal,
            prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            cores: navigator.hardwareConcurrency || 4,
            memGb: navigator.deviceMemory ?? 4,
          }
        });
      });
      resizeObserver.observe(canvas);

      const handlePlaybackStarted = () => {};
      const audio = audioRef?.current;
      if (audio) {
        audio.addEventListener('play', handlePlaybackStarted);
        audio.addEventListener('playing', handlePlaybackStarted);
      }

      return () => {
        io.disconnect();
        cancelAnimationFrame(mainAnimId);
        resizeObserver.disconnect();
        worker.postMessage({ type: 'destroy' });
        worker.terminate();
        workerRef.current = null;
        if (audio) {
          audio.removeEventListener('play', handlePlaybackStarted);
          audio.removeEventListener('playing', handlePlaybackStarted);
        }
        const cachedOverlayElement = document.getElementById('music-mood-immersive-overlay');
        if (cachedOverlayElement) {
          cachedOverlayElement.classList.remove('scene-dark');
        }
        try {
          if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
        } catch {}
      };
    }

    // FALLBACK: Draw loop in main thread
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let sceneState = 0;
    let SEPARATION = 13; 
    let AMOUNTX = 155;   
    let AMOUNTY = 155;    
    let prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let particles: Array<{
      x: number; z: number; y: number;
      dist: number; isResetAfterIntro: boolean;
      speedFactor: number; angleId: number;
      dist0068: number; dist04: number;
      hueOffset: number; lightnessOffset: number;
      originalX: number; originalZ: number;
    }> = [];
    let count = 0;
    const cachedOverlayElement = document.getElementById('music-mood-immersive-overlay');
    let cachedFreqDataArray: Uint8Array | null = null;
    let timeline = 0;

    let fpsSamples: number[] = [];
    let lastFpsCheck = performance.now();
    let qualityTier = 1;

    let bassEMA = 0;          
    let bassPeakEMA = 0;      
    let beatPulse = 0;        
    const EMA_ALPHA_FAST = 0.18;  
    const EMA_ALPHA_SLOW = 0.008; 
    let lastBeatTime = 0;
    let beatCount = 0;

    const applyQuality = () => {
      if (qualityTier === 0)      { SEPARATION = 16; AMOUNTX = 50; AMOUNTY = 50; }
      else if (qualityTier === 1) { SEPARATION = 14; AMOUNTX = 70; AMOUNTY = 70; }
      else                        { SEPARATION = 12; AMOUNTX = 90; AMOUNTY = 90; }
      particles.length = 0;
      initParticles();
    };

    let rotationX = 0.52;
    let rotationY = 0;
    let rotationZ = 0; 
    let cameraDistance = 1100;
    let transitionProgress = 0;
    let whiteHoleRadius = 40;
    let currentBgColor = '#000000';

    let scene2StartTime = 0;
    let audioIntensity = 0;
    let bassIntensity = 0;   
    let trebleIntensity = 0;

    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      windowHalfX = window.innerWidth / 2;
      windowHalfY = window.innerHeight / 2;

      if (prefersReducedMotion) {
        SEPARATION = 22; AMOUNTX = 40; AMOUNTY = 40;
      } else {
        const cores = navigator.hardwareConcurrency || 4;
        const dprVal = Math.min(window.devicePixelRatio || 1, 2);
        const memGb = navigator.deviceMemory ?? 4;
        
        if (window.innerWidth < 768) {
          if (cores <= 4 || memGb <= 2) {
            SEPARATION = 14; AMOUNTX = 60; AMOUNTY = 60;
          } else {
            SEPARATION = 12; AMOUNTX = 90; AMOUNTY = 90;
          }
        } else {
          if (cores >= 8 && memGb >= 8) {
            SEPARATION = 13; AMOUNTX = 155; AMOUNTY = 155;
          } else if (cores >= 4) {
            SEPARATION = 14; AMOUNTX = 120; AMOUNTY = 120;
          } else {
            SEPARATION = 16; AMOUNTX = 80; AMOUNTY = 80;
          }
        }
        if (dprVal >= 2 && AMOUNTX > 100) {
          AMOUNTX = Math.floor(AMOUNTX * 0.85);
          AMOUNTY = Math.floor(AMOUNTY * 0.85);
        }
      }
      initParticles();
    };

    const initParticles = () => {
      particles = [];
      const isMobile = window.innerWidth < 768;
      let safeZone = isMobile ? 40 : 65;
      const offsetX = (AMOUNTX * SEPARATION) / 2;
      const offsetZ = (AMOUNTY * SEPARATION) / 2;

      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          let posX = ix * SEPARATION - offsetX;
          let posZ = iy * SEPARATION - offsetZ;
          let distanceFromCenter = Math.sqrt(posX * posX + posZ * posZ);

          if (distanceFromCenter < safeZone) continue;

          let angleId = Math.atan2(posZ, posX);
          particles.push({
            x: posX,
            z: posZ,
            y: (Math.random() - 0.5) * 20,
            dist: distanceFromCenter,
            isResetAfterIntro: false,
            speedFactor: 0.7 + Math.random() * 2.2,
            angleId: angleId,
            dist0068: distanceFromCenter * 0.068,
            dist04: distanceFromCenter * 0.04,
            hueOffset: (angleId * 180 / Math.PI) + (distanceFromCenter * 0.2),
            lightnessOffset: 14 + Math.sin(distanceFromCenter * 0.05) * 6,
            originalX: posX,
            originalZ: posZ
          });
        }
      }
    };

    const handlePlaybackStarted = () => {
      if (sceneState === 0) {
        sceneState = 1;
        transitionProgress = 0;
        scene2StartTime = 0;
      }
    };

    const audio = audioRef?.current;
    if (audio) {
      if (!audio.paused && sceneState === 0) {
        sceneState = 1;
        transitionProgress = 0;
      }
      audio.addEventListener('play', handlePlaybackStarted);
      audio.addEventListener('playing', handlePlaybackStarted);
    }

    const isVisibleRefFallback = { current: true };
    const ioDraw = new IntersectionObserver(
      (entries) => {
        isVisibleRefFallback.current = entries[0].isIntersecting;
      },
      { threshold: 0.01 }
    );
    ioDraw.observe(canvas);

    const draw = () => {
      const now = performance.now();
      fpsSamples.push(now);
      if (fpsSamples.length > 60) fpsSamples.shift();
      if (now - lastFpsCheck > 2000 && fpsSamples.length >= 30) {
        const avgFrameTime = (fpsSamples[fpsSamples.length-1] - fpsSamples[0]) / (fpsSamples.length-1);
        const fps = 1000 / avgFrameTime;
        if (fps < 30 && qualityTier > 0) { qualityTier--; applyQuality(); }
        else if (fps > 55 && qualityTier < 2) { qualityTier++; applyQuality(); }
        lastFpsCheck = now;
      }

      if (document.hidden || !isVisibleRefFallback.current) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const canvasW = window.innerWidth;
      const canvasH = window.innerHeight;
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = currentBgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);

      const isMobile = canvasW < 768;
      const audioEl = audioRef?.current;
      const analyser = audioEl ? (audioEl as any).__analyser : null;
      const isPlaying = !!(audioEl && !audioEl.paused && !audioEl.ended);

      let freqDataArray: Uint8Array | null = null;
      if (analyser && isPlaying && sceneState >= 1) {
        const binCount = analyser.frequencyBinCount;
        if (!cachedFreqDataArray || cachedFreqDataArray.length !== binCount) {
          cachedFreqDataArray = new Uint8Array(binCount);
        }
        freqDataArray = cachedFreqDataArray;
        analyser.getByteFrequencyData(freqDataArray);

        let subBassSum = 0, bassSum = 0, midSum = 0, highSum = 0;
        let totalSum = 0;
        const len = freqDataArray.length;

        for (let i = 0; i < len; i++) {
          const v = freqDataArray[i];
          totalSum += v;
          if (i < 8)        subBassSum += v;
          else if (i < 30)  bassSum += v;
          else if (i < 120) midSum += v;
          else if (i < 400) highSum += v;
        }

        audioIntensity = totalSum / len;
        const subBassAvg = subBassSum / 8;
        const bassAvg = bassSum / 22;
        bassIntensity = subBassAvg * 0.75 + bassAvg * 0.25;
        const midAvg = midSum / 90;
        trebleIntensity = highSum / 280;

        bassEMA = bassEMA * (1 - EMA_ALPHA_SLOW) + bassIntensity * EMA_ALPHA_SLOW;
        if (bassIntensity > bassPeakEMA) {
          bassPeakEMA = bassPeakEMA * (1 - EMA_ALPHA_FAST) + bassIntensity * EMA_ALPHA_FAST;
        } else {
          bassPeakEMA *= 0.985;
        }

        const refractoryMs = 180;
        const adaptiveThreshold = Math.max(20, bassEMA * 1.35);
        if (bassIntensity > adaptiveThreshold && (now - lastBeatTime) > refractoryMs) {
          lastBeatTime = now;
          beatCount++;
          beatPulse = 1.0;
        } else {
          beatPulse *= 0.88;
        }

        void midAvg;
      } else {
        audioIntensity *= 0.85;
        bassIntensity *= 0.85;
        trebleIntensity *= 0.85;
        bassEMA *= 0.95;
        bassPeakEMA *= 0.95;
        beatPulse *= 0.88;
      }

      let elapsedTimeInScene2 = 0;
      if (sceneState === 2) {
        if (scene2StartTime === 0) scene2StartTime = Date.now();
        elapsedTimeInScene2 = (Date.now() - scene2StartTime) / 1000;
      }

      if (sceneState === 0) {
        currentBgColor = '#000000';
        if (!prefersReducedMotion) {
          rotationY += 0.001;
        }
        whiteHoleRadius = 40 + Math.sin(Date.now() * 0.002) * 2;
        if (cachedOverlayElement && !cachedOverlayElement.classList.contains('scene-dark')) {
          cachedOverlayElement.classList.add('scene-dark');
        }
      }
      else if (sceneState === 1) {
        transitionProgress += 0.015;
        cameraDistance = 1100 - (1095 * Math.pow(transitionProgress, 3));
        if (!prefersReducedMotion) {
          rotationY += 0.008 + transitionProgress * 0.06;
          rotationX += (0.0 - rotationX) * 0.05;
        } else {
          rotationX = 0.52;
          rotationY = 0;
          rotationZ = 0;
        }
        whiteHoleRadius = 40 + Math.pow(transitionProgress, 4) * 800;

        if (cachedOverlayElement && !cachedOverlayElement.classList.contains('scene-dark')) {
          cachedOverlayElement.classList.add('scene-dark');
        }

        if (transitionProgress >= 1.0) {
          sceneState = 2;
          currentBgColor = '#ffffff';
          cameraDistance = 10;
          timeline = 0;
          scene2StartTime = Date.now();
          if (cachedOverlayElement) cachedOverlayElement.classList.remove('scene-dark');
        }
      }
      else if (sceneState === 2) {
        currentBgColor = '#ffffff';
        if (cachedOverlayElement && cachedOverlayElement.classList.contains('scene-dark')) {
          cachedOverlayElement.classList.remove('scene-dark');
        }

        const timelineInc = isPlaying ? 0.010 : 0.003;
        if (!prefersReducedMotion) {
          timeline += timelineInc;
        }
        let loopPeriod = (Date.now() / 15000) * Math.PI * 2;
        let zoomFactor = (Math.sin(loopPeriod) + 1) * 0.5;

        let minPossibleDist = isMobile ? -35 : -55; 
        let maxPossibleDist = isMobile ? 480 : 650;
        
        let currentTargetDist = maxPossibleDist - (zoomFactor * (maxPossibleDist - minPossibleDist));
        if (!prefersReducedMotion) {
          cameraDistance += (currentTargetDist - cameraDistance) * 0.04;
        }

        let randomTrackX = Math.sin(timeline * 0.4) * 0.6 + Math.cos(timeline * 0.15) * 0.2;
        let randomTrackY = timeline * 0.4;
        let randomTrackZ = Math.cos(timeline * 0.3) * 0.35 + Math.sin(timeline * 0.1) * 0.15;

        let spiralBoost = Math.pow(zoomFactor, 4); 
        
        if (!prefersReducedMotion) {
          rotationX = randomTrackX + (spiralBoost * 1.5); 
          rotationY = randomTrackY + (spiralBoost * 4.5) + (bassIntensity * 0.00005);
          rotationZ = randomTrackZ + (spiralBoost * 2.0);
        } else {
          cameraDistance = 10;
          rotationX = 0.52;
          rotationY = 0;
          rotationZ = 0;
        }
      }

      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);
      const cosZ = Math.cos(rotationZ);
      const sinZ = Math.sin(rotationZ);
      const fov = 550;

      const project3D = (x: number, y: number, z: number) => {
        let x1 = x * cosY - z * sinY;
        let z1 = z * cosY + x * sinY;
        let y1 = y * cosX - z1 * sinX;
        let z2 = z1 * cosX + y * sinX;
        let x3 = x1 * cosZ - y1 * sinZ;
        let y3 = y1 * cosZ + x1 * sinZ;
        let scale = fov / (fov + z2 + cameraDistance);
        return { x: x3 * scale + windowHalfX, y: y3 * scale + windowHalfY, scale: scale };
      };

      let centerNode = project3D(0, 0, 0);
      if (centerNode.scale > 0 && sceneState < 2) {
        ctx.shadowBlur = 30;
        ctx.shadowColor = "#ffffff";
        ctx.beginPath();
        ctx.arc(centerNode.x, centerNode.y, Math.max(0, whiteHoleRadius * centerNode.scale), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      else if (centerNode.scale > 0 && sceneState === 2) {
        let responsiveHoleSize = isMobile ? 16 : 24;
        let baseHoleRadius = responsiveHoleSize + (audioIntensity * 0.4);

        ctx.shadowBlur = 35 + (bassIntensity * 0.6);
        ctx.shadowColor = "rgba(0, 0, 0, 0.95)";
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(centerNode.x, centerNode.y, Math.max(0, baseHoleRadius * centerNode.scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        const totalSpikes = isMobile ? 44 : 76;
        ctx.strokeStyle = '#000000';
        ctx.lineCap = 'round';
        for (let i = 0; i < totalSpikes; i++) {
          let angle = (i / totalSpikes) * Math.PI * 2;

          let frequencyIndex: number;
          if (i < totalSpikes * 0.3) {
            frequencyIndex = 2 + Math.floor((i / (totalSpikes * 0.3)) * 23);
          } else if (i < totalSpikes * 0.7) {
            frequencyIndex = 30 + Math.floor(((i - totalSpikes * 0.3) / (totalSpikes * 0.4)) * 90);
          } else {
            frequencyIndex = 130 + Math.floor(((i - totalSpikes * 0.7) / (totalSpikes * 0.3)) * 250);
          }

          let rawFreq = 0;
          if (isPlaying && freqDataArray) {
            rawFreq = freqDataArray[frequencyIndex % freqDataArray.length] || 0;
            if (i < totalSpikes * 0.3) {
              rawFreq = Math.min(255, rawFreq + beatPulse * 60);
            }
          } else {
            rawFreq = Math.abs(Math.sin(Date.now() * 0.001 + i)) * 6;
          }

          let spikeDynamic = rawFreq * (rawFreq / 255) * (isMobile ? 0.9 : 1.4);
          let spikeLength = (isMobile ? 10 : 16) + spikeDynamic + (isPlaying ? (trebleIntensity * 0.4) : 0);
          let startX = Math.cos(angle) * baseHoleRadius;
          let startZ = Math.sin(angle) * baseHoleRadius;
          let startY = isPlaying ? Math.sin(timeline * 6 + i) * (2 + beatPulse * 3) : Math.sin(Date.now() * 0.0005 + i) * 0.4;

          let endX = Math.cos(angle) * (baseHoleRadius + spikeLength);
          let endZ = Math.sin(angle) * (baseHoleRadius + spikeLength);
          let endY = startY + (Math.cos(angle * 2) * 3);
          void endY;

          let pStart = project3D(startX, startY, startZ);
          let pEnd = project3D(endX, startY + (Math.cos(angle * 2) * 3), endZ);

          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.lineWidth = Math.max(1.0, (isMobile ? 1.6 : 2.5) * pEnd.scale * (1 + beatPulse * 0.3));
          ctx.stroke();
        }
      }

      let maxRadiusFromCenter = Math.min(windowHalfX, windowHalfY) * 1.5; 
      let colorTransitionProgress = 0;
      if (elapsedTimeInScene2 > 40) {
        colorTransitionProgress = Math.min(1, (elapsedTimeInScene2 - 40) / 8);
      }
      
      const count15 = count * 15;
      const count12 = count * 1.2;
      const sizeFactor = isMobile ? 0.8 : 1.1;
      const bassSizeInc = bassIntensity / 50;
      const alphaScaleFactor = isMobile ? 4.5 : 3.8;

      for (let i = 0; i < particles.length; i++) {
        let particle = particles[i];
        
        if (sceneState === 0) {
          let wave = Math.sin((particle.originalX + count) * 0.4) * 3 + Math.cos((particle.originalZ + count) * 0.4) * 3;
          particle.y = prefersReducedMotion ? wave * 0.3 : wave;
        }
        else if (sceneState === 1) {
          let speed = transitionProgress * transitionProgress * 18 * particle.speedFactor;
          particle.x += (0 - particle.x) * (speed * 0.001);
          particle.z += (0 - particle.z) * (speed * 0.001);
          particle.y += (0 - particle.y) * (speed * 0.001);
        }
        else if (sceneState === 2) {
          if (!particle.isResetAfterIntro) {
            particle.x = particle.originalX;
            particle.z = particle.originalZ;
            particle.isResetAfterIntro = true;
          }

          let waveFrequency = particle.dist0068 - count;
          let naturalWave = Math.sin(waveFrequency) * (isMobile ? 3 : 5);
          let audioWave = 0;

          if (isPlaying && freqDataArray) {
            const distRatio = Math.min(1, particle.dist / 400);
            const binFloor = Math.floor(distRatio * 80);
            const binRange = 8 + Math.floor(distRatio * 40);
            const binIdx = (binFloor + Math.floor(particle.dist04 * 0.7) % binRange) % freqDataArray.length;
            const rawFreqVal = freqDataArray[binIdx] || 0;
            const audioFactor = rawFreqVal / 255;

            const reactivePower = beatPulse * 0.7 + audioFactor * 0.5;
            audioWave = Math.sin(particle.dist0068 - count12) * reactivePower * (isMobile ? 70 : 95);

            if (distRatio > 0.6 && trebleIntensity > 30) {
              audioWave += Math.sin(timeline * 14 + particle.angleId * 3) * (trebleIntensity / 255) * 8;
            }
          }

          if (isPlaying) {
            const beatBoost = 1 + beatPulse * 0.4;
            particle.y = prefersReducedMotion
              ? ((naturalWave * 0.25) + audioWave) * 0.3
              : ((naturalWave * 0.25) + audioWave) * beatBoost;
          } else {
            particle.y = prefersReducedMotion
              ? (naturalWave * 0.15) * 0.3
              : naturalWave * 0.15;
          }
        }

        let x1 = particle.x * cosY - particle.z * sinY;
        let z1 = particle.z * cosY + particle.x * sinY;
        let y1 = particle.y * cosX - z1 * sinX;
        let z2 = z1 * cosX + particle.y * sinX;
        let x3 = x1 * cosZ - y1 * sinZ;
        let y3 = y1 * cosZ + x1 * sinZ;

        let scale = fov / (fov + z2 + cameraDistance);
        let px = x3 * scale + windowHalfX;
        let py = y3 * scale + windowHalfY;

        let radius;
        if (sceneState < 2) {
          radius = Math.max(0.8, (1.6 + beatPulse * 0.4) * scale);
        } else {
          let waveFreq = particle.dist0068 - count;
          let radiusWave = (Math.sin(waveFreq) + 1) * 0.5;
          const beatBoost = 1 + beatPulse * 0.5;
          const bassBoost = bassSizeInc * 1.5;
          radius = Math.max(0.55, radiusWave * scale * (sizeFactor + bassBoost) * beatBoost);
        }

        let dx = px - windowHalfX;
        let dy = py - windowHalfY;
        let screenDist = Math.sqrt(dx * dx + dy * dy);
        
        let edgeFade = Math.max(0, 1 - (screenDist / maxRadiusFromCenter));
        edgeFade = Math.pow(edgeFade, 2.5); 
        let alpha = Math.min(1, scale * alphaScaleFactor) * edgeFade;

        if (alpha > 0.01) { 
          if (sceneState < 2) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = alpha;
            if (radius <= 2.0) ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
            else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
          } 
          else if (colorTransitionProgress > 0) {
            let hue = Math.floor(particle.hueOffset + count15 + beatPulse * 40) % 360;
            const saturation = Math.floor(45 + beatPulse * 25); 
            const lightness = Math.floor(particle.lightnessOffset + beatPulse * 8); 
            const coloredStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

            if (colorTransitionProgress >= 1) {
              ctx.fillStyle = coloredStyle;
              ctx.globalAlpha = alpha * (0.92 + beatPulse * 0.08);
              if (radius <= 2.0) ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
              else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
            } else {
              ctx.fillStyle = '#000000';
              ctx.globalAlpha = alpha * 0.95 * (1 - colorTransitionProgress);
              if (radius <= 2.0) ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
              else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }

              ctx.fillStyle = coloredStyle;
              ctx.globalAlpha = alpha * 0.95 * colorTransitionProgress;
              if (radius <= 2.0) ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
              else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
            }
          } else {
            ctx.fillStyle = '#000000';
            ctx.globalAlpha = alpha * 0.95;
            if (radius <= 2.0) ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
            else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
          }
        }
      }
      
      const countInc = isPlaying
        ? (0.008 + bassIntensity * 0.00018 + beatPulse * 0.005)
        : 0.003;
      if (!prefersReducedMotion) {
        count += countInc;
      }
      animRef.current = requestAnimationFrame(draw);
    };

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => {
      prefersReducedMotion = mq.matches;
      resize();
    };
    mq.addEventListener('change', onChange);

    resize();
    const resizeObserver = new ResizeObserver(() => {
      resize();
    });
    resizeObserver.observe(canvas);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      ioDraw.disconnect();
      mq.removeEventListener('change', onChange);
      resizeObserver.disconnect();
      cancelAnimationFrame(animRef.current);
      if (audio) {
        audio.removeEventListener('play', handlePlaybackStarted);
        audio.removeEventListener('playing', handlePlaybackStarted);
      }
      if (cachedOverlayElement) {
        cachedOverlayElement.classList.remove('scene-dark');
      }
      try {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      } catch {}
    };
  }, [audioRef]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
});
