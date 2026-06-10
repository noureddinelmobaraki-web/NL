// particles.worker.ts — AUDIO-REACTIVE 3D COSMIC & OCEANIC ENGINE v2026.2 (Worker Thread)

interface Particle {
  x: number; z: number; y: number;
  dist: number; isResetAfterIntro: boolean;
  speedFactor: number; angleId: number;
  dist0068: number; dist04: number;
  hueOffset: number; lightnessOffset: number;
  originalX: number; originalZ: number;
}

let canvas: OffscreenCanvas | null = null;
let ctx: OffscreenCanvasRenderingContext2D | null = null;
let animId = 0;
let sceneState = 0;
let SEPARATION = 13;
let AMOUNTX = 155;
let AMOUNTY = 155;
let prefersReducedMotion = false;
let particles: Particle[] = [];
let count = 0;
let timeline = 0;

// === Adaptive Quality Loop ===
let fpsSamples: number[] = [];
let lastFpsCheck = performance.now();
let qualityTier = 1; // 0=low, 1=med, 2=high

// === Adaptive Beat Tracker ===
let bassEMA = 0;
let bassPeakEMA = 0;
let beatPulse = 0;
const EMA_ALPHA_FAST = 0.18;
const EMA_ALPHA_SLOW = 0.008;
let lastBeatTime = 0;
let beatCount = 0;

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

let windowW = 0;
let windowH = 0;
let windowHalfX = 0;
let windowHalfY = 0;
let maxRadiusFromCenter = 0;

let extSubBass = 0, extBass = 0, extTreble = 0, extLevel = 0;
let extBeatEma = 0, extLastBeat = 0, extBeatPulse = 0;
let extActive = false; // هل وصلت نطاقات خارجية هذا الإطار؟

// Inputs from main thread
let isPlaying = false;
let freqDataArray: Uint8Array | null = null;
let glowIntensity = 0;

const applyQuality = () => {
  if (qualityTier === 0)      { SEPARATION = 16; AMOUNTX = 50; AMOUNTY = 50; }
  else if (qualityTier === 1) { SEPARATION = 14; AMOUNTX = 70; AMOUNTY = 70; }
  else                        { SEPARATION = 12; AMOUNTX = 90; AMOUNTY = 90; }
  particles.length = 0;
  initParticles();
};

const initParticles = () => {
  particles = [];
  const isMobile = windowW < 768;
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

const resize = (width: number, height: number, dpr: number, prefersReducedMotionVal: boolean, cores: number, memGb: number) => {
  prefersReducedMotion = prefersReducedMotionVal;
  windowW = width;
  windowH = height;
  windowHalfX = width / 2;
  windowHalfY = height / 2;
  maxRadiusFromCenter = Math.min(windowHalfX, windowHalfY) * 1.5;

  if (canvas) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
  }
  if (ctx) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
  }

  if (prefersReducedMotion) {
    SEPARATION = 22; AMOUNTX = 40; AMOUNTY = 40;
  } else {
    const dprVal = dpr;
    if (width < 768) {
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

function draw() {
  if (!ctx || !canvas) return;

  const now = performance.now();
  fpsSamples.push(now);
  if (fpsSamples.length > 60) fpsSamples.shift();
  if (now - lastFpsCheck > 2000 && fpsSamples.length >= 30) {
    const avgFrameTime = (fpsSamples[fpsSamples.length - 1] - fpsSamples[0]) / (fpsSamples.length - 1);
    const fps = 1000 / avgFrameTime;
    if (fps < 30 && qualityTier > 0) { qualityTier--; applyQuality(); }
    else if (fps > 55 && qualityTier < 2) { qualityTier++; applyQuality(); }
    lastFpsCheck = now;
  }

  const canvasW = windowW;
  const canvasH = windowH;
  ctx.globalAlpha = 1.0;
  ctx.fillStyle = currentBgColor;
  ctx.fillRect(0, 0, canvasW, canvasH);

  const isMobile = canvasW < 768;

  if (freqDataArray && isPlaying && sceneState >= 1) {
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

    // Prioritize external bands if active
    const bassDrive = extActive ? extBass * 255 : bassIntensity;

    bassEMA = bassEMA * (1 - EMA_ALPHA_SLOW) + bassDrive * EMA_ALPHA_SLOW;
    if (bassDrive > bassPeakEMA) {
      bassPeakEMA = bassPeakEMA * (1 - EMA_ALPHA_FAST) + bassDrive * EMA_ALPHA_FAST;
    } else {
      bassPeakEMA *= 0.985;
    }

    const MuscatRefractoryMs = 180;
    const adaptiveThreshold = Math.max(20, bassEMA * 1.35);
    if (!extActive) {
      if (bassDrive > adaptiveThreshold && (now - lastBeatTime) > MuscatRefractoryMs) {
        lastBeatTime = now;
        beatCount++;
        beatPulse = 1.0;
      } else {
        beatPulse *= 0.88;
      }
    } else {
      beatPulse = extBeatPulse;
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

  // Final drives to use in the rest of the draw loop
  const currentAudioIntensity = extActive ? extLevel * 255 : audioIntensity;
  const currentBassIntensity = extActive ? extBass * 255 : bassIntensity;
  const currentTrebleIntensity = extActive ? extTreble * 255 : trebleIntensity;
  const currentBeatPulse = extActive ? extBeatPulse : beatPulse;

  let elapsedTimeInScene2 = 0;
  if (sceneState === 2) {
    if (scene2StartTime === 0) scene2StartTime = Date.now();
    elapsedTimeInScene2 = (Date.now() - scene2StartTime) / 1000;
  }

  let prevSceneState = sceneState;

  if (isPlaying && sceneState === 0) {
    sceneState = 1;
    transitionProgress = 0;
    scene2StartTime = 0;
  }

  if (sceneState === 0) {
    currentBgColor = '#000000';
    if (!prefersReducedMotion) {
      rotationY += 0.001;
    }
    whiteHoleRadius = 40 + Math.sin(Date.now() * 0.002) * 2;
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

    if (transitionProgress >= 1.0) {
      sceneState = 2;
      currentBgColor = '#ffffff';
      cameraDistance = 10;
      timeline = 0;
      scene2StartTime = Date.now();
    }
  }
  else if (sceneState === 2) {
    currentBgColor = '#ffffff';

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
      rotationY = randomTrackY + (spiralBoost * 4.5) + (currentBassIntensity * 0.00005);
      rotationZ = randomTrackZ + (spiralBoost * 2.0);
    } else {
      cameraDistance = 10;
      rotationX = 0.52;
      rotationY = 0;
      rotationZ = 0;
    }
  }

  if (sceneState !== prevSceneState) {
    self.postMessage({ type: 'sceneState', value: sceneState });
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

  // --- Central Hole ---
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
    let baseHoleRadius = responsiveHoleSize + (currentAudioIntensity * 0.4);

    ctx.shadowBlur = 35 + (currentBassIntensity * 0.6);
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
          rawFreq = Math.min(255, rawFreq + currentBeatPulse * 60);
        }
      } else {
        rawFreq = Math.abs(Math.sin(Date.now() * 0.001 + i)) * 6;
      }

      let spikeDynamic = rawFreq * (rawFreq / 255) * (isMobile ? 0.9 : 1.4);
      let spikeLength = (isMobile ? 10 : 16) + spikeDynamic + (isPlaying ? (currentTrebleIntensity * 0.4) : 0);
      let startX = Math.cos(angle) * baseHoleRadius;
      let startZ = Math.sin(angle) * baseHoleRadius;
      let startY = isPlaying ? Math.sin(timeline * 6 + i) * (2 + currentBeatPulse * 3) : Math.sin(Date.now() * 0.0005 + i) * 0.4;

      let endX = Math.cos(angle) * (baseHoleRadius + spikeLength);
      let endZ = Math.sin(angle) * (baseHoleRadius + spikeLength);
      let endY = startY + (Math.cos(angle * 2) * 3);
      void endY;

      let pStart = project3D(startX, startY, startZ);
      let pEnd = project3D(endX, startY + (Math.cos(angle * 2) * 3), endZ);

      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      ctx.lineWidth = Math.max(1.0, (isMobile ? 1.6 : 2.5) * pEnd.scale * (1 + currentBeatPulse * 0.3));
      ctx.stroke();
    }
  }

  // --- Particles Rendering ---
  maxRadiusFromCenter = Math.min(windowHalfX, windowHalfY) * 1.5;
  let colorTransitionProgress = 0;
  if (elapsedTimeInScene2 > 40) {
    colorTransitionProgress = Math.min(1, (elapsedTimeInScene2 - 40) / 8);
  }

  const count15 = count * 15;
  const count12 = count * 1.2;
  const sizeFactor = isMobile ? 0.8 : 1.1;
  const bassSizeInc = currentBassIntensity / 50;
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

        const reactivePower = currentBeatPulse * 0.7 + audioFactor * 0.5;
        audioWave = Math.sin(particle.dist0068 - count12) * reactivePower * (isMobile ? 70 : 95);

        if (distRatio > 0.6 && currentTrebleIntensity > 30) {
          audioWave += Math.sin(timeline * 14 + particle.angleId * 3) * (currentTrebleIntensity / 255) * 8;
        }
      }

      if (isPlaying) {
        const beatBoost = 1 + currentBeatPulse * 0.4;
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
      radius = Math.max(0.8, (1.6 + currentBeatPulse * 0.4) * scale);
    } else {
      let waveFreq = particle.dist0068 - count;
      let radiusWave = (Math.sin(waveFreq) + 1) * 0.5;
      const beatBoost = 1 + currentBeatPulse * 0.5;
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
        let hueIntensityFactor = glowIntensity * 40;
        let hue = Math.floor(particle.hueOffset + count15 + currentBeatPulse * 40 + hueIntensityFactor) % 360;
        const saturation = Math.floor(45 + currentBeatPulse * 25 + glowIntensity * 15);
        const lightness = Math.floor(particle.lightnessOffset + currentBeatPulse * 8 + glowIntensity * 10);
        const coloredStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

        if (colorTransitionProgress >= 1) {
          ctx.fillStyle = coloredStyle;
          ctx.globalAlpha = alpha * (0.92 + currentBeatPulse * 0.08);
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
    ? (0.008 + currentBassIntensity * 0.00018 + currentBeatPulse * 0.005)
    : 0.003;
  if (!prefersReducedMotion) {
    count += countInc;
  }
  animId = self.requestAnimationFrame(draw);
}

self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  if (type === 'init') {
    canvas = data.canvas as OffscreenCanvas;
    ctx = canvas.getContext('2d', { alpha: true });
    resize(data.width, data.height, data.dpr, data.prefersReducedMotion, data.cores, data.memGb);
    draw();
  }

  else if (type === 'resize') {
    if (canvas) {
      resize(data.width, data.height, data.dpr, data.prefersReducedMotion, data.cores, data.memGb);
    }
  }

  else if (type === 'audioFrame') {
    isPlaying = data.isPlaying;
    freqDataArray = data.freqDataArray;

    const incoming = data.bands;
    if (incoming) {
      extActive = true;
      extSubBass = incoming.subBass; extBass = incoming.bass;
      extTreble = incoming.treble; extLevel = incoming.level;
      const bn = extSubBass * 0.7 + extBass * 0.3;
      extBeatEma = extBeatEma * 0.992 + bn * 0.008;
      const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      const thr = Math.max(0.08, extBeatEma * 1.35);
      if (bn > thr && now - extLastBeat > 180) { extLastBeat = now; extBeatPulse = 1; }
      else { extBeatPulse *= 0.9; }
    } else {
      extActive = false;
    }
  }

  else if (type === 'glow') {
    glowIntensity = data.value ?? 0;
  }

  else if (type === 'destroy') {
    if (animId) self.cancelAnimationFrame(animId);
    canvas = null;
    ctx = null;
  }
};
