const SNAKE_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>SNAKE — Neon Arcade</title>
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
  #gameContainer {
    position: relative;
    width: 500px;
    height: 591px;
    background: #050505;
    box-shadow: 0 0 40px rgba(0, 255, 65, 0.3), 0 0 80px rgba(0, 255, 65, 0.15);
    border: 1px solid rgba(0, 255, 65, 0.2);
  }
  #hudTop {
    position: absolute;
    top: 0;
    left: 0;
    width: 500px;
    height: 36px;
    background: rgba(0, 0, 0, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
    z-index: 10;
  }
  #hudTitle {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: #00FF41;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: bold;
    text-shadow: 0 0 8px #00FF41, 0 0 16px rgba(0, 255, 65, 0.5);
    white-space: nowrap;
    pointer-events: none;
  }
  #btnExit {
    width: 70px;
    height: 28px;
    background: rgba(255, 60, 60, 0.8);
    border: 1px solid rgba(255, 100, 100, 0.5);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    margin-left: 4px;
    transition: background 0.15s;
  }
  #btnExit:hover { background: rgba(255, 60, 60, 1); }
  .hudRightGroup {
    display: flex;
    gap: 4px;
    margin-right: 4px;
  }
  #btnMute, #btnPause {
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
  #btnMute { width: 70px; }
  #btnPause { width: 85px; }
  #btnMute:hover, #btnPause:hover { background: rgba(255, 255, 255, 0.2); }
  #gameCanvas {
    position: absolute;
    top: 36px;
    left: 0;
    width: 500px;
    height: 500px;
    display: block;
    image-rendering: pixelated;
  }
  #controlsBar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 500px;
    height: 55px;
    background: rgba(0, 0, 0, 0.75);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 10px;
    z-index: 10;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
  }
  .dpad {
    display: grid;
    grid-template-columns: repeat(4, 45px);
    gap: 3px;
  }
  .dpadBtn {
    width: 45px;
    height: 45px;
    background: rgba(0, 255, 65, 0.08);
    border: 1px solid rgba(0, 255, 65, 0.35);
    border-radius: 6px;
    color: #00FF41;
    font-size: 18px;
    font-family: 'Courier New', monospace;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.08s, filter 0.08s;
  }
  .dpadBtn:active, .dpadBtn.active {
    transform: scale(0.9);
    filter: brightness(1.8);
    background: rgba(0, 255, 65, 0.25);
  }
  .actionGroup {
    display: flex;
    gap: 8px;
  }
  .actionBtn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid rgba(255, 102, 0, 0.5);
    background: rgba(255, 102, 0, 0.15);
    color: #FF6600;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: transform 0.08s, filter 0.08s;
  }
  .actionBtn:active, .actionBtn.active {
    transform: scale(0.9);
    filter: brightness(1.8);
  }
  #scanlines {
    position: absolute;
    top: 36px;
    left: 0;
    width: 500px;
    height: 500px;
    pointer-events: none;
    background: repeating-linear-gradient(
      0deg,
      rgba(0, 0, 0, 0.03) 0px,
      rgba(0, 0, 0, 0.03) 1px,
      transparent 1px,
      transparent 2px
    );
    z-index: 5;
  }
  #vignette {
    position: absolute;
    top: 36px;
    left: 0;
    width: 500px;
    height: 500px;
    pointer-events: none;
    background: radial-gradient(
      ellipse at center,
      transparent 40%,
      rgba(0, 0, 0, 0.25) 100%
    );
    z-index: 6;
  }
  #crtFlicker {
    position: absolute;
    top: 36px;
    left: 0;
    width: 500px;
    height: 500px;
    pointer-events: none;
    background: rgba(255, 255, 255, 0);
    z-index: 7;
    transition: background 0.08s;
  }
  #escOverlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(255, 60, 60, 0.9);
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    z-index: 20;
    display: none;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
</style>
</head>
<body>
<div id="gameContainer">
  <div id="hudTop">
    <button id="btnExit">✕ EXIT</button>
    <div id="hudTitle">SNAKE — 0</div>
    <div class="hudRightGroup">
      <button id="btnMute">🔊 SFX</button>
      <button id="btnPause">⏸ PAUSE</button>
    </div>
  </div>
  <canvas id="gameCanvas" width="500" height="500"></canvas>
  <div id="scanlines"></div>
  <div id="vignette"></div>
  <div id="crtFlicker"></div>
  <div id="escOverlay">Press ESC again to exit</div>
  <div id="controlsBar">
    <div class="dpad">
      <button class="dpadBtn" data-dir="left">◀</button>
      <button class="dpadBtn" data-dir="up">▲</button>
      <button class="dpadBtn" data-dir="down">▼</button>
      <button class="dpadBtn" data-dir="right">▶</button>
    </div>
    <div class="actionGroup">
      <button class="actionBtn" data-act="A">A</button>
      <button class="actionBtn" data-act="B">B</button>
    </div>
  </div>
</div>
<script>
// === CONSTANTS ===
const GRID_COLS = 25;
const GRID_ROWS = 25;
const CELL_SIZE = 20;
const GAME_WIDTH = GRID_COLS * CELL_SIZE;
const GAME_HEIGHT = GRID_ROWS * CELL_SIZE;
const HUD_HEIGHT = 36;
const CONTROLS_HEIGHT = 55;

const COLOR_BG = '#050505';
const COLOR_SNAKE_HEAD = '#00FF41';
const COLOR_SNAKE_TAIL = '#004400';
const COLOR_NEON_ORANGE = '#FF6600';
const COLOR_TEXT = '#FFFFFF';
const COLOR_POISON = '#A040FF';
const COLOR_GOLD = '#FFD700';

const INITIAL_SNAKE_LENGTH = 5;
const INITIAL_TICK_MS = 150;
const MIN_TICK_MS = 60;
const TICK_DECREMENT_PER_SCORE = 0.4;

const STATE_LOADING = 'LOADING';
const STATE_TITLE = 'TITLE';
const STATE_PLAYING = 'PLAYING';
const STATE_PAUSED = 'PAUSED';
const STATE_GAME_OVER = 'GAME_OVER';
const STATE_HIGHSCORE = 'HIGHSCORE';

const DIR_UP = { x: 0, y: -1 };
const DIR_DOWN = { x: 0, y: 1 };
const DIR_LEFT = { x: -1, y: 0 };
const DIR_RIGHT = { x: 1, y: 0 };

const POINTS_REGULAR_BASE = 10;
const POINTS_BONUS_BASE = 50;
const BONUS_FOOD_EVERY = 5;
const BONUS_FOOD_LIFETIME_MS = 8000;
const POISON_MIN_LEVEL = 3;
const POISON_SHRINK_AMOUNT = 3;

const STARTING_LIVES = 3;
const DEATH_ANIMATION_MS = 800;
const SLOW_MO_DURATION_MS = 500;
const SLOW_MO_FACTOR = 0.2;
const SCREEN_SHAKE_DURATION_MS = 300;

const PARTICLE_POOL_SIZE = 500;
const PARTICLE_TYPE_SPARK = 'SPARK';
const PARTICLE_TYPE_CIRCLE = 'CIRCLE';
const PARTICLE_TYPE_STAR = 'STAR';
const PARTICLE_TYPE_TRAIL = 'TRAIL';

const MUSIC_VOLUME = 0.25;
const SFX_VOLUME = 0.4;
const MUSIC_BPM_BASE = 140;
const MUSIC_BPM_INCREMENT = 2;
const MUSIC_BPM_PER_SCORE = 500;

const LS_HIGHSCORE = 'hs_snake';
const LS_LEADERBOARD = 'lb_snake';
const LS_MUTE = 'mute_snake';

const CRT_FLICKER_INTERVAL_MS = 10000;
const CRT_FLICKER_DURATION_MS = 80;

const LOADING_DURATION_MS = 1500;

// === HUD SETUP ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hudTitle = document.getElementById('hudTitle');
const btnExit = document.getElementById('btnExit');
const btnMute = document.getElementById('btnMute');
const btnPause = document.getElementById('btnPause');
const escOverlay = document.getElementById('escOverlay');
const crtFlicker = document.getElementById('crtFlicker');

function updateHudTitle(score) {
  hudTitle.textContent = 'SNAKE — ' + score;
}

function updateMuteButton(isMuted) {
  btnMute.textContent = isMuted ? '🔇 SFX' : '🔊 SFX';
}

function updatePauseButton(isPaused) {
  btnPause.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';
}

// === AUDIO ENGINE ===
const AudioEngine = {
  ctx: null,
  musicGain: null,
  sfxGain: null,
  masterGain: null,
  muted: false,
  musicSchedulerId: null,
  nextNoteTime: 0,
  currentNoteIndex: 0,
  bpm: MUSIC_BPM_BASE,
  scoreRef: 0,

  melodyNotes: [
    261.63, 329.63, 392.00, 523.25,
    392.00, 329.63, 293.66, 261.63,
    293.66, 349.23, 440.00, 523.25,
    440.00, 349.23, 329.63, 293.66
  ],
  bassNotes: [
    130.81, 130.81, 196.00, 196.00,
    164.81, 164.81, 174.61, 174.61
  ],

  init: function() {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = MUSIC_VOLUME;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = SFX_VOLUME;
      this.sfxGain.connect(this.masterGain);

      const storedMute = localStorage.getItem(LS_MUTE);
      this.muted = storedMute === 'true';
      this.applyMute();
    } catch (e) {
      console.warn('Audio init failed', e);
    }
  },

  resume: function() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  applyMute: function() {
    if (!this.masterGain) return;
    this.masterGain.gain.value = this.muted ? 0 : 1;
    updateMuteButton(this.muted);
  },

  toggleMute: function() {
    this.muted = !this.muted;
    localStorage.setItem(LS_MUTE, this.muted ? 'true' : 'false');
    this.applyMute();
  },

  shutdown: function() {
    this.stopMusic();
    if (this.ctx) {
      try { this.ctx.close(); } catch (e) {}
      this.ctx = null;
    }
  },

  startMusic: function() {
    if (!this.ctx) return;
    this.stopMusic();
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentNoteIndex = 0;
    this.scheduleMusic();
  },

  stopMusic: function() {
    if (this.musicSchedulerId) {
      clearInterval(this.musicSchedulerId);
      this.musicSchedulerId = null;
    }
  },

  scheduleMusic: function() {
    if (!this.ctx) return;
    this.musicSchedulerId = setInterval(() => {
      const lookahead = 0.1;
      while (this.nextNoteTime < this.ctx.currentTime + lookahead) {
        this.playMusicStep(this.nextNoteTime);
        const beatDuration = 60.0 / this.bpm;
        const sixteenth = beatDuration / 4;
        this.nextNoteTime += sixteenth * 2;
        this.currentNoteIndex++;
      }
    }, 25);
  },

  updateBpm: function(score) {
    this.scoreRef = score;
    this.bpm = MUSIC_BPM_BASE + Math.floor(score / MUSIC_BPM_PER_SCORE) * MUSIC_BPM_INCREMENT;
  },

  playMusicStep: function(when) {
    const stepIndex = this.currentNoteIndex;
    const melodyIdx = stepIndex % this.melodyNotes.length;
    const bassIdx = Math.floor(stepIndex / 2) % this.bassNotes.length;
    const beatDuration = 60.0 / this.bpm;
    const noteDuration = beatDuration / 2;

    // Melody
    const melOsc = this.ctx.createOscillator();
    const melGain = this.ctx.createGain();
    melOsc.type = 'sawtooth';
    melOsc.frequency.value = this.melodyNotes[melodyIdx];
    melGain.gain.setValueAtTime(0, when);
    melGain.gain.linearRampToValueAtTime(0.15, when + 0.01);
    melGain.gain.exponentialRampToValueAtTime(0.001, when + noteDuration);
    melOsc.connect(melGain);
    melGain.connect(this.musicGain);
    melOsc.start(when);
    melOsc.stop(when + noteDuration);

    // Bass (every 2 steps)
    if (stepIndex % 2 === 0) {
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.value = this.bassNotes[bassIdx];
      bassGain.gain.setValueAtTime(0, when);
      bassGain.gain.linearRampToValueAtTime(0.2, when + 0.02);
      bassGain.gain.exponentialRampToValueAtTime(0.001, when + noteDuration * 1.5);
      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);
      bassOsc.start(when);
      bassOsc.stop(when + noteDuration * 1.5);
    }

    // Kick (every 4 steps)
    if (stepIndex % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(120, when);
      kickOsc.frequency.exponentialRampToValueAtTime(40, when + 0.08);
      kickGain.gain.setValueAtTime(0.3, when);
      kickGain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);
      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);
      kickOsc.start(when);
      kickOsc.stop(when + 0.08);
    }

    // Hi-hat (off-beats)
    if (stepIndex % 4 === 2) {
      const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.03, this.ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) {
        noiseData[i] = (Math.random() * 2 - 1);
      }
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      const hpFilter = this.ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.value = 8000;
      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.1, when);
      hatGain.gain.exponentialRampToValueAtTime(0.001, when + 0.03);
      noiseSrc.connect(hpFilter);
      hpFilter.connect(hatGain);
      hatGain.connect(this.musicGain);
      noiseSrc.start(when);
      noiseSrc.stop(when + 0.03);
    }
  },

  playSfx: function(name) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    switch (name) {
      case 'move': this.sfxMove(t); break;
      case 'eat': this.sfxEat(t); break;
      case 'bonus': this.sfxBonus(t); break;
      case 'poison': this.sfxPoison(t); break;
      case 'death': this.sfxDeath(t); break;
      case 'levelup': this.sfxLevelUp(t); break;
      case 'multiplier': this.sfxMultiplier(t); break;
      case 'portal': this.sfxPortal(t); break;
      case 'click': this.sfxClick(t); break;
      case 'warning': this.sfxWarning(t); break;
    }
  },

  sfxMove: function(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.02);
  },

  sfxEat: function(t) {
    const notes = [261.63, 329.63, 392.00];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const startT = t + i * 0.05;
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(0.25, startT + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.1);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.1);
    });
  },

  sfxBonus: function(t) {
    const freqs = [523.25, 739.99];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.2);
    });
    // shimmer
    const shimmerOsc = this.ctx.createOscillator();
    const shimmerGain = this.ctx.createGain();
    shimmerOsc.type = 'sine';
    shimmerOsc.frequency.setValueAtTime(1500, t);
    shimmerOsc.frequency.exponentialRampToValueAtTime(3000, t + 0.2);
    shimmerGain.gain.setValueAtTime(0.1, t);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(this.sfxGain);
    shimmerOsc.start(t);
    shimmerOsc.stop(t + 0.2);
  },

  sfxPoison: function(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  },

  sfxDeath: function(t) {
    const notes = [523.25, 466.16, 415.30, 349.23, 277.18];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const startT = t + i * 0.1;
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(0.25, startT + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.15);
    });
    // rumble
    const rumbleOsc = this.ctx.createOscillator();
    const rumbleGain = this.ctx.createGain();
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(60, t);
    rumbleOsc.frequency.exponentialRampToValueAtTime(20, t + 0.6);
    rumbleGain.gain.setValueAtTime(0.3, t);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(this.sfxGain);
    rumbleOsc.start(t);
    rumbleOsc.stop(t + 0.6);
  },

  sfxLevelUp: function(t) {
    const fanfare = [392.00, 493.88, 587.33, 783.99, 987.77, 1174.66];
    fanfare.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = freq;
      const startT = t + i * 0.12;
      gain.gain.setValueAtTime(0, startT);
      gain.gain.linearRampToValueAtTime(0.18, startT + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startT + 0.2);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(startT);
      osc.stop(startT + 0.2);
    });
  },

  sfxMultiplier: function(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.15);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.15);
  },

  sfxPortal: function(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1600, t + 0.08);
    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.08);
  },

  sfxClick: function(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.01);
  },

  sfxWarning: function(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 280;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }
};

// === PARTICLE SYSTEM ===
const ParticleSystem = {
  pool: [],
  init: function() {
    this.pool = [];
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.pool.push({
        active: false,
        type: PARTICLE_TYPE_SPARK,
        x: 0, y: 0,
        vx: 0, vy: 0,
        life: 0, maxLife: 0,
        size: 2,
        color: '#FFFFFF',
        gravityFlag: false,
        rotation: 0
      });
    }
  },
  spawn: function(opts) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.type = opts.type || PARTICLE_TYPE_SPARK;
        p.x = opts.x;
        p.y = opts.y;
        p.vx = opts.vx || 0;
        p.vy = opts.vy || 0;
        p.life = opts.life || 500;
        p.maxLife = p.life;
        p.size = opts.size || 2;
        p.color = opts.color || '#FFFFFF';
        p.gravityFlag = opts.gravity || false;
        p.rotation = opts.rotation || 0;
        return p;
      }
    }
    return null;
  },
  burst: function(x, y, count, color, options) {
    options = options || {};
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i / count) + (Math.random() * 0.4 - 0.2);
      const speed = (options.minSpeed || 0.05) + Math.random() * (options.maxSpeed || 0.25);
      this.spawn({
        type: options.type || PARTICLE_TYPE_SPARK,
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: options.life || (400 + Math.random() * 400),
        size: options.size || (2 + Math.random() * 3),
        color: color,
        gravity: options.gravity || false
      });
    }
  },
  update: function(dt) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravityFlag) {
        p.vy += 0.0008 * dt;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
      }
    }
  },
  draw: function(ctx) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      if (p.type === PARTICLE_TYPE_SPARK) {
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      } else if (p.type === PARTICLE_TYPE_CIRCLE) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === PARTICLE_TYPE_STAR) {
        this.drawStar(ctx, p.x, p.y, p.size, p.size / 2, 6);
      } else if (p.type === PARTICLE_TYPE_TRAIL) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  },
  drawStar: function(ctx, cx, cy, outerR, innerR, points) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI * i / points) - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  },
  clear: function() {
    for (let i = 0; i < this.pool.length; i++) {
      this.pool[i].active = false;
    }
  }
};

// === GAME STATE ===
const GameState = {
  state: STATE_LOADING,
  score: 0,
  highScore: 0,
  level: 1,
  lives: STARTING_LIVES,
  multiplier: 1,
  consecutiveFood: 0,
  portalMode: false,
  foodEatenCount: 0,

  snake: [],
  direction: DIR_RIGHT,
  pendingDirection: DIR_RIGHT,
  tickAccumulator: 0,
  tickRate: INITIAL_TICK_MS,
  isGrowing: false,
  lastTailSegment: null,

  food: null,
  bonusFood: null,
  poisonFood: null,
  bonusFoodSpawnTime: 0,

  floatingTexts: [],
  deathTimer: 0,
  slowMoTimer: 0,
  screenShakeTimer: 0,
  flashTimer: 0,
  flashColor: '#FFFFFF',

  loadingProgress: 0,
  loadingStartTime: 0,

  titleSnake: [],
  titleSnakeDir: { x: 1, y: 0 },
  titleSnakeTimer: 0,

  lastFrameTime: 0,
  escPressedOnce: false,
  escResetTimer: 0,

  leaderboard: [],

  bonusEarnedMessages: [],

  reset: function() {
    this.score = 0;
    this.level = 1;
    this.lives = STARTING_LIVES;
    this.multiplier = 1;
    this.consecutiveFood = 0;
    this.foodEatenCount = 0;
    this.tickRate = INITIAL_TICK_MS;
    this.tickAccumulator = 0;
    this.isGrowing = false;
    this.direction = DIR_RIGHT;
    this.pendingDirection = DIR_RIGHT;
    const cx = Math.floor(GRID_COLS / 2);
    const cy = Math.floor(GRID_ROWS / 2);
    this.snake = [];
    for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
      this.snake.push({ x: cx - i, y: cy, drawX: (cx - i) * CELL_SIZE, drawY: cy * CELL_SIZE });
    }
    this.food = null;
    this.bonusFood = null;
    this.poisonFood = null;
    this.floatingTexts = [];
    this.deathTimer = 0;
    this.slowMoTimer = 0;
    this.screenShakeTimer = 0;
    this.flashTimer = 0;
    this.spawnFood();
    updateHudTitle(this.score);
  },

  spawnFood: function() {
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(s.x + ',' + s.y));
    if (this.bonusFood) occupied.add(this.bonusFood.x + ',' + this.bonusFood.y);
    if (this.poisonFood) occupied.add(this.poisonFood.x + ',' + this.poisonFood.y);
    let tries = 0;
    while (tries < 200) {
      const fx = Math.floor(Math.random() * GRID_COLS);
      const fy = Math.floor(Math.random() * GRID_ROWS);
      if (!occupied.has(fx + ',' + fy)) {
        this.food = {
          x: fx,
          y: fy,
          hue: Math.floor(Math.random() * 360),
          spawnTime: performance.now()
        };
        return;
      }
      tries++;
    }
  },

  spawnBonusFood: function() {
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(s.x + ',' + s.y));
    if (this.food) occupied.add(this.food.x + ',' + this.food.y);
    if (this.poisonFood) occupied.add(this.poisonFood.x + ',' + this.poisonFood.y);
    let tries = 0;
    while (tries < 200) {
      const fx = Math.floor(Math.random() * GRID_COLS);
      const fy = Math.floor(Math.random() * GRID_ROWS);
      if (!occupied.has(fx + ',' + fy)) {
        this.bonusFood = {
          x: fx,
          y: fy,
          spawnTime: performance.now(),
          hue: 0
        };
        this.bonusFoodSpawnTime = performance.now();
        return;
      }
      tries++;
    }
  },

  spawnPoisonFood: function() {
    if (this.level < POISON_MIN_LEVEL) return;
    if (this.poisonFood) return;
    if (Math.random() > 0.45) return;
    const occupied = new Set();
    this.snake.forEach(s => occupied.add(s.x + ',' + s.y));
    if (this.food) occupied.add(this.food.x + ',' + this.food.y);
    if (this.bonusFood) occupied.add(this.bonusFood.x + ',' + this.bonusFood.y);
    let tries = 0;
    while (tries < 200) {
      const fx = Math.floor(Math.random() * GRID_COLS);
      const fy = Math.floor(Math.random() * GRID_ROWS);
      if (!occupied.has(fx + ',' + fy)) {
        this.poisonFood = {
          x: fx,
          y: fy,
          spawnTime: performance.now()
        };
        AudioEngine.playSfx('warning');
        return;
      }
      tries++;
    }
  },

  loadHighScore: function() {
    const stored = localStorage.getItem(LS_HIGHSCORE);
    this.highScore = stored ? parseInt(stored, 10) : 0;
    const lb = localStorage.getItem(LS_LEADERBOARD);
    this.leaderboard = lb ? JSON.parse(lb) : [];
  },

  saveHighScore: function() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(LS_HIGHSCORE, String(this.highScore));
    }
    this.leaderboard.push({ score: this.score, date: Date.now() });
    this.leaderboard.sort((a, b) => b.score - a.score);
    this.leaderboard = this.leaderboard.slice(0, 3);
    localStorage.setItem(LS_LEADERBOARD, JSON.stringify(this.leaderboard));
  },

  addFloatingText: function(text, x, y, color) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      startY: y,
      color: color || '#FFFFFF',
      life: 800,
      maxLife: 800
    });
  },

  updateFloatingTexts: function(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y = ft.startY - (1 - ft.life / ft.maxLife) * 30;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  },

  triggerScreenShake: function() {
    this.screenShakeTimer = SCREEN_SHAKE_DURATION_MS;
  },

  triggerFlash: function(color) {
    this.flashTimer = 150;
    this.flashColor = color || '#FFFFFF';
  },

  initTitleSnake: function() {
    this.titleSnake = [];
    for (let i = 0; i < 8; i++) {
      this.titleSnake.push({ x: 5 + i, y: 12 });
    }
    this.titleSnakeDir = { x: 1, y: 0 };
    this.titleSnakeTimer = 0;
  },

  updateTitleSnake: function(dt) {
    this.titleSnakeTimer += dt;
    if (this.titleSnakeTimer >= 180) {
      this.titleSnakeTimer = 0;
      const head = this.titleSnake[0];
      let nx = head.x + this.titleSnakeDir.x;
      let ny = head.y + this.titleSnakeDir.y;
      if (nx < 2 || nx > GRID_COLS - 3 || ny < 4 || ny > GRID_ROWS - 4) {
        if (this.titleSnakeDir.x !== 0) {
          this.titleSnakeDir = { x: 0, y: Math.random() < 0.5 ? 1 : -1 };
        } else {
          this.titleSnakeDir = { x: Math.random() < 0.5 ? 1 : -1, y: 0 };
        }
        nx = head.x + this.titleSnakeDir.x;
        ny = head.y + this.titleSnakeDir.y;
      }
      this.titleSnake.unshift({ x: nx, y: ny });
      this.titleSnake.pop();
    }
  }
};

// === INPUT HANDLER ===
const InputHandler = {
  setDirection: function(newDir) {
    const cur = GameState.direction;
    // Prevent 180 degrees
    if (cur.x + newDir.x === 0 && cur.y + newDir.y === 0) return;
    GameState.pendingDirection = newDir;
  },

  handleKeyDown: function(e) {
    if (GameState.state === STATE_LOADING) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (GameState.escPressedOnce) {
        exitGame();
      } else {
        GameState.escPressedOnce = true;
        GameState.escResetTimer = 1500;
        escOverlay.style.display = 'block';
      }
      return;
    }

    if (e.key === 'm' || e.key === 'M') {
      AudioEngine.toggleMute();
      AudioEngine.playSfx('click');
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      togglePause();
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      if (GameState.state === STATE_PLAYING) {
        GameState.portalMode = !GameState.portalMode;
        AudioEngine.playSfx('portal');
      }
      return;
    }

    if (GameState.state === STATE_TITLE || GameState.state === STATE_GAME_OVER) {
      if (e.key === ' ' || e.key === 'Enter') {
        AudioEngine.resume();
        startNewGame();
        return;
      }
    }

    if (GameState.state !== STATE_PLAYING) return;

    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        InputHandler.setDirection(DIR_UP); break;
      case 'ArrowDown': case 's': case 'S':
        InputHandler.setDirection(DIR_DOWN); break;
      case 'ArrowLeft': case 'a': case 'A':
        InputHandler.setDirection(DIR_LEFT); break;
      case 'ArrowRight': case 'd': case 'D':
        InputHandler.setDirection(DIR_RIGHT); break;
    }
  },

  bindControls: function() {
    document.addEventListener('keydown', InputHandler.handleKeyDown);

    document.querySelectorAll('.dpadBtn').forEach(btn => {
      const dir = btn.getAttribute('data-dir');
      const handle = (ev) => {
        ev.preventDefault();
        if (GameState.state === STATE_TITLE || GameState.state === STATE_GAME_OVER) {
          AudioEngine.resume();
          startNewGame();
          return;
        }
        if (GameState.state !== STATE_PLAYING) return;
        if (dir === 'up') InputHandler.setDirection(DIR_UP);
        else if (dir === 'down') InputHandler.setDirection(DIR_DOWN);
        else if (dir === 'left') InputHandler.setDirection(DIR_LEFT);
        else if (dir === 'right') InputHandler.setDirection(DIR_RIGHT);
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 100);
      };
      btn.addEventListener('touchstart', handle, { passive: false });
      btn.addEventListener('mousedown', handle);
    });

    document.querySelectorAll('.actionBtn').forEach(btn => {
      const act = btn.getAttribute('data-act');
      const handle = (ev) => {
        ev.preventDefault();
        AudioEngine.resume();
        if (act === 'A') {
          if (GameState.state === STATE_TITLE || GameState.state === STATE_GAME_OVER) {
            startNewGame();
          } else if (GameState.state === STATE_PLAYING) {
            GameState.portalMode = !GameState.portalMode;
            AudioEngine.playSfx('portal');
          }
        } else if (act === 'B') {
          togglePause();
        }
        btn.classList.add('active');
        setTimeout(() => btn.classList.remove('active'), 100);
      };
      btn.addEventListener('touchstart', handle, { passive: false });
      btn.addEventListener('mousedown', handle);
    });

    btnExit.addEventListener('click', () => {
      AudioEngine.playSfx('click');
      exitGame();
    });

    btnMute.addEventListener('click', () => {
      AudioEngine.resume();
      AudioEngine.toggleMute();
      AudioEngine.playSfx('click');
    });

    btnPause.addEventListener('click', () => {
      AudioEngine.resume();
      togglePause();
    });

    canvas.addEventListener('click', () => {
      AudioEngine.resume();
      if (GameState.state === STATE_TITLE || GameState.state === STATE_GAME_OVER) {
        startNewGame();
      }
    });

    // Swipe controls
    let touchStartX = 0, touchStartY = 0;
    canvas.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      touchStartX = t.clientX;
      touchStartY = t.clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStartX;
      const dy = t.clientY - touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const threshold = 20;
      if (Math.max(absDx, absDy) < threshold) {
        if (GameState.state === STATE_TITLE || GameState.state === STATE_GAME_OVER) {
          startNewGame();
        }
        return;
      }
      if (GameState.state !== STATE_PLAYING) return;
      if (absDx > absDy) {
        if (dx > 0) InputHandler.setDirection(DIR_RIGHT);
        else InputHandler.setDirection(DIR_LEFT);
      } else {
        if (dy > 0) InputHandler.setDirection(DIR_DOWN);
        else InputHandler.setDirection(DIR_UP);
      }
    });
  }
};

function exitGame() {
  GameState.state = 'EXITED';
  AudioEngine.shutdown();
  try {
    window.parent.postMessage({ action: 'exitGame' }, '*');
  } catch (e) {}
  window.dispatchEvent(new CustomEvent('gameExit'));
  document.body.innerHTML = '<div style="color:#00FF41;font-family:Courier New;display:flex;align-items:center;justify-content:center;height:100vh;font-size:18px;">GAME EXITED</div>';
}

function togglePause() {
  if (GameState.state === STATE_PLAYING) {
    GameState.state = STATE_PAUSED;
    updatePauseButton(true);
    AudioEngine.stopMusic();
    AudioEngine.playSfx('click');
  } else if (GameState.state === STATE_PAUSED) {
    GameState.state = STATE_PLAYING;
    updatePauseButton(false);
    AudioEngine.startMusic();
    AudioEngine.playSfx('click');
  }
}

function startNewGame() {
  GameState.reset();
  GameState.state = STATE_PLAYING;
  AudioEngine.updateBpm(0);
  AudioEngine.startMusic();
  updatePauseButton(false);
}

// === GAME LOGIC ===
function updateLevel() {
  const newLevel = Math.floor(GameState.score / 100) + 1;
  if (newLevel > GameState.level) {
    GameState.level = newLevel;
    GameState.tickRate = Math.max(MIN_TICK_MS, INITIAL_TICK_MS - GameState.level * 8);
    AudioEngine.playSfx('levelup');
    GameState.triggerFlash('#FFFF00');
    ParticleSystem.burst(GAME_WIDTH / 2, GAME_HEIGHT / 2, 30, '#FFFF00', { maxSpeed: 0.4, life: 1000 });
  }
}

function increaseMultiplier() {
  GameState.consecutiveFood++;
  let newMult = 1;
  if (GameState.consecutiveFood >= 12) newMult = 8;
  else if (GameState.consecutiveFood >= 7) newMult = 4;
  else if (GameState.consecutiveFood >= 3) newMult = 2;
  if (newMult > GameState.multiplier) {
    GameState.multiplier = newMult;
    AudioEngine.playSfx('multiplier');
  }
}

function resetMultiplier() {
  GameState.multiplier = 1;
  GameState.consecutiveFood = 0;
}

function tickSnake() {
  GameState.direction = GameState.pendingDirection;
  const head = GameState.snake[0];
  let nx = head.x + GameState.direction.x;
  let ny = head.y + GameState.direction.y;

  // Wall handling
  if (nx < 0 || nx >= GRID_COLS || ny < 0 || ny >= GRID_ROWS) {
    if (GameState.portalMode) {
      if (nx < 0) nx = GRID_COLS - 1;
      else if (nx >= GRID_COLS) nx = 0;
      if (ny < 0) ny = GRID_ROWS - 1;
      else if (ny >= GRID_ROWS) ny = 0;
      AudioEngine.playSfx('portal');
      ParticleSystem.burst(head.x * CELL_SIZE + CELL_SIZE / 2, head.y * CELL_SIZE + CELL_SIZE / 2, 12, '#00FFFF', { maxSpeed: 0.2 });
    } else {
      handleDeath();
      return;
    }
  }

  // Self collision
  for (let i = 0; i < GameState.snake.length; i++) {
    if (GameState.snake[i].x === nx && GameState.snake[i].y === ny) {
      // Allow if it's the tail and not growing (tail moves out)
      if (i === GameState.snake.length - 1 && !GameState.isGrowing) {
        continue;
      }
      handleDeath();
      return;
    }
  }

  const newHead = { x: nx, y: ny, drawX: nx * CELL_SIZE, drawY: ny * CELL_SIZE };
  GameState.snake.unshift(newHead);

  // Food collision
  if (GameState.food && nx === GameState.food.x && ny === GameState.food.y) {
    const points = POINTS_REGULAR_BASE * GameState.level;
    GameState.score += points;
    GameState.foodEatenCount++;
    increaseMultiplier();
    GameState.isGrowing = true;
    GameState.addFloatingText('+' + points, GameState.food.x * CELL_SIZE + CELL_SIZE / 2, GameState.food.y * CELL_SIZE, '#00FF41');
    AudioEngine.playSfx('eat');
    ParticleSystem.burst(
      GameState.food.x * CELL_SIZE + CELL_SIZE / 2,
      GameState.food.y * CELL_SIZE + CELL_SIZE / 2,
      14, 'hsl(' + GameState.food.hue + ',100%,60%)',
      { type: PARTICLE_TYPE_CIRCLE, maxSpeed: 0.18 }
    );
    GameState.spawnFood();
    if (GameState.foodEatenCount % BONUS_FOOD_EVERY === 0) {
      GameState.spawnBonusFood();
    }
    GameState.spawnPoisonFood();
    updateHudTitle(GameState.score);
    updateLevel();
    AudioEngine.updateBpm(GameState.score);
    GameState.tickRate = Math.max(MIN_TICK_MS, INITIAL_TICK_MS - Math.floor(GameState.score * TICK_DECREMENT_PER_SCORE / 10));
  } else if (GameState.bonusFood && nx === GameState.bonusFood.x && ny === GameState.bonusFood.y) {
    const points = POINTS_BONUS_BASE * GameState.level * GameState.multiplier;
    GameState.score += points;
    increaseMultiplier();
    GameState.isGrowing = true;
    GameState.addFloatingText('+' + points + ' BONUS!', GameState.bonusFood.x * CELL_SIZE + CELL_SIZE / 2, GameState.bonusFood.y * CELL_SIZE, COLOR_GOLD);
    AudioEngine.playSfx('bonus');
    ParticleSystem.burst(
      GameState.bonusFood.x * CELL_SIZE + CELL_SIZE / 2,
      GameState.bonusFood.y * CELL_SIZE + CELL_SIZE / 2,
      24, COLOR_GOLD,
      { type: PARTICLE_TYPE_STAR, maxSpeed: 0.3, life: 800 }
    );
    GameState.bonusFood = null;
    GameState.triggerFlash(COLOR_GOLD);
    updateHudTitle(GameState.score);
    updateLevel();
    AudioEngine.updateBpm(GameState.score);
  } else if (GameState.poisonFood && nx === GameState.poisonFood.x && ny === GameState.poisonFood.y) {
    AudioEngine.playSfx('poison');
    GameState.lives--;
    resetMultiplier();
    GameState.addFloatingText('-1 LIFE!', GameState.poisonFood.x * CELL_SIZE + CELL_SIZE / 2, GameState.poisonFood.y * CELL_SIZE, COLOR_POISON);
    ParticleSystem.burst(
      GameState.poisonFood.x * CELL_SIZE + CELL_SIZE / 2,
      GameState.poisonFood.y * CELL_SIZE + CELL_SIZE / 2,
      20, COLOR_POISON,
      { type: PARTICLE_TYPE_SPARK, maxSpeed: 0.3 }
    );
    GameState.poisonFood = null;
    GameState.triggerFlash(COLOR_POISON);
    GameState.triggerScreenShake();
    // Shrink
    for (let s = 0; s < POISON_SHRINK_AMOUNT; s++) {
      if (GameState.snake.length > 3) GameState.snake.pop();
    }
    if (GameState.lives <= 0) {
      handleDeath();
      return;
    }
  } else {
    // No food eaten - remove tail
    if (GameState.isGrowing) {
      GameState.isGrowing = false;
    } else {
      GameState.lastTailSegment = GameState.snake.pop();
    }
  }

  // Trail particle behind head
  if (Math.random() < 0.6) {
    ParticleSystem.spawn({
      type: PARTICLE_TYPE_TRAIL,
      x: head.x * CELL_SIZE + CELL_SIZE / 2 + (Math.random() * 4 - 2),
      y: head.y * CELL_SIZE + CELL_SIZE / 2 + (Math.random() * 4 - 2),
      vx: 0, vy: 0,
      life: 300,
      size: 3,
      color: COLOR_SNAKE_HEAD
    });
  }

  // Bonus food countdown
  if (GameState.bonusFood) {
    const elapsed = performance.now() - GameState.bonusFoodSpawnTime;
    if (elapsed > BONUS_FOOD_LIFETIME_MS) {
      GameState.bonusFood = null;
    }
  }
}

function handleDeath() {
  GameState.lives--;
  AudioEngine.playSfx('death');
  GameState.triggerScreenShake();
  GameState.triggerFlash('#FF0000');
  AudioEngine.stopMusic();
  const head = GameState.snake[0];
  ParticleSystem.burst(
    head.x * CELL_SIZE + CELL_SIZE / 2,
    head.y * CELL_SIZE + CELL_SIZE / 2,
    60, '#FF3333',
    { type: PARTICLE_TYPE_SPARK, maxSpeed: 0.5, life: 1000 }
  );
  // Body segments scatter
  for (let i = 1; i < GameState.snake.length; i++) {
    const seg = GameState.snake[i];
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.1 + Math.random() * 0.2;
    ParticleSystem.spawn({
      type: PARTICLE_TYPE_CIRCLE,
      x: seg.x * CELL_SIZE + CELL_SIZE / 2,
      y: seg.y * CELL_SIZE + CELL_SIZE / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 0.15,
      life: 800,
      size: 8,
      color: COLOR_SNAKE_HEAD,
      gravity: true
    });
  }
  GameState.snake = [];
  GameState.deathTimer = DEATH_ANIMATION_MS;
  GameState.slowMoTimer = SLOW_MO_DURATION_MS;
  GameState.state = STATE_GAME_OVER;
  GameState.saveHighScore();
}

// === RENDERER ===
const Renderer = {
  drawBackground: function() {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    // Grid
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GAME_HEIGHT);
      ctx.stroke();
    }
    for (let j = 0; j <= GRID_ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * CELL_SIZE);
      ctx.lineTo(GAME_WIDTH, j * CELL_SIZE);
      ctx.stroke();
    }
  },

  drawSnake: function(time) {
    const snake = GameState.snake;
    if (snake.length === 0) return;
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const t = i / snake.length;
      const r = Math.floor(0x00 * (1 - t) + 0x00 * t);
      const g = Math.floor(0xFF * (1 - t) + 0x44 * t);
      const b = Math.floor(0x41 * (1 - t) + 0x00 * t);
      const color = 'rgb(' + r + ',' + g + ',' + b + ')';

      // Sine wave wiggle perpendicular to direction
      const wiggleOffset = Math.sin(time * 0.005 + i * 0.5) * 1.2;
      let dx = 0, dy = 0;
      if (GameState.direction.x !== 0) dy = wiggleOffset;
      else dx = wiggleOffset;

      const px = Math.floor(seg.x * CELL_SIZE + dx);
      const py = Math.floor(seg.y * CELL_SIZE + dy);

      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      this.roundRect(ctx, px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2, i === 0 ? 8 : 6);
      ctx.fill();
      ctx.restore();

      if (i === 0) {
        // Head detail - eyes
        const cx = px + CELL_SIZE / 2;
        const cy = py + CELL_SIZE / 2;
        const dir = GameState.direction;
        const eyeOffX = dir.x * 4;
        const eyeOffY = dir.y * 4;
        const perpX = -dir.y * 4;
        const perpY = dir.x * 4;
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx + eyeOffX + perpX, cy + eyeOffY + perpY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + eyeOffX - perpX, cy + eyeOffY - perpY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Tongue (flickers every 200ms)
        if (Math.floor(time / 200) % 2 === 0) {
          ctx.save();
          ctx.strokeStyle = '#FF3344';
          ctx.shadowBlur = 6;
          ctx.shadowColor = '#FF3344';
          ctx.lineWidth = 1.5;
          const tipX = cx + dir.x * (CELL_SIZE / 2 + 5);
          const tipY = cy + dir.y * (CELL_SIZE / 2 + 5);
          ctx.beginPath();
          ctx.moveTo(cx + dir.x * (CELL_SIZE / 2), cy + dir.y * (CELL_SIZE / 2));
          ctx.lineTo(tipX, tipY);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX + perpX * 0.5, tipY + perpY * 0.5);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(tipX, tipY);
          ctx.lineTo(tipX - perpX * 0.5, tipY - perpY * 0.5);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  },

  drawFood: function(time) {
    if (!GameState.food) return;
    const f = GameState.food;
    const cx = f.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = f.y * CELL_SIZE + CELL_SIZE / 2;
    const r = 8 + Math.sin(time * 0.006) * 2;
    const color = 'hsl(' + f.hue + ', 100%, 60%)';
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.floor(cx), Math.floor(cy), r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },

  drawBonusFood: function(time) {
    if (!GameState.bonusFood) return;
    const b = GameState.bonusFood;
    const cx = b.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = b.y * CELL_SIZE + CELL_SIZE / 2;
    const hue = (time * 0.2) % 360;
    const color = 'hsl(' + hue + ', 100%, 60%)';
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = color;
    ctx.fillStyle = COLOR_GOLD;
    ParticleSystem.drawStar(ctx, cx, cy, 9, 4.5, 5);
    ctx.fillStyle = color;
    ParticleSystem.drawStar(ctx, cx, cy, 6, 3, 5);
    ctx.restore();

    // Countdown ring
    const elapsed = performance.now() - GameState.bonusFoodSpawnTime;
    const remaining = 1 - elapsed / BONUS_FOOD_LIFETIME_MS;
    if (remaining > 0) {
      ctx.save();
      ctx.strokeStyle = COLOR_GOLD;
      ctx.shadowBlur = 10;
      ctx.shadowColor = COLOR_GOLD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 11, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * remaining);
      ctx.stroke();
      ctx.restore();
    }
  },

  drawPoisonFood: function(time) {
    if (!GameState.poisonFood) return;
    const p = GameState.poisonFood;
    const cx = p.x * CELL_SIZE + CELL_SIZE / 2;
    const cy = p.y * CELL_SIZE + CELL_SIZE / 2;
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLOR_POISON;
    ctx.fillStyle = COLOR_POISON;
    // Skull body
    ctx.beginPath();
    ctx.arc(cx, cy - 1, 6, 0, Math.PI * 2);
    ctx.fill();
    // Jaw
    ctx.fillRect(cx - 4, cy + 3, 8, 4);
    // Eyes (negative space)
    ctx.fillStyle = '#000000';
    ctx.fillRect(cx - 3, cy - 2, 2, 2);
    ctx.fillRect(cx + 1, cy - 2, 2, 2);
    // Teeth gaps
    ctx.fillRect(cx - 2, cy + 5, 1, 2);
    ctx.fillRect(cx + 1, cy + 5, 1, 2);
    ctx.restore();

    // Buzz aura particles
    const orbitCount = 7;
    for (let i = 0; i < orbitCount; i++) {
      const angle = (time * 0.003) + (i * Math.PI * 2 / orbitCount);
      const orbitR = 12 + Math.sin(time * 0.005 + i) * 2;
      const ox = cx + Math.cos(angle) * orbitR;
      const oy = cy + Math.sin(angle) * orbitR;
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = COLOR_POISON;
      ctx.shadowBlur = 8;
      ctx.shadowColor = COLOR_POISON;
      ctx.fillRect(Math.floor(ox), Math.floor(oy), 2, 2);
      ctx.restore();
    }
  },

  drawFloatingTexts: function() {
    GameState.floatingTexts.forEach(ft => {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = ft.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = ft.color;
      ctx.font = 'bold 12px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, Math.floor(ft.x), Math.floor(ft.y));
      ctx.restore();
    });
  },

  drawHudOverlays: function() {
    // Lives, Level, Multiplier, Portal status as on-canvas overlay (separate from top HUD bar)
    ctx.save();
    ctx.font = '11px Courier New';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#000000';
    ctx.textAlign = 'left';
    // Top-left of game area
    ctx.fillStyle = '#FF6600';
    ctx.fillText('LVL ' + GameState.level, 6, 14);
    ctx.fillStyle = '#FFD700';
    ctx.fillText('HI ' + GameState.highScore, 6, 28);
    // Top-right of game area
    ctx.textAlign = 'right';
    ctx.fillStyle = '#00FFFF';
    ctx.fillText('PORTAL: ' + (GameState.portalMode ? 'ON' : 'OFF'), GAME_WIDTH - 6, 14);
    ctx.fillStyle = GameState.multiplier > 1 ? '#FF6600' : '#888888';
    ctx.fillText('x' + GameState.multiplier, GAME_WIDTH - 6, 28);
    // Lives
    ctx.textAlign = 'left';
    for (let i = 0; i < GameState.lives; i++) {
      const lx = 6 + i * 14;
      const ly = 40;
      ctx.fillStyle = COLOR_SNAKE_HEAD;
      ctx.shadowBlur = 6;
      ctx.shadowColor = COLOR_SNAKE_HEAD;
      ctx.beginPath();
      ctx.arc(lx + 4, ly, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowBlur = 0;
      ctx.fillRect(lx + 5, ly - 1, 1, 1);
      ctx.fillRect(lx + 3, ly - 1, 1, 1);
    }
    ctx.restore();
  },

  drawTitleScreen: function(time) {
    ctx.save();
    // Animated demo snake
    GameState.titleSnake.forEach((seg, i) => {
      const t = i / GameState.titleSnake.length;
      const r = Math.floor(0x00 * (1 - t) + 0x00 * t);
      const g = Math.floor(0xFF * (1 - t) + 0x44 * t);
      const b = Math.floor(0x41 * (1 - t) + 0x00 * t);
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLOR_SNAKE_HEAD;
      ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
      this.roundRect(ctx, seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, 6);
      ctx.fill();
    });

    // Title text
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLOR_SNAKE_HEAD;
    ctx.fillStyle = COLOR_SNAKE_HEAD;
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('SNAKE', GAME_WIDTH / 2, 110);

    ctx.shadowBlur = 10;
    ctx.shadowColor = COLOR_NEON_ORANGE;
    ctx.fillStyle = COLOR_NEON_ORANGE;
    ctx.font = '14px Courier New';
    ctx.fillText('NEON ARCADE EDITION', GAME_WIDTH / 2, 135);

    // Blinking prompt
    if (Math.floor(time / 500) % 2 === 0) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px Courier New';
      ctx.fillText('SPACE or TAP to START', GAME_WIDTH / 2, 380);
    }

    ctx.shadowBlur = 4;
    ctx.fillStyle = '#888888';
    ctx.font = '10px Courier New';
    ctx.fillText('Arrows/WASD: Move    TAB: Portal Mode', GAME_WIDTH / 2, 420);
    ctx.fillText('P: Pause    M: Mute    ESC: Exit', GAME_WIDTH / 2, 438);

    if (GameState.highScore > 0) {
      ctx.shadowBlur = 6;
      ctx.shadowColor = COLOR_GOLD;
      ctx.fillStyle = COLOR_GOLD;
      ctx.font = '12px Courier New';
      ctx.fillText('HIGH SCORE: ' + GameState.highScore, GAME_WIDTH / 2, 470);
    }

    ctx.restore();
  },

  drawLoadingScreen: function() {
    ctx.save();
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLOR_SNAKE_HEAD;
    ctx.fillStyle = COLOR_SNAKE_HEAD;
    ctx.font = 'bold 28px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('LOADING...', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

    const barWidth = 300;
    const barHeight = 14;
    const bx = (GAME_WIDTH - barWidth) / 2;
    const by = GAME_HEIGHT / 2 + 10;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = COLOR_SNAKE_HEAD;
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barWidth, barHeight);
    ctx.shadowBlur = 10;
    ctx.shadowColor = COLOR_SNAKE_HEAD;
    ctx.fillStyle = COLOR_SNAKE_HEAD;
    ctx.fillRect(bx + 2, by + 2, (barWidth - 4) * GameState.loadingProgress, barHeight - 4);

    ctx.shadowBlur = 4;
    ctx.fillStyle = '#888888';
    ctx.font = '10px Courier New';
    ctx.fillText('Generating procedural audio buffers...', GAME_WIDTH / 2, by + 40);
    ctx.restore();
  },

  drawPausedOverlay: function() {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLOR_SNAKE_HEAD;
    ctx.fillStyle = COLOR_SNAKE_HEAD;
    ctx.font = 'bold 48px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Courier New';
    ctx.fillText('Press P or RESUME to continue', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 35);
    ctx.restore();
  },

  drawGameOverScreen: function(time) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FF3333';
    ctx.fillStyle = '#FF3333';
    ctx.font = 'bold 42px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', GAME_WIDTH / 2, 140);

    ctx.shadowBlur = 10;
    ctx.shadowColor = COLOR_SNAKE_HEAD;
    ctx.fillStyle = COLOR_SNAKE_HEAD;
    ctx.font = 'bold 24px Courier New';
    ctx.fillText('SCORE: ' + GameState.score, GAME_WIDTH / 2, 200);

    ctx.shadowBlur = 6;
    ctx.shadowColor = COLOR_GOLD;
    ctx.fillStyle = COLOR_GOLD;
    ctx.font = '14px Courier New';
    ctx.fillText('HIGH SCORE: ' + GameState.highScore, GAME_WIDTH / 2, 230);

    // Leaderboard
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '12px Courier New';
    ctx.fillText('— TOP 3 —', GAME_WIDTH / 2, 270);
    GameState.leaderboard.forEach((entry, i) => {
      ctx.fillStyle = i === 0 ? COLOR_GOLD : (i === 1 ? '#C0C0C0' : '#CD7F32');
      ctx.fillText((i + 1) + '.  ' + entry.score, GAME_WIDTH / 2, 295 + i * 20);
    });

    if (Math.floor(time / 500) % 2 === 0) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#FFFFFF';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Courier New';
      ctx.fillText('SPACE or TAP to REPLAY', GAME_WIDTH / 2, 420);
    }
    ctx.restore();
  },

  drawFlash: function() {
    if (GameState.flashTimer > 0) {
      const alpha = (GameState.flashTimer / 150) * 0.3;
      ctx.save();
      ctx.fillStyle = GameState.flashColor;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      ctx.restore();
    }
  },

  roundRect: function(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
};

// === MAIN LOOP ===
let crtFlickerLastTime = 0;

function gameLoop(currentTime) {
  if (GameState.state === 'EXITED') return;

  if (!GameState.lastFrameTime) GameState.lastFrameTime = currentTime;
  let dt = currentTime - GameState.lastFrameTime;
  if (dt > 100) dt = 100;
  GameState.lastFrameTime = currentTime;

  // Slow motion
  let effectiveDt = dt;
  if (GameState.slowMoTimer > 0) {
    effectiveDt = dt * SLOW_MO_FACTOR;
    GameState.slowMoTimer -= dt;
  }

  // ESC reset timer
  if (GameState.escPressedOnce) {
    GameState.escResetTimer -= dt;
    if (GameState.escResetTimer <= 0) {
      GameState.escPressedOnce = false;
      escOverlay.style.display = 'none';
    }
  }

  // CRT flicker
  if (currentTime - crtFlickerLastTime > CRT_FLICKER_INTERVAL_MS) {
    crtFlickerLastTime = currentTime;
    crtFlicker.style.background = 'rgba(255,255,255,0.08)';
    setTimeout(() => { crtFlicker.style.background = 'rgba(255,255,255,0)'; }, CRT_FLICKER_DURATION_MS);
  }

  // Update flash
  if (GameState.flashTimer > 0) {
    GameState.flashTimer -= dt;
  }
  if (GameState.screenShakeTimer > 0) {
    GameState.screenShakeTimer -= dt;
  }

  // State-driven update
  if (GameState.state === STATE_LOADING) {
    GameState.loadingProgress = Math.min(1, (currentTime - GameState.loadingStartTime) / LOADING_DURATION_MS);
    if (GameState.loadingProgress >= 1) {
      GameState.state = STATE_TITLE;
      GameState.initTitleSnake();
    }
  } else if (GameState.state === STATE_TITLE) {
    GameState.updateTitleSnake(dt);
    ParticleSystem.update(dt);
  } else if (GameState.state === STATE_PLAYING) {
    GameState.tickAccumulator += effectiveDt;
    while (GameState.tickAccumulator >= GameState.tickRate) {
      GameState.tickAccumulator -= GameState.tickRate;
      tickSnake();
      if (GameState.state !== STATE_PLAYING) break;
    }
    GameState.updateFloatingTexts(dt);
    ParticleSystem.update(effectiveDt);
  } else if (GameState.state === STATE_PAUSED) {
    // No updates
  } else if (GameState.state === STATE_GAME_OVER) {
    if (GameState.deathTimer > 0) GameState.deathTimer -= dt;
    GameState.updateFloatingTexts(dt);
    ParticleSystem.update(effectiveDt);
  }

  // === RENDER ===
  ctx.save();
  // Screen shake
  if (GameState.screenShakeTimer > 0) {
    const intensity = (GameState.screenShakeTimer / SCREEN_SHAKE_DURATION_MS) * 8;
    ctx.translate(
      Math.floor((Math.random() - 0.5) * intensity),
      Math.floor((Math.random() - 0.5) * intensity)
    );
  }

  if (GameState.state === STATE_LOADING) {
    Renderer.drawLoadingScreen();
  } else if (GameState.state === STATE_TITLE) {
    Renderer.drawBackground();
    ParticleSystem.draw(ctx);
    Renderer.drawTitleScreen(currentTime);
  } else if (GameState.state === STATE_PLAYING) {
    Renderer.drawBackground();
    Renderer.drawFood(currentTime);
    Renderer.drawBonusFood(currentTime);
    Renderer.drawPoisonFood(currentTime);
    ParticleSystem.draw(ctx);
    Renderer.drawSnake(currentTime);
    Renderer.drawFloatingTexts();
    Renderer.drawHudOverlays();
    Renderer.drawFlash();
  } else if (GameState.state === STATE_PAUSED) {
    Renderer.drawBackground();
    Renderer.drawFood(currentTime);
    Renderer.drawBonusFood(currentTime);
    Renderer.drawPoisonFood(currentTime);
    Renderer.drawSnake(currentTime);
    Renderer.drawHudOverlays();
    Renderer.drawPausedOverlay();
  } else if (GameState.state === STATE_GAME_OVER) {
    Renderer.drawBackground();
    ParticleSystem.draw(ctx);
    Renderer.drawFloatingTexts();
    Renderer.drawHudOverlays();
    Renderer.drawFlash();
    if (GameState.deathTimer <= 0) {
      Renderer.drawGameOverScreen(currentTime);
    }
  }

  ctx.restore();

  updateHudTitle(GameState.score);

  requestAnimationFrame(gameLoop);
}

// === INIT ===
function init() {
  AudioEngine.init();
  ParticleSystem.init();
  GameState.loadHighScore();
  GameState.reset();
  GameState.state = STATE_LOADING;
  GameState.loadingStartTime = performance.now();
  InputHandler.bindControls();
  updateMuteButton(AudioEngine.muted);
  updatePauseButton(false);
  updateHudTitle(0);
  // Resize handler — scale content to fit
  function fitToScreen() {
    const wrap = document.getElementById('gameContainer');
    if (!wrap) return;
    const wRatio = window.innerWidth / 500;
    const hRatio = window.innerHeight / 591;
    const scale = Math.min(wRatio, hRatio);
    wrap.style.transform = 'scale(' + scale + ')';
    wrap.style.transformOrigin = 'center center';
  }
  window.addEventListener('resize', fitToScreen);
  fitToScreen();
  requestAnimationFrame(gameLoop);
}

window.addEventListener('load', init);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && GameState.state === STATE_PLAYING) {
    togglePause();
  }
});

window.addEventListener('beforeunload', () => {
  AudioEngine.shutdown();
});
</script>
</body>
</html>
`;

export const SnakeGame = () => (
  <iframe
    srcDoc={SNAKE_HTML}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background: '#050505',
    }}
    title="Snake"
    sandbox="allow-scripts allow-same-origin"
  />
);
