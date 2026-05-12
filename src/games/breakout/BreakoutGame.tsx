const BREAKOUT_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>BREAKOUT — Neon Arcade</title>
<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
  }
  html, body {
    width: 100%;
    height: 100%;
    background: #000;
    overflow: hidden;
    font-family: 'Courier New', monospace;
  }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  #gameContainer {
    position: relative;
    width: 480px;
    height: 611px;
    background: #050505;
    box-shadow: 0 0 30px rgba(0, 102, 255, 0.4), 0 0 80px rgba(255, 0, 102, 0.15);
    overflow: hidden;
  }
  #hudTop {
    position: absolute;
    top: 0;
    left: 0;
    width: 480px;
    height: 36px;
    background: rgba(0, 0, 0, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
  }
  #exitBtn {
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
  #exitBtn:hover {
    background: rgba(255, 60, 60, 1);
  }
  #hudTitle {
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: bold;
    color: #0066FF;
    text-shadow: 0 0 8px #0066FF, 0 0 16px rgba(0, 102, 255, 0.5);
    flex: 1;
    text-align: center;
  }
  #hudRight {
    display: flex;
    gap: 4px;
    margin-right: 4px;
  }
  #muteBtn, #pauseBtn {
    height: 28px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
    transition: background 0.15s;
  }
  #muteBtn { width: 70px; }
  #pauseBtn { width: 85px; }
  #muteBtn:hover, #pauseBtn:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  #gameCanvas {
    position: absolute;
    top: 36px;
    left: 0;
    width: 480px;
    height: 520px;
    display: block;
    background: #050505;
  }
  #hudBottom {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 480px;
    height: 55px;
    background: rgba(0, 0, 0, 0.75);
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
  }
  .dpad {
    display: flex;
    gap: 8px;
  }
  .dpad-btn {
    width: 45px;
    height: 45px;
    background: rgba(0, 102, 255, 0.2);
    border: 1px solid rgba(0, 102, 255, 0.5);
    border-radius: 8px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 20px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.05s, filter 0.05s;
  }
  .dpad-btn:active {
    transform: scale(0.9);
    filter: brightness(1.5);
  }
  .action-btns {
    display: flex;
    gap: 10px;
  }
  .action-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.4);
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.05s, filter 0.05s;
  }
  .action-btn:active {
    transform: scale(0.9);
    filter: brightness(1.5);
  }
  #btnA { background: rgba(255, 0, 102, 0.3); border-color: rgba(255, 0, 102, 0.6); }
  #btnB { background: rgba(0, 200, 100, 0.3); border-color: rgba(0, 200, 100, 0.6); }
  #scanlines {
    position: absolute;
    top: 36px;
    left: 0;
    width: 480px;
    height: 520px;
    background: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 1px, transparent 1px, transparent 2px);
    pointer-events: none;
    z-index: 5;
  }
  #vignette {
    position: absolute;
    top: 36px;
    left: 0;
    width: 480px;
    height: 520px;
    background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.25) 100%);
    pointer-events: none;
    z-index: 6;
  }
  #flickerOverlay {
    position: absolute;
    top: 36px;
    left: 0;
    width: 480px;
    height: 520px;
    background: rgba(255,255,255,0);
    pointer-events: none;
    z-index: 7;
    transition: background 80ms;
  }
  #escOverlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid #FF0066;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    padding: 15px 25px;
    border-radius: 5px;
    z-index: 20;
    display: none;
    text-shadow: 0 0 8px #FF0066;
  }
</style>
</head>
<body>
<div id="gameContainer">
  <div id="hudTop">
    <button id="exitBtn">✕ EXIT</button>
    <div id="hudTitle">BREAKOUT — 0</div>
    <div id="hudRight">
      <button id="muteBtn">🔊 SFX</button>
      <button id="pauseBtn">⏸ PAUSE</button>
    </div>
  </div>
  <canvas id="gameCanvas" width="480" height="520"></canvas>
  <div id="scanlines"></div>
  <div id="vignette"></div>
  <div id="flickerOverlay"></div>
  <div id="escOverlay">Press ESC again to exit</div>
  <div id="hudBottom">
    <div class="dpad">
      <div class="dpad-btn" id="btnLeft">◀</div>
      <div class="dpad-btn" id="btnRight">▶</div>
    </div>
    <div class="action-btns">
      <div class="action-btn" id="btnA">A</div>
      <div class="action-btn" id="btnB">B</div>
    </div>
  </div>
</div>
<script>
'use strict';

// === CONSTANTS ===
const GAME_WIDTH = 480;
const GAME_HEIGHT = 520;
const HUD_TOP_HEIGHT = 36;

const BALL_RADIUS = 10;
const BALL_BASE_SPEED = 280;
const BALL_SPEED_PER_BRICK = 5;
const BALL_SPEED_PER_LEVEL = 20;
const BALL_TRAIL_LENGTH = 8;

const PADDLE_WIDTH_BASE = 80;
const PADDLE_HEIGHT = 12;
const PADDLE_SPEED = 400;
const PADDLE_Y_OFFSET = 40;
const PADDLE_ZONE_COUNT = 12;
const PADDLE_MAX_ANGLE_DEG = 60;
const PADDLE_MIN_HORIZONTAL_DEG = 15;
const PADDLE_GLOW_DISTANCE = 80;

const BRICK_COLS = 12;
const BRICK_ROWS = 8;
const BRICK_AREA_TOP = 50;
const BRICK_AREA_BOTTOM = 250;
const BRICK_PADDING = 2;
const BRICK_WIDTH = GAME_WIDTH / BRICK_COLS;
const BRICK_HEIGHT = (BRICK_AREA_BOTTOM - BRICK_AREA_TOP) / BRICK_ROWS;

const POWERUP_DROP_CHANCE = 0.20;
const POWERUP_FALL_SPEED = 100;
const POWERUP_MAX_ACTIVE = 2;
const POWERUP_SIZE = 18;

const POWERUP_WIDE_DURATION = 15;
const POWERUP_FAST_DURATION = 10;
const POWERUP_SLOW_DURATION = 8;
const POWERUP_LASER_DURATION = 10;

const COLOR_BG = '#050505';
const COLOR_NEON_BLUE = '#0066FF';
const COLOR_NEON_PINK = '#FF0066';
const COLOR_WHITE = '#FFFFFF';

const ROW_COLORS = ['#FFFFFF', '#A040FF', '#0066FF', '#00DDFF', '#00DD66', '#FFDD00', '#FF8800', '#FF2244'];

const STATE_LOADING = 'LOADING';
const STATE_TITLE = 'TITLE';
const STATE_PLAYING = 'PLAYING';
const STATE_PAUSED = 'PAUSED';
const STATE_GAME_OVER = 'GAME_OVER';
const STATE_HIGHSCORE = 'HIGHSCORE';

const PARTICLE_POOL_SIZE = 500;
const PARTICLE_TYPE_SPARK = 0;
const PARTICLE_TYPE_CIRCLE = 1;
const PARTICLE_TYPE_STAR = 2;
const PARTICLE_TYPE_TRAIL = 3;

const POWERUP_MULTI = 'MULTI';
const POWERUP_WIDE = 'WIDE';
const POWERUP_FAST = 'FAST';
const POWERUP_LIFE = 'LIFE';
const POWERUP_SLOW = 'SLOW';
const POWERUP_LASER = 'LASER';
const POWERUP_STICKY = 'STICKY';

const POWERUP_TYPES = [POWERUP_MULTI, POWERUP_WIDE, POWERUP_FAST, POWERUP_LIFE, POWERUP_SLOW, POWERUP_LASER, POWERUP_STICKY];

const STARTING_LIVES = 3;

const LASER_WIDTH = 4;
const LASER_HEIGHT = 12;
const LASER_SPEED = 600;
const LASER_FIRE_INTERVAL = 0.25;

const FLOAT_TEXT_DURATION = 0.8;
const SCREEN_SHAKE_DURATION = 0.3;
const SLOWMO_DURATION = 0.5;

const FLICKER_INTERVAL_SEC = 10;
const FLICKER_DURATION_MS = 80;

const HIGHSCORE_KEY = 'hs_breakout';
const LEADERBOARD_KEY = 'lb_breakout';
const MUTE_KEY = 'mute_breakout';

// === HUD SETUP ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hudTitleEl = document.getElementById('hudTitle');
const muteBtnEl = document.getElementById('muteBtn');
const pauseBtnEl = document.getElementById('pauseBtn');
const exitBtnEl = document.getElementById('exitBtn');
const escOverlayEl = document.getElementById('escOverlay');
const flickerOverlayEl = document.getElementById('flickerOverlay');

function updateHudTitle(score) {
  hudTitleEl.textContent = 'BREAKOUT — ' + score;
}

function updateMuteButton(isMuted) {
  muteBtnEl.textContent = isMuted ? '🔇 SFX' : '🔊 SFX';
}

function updatePauseButton(isPaused) {
  pauseBtnEl.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';
}

// === AUDIO ENGINE ===
const AudioEngine = {
  ctx: null,
  musicGain: null,
  sfxGain: null,
  masterGain: null,
  muted: false,
  musicBPM: 180,
  musicScheduler: null,
  musicStartTime: 0,
  noteIndex: 0,
  ready: false,

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.25;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.masterGain);

      this.ready = true;
    } catch (err) {
      this.ready = false;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  setMuted(isMuted) {
    this.muted = isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = isMuted ? 0 : 1.0;
    }
  },

  shutdown() {
    if (this.musicScheduler) {
      clearInterval(this.musicScheduler);
      this.musicScheduler = null;
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      try { this.ctx.close(); } catch (e) {}
    }
    this.ready = false;
  },

  setMusicBPM(bpm) {
    this.musicBPM = bpm;
  },

  playSfxPing(frequency, durationMs, type) {
    if (!this.ready || this.muted) return;
    const oscType = type || 'sine';
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = oscType;
    osc.frequency.value = frequency;
    const now = this.ctx.currentTime;
    const duration = durationMs / 1000;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + duration);
  },

  playPaddleHit() {
    this.playSfxPing(440, 15, 'sine');
  },

  playWallHit() {
    this.playSfxPing(880, 20, 'sine');
  },

  playBrickHit() {
    if (!this.ready || this.muted) return;
    const noiseDuration = 0.04;
    const bufferSize = this.ctx.sampleRate * noiseDuration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.04);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    source.start();
    source.stop(this.ctx.currentTime + 0.04);
  },

  playBrickDestroyed() {
    if (!this.ready || this.muted) return;
    const notes = [261.63, 329.63, 392.00];
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.1);
    });
  },

  playPowerUp() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    [440, 622.25].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 2, now + 0.2);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.2);
    });
  },

  playLifeLost() {
    if (!this.ready || this.muted) return;
    const notes = [440, 349, 262];
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.1);
    });
  },

  playDeath() {
    if (!this.ready || this.muted) return;
    const notes = [440, 415, 392, 370, 349];
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.35, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.15);
    });
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.value = 60;
    rumbleGain.gain.setValueAtTime(0.3, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumbleOsc.start(now);
    rumbleOsc.stop(now + 0.8);
  },

  playLevelComplete() {
    if (!this.ready || this.muted) return;
    const notes = [392, 440, 494, 523, 587, 659];
    const now = this.ctx.currentTime;
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.3);
    });
  },

  playLaser() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.03);
  },

  playUiClick() {
    this.playSfxPing(1200, 10, 'square');
  },

  playKick() {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.08);
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 0.08);
  },

  playHiHat() {
    if (!this.ready || this.muted) return;
    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    source.start();
    source.stop(this.ctx.currentTime + 0.03);
  },

  playMusicNote(freq, durationSec, isBass) {
    if (!this.ready || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    const volume = isBass ? 0.15 : 0.18;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(now);
    osc.stop(now + durationSec);
  },

  startMusic() {
    if (!this.ready) return;
    if (this.musicScheduler) return;
    // D minor melody (D, F, A, C, D5, A, F, D)
    const melodyFreqs = [293.66, 349.23, 440, 523.25, 587.33, 440, 349.23, 293.66,
                        329.63, 392.00, 466.16, 587.33, 523.25, 440, 392.00, 329.63];
    const bassFreqs = [146.83, 146.83, 220, 220, 174.61, 174.61, 196, 196,
                       146.83, 146.83, 220, 220, 174.61, 174.61, 196, 196];
    let step = 0;
    const tick = () => {
      const interval = (60 / this.musicBPM) * 1000 / 2;
      this.musicScheduler = setTimeout(() => {
        if (!this.ready) return;
        this.playMusicNote(melodyFreqs[step % melodyFreqs.length], 0.18, false);
        if (step % 2 === 0) {
          this.playMusicNote(bassFreqs[step % bassFreqs.length], 0.3, true);
          this.playKick();
        }
        if (step % 2 === 1) {
          this.playHiHat();
        }
        step++;
        tick();
      }, interval);
    };
    tick();
  },

  stopMusic() {
    if (this.musicScheduler) {
      clearTimeout(this.musicScheduler);
      this.musicScheduler = null;
    }
  }
};

// === PARTICLE SYSTEM ===
const Particles = {
  pool: [],
  active: 0,

  init() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.pool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, size: 2,
        color: '#FFFFFF', type: PARTICLE_TYPE_SPARK,
        gravity: false, rotation: 0, rotationSpeed: 0,
        active: false
      });
    }
  },

  spawn(x, y, vx, vy, life, size, color, type, gravity) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.life = life;
        p.maxLife = life;
        p.size = size;
        p.color = color;
        p.type = type;
        p.gravity = gravity || false;
        p.rotation = Math.random() * Math.PI * 2;
        p.rotationSpeed = (Math.random() - 0.5) * 8;
        p.active = true;
        return p;
      }
    }
    return null;
  },

  burst(x, y, count, color, speedRange, life, type) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedRange[0] + Math.random() * (speedRange[1] - speedRange[0]);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = 2 + Math.random() * 3;
      this.spawn(x, y, vx, vy, life, size, color, type, true);
    }
  },

  update(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += 300 * dt;
      p.rotation += p.rotationSpeed * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  },

  render(renderCtx) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      renderCtx.save();
      renderCtx.globalAlpha = alpha;
      renderCtx.shadowBlur = 15;
      renderCtx.shadowColor = p.color;
      renderCtx.fillStyle = p.color;
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      if (p.type === PARTICLE_TYPE_SPARK) {
        renderCtx.fillRect(px - 1, py - 1, 2, 2);
      } else if (p.type === PARTICLE_TYPE_CIRCLE) {
        renderCtx.beginPath();
        renderCtx.arc(px, py, p.size, 0, Math.PI * 2);
        renderCtx.fill();
      } else if (p.type === PARTICLE_TYPE_STAR) {
        renderCtx.translate(px, py);
        renderCtx.rotate(p.rotation);
        renderCtx.beginPath();
        for (let s = 0; s < 6; s++) {
          const angle = (s / 6) * Math.PI * 2;
          const radius = s % 2 === 0 ? p.size : p.size / 2;
          const sx = Math.cos(angle) * radius;
          const sy = Math.sin(angle) * radius;
          if (s === 0) renderCtx.moveTo(sx, sy);
          else renderCtx.lineTo(sx, sy);
        }
        renderCtx.closePath();
        renderCtx.fill();
      } else if (p.type === PARTICLE_TYPE_TRAIL) {
        renderCtx.beginPath();
        renderCtx.arc(px, py, p.size, 0, Math.PI * 2);
        renderCtx.fill();
      }
      renderCtx.restore();
    }
  }
};

// === GAME STATE ===
const game = {
  state: STATE_LOADING,
  loadingProgress: 0,
  loadingStart: 0,
  score: 0,
  highScore: 0,
  lives: STARTING_LIVES,
  level: 1,
  multiplier: 1,
  consecutiveHits: 0,
  paused: false,
  muted: false,
  escPressedOnce: false,
  escTimer: 0,
  flickerTimer: 0,
  shakeAmount: 0,
  shakeTimer: 0,
  flashColor: null,
  flashAlpha: 0,
  slowMoTimer: 0,
  paddle: null,
  balls: [],
  bricks: [],
  powerUps: [],
  lasers: [],
  fragments: [],
  floatTexts: [],
  activePowerUps: {},
  titleBall: null,
  gameOverTimer: 0,
  laserFireCooldown: 0,
  leaderboard: [],
  inputName: '',
  enteringName: false
};

function loadPersistence() {
  try {
    const hs = localStorage.getItem(HIGHSCORE_KEY);
    if (hs) game.highScore = parseInt(hs, 10) || 0;
    const lb = localStorage.getItem(LEADERBOARD_KEY);
    if (lb) game.leaderboard = JSON.parse(lb) || [];
    const m = localStorage.getItem(MUTE_KEY);
    if (m === 'true') game.muted = true;
  } catch (e) {}
}

function savePersistence() {
  try {
    localStorage.setItem(HIGHSCORE_KEY, String(game.highScore));
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(game.leaderboard));
    localStorage.setItem(MUTE_KEY, String(game.muted));
  } catch (e) {}
}

// === INPUT HANDLER ===
const input = {
  left: false,
  right: false,
  action: false,
  actionPressed: false,
  mouseX: GAME_WIDTH / 2,
  mouseActive: false,
  touchX: null
};

function setupInput() {
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = true;
    if (e.key === ' ') {
      input.actionPressed = true;
      input.action = true;
      e.preventDefault();
    }
    if (e.key === 'p' || e.key === 'P') {
      togglePause();
    }
    if (e.key === 'm' || e.key === 'M') {
      toggleMute();
    }
    if (e.key === 'Escape') {
      handleEscape();
    }
  });
  document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') input.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') input.right = false;
    if (e.key === ' ') input.action = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - rect.left) / rect.width) * GAME_WIDTH;
    input.mouseActive = true;
  });

  canvas.addEventListener('click', (e) => {
    AudioEngine.resume();
    if (game.state === STATE_TITLE) {
      startGame();
    } else if (game.state === STATE_GAME_OVER) {
      resetToTitle();
    } else if (game.state === STATE_PLAYING) {
      input.actionPressed = true;
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    AudioEngine.resume();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    input.touchX = ((touch.clientX - rect.left) / rect.width) * GAME_WIDTH;
    if (game.state === STATE_TITLE) {
      startGame();
    } else if (game.state === STATE_GAME_OVER) {
      resetToTitle();
    } else {
      input.actionPressed = true;
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    input.touchX = ((touch.clientX - rect.left) / rect.width) * GAME_WIDTH;
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    input.touchX = null;
  }, { passive: false });

  // Buttons
  exitBtnEl.addEventListener('click', () => {
    AudioEngine.playUiClick();
    doExit();
  });
  muteBtnEl.addEventListener('click', () => {
    AudioEngine.playUiClick();
    toggleMute();
  });
  pauseBtnEl.addEventListener('click', () => {
    AudioEngine.playUiClick();
    togglePause();
  });

  // Mobile controls
  const btnLeft = document.getElementById('btnLeft');
  const btnRight = document.getElementById('btnRight');
  const btnA = document.getElementById('btnA');
  const btnB = document.getElementById('btnB');

  const bindButton = (el, onDown, onUp) => {
    el.addEventListener('touchstart', (e) => { e.preventDefault(); onDown(); }, { passive: false });
    el.addEventListener('touchend', (e) => { e.preventDefault(); if (onUp) onUp(); }, { passive: false });
    el.addEventListener('mousedown', (e) => { e.preventDefault(); onDown(); });
    el.addEventListener('mouseup', (e) => { e.preventDefault(); if (onUp) onUp(); });
    el.addEventListener('mouseleave', () => { if (onUp) onUp(); });
  };

  bindButton(btnLeft, () => { input.left = true; }, () => { input.left = false; });
  bindButton(btnRight, () => { input.right = true; }, () => { input.right = false; });
  bindButton(btnA, () => {
    AudioEngine.resume();
    input.actionPressed = true;
    input.action = true;
    if (game.state === STATE_TITLE) startGame();
    else if (game.state === STATE_GAME_OVER) resetToTitle();
  }, () => { input.action = false; });
  bindButton(btnB, () => {
    togglePause();
  }, null);
}

function toggleMute() {
  game.muted = !game.muted;
  AudioEngine.setMuted(game.muted);
  updateMuteButton(game.muted);
  savePersistence();
}

function togglePause() {
  if (game.state !== STATE_PLAYING && game.state !== STATE_PAUSED) return;
  if (game.state === STATE_PLAYING) {
    game.state = STATE_PAUSED;
    game.paused = true;
    AudioEngine.stopMusic();
  } else {
    game.state = STATE_PLAYING;
    game.paused = false;
    AudioEngine.startMusic();
  }
  updatePauseButton(game.paused);
}

function handleEscape() {
  if (!game.escPressedOnce) {
    game.escPressedOnce = true;
    game.escTimer = 1.5;
    escOverlayEl.style.display = 'block';
  } else {
    doExit();
  }
}

function doExit() {
  isRunning = false;
  AudioEngine.shutdown();
  try { window.parent.postMessage({ action: 'exitGame' }, '*'); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('gameExit')); } catch (e) {}
}

// === GAME LOGIC ===
function createPaddle() {
  return {
    x: GAME_WIDTH / 2,
    y: GAME_HEIGHT - PADDLE_Y_OFFSET,
    width: PADDLE_WIDTH_BASE,
    height: PADDLE_HEIGHT,
    color: COLOR_NEON_BLUE
  };
}

function createBall(x, y, color) {
  return {
    x: x,
    y: y,
    vx: 0,
    vy: 0,
    radius: BALL_RADIUS,
    color: color || COLOR_NEON_BLUE,
    stuck: true,
    stuckOffset: 0,
    trail: [],
    speed: BALL_BASE_SPEED + (game.level - 1) * BALL_SPEED_PER_LEVEL
  };
}

function spawnInitialBall() {
  const ball = createBall(game.paddle.x, game.paddle.y - PADDLE_HEIGHT, COLOR_NEON_BLUE);
  ball.stuck = true;
  ball.stuckOffset = 0;
  game.balls = [ball];
}

function launchBall(ball) {
  if (!ball.stuck) return;
  ball.stuck = false;
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
  ball.vx = Math.cos(angle) * ball.speed;
  ball.vy = Math.sin(angle) * ball.speed;
}

function buildLevel(levelNum) {
  game.bricks = [];
  const denser = Math.min(1.0, 0.6 + levelNum * 0.05);
  const tripleChance = Math.min(0.4, 0.05 + levelNum * 0.05);
  const doubleChance = Math.min(0.5, 0.15 + levelNum * 0.04);

  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      // Pattern variation by level
      let shouldPlace = true;
      if (levelNum === 2) {
        shouldPlace = !(row === 3 && (col === 5 || col === 6));
      } else if (levelNum === 3) {
        shouldPlace = (col + row) % 2 === 0 || row < 4;
      } else if (levelNum >= 4) {
        shouldPlace = Math.random() < denser;
      }
      if (!shouldPlace) continue;

      let hits = 1;
      const roll = Math.random();
      if (row === 0) {
        hits = roll < tripleChance ? 3 : (roll < tripleChance + doubleChance ? 2 : 1);
      } else if (row <= 2) {
        hits = roll < doubleChance ? 2 : 1;
        if (roll < tripleChance * 0.5) hits = 3;
      }

      game.bricks.push({
        x: col * BRICK_WIDTH + BRICK_PADDING,
        y: BRICK_AREA_TOP + row * BRICK_HEIGHT + BRICK_PADDING,
        width: BRICK_WIDTH - BRICK_PADDING * 2,
        height: BRICK_HEIGHT - BRICK_PADDING * 2,
        row: row,
        col: col,
        hits: hits,
        maxHits: hits,
        color: ROW_COLORS[row],
        isWhite: row === 0,
        destroyed: false
      });
    }
  }
}

function spawnPowerUp(x, y) {
  if (Math.random() > POWERUP_DROP_CHANCE) return;
  const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
  game.powerUps.push({
    x: x,
    y: y,
    vy: POWERUP_FALL_SPEED,
    type: type,
    size: POWERUP_SIZE,
    rotation: 0
  });
}

function applyPowerUp(type) {
  AudioEngine.playPowerUp();
  game.floatTexts.push({
    x: game.paddle.x,
    y: game.paddle.y - 30,
    text: 'POWER UP!',
    color: COLOR_NEON_PINK,
    life: FLOAT_TEXT_DURATION,
    maxLife: FLOAT_TEXT_DURATION
  });

  if (type === POWERUP_MULTI) {
    const newBalls = [];
    game.balls.forEach((b) => {
      if (b.stuck) return;
      for (let i = 0; i < 2; i++) {
        const angle = Math.atan2(b.vy, b.vx) + (i === 0 ? 0.4 : -0.4);
        const newBall = createBall(b.x, b.y, COLOR_NEON_PINK);
        newBall.stuck = false;
        newBall.speed = b.speed;
        newBall.vx = Math.cos(angle) * b.speed;
        newBall.vy = Math.sin(angle) * b.speed;
        newBalls.push(newBall);
      }
    });
    game.balls = game.balls.concat(newBalls);
  } else if (type === POWERUP_WIDE) {
    activatePowerUp(POWERUP_WIDE, POWERUP_WIDE_DURATION);
    game.paddle.width = PADDLE_WIDTH_BASE * 1.5;
  } else if (type === POWERUP_FAST) {
    activatePowerUp(POWERUP_FAST, POWERUP_FAST_DURATION);
    game.balls.forEach((b) => {
      b.speed *= 1.5;
      const a = Math.atan2(b.vy, b.vx);
      b.vx = Math.cos(a) * b.speed;
      b.vy = Math.sin(a) * b.speed;
    });
  } else if (type === POWERUP_LIFE) {
    game.lives++;
  } else if (type === POWERUP_SLOW) {
    activatePowerUp(POWERUP_SLOW, POWERUP_SLOW_DURATION);
    game.balls.forEach((b) => {
      b.speed *= 0.6;
      const a = Math.atan2(b.vy, b.vx);
      b.vx = Math.cos(a) * b.speed;
      b.vy = Math.sin(a) * b.speed;
    });
  } else if (type === POWERUP_LASER) {
    activatePowerUp(POWERUP_LASER, POWERUP_LASER_DURATION);
  } else if (type === POWERUP_STICKY) {
    activatePowerUp(POWERUP_STICKY, 0);
  }
}

function activatePowerUp(type, duration) {
  // Limit to MAX active timed power-ups
  const timedKeys = Object.keys(game.activePowerUps);
  if (timedKeys.length >= POWERUP_MAX_ACTIVE && !game.activePowerUps[type]) {
    // remove oldest
    let oldestKey = timedKeys[0];
    let oldestTime = Infinity;
    timedKeys.forEach((k) => {
      if (game.activePowerUps[k].endTime < oldestTime) {
        oldestTime = game.activePowerUps[k].endTime;
        oldestKey = k;
      }
    });
    deactivatePowerUp(oldestKey);
  }
  game.activePowerUps[type] = {
    type: type,
    duration: duration,
    timeLeft: duration,
    endTime: performance.now() / 1000 + duration
  };
}

function deactivatePowerUp(type) {
  if (type === POWERUP_WIDE) {
    game.paddle.width = PADDLE_WIDTH_BASE;
  } else if (type === POWERUP_FAST) {
    game.balls.forEach((b) => {
      b.speed /= 1.5;
      const a = Math.atan2(b.vy, b.vx);
      b.vx = Math.cos(a) * b.speed;
      b.vy = Math.sin(a) * b.speed;
    });
  } else if (type === POWERUP_SLOW) {
    game.balls.forEach((b) => {
      b.speed /= 0.6;
      const a = Math.atan2(b.vy, b.vx);
      b.vx = Math.cos(a) * b.speed;
      b.vy = Math.sin(a) * b.speed;
    });
  }
  delete game.activePowerUps[type];
}

function updatePowerUpTimers(dt) {
  const keys = Object.keys(game.activePowerUps);
  keys.forEach((k) => {
    const p = game.activePowerUps[k];
    if (p.duration > 0) {
      p.timeLeft -= dt;
      if (p.timeLeft <= 0) {
        deactivatePowerUp(k);
      }
    }
  });
}

function updatePaddle(dt) {
  if (input.touchX !== null) {
    game.paddle.x = input.touchX;
  } else if (input.left && !input.right) {
    game.paddle.x -= PADDLE_SPEED * dt;
  } else if (input.right && !input.left) {
    game.paddle.x += PADDLE_SPEED * dt;
  } else if (input.mouseActive) {
    game.paddle.x = input.mouseX;
  }
  game.paddle.x = Math.max(game.paddle.width / 2, Math.min(GAME_WIDTH - game.paddle.width / 2, game.paddle.x));
}

function updateBall(ball, dt) {
  if (ball.stuck) {
    ball.x = game.paddle.x + ball.stuckOffset;
    ball.y = game.paddle.y - PADDLE_HEIGHT / 2 - ball.radius;
    return;
  }

  // Trail
  ball.trail.unshift({ x: ball.x, y: ball.y });
  if (ball.trail.length > BALL_TRAIL_LENGTH) ball.trail.pop();

  // Anti-tunneling: subdivide movement
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  const maxStep = ball.radius;
  const steps = Math.max(1, Math.ceil(speed * dt / maxStep));
  const subDt = dt / steps;

  for (let s = 0; s < steps; s++) {
    ball.x += ball.vx * subDt;
    ball.y += ball.vy * subDt;

    // Wall collisions
    if (ball.x - ball.radius < 0) {
      ball.x = ball.radius;
      ball.vx = Math.abs(ball.vx);
      AudioEngine.playWallHit();
    } else if (ball.x + ball.radius > GAME_WIDTH) {
      ball.x = GAME_WIDTH - ball.radius;
      ball.vx = -Math.abs(ball.vx);
      AudioEngine.playWallHit();
    }
    if (ball.y - ball.radius < 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
      AudioEngine.playWallHit();
    }

    // Paddle collision
    const pLeft = game.paddle.x - game.paddle.width / 2;
    const pRight = game.paddle.x + game.paddle.width / 2;
    const pTop = game.paddle.y - game.paddle.height / 2;
    const pBottom = game.paddle.y + game.paddle.height / 2;

    if (ball.vy > 0 && ball.y + ball.radius >= pTop && ball.y - ball.radius <= pBottom &&
        ball.x >= pLeft && ball.x <= pRight) {
      // 12-zone reflection
      const relativeX = (ball.x - pLeft) / game.paddle.width;
      const zone = Math.floor(relativeX * PADDLE_ZONE_COUNT);
      const zoneNormalized = (zone + 0.5) / PADDLE_ZONE_COUNT;
      const angleRange = PADDLE_MAX_ANGLE_DEG * Math.PI / 180;
      const angle = (zoneNormalized - 0.5) * 2 * angleRange;
      const finalAngle = -Math.PI / 2 + angle;
      // Enforce minimum from horizontal
      const minVertical = Math.sin(PADDLE_MIN_HORIZONTAL_DEG * Math.PI / 180);
      ball.vx = Math.cos(finalAngle) * ball.speed;
      ball.vy = Math.sin(finalAngle) * ball.speed;
      if (ball.vy > -minVertical * ball.speed) {
        ball.vy = -minVertical * ball.speed;
        const sign = ball.vx >= 0 ? 1 : -1;
        ball.vx = sign * Math.sqrt(ball.speed * ball.speed - ball.vy * ball.vy);
      }
      ball.y = pTop - ball.radius - 0.1;
      AudioEngine.playPaddleHit();
      game.consecutiveHits = 0;
      game.multiplier = 1;

      // Sticky power-up
      if (game.activePowerUps[POWERUP_STICKY]) {
        ball.stuck = true;
        ball.stuckOffset = ball.x - game.paddle.x;
      }
    }

    // Brick collisions
    checkBrickCollision(ball);

    // Bottom
    if (ball.y - ball.radius > GAME_HEIGHT) {
      ball.lost = true;
      return;
    }
  }
}

function checkBrickCollision(ball) {
  for (let i = 0; i < game.bricks.length; i++) {
    const brick = game.bricks[i];
    if (brick.destroyed) continue;
    if (ball.x + ball.radius < brick.x || ball.x - ball.radius > brick.x + brick.width ||
        ball.y + ball.radius < brick.y || ball.y - ball.radius > brick.y + brick.height) {
      continue;
    }

    // Face detection
    const ballPrevX = ball.x - ball.vx * 0.016;
    const ballPrevY = ball.y - ball.vy * 0.016;

    const fromLeft = ballPrevX + ball.radius <= brick.x;
    const fromRight = ballPrevX - ball.radius >= brick.x + brick.width;
    const fromTop = ballPrevY + ball.radius <= brick.y;
    const fromBottom = ballPrevY - ball.radius >= brick.y + brick.height;

    if (fromLeft) {
      ball.vx = -Math.abs(ball.vx);
      ball.x = brick.x - ball.radius;
    } else if (fromRight) {
      ball.vx = Math.abs(ball.vx);
      ball.x = brick.x + brick.width + ball.radius;
    } else if (fromTop) {
      ball.vy = -Math.abs(ball.vy);
      ball.y = brick.y - ball.radius;
    } else if (fromBottom) {
      ball.vy = Math.abs(ball.vy);
      ball.y = brick.y + brick.height + ball.radius;
    } else {
      // Determine by closest face
      const dxLeft = Math.abs(ball.x - brick.x);
      const dxRight = Math.abs(ball.x - (brick.x + brick.width));
      const dyTop = Math.abs(ball.y - brick.y);
      const dyBottom = Math.abs(ball.y - (brick.y + brick.height));
      const minD = Math.min(dxLeft, dxRight, dyTop, dyBottom);
      if (minD === dxLeft) { ball.vx = -Math.abs(ball.vx); ball.x = brick.x - ball.radius; }
      else if (minD === dxRight) { ball.vx = Math.abs(ball.vx); ball.x = brick.x + brick.width + ball.radius; }
      else if (minD === dyTop) { ball.vy = -Math.abs(ball.vy); ball.y = brick.y - ball.radius; }
      else { ball.vy = Math.abs(ball.vy); ball.y = brick.y + brick.height + ball.radius; }
    }

    hitBrick(brick, ball);
    return;
  }
}

function hitBrick(brick, ball) {
  brick.hits--;
  game.consecutiveHits++;
  game.multiplier = 1 + Math.floor(game.consecutiveHits / 5);

  // Increase ball speed
  ball.speed += BALL_SPEED_PER_BRICK;
  const a = Math.atan2(ball.vy, ball.vx);
  ball.vx = Math.cos(a) * ball.speed;
  ball.vy = Math.sin(a) * ball.speed;

  let pointsBase = 10;
  if (brick.maxHits === 2) pointsBase = 20;
  if (brick.maxHits === 3) pointsBase = 30;
  if (brick.isWhite) pointsBase = 30;

  const points = pointsBase * game.level * game.multiplier;
  game.score += points;

  game.floatTexts.push({
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height / 2,
    text: '+' + points,
    color: brick.color,
    life: FLOAT_TEXT_DURATION,
    maxLife: FLOAT_TEXT_DURATION
  });

  // Update music tempo
  AudioEngine.setMusicBPM(180 + Math.floor(game.score / 500) * 2);

  if (brick.hits <= 0) {
    brick.destroyed = true;
    AudioEngine.playBrickDestroyed();
    explodeBrick(brick);
    spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
    if (brick.maxHits === 3) {
      flashScreen(brick.color, 0.3);
    }
  } else {
    AudioEngine.playBrickHit();
    Particles.burst(brick.x + brick.width / 2, brick.y + brick.height / 2, 4, brick.color, [50, 120], 0.3, PARTICLE_TYPE_SPARK);
  }
}

function explodeBrick(brick) {
  const cx = brick.x + brick.width / 2;
  const cy = brick.y + brick.height / 2;
  const fragmentCount = 10;
  for (let i = 0; i < fragmentCount; i++) {
    const angle = (i / fragmentCount) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 80 + Math.random() * 140;
    game.fragments.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 4,
      color: brick.color,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
      life: 0.5,
      maxLife: 0.5
    });
  }
  Particles.burst(cx, cy, 7, brick.color, [100, 200], 0.5, PARTICLE_TYPE_SPARK);
}

function updateFragments(dt) {
  for (let i = game.fragments.length - 1; i >= 0; i--) {
    const f = game.fragments[i];
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.vy += 400 * dt;
    f.rotation += f.rotationSpeed * dt;
    f.life -= dt;
    if (f.life <= 0) game.fragments.splice(i, 1);
  }
}

function updateFloatTexts(dt) {
  for (let i = game.floatTexts.length - 1; i >= 0; i--) {
    const t = game.floatTexts[i];
    t.y -= 30 * dt;
    t.life -= dt;
    if (t.life <= 0) game.floatTexts.splice(i, 1);
  }
}

function updatePowerUps(dt) {
  for (let i = game.powerUps.length - 1; i >= 0; i--) {
    const pu = game.powerUps[i];
    pu.y += pu.vy * dt;
    pu.rotation += 3 * dt;
    // Paddle collision
    const pLeft = game.paddle.x - game.paddle.width / 2;
    const pRight = game.paddle.x + game.paddle.width / 2;
    const pTop = game.paddle.y - game.paddle.height / 2;
    if (pu.y + pu.size / 2 >= pTop && pu.y - pu.size / 2 <= pTop + game.paddle.height &&
        pu.x + pu.size / 2 >= pLeft && pu.x - pu.size / 2 <= pRight) {
      applyPowerUp(pu.type);
      game.powerUps.splice(i, 1);
      continue;
    }
    if (pu.y > GAME_HEIGHT) {
      game.powerUps.splice(i, 1);
    }
  }
}

function updateLasers(dt) {
  for (let i = game.lasers.length - 1; i >= 0; i--) {
    const laser = game.lasers[i];
    laser.y -= LASER_SPEED * dt;
    if (laser.y + LASER_HEIGHT < 0) {
      game.lasers.splice(i, 1);
      continue;
    }
    // Brick collision
    let hit = false;
    for (let j = 0; j < game.bricks.length; j++) {
      const brick = game.bricks[j];
      if (brick.destroyed) continue;
      if (laser.x + LASER_WIDTH / 2 >= brick.x && laser.x - LASER_WIDTH / 2 <= brick.x + brick.width &&
          laser.y <= brick.y + brick.height && laser.y + LASER_HEIGHT >= brick.y) {
        // Fake a ball for hitBrick scoring
        const fakeBall = { speed: BALL_BASE_SPEED, vx: 0, vy: 0 };
        // simpler: reduce hits directly
        brick.hits--;
        if (brick.hits <= 0) {
          brick.destroyed = true;
          let pointsBase = brick.maxHits === 1 ? 10 : (brick.maxHits === 2 ? 20 : 30);
          if (brick.isWhite) pointsBase = 30;
          const points = pointsBase * game.level;
          game.score += points;
          game.floatTexts.push({
            x: brick.x + brick.width / 2,
            y: brick.y + brick.height / 2,
            text: '+' + points,
            color: brick.color,
            life: FLOAT_TEXT_DURATION,
            maxLife: FLOAT_TEXT_DURATION
          });
          AudioEngine.playBrickDestroyed();
          explodeBrick(brick);
          spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
        } else {
          AudioEngine.playBrickHit();
          Particles.burst(brick.x + brick.width / 2, brick.y + brick.height / 2, 4, brick.color, [50, 120], 0.3, PARTICLE_TYPE_SPARK);
        }
        hit = true;
        break;
      }
    }
    if (hit) game.lasers.splice(i, 1);
  }
  if (game.laserFireCooldown > 0) game.laserFireCooldown -= dt;
}

function fireLaser() {
  if (!game.activePowerUps[POWERUP_LASER]) return;
  if (game.laserFireCooldown > 0) return;
  game.laserFireCooldown = LASER_FIRE_INTERVAL;
  const py = game.paddle.y - game.paddle.height / 2;
  game.lasers.push({ x: game.paddle.x - game.paddle.width / 2 + 10, y: py });
  game.lasers.push({ x: game.paddle.x + game.paddle.width / 2 - 10, y: py });
  AudioEngine.playLaser();
}

function flashScreen(color, alpha) {
  game.flashColor = color;
  game.flashAlpha = alpha;
}

function shakeScreen(amount) {
  game.shakeAmount = amount;
  game.shakeTimer = SCREEN_SHAKE_DURATION;
}

function loseLife() {
  game.lives--;
  game.consecutiveHits = 0;
  game.multiplier = 1;
  if (game.lives <= 0) {
    AudioEngine.playDeath();
    game.slowMoTimer = SLOWMO_DURATION;
    setTimeout(() => {
      game.state = STATE_GAME_OVER;
      AudioEngine.stopMusic();
      if (game.score > game.highScore) {
        game.highScore = game.score;
      }
      // Update leaderboard
      game.leaderboard.push({ score: game.score, date: Date.now() });
      game.leaderboard.sort((a, b) => b.score - a.score);
      game.leaderboard = game.leaderboard.slice(0, 3);
      savePersistence();
    }, 600);
  } else {
    AudioEngine.playLifeLost();
    shakeScreen(8);
    spawnInitialBall();
    // Clear timed power-ups
    Object.keys(game.activePowerUps).forEach((k) => deactivatePowerUp(k));
    game.activePowerUps = {};
  }
}

function checkLevelComplete() {
  const remaining = game.bricks.filter(b => !b.destroyed).length;
  if (remaining === 0) {
    const bonus = 500 * game.level;
    game.score += bonus;
    game.floatTexts.push({
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      text: 'LEVEL ' + game.level + ' COMPLETE +' + bonus,
      color: COLOR_NEON_PINK,
      life: 2,
      maxLife: 2
    });
    AudioEngine.playLevelComplete();
    flashScreen(COLOR_NEON_BLUE, 0.4);
    shakeScreen(5);
    game.level++;
    setTimeout(() => {
      buildLevel(game.level);
      spawnInitialBall();
      Object.keys(game.activePowerUps).forEach((k) => deactivatePowerUp(k));
      game.activePowerUps = {};
      game.powerUps = [];
      game.lasers = [];
    }, 1500);
  }
}

function updateGame(dt) {
  if (game.state !== STATE_PLAYING) return;

  let effectiveDt = dt;
  if (game.slowMoTimer > 0) {
    effectiveDt = dt * 0.2;
    game.slowMoTimer -= dt;
  }

  updatePaddle(effectiveDt);

  // Handle action button
  if (input.actionPressed) {
    input.actionPressed = false;
    let hadStuck = false;
    game.balls.forEach((b) => {
      if (b.stuck) {
        launchBall(b);
        hadStuck = true;
      }
    });
    if (!hadStuck && game.activePowerUps[POWERUP_LASER]) {
      fireLaser();
    }
  }

  // Continuous laser fire while holding
  if (input.action && game.activePowerUps[POWERUP_LASER]) {
    fireLaser();
  }

  // Update balls
  for (let i = game.balls.length - 1; i >= 0; i--) {
    updateBall(game.balls[i], effectiveDt);
    if (game.balls[i].lost) {
      game.balls.splice(i, 1);
    }
  }

  if (game.balls.length === 0) {
    loseLife();
  }

  updatePowerUps(effectiveDt);
  updateLasers(effectiveDt);
  updateFragments(effectiveDt);
  updateFloatTexts(effectiveDt);
  updatePowerUpTimers(effectiveDt);
  Particles.update(effectiveDt);

  if (game.shakeTimer > 0) {
    game.shakeTimer -= dt;
    if (game.shakeTimer <= 0) game.shakeAmount = 0;
  }
  if (game.flashAlpha > 0) {
    game.flashAlpha -= dt * 1.5;
    if (game.flashAlpha < 0) game.flashAlpha = 0;
  }

  checkLevelComplete();
  updateHudTitle(game.score);
}

// === RENDERER ===
function renderBackground() {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Faint grid
  ctx.save();
  ctx.globalAlpha = 0.04;
  ctx.strokeStyle = COLOR_NEON_BLUE;
  ctx.lineWidth = 1;
  for (let x = 0; x < GAME_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < GAME_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

function renderPaddle() {
  const p = game.paddle;
  ctx.save();
  // Detect glow intensity by ball proximity
  let glowMultiplier = 1;
  game.balls.forEach((b) => {
    const dy = Math.abs(b.y - p.y);
    if (dy < PADDLE_GLOW_DISTANCE) {
      const intensity = 1 + (1 - dy / PADDLE_GLOW_DISTANCE) * 2;
      if (intensity > glowMultiplier) glowMultiplier = intensity;
    }
  });
  ctx.shadowBlur = 15 * glowMultiplier;
  ctx.shadowColor = p.color;
  ctx.fillStyle = p.color;
  const px = Math.floor(p.x - p.width / 2);
  const py = Math.floor(p.y - p.height / 2);
  ctx.fillRect(px, py, p.width, p.height);
  // Inner highlight
  ctx.fillStyle = '#FFFFFF';
  ctx.globalAlpha = 0.4;
  ctx.fillRect(px + 2, py + 2, p.width - 4, 2);
  ctx.restore();
}

function renderBalls() {
  game.balls.forEach((ball) => {
    // Trail
    for (let i = ball.trail.length - 1; i >= 0; i--) {
      const t = ball.trail[i];
      const alpha = (1 - i / BALL_TRAIL_LENGTH) * 0.5;
      const size = ball.radius * (1 - i / BALL_TRAIL_LENGTH * 0.7);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 15;
      ctx.shadowColor = ball.color;
      ctx.fillStyle = ball.color;
      ctx.beginPath();
      ctx.arc(Math.floor(t.x), Math.floor(t.y), size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Ball
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = ball.color;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(Math.floor(ball.x), Math.floor(ball.y), ball.radius, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#FFFFFF';
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(Math.floor(ball.x - 3), Math.floor(ball.y - 3), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function renderBricks() {
  game.bricks.forEach((brick) => {
    if (brick.destroyed) return;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = brick.color;
    ctx.fillStyle = brick.color;
    ctx.fillRect(Math.floor(brick.x), Math.floor(brick.y), Math.floor(brick.width), Math.floor(brick.height));
    // Border highlight
    ctx.strokeStyle = '#FFFFFF';
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.floor(brick.x) + 0.5, Math.floor(brick.y) + 0.5, Math.floor(brick.width) - 1, Math.floor(brick.height) - 1);
    // Cracks
    if (brick.hits < brick.maxHits) {
      ctx.globalAlpha = 0.6;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const cx = brick.x + brick.width / 2;
      const cy = brick.y + brick.height / 2;
      const damageRatio = 1 - brick.hits / brick.maxHits;
      ctx.moveTo(brick.x + 2, brick.y + 3);
      ctx.lineTo(cx, cy);
      ctx.lineTo(brick.x + brick.width - 3, brick.y + brick.height - 2);
      ctx.stroke();
      if (damageRatio > 0.5) {
        ctx.beginPath();
        ctx.moveTo(brick.x + brick.width - 3, brick.y + 2);
        ctx.lineTo(cx - 2, cy + 2);
        ctx.lineTo(brick.x + 4, brick.y + brick.height - 3);
        ctx.stroke();
      }
    }
    ctx.restore();
  });
}

function renderFragments() {
  game.fragments.forEach((f) => {
    ctx.save();
    const alpha = f.life / f.maxLife;
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = 10;
    ctx.shadowColor = f.color;
    ctx.fillStyle = f.color;
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rotation);
    ctx.fillRect(-f.size / 2, -f.size / 2, f.size, f.size);
    ctx.restore();
  });
}

function renderPowerUps() {
  game.powerUps.forEach((pu) => {
    ctx.save();
    ctx.translate(Math.floor(pu.x), Math.floor(pu.y));
    ctx.rotate(pu.rotation * 0.2);
    const s = pu.size;
    if (pu.type === POWERUP_MULTI) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#0099FF';
      ctx.fillStyle = '#0099FF';
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (pu.type === POWERUP_WIDE) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00DD66';
      ctx.fillStyle = '#00DD66';
      ctx.fillRect(-s / 2, -s / 4, s, s / 2);
    } else if (pu.type === POWERUP_FAST) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FF2244';
      ctx.fillStyle = '#FF2244';
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const r = i % 2 === 0 ? s / 2 : s / 4;
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fill();
    } else if (pu.type === POWERUP_LIFE) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FFDD00';
      ctx.fillStyle = '#FFDD00';
      const h = s / 2;
      ctx.beginPath();
      ctx.moveTo(0, h / 2);
      ctx.bezierCurveTo(-h, -h / 2, -h / 2, -h, 0, -h / 4);
      ctx.bezierCurveTo(h / 2, -h, h, -h / 2, 0, h / 2);
      ctx.fill();
    } else if (pu.type === POWERUP_SLOW) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#A040FF';
      ctx.strokeStyle = '#A040FF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= 20; i++) {
        const x = -s / 2 + (i / 20) * s;
        const y = Math.sin((i / 20) * Math.PI * 2) * (s / 4);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    } else if (pu.type === POWERUP_LASER) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FF8800';
      ctx.fillStyle = '#FF8800';
      ctx.beginPath();
      ctx.moveTo(-s / 4, -s / 2);
      ctx.lineTo(s / 4, -s / 8);
      ctx.lineTo(0, 0);
      ctx.lineTo(s / 4, s / 2);
      ctx.lineTo(-s / 4, s / 8);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
    } else if (pu.type === POWERUP_STICKY) {
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00DDFF';
      ctx.strokeStyle = '#00DDFF';
      ctx.fillStyle = '#00DDFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, s / 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(-s / 8, -s / 2, s / 4, s / 4);
      ctx.fillRect(-s / 8, s / 4, s / 4, s / 4);
    }
    ctx.restore();
  });
}

function renderLasers() {
  game.lasers.forEach((l) => {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#FF8800';
    ctx.fillStyle = '#FF8800';
    ctx.fillRect(Math.floor(l.x - LASER_WIDTH / 2), Math.floor(l.y), LASER_WIDTH, LASER_HEIGHT);
    ctx.restore();
  });
}

function renderFloatTexts() {
  game.floatTexts.forEach((t) => {
    ctx.save();
    const alpha = t.life / t.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = t.color;
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.text, Math.floor(t.x), Math.floor(t.y));
    ctx.restore();
  });
}

function renderHud() {
  // Lives + Level + active power-up timers
  ctx.save();
  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = COLOR_WHITE;
  ctx.shadowBlur = 0;

  // Lives as ball icons (top-left of game area)
  for (let i = 0; i < game.lives; i++) {
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLOR_NEON_BLUE;
    ctx.fillStyle = COLOR_NEON_BLUE;
    ctx.beginPath();
    ctx.arc(12 + i * 16, 14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Level (top right of game area)
  ctx.textAlign = 'right';
  ctx.fillStyle = COLOR_NEON_PINK;
  ctx.shadowBlur = 8;
  ctx.shadowColor = COLOR_NEON_PINK;
  ctx.fillText('LEVEL ' + game.level, GAME_WIDTH - 8, 18);
  ctx.fillStyle = '#888';
  ctx.shadowBlur = 0;
  ctx.fillText('HI ' + game.highScore, GAME_WIDTH - 8, 32);

  // Active power-up icons with countdown bars
  ctx.textAlign = 'left';
  const keys = Object.keys(game.activePowerUps);
  keys.forEach((k, i) => {
    const pu = game.activePowerUps[k];
    const bx = 12 + i * 90;
    const by = GAME_HEIGHT - 18;
    ctx.fillStyle = COLOR_WHITE;
    ctx.font = '10px "Courier New", monospace';
    ctx.fillText(k, bx, by);
    if (pu.duration > 0) {
      const barWidth = 70;
      const ratio = Math.max(0, pu.timeLeft / pu.duration);
      ctx.fillStyle = '#333';
      ctx.fillRect(bx, by + 2, barWidth, 4);
      ctx.fillStyle = COLOR_NEON_PINK;
      ctx.shadowBlur = 6;
      ctx.shadowColor = COLOR_NEON_PINK;
      ctx.fillRect(bx, by + 2, barWidth * ratio, 4);
      ctx.shadowBlur = 0;
    }
  });

  // Multiplier
  if (game.multiplier > 1) {
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillStyle = '#FFDD00';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFDD00';
    ctx.fillText('×' + game.multiplier, GAME_WIDTH / 2, 18);
  }
  ctx.restore();
}

function renderTitle() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.font = 'bold 48px "Courier New", monospace';
  ctx.fillText('BREAKOUT', GAME_WIDTH / 2, 140);

  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = COLOR_NEON_PINK;
  ctx.shadowColor = COLOR_NEON_PINK;
  ctx.fillText('— NEON ARCADE EDITION —', GAME_WIDTH / 2, 168);

  // Title ball animation
  if (game.titleBall) {
    ctx.fillStyle = COLOR_NEON_BLUE;
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLOR_NEON_BLUE;
    ctx.beginPath();
    ctx.arc(Math.floor(game.titleBall.x), Math.floor(game.titleBall.y), BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = COLOR_WHITE;
  ctx.shadowBlur = 0;
  ctx.font = '14px "Courier New", monospace';
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (blink) {
    ctx.fillStyle = COLOR_WHITE;
    ctx.fillText('SPACE or TAP to start', GAME_WIDTH / 2, GAME_HEIGHT - 120);
  }

  ctx.font = '11px "Courier New", monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('← → Move   SPACE Launch/Laser   P Pause   M Mute', GAME_WIDTH / 2, GAME_HEIGHT - 90);

  // Leaderboard
  ctx.fillStyle = COLOR_NEON_PINK;
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_NEON_PINK;
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.fillText('— TOP SCORES —', GAME_WIDTH / 2, GAME_HEIGHT - 60);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = '12px "Courier New", monospace';
  if (game.leaderboard.length === 0) {
    ctx.fillStyle = '#666';
    ctx.fillText('No scores yet', GAME_WIDTH / 2, GAME_HEIGHT - 40);
  } else {
    game.leaderboard.forEach((entry, i) => {
      ctx.fillStyle = i === 0 ? '#FFDD00' : '#FFFFFF';
      ctx.fillText((i + 1) + '. ' + entry.score, GAME_WIDTH / 2, GAME_HEIGHT - 40 + i * 14);
    });
  }
  ctx.restore();
}

function renderLoading() {
  ctx.save();
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.shadowBlur = 15;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.font = 'bold 24px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LOADING...', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

  const barWidth = 240;
  const barHeight = 14;
  const bx = (GAME_WIDTH - barWidth) / 2;
  const by = GAME_HEIGHT / 2 + 10;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = COLOR_NEON_BLUE;
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, barWidth, barHeight);
  ctx.fillStyle = COLOR_NEON_PINK;
  ctx.shadowBlur = 10;
  ctx.shadowColor = COLOR_NEON_PINK;
  ctx.fillRect(bx + 2, by + 2, (barWidth - 4) * game.loadingProgress, barHeight - 4);
  ctx.restore();
}

function renderGameOver() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR_NEON_PINK;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_NEON_PINK;
  ctx.font = 'bold 40px "Courier New", monospace';
  ctx.fillText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60);

  ctx.shadowBlur = 10;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.fillText('SCORE: ' + game.score, GAME_WIDTH / 2, GAME_HEIGHT / 2);

  ctx.font = '14px "Courier New", monospace';
  ctx.fillStyle = '#FFDD00';
  ctx.fillText('HIGH SCORE: ' + game.highScore, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);

  ctx.shadowBlur = 0;
  ctx.font = '14px "Courier New", monospace';
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (blink) {
    ctx.fillStyle = COLOR_NEON_BLUE;
    ctx.shadowBlur = 8;
    ctx.shadowColor = COLOR_NEON_BLUE;
    ctx.fillText('SPACE or TAP to replay', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
  }
  ctx.restore();
}

function renderPausedOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR_NEON_BLUE;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_NEON_BLUE;
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2);
  ctx.shadowBlur = 0;
  ctx.font = '12px "Courier New", monospace';
  ctx.fillStyle = COLOR_WHITE;
  ctx.fillText('Press P or RESUME', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
  ctx.restore();
}

function renderFlash() {
  if (game.flashAlpha > 0 && game.flashColor) {
    ctx.save();
    ctx.globalAlpha = game.flashAlpha;
    ctx.fillStyle = game.flashColor;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.restore();
  }
}

function render() {
  ctx.save();

  // Screen shake
  if (game.shakeTimer > 0) {
    const intensity = game.shakeAmount * (game.shakeTimer / SCREEN_SHAKE_DURATION);
    ctx.translate(
      (Math.random() - 0.5) * intensity * 2,
      (Math.random() - 0.5) * intensity * 2
    );
  }

  renderBackground();

  if (game.state === STATE_LOADING) {
    renderLoading();
  } else if (game.state === STATE_TITLE) {
    renderTitle();
  } else if (game.state === STATE_PLAYING || game.state === STATE_PAUSED || game.state === STATE_GAME_OVER) {
    renderBricks();
    renderFragments();
    renderPowerUps();
    renderLasers();
    renderPaddle();
    renderBalls();
    Particles.render(ctx);
    renderFloatTexts();
    renderHud();
    renderFlash();
    if (game.state === STATE_PAUSED) renderPausedOverlay();
    if (game.state === STATE_GAME_OVER) renderGameOver();
  }

  ctx.restore();
}

// === MAIN LOOP ===
let isRunning = true;
let lastTime = 0;

function loop(timestamp) {
  if (!isRunning) return;
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  if (dt > 0.05) dt = 0.05;
  lastTime = timestamp;

  // ESC timer
  if (game.escPressedOnce) {
    game.escTimer -= dt;
    if (game.escTimer <= 0) {
      game.escPressedOnce = false;
      escOverlayEl.style.display = 'none';
    }
  }

  // Flicker effect
  game.flickerTimer += dt;
  if (game.flickerTimer >= FLICKER_INTERVAL_SEC) {
    game.flickerTimer = 0;
    flickerOverlayEl.style.background = 'rgba(255,255,255,0.08)';
    setTimeout(() => {
      flickerOverlayEl.style.background = 'rgba(255,255,255,0)';
    }, FLICKER_DURATION_MS);
  }

  if (game.state === STATE_LOADING) {
    game.loadingProgress = Math.min(1, (performance.now() - game.loadingStart) / 1500);
    if (game.loadingProgress >= 1) {
      game.state = STATE_TITLE;
      initTitleBall();
    }
  } else if (game.state === STATE_TITLE) {
    updateTitleBall(dt);
  } else if (game.state === STATE_PLAYING) {
    updateGame(dt);
  }

  render();
  requestAnimationFrame(loop);
}

function initTitleBall() {
  game.titleBall = {
    x: GAME_WIDTH / 2,
    y: 250,
    vx: 180,
    vy: 140
  };
}

function updateTitleBall(dt) {
  if (!game.titleBall) return;
  game.titleBall.x += game.titleBall.vx * dt;
  game.titleBall.y += game.titleBall.vy * dt;
  if (game.titleBall.x < BALL_RADIUS || game.titleBall.x > GAME_WIDTH - BALL_RADIUS) {
    game.titleBall.vx = -game.titleBall.vx;
  }
  if (game.titleBall.y < 200 || game.titleBall.y > GAME_HEIGHT - 200) {
    game.titleBall.vy = -game.titleBall.vy;
  }
}

function startGame() {
  AudioEngine.resume();
  game.state = STATE_PLAYING;
  game.score = 0;
  game.lives = STARTING_LIVES;
  game.level = 1;
  game.multiplier = 1;
  game.consecutiveHits = 0;
  game.balls = [];
  game.bricks = [];
  game.powerUps = [];
  game.lasers = [];
  game.fragments = [];
  game.floatTexts = [];
  game.activePowerUps = {};
  game.paddle = createPaddle();
  buildLevel(1);
  spawnInitialBall();
  AudioEngine.setMusicBPM(180);
  AudioEngine.startMusic();
  updateHudTitle(0);
}

function resetToTitle() {
  game.state = STATE_TITLE;
  AudioEngine.stopMusic();
  initTitleBall();
}

// === INIT ===
function init() {
  loadPersistence();
  AudioEngine.init();
  AudioEngine.setMuted(game.muted);
  updateMuteButton(game.muted);
  updatePauseButton(false);
  Particles.init();
  setupInput();
  game.paddle = createPaddle();
  game.loadingStart = performance.now();
  game.state = STATE_LOADING;
  updateHudTitle(0);
  // Resize handler — scale content to fit
  function fitToScreen() {
    const wrap = document.getElementById('gameContainer');
    if (!wrap) return;
    const wRatio = window.innerWidth / 480;
    const hRatio = window.innerHeight / 611;
    const scale = Math.min(wRatio, hRatio);
    wrap.style.transform = 'scale(' + scale + ')';
    wrap.style.transformOrigin = 'center center';
  }
  window.addEventListener('resize', fitToScreen);
  fitToScreen();
  requestAnimationFrame(loop);
}

init();
</script>
</body>
</html>

`;

export const BreakoutGame = () => (
  <iframe
    srcDoc={BREAKOUT_HTML}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background: '#050505',
    }}
    title="Breakout"
    sandbox="allow-scripts allow-same-origin"
  />
);
