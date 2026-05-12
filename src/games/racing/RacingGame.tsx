const RACING_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>RACING — Neon Highway</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; }
  html, body {
    width: 100%; height: 100%;
    background: #000;
    font-family: 'Courier New', monospace;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    touch-action: none;
  }
  #gameContainer {
    position: relative;
    width: 400px;
    height: 611px;
    background: #050505;
    overflow: hidden;
    box-shadow: 0 0 40px rgba(255,170,0,0.15);
  }
  #hud {
    position: absolute;
    top: 0; left: 0;
    width: 400px;
    height: 36px;
    background: rgba(0,0,0,0.85);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }
  #exitBtn {
    width: 70px; height: 28px;
    margin: 4px;
    background: rgba(255,60,60,0.8);
    border: 1px solid rgba(255,100,100,0.5);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.1s;
  }
  #exitBtn:hover { background: rgba(255,60,60,1); }
  #hudTitle {
    flex: 1;
    text-align: center;
    color: #FFAA00;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: bold;
    text-shadow: 0 0 6px rgba(255,170,0,0.8), 0 0 12px rgba(255,170,0,0.4);
    letter-spacing: 1px;
  }
  .hudBtn {
    height: 28px;
    margin: 4px 2px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.1s;
  }
  .hudBtn:hover { background: rgba(255,255,255,0.2); }
  #muteBtn { width: 70px; }
  #pauseBtn { width: 85px; }
  #gameCanvas {
    position: absolute;
    top: 36px;
    left: 0;
    width: 400px;
    height: 520px;
    display: block;
    image-rendering: pixelated;
  }
  #controls {
    position: absolute;
    bottom: 0; left: 0;
    width: 400px;
    height: 55px;
    background: rgba(0,0,0,0.75);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    z-index: 10;
  }
  .dpad { display: flex; gap: 8px; }
  .dpadBtn {
    width: 45px; height: 45px;
    background: rgba(255,170,0,0.15);
    border: 1px solid rgba(255,170,0,0.4);
    border-radius: 8px;
    color: #FFAA00;
    font-family: 'Courier New', monospace;
    font-size: 22px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.05s, filter 0.05s;
  }
  .dpadBtn.active { transform: scale(0.9); filter: brightness(1.6); }
  .actionBtns { display: flex; gap: 8px; align-items: center; }
  .actionBtn {
    width: 40px; height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(0,221,204,0.5);
    background: rgba(0,221,204,0.15);
    color: #00DDCC;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.05s, filter 0.05s;
  }
  .actionBtn.active { transform: scale(0.9); filter: brightness(1.6); }
  #actionA { border-color: rgba(255,170,0,0.6); background: rgba(255,170,0,0.18); color: #FFAA00; }
  #escOverlay {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.85);
    border: 1px solid rgba(255,100,100,0.6);
    color: #FF6666;
    padding: 14px 22px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    border-radius: 6px;
    z-index: 30;
    display: none;
    pointer-events: none;
  }
  #pauseOverlay {
    position: absolute;
    top: 36px; left: 0;
    width: 400px;
    height: 520px;
    background: rgba(0,0,0,0.6);
    display: none;
    align-items: center;
    justify-content: center;
    color: #FFAA00;
    font-family: 'Courier New', monospace;
    font-size: 36px;
    font-weight: bold;
    letter-spacing: 4px;
    text-shadow: 0 0 12px rgba(255,170,0,0.7);
    z-index: 9;
  }
</style>
</head>
<body>
<div id="gameContainer">
  <div id="hud">
    <button id="exitBtn">✕ EXIT</button>
    <div id="hudTitle">RACING — 0m</div>
    <div style="display:flex;">
      <button class="hudBtn" id="muteBtn">🔊 SFX</button>
      <button class="hudBtn" id="pauseBtn">⏸ PAUSE</button>
    </div>
  </div>
  <canvas id="gameCanvas" width="400" height="520"></canvas>
  <div id="pauseOverlay">PAUSED</div>
  <div id="escOverlay">Press ESC again to exit</div>
  <div id="controls">
    <div class="dpad">
      <button class="dpadBtn" id="leftBtn">◀</button>
      <button class="dpadBtn" id="rightBtn">▶</button>
    </div>
    <div class="actionBtns">
      <button class="actionBtn" id="actionA">A</button>
      <button class="actionBtn" id="actionB">B</button>
    </div>
  </div>
</div>
<script>
// === CONSTANTS ===
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 520;
const ROAD_WIDTH = 240;
const ROAD_LEFT = (CANVAS_WIDTH - ROAD_WIDTH) / 2;
const ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH;
const LANE_COUNT = 3;
const LANE_WIDTH = ROAD_WIDTH / LANE_COUNT;
const LANE_CENTERS = [
  ROAD_LEFT + LANE_WIDTH * 0.5,
  ROAD_LEFT + LANE_WIDTH * 1.5,
  ROAD_LEFT + LANE_WIDTH * 2.5
];

const PLAYER_WIDTH = 28;
const PLAYER_HEIGHT = 50;
const PLAYER_Y = Math.floor(CANVAS_HEIGHT * 0.80);
const PLAYER_LANE_TRANSITION_SPEED = 0.22;

const BASE_SCROLL_SPEED = 4.0;
const SPEED_INCREASE_INTERVAL_MS = 30000;
const SPEED_INCREASE_AMOUNT = 0.5;

const NITRO_MAX_CHARGES = 3;
const NITRO_DURATION_MS = 2000;
const NITRO_RECHARGE_MS = 15000;
const NITRO_SPEED_MULTIPLIER = 2.5;

const NEAR_MISS_DISTANCE = 15;
const NEAR_MISS_SCORE = 25;

const RAIN_DISTANCE_THRESHOLD = 5000;
const NIGHT_DISTANCE_THRESHOLD = 10000;

const COLOR_AMBER = '#FFAA00';
const COLOR_TEAL = '#00DDCC';
const COLOR_BG = '#050505';
const COLOR_ROAD = '#222222';
const COLOR_SHOULDER = '#1a2010';

const PARTICLE_POOL_SIZE = 500;

const STATE_LOADING = 'LOADING';
const STATE_TITLE = 'TITLE';
const STATE_PLAYING = 'PLAYING';
const STATE_PAUSED = 'PAUSED';
const STATE_GAMEOVER = 'GAMEOVER';
const STATE_HIGHSCORE = 'HIGHSCORE';

const ENEMY_TYPES = [
  { name: 'truck',   width: 36, height: 60, speedFactor: 0.6,  body: '#4a3a2a', roof: '#2a1f15', accent: '#FF3333' },
  { name: 'sports',  width: 24, height: 42, speedFactor: 1.2,  body: '#00DDCC', roof: '#005a55', accent: '#FF4477' },
  { name: 'police',  width: 26, height: 44, speedFactor: 1.0,  body: '#1a3a8a', roof: '#0a1a4a', accent: 'blink'   },
  { name: 'pickup',  width: 28, height: 52, speedFactor: 0.8,  body: '#7a5a3a', roof: '#4a3a25', accent: '#FFAA66' },
  { name: 'van',     width: 32, height: 56, speedFactor: 0.55, body: '#dddddd', roof: '#888888', accent: '#FFFFFF' }
];

// === HUD SETUP ===
const hudTitleEl = document.getElementById('hudTitle');
const exitBtn = document.getElementById('exitBtn');
const muteBtn = document.getElementById('muteBtn');
const pauseBtn = document.getElementById('pauseBtn');
const escOverlay = document.getElementById('escOverlay');
const pauseOverlay = document.getElementById('pauseOverlay');
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');
const actionA = document.getElementById('actionA');
const actionB = document.getElementById('actionB');

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let isMuted = localStorage.getItem('mute_racing') === 'true';
function updateMuteButton() {
  muteBtn.textContent = isMuted ? '🔇 SFX' : '🔊 SFX';
}
updateMuteButton();

function updatePauseButton(paused) {
  pauseBtn.textContent = paused ? '▶ RESUME' : '⏸ PAUSE';
  pauseOverlay.style.display = paused ? 'flex' : 'none';
}

// === AUDIO ENGINE ===
const AudioEngine = {
  ctx: null,
  masterGain: null,
  musicGain: null,
  sfxGain: null,
  engineOsc: null,
  engineGain: null,
  musicInterval: null,
  musicStepIndex: 0,
  bpm: 200,
  ready: false,

  init() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);

      this.applyMute();
      this.ready = true;
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  },

  applyMute() {
    if (!this.ready) return;
    this.masterGain.gain.setTargetAtTime(isMuted ? 0 : 1, this.ctx.currentTime, 0.02);
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  },

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  },

  close() {
    try {
      if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
      if (this.engineOsc) { try { this.engineOsc.stop(); } catch(e){} this.engineOsc = null; }
      if (this.ctx) { this.ctx.close(); this.ctx = null; }
      this.ready = false;
    } catch(e) {}
  },

  startEngine() {
    if (!this.ready || this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 70;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.05;
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 380;
    this.engineOsc.connect(lp);
    lp.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain);
    this.engineOsc.start();
  },

  setEnginePitch(speed) {
    if (!this.ready || !this.engineOsc) return;
    const pitch = 60 + speed * 14;
    this.engineOsc.frequency.setTargetAtTime(pitch, this.ctx.currentTime, 0.05);
  },

  stopEngine() {
    if (this.engineOsc) {
      try { this.engineOsc.stop(); } catch(e){}
      this.engineOsc = null;
    }
  },

  // === Music Engine ===
  // E minor scale: E G A B C D E (low octave bass mirrors)
  startMusic() {
    if (!this.ready) return;
    if (this.musicInterval) return;
    const melody = [
      // E minor pattern, MIDI note offsets from E4 (note 64)
      64, 67, 71, 69,  67, 64, 67, 71,
      72, 71, 69, 67,  64, 62, 64, 67
    ];
    const bass = [
      40, 40, 47, 47,  40, 40, 47, 47,
      45, 45, 43, 43,  40, 40, 47, 47
    ];
    const stepDurationMs = () => (60000 / this.bpm) / 2; // eighth notes
    const playStep = () => {
      const idx = this.musicStepIndex % melody.length;
      const melNote = melody[idx];
      const basNote = bass[idx];
      this.playMusicNote(this.midiToFreq(melNote), 'triangle', 0.6, stepDurationMs() * 0.85 / 1000);
      this.playMusicNote(this.midiToFreq(basNote), 'square', 0.35, stepDurationMs() * 0.9 / 1000);
      // Kick on beats
      if (idx % 4 === 0) this.playKick();
      // Hi-hat on offbeats
      if (idx % 2 === 1) this.playHiHat();
      this.musicStepIndex++;
    };
    playStep();
    this.musicInterval = setInterval(playStep, stepDurationMs());
  },

  rebuildMusicTimer() {
    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
      this.startMusic();
    }
  },

  setBpm(newBpm) {
    if (Math.abs(newBpm - this.bpm) < 1) return;
    this.bpm = Math.min(360, newBpm);
    this.rebuildMusicTimer();
  },

  stopMusic() {
    if (this.musicInterval) { clearInterval(this.musicInterval); this.musicInterval = null; }
  },

  midiToFreq(n) { return 440 * Math.pow(2, (n - 69) / 12); },

  playMusicNote(freq, type, vol, dur) {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, this.ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, this.ctx.currentTime + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    o.connect(g);
    g.connect(this.musicGain);
    o.start();
    o.stop(this.ctx.currentTime + dur + 0.05);
  },

  playKick() {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.08);
    g.gain.setValueAtTime(0.6, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.09);
    o.connect(g); g.connect(this.musicGain);
    o.start(); o.stop(this.ctx.currentTime + 0.1);
  },

  playHiHat() {
    if (!this.ready) return;
    const bufSize = this.ctx.sampleRate * 0.03;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 8000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.18, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
    src.connect(hp); hp.connect(g); g.connect(this.musicGain);
    src.start();
  },

  // === SFX ===
  playNitro() {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1800, this.ctx.currentTime + 0.15);
    g.gain.setValueAtTime(0.5, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.16);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + 0.17);
  },

  playNearMiss() {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(1400, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.35, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + 0.11);
  },

  playCrash() {
    if (!this.ready) return;
    const bufSize = this.ctx.sampleRate * 0.4;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufSize, 1.5);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.7, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    src.connect(g); g.connect(this.sfxGain);
    src.start();
    // pitch-drop sine
    const o = this.ctx.createOscillator();
    const og = this.ctx.createGain();
    o.type = 'square';
    o.frequency.setValueAtTime(280, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, this.ctx.currentTime + 0.06);
    og.gain.setValueAtTime(0.5, this.ctx.currentTime);
    og.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.07);
    o.connect(og); og.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + 0.08);
  },

  playOffRoad() {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 90;
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.value = 18;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain); lfoGain.connect(o.frequency);
    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); lfo.start();
    o.stop(this.ctx.currentTime + 0.22); lfo.stop(this.ctx.currentTime + 0.22);
  },

  playRainStart() {
    if (!this.ready) return;
    const bufSize = this.ctx.sampleRate * 0.6;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.4, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);
    src.connect(hp); hp.connect(g); g.connect(this.sfxGain);
    src.start();
  },

  playLevelUp() {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(400, this.ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(1600, this.ctx.currentTime + 0.2);
    g.gain.setValueAtTime(0.4, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.22);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + 0.23);
  },

  playClick() {
    if (!this.ready) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'square';
    o.frequency.value = 1200;
    g.gain.setValueAtTime(0.25, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.01);
    o.connect(g); g.connect(this.sfxGain);
    o.start(); o.stop(this.ctx.currentTime + 0.015);
  }
};

// === PARTICLE SYSTEM ===
const Particles = {
  pool: [],
  init() {
    this.pool = new Array(PARTICLE_POOL_SIZE);
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.pool[i] = {
        active: false, x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 1, size: 2, color: '#fff',
        gravity: false, type: 'CIRCLE'
      };
    }
  },
  spawn(x, y, vx, vy, life, size, color, type, gravity) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.size = size; p.color = color;
        p.type = type || 'CIRCLE'; p.gravity = !!gravity;
        return;
      }
    }
  },
  update(dt) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += 0.2 * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  },
  render(ctx) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      if (p.type === 'SPARK') {
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      } else if (p.type === 'STAR') {
        this.drawStar(ctx, Math.floor(p.x), Math.floor(p.y), p.size);
      } else if (p.type === 'TRAIL') {
        ctx.beginPath();
        ctx.arc(Math.floor(p.x), Math.floor(p.y), p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(Math.floor(p.x), Math.floor(p.y), p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },
  drawStar(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI * 2) / 6 - Math.PI / 2;
      const rr = (i % 2 === 0) ? r : r * 0.4;
      const px = x + Math.cos(ang) * rr;
      const py = y + Math.sin(ang) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
};

// === GAME STATE ===
const Game = {
  state: STATE_LOADING,
  loadingProgress: 0,
  loadingStartTime: 0,
  lastFrameTime: 0,
  paused: false,
  running: true,

  // road
  scrollSpeed: BASE_SCROLL_SPEED,
  baseScrollSpeed: BASE_SCROLL_SPEED,
  roadOffset: 0,
  farLayerOffset: 0,
  nearLayerOffset: 0,

  // player
  playerLane: 1,
  playerX: LANE_CENTERS[1],
  playerTargetX: LANE_CENTERS[1],

  // progression
  distance: 0,
  score: 0,
  speedLevelTimer: 0,
  enemySpawnTimer: 0,
  enemySpawnInterval: 1100,

  // nitro
  nitroCharges: NITRO_MAX_CHARGES,
  nitroActive: false,
  nitroEndTime: 0,
  nitroRechargeTimer: 0,

  // near miss
  multiplier: 1,
  multiplierResetTimer: 0,

  // weather/time
  rainActive: false,
  rainStreaks: [],
  nightActive: false,
  nightOpacity: 0,
  oncomingHeadlights: [],

  // effects
  shakeAmount: 0,
  shakeTimer: 0,
  flashAlpha: 0,
  flickerTimer: 0,
  flickerActive: false,

  // crash
  crashAnimTimer: 0,
  crashX: 0, crashY: 0,

  // collections
  enemies: [],
  floatingTexts: [],
  signs: [],

  // highscore
  highScore: parseInt(localStorage.getItem('hs_racing') || '0', 10),
  leaderboard: JSON.parse(localStorage.getItem('lb_racing') || '[]'),

  // input flags
  keyLeft: false, keyRight: false,
  titleAnimTime: 0,
  escPendingTimer: 0,

  reset() {
    this.scrollSpeed = BASE_SCROLL_SPEED;
    this.baseScrollSpeed = BASE_SCROLL_SPEED;
    this.roadOffset = 0;
    this.farLayerOffset = 0;
    this.nearLayerOffset = 0;
    this.playerLane = 1;
    this.playerX = LANE_CENTERS[1];
    this.playerTargetX = LANE_CENTERS[1];
    this.distance = 0;
    this.score = 0;
    this.speedLevelTimer = 0;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 1100;
    this.nitroCharges = NITRO_MAX_CHARGES;
    this.nitroActive = false;
    this.nitroEndTime = 0;
    this.nitroRechargeTimer = 0;
    this.multiplier = 1;
    this.multiplierResetTimer = 0;
    this.rainActive = false;
    this.rainStreaks = [];
    this.nightActive = false;
    this.nightOpacity = 0;
    this.oncomingHeadlights = [];
    this.shakeAmount = 0;
    this.shakeTimer = 0;
    this.flashAlpha = 0;
    this.enemies = [];
    this.floatingTexts = [];
    this.signs = [];
    this.crashAnimTimer = 0;
    AudioEngine.bpm = 200;
    AudioEngine.rebuildMusicTimer();
  }
};

// === INPUT HANDLER ===
function changeLane(dir) {
  if (Game.state !== STATE_PLAYING) return;
  const newLane = Math.max(0, Math.min(LANE_COUNT - 1, Game.playerLane + dir));
  if (newLane !== Game.playerLane) {
    Game.playerLane = newLane;
    Game.playerTargetX = LANE_CENTERS[newLane];
    AudioEngine.playClick();
  }
}

function activateNitro() {
  if (Game.state !== STATE_PLAYING) return;
  if (Game.nitroActive) return;
  if (Game.nitroCharges <= 0) return;
  Game.nitroCharges--;
  Game.nitroActive = true;
  Game.nitroEndTime = performance.now() + NITRO_DURATION_MS;
  AudioEngine.playNitro();
}

function togglePause() {
  if (Game.state === STATE_PLAYING) {
    Game.state = STATE_PAUSED;
    Game.paused = true;
    AudioEngine.suspend();
    updatePauseButton(true);
  } else if (Game.state === STATE_PAUSED) {
    Game.state = STATE_PLAYING;
    Game.paused = false;
    AudioEngine.resume();
    updatePauseButton(false);
  }
}

function toggleMute() {
  isMuted = !isMuted;
  localStorage.setItem('mute_racing', isMuted ? 'true' : 'false');
  updateMuteButton();
  AudioEngine.applyMute();
  AudioEngine.playClick();
}

function performExit() {
  Game.running = false;
  Game.state = STATE_LOADING;
  AudioEngine.close();
  try { window.parent.postMessage({ action: 'exitGame' }, '*'); } catch(e) {}
  try { window.dispatchEvent(new CustomEvent('gameExit')); } catch(e) {}
}

function handleEscape() {
  if (Game.escPendingTimer > 0) {
    performExit();
  } else {
    Game.escPendingTimer = 1500;
    escOverlay.style.display = 'block';
  }
}

function handleStartOrRestart() {
  if (Game.state === STATE_TITLE) {
    Game.reset();
    Game.state = STATE_PLAYING;
    AudioEngine.resume();
    AudioEngine.startEngine();
    AudioEngine.startMusic();
  } else if (Game.state === STATE_GAMEOVER) {
    Game.state = STATE_TITLE;
  }
}

window.addEventListener('keydown', (e) => {
  if (!Game.running) return;
  AudioEngine.init();
  AudioEngine.resume();
  switch (e.key) {
    case 'ArrowLeft': case 'a': case 'A':
      changeLane(-1); e.preventDefault(); break;
    case 'ArrowRight': case 'd': case 'D':
      changeLane(1); e.preventDefault(); break;
    case ' ':
      if (Game.state === STATE_TITLE || Game.state === STATE_GAMEOVER) {
        handleStartOrRestart();
      } else {
        activateNitro();
      }
      e.preventDefault(); break;
    case 'p': case 'P':
      togglePause(); e.preventDefault(); break;
    case 'm': case 'M':
      toggleMute(); e.preventDefault(); break;
    case 'Escape':
      handleEscape(); e.preventDefault(); break;
  }
});

function bindButton(el, onDown, onUp) {
  const down = (e) => { e.preventDefault(); el.classList.add('active'); if (onDown) onDown(); };
  const up   = (e) => { e.preventDefault(); el.classList.remove('active'); if (onUp) onUp(); };
  el.addEventListener('touchstart', down, { passive: false });
  el.addEventListener('touchend', up, { passive: false });
  el.addEventListener('mousedown', down);
  el.addEventListener('mouseup', up);
  el.addEventListener('mouseleave', up);
}

bindButton(leftBtn,
  () => { AudioEngine.init(); AudioEngine.resume(); changeLane(-1); },
  null);
bindButton(rightBtn,
  () => { AudioEngine.init(); AudioEngine.resume(); changeLane(1); },
  null);
bindButton(actionA,
  () => { AudioEngine.init(); AudioEngine.resume();
    if (Game.state === STATE_TITLE || Game.state === STATE_GAMEOVER) handleStartOrRestart();
    else activateNitro();
  }, null);
bindButton(actionB,
  () => { AudioEngine.init(); AudioEngine.resume(); togglePause(); }, null);

exitBtn.addEventListener('click', () => { AudioEngine.playClick(); performExit(); });
muteBtn.addEventListener('click', () => { toggleMute(); });
pauseBtn.addEventListener('click', () => { AudioEngine.playClick(); togglePause(); });

canvas.addEventListener('touchstart', (e) => {
  AudioEngine.init();
  AudioEngine.resume();
  if (Game.state === STATE_TITLE || Game.state === STATE_GAMEOVER) {
    handleStartOrRestart();
    e.preventDefault();
  }
}, { passive: false });

canvas.addEventListener('click', () => {
  AudioEngine.init();
  AudioEngine.resume();
  if (Game.state === STATE_TITLE || Game.state === STATE_GAMEOVER) {
    handleStartOrRestart();
  }
});

// === GAME LOGIC ===
function spawnEnemy() {
  const typeIdx = Math.floor(Math.random() * ENEMY_TYPES.length);
  const type = ENEMY_TYPES[typeIdx];
  const lane = Math.floor(Math.random() * LANE_COUNT);
  // Avoid stacking enemies in same lane near top
  for (const e of Game.enemies) {
    if (e.lane === lane && e.y < 80) return;
  }
  const enemy = {
    type: type,
    lane: lane,
    x: LANE_CENTERS[lane],
    y: -type.height,
    width: type.width,
    height: type.height,
    speedFactor: type.speedFactor,
    nearMissChecked: false,
    blinkPhase: 0
  };
  Game.enemies.push(enemy);
}

function spawnSign() {
  const side = Math.random() < 0.5 ? -1 : 1;
  const xBase = side < 0 ? ROAD_LEFT - 50 : ROAD_RIGHT + 20;
  Game.signs.push({
    x: xBase,
    y: -40,
    text: ['NEON HWY', '∞ MILES', 'TURBO ZONE', 'GHOST RD', 'NEXT EXIT'][Math.floor(Math.random()*5)]
  });
}

function spawnFloatingText(x, y, text, color) {
  Game.floatingTexts.push({
    x: x, y: y, text: text, color: color,
    life: 800, maxLife: 800, vy: -0.06
  });
}

function spawnRainStreaks() {
  Game.rainStreaks = [];
  for (let i = 0; i < 60; i++) {
    Game.rainStreaks.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      len: 10 + Math.random() * 10,
      speed: 0.6 + Math.random() * 0.6
    });
  }
}

function spawnOncomingHeadlight() {
  // appears center-left or center-right and moves down
  const lane = Math.floor(Math.random() * LANE_COUNT);
  Game.oncomingHeadlights.push({
    x: LANE_CENTERS[lane],
    y: -20,
    speed: 3 + Math.random() * 2
  });
}

function applyScreenShake(amount, duration) {
  Game.shakeAmount = Math.max(Game.shakeAmount, amount);
  Game.shakeTimer = Math.max(Game.shakeTimer, duration);
}

function emitCrashBurst(x, y) {
  for (let i = 0; i < 40; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 0.1 + Math.random() * 0.3;
    const col = Math.random() < 0.5 ? '#FF6600' : '#FFAA00';
    Particles.spawn(x, y,
      Math.cos(ang) * spd, Math.sin(ang) * spd,
      600 + Math.random() * 400,
      2 + Math.random() * 3,
      col, Math.random() < 0.3 ? 'STAR' : 'SPARK', true);
  }
}

function emitExhaust() {
  const x = Game.playerX + (Math.random() * 6 - 3);
  const y = PLAYER_Y + PLAYER_HEIGHT * 0.5 + 2;
  for (let i = 0; i < 2; i++) {
    Particles.spawn(x, y,
      (Math.random() - 0.5) * 0.04, 0.05 + Math.random() * 0.05,
      300 + Math.random() * 200,
      2 + Math.random() * 2,
      Game.nitroActive ? '#FF8800' : '#666666',
      'CIRCLE', false);
  }
}

function checkCollision(a, b, ax, ay, aw, ah, bx, by, bw, bh) {
  return Math.abs(ax - bx) < (aw + bw) * 0.5 - 2 &&
         Math.abs(ay - by) < (ah + bh) * 0.5 - 2;
}

function triggerCrash() {
  Game.state = STATE_GAMEOVER;
  Game.crashAnimTimer = 1200;
  Game.crashX = Game.playerX;
  Game.crashY = PLAYER_Y;
  Game.flashAlpha = 1.0;
  applyScreenShake(8, 600);
  emitCrashBurst(Game.playerX, PLAYER_Y);
  AudioEngine.playCrash();
  AudioEngine.stopEngine();
  AudioEngine.stopMusic();

  // High score
  const finalDist = Math.floor(Game.distance);
  if (finalDist > Game.highScore) {
    Game.highScore = finalDist;
    localStorage.setItem('hs_racing', String(finalDist));
  }
  Game.leaderboard.push(finalDist);
  Game.leaderboard.sort((a, b) => b - a);
  Game.leaderboard = Game.leaderboard.slice(0, 3);
  localStorage.setItem('lb_racing', JSON.stringify(Game.leaderboard));
}

function updatePlaying(dt) {
  // Player smooth lane interpolation
  Game.playerX += (Game.playerTargetX - Game.playerX) * PLAYER_LANE_TRANSITION_SPEED;

  // Off-road detection (player's horizontal extents)
  const halfW = PLAYER_WIDTH * 0.5;
  const offRoad = (Game.playerX - halfW < ROAD_LEFT + 2) || (Game.playerX + halfW > ROAD_RIGHT - 2);

  // Scroll speed
  let effectiveSpeed = Game.scrollSpeed;
  if (Game.nitroActive) effectiveSpeed *= NITRO_SPEED_MULTIPLIER;
  if (offRoad) {
    effectiveSpeed *= 0.6;
    if (Math.random() < 0.05) {
      AudioEngine.playOffRoad();
      applyScreenShake(3, 200);
    }
  }

  AudioEngine.setEnginePitch(effectiveSpeed);

  // Update layers
  Game.roadOffset += effectiveSpeed;
  Game.nearLayerOffset += effectiveSpeed * 0.8;
  Game.farLayerOffset += effectiveSpeed * 0.4;
  if (Game.roadOffset > 50) Game.roadOffset -= 50;
  if (Game.nearLayerOffset > 80) Game.nearLayerOffset -= 80;
  if (Game.farLayerOffset > 120) Game.farLayerOffset -= 120;

  // Distance
  Game.distance += effectiveSpeed * 0.4;
  Game.score = Math.floor(Game.distance);

  // Music BPM scale by score
  const targetBpm = 200 + Math.min(160, Math.floor(Game.score / 500) * 2);
  if (Math.abs(targetBpm - AudioEngine.bpm) >= 4) AudioEngine.setBpm(targetBpm);

  // Speed-up event
  Game.speedLevelTimer += dt;
  if (Game.speedLevelTimer >= SPEED_INCREASE_INTERVAL_MS) {
    Game.speedLevelTimer = 0;
    Game.baseScrollSpeed += SPEED_INCREASE_AMOUNT;
    Game.scrollSpeed = Game.baseScrollSpeed;
    Game.enemySpawnInterval = Math.max(420, Game.enemySpawnInterval - 60);
    AudioEngine.playLevelUp();
    spawnFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35, 'SPEED UP!', COLOR_TEAL);
  } else {
    // gentle ease scroll back to base if needed
    Game.scrollSpeed += (Game.baseScrollSpeed - Game.scrollSpeed) * 0.02;
  }

  // Enemy spawn
  Game.enemySpawnTimer += dt;
  if (Game.enemySpawnTimer >= Game.enemySpawnInterval) {
    Game.enemySpawnTimer = 0;
    spawnEnemy();
    if (Math.random() < 0.18) spawnSign();
  }

  // Update enemies
  for (let i = Game.enemies.length - 1; i >= 0; i--) {
    const e = Game.enemies[i];
    // Enemies appear to move down due to relative speed
    const relSpeed = effectiveSpeed - effectiveSpeed * e.speedFactor + effectiveSpeed * 0.5;
    e.y += relSpeed;
    e.blinkPhase += dt;

    // Near miss check
    if (!e.nearMissChecked && e.y > PLAYER_Y - PLAYER_HEIGHT * 0.5 && e.y < PLAYER_Y + PLAYER_HEIGHT * 0.5) {
      const dx = Math.abs(e.x - Game.playerX);
      const minDist = (e.width + PLAYER_WIDTH) * 0.5;
      if (dx > minDist && dx < minDist + NEAR_MISS_DISTANCE) {
        e.nearMissChecked = true;
        Game.multiplier = Math.min(4, Game.multiplier === 1 ? 2 : Game.multiplier * 2);
        Game.multiplierResetTimer = 3000;
        const bonus = NEAR_MISS_SCORE * Game.multiplier;
        Game.score += bonus;
        Game.distance += bonus * 0.25;
        spawnFloatingText(e.x, e.y - 20, '+' + bonus + ' CLOSE!', '#FF8800');
        AudioEngine.playNearMiss();
      }
    }

    // Collision
    if (checkCollision(null, null, Game.playerX, PLAYER_Y, PLAYER_WIDTH, PLAYER_HEIGHT,
                       e.x, e.y, e.width, e.height)) {
      triggerCrash();
      return;
    }

    if (e.y > CANVAS_HEIGHT + 60) {
      Game.enemies.splice(i, 1);
    }
  }

  // Multiplier reset
  if (Game.multiplierResetTimer > 0) {
    Game.multiplierResetTimer -= dt;
    if (Game.multiplierResetTimer <= 0) Game.multiplier = 1;
  }

  // Signs update
  for (let i = Game.signs.length - 1; i >= 0; i--) {
    Game.signs[i].y += effectiveSpeed * 0.8;
    if (Game.signs[i].y > CANVAS_HEIGHT + 30) Game.signs.splice(i, 1);
  }

  // Nitro state
  if (Game.nitroActive && performance.now() >= Game.nitroEndTime) {
    Game.nitroActive = false;
  }
  if (Game.nitroCharges < NITRO_MAX_CHARGES) {
    Game.nitroRechargeTimer += dt;
    if (Game.nitroRechargeTimer >= NITRO_RECHARGE_MS) {
      Game.nitroRechargeTimer = 0;
      Game.nitroCharges++;
    }
  }

  // Weather/time
  if (!Game.rainActive && Game.distance >= RAIN_DISTANCE_THRESHOLD) {
    Game.rainActive = true;
    spawnRainStreaks();
    AudioEngine.playRainStart();
    spawnFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35, 'RAIN!', '#88CCFF');
  }
  if (Game.rainActive) {
    for (const r of Game.rainStreaks) {
      r.x -= r.speed * 3;
      r.y += r.speed * 9;
      if (r.y > CANVAS_HEIGHT || r.x < -20) {
        r.x = Math.random() * (CANVAS_WIDTH + 40);
        r.y = -20;
      }
    }
  }
  if (!Game.nightActive && Game.distance >= NIGHT_DISTANCE_THRESHOLD) {
    Game.nightActive = true;
    spawnFloatingText(CANVAS_WIDTH / 2, CANVAS_HEIGHT * 0.35, 'NIGHT FALLS', '#AA88FF');
  }
  if (Game.nightActive) {
    Game.nightOpacity = Math.min(0.55, Game.nightOpacity + 0.001 * dt);
    if (Math.random() < 0.04) spawnOncomingHeadlight();
    for (let i = Game.oncomingHeadlights.length - 1; i >= 0; i--) {
      const h = Game.oncomingHeadlights[i];
      h.y += h.speed;
      if (h.y > CANVAS_HEIGHT + 20) Game.oncomingHeadlights.splice(i, 1);
    }
  }

  // Floating texts
  for (let i = Game.floatingTexts.length - 1; i >= 0; i--) {
    const f = Game.floatingTexts[i];
    f.life -= dt;
    f.y += f.vy * dt;
    if (f.life <= 0) Game.floatingTexts.splice(i, 1);
  }

  // Particles + exhaust
  emitExhaust();
  Particles.update(dt);

  // Shake decay
  if (Game.shakeTimer > 0) {
    Game.shakeTimer -= dt;
    Game.shakeAmount *= 0.92;
    if (Game.shakeTimer <= 0) { Game.shakeAmount = 0; }
  }

  // Flash decay
  if (Game.flashAlpha > 0) Game.flashAlpha = Math.max(0, Game.flashAlpha - 0.02 * dt);

  // Flicker
  Game.flickerTimer += dt;
  if (Game.flickerTimer >= 10000) {
    Game.flickerTimer = 0;
    Game.flickerActive = true;
    setTimeout(() => { Game.flickerActive = false; }, 80);
  }
}

function updateGameOver(dt) {
  Game.crashAnimTimer -= dt;
  Particles.update(dt);
  if (Game.shakeTimer > 0) {
    Game.shakeTimer -= dt;
    Game.shakeAmount *= 0.92;
  }
  if (Game.flashAlpha > 0) Game.flashAlpha = Math.max(0, Game.flashAlpha - 0.02 * dt);
  // continue scrolling slowly
  Game.roadOffset += 0.6;
  if (Game.roadOffset > 50) Game.roadOffset -= 50;
}

function updateTitle(dt) {
  Game.titleAnimTime += dt;
  Game.roadOffset += 2.5;
  Game.nearLayerOffset += 2.0;
  Game.farLayerOffset += 1.0;
  if (Game.roadOffset > 50) Game.roadOffset -= 50;
  if (Game.nearLayerOffset > 80) Game.nearLayerOffset -= 80;
  if (Game.farLayerOffset > 120) Game.farLayerOffset -= 120;
}

function updateLoading(dt) {
  Game.loadingProgress = Math.min(1, Game.loadingProgress + dt / 1500);
  if (Game.loadingProgress >= 1) {
    Game.state = STATE_TITLE;
  }
}

// === RENDERER ===
function drawShoulders() {
  ctx.fillStyle = COLOR_SHOULDER;
  ctx.fillRect(0, 0, ROAD_LEFT, CANVAS_HEIGHT);
  ctx.fillRect(ROAD_RIGHT, 0, CANVAS_WIDTH - ROAD_RIGHT, CANVAS_HEIGHT);
}

function drawFarLayer() {
  // stylized triangle trees
  ctx.save();
  const yOffset = Game.farLayerOffset % 120;
  for (let i = -1; i < 8; i++) {
    const y = i * 120 + yOffset;
    // left side
    drawTree(40, y, 22, '#0a2410');
    drawTree(20, y + 60, 18, '#082010');
    // right side
    drawTree(CANVAS_WIDTH - 40, y + 30, 22, '#0a2410');
    drawTree(CANVAS_WIDTH - 20, y + 90, 18, '#082010');
  }
  ctx.restore();
}

function drawTree(cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx - size * 0.7, cy + size);
  ctx.lineTo(cx + size * 0.7, cy + size);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a0e05';
  ctx.fillRect(Math.floor(cx) - 2, Math.floor(cy + size), 4, 4);
}

function drawNearLayer() {
  // Guard rails
  ctx.save();
  ctx.strokeStyle = 'rgba(220,220,220,0.6)';
  ctx.lineWidth = 1;
  const off = Game.nearLayerOffset % 24;
  for (let y = -off; y < CANVAS_HEIGHT; y += 24) {
    ctx.beginPath();
    ctx.moveTo(ROAD_LEFT - 6, y);
    ctx.lineTo(ROAD_LEFT - 6, y + 14);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ROAD_RIGHT + 6, y);
    ctx.lineTo(ROAD_RIGHT + 6, y + 14);
    ctx.stroke();
  }
  // Continuous bars
  ctx.strokeStyle = 'rgba(170,170,170,0.4)';
  ctx.beginPath();
  ctx.moveTo(ROAD_LEFT - 6, 0); ctx.lineTo(ROAD_LEFT - 6, CANVAS_HEIGHT); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ROAD_RIGHT + 6, 0); ctx.lineTo(ROAD_RIGHT + 6, CANVAS_HEIGHT); ctx.stroke();
  ctx.restore();

  // Signs
  for (const s of Game.signs) {
    ctx.save();
    ctx.fillStyle = '#3a2a10';
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 40, 22);
    ctx.strokeStyle = COLOR_AMBER;
    ctx.strokeRect(Math.floor(s.x) + 0.5, Math.floor(s.y) + 0.5, 40, 22);
    ctx.fillStyle = COLOR_AMBER;
    ctx.font = '8px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(s.text, Math.floor(s.x) + 20, Math.floor(s.y) + 14);
    ctx.restore();
  }
}

function drawRoad() {
  // Road body
  ctx.fillStyle = COLOR_ROAD;
  ctx.fillRect(ROAD_LEFT, 0, ROAD_WIDTH, CANVAS_HEIGHT);

  // Edge lines
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ROAD_LEFT + 1, 0); ctx.lineTo(ROAD_LEFT + 1, CANVAS_HEIGHT);
  ctx.moveTo(ROAD_RIGHT - 1, 0); ctx.lineTo(ROAD_RIGHT - 1, CANVAS_HEIGHT);
  ctx.stroke();

  // Lane dashes
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  const dashLen = 30;
  const gap = 20;
  const period = dashLen + gap;
  const off = Game.roadOffset % period;
  for (let lane = 1; lane < LANE_COUNT; lane++) {
    const x = Math.floor(ROAD_LEFT + lane * LANE_WIDTH - 2);
    for (let y = -period + off; y < CANVAS_HEIGHT; y += period) {
      ctx.fillRect(x, Math.floor(y), 4, dashLen);
    }
  }
}

function drawPlayerCar(px, py, crashing) {
  ctx.save();
  if (crashing) {
    // Rotate during crash
    const t = (1200 - Game.crashAnimTimer) / 1200;
    ctx.translate(Math.floor(px), Math.floor(py));
    ctx.rotate(t * Math.PI * 0.6);
    ctx.translate(-Math.floor(px), -Math.floor(py));
  }
  const left = Math.floor(px - PLAYER_WIDTH / 2);
  const top = Math.floor(py - PLAYER_HEIGHT / 2);

  // Shadow
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = COLOR_AMBER;
  // Body rounded rect
  ctx.fillStyle = COLOR_AMBER;
  roundedRect(left, top, PLAYER_WIDTH, PLAYER_HEIGHT, 5);
  ctx.fill();
  ctx.restore();

  // Hood lighter trapezoid
  ctx.fillStyle = '#FFCC55';
  ctx.beginPath();
  ctx.moveTo(left + 4, top + 6);
  ctx.lineTo(left + PLAYER_WIDTH - 4, top + 6);
  ctx.lineTo(left + PLAYER_WIDTH - 6, top + 16);
  ctx.lineTo(left + 6, top + 16);
  ctx.closePath();
  ctx.fill();

  // Roof dark
  ctx.fillStyle = '#553300';
  ctx.fillRect(left + 5, top + 18, PLAYER_WIDTH - 10, 18);

  // Wheels
  ctx.fillStyle = '#111';
  ctx.fillRect(left - 2, top + 6, 4, 10);
  ctx.fillRect(left + PLAYER_WIDTH - 2, top + 6, 4, 10);
  ctx.fillRect(left - 2, top + PLAYER_HEIGHT - 16, 4, 10);
  ctx.fillRect(left + PLAYER_WIDTH - 2, top + PLAYER_HEIGHT - 16, 4, 10);
  // Rim highlights
  ctx.fillStyle = '#888';
  ctx.beginPath(); ctx.arc(left, top + 11, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(left + PLAYER_WIDTH, top + 11, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(left, top + PLAYER_HEIGHT - 11, 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(left + PLAYER_WIDTH, top + PLAYER_HEIGHT - 11, 1.2, 0, Math.PI * 2); ctx.fill();

  // Headlights
  ctx.save();
  ctx.shadowBlur = 15;
  ctx.shadowColor = 'white';
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.arc(left + 6, top + 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(left + PLAYER_WIDTH - 6, top + 4, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Rear lights
  ctx.fillStyle = '#FF3322';
  ctx.fillRect(left + 4, top + PLAYER_HEIGHT - 4, 4, 2);
  ctx.fillRect(left + PLAYER_WIDTH - 8, top + PLAYER_HEIGHT - 4, 4, 2);

  ctx.restore();
}

function drawEnemy(e) {
  const left = Math.floor(e.x - e.width / 2);
  const top = Math.floor(e.y - e.height / 2);
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = e.type.body;
  ctx.fillStyle = e.type.body;
  roundedRect(left, top, e.width, e.height, 4);
  ctx.fill();
  ctx.restore();

  // Roof
  ctx.fillStyle = e.type.roof;
  ctx.fillRect(left + 4, top + 12, e.width - 8, e.height - 24);

  // Wheels
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(left - 2, top + 5, 3, 8);
  ctx.fillRect(left + e.width - 1, top + 5, 3, 8);
  ctx.fillRect(left - 2, top + e.height - 13, 3, 8);
  ctx.fillRect(left + e.width - 1, top + e.height - 13, 3, 8);

  // Headlights (front = top since approaching from top in world; but enemies move down)
  // They face down toward player so headlights at bottom
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'white';
  ctx.fillStyle = '#FFFFEE';
  ctx.beginPath(); ctx.arc(left + 5, top + e.height - 3, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(left + e.width - 5, top + e.height - 3, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Tail lights at top
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#FF2200';
  ctx.fillStyle = '#FF3322';
  ctx.beginPath(); ctx.arc(left + 5, top + 3, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(left + e.width - 5, top + 3, 1.6, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Police lights blink
  if (e.type.name === 'police') {
    const blink = Math.floor(e.blinkPhase / 200) % 2 === 0;
    ctx.save();
    ctx.shadowBlur = 12;
    if (blink) {
      ctx.shadowColor = '#FF0000';
      ctx.fillStyle = '#FF2200';
      ctx.fillRect(left + 6, top + e.height / 2 - 3, e.width / 2 - 4, 5);
      ctx.shadowColor = '#0044FF';
      ctx.fillStyle = '#3366FF';
      ctx.fillRect(left + e.width / 2 + 2, top + e.height / 2 - 3, e.width / 2 - 8, 5);
    } else {
      ctx.shadowColor = '#0044FF';
      ctx.fillStyle = '#3366FF';
      ctx.fillRect(left + 6, top + e.height / 2 - 3, e.width / 2 - 4, 5);
      ctx.shadowColor = '#FF0000';
      ctx.fillStyle = '#FF2200';
      ctx.fillRect(left + e.width / 2 + 2, top + e.height / 2 - 3, e.width / 2 - 8, 5);
    }
    ctx.restore();
  }
}

function roundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawNitroBars() {
  const barW = 24, barH = 8, gap = 4;
  const baseX = 10;
  const baseY = CANVAS_HEIGHT - 24;
  for (let i = 0; i < NITRO_MAX_CHARGES; i++) {
    const x = baseX + i * (barW + gap);
    const filled = i < Game.nitroCharges;
    let fillAmt = filled ? 1 : 0;
    // Show recharging on next empty slot
    if (i === Game.nitroCharges && Game.nitroCharges < NITRO_MAX_CHARGES) {
      fillAmt = Math.min(1, Game.nitroRechargeTimer / NITRO_RECHARGE_MS);
    }
    ctx.save();
    ctx.strokeStyle = filled ? COLOR_AMBER : 'rgba(120,120,120,0.6)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, baseY + 0.5, barW, barH);
    if (fillAmt > 0) {
      ctx.shadowBlur = filled ? 8 : 0;
      ctx.shadowColor = COLOR_AMBER;
      ctx.fillStyle = filled ? COLOR_AMBER : 'rgba(255,170,0,0.6)';
      ctx.fillRect(x + 1, baseY + 1, (barW - 2) * fillAmt, barH - 2);
    }
    ctx.restore();
  }
  ctx.save();
  ctx.fillStyle = COLOR_AMBER;
  ctx.font = '9px Courier New';
  ctx.fillText('NITRO', baseX, baseY - 4);
  ctx.restore();
}

function drawFloatingTexts() {
  for (const f of Game.floatingTexts) {
    const alpha = Math.max(0, f.life / f.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = f.color;
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 6;
    ctx.shadowColor = f.color;
    ctx.fillText(f.text, Math.floor(f.x), Math.floor(f.y));
    ctx.restore();
  }
}

function drawRain() {
  if (!Game.rainActive) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(220,230,255,0.55)';
  ctx.lineWidth = 1;
  for (const r of Game.rainStreaks) {
    ctx.beginPath();
    ctx.moveTo(r.x, r.y);
    ctx.lineTo(r.x - r.len * 0.35, r.y + r.len);
    ctx.stroke();
  }
  ctx.restore();
}

function drawNight() {
  if (!Game.nightActive) return;
  ctx.save();
  ctx.fillStyle = 'rgba(5,5,20,' + Game.nightOpacity + ')';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Oncoming headlight streaks
  for (const h of Game.oncomingHeadlights) {
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#FFFFCC';
    ctx.fillStyle = 'rgba(255,255,200,0.7)';
    ctx.beginPath();
    ctx.arc(h.x - 4, h.y, 2.5, 0, Math.PI * 2);
    ctx.arc(h.x + 4, h.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCrtOverlay() {
  // scanlines
  ctx.save();
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#000';
  for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
    ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  }
  ctx.restore();

  // vignette
  ctx.save();
  const grad = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 60,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 350
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();

  if (Game.flickerActive) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }
}

function drawChromaticAberration() {
  if (!Game.nitroActive) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = 'rgba(255,0,0,0.3)';
  ctx.fillRect(ROAD_LEFT - 4, 0, ROAD_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = 'rgba(0,100,255,0.3)';
  ctx.fillRect(ROAD_LEFT + 4, 0, ROAD_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
  // motion blur lines on road
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    const x = ROAD_LEFT + Math.random() * ROAD_WIDTH;
    const y = Math.random() * CANVAS_HEIGHT;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 30);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTitle() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 100, CANVAS_WIDTH, 320);
  ctx.fillStyle = COLOR_AMBER;
  ctx.shadowBlur = 12;
  ctx.shadowColor = COLOR_AMBER;
  ctx.textAlign = 'center';
  ctx.font = 'bold 42px Courier New';
  ctx.fillText('NEON', CANVAS_WIDTH / 2, 170);
  ctx.fillStyle = COLOR_TEAL;
  ctx.shadowColor = COLOR_TEAL;
  ctx.fillText('HIGHWAY', CANVAS_WIDTH / 2, 215);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px Courier New';
  ctx.fillText('TOP-DOWN ENDLESS RACER', CANVAS_WIDTH / 2, 240);

  // Blinking start prompt
  if (Math.floor(Game.titleAnimTime / 500) % 2 === 0) {
    ctx.fillStyle = COLOR_AMBER;
    ctx.font = 'bold 14px Courier New';
    ctx.fillText('SPACE or TAP to START', CANVAS_WIDTH / 2, 295);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '10px Courier New';
  ctx.fillText('← → / A,D : LANES', CANVAS_WIDTH / 2, 330);
  ctx.fillText('SPACE / A : NITRO', CANVAS_WIDTH / 2, 345);
  ctx.fillText('P : PAUSE   M : MUTE', CANVAS_WIDTH / 2, 360);

  // High score
  ctx.fillStyle = COLOR_TEAL;
  ctx.font = 'bold 12px Courier New';
  ctx.fillText('HIGH SCORE: ' + Game.highScore + 'm', CANVAS_WIDTH / 2, 390);

  if (Game.leaderboard.length > 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Courier New';
    ctx.fillText('TOP 3:', CANVAS_WIDTH / 2, 408);
    for (let i = 0; i < Math.min(3, Game.leaderboard.length); i++) {
      ctx.fillText((i+1) + '. ' + Game.leaderboard[i] + 'm', CANVAS_WIDTH / 2, 422 + i * 12);
    }
  }
  ctx.restore();
}

function drawGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 120, CANVAS_WIDTH, 280);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#FF4444';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#FF4444';
  ctx.font = 'bold 36px Courier New';
  ctx.fillText('CRASHED', CANVAS_WIDTH / 2, 175);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px Courier New';
  ctx.fillText('DISTANCE: ' + Math.floor(Game.distance) + 'm', CANVAS_WIDTH / 2, 220);

  ctx.fillStyle = COLOR_TEAL;
  ctx.font = '14px Courier New';
  ctx.fillText('BEST: ' + Game.highScore + 'm', CANVAS_WIDTH / 2, 245);

  if (Math.floor(performance.now() / 500) % 2 === 0) {
    ctx.fillStyle = COLOR_AMBER;
    ctx.font = 'bold 14px Courier New';
    ctx.fillText('SPACE or TAP to RESTART', CANVAS_WIDTH / 2, 300);
  }
  ctx.restore();
}

function drawLoading() {
  ctx.save();
  ctx.fillStyle = COLOR_AMBER;
  ctx.font = 'bold 18px Courier New';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 8;
  ctx.shadowColor = COLOR_AMBER;
  ctx.fillText('LOADING...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  const barW = 240, barH = 16;
  const bx = (CANVAS_WIDTH - barW) / 2;
  const by = CANVAS_HEIGHT / 2;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = COLOR_AMBER;
  ctx.lineWidth = 1;
  ctx.strokeRect(bx + 0.5, by + 0.5, barW, barH);
  ctx.fillStyle = COLOR_AMBER;
  ctx.fillRect(bx + 2, by + 2, (barW - 4) * Game.loadingProgress, barH - 4);
  ctx.restore();
}

function render() {
  // Clear
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Screen shake transform
  ctx.save();
  if (Game.shakeAmount > 0) {
    const sx = (Math.random() - 0.5) * Game.shakeAmount;
    const sy = (Math.random() - 0.5) * Game.shakeAmount;
    ctx.translate(Math.floor(sx), Math.floor(sy));
  }

  if (Game.state === STATE_LOADING) {
    drawLoading();
    ctx.restore();
    drawCrtOverlay();
    return;
  }

  // Shoulders + parallax layers
  drawShoulders();
  drawFarLayer();
  drawNearLayer();
  drawRoad();

  // Chromatic during nitro
  drawChromaticAberration();

  // Enemies
  for (const e of Game.enemies) drawEnemy(e);

  // Particles
  Particles.render(ctx);

  // Player
  if (Game.state === STATE_PLAYING || Game.state === STATE_PAUSED) {
    drawPlayerCar(Game.playerX, PLAYER_Y, false);
  } else if (Game.state === STATE_GAMEOVER) {
    drawPlayerCar(Game.crashX, Game.crashY, true);
  } else if (Game.state === STATE_TITLE) {
    // demo car drifts in middle lane
    drawPlayerCar(LANE_CENTERS[1], PLAYER_Y, false);
  }

  // Rain
  drawRain();
  // Night
  drawNight();

  // Nitro HUD bars (over game area only)
  if (Game.state === STATE_PLAYING || Game.state === STATE_PAUSED || Game.state === STATE_GAMEOVER) {
    drawNitroBars();

    // Multiplier indicator
    if (Game.multiplier > 1) {
      ctx.save();
      ctx.fillStyle = COLOR_TEAL;
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLOR_TEAL;
      ctx.font = 'bold 16px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText('x' + Game.multiplier, CANVAS_WIDTH - 10, CANVAS_HEIGHT - 12);
      ctx.restore();
    }

    // Speed indicator
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText('SPD ' + Game.scrollSpeed.toFixed(1), CANVAS_WIDTH - 10, 14);
    ctx.fillText('HI ' + Game.highScore + 'm', CANVAS_WIDTH - 10, 28);
    ctx.restore();
  }

  // Floating texts
  drawFloatingTexts();

  // Flash overlay
  if (Game.flashAlpha > 0) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,' + Game.flashAlpha + ')';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  // State-specific overlays
  if (Game.state === STATE_TITLE) drawTitle();
  if (Game.state === STATE_GAMEOVER) drawGameOver();

  ctx.restore();

  // CRT overlay (top-most)
  drawCrtOverlay();
}

// === MAIN LOOP ===
function frame(now) {
  if (!Game.running) return;
  let dt = now - Game.lastFrameTime;
  if (Game.lastFrameTime === 0) dt = 16;
  Game.lastFrameTime = now;
  if (dt > 100) dt = 100;

  // ESC pending timer
  if (Game.escPendingTimer > 0) {
    Game.escPendingTimer -= dt;
    if (Game.escPendingTimer <= 0) escOverlay.style.display = 'none';
  }

  // Update by state
  if (!Game.paused) {
    switch (Game.state) {
      case STATE_LOADING: updateLoading(dt); break;
      case STATE_TITLE:   updateTitle(dt); break;
      case STATE_PLAYING: updatePlaying(dt); break;
      case STATE_GAMEOVER:updateGameOver(dt); break;
    }
  }

  // Update HUD title
  if (Game.state === STATE_PLAYING || Game.state === STATE_PAUSED || Game.state === STATE_GAMEOVER) {
    hudTitleEl.textContent = 'RACING — ' + Math.floor(Game.distance) + 'm';
  } else if (Game.state === STATE_TITLE) {
    hudTitleEl.textContent = 'RACING — READY';
  } else {
    hudTitleEl.textContent = 'RACING — LOADING';
  }

  render();
  requestAnimationFrame(frame);
}

// === INIT ===
function init() {
  Particles.init();
  Game.state = STATE_LOADING;
  Game.loadingStartTime = performance.now();
  Game.lastFrameTime = 0;
  // Build audio on first user gesture; pre-create so first SFX has minimal latency
  document.addEventListener('pointerdown', () => { AudioEngine.init(); AudioEngine.resume(); }, { once: true });
  
  // Resize handler — scale content to fit
  function fitToScreen() {
    const wrap = document.getElementById('gameContainer');
    if (!wrap) return;
    const wRatio = window.innerWidth / 400;
    const hRatio = window.innerHeight / 611;
    const scale = Math.min(wRatio, hRatio);
    wrap.style.transform = 'scale(' + scale + ')';
    wrap.style.transformOrigin = 'center center';
  }
  window.addEventListener('resize', fitToScreen);
  fitToScreen();
  
  requestAnimationFrame(frame);
}

init();
</script>
</body>
</html>
`;

export const RacingGame = () => (
  <iframe
    srcDoc={RACING_HTML}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background: '#050505',
    }}
    title="Racing"
    sandbox="allow-scripts allow-same-origin"
  />
);
