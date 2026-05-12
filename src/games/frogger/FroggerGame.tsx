const FROGGER_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>FROGGER — Neon Arcade</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-user-select: none;
  }
  html, body {
    width: 100%;
    height: 100%;
    background: #050505;
    overflow: hidden;
    font-family: 'Courier New', monospace;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  #gameWrap {
    position: relative;
    width: 420px;
    height: 541px;
    background: #050505;
    box-shadow: 0 0 40px rgba(136, 255, 0, 0.15);
  }
  #hudTop {
    position: absolute;
    top: 0;
    left: 0;
    width: 420px;
    height: 36px;
    background: rgba(0, 0, 0, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
    z-index: 10;
  }
  #btnExit {
    width: 70px;
    height: 28px;
    margin: 4px;
    background: rgba(255, 60, 60, 0.8);
    border: 1px solid rgba(255, 100, 100, 0.5);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.15s;
  }
  #btnExit:hover {
    background: rgba(255, 60, 60, 1);
  }
  #hudTitle {
    flex-grow: 1;
    text-align: center;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: bold;
    color: #88FF00;
    text-shadow: 0 0 8px #88FF00, 0 0 14px rgba(136, 255, 0, 0.5);
    letter-spacing: 1px;
  }
  .hudBtn {
    height: 28px;
    margin: 4px 2px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .hudBtn:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  #btnMute { width: 70px; }
  #btnPause { width: 85px; }
  #gameCanvas {
    position: absolute;
    top: 36px;
    left: 0;
    width: 420px;
    height: 450px;
    display: block;
    image-rendering: pixelated;
  }
  #crtOverlay {
    position: absolute;
    top: 36px;
    left: 0;
    width: 420px;
    height: 450px;
    pointer-events: none;
    background:
      repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px),
      radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.25) 100%);
    z-index: 5;
    transition: filter 0.08s;
  }
  #pauseOverlay {
    position: absolute;
    top: 36px;
    left: 0;
    width: 420px;
    height: 450px;
    background: rgba(0, 0, 0, 0.6);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 6;
    pointer-events: none;
  }
  #pauseOverlay span {
    color: #88FF00;
    font-family: 'Courier New', monospace;
    font-size: 32px;
    font-weight: bold;
    text-shadow: 0 0 12px #88FF00;
    letter-spacing: 4px;
  }
  #escHint {
    position: absolute;
    top: 36px;
    left: 0;
    width: 420px;
    height: 450px;
    background: rgba(0, 0, 0, 0.7);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 7;
    pointer-events: none;
    color: #FF6060;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: bold;
    text-shadow: 0 0 8px #FF0000;
  }
  #ctrlBar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 420px;
    height: 55px;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    z-index: 10;
  }
  #dpad {
    display: grid;
    grid-template-columns: 45px 45px 45px;
    grid-template-rows: 22px 22px;
    gap: 1px;
    width: 137px;
  }
  .dBtn {
    background: rgba(136, 255, 0, 0.15);
    border: 1px solid rgba(136, 255, 0, 0.4);
    color: #88FF00;
    font-size: 18px;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.08s;
    border-radius: 4px;
  }
  .dBtn:active, .dBtn.pressed {
    transform: scale(0.9);
    filter: brightness(2);
    background: rgba(136, 255, 0, 0.4);
  }
  #dUp { grid-column: 2; grid-row: 1; }
  #dLeft { grid-column: 1; grid-row: 2; }
  #dDown { grid-column: 2; grid-row: 2; }
  #dRight { grid-column: 3; grid-row: 2; }
  #actBtns {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .actBtn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: rgba(0, 187, 255, 0.2);
    border: 1px solid rgba(0, 187, 255, 0.5);
    color: #00BBFF;
    font-family: 'Courier New', monospace;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.08s;
  }
  .actBtn:active, .actBtn.pressed {
    transform: scale(0.9);
    filter: brightness(2);
    background: rgba(0, 187, 255, 0.4);
  }
  #ctrlHint {
    position: absolute;
    bottom: 56px;
    right: 4px;
    color: rgba(255,255,255,0.3);
    font-size: 9px;
    font-family: 'Courier New', monospace;
    pointer-events: none;
  }
</style>
</head>
<body>
<div id="gameWrap">
  <div id="hudTop">
    <button id="btnExit">✕ EXIT</button>
    <div id="hudTitle">FROGGER — 0</div>
    <button id="btnMute" class="hudBtn">🔊 SFX</button>
    <button id="btnPause" class="hudBtn">⏸ PAUSE</button>
  </div>
  <canvas id="gameCanvas" width="420" height="450"></canvas>
  <div id="crtOverlay"></div>
  <div id="pauseOverlay"><span>PAUSED</span></div>
  <div id="escHint">Press ESC again to exit</div>
  <div id="ctrlBar">
    <div id="dpad">
      <button class="dBtn" id="dUp">▲</button>
      <button class="dBtn" id="dLeft">◀</button>
      <button class="dBtn" id="dDown">▼</button>
      <button class="dBtn" id="dRight">▶</button>
    </div>
    <div id="actBtns">
      <button class="actBtn" id="btnA">A</button>
      <button class="actBtn" id="btnB">B</button>
    </div>
  </div>
  <div id="ctrlHint">WASD/Arrows · P · M · ESC</div>
</div>
<script>
'use strict';

// === CONSTANTS ===
const GRID_COLS = 14;
const GRID_ROWS = 15;
const CELL_SIZE = 30;
const GAME_WIDTH = GRID_COLS * CELL_SIZE;
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE;
const HUD_HEIGHT = 36;
const CTRL_HEIGHT = 55;

const ROW_GOAL = 0;
const ROW_RIVER_START = 1;
const ROW_RIVER_END = 6;
const ROW_MEDIAN = 7;
const ROW_ROAD_START = 8;
const ROW_ROAD_END = 13;
const ROW_START = 14;

const COLOR_BG = '#050505';
const COLOR_NEON_GREEN = '#88FF00';
const COLOR_NEON_BLUE = '#00BBFF';
const COLOR_WATER = '#001133';
const COLOR_MEDIAN = '#333333';
const COLOR_ASPHALT = '#1A1A1A';
const COLOR_LILY = '#2A6B2A';
const COLOR_LILY_GLOW = '#5BCC5B';
const COLOR_LOG = '#6B3F1F';
const COLOR_LOG_DARK = '#4A2A12';
const COLOR_TURTLE = '#2A5A1A';
const COLOR_TURTLE_LIGHT = '#5BA044';
const COLOR_DANGER = '#FF3030';
const COLOR_FROG_BODY = '#88FF00';
const COLOR_FROG_DARK = '#4A8800';
const COLOR_BUBBLE = '#5BC2FF';

const STATE_LOADING = 'LOADING';
const STATE_TITLE = 'TITLE';
const STATE_PLAYING = 'PLAYING';
const STATE_PAUSED = 'PAUSED';
const STATE_GAME_OVER = 'GAME_OVER';
const STATE_HIGHSCORE = 'HIGHSCORE';
const STATE_LEVEL_INTRO = 'LEVEL_INTRO';

const HOP_DURATION_MS = 125;
const HOP_ARC_PEAK = 8;
const HOP_ROTATION_DEG = 10;
const TIMER_DURATION_S = 30;
const STARTING_LIVES = 3;
const PARTICLE_POOL_SIZE = 500;

const SCORE_HOP_FORWARD = 10;
const SCORE_LILY_PAD = 50;
const SCORE_FLY_BONUS = 200;
const SCORE_LEVEL_COMPLETE = 1000;
const SCORE_TIME_BONUS_PER_S = 10;

const NUM_LILY_PADS = 5;
const FLY_ROTATE_INTERVAL_MS = 8000;

const DEATH_ANIM_MS = 500;
const RESPAWN_DELAY_MS = 500;

const MUSIC_BPM_BASE = 130;
const MUSIC_VOLUME = 0.25;
const SFX_VOLUME = 0.4;

const STORAGE_HIGHSCORE = 'hs_frogger';
const STORAGE_LEADERBOARD = 'lb_frogger';
const STORAGE_MUTE = 'mute_frogger';

const DIR_UP = 0;
const DIR_RIGHT = 1;
const DIR_DOWN = 2;
const DIR_LEFT = 3;

const DEATH_NONE = 0;
const DEATH_CAR = 1;
const DEATH_DROWN = 2;
const DEATH_TIMEOUT = 3;
const DEATH_HAZARD = 4;

const VEH_CAR_SMALL = 'CAR_SMALL';
const VEH_CAR_SPORT = 'CAR_SPORT';
const VEH_TRUCK = 'TRUCK';
const VEH_18WHEELER = '18WHEELER';
const VEH_VAN = 'VAN';

const PLATFORM_LOG = 'LOG';
const PLATFORM_TURTLE = 'TURTLE';

const HAZARD_SNAKE = 'SNAKE';
const HAZARD_SCORPION = 'SCORPION';

// === HUD SETUP ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hudTitleEl = document.getElementById('hudTitle');
const btnExit = document.getElementById('btnExit');
const btnMute = document.getElementById('btnMute');
const btnPause = document.getElementById('btnPause');
const pauseOverlay = document.getElementById('pauseOverlay');
const escHintEl = document.getElementById('escHint');
const crtOverlay = document.getElementById('crtOverlay');

function updateHudTitle(score) {
  hudTitleEl.textContent = 'FROGGER — ' + score;
}

function updateMuteBtn(isMuted) {
  btnMute.textContent = isMuted ? '🔇 SFX' : '🔊 SFX';
}

function updatePauseBtn(isPaused) {
  btnPause.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';
}

function showPauseOverlay(show) {
  pauseOverlay.style.display = show ? 'flex' : 'none';
}

let escHintTimer = 0;
function showEscHint() {
  escHintEl.style.display = 'flex';
  escHintTimer = performance.now();
}
function hideEscHint() {
  escHintEl.style.display = 'none';
  escHintTimer = 0;
}

// === AUDIO ENGINE ===
const AudioEngine = {
  ctx: null,
  musicGain: null,
  sfxGain: null,
  masterGain: null,
  muted: false,
  musicTickHandle: 0,
  musicStep: 0,
  musicBpm: MUSIC_BPM_BASE,
  musicBeatMs: 0,
  lastMusicBeat: 0,
  melody: [5, 7, 9, 10, 12, 10, 9, 7, 5, 7, 9, 12, 14, 12, 10, 9],
  bass:   [0, 0, 4, 4, 5, 5, 0, 0, 2, 2, 5, 5, 7, 7, 4, 4],
  initialized: false,

  init() {
    if (this.initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = MUSIC_VOLUME;
      this.musicGain.connect(this.masterGain);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = SFX_VOLUME;
      this.sfxGain.connect(this.masterGain);
      this.musicBeatMs = (60000 / this.musicBpm) / 2;
      this.initialized = true;
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  setMuted(m) {
    this.muted = m;
    if (this.masterGain) this.masterGain.gain.value = m ? 0 : 1.0;
  },

  freqFromNote(n) {
    // n = semitone offset from F4 (349.23Hz)
    return 349.23 * Math.pow(2, n / 12);
  },

  playTone(freq, duration, type, vol, attack, release, target) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    const t0 = this.ctx.currentTime;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + (attack || 0.005));
    gain.gain.linearRampToValueAtTime(0, t0 + duration);
    osc.connect(gain);
    gain.connect(target || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  },

  playSweep(freqStart, freqEnd, duration, type, vol, target) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type || 'sine';
    const t0 = this.ctx.currentTime;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.005);
    gain.gain.linearRampToValueAtTime(0, t0 + duration);
    osc.connect(gain);
    gain.connect(target || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  },

  playNoise(duration, highpass, vol, target) {
    if (!this.ctx || this.muted) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = highpass || 0;
    const gain = this.ctx.createGain();
    const t0 = this.ctx.currentTime;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.linearRampToValueAtTime(0, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(target || this.sfxGain);
    src.start(t0);
    src.stop(t0 + duration + 0.05);
  },

  sfxHop() {
    this.playTone(440, 0.03, 'sine', 0.5);
  },

  sfxLand() {
    this.playTone(180, 0.03, 'sine', 0.5);
  },

  sfxLilyPad() {
    this.playTone(this.freqFromNote(0), 0.05, 'sine', 0.5);
    setTimeout(() => this.playTone(this.freqFromNote(4), 0.05, 'sine', 0.5), 50);
    setTimeout(() => this.playTone(this.freqFromNote(7), 0.06, 'sine', 0.55), 100);
  },

  sfxFlyBonus() {
    this.playTone(1200, 0.05, 'sine', 0.4);
    setTimeout(() => this.playTone(1800, 0.05, 'sine', 0.4), 30);
    setTimeout(() => this.playTone(2400, 0.1, 'sine', 0.5), 70);
  },

  sfxCarHit() {
    this.playSweep(200, 50, 0.1, 'sawtooth', 0.6);
    this.playNoise(0.1, 200, 0.4);
  },

  sfxDrown() {
    this.playSweep(600, 100, 0.3, 'sine', 0.5);
  },

  sfxTimeout() {
    this.playSweep(800, 200, 0.4, 'square', 0.4);
  },

  sfxLevelComplete() {
    const notes = [0, 2, 4, 5, 7, 12];
    notes.forEach((n, i) => {
      setTimeout(() => this.playTone(this.freqFromNote(n), 0.12, 'sine', 0.55), i * 120);
    });
  },

  sfxHazardWarning() {
    for (let i = 0; i < 4; i++) {
      setTimeout(() => this.playTone(280, 0.04, 'square', 0.4), i * 50);
    }
  },

  sfxDeathFinal() {
    this.playSweep(400, 30, 0.8, 'sawtooth', 0.5);
    this.playNoise(0.8, 50, 0.2);
  },

  sfxUiClick() {
    this.playTone(1200, 0.01, 'square', 0.3);
  },

  startMusic() {
    if (!this.ctx) return;
    this.musicStep = 0;
    this.lastMusicBeat = performance.now();
  },

  updateMusicTempo(score) {
    this.musicBpm = MUSIC_BPM_BASE + Math.floor(score / 500) * 2;
    this.musicBeatMs = (60000 / this.musicBpm) / 2;
  },

  tickMusic(nowMs) {
    if (!this.ctx || this.muted) return;
    if (nowMs - this.lastMusicBeat >= this.musicBeatMs) {
      this.lastMusicBeat = nowMs;
      const melNote = this.melody[this.musicStep % this.melody.length];
      const basNote = this.bass[this.musicStep % this.bass.length];
      this.playTone(this.freqFromNote(melNote), 0.18, 'sine', 0.25, 0.01, 0.05, this.musicGain);
      this.playTone(this.freqFromNote(basNote - 12), 0.22, 'sine', 0.3, 0.01, 0.05, this.musicGain);
      if (this.musicStep % 4 === 0) {
        // kick
        this.playSweep(100, 30, 0.06, 'sine', 0.3, this.musicGain);
      }
      if (this.musicStep % 2 === 1) {
        // hi-hat
        this.playNoise(0.02, 8000, 0.08, this.musicGain);
      }
      this.musicStep++;
    }
  },

  closeAll() {
    if (this.ctx) {
      try { this.ctx.close(); } catch (e) {}
      this.ctx = null;
      this.initialized = false;
    }
  }
};

// === PARTICLE SYSTEM ===
const PARTICLE_SPARK = 'SPARK';
const PARTICLE_CIRCLE = 'CIRCLE';
const PARTICLE_STAR = 'STAR';
const PARTICLE_TRAIL = 'TRAIL';

const Particles = {
  pool: [],
  init() {
    this.pool = [];
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.pool.push({
        active: false,
        type: PARTICLE_SPARK,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        size: 2, color: '#FFFFFF',
        gravity: false
      });
    }
  },
  spawn(type, x, y, vx, vy, life, size, color, gravity) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.type = type;
        p.x = x; p.y = y; p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.size = size; p.color = color;
        p.gravity = !!gravity;
        return p;
      }
    }
    return null;
  },
  burstCarHit(x, y) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 60 + Math.random() * 60;
      this.spawn(PARTICLE_SPARK, x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        0.6, 2, COLOR_NEON_GREEN, true);
    }
  },
  burstDrown(x, y) {
    for (let i = 0; i < 8; i++) {
      const speed = 20 + Math.random() * 30;
      this.spawn(PARTICLE_CIRCLE, x + (Math.random()-0.5)*16, y,
        (Math.random()-0.5) * 20,
        -speed,
        1.0, 3 + Math.random()*3, COLOR_BUBBLE, false);
    }
  },
  burstLilyLand(x, y) {
    for (let i = 0; i < 4; i++) {
      this.spawn(PARTICLE_CIRCLE, x, y, 0, 0, 0.5, 4, COLOR_NEON_BLUE, false);
    }
  },
  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += 200 * dt;
    }
  },
  render(c) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      c.save();
      c.globalAlpha = alpha;
      c.fillStyle = p.color;
      c.shadowBlur = 8;
      c.shadowColor = p.color;
      if (p.type === PARTICLE_SPARK) {
        c.fillRect(Math.floor(p.x - p.size/2), Math.floor(p.y - p.size/2), p.size, p.size);
      } else if (p.type === PARTICLE_CIRCLE) {
        c.beginPath();
        c.arc(Math.floor(p.x), Math.floor(p.y), p.size * (p.type === PARTICLE_CIRCLE ? 1 : 1), 0, Math.PI*2);
        c.fill();
      }
      c.restore();
    }
  }
};

// === GAME STATE ===
const Game = {
  state: STATE_LOADING,
  loadingStart: 0,
  loadingDuration: 1500,
  score: 0,
  highscore: 0,
  leaderboard: [],
  lives: STARTING_LIVES,
  level: 1,
  frog: null,
  vehicles: [],
  platforms: [],
  lilyPads: [],
  flySlotIndex: -1,
  flyTimer: 0,
  hazards: [],
  hazardWarningTimer: 0,
  hazardWarningActive: false,
  hazardNextSpawn: 0,
  timer: TIMER_DURATION_S,
  shakeAmount: 0,
  shakeDecay: 0,
  flashColor: null,
  flashAmount: 0,
  slowMoTimer: 0,
  deathType: DEATH_NONE,
  deathTimer: 0,
  respawnTimer: 0,
  floatingTexts: [],
  levelIntroTimer: 0,
  levelIntroDuration: 1800,
  titleHopTimer: 0,
  titleFrogCol: 7,
  titleFrogRow: 12,
  titleHopOffset: 0,
  crtFlickerTimer: 0,
  gameOverDelay: 0,
  initialsEntry: '',
  paused: false
};

function loadHighScore() {
  try {
    const v = localStorage.getItem(STORAGE_HIGHSCORE);
    Game.highscore = v ? parseInt(v) : 0;
    const lb = localStorage.getItem(STORAGE_LEADERBOARD);
    Game.leaderboard = lb ? JSON.parse(lb) : [];
  } catch(e) {
    Game.highscore = 0;
    Game.leaderboard = [];
  }
}

function saveHighScore() {
  try {
    if (Game.score > Game.highscore) {
      Game.highscore = Game.score;
      localStorage.setItem(STORAGE_HIGHSCORE, String(Game.highscore));
    }
    Game.leaderboard.push(Game.score);
    Game.leaderboard.sort((a,b) => b - a);
    Game.leaderboard = Game.leaderboard.slice(0, 3);
    localStorage.setItem(STORAGE_LEADERBOARD, JSON.stringify(Game.leaderboard));
  } catch(e) {}
}

function loadMutePref() {
  try {
    const v = localStorage.getItem(STORAGE_MUTE);
    return v === 'true';
  } catch(e) { return false; }
}
function saveMutePref(m) {
  try { localStorage.setItem(STORAGE_MUTE, String(m)); } catch(e) {}
}

function createFrog() {
  return {
    col: Math.floor(GRID_COLS / 2),
    row: ROW_START,
    pixelX: Math.floor(GRID_COLS / 2) * CELL_SIZE + CELL_SIZE/2,
    pixelY: ROW_START * CELL_SIZE + CELL_SIZE/2,
    direction: DIR_UP,
    hopping: false,
    hopFromX: 0, hopFromY: 0,
    hopToX: 0, hopToY: 0,
    hopProgress: 0,
    riding: null,
    deathAnim: 0,
    deathType: DEATH_NONE,
    visible: true,
    scaleX: 1, scaleY: 1,
    farthestRowReached: ROW_START
  };
}

function spawnVehicle(row, type, dir, x) {
  let w;
  let color;
  switch (type) {
    case VEH_CAR_SMALL: w = 1.5; color = ['#FF3366', '#33FFAA', '#FFCC00', '#FF8800'][Math.floor(Math.random()*4)]; break;
    case VEH_CAR_SPORT: w = 1.5; color = ['#FF0066', '#00FFCC', '#FFFF00'][Math.floor(Math.random()*3)]; break;
    case VEH_TRUCK: w = 2.0; color = '#6A5A4A'; break;
    case VEH_18WHEELER: w = 3.0; color = '#3A3A3A'; break;
    case VEH_VAN: w = 2.0; color = '#E0E0E0'; break;
  }
  return {
    type, row, dir, color,
    widthCells: w,
    x: x,
    y: row * CELL_SIZE,
    width: w * CELL_SIZE,
    height: CELL_SIZE,
    speed: 0
  };
}

function spawnPlatform(row, type, dir, x, widthCells) {
  return {
    type, row, dir,
    x: x,
    y: row * CELL_SIZE,
    width: widthCells * CELL_SIZE,
    height: CELL_SIZE,
    widthCells: widthCells,
    speed: 0,
    diveTimer: type === PLATFORM_TURTLE ? (4 + Math.random() * 6) : 0,
    diveState: 'visible', // visible, warning, submerged
    flashTimer: 0
  };
}

function setupLevel(level) {
  Game.vehicles = [];
  Game.platforms = [];
  Game.lilyPads = [];
  Game.hazards = [];
  Game.hazardNextSpawn = 8 + Math.random() * 6;
  Game.hazardWarningActive = false;

  const lvlMult = 1 + (level - 1) * 0.15;

  // Lily pads — 5 evenly spaced
  for (let i = 0; i < NUM_LILY_PADS; i++) {
    const col = Math.floor((i + 0.5) * (GRID_COLS / NUM_LILY_PADS));
    Game.lilyPads.push({
      col: col,
      filled: false,
      pulse: Math.random() * Math.PI * 2
    });
  }
  Game.flySlotIndex = Math.floor(Math.random() * NUM_LILY_PADS);
  Game.flyTimer = FLY_ROTATE_INTERVAL_MS / 1000;

  // River rows (1..6)
  // Row 1: logs LR slow (medium)
  // Row 2: turtles RL
  // Row 3: logs LR (long)
  // Row 4: logs RL
  // Row 5: turtles LR (faster, can dive)
  // Row 6: logs LR (short, fast)
  const riverConfigs = [
    { row: 1, type: PLATFORM_LOG, dir: 1, baseSpeed: 35, widthCells: 3, gap: 5, count: 3 },
    { row: 2, type: PLATFORM_TURTLE, dir: -1, baseSpeed: 30, widthCells: 1, gap: 4, count: 4, group: 3 },
    { row: 3, type: PLATFORM_LOG, dir: 1, baseSpeed: 40, widthCells: 4, gap: 6, count: 3 },
    { row: 4, type: PLATFORM_LOG, dir: -1, baseSpeed: 50, widthCells: 2, gap: 4, count: 3 },
    { row: 5, type: PLATFORM_TURTLE, dir: 1, baseSpeed: 35, widthCells: 1, gap: 3, count: 4, group: 2 },
    { row: 6, type: PLATFORM_LOG, dir: 1, baseSpeed: 60, widthCells: 2, gap: 5, count: 3 }
  ];

  riverConfigs.forEach(cfg => {
    let cursor = cfg.dir > 0 ? -cfg.widthCells * 2 * CELL_SIZE : GAME_WIDTH;
    for (let i = 0; i < cfg.count; i++) {
      if (cfg.type === PLATFORM_TURTLE) {
        const grp = cfg.group || 2;
        for (let g = 0; g < grp; g++) {
          const px = cursor + g * CELL_SIZE * 1;
          const p = spawnPlatform(cfg.row, PLATFORM_TURTLE, cfg.dir, px, 1);
          p.speed = cfg.baseSpeed * lvlMult * cfg.dir;
          p.groupId = cfg.row * 100 + i;
          Game.platforms.push(p);
        }
        cursor += (cfg.group * CELL_SIZE) + (cfg.gap * CELL_SIZE);
      } else {
        const p = spawnPlatform(cfg.row, PLATFORM_LOG, cfg.dir, cursor, cfg.widthCells);
        p.speed = cfg.baseSpeed * lvlMult * cfg.dir;
        Game.platforms.push(p);
        cursor += (cfg.widthCells + cfg.gap) * CELL_SIZE;
      }
    }
  });

  // Road rows (8..13)
  // Row 8: 18-wheelers slow (LR)
  // Row 9: cars fast (RL)
  // Row 10: trucks med (LR)
  // Row 11: sports cars very fast (RL)
  // Row 12: vans (LR)
  // Row 13: small cars (RL)
  const roadConfigs = [
    { row: 8, type: VEH_18WHEELER, dir: 1, baseSpeed: 30, count: 2, gap: 8 },
    { row: 9, type: VEH_CAR_SMALL, dir: -1, baseSpeed: 80, count: 3, gap: 5 },
    { row: 10, type: VEH_TRUCK, dir: 1, baseSpeed: 50, count: 3, gap: 5 },
    { row: 11, type: VEH_CAR_SPORT, dir: -1, baseSpeed: 110, count: 3, gap: 6 },
    { row: 12, type: VEH_VAN, dir: 1, baseSpeed: 55, count: 3, gap: 5 },
    { row: 13, type: VEH_CAR_SMALL, dir: -1, baseSpeed: 70, count: 3, gap: 5 }
  ];

  roadConfigs.forEach(cfg => {
    const widthCells = cfg.type === VEH_18WHEELER ? 3 : (cfg.type === VEH_TRUCK || cfg.type === VEH_VAN ? 2 : 1.5);
    let cursor = cfg.dir > 0 ? -widthCells * CELL_SIZE * 2 : GAME_WIDTH;
    for (let i = 0; i < cfg.count; i++) {
      const v = spawnVehicle(cfg.row, cfg.type, cfg.dir, cursor);
      v.speed = cfg.baseSpeed * lvlMult * cfg.dir;
      Game.vehicles.push(v);
      cursor += (widthCells + cfg.gap) * CELL_SIZE * cfg.dir;
      if (cfg.dir < 0) cursor = cursor; // moves backward already
    }
  });
}

function startNewGame() {
  Game.score = 0;
  Game.lives = STARTING_LIVES;
  Game.level = 1;
  Game.frog = createFrog();
  Game.frog.farthestRowReached = ROW_START;
  Game.timer = TIMER_DURATION_S;
  Game.deathType = DEATH_NONE;
  Game.deathTimer = 0;
  Game.respawnTimer = 0;
  Game.floatingTexts = [];
  Game.shakeAmount = 0;
  Game.flashAmount = 0;
  Game.slowMoTimer = 0;
  setupLevel(Game.level);
  updateHudTitle(Game.score);
  AudioEngine.startMusic();
  startLevelIntro();
}

function startLevelIntro() {
  Game.state = STATE_LEVEL_INTRO;
  Game.levelIntroTimer = 0;
}

function resetFrogPosition() {
  Game.frog = createFrog();
  Game.timer = TIMER_DURATION_S;
}

function addFloatingText(text, x, y, color) {
  Game.floatingTexts.push({
    text: text, x: x, y: y, color: color || COLOR_NEON_GREEN, life: 0.8, maxLife: 0.8
  });
}

function applyShake(amount) {
  if (amount > Game.shakeAmount) Game.shakeAmount = amount;
  Game.shakeDecay = 300;
}

function applyFlash(color, amount) {
  Game.flashColor = color;
  Game.flashAmount = amount;
}

// === INPUT HANDLER ===
const Input = {
  pendingDir: -1,
  init() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    document.getElementById('dUp').addEventListener('touchstart', e => { e.preventDefault(); this.handleDir(DIR_UP); }, {passive: false});
    document.getElementById('dDown').addEventListener('touchstart', e => { e.preventDefault(); this.handleDir(DIR_DOWN); }, {passive: false});
    document.getElementById('dLeft').addEventListener('touchstart', e => { e.preventDefault(); this.handleDir(DIR_LEFT); }, {passive: false});
    document.getElementById('dRight').addEventListener('touchstart', e => { e.preventDefault(); this.handleDir(DIR_RIGHT); }, {passive: false});
    document.getElementById('dUp').addEventListener('mousedown', e => { e.preventDefault(); this.handleDir(DIR_UP); });
    document.getElementById('dDown').addEventListener('mousedown', e => { e.preventDefault(); this.handleDir(DIR_DOWN); });
    document.getElementById('dLeft').addEventListener('mousedown', e => { e.preventDefault(); this.handleDir(DIR_LEFT); });
    document.getElementById('dRight').addEventListener('mousedown', e => { e.preventDefault(); this.handleDir(DIR_RIGHT); });
    document.getElementById('btnA').addEventListener('touchstart', e => { e.preventDefault(); this.handleAction(); }, {passive: false});
    document.getElementById('btnB').addEventListener('touchstart', e => { e.preventDefault(); this.handleAction(); }, {passive: false});
    document.getElementById('btnA').addEventListener('mousedown', e => { e.preventDefault(); this.handleAction(); });
    document.getElementById('btnB').addEventListener('mousedown', e => { e.preventDefault(); this.handleAction(); });
    canvas.addEventListener('touchstart', e => { this.handleAction(); }, {passive: true});
    canvas.addEventListener('mousedown', e => { this.handleAction(); });
  },

  onKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleEscape();
      return;
    }
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      togglePause();
      return;
    }
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
      return;
    }
    if (Game.state === STATE_TITLE || Game.state === STATE_GAME_OVER) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.handleAction();
        return;
      }
    }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); this.handleDir(DIR_UP); }
    else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { e.preventDefault(); this.handleDir(DIR_DOWN); }
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); this.handleDir(DIR_LEFT); }
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); this.handleDir(DIR_RIGHT); }
  },

  handleDir(dir) {
    AudioEngine.init();
    AudioEngine.resume();
    if (Game.state === STATE_TITLE) {
      this.handleAction();
      return;
    }
    if (Game.state !== STATE_PLAYING || Game.paused) return;
    if (!Game.frog || Game.frog.hopping || Game.deathType !== DEATH_NONE) return;
    tryHop(dir);
  },

  handleAction() {
    AudioEngine.init();
    AudioEngine.resume();
    AudioEngine.sfxUiClick();
    if (Game.state === STATE_TITLE) {
      Game.state = STATE_PLAYING;
      startNewGame();
    } else if (Game.state === STATE_GAME_OVER) {
      if (Game.gameOverDelay <= 0) {
        Game.state = STATE_TITLE;
      }
    }
  }
};

function handleEscape() {
  if (escHintTimer > 0 && (performance.now() - escHintTimer) < 1500) {
    doExit();
    return;
  }
  showEscHint();
}

function doExit() {
  AudioEngine.closeAll();
  try { window.parent.postMessage({action:'exitGame'}, '*'); } catch(e) {}
  try { window.dispatchEvent(new CustomEvent('gameExit')); } catch(e) {}
}

function togglePause() {
  if (Game.state !== STATE_PLAYING && Game.state !== STATE_PAUSED) return;
  Game.paused = !Game.paused;
  if (Game.paused) {
    Game.state = STATE_PAUSED;
    showPauseOverlay(true);
  } else {
    Game.state = STATE_PLAYING;
    showPauseOverlay(false);
  }
  updatePauseBtn(Game.paused);
}

function toggleMute() {
  AudioEngine.setMuted(!AudioEngine.muted);
  saveMutePref(AudioEngine.muted);
  updateMuteBtn(AudioEngine.muted);
}

btnExit.addEventListener('click', doExit);
btnPause.addEventListener('click', () => { AudioEngine.init(); togglePause(); });
btnMute.addEventListener('click', () => { AudioEngine.init(); toggleMute(); });

// === GAME LOGIC ===
function tryHop(dir) {
  const frog = Game.frog;
  let newCol = frog.col;
  let newRow = frog.row;
  switch (dir) {
    case DIR_UP: newRow--; break;
    case DIR_DOWN: newRow++; break;
    case DIR_LEFT: newCol--; break;
    case DIR_RIGHT: newCol++; break;
  }
  if (newCol < 0 || newCol >= GRID_COLS || newRow < 0 || newRow > GRID_ROWS - 1) return;

  frog.direction = dir;
  frog.hopping = true;
  frog.hopFromX = frog.pixelX;
  frog.hopFromY = frog.pixelY;
  frog.hopToX = newCol * CELL_SIZE + CELL_SIZE/2;
  frog.hopToY = newRow * CELL_SIZE + CELL_SIZE/2;
  frog.hopProgress = 0;
  frog.col = newCol;
  frog.row = newRow;
  frog.riding = null;
  AudioEngine.sfxHop();

  // Score for forward progress
  if (newRow < frog.farthestRowReached) {
    frog.farthestRowReached = newRow;
    Game.score += SCORE_HOP_FORWARD;
    addFloatingText('+' + SCORE_HOP_FORWARD, frog.hopToX, frog.hopToY - 16, COLOR_NEON_GREEN);
    updateHudTitle(Game.score);
  }
}

function updateFrog(dt) {
  const frog = Game.frog;
  if (!frog) return;

  if (Game.deathType !== DEATH_NONE) {
    updateDeathAnimation(dt);
    return;
  }

  if (frog.hopping) {
    frog.hopProgress += (dt * 1000) / HOP_DURATION_MS;
    if (frog.hopProgress >= 1) {
      frog.hopProgress = 1;
      frog.pixelX = frog.hopToX;
      frog.pixelY = frog.hopToY;
      frog.hopping = false;
      AudioEngine.sfxLand();
      onFrogLanded();
    } else {
      const t = frog.hopProgress;
      frog.pixelX = frog.hopFromX + (frog.hopToX - frog.hopFromX) * t;
      const linearY = frog.hopFromY + (frog.hopToY - frog.hopFromY) * t;
      const arc = -Math.sin(t * Math.PI) * HOP_ARC_PEAK;
      frog.pixelY = linearY + arc;
    }
  } else {
    // ride platform
    if (frog.riding) {
      frog.pixelX += frog.riding.speed * dt;
      frog.col = Math.floor(frog.pixelX / CELL_SIZE);
      // check if carried off
      if (frog.pixelX < 0 || frog.pixelX > GAME_WIDTH) {
        triggerDeath(DEATH_DROWN);
        return;
      }
    }

    // check water / road collision when not hopping
    if (frog.row >= ROW_RIVER_START && frog.row <= ROW_RIVER_END) {
      // Need to be on a platform
      const platform = findPlatformUnderFrog();
      if (!platform) {
        triggerDeath(DEATH_DROWN);
        return;
      }
      // Check if it's a submerged turtle
      if (platform.type === PLATFORM_TURTLE && platform.diveState === 'submerged') {
        triggerDeath(DEATH_DROWN);
        return;
      }
      frog.riding = platform;
    } else {
      frog.riding = null;
    }
  }

  // Update timer
  Game.timer -= dt;
  if (Game.timer <= 0) {
    Game.timer = 0;
    triggerDeath(DEATH_TIMEOUT);
  }
}

function findPlatformUnderFrog() {
  const frog = Game.frog;
  for (let i = 0; i < Game.platforms.length; i++) {
    const p = Game.platforms[i];
    if (p.row !== frog.row) continue;
    const frogCenter = frog.pixelX;
    if (frogCenter >= p.x && frogCenter <= p.x + p.width) {
      return p;
    }
  }
  return null;
}

function onFrogLanded() {
  const frog = Game.frog;

  // Check goal row
  if (frog.row === ROW_GOAL) {
    handleGoalLanding();
    return;
  }

  // Check road
  if (frog.row >= ROW_ROAD_START && frog.row <= ROW_ROAD_END) {
    if (checkVehicleCollision()) {
      triggerDeath(DEATH_CAR);
      return;
    }
  }

  // Check median hazards
  if (frog.row === ROW_MEDIAN) {
    if (checkHazardCollision()) {
      triggerDeath(DEATH_HAZARD);
      return;
    }
  }

  // Check river — need platform immediately on landing
  if (frog.row >= ROW_RIVER_START && frog.row <= ROW_RIVER_END) {
    const p = findPlatformUnderFrog();
    if (!p || (p.type === PLATFORM_TURTLE && p.diveState === 'submerged')) {
      triggerDeath(DEATH_DROWN);
      return;
    }
    frog.riding = p;
  }
}

function handleGoalLanding() {
  const frog = Game.frog;
  // Check if frog is on a lily pad
  let hitPad = -1;
  for (let i = 0; i < Game.lilyPads.length; i++) {
    const pad = Game.lilyPads[i];
    const padX = pad.col * CELL_SIZE + CELL_SIZE/2;
    if (Math.abs(frog.pixelX - padX) <= CELL_SIZE/2 + 2 && !pad.filled) {
      hitPad = i;
      break;
    }
  }
  if (hitPad === -1) {
    triggerDeath(DEATH_DROWN);
    return;
  }

  Game.lilyPads[hitPad].filled = true;

  let gained = SCORE_LILY_PAD;
  const timeBonus = Math.floor(Game.timer) * SCORE_TIME_BONUS_PER_S;
  gained += timeBonus;
  if (hitPad === Game.flySlotIndex) {
    gained += SCORE_FLY_BONUS;
    addFloatingText('FLY BONUS!', frog.pixelX, frog.pixelY - 28, '#FFFF00');
    AudioEngine.sfxFlyBonus();
    Game.flySlotIndex = -1;
  }
  Game.score += gained;
  addFloatingText('+' + gained, frog.pixelX, frog.pixelY - 16, COLOR_NEON_GREEN);
  AudioEngine.sfxLilyPad();
  Particles.burstLilyLand(frog.pixelX, frog.pixelY);
  updateHudTitle(Game.score);

  // Check level complete
  const allFilled = Game.lilyPads.every(p => p.filled);
  if (allFilled) {
    Game.score += SCORE_LEVEL_COMPLETE;
    addFloatingText('+' + SCORE_LEVEL_COMPLETE, GAME_WIDTH/2, GAME_HEIGHT/2, '#FFFF00');
    AudioEngine.sfxLevelComplete();
    Game.level++;
    setupLevel(Game.level);
    resetFrogPosition();
    updateHudTitle(Game.score);
    startLevelIntro();
    return;
  }

  resetFrogPosition();
  AudioEngine.updateMusicTempo(Game.score);
}

function checkVehicleCollision() {
  const frog = Game.frog;
  for (let i = 0; i < Game.vehicles.length; i++) {
    const v = Game.vehicles[i];
    if (v.row !== frog.row) continue;
    if (frog.pixelX >= v.x && frog.pixelX <= v.x + v.width) return true;
  }
  return false;
}

function checkHazardCollision() {
  const frog = Game.frog;
  for (let i = 0; i < Game.hazards.length; i++) {
    const h = Game.hazards[i];
    if (h.row !== frog.row) continue;
    if (frog.pixelX >= h.x && frog.pixelX <= h.x + h.width) return true;
  }
  return false;
}

function triggerDeath(type) {
  if (Game.deathType !== DEATH_NONE) return;
  Game.deathType = type;
  Game.deathTimer = 0;
  Game.slowMoTimer = 0.5;
  const frog = Game.frog;

  switch (type) {
    case DEATH_CAR:
    case DEATH_HAZARD:
      AudioEngine.sfxCarHit();
      Particles.burstCarHit(frog.pixelX, frog.pixelY);
      applyShake(8);
      applyFlash('#FF0000', 0.4);
      break;
    case DEATH_DROWN:
      AudioEngine.sfxDrown();
      Particles.burstDrown(frog.pixelX, frog.pixelY);
      applyShake(3);
      applyFlash(COLOR_NEON_BLUE, 0.3);
      break;
    case DEATH_TIMEOUT:
      AudioEngine.sfxTimeout();
      applyShake(2);
      applyFlash('#FFAA00', 0.3);
      break;
  }
}

function updateDeathAnimation(dt) {
  const frog = Game.frog;
  Game.deathTimer += dt * 1000;
  const t = Math.min(1, Game.deathTimer / DEATH_ANIM_MS);

  switch (Game.deathType) {
    case DEATH_CAR:
    case DEATH_HAZARD:
      const sq = Math.min(1, t * 5);
      frog.scaleX = 1 + sq * 2;
      frog.scaleY = 1 - sq * 0.8;
      break;
    case DEATH_DROWN:
      frog.pixelY += 30 * dt;
      frog.scaleX = 1 - t * 0.5;
      frog.scaleY = 1 - t * 0.5;
      if (t > 0.7) frog.visible = false;
      break;
    case DEATH_TIMEOUT:
      frog.scaleX = 1 - t;
      frog.scaleY = 1 - t;
      break;
  }

  if (Game.deathTimer >= DEATH_ANIM_MS) {
    Game.lives--;
    if (Game.lives <= 0) {
      doGameOver();
    } else {
      resetFrogPosition();
      Game.deathType = DEATH_NONE;
    }
  }
}

function doGameOver() {
  Game.state = STATE_GAME_OVER;
  Game.gameOverDelay = 1.2;
  AudioEngine.sfxDeathFinal();
  saveHighScore();
}

function updateVehicles(dt) {
  for (let i = 0; i < Game.vehicles.length; i++) {
    const v = Game.vehicles[i];
    v.x += v.speed * dt;
    // wrap
    if (v.speed > 0 && v.x > GAME_WIDTH + CELL_SIZE) {
      v.x = -v.width - Math.random() * CELL_SIZE * 3;
    } else if (v.speed < 0 && v.x + v.width < -CELL_SIZE) {
      v.x = GAME_WIDTH + Math.random() * CELL_SIZE * 3;
    }
  }
}

function updatePlatforms(dt) {
  for (let i = 0; i < Game.platforms.length; i++) {
    const p = Game.platforms[i];
    p.x += p.speed * dt;
    if (p.speed > 0 && p.x > GAME_WIDTH + CELL_SIZE) {
      p.x = -p.width - Math.random() * CELL_SIZE * 2;
      if (p.type === PLATFORM_TURTLE) {
        p.diveTimer = 4 + Math.random() * 6;
        p.diveState = 'visible';
      }
    } else if (p.speed < 0 && p.x + p.width < -CELL_SIZE) {
      p.x = GAME_WIDTH + Math.random() * CELL_SIZE * 2;
      if (p.type === PLATFORM_TURTLE) {
        p.diveTimer = 4 + Math.random() * 6;
        p.diveState = 'visible';
      }
    }

    if (p.type === PLATFORM_TURTLE) {
      p.diveTimer -= dt;
      const diveFreqMult = Game.level >= 3 ? 1.5 : 1.0;
      if (p.diveState === 'visible' && p.diveTimer <= 3 / diveFreqMult) {
        p.diveState = 'warning';
      }
      if (p.diveState === 'warning' && p.diveTimer <= 0) {
        p.diveState = 'submerged';
        p.diveTimer = 2.0;
      }
      if (p.diveState === 'submerged' && p.diveTimer <= 0) {
        p.diveState = 'visible';
        p.diveTimer = 5 + Math.random() * 5;
      }
      p.flashTimer += dt;
    }
  }
}

function updateHazards(dt) {
  // Hazards on median row
  const hazardFreqMult = Game.level >= 4 ? 1.5 : 1.0;
  Game.hazardNextSpawn -= dt * hazardFreqMult;

  if (Game.hazardWarningTimer > 0) {
    Game.hazardWarningTimer -= dt;
    if (Game.hazardWarningTimer <= 0) {
      // Spawn hazard
      const type = Math.random() < 0.5 ? HAZARD_SNAKE : HAZARD_SCORPION;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const x = dir > 0 ? -CELL_SIZE * 2 : GAME_WIDTH + CELL_SIZE;
      Game.hazards.push({
        type, dir, x: x,
        row: ROW_MEDIAN,
        width: CELL_SIZE * 1.5,
        speed: 40 * dir * (1 + (Game.level - 1) * 0.1),
        wiggle: 0
      });
      Game.hazardWarningActive = false;
      Game.hazardNextSpawn = 10 + Math.random() * 8;
    }
  } else if (Game.hazardNextSpawn <= 0 && Game.hazards.length < 2) {
    Game.hazardWarningTimer = 1.0;
    Game.hazardWarningActive = true;
    AudioEngine.sfxHazardWarning();
  }

  for (let i = Game.hazards.length - 1; i >= 0; i--) {
    const h = Game.hazards[i];
    h.x += h.speed * dt;
    h.wiggle += dt * 6;
    if ((h.speed > 0 && h.x > GAME_WIDTH + CELL_SIZE) ||
        (h.speed < 0 && h.x + h.width < -CELL_SIZE)) {
      Game.hazards.splice(i, 1);
    }
  }
}

function updateFly(dt) {
  Game.flyTimer -= dt;
  if (Game.flyTimer <= 0) {
    Game.flyTimer = FLY_ROTATE_INTERVAL_MS / 1000;
    // Pick a random unfilled pad
    const available = [];
    for (let i = 0; i < Game.lilyPads.length; i++) {
      if (!Game.lilyPads[i].filled) available.push(i);
    }
    if (available.length > 0) {
      Game.flySlotIndex = available[Math.floor(Math.random() * available.length)];
    } else {
      Game.flySlotIndex = -1;
    }
  }
}

function updateFloatingTexts(dt) {
  for (let i = Game.floatingTexts.length - 1; i >= 0; i--) {
    const t = Game.floatingTexts[i];
    t.life -= dt;
    t.y -= 20 * dt;
    if (t.life <= 0) Game.floatingTexts.splice(i, 1);
  }
}

function updateScreenEffects(dt) {
  if (Game.shakeDecay > 0) {
    Game.shakeDecay -= dt * 1000;
    Game.shakeAmount *= Math.max(0, Game.shakeDecay / 300);
  } else {
    Game.shakeAmount = 0;
  }
  if (Game.flashAmount > 0) {
    Game.flashAmount = Math.max(0, Game.flashAmount - dt * 1.5);
  }
  if (Game.slowMoTimer > 0) {
    Game.slowMoTimer -= dt;
  }
}

// === RENDERER ===
function renderBackgroundRows() {
  // Start zone (row 14) and median (row 7) and road (8-13)
  for (let r = 0; r < GRID_ROWS; r++) {
    let color;
    if (r === ROW_GOAL) color = '#001122';
    else if (r >= ROW_RIVER_START && r <= ROW_RIVER_END) color = COLOR_WATER;
    else if (r === ROW_MEDIAN) color = COLOR_MEDIAN;
    else if (r >= ROW_ROAD_START && r <= ROW_ROAD_END) color = COLOR_ASPHALT;
    else if (r === ROW_START) color = COLOR_MEDIAN;
    else color = COLOR_BG;
    ctx.fillStyle = color;
    ctx.fillRect(0, r * CELL_SIZE, GAME_WIDTH, CELL_SIZE);
  }

  // Lane dashes on road
  ctx.strokeStyle = 'rgba(255,255,200,0.15)';
  ctx.lineWidth = 1;
  for (let r = ROW_ROAD_START; r <= ROW_ROAD_END; r++) {
    if (r === ROW_ROAD_END) continue;
    ctx.setLineDash([10, 12]);
    ctx.beginPath();
    ctx.moveTo(0, (r + 1) * CELL_SIZE);
    ctx.lineTo(GAME_WIDTH, (r + 1) * CELL_SIZE);
    ctx.stroke();
  }
  ctx.setLineDash([]);
}

let waveTime = 0;
function renderWaterRipples() {
  ctx.save();
  ctx.strokeStyle = 'rgba(91, 194, 255, 0.18)';
  ctx.lineWidth = 1;
  for (let r = ROW_RIVER_START; r <= ROW_RIVER_END; r++) {
    for (let w = 0; w < 3; w++) {
      ctx.beginPath();
      const baseY = r * CELL_SIZE + 6 + w * 8;
      for (let x = 0; x <= GAME_WIDTH; x += 6) {
        const y = baseY + Math.sin((x * 0.05) + waveTime * 2 + r * 0.5 + w) * 1.2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}

function renderLilyPads() {
  for (let i = 0; i < Game.lilyPads.length; i++) {
    const pad = Game.lilyPads[i];
    const cx = pad.col * CELL_SIZE + CELL_SIZE/2;
    const cy = ROW_GOAL * CELL_SIZE + CELL_SIZE/2;
    pad.pulse += 0.05;
    const glowAmt = (Math.sin(pad.pulse) + 1) * 0.5;

    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = COLOR_LILY_GLOW;
    ctx.fillStyle = pad.filled ? COLOR_LILY_GLOW : COLOR_LILY;
    ctx.beginPath();
    ctx.ellipse(Math.floor(cx), Math.floor(cy), 13, 11, 0, 0, Math.PI*2);
    ctx.fill();
    // notch
    ctx.fillStyle = COLOR_WATER;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 6, cy - 10);
    ctx.lineTo(cx - 6, cy - 10);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    if (pad.filled) {
      // small frog silhouette
      ctx.fillStyle = COLOR_NEON_GREEN;
      ctx.beginPath();
      ctx.arc(cx, cy + 1, 7, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(cx - 3, cy - 3, 2, 2);
      ctx.fillRect(cx + 1, cy - 3, 2, 2);
    } else if (i === Game.flySlotIndex) {
      // fly bonus
      const flyBob = Math.sin(waveTime * 8) * 1.5;
      ctx.fillStyle = '#FFFF00';
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#FFFF00';
      ctx.beginPath();
      ctx.arc(cx, cy + flyBob, 3, 0, Math.PI*2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy + flyBob - 2);
      ctx.lineTo(cx + 4, cy + flyBob - 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function renderLog(p) {
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = COLOR_LOG;
  ctx.fillStyle = COLOR_LOG;
  ctx.beginPath();
  const r = 8;
  // rounded rect
  ctx.moveTo(x + r, y + 4);
  ctx.lineTo(x + p.width - r, y + 4);
  ctx.quadraticCurveTo(x + p.width, y + 4, x + p.width, y + 4 + r);
  ctx.lineTo(x + p.width, y + p.height - 4 - r);
  ctx.quadraticCurveTo(x + p.width, y + p.height - 4, x + p.width - r, y + p.height - 4);
  ctx.lineTo(x + r, y + p.height - 4);
  ctx.quadraticCurveTo(x, y + p.height - 4, x, y + p.height - 4 - r);
  ctx.lineTo(x, y + 4 + r);
  ctx.quadraticCurveTo(x, y + 4, x + r, y + 4);
  ctx.closePath();
  ctx.fill();
  // grain
  ctx.strokeStyle = COLOR_LOG_DARK;
  ctx.lineWidth = 1;
  for (let g = 0; g < 3; g++) {
    ctx.beginPath();
    ctx.moveTo(x + 4, y + 8 + g * 5);
    ctx.lineTo(x + p.width - 4, y + 8 + g * 5);
    ctx.stroke();
  }
  // end caps
  ctx.fillStyle = COLOR_LOG_DARK;
  ctx.beginPath();
  ctx.ellipse(x + 3, y + p.height/2, 2, 8, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + p.width - 3, y + p.height/2, 2, 8, 0, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function renderTurtle(p) {
  if (p.diveState === 'submerged') {
    // ripple only
    ctx.save();
    ctx.strokeStyle = 'rgba(91,194,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(p.x + p.width/2, p.y + p.height/2, 8 + Math.sin(p.flashTimer*4)*2, 4, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();
    return;
  }
  const x = Math.floor(p.x);
  const y = Math.floor(p.y);
  let color = COLOR_TURTLE;
  if (p.diveState === 'warning') {
    const blink = Math.sin(p.flashTimer * 18) > 0;
    color = blink ? '#1A3A0A' : COLOR_TURTLE;
  }
  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = COLOR_TURTLE_LIGHT;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x + p.width/2, y + p.height/2, p.width/2 - 3, p.height/2 - 5, 0, 0, Math.PI*2);
  ctx.fill();
  // pattern
  ctx.fillStyle = COLOR_TURTLE_LIGHT;
  ctx.beginPath();
  ctx.arc(x + p.width/2, y + p.height/2, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    const ang = i * Math.PI/2 + Math.PI/4;
    ctx.beginPath();
    ctx.arc(x + p.width/2 + Math.cos(ang)*5, y + p.height/2 + Math.sin(ang)*3, 1.5, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function renderPlatforms() {
  for (let i = 0; i < Game.platforms.length; i++) {
    const p = Game.platforms[i];
    if (p.type === PLATFORM_LOG) renderLog(p);
    else renderTurtle(p);
  }
}

function renderVehicle(v) {
  const x = Math.floor(v.x);
  const y = Math.floor(v.y);
  const w = v.width;
  const h = v.height;
  const frontIsRight = v.speed > 0;

  ctx.save();
  ctx.shadowBlur = 10;
  ctx.shadowColor = v.color;
  ctx.fillStyle = v.color;

  if (v.type === VEH_CAR_SMALL || v.type === VEH_CAR_SPORT) {
    // car body
    const radius = v.type === VEH_CAR_SPORT ? 4 : 3;
    roundedRect(ctx, x + 1, y + 4, w - 2, h - 8, radius);
    ctx.fill();
    // cabin
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundedRect(ctx, x + w * 0.3, y + 7, w * 0.4, h - 14, 2);
    ctx.fill();
  } else if (v.type === VEH_TRUCK) {
    // truck cab
    const cabW = w * 0.35;
    roundedRect(ctx, x + (frontIsRight ? w - cabW : 0), y + 4, cabW, h - 8, 3);
    ctx.fill();
    // cargo
    ctx.fillStyle = '#3A2A1A';
    roundedRect(ctx, x + (frontIsRight ? 0 : cabW), y + 5, w - cabW, h - 10, 2);
    ctx.fill();
    // cab window
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const wx = frontIsRight ? x + w - cabW * 0.85 : x + cabW * 0.15;
    ctx.fillRect(wx, y + 7, cabW * 0.7, 6);
  } else if (v.type === VEH_18WHEELER) {
    // cab
    const cabW = w * 0.2;
    roundedRect(ctx, x + (frontIsRight ? w - cabW : 0), y + 5, cabW, h - 10, 3);
    ctx.fill();
    // trailer
    ctx.fillStyle = '#5A5A5A';
    roundedRect(ctx, x + (frontIsRight ? 0 : cabW), y + 4, w - cabW, h - 8, 2);
    ctx.fill();
    // detail
    ctx.fillStyle = '#2A2A2A';
    ctx.fillRect(x + (frontIsRight ? cabW + 2 : 2), y + h/2 - 1, w - cabW - 4, 2);
  } else if (v.type === VEH_VAN) {
    roundedRect(ctx, x + 1, y + 3, w - 2, h - 6, 3);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    const wx = frontIsRight ? x + w * 0.65 : x + w * 0.05;
    ctx.fillRect(wx, y + 6, w * 0.3, 5);
    // side window
    ctx.fillRect(x + w*0.35, y + 6, w*0.3, 5);
  }

  // Headlights
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#FFFFAA';
  const hlx = frontIsRight ? x + w - 2 : x + 1;
  ctx.beginPath();
  ctx.arc(hlx, y + 8, 1.5, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(hlx, y + h - 8, 1.5, 0, Math.PI*2);
  ctx.fill();

  // Taillights
  ctx.fillStyle = '#FF2020';
  ctx.shadowColor = '#FF4040';
  const tlx = frontIsRight ? x + 1 : x + w - 1;
  ctx.beginPath();
  ctx.arc(tlx, y + 8, 1.2, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(tlx, y + h - 8, 1.2, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function roundedRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r);
  c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

function renderVehicles() {
  for (let i = 0; i < Game.vehicles.length; i++) {
    renderVehicle(Game.vehicles[i]);
  }
}

function renderHazards() {
  for (let i = 0; i < Game.hazards.length; i++) {
    const h = Game.hazards[i];
    const y = h.row * CELL_SIZE + CELL_SIZE/2;
    ctx.save();
    ctx.shadowBlur = 10;
    if (h.type === HAZARD_SNAKE) {
      ctx.shadowColor = '#FF4400';
      ctx.strokeStyle = '#FF6622';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let s = 0; s <= h.width; s += 2) {
        const px = h.x + s;
        const py = y + Math.sin(s * 0.3 + h.wiggle) * 4;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
      // head
      const headX = h.speed > 0 ? h.x + h.width : h.x;
      ctx.fillStyle = '#FF8844';
      ctx.beginPath();
      ctx.arc(headX, y, 4, 0, Math.PI*2);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#FFFF00';
      ctx.beginPath();
      ctx.arc(headX, y - 1, 1, 0, Math.PI*2);
      ctx.fill();
    } else {
      // scorpion
      ctx.shadowColor = '#FFAA00';
      ctx.fillStyle = '#AA6622';
      const bx = h.x + h.width/2;
      ctx.beginPath();
      ctx.ellipse(bx, y, 8, 5, 0, 0, Math.PI*2);
      ctx.fill();
      // claws
      const clawDir = h.speed > 0 ? 1 : -1;
      ctx.fillStyle = '#8A5020';
      ctx.beginPath();
      ctx.arc(bx + 8 * clawDir, y - 3, 2, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(bx + 8 * clawDir, y + 3, 2, 0, Math.PI*2);
      ctx.fill();
      // tail
      ctx.strokeStyle = '#AA6622';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx - 6 * clawDir, y);
      ctx.quadraticCurveTo(bx - 12 * clawDir, y - 6, bx - 10 * clawDir, y - 10);
      ctx.stroke();
      // stinger
      ctx.fillStyle = '#FFFF00';
      ctx.beginPath();
      ctx.arc(bx - 10 * clawDir, y - 10, 1.5, 0, Math.PI*2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Hazard warning
  if (Game.hazardWarningActive && Game.hazardWarningTimer > 0) {
    const blink = Math.sin(performance.now() * 0.02) > 0;
    if (blink) {
      ctx.save();
      ctx.fillStyle = COLOR_DANGER;
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLOR_DANGER;
      ctx.font = 'bold 14px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ DANGER ⚠', GAME_WIDTH/2, ROW_MEDIAN * CELL_SIZE + 20);
      ctx.restore();
    }
  }
}

function renderFrog() {
  const frog = Game.frog;
  if (!frog || !frog.visible) return;
  const x = frog.pixelX;
  const y = frog.pixelY;

  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.scale(frog.scaleX, frog.scaleY);

  // rotation lean during hop
  if (frog.hopping) {
    const t = frog.hopProgress;
    const leanAmt = Math.sin(t * Math.PI) * (HOP_ROTATION_DEG * Math.PI/180);
    let rotDir = 0;
    if (frog.direction === DIR_UP) rotDir = 0;
    else if (frog.direction === DIR_DOWN) rotDir = 0;
    else if (frog.direction === DIR_LEFT) rotDir = -1;
    else if (frog.direction === DIR_RIGHT) rotDir = 1;
    ctx.rotate(leanAmt * rotDir);
  }

  // facing rotation
  let faceRot = 0;
  switch (frog.direction) {
    case DIR_UP: faceRot = 0; break;
    case DIR_RIGHT: faceRot = Math.PI/2; break;
    case DIR_DOWN: faceRot = Math.PI; break;
    case DIR_LEFT: faceRot = -Math.PI/2; break;
  }
  ctx.rotate(faceRot);

  // legs (drawn first, behind body)
  ctx.shadowBlur = 12;
  ctx.shadowColor = COLOR_FROG_BODY;
  ctx.fillStyle = COLOR_FROG_DARK;
  // back legs
  roundedRect(ctx, -10, 4, 5, 8, 2); ctx.fill();
  roundedRect(ctx, 5, 4, 5, 8, 2); ctx.fill();
  // front legs
  roundedRect(ctx, -8, -10, 4, 6, 2); ctx.fill();
  roundedRect(ctx, 4, -10, 4, 6, 2); ctx.fill();

  // body
  ctx.fillStyle = COLOR_FROG_BODY;
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI*2);
  ctx.fill();

  // belly highlight
  ctx.fillStyle = '#BBFF44';
  ctx.beginPath();
  ctx.ellipse(0, 2, 7, 5, 0, 0, Math.PI*2);
  ctx.fill();

  // eyes
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(-4, -6, 3, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -6, 3, 0, Math.PI*2);
  ctx.fill();
  // pupils
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-4, -6, 1.5, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(4, -6, 1.5, 0, Math.PI*2);
  ctx.fill();

  ctx.restore();
}

function renderFloatingTexts() {
  for (let i = 0; i < Game.floatingTexts.length; i++) {
    const t = Game.floatingTexts[i];
    const alpha = Math.max(0, t.life / t.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = t.color;
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, t.x, t.y);
    ctx.restore();
  }
}

function renderTimerBar() {
  const pct = Game.timer / TIMER_DURATION_S;
  const barW = GAME_WIDTH - 80;
  const barX = 70;
  const barY = 6;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(barX, barY, barW, 6);
  let color = COLOR_NEON_GREEN;
  if (pct < 0.3) color = '#FF3030';
  else if (pct < 0.5) color = '#FFCC00';
  ctx.fillStyle = color;
  ctx.shadowBlur = 6;
  ctx.shadowColor = color;
  ctx.fillRect(barX, barY, barW * pct, 6);
  ctx.restore();
}

function renderLivesAndLevel() {
  // lives — small frog icons top-left of game area
  for (let i = 0; i < Game.lives; i++) {
    ctx.save();
    ctx.translate(8 + i * 16, 6);
    ctx.fillStyle = COLOR_FROG_BODY;
    ctx.shadowBlur = 5;
    ctx.shadowColor = COLOR_FROG_BODY;
    ctx.beginPath();
    ctx.arc(0, 4, 5, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 0;
    ctx.fillRect(-2, 1, 1.5, 1.5);
    ctx.fillRect(0.5, 1, 1.5, 1.5);
    ctx.restore();
  }
  // level top-right
  ctx.save();
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.font = 'bold 11px Courier New';
  ctx.textAlign = 'right';
  ctx.fillText('LV ' + Game.level, GAME_WIDTH - 4, 14);
  ctx.fillText('HI ' + Game.highscore, GAME_WIDTH - 4, 26);
  ctx.restore();
}

function renderTitleScreen() {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  renderWaterRipples();

  // big title
  ctx.save();
  ctx.fillStyle = COLOR_NEON_GREEN;
  ctx.shadowBlur = 16;
  ctx.shadowColor = COLOR_NEON_GREEN;
  ctx.font = 'bold 42px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('FROGGER', GAME_WIDTH/2, 130);
  ctx.font = '12px Courier New';
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.fillText('NEON ARCADE', GAME_WIDTH/2, 152);
  ctx.restore();

  // hopping demo frog
  Game.titleHopTimer += 0.04;
  Game.titleHopOffset = Math.abs(Math.sin(Game.titleHopTimer * 3)) * 16;
  ctx.save();
  ctx.translate(GAME_WIDTH/2, 220 - Game.titleHopOffset);
  ctx.fillStyle = COLOR_FROG_BODY;
  ctx.shadowBlur = 12;
  ctx.shadowColor = COLOR_FROG_BODY;
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(-5, -7, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, -7, 4, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-5, -7, 2, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(5, -7, 2, 0, Math.PI*2);
  ctx.fill();
  ctx.restore();

  // press to start
  const flash = Math.floor(performance.now() / 500) % 2 === 0;
  if (flash) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#FFFFFF';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('SPACE or TAP to start', GAME_WIDTH/2, 280);
    ctx.restore();
  }

  // high scores
  ctx.save();
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.font = '11px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('— TOP SCORES —', GAME_WIDTH/2, 330);
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 3; i++) {
    const sc = Game.leaderboard[i] || 0;
    ctx.fillText((i+1) + '.  ' + sc, GAME_WIDTH/2, 350 + i * 16);
  }
  ctx.restore();

  // controls
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '9px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('WASD/ARROWS · P PAUSE · M MUTE · ESC EXIT', GAME_WIDTH/2, 432);
  ctx.restore();
}

function renderLevelIntro() {
  // first render normal scene
  renderGameWorld();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = COLOR_NEON_GREEN;
  ctx.shadowBlur = 14;
  ctx.shadowColor = COLOR_NEON_GREEN;
  ctx.font = 'bold 32px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('LEVEL ' + Game.level, GAME_WIDTH/2, GAME_HEIGHT/2 - 10);
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.font = '12px Courier New';
  const speedPct = Math.floor((1 + (Game.level - 1) * 0.15) * 100);
  ctx.fillText('SPEED: ' + speedPct + '%', GAME_WIDTH/2, GAME_HEIGHT/2 + 16);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '10px Courier New';
  ctx.fillText('GET READY!', GAME_WIDTH/2, GAME_HEIGHT/2 + 38);
  ctx.restore();
}

function renderGameOver() {
  renderGameWorld();
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = '#FF3030';
  ctx.shadowBlur = 16;
  ctx.shadowColor = '#FF3030';
  ctx.font = 'bold 30px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', GAME_WIDTH/2, 150);
  ctx.fillStyle = COLOR_NEON_GREEN;
  ctx.shadowColor = COLOR_NEON_GREEN;
  ctx.font = 'bold 18px Courier New';
  ctx.fillText('SCORE: ' + Game.score, GAME_WIDTH/2, 195);
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.font = '12px Courier New';
  ctx.fillText('HIGH: ' + Game.highscore, GAME_WIDTH/2, 218);
  ctx.fillText('LEVEL REACHED: ' + Game.level, GAME_WIDTH/2, 236);
  if (Game.gameOverDelay <= 0) {
    const flash = Math.floor(performance.now() / 500) % 2 === 0;
    if (flash) {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#FFFFFF';
      ctx.font = 'bold 14px Courier New';
      ctx.fillText('SPACE or TAP for menu', GAME_WIDTH/2, 290);
    }
  }
  ctx.restore();
}

function renderLoading() {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  const elapsed = performance.now() - Game.loadingStart;
  const pct = Math.min(1, elapsed / Game.loadingDuration);
  ctx.save();
  ctx.fillStyle = COLOR_NEON_GREEN;
  ctx.shadowBlur = 10;
  ctx.shadowColor = COLOR_NEON_GREEN;
  ctx.font = 'bold 16px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('LOADING...', GAME_WIDTH/2, GAME_HEIGHT/2 - 20);
  // bar
  const barW = 240;
  const barX = (GAME_WIDTH - barW)/2;
  const barY = GAME_HEIGHT/2;
  ctx.strokeStyle = COLOR_NEON_GREEN;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, 12);
  ctx.fillRect(barX + 2, barY + 2, (barW - 4) * pct, 8);
  ctx.restore();
}

function renderGameWorld() {
  renderBackgroundRows();
  renderWaterRipples();
  renderLilyPads();
  renderPlatforms();
  renderVehicles();
  renderHazards();
  renderFrog();
  Particles.render(ctx);
  renderFloatingTexts();
  renderTimerBar();
  renderLivesAndLevel();
}

function renderFlash() {
  if (Game.flashAmount > 0 && Game.flashColor) {
    ctx.save();
    ctx.globalAlpha = Game.flashAmount;
    ctx.fillStyle = Game.flashColor;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.restore();
  }
}

function render() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // shake offset
  let shakeX = 0, shakeY = 0;
  if (Game.shakeAmount > 0) {
    shakeX = (Math.random() - 0.5) * Game.shakeAmount * 2;
    shakeY = (Math.random() - 0.5) * Game.shakeAmount * 2;
  }
  ctx.save();
  ctx.translate(shakeX, shakeY);

  if (Game.state === STATE_LOADING) {
    renderLoading();
  } else if (Game.state === STATE_TITLE) {
    renderTitleScreen();
  } else if (Game.state === STATE_LEVEL_INTRO) {
    renderLevelIntro();
  } else if (Game.state === STATE_GAME_OVER) {
    renderGameOver();
  } else {
    renderGameWorld();
  }
  renderFlash();
  ctx.restore();
}

// === MAIN LOOP ===
let lastTime = 0;
let crtLastFlicker = 0;

function gameLoop(now) {
  if (!lastTime) lastTime = now;
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.1) dt = 0.1;

  // CRT flicker every 10s
  if (now - crtLastFlicker > 10000) {
    crtLastFlicker = now;
    crtOverlay.style.filter = 'brightness(1.4)';
    setTimeout(() => { crtOverlay.style.filter = 'brightness(1)'; }, 80);
  }

  // ESC hint timeout
  if (escHintTimer > 0 && now - escHintTimer > 1500) {
    hideEscHint();
  }

  waveTime += dt;

  if (Game.state === STATE_LOADING) {
    if (now - Game.loadingStart >= Game.loadingDuration) {
      Game.state = STATE_TITLE;
    }
  } else if (Game.state === STATE_TITLE) {
    // animate
  } else if (Game.state === STATE_LEVEL_INTRO) {
    Game.levelIntroTimer += dt * 1000;
    if (Game.levelIntroTimer >= Game.levelIntroDuration) {
      Game.state = STATE_PLAYING;
    }
    updatePlatforms(dt * 0.3);
    updateVehicles(dt * 0.3);
  } else if (Game.state === STATE_PLAYING) {
    let effectiveDt = dt;
    if (Game.slowMoTimer > 0) effectiveDt = dt * 0.2;
    updateVehicles(effectiveDt);
    updatePlatforms(effectiveDt);
    updateHazards(effectiveDt);
    updateFly(effectiveDt);
    updateFrog(effectiveDt);
    updateFloatingTexts(effectiveDt);
    Particles.update(effectiveDt);
    updateScreenEffects(dt);
    AudioEngine.updateMusicTempo(Game.score);
    AudioEngine.tickMusic(now);
  } else if (Game.state === STATE_PAUSED) {
    // do nothing
  } else if (Game.state === STATE_GAME_OVER) {
    if (Game.gameOverDelay > 0) Game.gameOverDelay -= dt;
    Particles.update(dt);
    updateFloatingTexts(dt);
    updateScreenEffects(dt);
  }

  render();
  requestAnimationFrame(gameLoop);
}

// === INIT ===
function init() {
  loadHighScore();
  const muted = loadMutePref();
  Particles.init();
  Game.state = STATE_LOADING;
  Game.loadingStart = performance.now();
  Game.frog = createFrog();
  updateHudTitle(0);
  Input.init();
  AudioEngine.setMuted(muted);
  updateMuteBtn(muted);
  updatePauseBtn(false);

  // initialize audio on first user gesture
  const initAudioOnce = () => {
    AudioEngine.init();
    AudioEngine.resume();
    AudioEngine.setMuted(muted);
    window.removeEventListener('pointerdown', initAudioOnce);
    window.removeEventListener('keydown', initAudioOnce);
  };
  window.addEventListener('pointerdown', initAudioOnce);
  window.addEventListener('keydown', initAudioOnce);

  // Resize handler — scale content to fit
  function fitToScreen() {
    const wrap = document.getElementById('gameWrap');
    if (!wrap) return;
    const wRatio = window.innerWidth / 420;
    const hRatio = window.innerHeight / 541;
    const scale = Math.min(wRatio, hRatio);
    wrap.style.transform = 'scale(' + scale + ')';
    wrap.style.transformOrigin = 'center center';
  }
  window.addEventListener('resize', fitToScreen);
  fitToScreen();

  requestAnimationFrame(gameLoop);
}

init();
</script>
</body>
</html>
`;

export const FroggerGame = () => (
  <iframe
    srcDoc={FROGGER_HTML}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background: '#050505',
    }}
    title="Frogger"
    sandbox="allow-scripts allow-same-origin"
  />
);
