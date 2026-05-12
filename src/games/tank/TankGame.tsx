const TANK_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>TANK — Legendary Turret Defense</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; }
  html, body {
    width: 100%;
    height: 100%;
    background: #000;
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
    height: 551px;
    background: #050505;
    box-shadow: 0 0 40px rgba(68, 255, 0, 0.2);
    overflow: hidden;
  }
  #hudTop {
    position: absolute;
    top: 0;
    left: 0;
    width: 500px;
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
    width: 70px;
    height: 28px;
    background: rgba(255,60,60,0.8);
    border: 1px solid rgba(255,100,100,0.5);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.15s;
  }
  #exitBtn:hover { background: rgba(255,60,60,1); }
  #hudTitle {
    flex: 1;
    text-align: center;
    color: #44FF00;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    font-weight: bold;
    text-shadow: 0 0 6px rgba(68,255,0,0.8), 0 0 12px rgba(68,255,0,0.4);
    letter-spacing: 1px;
  }
  .hudBtn {
    height: 28px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 5px;
    color: white;
    font-family: 'Courier New', monospace;
    font-size: 11px;
    cursor: pointer;
    margin-left: 4px;
    transition: background 0.15s;
  }
  .hudBtn:hover { background: rgba(255,255,255,0.2); }
  #muteBtn { width: 70px; }
  #pauseBtn { width: 85px; }
  #gameCanvas {
    position: absolute;
    top: 36px;
    left: 0;
    width: 500px;
    height: 460px;
    background: #050505;
    display: block;
    cursor: crosshair;
  }
  #mobileBar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 500px;
    height: 55px;
    background: rgba(0,0,0,0.75);
    border-top: 1px solid rgba(255,255,255,0.1);
    z-index: 10;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
  }
  #dpad {
    width: 45px;
    height: 45px;
    border: 2px solid rgba(68,255,0,0.4);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #44FF00;
    font-size: 9px;
    text-align: center;
    line-height: 1;
  }
  #shortcutLabels {
    color: rgba(255,255,255,0.5);
    font-size: 9px;
    font-family: 'Courier New', monospace;
    text-align: center;
    flex: 1;
    line-height: 1.4;
  }
  .actionBtn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 2px solid;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    font-size: 14px;
    color: white;
    cursor: pointer;
    margin-left: 6px;
    transition: transform 0.08s, filter 0.08s;
  }
  .actionBtn:active { transform: scale(0.9); filter: brightness(1.6); }
  #btnA { background: rgba(68,255,0,0.3); border-color: #44FF00; }
  #btnB { background: rgba(255,34,0,0.3); border-color: #FF2200; }
  #escOverlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 14px 22px;
    background: rgba(0,0,0,0.85);
    color: #FF2200;
    border: 1px solid #FF2200;
    border-radius: 6px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    z-index: 20;
    display: none;
    text-shadow: 0 0 8px rgba(255,34,0,0.8);
  }
  #crtOverlay {
    position: absolute;
    top: 36px;
    left: 0;
    width: 500px;
    height: 460px;
    pointer-events: none;
    z-index: 5;
    background:
      repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 2px),
      radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%);
    mix-blend-mode: normal;
  }
</style>
</head>
<body>
<div id="gameContainer">
  <div id="hudTop">
    <button id="exitBtn">✕ EXIT</button>
    <div id="hudTitle">TANK — Wave 1 — 0</div>
    <div>
      <button id="muteBtn" class="hudBtn">🔊 SFX</button>
      <button id="pauseBtn" class="hudBtn">⏸ PAUSE</button>
    </div>
  </div>
  <canvas id="gameCanvas" width="500" height="460"></canvas>
  <div id="crtOverlay"></div>
  <div id="mobileBar">
    <div id="dpad">AIM</div>
    <div id="shortcutLabels">[Click/Tap]=Fire<br>[Space]=Mega [P]=Pause [M]=Mute [T]=AutoAim</div>
    <div>
      <button id="btnA" class="actionBtn">A</button>
      <button id="btnB" class="actionBtn">B</button>
    </div>
  </div>
  <div id="escOverlay">Press ESC again to exit</div>
</div>

<script>
'use strict';

// === CONSTANTS ===
const GAME_WIDTH = 500;
const GAME_HEIGHT = 460;
const HUD_HEIGHT = 36;
const BOTTOM_BAR_HEIGHT = 55;

const COLOR_BG = '#050505';
const COLOR_GREEN = '#44FF00';
const COLOR_RED = '#FF2200';
const COLOR_YELLOW = '#FFDD00';
const COLOR_BASE = '#446644';
const COLOR_PLATFORM = '#333333';
const COLOR_BARREL = '#444444';
const COLOR_INFANTRY = '#AA3322';
const COLOR_JEEP = '#B89060';
const COLOR_TRUCK = '#555555';
const COLOR_TANK = '#6B7A3A';
const COLOR_HELI = '#3A3A3A';
const COLOR_BOSS = '#553311';

const STATE_LOADING = 'LOADING';
const STATE_TITLE = 'TITLE';
const STATE_PLAYING = 'PLAYING';
const STATE_WAVE_BREAK = 'WAVE_BREAK';
const STATE_PAUSED = 'PAUSED';
const STATE_GAME_OVER = 'GAME_OVER';
const STATE_HIGHSCORE = 'HIGHSCORE';

const TURRET_X = GAME_WIDTH / 2;
const TURRET_Y = GAME_HEIGHT - 70;
const TURRET_PLATFORM_RADIUS = 40;
const TURRET_BARREL_WIDTH = 8;
const TURRET_BARREL_LENGTH = 30;

const BASE_WIDTH = 120;
const BASE_HEIGHT = 25;
const BASE_X = (GAME_WIDTH - BASE_WIDTH) / 2;
const BASE_Y = GAME_HEIGHT - BASE_HEIGHT - 4;
const BASE_MAX_HP_INITIAL = 100;

const BULLET_WIDTH = 12;
const BULLET_HEIGHT = 5;
const BULLET_SPEED_INITIAL = 400;
const BULLET_FIRE_RATE_INITIAL = 300;
const MAX_BULLETS = 20;

const MEGA_BULLET_WIDTH = 20;
const MEGA_BULLET_HEIGHT = 8;
const MEGA_CHARGE_TIME = 2000;
const MEGA_SHOTS_INITIAL = 3;

const AIM_INDICATOR_LENGTH = 300;
const AUTOAIM_ANGLE_THRESHOLD = 15 * Math.PI / 180;

const ENEMY_INFANTRY_RADIUS = 12;
const ENEMY_INFANTRY_SPEED = 60;
const ENEMY_INFANTRY_HP = 1;
const ENEMY_INFANTRY_POINTS = 10;
const ENEMY_INFANTRY_COINS = 5;

const ENEMY_JEEP_W = 18;
const ENEMY_JEEP_H = 24;
const ENEMY_JEEP_SPEED = 80;
const ENEMY_JEEP_HP = 3;
const ENEMY_JEEP_POINTS = 30;
const ENEMY_JEEP_COINS = 15;

const ENEMY_TRUCK_W = 32;
const ENEMY_TRUCK_H = 22;
const ENEMY_TRUCK_SPEED = 40;
const ENEMY_TRUCK_HP = 6;
const ENEMY_TRUCK_POINTS = 75;
const ENEMY_TRUCK_COINS = 25;

const ENEMY_TANK_W = 40;
const ENEMY_TANK_H = 28;
const ENEMY_TANK_SPEED = 30;
const ENEMY_TANK_HP = 12;
const ENEMY_TANK_POINTS = 200;
const ENEMY_TANK_COINS = 50;
const ENEMY_TANK_FIRE_INTERVAL = 3000;
const ENEMY_ORB_SPEED = 200;
const ENEMY_ORB_RADIUS = 8;

const ENEMY_HELI_W = 36;
const ENEMY_HELI_H = 16;
const ENEMY_HELI_SPEED = 70;
const ENEMY_HELI_HP = 8;
const ENEMY_HELI_POINTS = 150;
const ENEMY_HELI_COINS = 30;
const ENEMY_HELI_BOMB_AOE = 40;

const BOSS_W = 120;
const BOSS_H = 84;
const BOSS_SPEED = 18;
const BOSS_HP = 50;
const BOSS_POINTS = 1000;
const BOSS_COINS = 200;
const BOSS_SHIELD_HP = 15;
const BOSS_FIRE_INTERVAL = 2800;

const PARTICLE_POOL_SIZE = 500;
const PARTICLE_TYPE_SPARK = 0;
const PARTICLE_TYPE_CIRCLE = 1;
const PARTICLE_TYPE_STAR = 2;
const PARTICLE_TYPE_TRAIL = 3;

const WAVE_BREAK_DURATION = 5000;
const LOADING_DURATION = 1500;
const MUZZLE_FLASH_DURATION = 80;
const FLOATING_TEXT_DURATION = 800;

const MUSIC_BPM_BASE = 120;
const MUSIC_VOLUME = 0.25;
const SFX_VOLUME = 0.4;

const LS_KEY_MUTE = 'mute_tank';
const LS_KEY_HIGHSCORE = 'hs_tank';
const LS_KEY_LEADERBOARD = 'lb_tank';

// === HUD SETUP ===
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hudTitle = document.getElementById('hudTitle');
const exitBtn = document.getElementById('exitBtn');
const muteBtn = document.getElementById('muteBtn');
const pauseBtn = document.getElementById('pauseBtn');
const btnA = document.getElementById('btnA');
const btnB = document.getElementById('btnB');
const escOverlay = document.getElementById('escOverlay');

function updateHudTitle(wave, score) {
  hudTitle.textContent = 'TANK — Wave ' + wave + ' — ' + score;
}

function updateMuteButton(isMuted) {
  muteBtn.textContent = isMuted ? '🔇 SFX' : '🔊 SFX';
}

function updatePauseButton(isPaused) {
  pauseBtn.textContent = isPaused ? '▶ RESUME' : '⏸ PAUSE';
}

// === AUDIO ENGINE ===
const AudioEngine = {
  ctx: null,
  musicGain: null,
  sfxGain: null,
  masterGain: null,
  muted: false,
  musicStarted: false,
  bpm: MUSIC_BPM_BASE,
  nextNoteTime: 0,
  noteIndex: 0,
  musicSchedulerId: null,
  melodyNotes: [
    392.00, 466.16, 587.33, 466.16, 392.00, 349.23, 392.00, 466.16,
    523.25, 466.16, 392.00, 349.23, 311.13, 349.23, 392.00, 466.16
  ],
  bassNotes: [
    98.00, 98.00, 116.54, 116.54, 98.00, 98.00, 87.31, 87.31,
    98.00, 98.00, 116.54, 116.54, 130.81, 130.81, 98.00, 98.00
  ],

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = MUSIC_VOLUME;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = SFX_VOLUME;
      this.sfxGain.connect(this.masterGain);

      const storedMute = localStorage.getItem(LS_KEY_MUTE);
      this.muted = storedMute === 'true';
      this.applyMuteState();
    } catch (e) {
      this.ctx = null;
    }
  },

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  },

  applyMuteState() {
    if (!this.masterGain) return;
    this.masterGain.gain.setValueAtTime(this.muted ? 0 : 1, this.ctx.currentTime);
  },

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(LS_KEY_MUTE, this.muted ? 'true' : 'false');
    this.applyMuteState();
    return this.muted;
  },

  setBpm(scoreValue) {
    this.bpm = MUSIC_BPM_BASE + Math.floor(scoreValue / 500) * 2;
  },

  startMusic() {
    if (!this.ctx || this.musicStarted) return;
    this.musicStarted = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.noteIndex = 0;
    this.scheduleMusic();
  },

  stopMusic() {
    this.musicStarted = false;
    if (this.musicSchedulerId !== null) {
      clearTimeout(this.musicSchedulerId);
      this.musicSchedulerId = null;
    }
  },

  scheduleMusic() {
    if (!this.musicStarted || !this.ctx) return;
    const noteDuration = 60 / this.bpm / 2;
    while (this.nextNoteTime < this.ctx.currentTime + 0.15) {
      this.playNoteAt(this.nextNoteTime, noteDuration);
      this.nextNoteTime += noteDuration;
      this.noteIndex = (this.noteIndex + 1) % 16;
    }
    this.musicSchedulerId = setTimeout(() => this.scheduleMusic(), 30);
  },

  playNoteAt(time, duration) {
    if (!this.ctx) return;
    const melodyFreq = this.melodyNotes[this.noteIndex];
    const bassFreq = this.bassNotes[this.noteIndex];

    // Melody (triangle)
    const melOsc = this.ctx.createOscillator();
    const melGain = this.ctx.createGain();
    melOsc.type = 'triangle';
    melOsc.frequency.setValueAtTime(melodyFreq, time);
    melGain.gain.setValueAtTime(0, time);
    melGain.gain.linearRampToValueAtTime(0.4, time + 0.01);
    melGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.9);
    melOsc.connect(melGain);
    melGain.connect(this.musicGain);
    melOsc.start(time);
    melOsc.stop(time + duration);

    // Bass (square)
    const bassOsc = this.ctx.createOscillator();
    const bassGain = this.ctx.createGain();
    bassOsc.type = 'square';
    bassOsc.frequency.setValueAtTime(bassFreq, time);
    bassGain.gain.setValueAtTime(0, time);
    bassGain.gain.linearRampToValueAtTime(0.5, time + 0.01);
    bassGain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.95);
    bassOsc.connect(bassGain);
    bassGain.connect(this.musicGain);
    bassOsc.start(time);
    bassOsc.stop(time + duration);

    // Kick on beats 0, 4, 8, 12
    if (this.noteIndex % 4 === 0) {
      const kickOsc = this.ctx.createOscillator();
      const kickGain = this.ctx.createGain();
      kickOsc.type = 'sine';
      kickOsc.frequency.setValueAtTime(120, time);
      kickOsc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
      kickGain.gain.setValueAtTime(0.7, time);
      kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
      kickOsc.connect(kickGain);
      kickGain.connect(this.musicGain);
      kickOsc.start(time);
      kickOsc.stop(time + 0.08);
    }

    // Hi-hat on off-beats
    if (this.noteIndex % 2 === 1) {
      const bufferSize = this.ctx.sampleRate * 0.03;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;
      const hatGain = this.ctx.createGain();
      hatGain.gain.setValueAtTime(0.15, time);
      hatGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
      noiseSrc.connect(filter);
      filter.connect(hatGain);
      hatGain.connect(this.musicGain);
      noiseSrc.start(time);
      noiseSrc.stop(time + 0.03);
    }
  },

  sfxFire() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);
  },

  sfxMegaCharge() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, t);
    osc.frequency.exponentialRampToValueAtTime(1800, t + 0.5);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.5);
  },

  sfxMegaFire() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.2);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.2);
  },

  sfxHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.03);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.03);
  },

  sfxPop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.02);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.02);
  },

  sfxExplosion() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
    src.stop(t + 0.2);
  },

  sfxBaseHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.1);
  },

  sfxWaveComplete() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + i * 0.1);
      g.gain.setValueAtTime(0, t + i * 0.1);
      g.gain.linearRampToValueAtTime(0.35, t + i * 0.1 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.1 + 0.18);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + i * 0.1);
      osc.stop(t + i * 0.1 + 0.18);
    });
  },

  sfxPurchase() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [880, 1318].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + i * 0.05);
      g.gain.setValueAtTime(0.3, t + i * 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.1);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.1);
    });
  },

  sfxEnemyFire() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + 0.04);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.04);
  },

  sfxBombDrop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.3);
  },

  sfxUiClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    g.gain.setValueAtTime(0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.01);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.01);
  },

  close() {
    this.stopMusic();
    if (this.ctx) {
      try { this.ctx.close(); } catch (e) {}
      this.ctx = null;
    }
  }
};

// === PARTICLE SYSTEM ===
const Particles = {
  pool: [],
  nextIndex: 0,

  init() {
    this.pool = [];
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      this.pool.push({
        active: false,
        type: PARTICLE_TYPE_SPARK,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        size: 2, color: '#FFFFFF',
        gravity: false
      });
    }
  },

  spawn(type, x, y, vx, vy, maxLife, size, color, gravity) {
    for (let attempts = 0; attempts < PARTICLE_POOL_SIZE; attempts++) {
      const p = this.pool[this.nextIndex];
      this.nextIndex = (this.nextIndex + 1) % PARTICLE_POOL_SIZE;
      if (!p.active) {
        p.active = true;
        p.type = type;
        p.x = x; p.y = y;
        p.vx = vx; p.vy = vy;
        p.life = maxLife;
        p.maxLife = maxLife;
        p.size = size;
        p.color = color;
        p.gravity = gravity;
        return p;
      }
    }
    return null;
  },

  burst(x, y, count, color) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      this.spawn(PARTICLE_TYPE_SPARK, x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        0.4 + Math.random() * 0.3, 2, color, false);
    }
  },

  explosion(x, y, color) {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 200;
      this.spawn(PARTICLE_TYPE_SPARK, x, y,
        Math.cos(angle) * speed, Math.sin(angle) * speed,
        0.5 + Math.random() * 0.4, 2 + Math.random() * 2, color, false);
    }
    this.spawn(PARTICLE_TYPE_CIRCLE, x, y, 0, 0, 0.3, 30, color, false);
  },

  bulletTrail(x, y, color) {
    this.spawn(PARTICLE_TYPE_TRAIL, x, y, 0, 0, 0.1, 3, color, false);
  },

  bombTrail(x, y) {
    this.spawn(PARTICLE_TYPE_TRAIL, x + (Math.random() - 0.5) * 2, y, 0, 0, 0.3, 2, '#FFAA00', false);
  },

  update(deltaSeconds) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      p.life -= deltaSeconds;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }
      p.x += p.vx * deltaSeconds;
      p.y += p.vy * deltaSeconds;
      if (p.gravity) p.vy += 200 * deltaSeconds;
    }
  },

  render(context) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = this.pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      context.globalAlpha = alpha;
      context.fillStyle = p.color;
      context.shadowBlur = 8;
      context.shadowColor = p.color;
      if (p.type === PARTICLE_TYPE_SPARK) {
        context.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
      } else if (p.type === PARTICLE_TYPE_CIRCLE) {
        context.beginPath();
        context.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        context.fill();
      } else if (p.type === PARTICLE_TYPE_TRAIL) {
        context.fillRect(Math.floor(p.x - p.size/2), Math.floor(p.y - p.size/2), p.size, p.size);
      } else if (p.type === PARTICLE_TYPE_STAR) {
        context.save();
        context.translate(p.x, p.y);
        context.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = s * Math.PI / 3;
          const r = s % 2 === 0 ? p.size : p.size * 0.4;
          if (s === 0) context.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else context.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        context.closePath();
        context.fill();
        context.restore();
      }
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
  }
};

// === GAME STATE ===
const Game = {
  state: STATE_LOADING,
  loadStartTime: 0,
  lastTime: 0,
  paused: false,
  running: true,

  score: 0,
  highScore: 0,
  leaderboard: [],
  coins: 0,
  wave: 1,
  enemiesRemaining: 0,
  waveBreakStart: 0,
  perfectWave: true,

  base: { hp: 100, maxHp: 100, flashTimer: 0 },

  turret: {
    aimX: GAME_WIDTH / 2,
    aimY: 100,
    angle: -Math.PI / 2,
    lastFireTime: 0,
    fireRate: BULLET_FIRE_RATE_INITIAL,
    bulletSpeed: BULLET_SPEED_INITIAL,
    bulletSizeMult: 1.0,
    explosiveRounds: false,
    megaShots: MEGA_SHOTS_INITIAL,
    megaCharging: false,
    megaChargeStart: 0,
    megaCharged: false,
    recoil: 0,
    muzzleFlashTimer: 0,
    autoAim: true
  },

  bullets: [],
  megaBullets: [],
  enemyOrbs: [],
  enemyBombs: [],
  enemies: [],
  floatingTexts: [],

  shake: 0,
  flashRed: 0,
  flashGreen: 0,
  slowMo: 0,

  escPromptTimer: 0,
  pendingExit: false,
  crtFlickerTimer: 0,
  crtFlickerIntensity: 0,

  reset() {
    this.score = 0;
    this.coins = 0;
    this.wave = 1;
    this.base.hp = BASE_MAX_HP_INITIAL;
    this.base.maxHp = BASE_MAX_HP_INITIAL;
    this.base.flashTimer = 0;
    this.turret.fireRate = BULLET_FIRE_RATE_INITIAL;
    this.turret.bulletSpeed = BULLET_SPEED_INITIAL;
    this.turret.bulletSizeMult = 1.0;
    this.turret.explosiveRounds = false;
    this.turret.megaShots = MEGA_SHOTS_INITIAL;
    this.turret.megaCharging = false;
    this.turret.megaCharged = false;
    this.turret.recoil = 0;
    this.turret.muzzleFlashTimer = 0;
    this.bullets.length = 0;
    this.megaBullets.length = 0;
    this.enemyOrbs.length = 0;
    this.enemyBombs.length = 0;
    this.enemies.length = 0;
    this.floatingTexts.length = 0;
    this.shake = 0;
    this.flashRed = 0;
    this.flashGreen = 0;
    this.slowMo = 0;
    this.perfectWave = true;
    Particles.init();
  },

  loadHighScores() {
    try {
      const hs = parseInt(localStorage.getItem(LS_KEY_HIGHSCORE) || '0', 10);
      this.highScore = isNaN(hs) ? 0 : hs;
      const lb = localStorage.getItem(LS_KEY_LEADERBOARD);
      this.leaderboard = lb ? JSON.parse(lb) : [];
    } catch (e) {
      this.highScore = 0;
      this.leaderboard = [];
    }
  },

  saveHighScore() {
    try {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem(LS_KEY_HIGHSCORE, String(this.highScore));
      }
      this.leaderboard.push(this.score);
      this.leaderboard.sort((a, b) => b - a);
      this.leaderboard = this.leaderboard.slice(0, 3);
      localStorage.setItem(LS_KEY_LEADERBOARD, JSON.stringify(this.leaderboard));
    } catch (e) {}
  }
};

// === INPUT HANDLER ===
const Input = {
  mouseX: GAME_WIDTH / 2,
  mouseY: 100,
  isFiring: false,
  spaceDown: false,
  keys: {},
  shopButtons: [],
  startButtonHover: false,

  init() {
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', (e) => this.onTouchEnd(e), { passive: false });

    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));

    exitBtn.addEventListener('click', () => doExit());
    muteBtn.addEventListener('click', () => {
      const muted = AudioEngine.toggleMute();
      updateMuteButton(muted);
      AudioEngine.sfxUiClick();
    });
    pauseBtn.addEventListener('click', () => togglePause());

    btnA.addEventListener('touchstart', (e) => { e.preventDefault(); this.isFiring = true; this.handleFire(); });
    btnA.addEventListener('touchend', (e) => { e.preventDefault(); this.isFiring = false; });
    btnA.addEventListener('mousedown', () => { this.isFiring = true; this.handleFire(); });
    btnA.addEventListener('mouseup', () => { this.isFiring = false; });

    btnB.addEventListener('touchstart', (e) => { e.preventDefault(); this.startMegaCharge(); });
    btnB.addEventListener('touchend', (e) => { e.preventDefault(); this.releaseMega(); });
    btnB.addEventListener('mousedown', () => { this.startMegaCharge(); });
    btnB.addEventListener('mouseup', () => { this.releaseMega(); });
  },

  getCanvasCoords(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  },

  onMouseMove(e) {
    const c = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = c.x;
    this.mouseY = c.y;
  },

  onMouseDown(e) {
    AudioEngine.resume();
    const c = this.getCanvasCoords(e.clientX, e.clientY);
    this.mouseX = c.x;
    this.mouseY = c.y;
    this.handleClick();
  },

  onMouseUp(e) {
    this.isFiring = false;
  },

  onTouchStart(e) {
    e.preventDefault();
    AudioEngine.resume();
    if (e.touches.length > 0) {
      const c = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
      this.mouseX = c.x;
      this.mouseY = c.y;
      this.handleClick();
      this.isFiring = true;
    }
  },

  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length > 0) {
      const c = this.getCanvasCoords(e.touches[0].clientX, e.touches[0].clientY);
      this.mouseX = c.x;
      this.mouseY = c.y;
    }
  },

  onTouchEnd(e) {
    e.preventDefault();
    this.isFiring = false;
  },

  handleClick() {
    if (Game.state === STATE_TITLE) {
      Game.state = STATE_PLAYING;
      AudioEngine.startMusic();
      startWave(Game.wave);
      return;
    }
    if (Game.state === STATE_GAME_OVER) {
      Game.reset();
      Game.state = STATE_TITLE;
      return;
    }
    if (Game.state === STATE_WAVE_BREAK) {
      this.handleShopClick();
      return;
    }
    if (Game.state === STATE_PLAYING) {
      this.handleFire();
    }
  },

  handleShopClick() {
    for (const btn of this.shopButtons) {
      if (this.mouseX >= btn.x && this.mouseX <= btn.x + btn.w &&
          this.mouseY >= btn.y && this.mouseY <= btn.y + btn.h) {
        if (Game.coins >= btn.cost) {
          Game.coins -= btn.cost;
          btn.action();
          AudioEngine.sfxPurchase();
        } else {
          AudioEngine.sfxUiClick();
        }
        return;
      }
    }
  },

  handleFire() {
    if (Game.state !== STATE_PLAYING) return;
    fireBullet();
  },

  startMegaCharge() {
    if (Game.state !== STATE_PLAYING) return;
    if (Game.turret.megaShots <= 0) return;
    if (Game.turret.megaCharging) return;
    Game.turret.megaCharging = true;
    Game.turret.megaChargeStart = performance.now();
    Game.turret.megaCharged = false;
    AudioEngine.sfxMegaCharge();
  },

  releaseMega() {
    if (!Game.turret.megaCharging) return;
    if (Game.turret.megaCharged) {
      fireMegaBullet();
    }
    Game.turret.megaCharging = false;
    Game.turret.megaCharged = false;
  },

  onKeyDown(e) {
    if (this.keys[e.code]) return;
    this.keys[e.code] = true;
    AudioEngine.resume();

    if (e.code === 'Escape') {
      handleEscape();
      e.preventDefault();
    } else if (e.code === 'KeyM') {
      const muted = AudioEngine.toggleMute();
      updateMuteButton(muted);
      AudioEngine.sfxUiClick();
    } else if (e.code === 'KeyP') {
      togglePause();
    } else if (e.code === 'KeyT') {
      Game.turret.autoAim = !Game.turret.autoAim;
      AudioEngine.sfxUiClick();
    } else if (e.code === 'Space') {
      this.spaceDown = true;
      this.startMegaCharge();
      e.preventDefault();
    } else if (e.code === 'Enter') {
      if (Game.state === STATE_TITLE) {
        Game.state = STATE_PLAYING;
        AudioEngine.startMusic();
        startWave(Game.wave);
      } else if (Game.state === STATE_GAME_OVER) {
        Game.reset();
        Game.state = STATE_TITLE;
      }
    }
  },

  onKeyUp(e) {
    this.keys[e.code] = false;
    if (e.code === 'Space') {
      this.spaceDown = false;
      this.releaseMega();
    }
  }
};

function handleEscape() {
  if (Game.pendingExit) {
    doExit();
    return;
  }
  Game.pendingExit = true;
  Game.escPromptTimer = 1.5;
  escOverlay.style.display = 'block';
}

function doExit() {
  Game.running = false;
  AudioEngine.close();
  try { window.parent.postMessage({ action: 'exitGame' }, '*'); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('gameExit')); } catch (e) {}
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = COLOR_GREEN;
  ctx.font = '16px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('GAME EXITED', GAME_WIDTH / 2, GAME_HEIGHT / 2);
}

function togglePause() {
  if (Game.state !== STATE_PLAYING && Game.state !== STATE_PAUSED) return;
  if (Game.state === STATE_PLAYING) {
    Game.state = STATE_PAUSED;
    if (AudioEngine.ctx) AudioEngine.masterGain.gain.setValueAtTime(0, AudioEngine.ctx.currentTime);
    updatePauseButton(true);
  } else {
    Game.state = STATE_PLAYING;
    AudioEngine.applyMuteState();
    updatePauseButton(false);
  }
  AudioEngine.sfxUiClick();
}

// === GAME LOGIC ===
function startWave(waveNumber) {
  Game.wave = waveNumber;
  Game.enemies.length = 0;
  Game.enemyOrbs.length = 0;
  Game.enemyBombs.length = 0;
  Game.perfectWave = true;
  Game.turret.megaShots = Math.max(Game.turret.megaShots, MEGA_SHOTS_INITIAL);

  const isBossWave = (waveNumber % 5 === 0);
  let spawnList = [];

  if (isBossWave) {
    spawnList.push({ type: 'boss', delay: 1000 });
    const extraInfantry = Math.min(6, waveNumber);
    for (let i = 0; i < extraInfantry; i++) {
      spawnList.push({ type: 'infantry', delay: 2000 + i * 600 });
    }
  } else if (waveNumber === 1) {
    for (let i = 0; i < 8; i++) spawnList.push({ type: 'infantry', delay: 500 + i * 700 });
  } else if (waveNumber === 2) {
    for (let i = 0; i < 10; i++) spawnList.push({ type: 'infantry', delay: 400 + i * 500 });
    for (let i = 0; i < 3; i++) spawnList.push({ type: 'jeep', delay: 3000 + i * 1500 });
  } else if (waveNumber === 3) {
    for (let i = 0; i < 12; i++) spawnList.push({ type: 'infantry', delay: 300 + i * 450 });
    for (let i = 0; i < 4; i++) spawnList.push({ type: 'jeep', delay: 2000 + i * 1200 });
    for (let i = 0; i < 2; i++) spawnList.push({ type: 'truck', delay: 4500 + i * 2500 });
  } else {
    const infantryCount = 10 + waveNumber * 2;
    const jeepCount = 3 + Math.floor(waveNumber / 2);
    const truckCount = 2 + Math.floor(waveNumber / 3);
    const tankCount = waveNumber >= 4 ? Math.floor(waveNumber / 3) : 0;
    const heliCount = waveNumber >= 5 ? Math.floor(waveNumber / 4) : 0;

    for (let i = 0; i < infantryCount; i++) spawnList.push({ type: 'infantry', delay: 200 + i * 400 });
    for (let i = 0; i < jeepCount; i++) spawnList.push({ type: 'jeep', delay: 1500 + i * 1000 });
    for (let i = 0; i < truckCount; i++) spawnList.push({ type: 'truck', delay: 3000 + i * 2000 });
    for (let i = 0; i < tankCount; i++) spawnList.push({ type: 'tank', delay: 5000 + i * 3000 });
    for (let i = 0; i < heliCount; i++) spawnList.push({ type: 'heli', delay: 4000 + i * 4000 });
  }

  Game.enemiesRemaining = spawnList.length;
  const startTime = performance.now();
  spawnList.forEach(item => {
    setTimeout(() => {
      if (Game.state === STATE_PLAYING || Game.state === STATE_PAUSED) {
        spawnEnemy(item.type);
      }
    }, item.delay);
  });
}

function spawnEnemy(type) {
  if (!Game.running) return;
  let enemy = null;
  const spawnY = -30;

  if (type === 'infantry') {
    enemy = {
      type: 'infantry',
      x: 30 + Math.random() * (GAME_WIDTH - 60),
      y: spawnY,
      vx: 0, vy: ENEMY_INFANTRY_SPEED,
      hp: ENEMY_INFANTRY_HP, maxHp: ENEMY_INFANTRY_HP,
      radius: ENEMY_INFANTRY_RADIUS,
      points: ENEMY_INFANTRY_POINTS,
      coins: ENEMY_INFANTRY_COINS,
      zigzagPhase: Math.random() * Math.PI * 2,
      hitFlash: 0
    };
  } else if (type === 'jeep') {
    enemy = {
      type: 'jeep',
      x: 30 + Math.random() * (GAME_WIDTH - 60),
      y: spawnY,
      vx: 0, vy: ENEMY_JEEP_SPEED,
      hp: ENEMY_JEEP_HP, maxHp: ENEMY_JEEP_HP,
      w: ENEMY_JEEP_W, h: ENEMY_JEEP_H,
      points: ENEMY_JEEP_POINTS, coins: ENEMY_JEEP_COINS,
      zigzagPhase: Math.random() * Math.PI * 2,
      hitFlash: 0
    };
  } else if (type === 'truck') {
    enemy = {
      type: 'truck',
      x: 30 + Math.random() * (GAME_WIDTH - 60),
      y: spawnY,
      vx: 0, vy: ENEMY_TRUCK_SPEED,
      hp: ENEMY_TRUCK_HP, maxHp: ENEMY_TRUCK_HP,
      w: ENEMY_TRUCK_W, h: ENEMY_TRUCK_H,
      points: ENEMY_TRUCK_POINTS, coins: ENEMY_TRUCK_COINS,
      hitFlash: 0
    };
  } else if (type === 'tank') {
    enemy = {
      type: 'tank',
      x: 40 + Math.random() * (GAME_WIDTH - 80),
      y: spawnY,
      vx: 0, vy: ENEMY_TANK_SPEED,
      hp: ENEMY_TANK_HP, maxHp: ENEMY_TANK_HP,
      w: ENEMY_TANK_W, h: ENEMY_TANK_H,
      points: ENEMY_TANK_POINTS, coins: ENEMY_TANK_COINS,
      lastFire: performance.now() + 1500,
      hitFlash: 0
    };
  } else if (type === 'heli') {
    const fromLeft = Math.random() < 0.5;
    enemy = {
      type: 'heli',
      x: fromLeft ? -40 : GAME_WIDTH + 40,
      y: 40 + Math.random() * 80,
      vx: fromLeft ? ENEMY_HELI_SPEED : -ENEMY_HELI_SPEED,
      vy: 0,
      hp: ENEMY_HELI_HP, maxHp: ENEMY_HELI_HP,
      w: ENEMY_HELI_W, h: ENEMY_HELI_H,
      points: ENEMY_HELI_POINTS, coins: ENEMY_HELI_COINS,
      lastBomb: performance.now() + 1000,
      rotorAngle: 0,
      hitFlash: 0
    };
  } else if (type === 'boss') {
    enemy = {
      type: 'boss',
      x: GAME_WIDTH / 2,
      y: spawnY - 50,
      vx: 0, vy: BOSS_SPEED,
      hp: BOSS_HP, maxHp: BOSS_HP,
      w: BOSS_W, h: BOSS_H,
      points: BOSS_POINTS, coins: BOSS_COINS,
      lastFire: performance.now() + 2000,
      shieldHp: BOSS_SHIELD_HP,
      hitFlash: 0,
      driftPhase: 0
    };
  }
  if (enemy) Game.enemies.push(enemy);
}

function fireBullet() {
  const now = performance.now();
  if (now - Game.turret.lastFireTime < Game.turret.fireRate) return;
  if (Game.bullets.length >= MAX_BULLETS) return;

  Game.turret.lastFireTime = now;

  // Apply auto-aim
  let aimAngle = Math.atan2(Game.turret.aimY - TURRET_Y, Game.turret.aimX - TURRET_X);
  if (Game.turret.autoAim) {
    aimAngle = applyAutoAim(aimAngle);
  }
  Game.turret.angle = aimAngle;

  const tipX = TURRET_X + Math.cos(aimAngle) * TURRET_BARREL_LENGTH;
  const tipY = TURRET_Y + Math.sin(aimAngle) * TURRET_BARREL_LENGTH;

  Game.bullets.push({
    x: tipX, y: tipY,
    vx: Math.cos(aimAngle) * Game.turret.bulletSpeed,
    vy: Math.sin(aimAngle) * Game.turret.bulletSpeed,
    w: BULLET_WIDTH * Game.turret.bulletSizeMult,
    h: BULLET_HEIGHT * Game.turret.bulletSizeMult,
    angle: aimAngle,
    life: 2.0,
    explosive: Game.turret.explosiveRounds
  });

  Game.turret.muzzleFlashTimer = MUZZLE_FLASH_DURATION / 1000;
  Game.turret.recoil = 5;
  AudioEngine.sfxFire();
}

function fireMegaBullet() {
  if (Game.turret.megaShots <= 0) return;
  Game.turret.megaShots--;

  let aimAngle = Math.atan2(Game.turret.aimY - TURRET_Y, Game.turret.aimX - TURRET_X);
  if (Game.turret.autoAim) {
    aimAngle = applyAutoAim(aimAngle);
  }
  Game.turret.angle = aimAngle;

  const tipX = TURRET_X + Math.cos(aimAngle) * TURRET_BARREL_LENGTH;
  const tipY = TURRET_Y + Math.sin(aimAngle) * TURRET_BARREL_LENGTH;

  Game.megaBullets.push({
    x: tipX, y: tipY,
    vx: Math.cos(aimAngle) * Game.turret.bulletSpeed * 1.2,
    vy: Math.sin(aimAngle) * Game.turret.bulletSpeed * 1.2,
    w: MEGA_BULLET_WIDTH,
    h: MEGA_BULLET_HEIGHT,
    angle: aimAngle,
    life: 2.5,
    hitEnemies: []
  });

  Game.turret.muzzleFlashTimer = MUZZLE_FLASH_DURATION / 1000 * 2;
  Game.turret.recoil = 10;
  AudioEngine.sfxMegaFire();
  Particles.burst(tipX, tipY, 15, COLOR_GREEN);
}

function applyAutoAim(currentAngle) {
  let bestEnemy = null;
  let bestAngleDiff = AUTOAIM_ANGLE_THRESHOLD;
  for (const enemy of Game.enemies) {
    const dx = enemy.x - TURRET_X;
    const dy = enemy.y - TURRET_Y;
    const enemyAngle = Math.atan2(dy, dx);
    let diff = Math.abs(angleDelta(currentAngle, enemyAngle));
    if (diff < bestAngleDiff) {
      bestAngleDiff = diff;
      bestEnemy = enemy;
    }
  }
  if (bestEnemy) {
    return Math.atan2(bestEnemy.y - TURRET_Y, bestEnemy.x - TURRET_X);
  }
  return currentAngle;
}

function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function updateTurret(deltaSeconds) {
  const targetAngle = Math.atan2(Game.turret.aimY - TURRET_Y, Game.turret.aimX - TURRET_X);
  Game.turret.angle = targetAngle;

  if (Game.turret.recoil > 0) {
    Game.turret.recoil -= deltaSeconds * 80;
    if (Game.turret.recoil < 0) Game.turret.recoil = 0;
  }
  if (Game.turret.muzzleFlashTimer > 0) {
    Game.turret.muzzleFlashTimer -= deltaSeconds;
  }
  if (Game.turret.megaCharging) {
    const elapsed = performance.now() - Game.turret.megaChargeStart;
    if (elapsed >= MEGA_CHARGE_TIME) {
      Game.turret.megaCharged = true;
    }
  }

  // Continuous firing on hold
  if (Input.isFiring && Game.state === STATE_PLAYING) {
    fireBullet();
  }
}

function updateBullets(deltaSeconds) {
  for (let i = Game.bullets.length - 1; i >= 0; i--) {
    const b = Game.bullets[i];
    b.x += b.vx * deltaSeconds;
    b.y += b.vy * deltaSeconds;
    b.life -= deltaSeconds;
    Particles.bulletTrail(b.x, b.y, COLOR_GREEN);

    if (b.life <= 0 || b.x < -20 || b.x > GAME_WIDTH + 20 || b.y < -20 || b.y > GAME_HEIGHT + 20) {
      Game.bullets.splice(i, 1);
      continue;
    }

    // Check enemy collisions
    let hit = false;
    for (const enemy of Game.enemies) {
      if (checkBulletEnemyCollision(b, enemy)) {
        damageEnemy(enemy, 1);
        if (b.explosive) {
          explosionAt(b.x, b.y, 30);
        }
        hit = true;
        break;
      }
    }
    // Check enemy orbs
    if (!hit) {
      for (let j = Game.enemyOrbs.length - 1; j >= 0; j--) {
        const orb = Game.enemyOrbs[j];
        const dx = orb.x - b.x;
        const dy = orb.y - b.y;
        if (dx*dx + dy*dy < (ENEMY_ORB_RADIUS + 6) * (ENEMY_ORB_RADIUS + 6)) {
          Game.enemyOrbs.splice(j, 1);
          Particles.burst(orb.x, orb.y, 8, COLOR_RED);
          AudioEngine.sfxHit();
          hit = true;
          break;
        }
      }
    }
    if (hit) {
      Game.bullets.splice(i, 1);
    }
  }
}

function updateMegaBullets(deltaSeconds) {
  for (let i = Game.megaBullets.length - 1; i >= 0; i--) {
    const b = Game.megaBullets[i];
    b.x += b.vx * deltaSeconds;
    b.y += b.vy * deltaSeconds;
    b.life -= deltaSeconds;
    Particles.spawn(PARTICLE_TYPE_TRAIL, b.x, b.y, 0, 0, 0.2, 6, COLOR_GREEN, false);

    if (b.life <= 0 || b.x < -30 || b.x > GAME_WIDTH + 30 || b.y < -30 || b.y > GAME_HEIGHT + 30) {
      Game.megaBullets.splice(i, 1);
      continue;
    }

    for (const enemy of Game.enemies) {
      if (b.hitEnemies.indexOf(enemy) !== -1) continue;
      if (checkBulletEnemyCollision(b, enemy)) {
        damageEnemy(enemy, 5);
        b.hitEnemies.push(enemy);
      }
    }
  }
}

function checkBulletEnemyCollision(bullet, enemy) {
  if (enemy.type === 'infantry') {
    const dx = enemy.x - bullet.x;
    const dy = enemy.y - bullet.y;
    return dx*dx + dy*dy < (enemy.radius + bullet.w/2) * (enemy.radius + bullet.w/2);
  } else {
    return bullet.x > enemy.x - enemy.w/2 && bullet.x < enemy.x + enemy.w/2 &&
           bullet.y > enemy.y - enemy.h/2 && bullet.y < enemy.y + enemy.h/2;
  }
}

function damageEnemy(enemy, amount) {
  if (enemy.type === 'boss' && enemy.shieldHp > 0) {
    enemy.shieldHp -= amount;
    enemy.hitFlash = 0.1;
    Particles.burst(enemy.x, enemy.y - enemy.h/2, 5, COLOR_YELLOW);
    AudioEngine.sfxHit();
    return;
  }

  enemy.hp -= amount;
  enemy.hitFlash = 0.1;
  AudioEngine.sfxHit();
  Particles.burst(enemy.x, enemy.y, 5, COLOR_RED);

  if (enemy.hp <= 0) {
    killEnemy(enemy);
  }
}

function killEnemy(enemy) {
  Game.score += enemy.points;
  Game.coins += enemy.coins;
  addFloatingText('+' + enemy.points, enemy.x, enemy.y, COLOR_GREEN);

  if (enemy.type === 'infantry') {
    Particles.burst(enemy.x, enemy.y, 12, COLOR_INFANTRY);
    AudioEngine.sfxPop();
  } else if (enemy.type === 'tank' || enemy.type === 'boss') {
    Particles.explosion(enemy.x, enemy.y, COLOR_YELLOW);
    Particles.explosion(enemy.x, enemy.y, COLOR_RED);
    AudioEngine.sfxExplosion();
    Game.shake = Math.max(Game.shake, 8);
  } else {
    Particles.explosion(enemy.x, enemy.y, COLOR_RED);
    AudioEngine.sfxExplosion();
    Game.shake = Math.max(Game.shake, 4);
  }

  const idx = Game.enemies.indexOf(enemy);
  if (idx !== -1) Game.enemies.splice(idx, 1);
  Game.enemiesRemaining--;
  AudioEngine.setBpm(Game.score);
  updateHudTitle(Game.wave, Game.score);
}

function explosionAt(x, y, radius) {
  Particles.explosion(x, y, COLOR_YELLOW);
  AudioEngine.sfxExplosion();
  Game.shake = Math.max(Game.shake, 5);
  for (const enemy of Game.enemies) {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    if (dx*dx + dy*dy < radius * radius) {
      damageEnemy(enemy, 2);
    }
  }
}

function updateEnemies(deltaSeconds) {
  const now = performance.now();
  for (let i = Game.enemies.length - 1; i >= 0; i--) {
    const e = Game.enemies[i];
    e.hitFlash = Math.max(0, e.hitFlash - deltaSeconds);

    if (e.type === 'infantry') {
      e.zigzagPhase += deltaSeconds * 3;
      e.vx = Math.sin(e.zigzagPhase) * 30;
      e.x += e.vx * deltaSeconds;
      e.y += e.vy * deltaSeconds;
    } else if (e.type === 'jeep') {
      e.zigzagPhase += deltaSeconds * 2.5;
      e.vx = Math.sin(e.zigzagPhase) * 50;
      e.x += e.vx * deltaSeconds;
      e.y += e.vy * deltaSeconds;
    } else if (e.type === 'truck') {
      e.x += e.vx * deltaSeconds;
      e.y += e.vy * deltaSeconds;
    } else if (e.type === 'tank') {
      e.x += e.vx * deltaSeconds;
      e.y += e.vy * deltaSeconds;
      if (now - e.lastFire > ENEMY_TANK_FIRE_INTERVAL && e.y > 30) {
        e.lastFire = now;
        fireEnemyOrb(e.x, e.y, 1);
      }
    } else if (e.type === 'heli') {
      e.x += e.vx * deltaSeconds;
      e.rotorAngle += deltaSeconds * 30;
      if (e.x < -50) e.vx = ENEMY_HELI_SPEED;
      if (e.x > GAME_WIDTH + 50) e.vx = -ENEMY_HELI_SPEED;
      if (now - e.lastBomb > 2500 && e.x > 20 && e.x < GAME_WIDTH - 20) {
        e.lastBomb = now;
        dropBomb(e.x, e.y);
      }
    } else if (e.type === 'boss') {
      e.driftPhase += deltaSeconds * 0.8;
      const targetY = 80;
      if (e.y < targetY) {
        e.y += e.vy * deltaSeconds;
      } else {
        e.y = targetY + Math.sin(e.driftPhase) * 10;
        e.x += Math.cos(e.driftPhase) * 40 * deltaSeconds;
        e.x = Math.max(BOSS_W/2 + 10, Math.min(GAME_WIDTH - BOSS_W/2 - 10, e.x));
      }
      if (now - e.lastFire > BOSS_FIRE_INTERVAL && e.y >= targetY - 10) {
        e.lastFire = now;
        fireEnemyOrb(e.x, e.y, 3);
      }
    }

    // Boundary clamping for ground enemies
    if (e.type !== 'heli' && e.type !== 'boss') {
      if (e.x < 15) e.x = 15;
      if (e.x > GAME_WIDTH - 15) e.x = GAME_WIDTH - 15;
    }

    // Check base collision (ground enemies)
    if (e.type !== 'heli') {
      const eBottom = e.type === 'infantry' ? e.y + e.radius : e.y + e.h/2;
      if (eBottom >= BASE_Y) {
        damageBase(e.type === 'infantry' ? 5 : (e.type === 'jeep' ? 10 : (e.type === 'truck' ? 20 : (e.type === 'tank' ? 35 : 50))));
        Particles.burst(e.x, e.y, 10, COLOR_RED);
        Game.enemies.splice(i, 1);
        Game.enemiesRemaining--;
      }
    }
  }
}

function fireEnemyOrb(fromX, fromY, count) {
  const baseAngle = Math.atan2(TURRET_Y - fromY, TURRET_X - fromX);
  for (let i = 0; i < count; i++) {
    const spreadOffset = count > 1 ? (i - (count - 1) / 2) * 0.25 : 0;
    const angle = baseAngle + spreadOffset;
    Game.enemyOrbs.push({
      x: fromX, y: fromY,
      vx: Math.cos(angle) * ENEMY_ORB_SPEED,
      vy: Math.sin(angle) * ENEMY_ORB_SPEED,
      life: 3.0
    });
  }
  AudioEngine.sfxEnemyFire();
}

function dropBomb(x, y) {
  Game.enemyBombs.push({
    x: x, y: y,
    vx: 0, vy: 50,
    life: 5.0
  });
  AudioEngine.sfxBombDrop();
}

function updateEnemyProjectiles(deltaSeconds) {
  for (let i = Game.enemyOrbs.length - 1; i >= 0; i--) {
    const o = Game.enemyOrbs[i];
    o.x += o.vx * deltaSeconds;
    o.y += o.vy * deltaSeconds;
    o.life -= deltaSeconds;
    Particles.spawn(PARTICLE_TYPE_TRAIL, o.x, o.y, 0, 0, 0.15, 3, COLOR_RED, false);

    if (o.life <= 0 || o.x < -10 || o.x > GAME_WIDTH + 10 || o.y > GAME_HEIGHT + 10) {
      Game.enemyOrbs.splice(i, 1);
      continue;
    }

    // Check turret collision
    const dx = o.x - TURRET_X;
    const dy = o.y - TURRET_Y;
    if (dx*dx + dy*dy < (TURRET_PLATFORM_RADIUS) * (TURRET_PLATFORM_RADIUS)) {
      damageBase(8);
      Particles.burst(o.x, o.y, 12, COLOR_RED);
      Game.enemyOrbs.splice(i, 1);
      continue;
    }
    // Check base collision
    if (o.x > BASE_X && o.x < BASE_X + BASE_WIDTH && o.y > BASE_Y) {
      damageBase(8);
      Particles.burst(o.x, o.y, 12, COLOR_RED);
      Game.enemyOrbs.splice(i, 1);
    }
  }

  for (let i = Game.enemyBombs.length - 1; i >= 0; i--) {
    const bomb = Game.enemyBombs[i];
    bomb.vy += 120 * deltaSeconds;
    bomb.x += bomb.vx * deltaSeconds;
    bomb.y += bomb.vy * deltaSeconds;
    bomb.life -= deltaSeconds;
    Particles.bombTrail(bomb.x, bomb.y);

    if (bomb.y > GAME_HEIGHT - 30 || bomb.life <= 0) {
      // Impact
      explosionAt(bomb.x, bomb.y, ENEMY_HELI_BOMB_AOE);
      const dx1 = bomb.x - (BASE_X + BASE_WIDTH / 2);
      if (Math.abs(dx1) < BASE_WIDTH/2 + ENEMY_HELI_BOMB_AOE && bomb.y > BASE_Y - ENEMY_HELI_BOMB_AOE) {
        damageBase(15);
      }
      Game.enemyBombs.splice(i, 1);
    }
  }
}

function damageBase(amount) {
  Game.base.hp -= amount;
  Game.base.flashTimer = 0.2;
  Game.shake = Math.max(Game.shake, 6);
  Game.flashRed = 0.2;
  Game.perfectWave = false;
  AudioEngine.sfxBaseHit();
  if (Game.base.hp <= 10 && Game.base.hp > 0) {
    Game.slowMo = 1.0;
  }
  if (Game.base.hp <= 0) {
    Game.base.hp = 0;
    triggerGameOver();
  }
}

function triggerGameOver() {
  Particles.explosion(BASE_X + BASE_WIDTH/2, BASE_Y + BASE_HEIGHT/2, COLOR_RED);
  Particles.explosion(BASE_X + BASE_WIDTH/2, BASE_Y + BASE_HEIGHT/2, COLOR_YELLOW);
  Particles.explosion(BASE_X + BASE_WIDTH/2 - 30, BASE_Y + BASE_HEIGHT/2, COLOR_RED);
  Particles.explosion(BASE_X + BASE_WIDTH/2 + 30, BASE_Y + BASE_HEIGHT/2, COLOR_YELLOW);
  AudioEngine.sfxExplosion();
  Game.shake = 15;
  Game.state = STATE_GAME_OVER;
  Game.saveHighScore();
  AudioEngine.stopMusic();
}

function checkWaveComplete() {
  if (Game.state !== STATE_PLAYING) return;
  if (Game.enemiesRemaining <= 0 && Game.enemies.length === 0) {
    const bonus = 100 * Game.wave;
    Game.score += bonus;
    addFloatingText('+' + bonus + ' WAVE BONUS', GAME_WIDTH/2, GAME_HEIGHT/2 - 20, COLOR_GREEN);
    if (Game.perfectWave) {
      Game.score += 500;
      addFloatingText('+500 PERFECT!', GAME_WIDTH/2, GAME_HEIGHT/2, COLOR_YELLOW);
    }
    Game.flashGreen = 0.3;
    AudioEngine.sfxWaveComplete();
    Game.state = STATE_WAVE_BREAK;
    Game.waveBreakStart = performance.now();
    buildShop();
    updateHudTitle(Game.wave, Game.score);
  }
}

function buildShop() {
  Input.shopButtons = [];
  const items = [
    { name: 'FIRE RATE', cost: 50, action: () => { Game.turret.fireRate = Math.max(80, Game.turret.fireRate - 30); } },
    { name: 'BULLET SIZE', cost: 75, action: () => { Game.turret.bulletSizeMult *= 1.5; } },
    { name: 'BULLET SPEED', cost: 60, action: () => { Game.turret.bulletSpeed += 80; } },
    { name: 'BASE ARMOR', cost: 100, action: () => { Game.base.maxHp += 25; Game.base.hp = Math.min(Game.base.maxHp, Game.base.hp + 25); } },
    { name: 'MEGA SHOTS', cost: 80, action: () => { Game.turret.megaShots += 3; } },
    { name: 'EXPLOSIVE', cost: 200, action: () => { Game.turret.explosiveRounds = true; } }
  ];
  const startY = 130;
  const btnW = 380;
  const btnH = 32;
  const margin = 6;
  items.forEach((item, idx) => {
    Input.shopButtons.push({
      x: (GAME_WIDTH - btnW) / 2,
      y: startY + idx * (btnH + margin),
      w: btnW, h: btnH,
      label: item.name,
      cost: item.cost,
      action: item.action
    });
  });
}

function updateWaveBreak() {
  const elapsed = performance.now() - Game.waveBreakStart;
  if (elapsed >= WAVE_BREAK_DURATION) {
    Game.state = STATE_PLAYING;
    Game.wave++;
    startWave(Game.wave);
    updateHudTitle(Game.wave, Game.score);
  }
}

function addFloatingText(text, x, y, color) {
  Game.floatingTexts.push({
    text: text, x: x, y: y, color: color,
    life: FLOATING_TEXT_DURATION / 1000,
    maxLife: FLOATING_TEXT_DURATION / 1000
  });
}

function updateFloatingTexts(deltaSeconds) {
  for (let i = Game.floatingTexts.length - 1; i >= 0; i--) {
    const ft = Game.floatingTexts[i];
    ft.life -= deltaSeconds;
    ft.y -= 30 * deltaSeconds;
    if (ft.life <= 0) Game.floatingTexts.splice(i, 1);
  }
}

function updateScreenEffects(deltaSeconds) {
  if (Game.shake > 0) Game.shake = Math.max(0, Game.shake - deltaSeconds * 30);
  if (Game.flashRed > 0) Game.flashRed = Math.max(0, Game.flashRed - deltaSeconds);
  if (Game.flashGreen > 0) Game.flashGreen = Math.max(0, Game.flashGreen - deltaSeconds);
  if (Game.slowMo > 0) Game.slowMo = Math.max(0, Game.slowMo - deltaSeconds);
  if (Game.base.flashTimer > 0) Game.base.flashTimer = Math.max(0, Game.base.flashTimer - deltaSeconds);

  if (Game.escPromptTimer > 0) {
    Game.escPromptTimer -= deltaSeconds;
    if (Game.escPromptTimer <= 0) {
      Game.pendingExit = false;
      escOverlay.style.display = 'none';
    }
  }

  Game.crtFlickerTimer += deltaSeconds;
  if (Game.crtFlickerTimer >= 10) {
    Game.crtFlickerTimer = 0;
    Game.crtFlickerIntensity = 0.08;
  }
  if (Game.crtFlickerIntensity > 0) {
    Game.crtFlickerIntensity -= deltaSeconds;
  }
}

// === RENDERER ===
function drawBackground() {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  for (let x = 0; x < GAME_WIDTH; x += 20) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, GAME_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < GAME_HEIGHT; y += 20) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(GAME_WIDTH, y);
    ctx.stroke();
  }
}

function drawBase() {
  // Base flash
  const flashIntensity = Game.base.flashTimer / 0.2;
  let baseColor = COLOR_BASE;
  if (Game.base.flashTimer > 0) {
    baseColor = '#FF4422';
  }

  ctx.shadowBlur = 15;
  ctx.shadowColor = COLOR_BASE;
  ctx.fillStyle = baseColor;
  ctx.fillRect(BASE_X, BASE_Y, BASE_WIDTH, BASE_HEIGHT);

  // Details — bunker stripes
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(BASE_X + 10 + i * 22, BASE_Y + 4, 12, 4);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(BASE_X, BASE_Y, BASE_WIDTH, 2);

  // Health bar
  const hpPct = Game.base.hp / Game.base.maxHp;
  const barX = BASE_X;
  const barY = BASE_Y - 12;
  const barW = BASE_WIDTH;
  const barH = 6;

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(40,0,0,0.8)';
  ctx.fillRect(barX, barY, barW, barH);
  let hpColor = COLOR_GREEN;
  if (hpPct < 0.25) hpColor = '#FF2200';
  else if (hpPct < 0.5) hpColor = COLOR_YELLOW;
  ctx.fillStyle = hpColor;
  ctx.fillRect(barX, barY, barW * hpPct, barH);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);
}

function drawTurret() {
  // Platform
  ctx.shadowBlur = 15;
  ctx.shadowColor = COLOR_PLATFORM;
  ctx.fillStyle = COLOR_PLATFORM;
  ctx.beginPath();
  ctx.arc(TURRET_X, TURRET_Y, TURRET_PLATFORM_RADIUS, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight ring
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(TURRET_X, TURRET_Y, TURRET_PLATFORM_RADIUS - 4, 0, Math.PI * 2);
  ctx.stroke();

  // Bolts
  ctx.fillStyle = '#555';
  const boltOffsets = [[0,-1],[1,0],[0,1],[-1,0]];
  for (const [dx, dy] of boltOffsets) {
    ctx.beginPath();
    ctx.arc(TURRET_X + dx * (TURRET_PLATFORM_RADIUS - 8), TURRET_Y + dy * (TURRET_PLATFORM_RADIUS - 8), 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Aim indicator
  const aimAngle = Game.turret.angle;
  const dashOffset = (performance.now() / 50) % 12;
  ctx.save();
  ctx.translate(TURRET_X, TURRET_Y);
  ctx.rotate(aimAngle);
  ctx.strokeStyle = COLOR_GREEN;
  const pulse = 0.4 + 0.4 * Math.abs(Math.sin(performance.now() / 300));
  ctx.globalAlpha = pulse;
  ctx.setLineDash([6, 6]);
  ctx.lineDashOffset = -dashOffset;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(TURRET_BARREL_LENGTH, 0);
  ctx.lineTo(TURRET_BARREL_LENGTH + AIM_INDICATOR_LENGTH, 0);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.restore();

  // Barrel with recoil
  ctx.save();
  ctx.translate(TURRET_X, TURRET_Y);
  ctx.rotate(aimAngle);
  const recoilOffset = -Game.turret.recoil;
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#777';
  ctx.fillStyle = COLOR_BARREL;
  ctx.fillRect(recoilOffset, -TURRET_BARREL_WIDTH / 2, TURRET_BARREL_LENGTH, TURRET_BARREL_WIDTH);
  ctx.fillStyle = '#666';
  ctx.fillRect(recoilOffset, -TURRET_BARREL_WIDTH / 2, TURRET_BARREL_LENGTH, 1);

  // Muzzle flash
  if (Game.turret.muzzleFlashTimer > 0) {
    const flashAlpha = Game.turret.muzzleFlashTimer / (MUZZLE_FLASH_DURATION / 1000);
    ctx.globalAlpha = flashAlpha;
    ctx.fillStyle = COLOR_YELLOW;
    ctx.shadowBlur = 20;
    ctx.shadowColor = COLOR_YELLOW;
    drawStar(ctx, TURRET_BARREL_LENGTH + recoilOffset + 6, 0, 10, 6);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Center hub
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#555';
  ctx.beginPath();
  ctx.arc(TURRET_X, TURRET_Y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLOR_GREEN;
  ctx.beginPath();
  ctx.arc(TURRET_X, TURRET_Y, 4, 0, Math.PI * 2);
  ctx.fill();

  // Charge bar above turret
  if (Game.turret.megaCharging) {
    const elapsed = performance.now() - Game.turret.megaChargeStart;
    const pct = Math.min(1, elapsed / MEGA_CHARGE_TIME);
    const cbX = TURRET_X - 30;
    const cbY = TURRET_Y - TURRET_PLATFORM_RADIUS - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cbX, cbY, 60, 6);
    ctx.fillStyle = pct >= 1 ? COLOR_YELLOW : COLOR_RED;
    ctx.fillRect(cbX, cbY, 60 * pct, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(cbX, cbY, 60, 6);
  }
}

function drawStar(c, cx, cy, outerR, innerR) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = i * Math.PI / 5 - Math.PI / 2;
    if (i === 0) c.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
}

function drawBullets() {
  for (const b of Game.bullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.shadowBlur = 15;
    ctx.shadowColor = COLOR_GREEN;
    ctx.fillStyle = COLOR_GREEN;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (const b of Game.megaBullets) {
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.shadowBlur = 25;
    ctx.shadowColor = COLOR_GREEN;
    ctx.fillStyle = COLOR_YELLOW;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOR_GREEN;
    ctx.beginPath();
    ctx.ellipse(0, 0, b.w / 2 - 3, b.h / 2 - 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawEnemies() {
  for (const e of Game.enemies) {
    const flashing = e.hitFlash > 0;
    if (e.type === 'infantry') {
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLOR_INFANTRY;
      ctx.fillStyle = flashing ? '#FFFFFF' : COLOR_INFANTRY;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000';
      ctx.fillRect(e.x - 3, e.y - 2, 6, 2);
    } else if (e.type === 'jeep') {
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLOR_JEEP;
      const damageRatio = e.hp / e.maxHp;
      const c = flashing ? '#FFFFFF' : adjustColor(COLOR_JEEP, damageRatio);
      ctx.fillStyle = c;
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#222';
      ctx.fillRect(e.x - e.w/2 - 2, e.y - e.h/2 + 3, 3, 4);
      ctx.fillRect(e.x + e.w/2 - 1, e.y - e.h/2 + 3, 3, 4);
      ctx.fillRect(e.x - e.w/2 - 2, e.y + e.h/2 - 7, 3, 4);
      ctx.fillRect(e.x + e.w/2 - 1, e.y + e.h/2 - 7, 3, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(e.x - e.w/2 + 3, e.y - 2, e.w - 6, 5);
    } else if (e.type === 'truck') {
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLOR_TRUCK;
      ctx.fillStyle = flashing ? '#FFFFFF' : COLOR_TRUCK;
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#222';
      ctx.fillRect(e.x - e.w/2, e.y + e.h/2 - 4, 6, 4);
      ctx.fillRect(e.x + e.w/2 - 6, e.y + e.h/2 - 4, 6, 4);
      // Damage cracks
      const damageLevel = 1 - e.hp / e.maxHp;
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      const crackCount = Math.floor(damageLevel * 4);
      for (let i = 0; i < crackCount; i++) {
        ctx.beginPath();
        const sx = e.x - e.w/2 + 4 + i * 7;
        ctx.moveTo(sx, e.y - 4);
        ctx.lineTo(sx + 3, e.y + 2);
        ctx.lineTo(sx + 1, e.y + 5);
        ctx.stroke();
      }
    } else if (e.type === 'tank') {
      ctx.shadowBlur = 14;
      ctx.shadowColor = COLOR_TANK;
      ctx.fillStyle = flashing ? '#FFFFFF' : COLOR_TANK;
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
      ctx.shadowBlur = 0;
      // Tracks
      ctx.fillStyle = '#222';
      ctx.fillRect(e.x - e.w/2 - 3, e.y - e.h/2 + 2, 3, e.h - 4);
      ctx.fillRect(e.x + e.w/2, e.y - e.h/2 + 2, 3, e.h - 4);
      // Turret
      ctx.fillStyle = '#5a6830';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#444';
      ctx.fillRect(e.x - 2, e.y, 4, 12);
    } else if (e.type === 'heli') {
      ctx.shadowBlur = 12;
      ctx.shadowColor = COLOR_HELI;
      ctx.fillStyle = flashing ? '#FFFFFF' : COLOR_HELI;
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
      ctx.shadowBlur = 0;
      // Tail
      ctx.fillRect(e.x + e.w/2, e.y - 2, 14, 4);
      ctx.fillRect(e.x + e.w/2 + 12, e.y - 6, 3, 8);
      // Rotor (spinning blur)
      ctx.strokeStyle = 'rgba(200,200,200,0.6)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(e.x - 22, e.y - e.h/2 - 4);
      ctx.lineTo(e.x + 22, e.y - e.h/2 - 4);
      ctx.stroke();
      // Cockpit
      ctx.fillStyle = '#88AACC';
      ctx.fillRect(e.x - e.w/2 + 2, e.y - 3, 8, 6);
    } else if (e.type === 'boss') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = COLOR_BOSS;
      ctx.fillStyle = flashing ? '#FFFFFF' : COLOR_BOSS;
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2, e.w, e.h);
      ctx.shadowBlur = 0;
      // Tracks
      ctx.fillStyle = '#111';
      ctx.fillRect(e.x - e.w/2 - 8, e.y - e.h/2 + 4, 8, e.h - 8);
      ctx.fillRect(e.x + e.w/2, e.y - e.h/2 + 4, 8, e.h - 8);
      // Triple barrels
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(e.x, e.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#444';
      ctx.fillRect(e.x - 18, e.y + 8, 6, 28);
      ctx.fillRect(e.x - 3, e.y + 8, 6, 28);
      ctx.fillRect(e.x + 12, e.y + 8, 6, 28);
      // Shield
      if (e.shieldHp > 0) {
        ctx.strokeStyle = COLOR_YELLOW;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 200);
        ctx.shadowBlur = 15;
        ctx.shadowColor = COLOR_YELLOW;
        ctx.beginPath();
        ctx.ellipse(e.x, e.y, e.w/2 + 14, e.h/2 + 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
      }
      // HP bar above boss
      const hpPct = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(e.x - 50, e.y - e.h/2 - 12, 100, 5);
      ctx.fillStyle = COLOR_RED;
      ctx.fillRect(e.x - 50, e.y - e.h/2 - 12, 100 * hpPct, 5);
    }

    // Mini HP bar for tank/truck
    if ((e.type === 'tank' || e.type === 'truck') && e.hp < e.maxHp) {
      const pct = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2 - 6, e.w, 3);
      ctx.fillStyle = COLOR_RED;
      ctx.fillRect(e.x - e.w/2, e.y - e.h/2 - 6, e.w * pct, 3);
    }
  }
}

function adjustColor(hex, ratio) {
  const r = parseInt(hex.substr(1, 2), 16);
  const g = parseInt(hex.substr(3, 2), 16);
  const b = parseInt(hex.substr(5, 2), 16);
  const nr = Math.floor(r * (0.4 + 0.6 * ratio));
  const ng = Math.floor(g * (0.4 + 0.6 * ratio));
  const nb = Math.floor(b * (0.4 + 0.6 * ratio));
  return 'rgb(' + nr + ',' + ng + ',' + nb + ')';
}

function drawEnemyProjectiles() {
  for (const o of Game.enemyOrbs) {
    ctx.shadowBlur = 12;
    ctx.shadowColor = COLOR_RED;
    ctx.fillStyle = COLOR_RED;
    ctx.beginPath();
    ctx.arc(o.x, o.y, ENEMY_ORB_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOR_YELLOW;
    ctx.beginPath();
    ctx.arc(o.x, o.y, ENEMY_ORB_RADIUS - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  for (const b of Game.enemyBombs) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FF8800';
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FF8800';
    ctx.beginPath();
    ctx.arc(b.x, b.y - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function drawFloatingTexts() {
  for (const ft of Game.floatingTexts) {
    const alpha = ft.life / ft.maxLife;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 12px Courier New';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 8;
    ctx.shadowColor = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}

function drawHUD() {
  // Coins
  ctx.fillStyle = COLOR_YELLOW;
  ctx.font = 'bold 12px Courier New';
  ctx.textAlign = 'right';
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_YELLOW;
  ctx.fillText('$ ' + Game.coins, GAME_WIDTH - 8, GAME_HEIGHT - 6);
  ctx.shadowBlur = 0;

  // Mega shots indicator
  ctx.fillStyle = COLOR_GREEN;
  ctx.textAlign = 'left';
  ctx.fillText('MEGA: ' + Game.turret.megaShots, 8, GAME_HEIGHT - 6);

  // Wave indicator
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'left';
  ctx.font = '10px Courier New';
  ctx.fillText('HI: ' + Game.highScore, 8, 14);

  // AutoAim indicator
  ctx.fillStyle = Game.turret.autoAim ? COLOR_GREEN : 'rgba(255,255,255,0.4)';
  ctx.textAlign = 'right';
  ctx.fillText('AUTO-AIM [T]', GAME_WIDTH - 8, 14);
}

function drawTitle() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = COLOR_GREEN;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_GREEN;
  ctx.font = 'bold 48px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('TANK', GAME_WIDTH / 2, 120);

  ctx.font = '14px Courier New';
  ctx.fillStyle = COLOR_RED;
  ctx.shadowColor = COLOR_RED;
  ctx.fillText('TURRET DEFENSE', GAME_WIDTH / 2, 150);

  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '12px Courier New';
  const blink = Math.floor(performance.now() / 500) % 2;
  if (blink === 0) {
    ctx.fillStyle = COLOR_GREEN;
    ctx.fillText('CLICK or TAP to start', GAME_WIDTH / 2, 260);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '10px Courier New';
  ctx.fillText('CLICK: FIRE   SPACE: MEGA SHOT', GAME_WIDTH / 2, 300);
  ctx.fillText('P: PAUSE   M: MUTE   T: AUTO-AIM', GAME_WIDTH / 2, 316);

  ctx.fillStyle = COLOR_YELLOW;
  ctx.fillText('HIGH SCORE: ' + Game.highScore, GAME_WIDTH / 2, 350);

  if (Game.leaderboard.length > 0) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('-- TOP 3 --', GAME_WIDTH / 2, 376);
    for (let i = 0; i < Game.leaderboard.length; i++) {
      ctx.fillText((i + 1) + '. ' + Game.leaderboard[i], GAME_WIDTH / 2, 392 + i * 14);
    }
  }
}

function drawWaveBreakOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  const elapsed = performance.now() - Game.waveBreakStart;
  const remaining = Math.max(0, Math.ceil((WAVE_BREAK_DURATION - elapsed) / 1000));

  ctx.fillStyle = COLOR_GREEN;
  ctx.font = 'bold 22px Courier New';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 12;
  ctx.shadowColor = COLOR_GREEN;
  ctx.fillText('WAVE ' + Game.wave + ' COMPLETE', GAME_WIDTH / 2, 50);

  ctx.font = '12px Courier New';
  ctx.fillStyle = COLOR_YELLOW;
  ctx.shadowColor = COLOR_YELLOW;
  ctx.fillText('Next wave in ' + remaining + 's   |   $ ' + Game.coins, GAME_WIDTH / 2, 80);
  ctx.shadowBlur = 0;

  ctx.fillStyle = COLOR_GREEN;
  ctx.font = 'bold 13px Courier New';
  ctx.fillText('-- UPGRADE SHOP --', GAME_WIDTH / 2, 110);

  for (const btn of Input.shopButtons) {
    const affordable = Game.coins >= btn.cost;
    ctx.fillStyle = affordable ? 'rgba(68,255,0,0.15)' : 'rgba(80,80,80,0.2)';
    ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
    ctx.strokeStyle = affordable ? COLOR_GREEN : 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);

    ctx.fillStyle = affordable ? '#FFFFFF' : '#888';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(btn.label, btn.x + 10, btn.y + 20);
    ctx.fillStyle = affordable ? COLOR_YELLOW : '#666';
    ctx.textAlign = 'right';
    ctx.fillText('$' + btn.cost, btn.x + btn.w - 10, btn.y + 20);
  }
}

function drawPauseOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = COLOR_GREEN;
  ctx.font = 'bold 36px Courier New';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 15;
  ctx.shadowColor = COLOR_GREEN;
  ctx.fillText('PAUSED', GAME_WIDTH / 2, GAME_HEIGHT / 2);
  ctx.font = '12px Courier New';
  ctx.fillText('Press P or click ▶ RESUME to continue', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
  ctx.shadowBlur = 0;
}

function drawGameOverOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  ctx.fillStyle = COLOR_RED;
  ctx.font = 'bold 40px Courier New';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_RED;
  ctx.fillText('GAME OVER', GAME_WIDTH / 2, 140);

  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 8;
  ctx.font = '16px Courier New';
  ctx.fillText('SCORE: ' + Game.score, GAME_WIDTH / 2, 200);
  ctx.fillText('WAVE: ' + Game.wave, GAME_WIDTH / 2, 224);

  ctx.fillStyle = COLOR_YELLOW;
  ctx.shadowColor = COLOR_YELLOW;
  ctx.font = '14px Courier New';
  ctx.fillText('HIGH SCORE: ' + Game.highScore, GAME_WIDTH / 2, 260);

  ctx.shadowBlur = 0;
  ctx.fillStyle = COLOR_GREEN;
  ctx.font = '12px Courier New';
  const blink = Math.floor(performance.now() / 500) % 2;
  if (blink === 0) {
    ctx.fillText('CLICK or PRESS ENTER to restart', GAME_WIDTH / 2, 320);
  }
}

function drawLoading() {
  ctx.fillStyle = COLOR_BG;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  ctx.fillStyle = COLOR_GREEN;
  ctx.font = 'bold 18px Courier New';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 10;
  ctx.shadowColor = COLOR_GREEN;
  ctx.fillText('LOADING...', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 20);

  const elapsed = performance.now() - Game.loadStartTime;
  const pct = Math.min(1, elapsed / LOADING_DURATION);

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(GAME_WIDTH/2 - 100, GAME_HEIGHT/2, 200, 12);
  ctx.fillStyle = COLOR_GREEN;
  ctx.fillRect(GAME_WIDTH/2 - 100, GAME_HEIGHT/2, 200 * pct, 12);
  ctx.strokeStyle = COLOR_GREEN;
  ctx.lineWidth = 1;
  ctx.strokeRect(GAME_WIDTH/2 - 100, GAME_HEIGHT/2, 200, 12);
}

function drawScreenEffects() {
  if (Game.flashRed > 0) {
    ctx.fillStyle = 'rgba(255,34,0,' + (Game.flashRed * 0.6) + ')';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
  if (Game.flashGreen > 0) {
    ctx.fillStyle = 'rgba(68,255,0,' + (Game.flashGreen * 0.4) + ')';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
  if (Game.crtFlickerIntensity > 0) {
    ctx.fillStyle = 'rgba(255,255,255,' + Game.crtFlickerIntensity + ')';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

function render() {
  // Apply shake
  ctx.save();
  if (Game.shake > 0) {
    const sx = (Math.random() - 0.5) * Game.shake;
    const sy = (Math.random() - 0.5) * Game.shake;
    ctx.translate(sx, sy);
  }

  drawBackground();

  if (Game.state === STATE_LOADING) {
    drawLoading();
    ctx.restore();
    return;
  }

  if (Game.state === STATE_TITLE) {
    drawBase();
    drawTurret();
    Particles.render(ctx);
    drawTitle();
    ctx.restore();
    return;
  }

  // Playing / paused / wave break / game over
  drawBase();
  drawEnemies();
  drawEnemyProjectiles();
  drawBullets();
  drawTurret();
  Particles.render(ctx);
  drawFloatingTexts();
  drawHUD();
  drawScreenEffects();

  if (Game.state === STATE_WAVE_BREAK) {
    drawWaveBreakOverlay();
  } else if (Game.state === STATE_PAUSED) {
    drawPauseOverlay();
  } else if (Game.state === STATE_GAME_OVER) {
    drawGameOverOverlay();
  }

  ctx.restore();
}

// === MAIN LOOP ===
function mainLoop(timestamp) {
  if (!Game.running) return;
  if (!Game.lastTime) Game.lastTime = timestamp;
  let deltaMs = timestamp - Game.lastTime;
  Game.lastTime = timestamp;
  if (deltaMs > 100) deltaMs = 100;
  let deltaSeconds = deltaMs / 1000;

  // Slow-mo effect
  if (Game.slowMo > 0) {
    deltaSeconds *= 0.5;
  }

  // Update aim from mouse
  Game.turret.aimX = Input.mouseX;
  Game.turret.aimY = Input.mouseY;

  // State machine update
  if (Game.state === STATE_LOADING) {
    if (performance.now() - Game.loadStartTime >= LOADING_DURATION) {
      Game.state = STATE_TITLE;
    }
  } else if (Game.state === STATE_PLAYING) {
    updateTurret(deltaSeconds);
    updateBullets(deltaSeconds);
    updateMegaBullets(deltaSeconds);
    updateEnemies(deltaSeconds);
    updateEnemyProjectiles(deltaSeconds);
    updateFloatingTexts(deltaSeconds);
    Particles.update(deltaSeconds);
    checkWaveComplete();
  } else if (Game.state === STATE_WAVE_BREAK) {
    updateWaveBreak();
    Particles.update(deltaSeconds);
    updateFloatingTexts(deltaSeconds);
  } else if (Game.state === STATE_PAUSED) {
    // Frozen
  } else if (Game.state === STATE_GAME_OVER) {
    Particles.update(deltaSeconds);
    updateFloatingTexts(deltaSeconds);
  } else if (Game.state === STATE_TITLE) {
    updateTurret(deltaSeconds);
    Particles.update(deltaSeconds);
  }

  updateScreenEffects(deltaSeconds);
  render();

  requestAnimationFrame(mainLoop);
}

// === INIT ===
function init() {
  Game.loadHighScores();
  Game.reset();
  AudioEngine.init();
  Particles.init();
  Input.init();

  updateHudTitle(Game.wave, Game.score);
  updateMuteButton(AudioEngine.muted);
  updatePauseButton(false);

  Game.loadStartTime = performance.now();
  Game.state = STATE_LOADING;
  Game.running = true;

  // Resize handler — scale content to fit
  function fitToScreen() {
    const wrap = document.getElementById('gameContainer');
    if (!wrap) return;
    const wRatio = window.innerWidth / 500;
    const hRatio = window.innerHeight / 551;
    const scale = Math.min(wRatio, hRatio);
    wrap.style.transform = 'scale(' + scale + ')';
    wrap.style.transformOrigin = 'center center';
  }
  window.addEventListener('resize', fitToScreen);
  fitToScreen();

  requestAnimationFrame(mainLoop);
}

window.addEventListener('load', init);

// Resume audio on first user gesture
const resumeAudioOnce = () => {
  AudioEngine.resume();
  document.removeEventListener('click', resumeAudioOnce);
  document.removeEventListener('keydown', resumeAudioOnce);
  document.removeEventListener('touchstart', resumeAudioOnce);
};
document.addEventListener('click', resumeAudioOnce);
document.addEventListener('keydown', resumeAudioOnce);
document.addEventListener('touchstart', resumeAudioOnce);

</script>
</body>
</html>
`;

export const TankGame = () => (
  <iframe
    srcDoc={TANK_HTML}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background: '#050505',
    }}
    title="Tank"
    sandbox="allow-scripts allow-same-origin"
  />
);
