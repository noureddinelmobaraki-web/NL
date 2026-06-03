// src/components/MusicMood/MoodParticles.tsx
// AUDIO-REACTIVE 3D COSMIC & OCEANIC ENGINE v2026.2 — Production
// شبكة فضاء ملاحية ثلاثية الأبعاد + دوران كامل حول المحاور + ثقب أسود وصدمات دقات Bass

import { useEffect, useRef, memo, RefObject } from 'react';

interface MoodParticlesProps {
  glowIntensity?: number;
  audioRef?: RefObject<HTMLAudioElement | null>;
}

export const MoodParticles = memo(({ glowIntensity = 0, audioRef }: MoodParticlesProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const glowIntensityRef = useRef(glowIntensity);

  useEffect(() => {
    glowIntensityRef.current = glowIntensity;
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
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let sceneState = 0;
    let SEPARATION = 13; 
    let AMOUNTX = 155;   
    let AMOUNTY = 155;    
    let particles: Array<{
      x: number; z: number; y: number;
      dist: number; isResetAfterIntro: boolean;
      speedFactor: number; angleId: number;
      dist0068: number; dist04: number;
      hueOffset: number; lightnessOffset: number;
      originalX: number; originalZ: number;
    }> = [];
    let count = 0;
    let timeline = 0;

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

      if (window.innerWidth < 768) {
        SEPARATION = 11; AMOUNTX = 100; AMOUNTY = 100;
      } else {
        SEPARATION = 13; AMOUNTX = 155; AMOUNTY = 155;
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

    const draw = () => {
      if (document.hidden) {
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

      // ─── Optimize: Pull frequency data ONCE per frame ───
      let freqDataArray: Uint8Array | null = null;
      if (analyser && isPlaying && sceneState === 2) {
        freqDataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freqDataArray);

        let sum = 0, bassSum = 0, trebleSum = 0, trebleCount = 0;
        for (let i = 0; i < freqDataArray.length; i++) {
          sum += freqDataArray[i];
          if (i < 12) bassSum += freqDataArray[i];
          if (i > 40 && i < 180) { 
            trebleSum += freqDataArray[i]; 
            trebleCount++; 
          }
        }
        audioIntensity = sum / freqDataArray.length;
        // Focus purely on heavy kick drums/lowest sub-bass frequencies
        const bassVal = (freqDataArray[0] + freqDataArray[1] + freqDataArray[2] + freqDataArray[3]) / 4;
        bassIntensity = bassVal;
        trebleIntensity = trebleSum / (trebleCount || 1);
      } else {
        audioIntensity = audioIntensity * 0.85; 
        bassIntensity = bassIntensity * 0.85; 
        trebleIntensity = trebleIntensity * 0.85;
      }

      let elapsedTimeInScene2 = 0;
      if (sceneState === 2) {
        if (scene2StartTime === 0) scene2StartTime = Date.now();
        elapsedTimeInScene2 = (Date.now() - scene2StartTime) / 1000;
      }

      // --- Scene Management ---
      const overlayElement = document.getElementById('music-mood-immersive-overlay');

      if (sceneState === 0) {
        currentBgColor = '#000000';
        rotationY += 0.001;
        whiteHoleRadius = 40 + Math.sin(Date.now() * 0.002) * 2;
        if (overlayElement && !overlayElement.classList.contains('scene-dark')) {
          overlayElement.classList.add('scene-dark');
        }
      }
      else if (sceneState === 1) {
        transitionProgress += 0.015;
        cameraDistance = 1100 - (1095 * Math.pow(transitionProgress, 3));
        rotationY += 0.008 + transitionProgress * 0.06;
        rotationX += (0.0 - rotationX) * 0.05;
        whiteHoleRadius = 40 + Math.pow(transitionProgress, 4) * 800;

        if (overlayElement && !overlayElement.classList.contains('scene-dark')) {
          overlayElement.classList.add('scene-dark');
        }

        if (transitionProgress >= 1.0) {
          sceneState = 2;
          currentBgColor = '#ffffff';
          cameraDistance = 10;
          timeline = 0;
          scene2StartTime = Date.now();
          if (overlayElement) overlayElement.classList.remove('scene-dark');
        }
      }
      else if (sceneState === 2) {
        currentBgColor = '#ffffff';
        if (overlayElement && overlayElement.classList.contains('scene-dark')) {
          overlayElement.classList.remove('scene-dark');
        }

        const timelineInc = isPlaying ? 0.010 : 0.003;
        timeline += timelineInc; // slower when paused to keep visualizer calm
        let loopPeriod = (Date.now() / 15000) * Math.PI * 2;
        let zoomFactor = (Math.sin(loopPeriod) + 1) * 0.5;

        let minPossibleDist = isMobile ? -35 : -55; 
        let maxPossibleDist = isMobile ? 480 : 650;
        
        let currentTargetDist = maxPossibleDist - (zoomFactor * (maxPossibleDist - minPossibleDist));
        cameraDistance += (currentTargetDist - cameraDistance) * 0.04;

        let randomTrackX = Math.sin(timeline * 0.4) * 0.6 + Math.cos(timeline * 0.15) * 0.2;
        let randomTrackY = timeline * 0.4;
        let randomTrackZ = Math.cos(timeline * 0.3) * 0.35 + Math.sin(timeline * 0.1) * 0.15;

        let spiralBoost = Math.pow(zoomFactor, 4); 
        
        rotationX = randomTrackX + (spiralBoost * 1.5); 
        rotationY = randomTrackY + (spiralBoost * 4.5) + (bassIntensity * 0.00005);
        rotationZ = randomTrackZ + (spiralBoost * 2.0);
      }

      // Precalculate 3D constants to avoid calling Math trig inside particle loops
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

      // --- 🕳️ Central Hole Rendering ---
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
          let frequencyIndex = Math.floor(20 + (i % 60));
          
          let rawFreq = 0;
          if (isPlaying && freqDataArray) {
            rawFreq = freqDataArray[frequencyIndex % freqDataArray.length] || 0;
          } else {
            // Calm breathing pattern when paused so it stays beautiful and still
            rawFreq = Math.abs(Math.sin(Date.now() * 0.001 + i)) * 6;
          }

          // Spikes react aggressively to the song
          let spikeDynamic = rawFreq * (rawFreq / 255) * (isMobile ? 0.8 : 1.2);
          let spikeLength = (isMobile ? 10 : 16) + spikeDynamic + (isPlaying ? (trebleIntensity * 0.5) : 0);
          let startX = Math.cos(angle) * baseHoleRadius;
          let startZ = Math.sin(angle) * baseHoleRadius;
          let startY = isPlaying ? Math.sin(timeline * 6 + i) * 2 : Math.sin(Date.now() * 0.0005 + i) * 0.4;

          let endX = Math.cos(angle) * (baseHoleRadius + spikeLength);
          let endZ = Math.sin(angle) * (baseHoleRadius + spikeLength);
          let endY = startY + (Math.cos(angle * 2) * 3);

          let pStart = project3D(startX, startY, startZ);
          let pEnd = project3D(endX, endY, endZ);

          ctx.beginPath();
          ctx.moveTo(pStart.x, pStart.y);
          ctx.lineTo(pEnd.x, pEnd.y);
          ctx.lineWidth = Math.max(1.0, (isMobile ? 1.6 : 2.5) * pEnd.scale);
          ctx.stroke();
        }
      }

      // --- 🌊 Space Grid & Moving Particles Rendering ---
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
          particle.y = Math.sin((particle.originalX + count) * 0.4) * 3 + Math.cos((particle.originalZ + count) * 0.4) * 3;
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

          // React strictly to heavy beats (bass/drum kits)
          let bassThreshold = 100;
          if (isPlaying && freqDataArray && bassIntensity > bassThreshold) {
            let sampleIdx = Math.floor(particle.dist04) % 30;
            let rawFreqVal = freqDataArray[sampleIdx % freqDataArray.length] || 0;
            let audioFactor = rawFreqVal / 255;
            let beatPower = Math.pow((bassIntensity - bassThreshold) / (255 - bassThreshold), 1.8); // sharper exponential curve for heavy beats
            audioWave = Math.sin(particle.dist0068 - count12) * (beatPower * 110) * audioFactor; 
          }
          
          if (isPlaying) {
            // Blend natural background wave with heavy beat-driven waves
            particle.y = (naturalWave * 0.25) + audioWave;
          } else {
            // Smoothly settle the grid waves to a gentle, serene breathing pattern
            particle.y = naturalWave * 0.15;
          }
        }

        // Inline 3D Projection for extreme performance
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
          radius = Math.max(0.8, 1.6 * scale);
        } else {
          let waveFreq = particle.dist0068 - count;
          let radiusWave = (Math.sin(waveFreq) + 1) * 0.5;
          radius = Math.max(0.55, radiusWave * scale * (sizeFactor + bassSizeInc));
        }

        let dx = px - windowHalfX;
        let dy = py - windowHalfY;
        let screenDist = Math.sqrt(dx * dx + dy * dy);
        
        let edgeFade = Math.max(0, 1 - (screenDist / maxRadiusFromCenter));
        edgeFade = Math.pow(edgeFade, 2.5); 
        let alpha = Math.min(1, scale * alphaScaleFactor) * edgeFade;

        if (alpha > 0.01) { 
          // Rendering Optimizations: Use fillRect for small radius points, use hardware globalAlpha Instead of rgba formats
          if (sceneState < 2) {
            ctx.fillStyle = '#ffffff';
            ctx.globalAlpha = alpha;
            if (radius <= 2.0) ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
            else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
          } 
          else if (colorTransitionProgress > 0) {
            let hue = Math.floor(particle.hueOffset + count15) % 360;
            let l = Math.floor(particle.lightnessOffset);
            let coloredStyle = `hsl(${hue}, 45%, ${l}%)`;
            
            if (colorTransitionProgress >= 1) {
              ctx.fillStyle = coloredStyle;
              ctx.globalAlpha = alpha * 0.95;
              if (radius <= 2.0) ctx.fillRect(px - radius, py - radius, radius * 2, radius * 2);
              else { ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill(); }
            } else {
              // Fade from black to colored
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
      
      const countInc = isPlaying ? (0.007 + (bassIntensity * 0.00015)) : 0.0015;
      count += countInc;
      animRef.current = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener('resize', resize);
    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
      if (audio) {
        audio.removeEventListener('play', handlePlaybackStarted);
        audio.removeEventListener('playing', handlePlaybackStarted);
      }
      let overlayElement = document.getElementById('music-mood-immersive-overlay');
      if (overlayElement) {
        overlayElement.classList.remove('scene-dark');
      }
    };
  }, [audioRef]);

  return (
    <canvas
      ref={canvasRef}
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
