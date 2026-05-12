const TETRIS_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>TETRIS — Neon Arcade</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body {
    width: 100%; height: 100%;
    background: #050505;
    font-family: 'Courier New', monospace;
    overflow: hidden;
    color: #fff;
    user-select: none;
    -webkit-user-select: none;
  }
  body {
    display: flex;
    justify-content: center;
    align-items: center;
    touch-action: none;
  }
  #gameWrapper {
    position: relative;
    width: 480px;
    height: 691px;
    background: #050505;
    box-shadow: 0 0 40px rgba(0,255,255,0.15), 0 0 80px rgba(255,0,255,0.08);
    overflow: hidden;
  }
  /* === TOP HUD === */
  #topHud {
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 36px;
    background: rgba(0,0,0,0.85);
    border-bottom: 1px solid rgba(255,255,255,0.1);
    z-index: 50;
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
    font: bold 11px monospace;
    color: white;
    cursor: pointer;
    transition: background 0.15s;
  }
  #exitBtn:hover { background: rgba(255,60,60,1); }
  #hudTitle {
    flex: 1;
    text-align: center;
    font: bold 13px monospace;
    color: #00FFFF;
    text-shadow: 0 0 8px #00FFFF, 0 0 16px rgba(0,255,255,0.5);
    letter-spacing: 2px;
  }
  .hudBtn {
    height: 28px;
    margin: 4px 2px;
    background: rgba(255,255,255,0.1);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 5px;
    font: 11px monospace;
    color: white;
    cursor: pointer;
    transition: background 0.15s;
  }
  .hudBtn:hover { background: rgba(255,255,255,0.2); }
  #muteBtn { width: 70px; }
  #pauseBtn { width: 85px; }

  /* === GAME CANVAS === */
  #gameCanvas {
    position: absolute;
    top: 36px;
    left: 0;
    width: 480px;
    height: 600px;
    background: #050505;
    display: block;
    image-rendering: pixelated;
  }

  /* === BOTTOM CONTROLS === */
  #bottomBar {
    position: absolute;
    bottom: 0; left: 0;
    width: 100%; height: 55px;
    background: rgba(0,0,0,0.75);
    border-top: 1px solid rgba(255,255,255,0.1);
    z-index: 50;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 10px;
  }
  .dpad {
    display: flex;
    gap: 4px;
  }
  .dBtn {
    width: 45px; height: 45px;
    background: rgba(0,255,255,0.1);
    border: 1px solid rgba(0,255,255,0.3);
    border-radius: 8px;
    color: #00FFFF;
    font: 18px monospace;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.05s, background 0.05s;
  }
  .dBtn:active, .dBtn.pressed {
    transform: scale(0.9);
    background: rgba(0,255,255,0.4);
    filter: brightness(1.5);
  }
  .actions {
    display: flex;
    gap: 8px;
  }
  .aBtn {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: rgba(255,0,255,0.15);
    border: 1px solid rgba(255,0,255,0.5);
    color: #FF00FF;
    font: bold 16px monospace;
    cursor: pointer;
    transition: transform 0.05s, background 0.05s;
  }
  .aBtn:active, .aBtn.pressed {
    transform: scale(0.9);
    background: rgba(255,0,255,0.5);
    filter: brightness(1.5);
  }

  /* === ESC OVERLAY === */
  #escOverlay {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0,0,0,0.9);
    border: 2px solid #FF3C3C;
    color: #fff;
    padding: 14px 24px;
    font: bold 14px monospace;
    border-radius: 8px;
    z-index: 200;
    display: none;
    text-shadow: 0 0 6px #FF3C3C;
  }
</style>
</head>
<body>
<div id="gameWrapper">
  <div id="topHud">
    <button id="exitBtn">✕ EXIT</button>
    <div id="hudTitle">TETRIS — 0</div>
    <div>
      <button id="muteBtn" class="hudBtn">🔊 SFX</button>
      <button id="pauseBtn" class="hudBtn">⏸ PAUSE</button>
    </div>
  </div>
  <canvas id="gameCanvas" width="480" height="600"></canvas>
  <div id="bottomBar">
    <div class="dpad">
      <button class="dBtn" data-key="ArrowLeft">◀</button>
      <button class="dBtn" data-key="ArrowUp">▲</button>
      <button class="dBtn" data-key="ArrowDown">▼</button>
      <button class="dBtn" data-key="ArrowRight">▶</button>
    </div>
    <div class="actions">
      <button class="aBtn" data-key="x">A</button>
      <button class="aBtn" data-key=" ">B</button>
    </div>
  </div>
  <div id="escOverlay">Press ESC again to exit</div>
</div>

<script>
'use strict';

// =====================================================================
// === CONSTANTS =======================================================
// =====================================================================
const CELL_SIZE          = 30;
const BOARD_COLS         = 10;
const BOARD_ROWS         = 20;
const BOARD_PIXEL_WIDTH  = CELL_SIZE * BOARD_COLS;  // 300
const BOARD_PIXEL_HEIGHT = CELL_SIZE * BOARD_ROWS;  // 600
const CANVAS_WIDTH       = 480;
const CANVAS_HEIGHT      = 600;
const BOARD_OFFSET_X     = 0;
const BOARD_OFFSET_Y     = 0;
const SIDE_PANEL_X       = BOARD_PIXEL_WIDTH + 10;
const SIDE_PANEL_WIDTH   = CANVAS_WIDTH - BOARD_PIXEL_WIDTH - 10;

const DAS_DELAY_MS       = 170;
const DAS_REPEAT_MS      = 50;
const SOFT_DROP_FACTOR   = 20;
const LOCK_DELAY_MS      = 500;
const LOCK_RESET_LIMIT   = 15;
const ARE_DELAY_MS       = 30;

const GAME_STATE_LOADING   = 'LOADING';
const GAME_STATE_TITLE     = 'TITLE';
const GAME_STATE_PLAYING   = 'PLAYING';
const GAME_STATE_PAUSED    = 'PAUSED';
const GAME_STATE_GAME_OVER = 'GAME_OVER';
const GAME_STATE_HIGHSCORE = 'HIGHSCORE';

const SCORE_LINE_1  = 100;
const SCORE_LINE_2  = 300;
const SCORE_LINE_3  = 500;
const SCORE_LINE_4  = 800;
const SCORE_TSPIN_1 = 800;
const SCORE_TSPIN_2 = 1200;
const SCORE_TSPIN_3 = 1600;
const SCORE_PERFECT_CLEAR = 3500;
const B2B_BONUS_MULT = 1.5;

const LINES_PER_LEVEL = 10;
const BASE_FALL_MS    = 800;
const MIN_FALL_MS     = 50;

const PARTICLE_POOL_SIZE = 500;
const PARTICLE_TYPE_SPARK  = 0;
const PARTICLE_TYPE_CIRCLE = 1;
const PARTICLE_TYPE_STAR   = 2;
const PARTICLE_TYPE_TRAIL  = 3;

const COLOR_CYAN    = '#00FFFF';
const COLOR_MAGENTA = '#FF00FF';
const COLOR_YELLOW  = '#FFD700';
const COLOR_GREEN   = '#00FF66';
const COLOR_RED     = '#FF3344';
const COLOR_BLUE    = '#3366FF';
const COLOR_ORANGE  = '#FF8800';
const COLOR_WHITE   = '#FFFFFF';

// Tetromino definitions — each piece has 4 rotation states stored as 4x4 grids
// Piece indexes correspond to SRS conventions
const TETROMINO_DEFS = {
  I: {
    color: COLOR_CYAN,
    shapes: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]]
    ]
  },
  O: {
    color: COLOR_YELLOW,
    shapes: [
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]]
    ]
  },
  T: {
    color: COLOR_MAGENTA,
    shapes: [
      [[0,1,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  },
  S: {
    color: COLOR_GREEN,
    shapes: [
      [[0,1,1,0],[1,1,0,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,0,0,0],[0,1,1,0],[1,1,0,0],[0,0,0,0]],
      [[1,0,0,0],[1,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  },
  Z: {
    color: COLOR_RED,
    shapes: [
      [[1,1,0,0],[0,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,1,1,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,1,0,0],[1,1,0,0],[1,0,0,0],[0,0,0,0]]
    ]
  },
  J: {
    color: COLOR_BLUE,
    shapes: [
      [[1,0,0,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,1,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[0,0,1,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[1,1,0,0],[0,0,0,0]]
    ]
  },
  L: {
    color: COLOR_ORANGE,
    shapes: [
      [[0,0,1,0],[1,1,1,0],[0,0,0,0],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,1,0],[0,0,0,0]],
      [[0,0,0,0],[1,1,1,0],[1,0,0,0],[0,0,0,0]],
      [[1,1,0,0],[0,1,0,0],[0,1,0,0],[0,0,0,0]]
    ]
  }
};
const PIECE_KEYS = ['I','O','T','S','Z','J','L'];

// SRS wall kick tables
const KICK_DATA_JLSTZ = {
  '0->1': [[0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
  '1->0': [[0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
  '1->2': [[0,0],[ 1,0],[ 1,-1],[0, 2],[ 1, 2]],
  '2->1': [[0,0],[-1,0],[-1, 1],[0,-2],[-1,-2]],
  '2->3': [[0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]],
  '3->2': [[0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
  '3->0': [[0,0],[-1,0],[-1,-1],[0, 2],[-1, 2]],
  '0->3': [[0,0],[ 1,0],[ 1, 1],[0,-2],[ 1,-2]]
};
const KICK_DATA_I = {
  '0->1': [[0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '1->0': [[0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '1->2': [[0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]],
  '2->1': [[0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '2->3': [[0,0],[ 2,0],[-1,0],[ 2, 1],[-1,-2]],
  '3->2': [[0,0],[-2,0],[ 1,0],[-2,-1],[ 1, 2]],
  '3->0': [[0,0],[ 1,0],[-2,0],[ 1,-2],[-2, 1]],
  '0->3': [[0,0],[-1,0],[ 2,0],[-1, 2],[ 2,-1]]
};

// =====================================================================
// === HUD SETUP =======================================================
// =====================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const hudTitle = document.getElementById('hudTitle');
const exitBtn = document.getElementById('exitBtn');
const muteBtn = document.getElementById('muteBtn');
const pauseBtn = document.getElementById('pauseBtn');
const escOverlay = document.getElementById('escOverlay');

function updateHudTitle(score) {
  hudTitle.textContent = 'TETRIS — ' + score;
}

function updateMuteButtonLabel(muted) {
  muteBtn.textContent = muted ? '🔇 SFX' : '🔊 SFX';
}

function updatePauseButtonLabel(paused) {
  pauseBtn.textContent = paused ? '▶ RESUME' : '⏸ PAUSE';
}

// =====================================================================
// === AUDIO ENGINE ====================================================
// =====================================================================
const AudioEngine = (function() {
  let audioCtx = null;
  let musicGain = null;
  let sfxGain = null;
  let masterGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;
  let musicBPM = 160;
  let musicInterval = null;
  let active = true;

  // A minor melody pattern (semitone offsets from A3 = 220Hz)
  // A minor scale: A B C D E F G
  const MELODY_PATTERN = [
    0, 7, 12, 7, 5, 7, 3, 7,
    0, 7, 12, 14, 12, 7, 5, 3,
    0, 5, 8, 5, 3, 5, -2, 0,
    -5, -2, 0, 3, 0, -2, -5, -7
  ];
  const BASS_PATTERN = [
    -12, -12, -12, -12, -7, -7, -9, -9,
    -12, -12, -12, -12, -10, -10, -8, -8,
    -14, -14, -14, -14, -9, -9, -11, -11,
    -17, -17, -17, -17, -12, -12, -10, -10
  ];

  function semitoneToFreq(semis) {
    return 220 * Math.pow(2, semis / 12);
  }

  function init() {
    if (audioCtx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1.0;
      masterGain.connect(audioCtx.destination);
      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0.25;
      musicGain.connect(masterGain);
      sfxGain = audioCtx.createGain();
      sfxGain.gain.value = 0.4;
      sfxGain.connect(masterGain);
    } catch (e) {
      audioCtx = null;
    }
  }

  function setMuted(value) {
    muted = value;
    if (masterGain) masterGain.gain.value = muted ? 0 : 1.0;
  }

  function isMuted() { return muted; }

  function setBPM(bpm) {
    musicBPM = Math.min(280, Math.max(80, bpm));
  }

  function playTone(freq, duration, type, vol, target) {
    if (!audioCtx || !active) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    const now = audioCtx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol || 0.3, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(target || sfxGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playMelodyStep() {
    if (!audioCtx || !active) return;
    const idx = musicStep % MELODY_PATTERN.length;
    const melodySemi = MELODY_PATTERN[idx];
    const bassSemi = BASS_PATTERN[idx];
    const dur = (60 / musicBPM) * 0.9;
    // Melody (square)
    const m = audioCtx.createOscillator();
    const mg = audioCtx.createGain();
    m.type = 'square';
    m.frequency.value = semitoneToFreq(melodySemi);
    const t0 = audioCtx.currentTime;
    mg.gain.setValueAtTime(0, t0);
    mg.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
    mg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    m.connect(mg); mg.connect(musicGain);
    m.start(t0); m.stop(t0 + dur + 0.05);
    // Bass (triangle)
    const b = audioCtx.createOscillator();
    const bg = audioCtx.createGain();
    b.type = 'triangle';
    b.frequency.value = semitoneToFreq(bassSemi);
    bg.gain.setValueAtTime(0, t0);
    bg.gain.linearRampToValueAtTime(0.22, t0 + 0.01);
    bg.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 1.2);
    b.connect(bg); bg.connect(musicGain);
    b.start(t0); b.stop(t0 + dur * 1.2 + 0.05);
    // Percussion every other step: kick
    if (idx % 2 === 0) {
      const k = audioCtx.createOscillator();
      const kg = audioCtx.createGain();
      k.type = 'sine';
      k.frequency.setValueAtTime(120, t0);
      k.frequency.exponentialRampToValueAtTime(40, t0 + 0.08);
      kg.gain.setValueAtTime(0.3, t0);
      kg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.08);
      k.connect(kg); kg.connect(musicGain);
      k.start(t0); k.stop(t0 + 0.1);
    }
    // Hi-hat every odd step
    if (idx % 2 === 1) {
      const bufferSize = Math.floor(audioCtx.sampleRate * 0.03);
      const noiseBuf = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
      const noise = audioCtx.createBufferSource();
      noise.buffer = noiseBuf;
      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 8000;
      const hg = audioCtx.createGain();
      hg.gain.setValueAtTime(0.15, t0);
      hg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.03);
      noise.connect(hp); hp.connect(hg); hg.connect(musicGain);
      noise.start(t0); noise.stop(t0 + 0.04);
    }
    musicStep++;
  }

  function startMusic() {
    if (musicInterval) return;
    if (!audioCtx) return;
    const step = () => {
      playMelodyStep();
      const ms = (60 / musicBPM) * 1000;
      musicInterval = setTimeout(step, ms);
    };
    step();
  }

  function stopMusic() {
    if (musicInterval) { clearTimeout(musicInterval); musicInterval = null; }
  }

  function sfxMove() { playTone(440, 0.02, 'square', 0.2); }
  function sfxRotate() { playTone(560, 0.03, 'square', 0.2); }
  function sfxWallHit() { playTone(880, 0.02, 'sine', 0.25); }
  function sfxClick() { playTone(1200, 0.01, 'square', 0.2); }
  function sfxHardDrop() {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime;
    const bufSize = Math.floor(audioCtx.sampleRate * 0.06);
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bufSize);
    const src = audioCtx.createBufferSource(); src.buffer = buf;
    const g = audioCtx.createGain(); g.gain.value = 0.3;
    src.connect(g); g.connect(sfxGain); src.start(t0);
    playTone(220, 0.06, 'sawtooth', 0.25);
  }
  function sfxLineClear() {
    playTone(523, 0.08, 'square', 0.25);
    setTimeout(() => playTone(659, 0.08, 'square', 0.25), 50);
    setTimeout(() => playTone(784, 0.12, 'square', 0.3), 100);
  }
  function sfxTetris() {
    sfxLineClear();
    setTimeout(() => playTone(1047, 0.18, 'square', 0.35), 180);
    setTimeout(() => playTone(1319, 0.25, 'triangle', 0.3), 280);
  }
  function sfxLevelUp() {
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((f, i) => setTimeout(() => playTone(f, 0.12, 'square', 0.3), i * 100));
  }
  function sfxDeath() {
    const notes = [392, 370, 349, 330, 311];
    notes.forEach((f, i) => setTimeout(() => playTone(f, 0.18, 'sawtooth', 0.3), i * 120));
    if (!audioCtx) return;
    setTimeout(() => {
      const t0 = audioCtx.currentTime;
      const bufSize = Math.floor(audioCtx.sampleRate * 0.5);
      const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * 0.3 * (1 - i / bufSize);
      const src = audioCtx.createBufferSource(); src.buffer = buf;
      const g = audioCtx.createGain(); g.gain.value = 0.4;
      src.connect(g); g.connect(sfxGain); src.start(t0);
    }, 200);
  }

  function closeAll() {
    active = false;
    stopMusic();
    if (audioCtx) {
      try { audioCtx.close(); } catch (e) {}
      audioCtx = null;
    }
  }

  return {
    init, setMuted, isMuted, setBPM,
    startMusic, stopMusic,
    sfxMove, sfxRotate, sfxWallHit, sfxClick,
    sfxHardDrop, sfxLineClear, sfxTetris,
    sfxLevelUp, sfxDeath, closeAll
  };
})();

// =====================================================================
// === PARTICLE SYSTEM =================================================
// =====================================================================
const ParticleSystem = (function() {
  const pool = [];
  for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
    pool.push({
      active: false, type: 0, x: 0, y: 0, vx: 0, vy: 0,
      life: 0, maxLife: 1, size: 2, color: '#fff', gravity: false
    });
  }

  function spawn(type, x, y, vx, vy, life, size, color, gravity) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) {
        p.active = true;
        p.type = type;
        p.x = x; p.y = y;
        p.vx = vx; p.vy = vy;
        p.life = life; p.maxLife = life;
        p.size = size; p.color = color;
        p.gravity = !!gravity;
        return;
      }
    }
  }

  function burst(x, y, count, color, options) {
    options = options || {};
    const speedMin = options.speedMin || 50;
    const speedMax = options.speedMax || 200;
    const life = options.life || 0.6;
    const type = options.type !== undefined ? options.type : PARTICLE_TYPE_SPARK;
    const size = options.size || 2;
    const gravity = options.gravity || false;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      spawn(type, x, y, vx, vy, life * (0.7 + Math.random() * 0.6), size, color, gravity);
    }
  }

  function update(dt) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.gravity) p.vy += 400 * dt;
      p.vx *= 0.98;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
  }

  function draw(context) {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const p = pool[i];
      if (!p.active) continue;
      const alpha = Math.max(0, p.life / p.maxLife);
      context.save();
      context.globalAlpha = alpha;
      context.fillStyle = p.color;
      context.shadowBlur = 8;
      context.shadowColor = p.color;
      const px = Math.floor(p.x);
      const py = Math.floor(p.y);
      if (p.type === PARTICLE_TYPE_SPARK) {
        context.fillRect(px, py, 2, 2);
      } else if (p.type === PARTICLE_TYPE_CIRCLE) {
        context.beginPath();
        context.arc(px, py, p.size, 0, Math.PI * 2);
        context.fill();
      } else if (p.type === PARTICLE_TYPE_STAR) {
        drawStar(context, px, py, p.size, 6);
      } else if (p.type === PARTICLE_TYPE_TRAIL) {
        context.fillRect(px - p.size/2, py - p.size/2, p.size, p.size);
      }
      context.restore();
    }
  }

  function drawStar(c, cx, cy, r, points) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const ang = (Math.PI / points) * i;
      const rad = i % 2 === 0 ? r : r / 2;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.closePath();
    c.fill();
  }

  function clear() {
    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) pool[i].active = false;
  }

  return { burst, spawn, update, draw, clear };
})();

// =====================================================================
// === GAME STATE ======================================================
// =====================================================================
const GameState = {
  state: GAME_STATE_LOADING,
  loadingProgress: 0,
  loadingStartTime: 0,
  loadingDuration: 1500,

  board: [],
  currentPiece: null,
  ghostY: 0,
  nextQueue: [],
  bag: [],
  holdPiece: null,
  holdUsed: false,

  score: 0,
  highScore: 0,
  leaderboard: [],
  level: 1,
  lines: 0,
  combo: -1,
  b2b: false,
  scoreMultiplier: 1,
  tetrisStreak: 0,
  lastClearWasTetris: false,

  fallTimer: 0,
  lockTimer: 0,
  lockResetCount: 0,
  isLocking: false,
  areTimer: 0,
  inAre: false,

  shakeIntensity: 0,
  shakeTime: 0,
  flashColor: null,
  flashAlpha: 0,
  slowMoTimer: 0,

  floatingTexts: [],
  lineClearAnim: null,
  tetrisTextAnim: null,
  rainbowFlashTime: 0,

  // Title screen state
  titleFallingPieces: [],

  // ESC double-press
  escWarningTime: 0,
  escWarningActive: false,

  // CRT flicker
  flickerTimer: 0,
  flickerActive: false,
  flickerDuration: 0,

  // Game over
  gameOverTime: 0,
  gameOverPhase: 0
};

function createEmptyBoard() {
  const b = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    const row = [];
    for (let c = 0; c < BOARD_COLS; c++) row.push(null);
    b.push(row);
  }
  return b;
}

function loadPersistedData() {
  try {
    const hs = localStorage.getItem('hs_tetris');
    GameState.highScore = hs ? parseInt(hs, 10) || 0 : 0;
    const lb = localStorage.getItem('lb_tetris');
    GameState.leaderboard = lb ? JSON.parse(lb) : [];
    const mute = localStorage.getItem('mute_tetris');
    if (mute === 'true') {
      AudioEngine.setMuted(true);
      updateMuteButtonLabel(true);
    }
  } catch (e) {
    GameState.highScore = 0;
    GameState.leaderboard = [];
  }
}

function persistScore() {
  try {
    if (GameState.score > GameState.highScore) {
      GameState.highScore = GameState.score;
      localStorage.setItem('hs_tetris', String(GameState.highScore));
    }
    const lb = GameState.leaderboard.slice();
    lb.push(GameState.score);
    lb.sort((a, b) => b - a);
    GameState.leaderboard = lb.slice(0, 3);
    localStorage.setItem('lb_tetris', JSON.stringify(GameState.leaderboard));
  } catch (e) {}
}

function refillBag() {
  const order = PIECE_KEYS.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  GameState.bag.push.apply(GameState.bag, order);
}

function nextPieceKey() {
  if (GameState.bag.length === 0) refillBag();
  return GameState.bag.shift();
}

function ensureQueue() {
  while (GameState.nextQueue.length < 4) GameState.nextQueue.push(nextPieceKey());
}

function makePiece(key) {
  return {
    key: key,
    color: TETROMINO_DEFS[key].color,
    rotation: 0,
    x: 3,
    y: key === 'I' ? -1 : 0
  };
}

function spawnNextPiece() {
  ensureQueue();
  const key = GameState.nextQueue.shift();
  const piece = makePiece(key);
  GameState.currentPiece = piece;
  GameState.holdUsed = false;
  GameState.lockTimer = 0;
  GameState.lockResetCount = 0;
  GameState.isLocking = false;
  GameState.fallTimer = 0;
  ensureQueue();
  if (pieceCollides(piece, piece.x, piece.y, piece.rotation)) {
    triggerGameOver();
    return;
  }
  updateGhost();
}

function pieceCollides(piece, x, y, rotation) {
  const shape = TETROMINO_DEFS[piece.key].shapes[rotation];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= BOARD_COLS || by >= BOARD_ROWS) return true;
      if (by >= 0 && GameState.board[by][bx]) return true;
    }
  }
  return false;
}

function updateGhost() {
  const p = GameState.currentPiece;
  if (!p) return;
  let y = p.y;
  while (!pieceCollides(p, p.x, y + 1, p.rotation)) y++;
  GameState.ghostY = y;
}

// =====================================================================
// === INPUT HANDLER ===================================================
// =====================================================================
const Input = (function() {
  const heldKeys = {};
  const dasTimers = { left: 0, right: 0 };
  const dasActive = { left: false, right: false };
  const dasInitialMoved = { left: false, right: false };

  function isDown(k) { return !!heldKeys[k]; }

  function setHeld(key, down) {
    heldKeys[key] = down;
    if (!down) {
      if (key === 'ArrowLeft') { dasTimers.left = 0; dasActive.left = false; dasInitialMoved.left = false; }
      if (key === 'ArrowRight') { dasTimers.right = 0; dasActive.right = false; dasInitialMoved.right = false; }
    }
  }

  function update(dt) {
    if (GameState.state !== GAME_STATE_PLAYING) return;
    // DAS for left
    if (heldKeys['ArrowLeft']) {
      if (!dasInitialMoved.left) {
        movePiece(-1, 0);
        dasInitialMoved.left = true;
        dasTimers.left = 0;
      } else {
        dasTimers.left += dt * 1000;
        if (!dasActive.left && dasTimers.left >= DAS_DELAY_MS) {
          dasActive.left = true;
          dasTimers.left = 0;
          movePiece(-1, 0);
        } else if (dasActive.left && dasTimers.left >= DAS_REPEAT_MS) {
          dasTimers.left -= DAS_REPEAT_MS;
          movePiece(-1, 0);
        }
      }
    }
    // DAS for right
    if (heldKeys['ArrowRight']) {
      if (!dasInitialMoved.right) {
        movePiece(1, 0);
        dasInitialMoved.right = true;
        dasTimers.right = 0;
      } else {
        dasTimers.right += dt * 1000;
        if (!dasActive.right && dasTimers.right >= DAS_DELAY_MS) {
          dasActive.right = true;
          dasTimers.right = 0;
          movePiece(1, 0);
        } else if (dasActive.right && dasTimers.right >= DAS_REPEAT_MS) {
          dasTimers.right -= DAS_REPEAT_MS;
          movePiece(1, 0);
        }
      }
    }
  }

  function handleKeyDown(e) {
    const key = e.key;
    if (key === 'Escape') {
      e.preventDefault();
      handleEscape();
      return;
    }
    if (key === 'p' || key === 'P') { togglePause(); return; }
    if (key === 'm' || key === 'M') { toggleMute(); return; }

    if (GameState.state === GAME_STATE_TITLE) {
      if (key === ' ' || key === 'Enter') {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (GameState.state === GAME_STATE_GAME_OVER) {
      if (key === ' ' || key === 'Enter' || key === 'r' || key === 'R') {
        e.preventDefault();
        startGame();
      }
      return;
    }
    if (GameState.state !== GAME_STATE_PLAYING) return;

    if (heldKeys[key]) return; // ignore auto-repeat

    if (key === 'ArrowLeft') { setHeld('ArrowLeft', true); }
    else if (key === 'ArrowRight') { setHeld('ArrowRight', true); }
    else if (key === 'ArrowDown') { setHeld('ArrowDown', true); }
    else if (key === 'ArrowUp' || key === 'x' || key === 'X') { rotatePiece(1); }
    else if (key === 'Control' || key === 'Shift') { rotatePiece(-1); }
    else if (key === 'z' || key === 'Z') { rotatePiece(2); }
    else if (key === ' ') { e.preventDefault(); hardDrop(); }
    else if (key === 'c' || key === 'C') { holdCurrentPiece(); }
  }

  function handleKeyUp(e) {
    setHeld(e.key, false);
  }

  function handleEscape() {
    if (GameState.escWarningActive) {
      doExit();
    } else {
      GameState.escWarningActive = true;
      GameState.escWarningTime = 1.5;
      escOverlay.style.display = 'block';
    }
  }

  return { isDown, setHeld, update, handleKeyDown, handleKeyUp, handleEscape };
})();

function doExit() {
  GameState.state = 'EXITED';
  AudioEngine.closeAll();
  try { window.parent.postMessage({ action: 'exitGame' }, '*'); } catch (e) {}
  try { window.dispatchEvent(new CustomEvent('gameExit')); } catch (e) {}
}

function togglePause() {
  if (GameState.state === GAME_STATE_PLAYING) {
    GameState.state = GAME_STATE_PAUSED;
    AudioEngine.stopMusic();
    updatePauseButtonLabel(true);
    AudioEngine.sfxClick();
  } else if (GameState.state === GAME_STATE_PAUSED) {
    GameState.state = GAME_STATE_PLAYING;
    if (!AudioEngine.isMuted()) AudioEngine.startMusic();
    updatePauseButtonLabel(false);
    AudioEngine.sfxClick();
  }
}

function toggleMute() {
  const newMuted = !AudioEngine.isMuted();
  AudioEngine.setMuted(newMuted);
  updateMuteButtonLabel(newMuted);
  try { localStorage.setItem('mute_tetris', String(newMuted)); } catch (e) {}
  if (newMuted) {
    AudioEngine.stopMusic();
  } else if (GameState.state === GAME_STATE_PLAYING) {
    AudioEngine.startMusic();
  }
}

// =====================================================================
// === GAME LOGIC ======================================================
// =====================================================================
function movePiece(dx, dy) {
  const p = GameState.currentPiece;
  if (!p) return false;
  if (!pieceCollides(p, p.x + dx, p.y + dy, p.rotation)) {
    p.x += dx;
    p.y += dy;
    if (dx !== 0) {
      AudioEngine.sfxMove();
      if (GameState.isLocking && GameState.lockResetCount < LOCK_RESET_LIMIT) {
        GameState.lockTimer = 0;
        GameState.lockResetCount++;
      }
    }
    updateGhost();
    return true;
  } else {
    if (dx !== 0) AudioEngine.sfxWallHit();
    return false;
  }
}

function rotatePiece(direction) {
  const p = GameState.currentPiece;
  if (!p) return;
  if (p.key === 'O') { AudioEngine.sfxRotate(); return; }
  let newRotation;
  if (direction === 2) {
    newRotation = (p.rotation + 2) % 4;
  } else if (direction === 1) {
    newRotation = (p.rotation + 1) % 4;
  } else {
    newRotation = (p.rotation + 3) % 4;
  }
  const kickKey = p.rotation + '->' + newRotation;
  const kickTable = (p.key === 'I') ? KICK_DATA_I : KICK_DATA_JLSTZ;
  const kicks = kickTable[kickKey] || [[0,0]];
  for (let i = 0; i < kicks.length; i++) {
    const dx = kicks[i][0];
    const dy = -kicks[i][1]; // SRS y is up-positive; our y is down-positive
    if (!pieceCollides(p, p.x + dx, p.y + dy, newRotation)) {
      p.x += dx;
      p.y += dy;
      p.rotation = newRotation;
      AudioEngine.sfxRotate();
      if (GameState.isLocking && GameState.lockResetCount < LOCK_RESET_LIMIT) {
        GameState.lockTimer = 0;
        GameState.lockResetCount++;
      }
      updateGhost();
      return;
    }
  }
  AudioEngine.sfxWallHit();
}

function hardDrop() {
  const p = GameState.currentPiece;
  if (!p) return;
  let cells = 0;
  while (!pieceCollides(p, p.x, p.y + 1, p.rotation)) {
    p.y++;
    cells++;
  }
  addScore(cells * 2);
  AudioEngine.sfxHardDrop();
  spawnHardDropParticles();
  startScreenShake(4, 0.15);
  lockPiece();
}

function holdCurrentPiece() {
  if (GameState.holdUsed) return;
  const cur = GameState.currentPiece;
  if (!cur) return;
  if (GameState.holdPiece === null) {
    GameState.holdPiece = cur.key;
    spawnNextPiece();
  } else {
    const prevHold = GameState.holdPiece;
    GameState.holdPiece = cur.key;
    GameState.currentPiece = makePiece(prevHold);
    if (pieceCollides(GameState.currentPiece, GameState.currentPiece.x, GameState.currentPiece.y, 0)) {
      triggerGameOver();
      return;
    }
    updateGhost();
    GameState.lockTimer = 0;
    GameState.lockResetCount = 0;
    GameState.isLocking = false;
    GameState.fallTimer = 0;
  }
  GameState.holdUsed = true;
  AudioEngine.sfxClick();
}

function softDropStep() {
  if (movePiece(0, 1)) {
    addScore(1);
  }
}

function spawnHardDropParticles() {
  const p = GameState.currentPiece;
  if (!p) return;
  const shape = TETROMINO_DEFS[p.key].shapes[p.rotation];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const cx = (p.x + c) * CELL_SIZE + CELL_SIZE / 2 + BOARD_OFFSET_X;
      const cy = (p.y + r) * CELL_SIZE + CELL_SIZE + BOARD_OFFSET_Y;
      ParticleSystem.burst(cx, cy, 4, p.color, {
        speedMin: 30, speedMax: 120, life: 0.4,
        type: PARTICLE_TYPE_SPARK, size: 2
      });
    }
  }
}

function isTSpin(piece, kickIndexUsed) {
  if (piece.key !== 'T') return false;
  // Check 4 corners around T center
  const corners = [
    [piece.x, piece.y],
    [piece.x + 2, piece.y],
    [piece.x, piece.y + 2],
    [piece.x + 2, piece.y + 2]
  ];
  let filled = 0;
  for (let i = 0; i < 4; i++) {
    const cx = corners[i][0];
    const cy = corners[i][1];
    if (cx < 0 || cx >= BOARD_COLS || cy < 0 || cy >= BOARD_ROWS) {
      filled++;
    } else if (GameState.board[cy][cx]) {
      filled++;
    }
  }
  return filled >= 3;
}

function lockPiece() {
  const p = GameState.currentPiece;
  if (!p) return;
  const shape = TETROMINO_DEFS[p.key].shapes[p.rotation];
  let topOutside = false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const bx = p.x + c;
      const by = p.y + r;
      if (by < 0) { topOutside = true; continue; }
      GameState.board[by][bx] = p.color;
    }
  }
  // T-spin detection: simple corner test
  const tspin = isTSpin(p, 0);
  GameState.currentPiece = null;
  GameState.isLocking = false;
  GameState.lockTimer = 0;
  GameState.lockResetCount = 0;

  // Check for complete lines
  const cleared = [];
  for (let r = 0; r < BOARD_ROWS; r++) {
    let full = true;
    for (let c = 0; c < BOARD_COLS; c++) {
      if (!GameState.board[r][c]) { full = false; break; }
    }
    if (full) cleared.push(r);
  }
  if (cleared.length > 0) {
    startLineClearAnim(cleared, tspin);
  } else {
    if (topOutside) {
      triggerGameOver();
      return;
    }
    GameState.inAre = true;
    GameState.areTimer = ARE_DELAY_MS / 1000;
  }
  GameState.combo = (cleared.length > 0) ? GameState.combo + 1 : -1;
}

function startLineClearAnim(rows, tspin) {
  GameState.lineClearAnim = {
    rows: rows.slice(),
    flashCount: 3,
    flashTimer: 0,
    flashOn: true,
    phase: 'flash',
    collapseTimer: 0,
    tspin: tspin
  };
  AudioEngine.sfxLineClear();
  // Spawn particles per cell
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    for (let c = 0; c < BOARD_COLS; c++) {
      const color = GameState.board[r][c] || COLOR_WHITE;
      const cx = c * CELL_SIZE + CELL_SIZE/2;
      const cy = r * CELL_SIZE + CELL_SIZE/2;
      ParticleSystem.burst(cx, cy, 10, color, {
        speedMin: 60, speedMax: 220, life: 0.7,
        type: PARTICLE_TYPE_SPARK, size: 2
      });
    }
  }
  startScreenShake(3 + rows.length * 2, 0.3);
}

function finishLineClear() {
  const anim = GameState.lineClearAnim;
  if (!anim) return;
  const clearedRows = anim.rows.slice().sort((a, b) => a - b);
  // Remove rows
  for (let i = 0; i < clearedRows.length; i++) {
    const idx = clearedRows[i] - i; // adjust after removal
    GameState.board.splice(idx, 1);
    const newRow = [];
    for (let c = 0; c < BOARD_COLS; c++) newRow.push(null);
    GameState.board.unshift(newRow);
  }
  const lineCount = clearedRows.length;
  // Scoring
  let basePts = 0;
  if (anim.tspin) {
    if (lineCount === 1) basePts = SCORE_TSPIN_1;
    else if (lineCount === 2) basePts = SCORE_TSPIN_2;
    else if (lineCount === 3) basePts = SCORE_TSPIN_3;
    else basePts = SCORE_LINE_1;
  } else {
    if (lineCount === 1) basePts = SCORE_LINE_1;
    else if (lineCount === 2) basePts = SCORE_LINE_2;
    else if (lineCount === 3) basePts = SCORE_LINE_3;
    else if (lineCount === 4) basePts = SCORE_LINE_4;
  }
  let pts = basePts * GameState.level;
  // Back-to-back
  const isHard = (lineCount === 4) || anim.tspin;
  if (isHard && GameState.b2b) pts = Math.floor(pts * B2B_BONUS_MULT);
  GameState.b2b = isHard;

  // Tetris streak multiplier
  if (lineCount === 4) {
    GameState.tetrisStreak++;
    const streakMult = [1, 1, 2, 4, 8];
    GameState.scoreMultiplier = streakMult[Math.min(GameState.tetrisStreak, 4)];
    pts = pts * GameState.scoreMultiplier;
    GameState.rainbowFlashTime = 0.8;
    GameState.tetrisTextAnim = { time: 0, duration: 1.2 };
    AudioEngine.sfxTetris();
  } else {
    GameState.tetrisStreak = 0;
    GameState.scoreMultiplier = 1;
  }

  // Combo
  if (GameState.combo > 0) {
    pts += 50 * GameState.combo * GameState.level;
  }

  // Perfect clear
  let perfect = true;
  for (let r = 0; r < BOARD_ROWS && perfect; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (GameState.board[r][c]) { perfect = false; break; }
    }
  }
  if (perfect) {
    pts += SCORE_PERFECT_CLEAR;
    spawnFloatingText('PERFECT CLEAR!', BOARD_PIXEL_WIDTH/2, BOARD_PIXEL_HEIGHT/2, COLOR_CYAN);
  }

  addScore(pts);
  spawnFloatingText('+' + pts, BOARD_PIXEL_WIDTH/2, clearedRows[0] * CELL_SIZE, COLOR_YELLOW);

  // Lines / level
  GameState.lines += lineCount;
  const newLevel = 1 + Math.floor(GameState.lines / LINES_PER_LEVEL);
  if (newLevel > GameState.level) {
    GameState.level = newLevel;
    AudioEngine.sfxLevelUp();
    GameState.flashColor = COLOR_CYAN;
    GameState.flashAlpha = 0.35;
    spawnFloatingText('LEVEL ' + GameState.level, BOARD_PIXEL_WIDTH/2, BOARD_PIXEL_HEIGHT/2 - 30, COLOR_MAGENTA);
  }
  GameState.lineClearAnim = null;
  GameState.inAre = true;
  GameState.areTimer = ARE_DELAY_MS / 1000;
}

function addScore(amount) {
  GameState.score += amount;
  updateHudTitle(GameState.score);
  // Music speed scaling
  const newBPM = 160 + Math.floor(GameState.score / 500) * 2;
  AudioEngine.setBPM(newBPM);
}

function spawnFloatingText(text, x, y, color) {
  GameState.floatingTexts.push({
    text: text, x: x, y: y, color: color,
    life: 0.8, maxLife: 0.8, vy: -40
  });
}

function startScreenShake(intensity, duration) {
  GameState.shakeIntensity = Math.max(GameState.shakeIntensity, intensity);
  GameState.shakeTime = Math.max(GameState.shakeTime, duration);
}

function triggerGameOver() {
  GameState.state = GAME_STATE_GAME_OVER;
  GameState.gameOverTime = 0;
  GameState.gameOverPhase = 0;
  GameState.slowMoTimer = 0.5;
  AudioEngine.stopMusic();
  AudioEngine.sfxDeath();
  persistScore();
  startScreenShake(8, 0.6);
  GameState.flashColor = COLOR_RED;
  GameState.flashAlpha = 0.5;
  // Big particle burst
  for (let r = 0; r < BOARD_ROWS; r++) {
    for (let c = 0; c < BOARD_COLS; c++) {
      if (GameState.board[r][c]) {
        ParticleSystem.burst(
          c * CELL_SIZE + CELL_SIZE/2,
          r * CELL_SIZE + CELL_SIZE/2,
          3, GameState.board[r][c],
          { speedMin: 30, speedMax: 150, life: 1.0, gravity: true, type: PARTICLE_TYPE_SPARK }
        );
      }
    }
  }
}

function resetGame() {
  GameState.board = createEmptyBoard();
  GameState.currentPiece = null;
  GameState.nextQueue = [];
  GameState.bag = [];
  GameState.holdPiece = null;
  GameState.holdUsed = false;
  GameState.score = 0;
  GameState.level = 1;
  GameState.lines = 0;
  GameState.combo = -1;
  GameState.b2b = false;
  GameState.scoreMultiplier = 1;
  GameState.tetrisStreak = 0;
  GameState.fallTimer = 0;
  GameState.lockTimer = 0;
  GameState.lockResetCount = 0;
  GameState.isLocking = false;
  GameState.areTimer = 0;
  GameState.inAre = false;
  GameState.shakeIntensity = 0;
  GameState.shakeTime = 0;
  GameState.flashColor = null;
  GameState.flashAlpha = 0;
  GameState.slowMoTimer = 0;
  GameState.floatingTexts = [];
  GameState.lineClearAnim = null;
  GameState.tetrisTextAnim = null;
  GameState.rainbowFlashTime = 0;
  ParticleSystem.clear();
  ensureQueue();
  updateHudTitle(0);
  AudioEngine.setBPM(160);
}

function startGame() {
  AudioEngine.init();
  resetGame();
  spawnNextPiece();
  GameState.state = GAME_STATE_PLAYING;
  if (!AudioEngine.isMuted()) AudioEngine.startMusic();
  AudioEngine.sfxClick();
}

function getFallInterval() {
  return Math.max(MIN_FALL_MS, BASE_FALL_MS * Math.pow(0.8, GameState.level - 1)) / 1000;
}

function updateGameLogic(dt) {
  if (GameState.state !== GAME_STATE_PLAYING) return;

  // ARE delay
  if (GameState.inAre) {
    GameState.areTimer -= dt;
    if (GameState.areTimer <= 0) {
      GameState.inAre = false;
      spawnNextPiece();
    }
    return;
  }

  // Line clear animation
  if (GameState.lineClearAnim) {
    const anim = GameState.lineClearAnim;
    if (anim.phase === 'flash') {
      anim.flashTimer += dt;
      if (anim.flashTimer >= 0.08) {
        anim.flashTimer = 0;
        anim.flashOn = !anim.flashOn;
        if (anim.flashOn) {
          anim.flashCount--;
          if (anim.flashCount <= 0) {
            anim.phase = 'collapse';
            anim.collapseTimer = 0;
          }
        }
      }
    } else if (anim.phase === 'collapse') {
      anim.collapseTimer += dt;
      if (anim.collapseTimer >= 0.15) {
        finishLineClear();
      }
    }
    return;
  }

  if (!GameState.currentPiece) return;

  // Falling
  const interval = getFallInterval();
  const softMultiplier = Input.isDown('ArrowDown') ? SOFT_DROP_FACTOR : 1;
  GameState.fallTimer += dt * softMultiplier;
  if (GameState.fallTimer >= interval) {
    GameState.fallTimer = 0;
    const p = GameState.currentPiece;
    if (!pieceCollides(p, p.x, p.y + 1, p.rotation)) {
      p.y++;
      if (Input.isDown('ArrowDown')) addScore(1);
      GameState.isLocking = false;
    } else {
      GameState.isLocking = true;
    }
  }

  // Lock delay
  if (GameState.isLocking) {
    GameState.lockTimer += dt * 1000;
    if (GameState.lockTimer >= LOCK_DELAY_MS) {
      lockPiece();
    }
  }
}

function updateGameOver(dt) {
  GameState.gameOverTime += dt;
  // Sweep rows for dramatic effect
  if (GameState.gameOverPhase < BOARD_ROWS && GameState.gameOverTime > GameState.gameOverPhase * 0.04) {
    const r = BOARD_ROWS - 1 - GameState.gameOverPhase;
    for (let c = 0; c < BOARD_COLS; c++) {
      if (GameState.board[r][c]) {
        const color = GameState.board[r][c];
        ParticleSystem.burst(
          c * CELL_SIZE + CELL_SIZE/2,
          r * CELL_SIZE + CELL_SIZE/2,
          2, color, { life: 0.6, speedMin: 20, speedMax: 100 }
        );
        GameState.board[r][c] = '#444';
      }
    }
    GameState.gameOverPhase++;
  }
}

function updateTitleScreen(dt) {
  // Spawn falling pieces
  if (Math.random() < dt * 1.5) {
    const key = PIECE_KEYS[Math.floor(Math.random() * PIECE_KEYS.length)];
    GameState.titleFallingPieces.push({
      key: key,
      color: TETROMINO_DEFS[key].color,
      x: Math.random() * (BOARD_PIXEL_WIDTH - 60),
      y: -60,
      vy: 30 + Math.random() * 50,
      rotation: Math.floor(Math.random() * 4),
      angle: 0,
      angSpd: (Math.random() - 0.5) * 1.5
    });
  }
  for (let i = GameState.titleFallingPieces.length - 1; i >= 0; i--) {
    const tp = GameState.titleFallingPieces[i];
    tp.y += tp.vy * dt;
    tp.angle += tp.angSpd * dt;
    if (tp.y > BOARD_PIXEL_HEIGHT + 60) GameState.titleFallingPieces.splice(i, 1);
  }
}

// =====================================================================
// === RENDERER ========================================================
// =====================================================================
function drawBlock(x, y, color, alpha) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.shadowBlur = 15;
  ctx.shadowColor = color;
  ctx.fillStyle = color;
  ctx.fillRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);
  // Inner highlight
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(px + 2, py + 2, CELL_SIZE - 4, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(px + 2, py + CELL_SIZE - 5, CELL_SIZE - 4, 3);
  ctx.restore();
}

function drawGhostBlock(x, y, color) {
  const px = Math.floor(x);
  const py = Math.floor(y);
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = COLOR_WHITE;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, CELL_SIZE - 4, CELL_SIZE - 4);
  ctx.restore();
}

function drawBoardGrid() {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (let c = 0; c <= BOARD_COLS; c++) {
    const x = c * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, BOARD_PIXEL_HEIGHT);
    ctx.stroke();
  }
  for (let r = 0; r <= BOARD_ROWS; r++) {
    const y = r * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(BOARD_PIXEL_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoard() {
  const anim = GameState.lineClearAnim;
  for (let r = 0; r < BOARD_ROWS; r++) {
    let isClearing = false;
    if (anim && anim.phase === 'flash' && anim.rows.indexOf(r) !== -1 && anim.flashOn) {
      isClearing = true;
    }
    for (let c = 0; c < BOARD_COLS; c++) {
      const cell = GameState.board[r][c];
      if (cell) {
        if (isClearing) {
          drawBlock(c * CELL_SIZE, r * CELL_SIZE, COLOR_WHITE);
        } else {
          drawBlock(c * CELL_SIZE, r * CELL_SIZE, cell);
        }
      }
    }
  }
}

function drawCurrentPieceAndGhost() {
  const p = GameState.currentPiece;
  if (!p) return;
  const shape = TETROMINO_DEFS[p.key].shapes[p.rotation];
  // Ghost
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const gx = (p.x + c) * CELL_SIZE;
      const gy = (GameState.ghostY + r) * CELL_SIZE;
      if (gy >= 0) drawGhostBlock(gx, gy, p.color);
    }
  }
  // Piece
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const bx = (p.x + c) * CELL_SIZE;
      const by = (p.y + r) * CELL_SIZE;
      if (by >= 0) drawBlock(bx, by, p.color);
    }
  }
}

function drawMiniPiece(key, originX, originY, scale) {
  const shape = TETROMINO_DEFS[key].shapes[0];
  const color = TETROMINO_DEFS[key].color;
  const size = CELL_SIZE * scale;
  let minC = 4, maxC = -1, minR = 4, maxR = -1;
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) if (shape[r][c]) {
    if (c < minC) minC = c; if (c > maxC) maxC = c;
    if (r < minR) minR = r; if (r > maxR) maxR = r;
  }
  const pieceW = (maxC - minC + 1) * size;
  const pieceH = (maxR - minR + 1) * size;
  const offX = originX - pieceW / 2 - minC * size;
  const offY = originY - pieceH / 2 - minR * size;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (!shape[r][c]) continue;
      const px = Math.floor(offX + c * size);
      const py = Math.floor(offY + r * size);
      ctx.save();
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.restore();
    }
  }
}

function drawSidePanels() {
  // Background panel
  ctx.save();
  ctx.fillStyle = 'rgba(20,20,30,0.5)';
  ctx.fillRect(SIDE_PANEL_X, 0, SIDE_PANEL_WIDTH, BOARD_PIXEL_HEIGHT);
  ctx.strokeStyle = 'rgba(0,255,255,0.2)';
  ctx.strokeRect(SIDE_PANEL_X + 0.5, 0.5, SIDE_PANEL_WIDTH - 1, BOARD_PIXEL_HEIGHT - 1);

  // HOLD
  ctx.fillStyle = COLOR_CYAN;
  ctx.font = 'bold 12px "Courier New"';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_CYAN;
  ctx.fillText('HOLD', SIDE_PANEL_X + SIDE_PANEL_WIDTH / 2, 20);
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(0,255,255,0.3)';
  ctx.strokeRect(SIDE_PANEL_X + 15, 30, SIDE_PANEL_WIDTH - 30, 55);
  if (GameState.holdPiece) {
    ctx.save();
    if (GameState.holdUsed) ctx.globalAlpha = 0.35;
    drawMiniPiece(GameState.holdPiece, SIDE_PANEL_X + SIDE_PANEL_WIDTH/2, 57, 0.55);
    ctx.restore();
  }

  // NEXT
  ctx.fillStyle = COLOR_MAGENTA;
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_MAGENTA;
  ctx.fillText('NEXT', SIDE_PANEL_X + SIDE_PANEL_WIDTH / 2, 110);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,0,255,0.3)';
  ctx.strokeRect(SIDE_PANEL_X + 15, 120, SIDE_PANEL_WIDTH - 30, 165);
  for (let i = 0; i < 3 && i < GameState.nextQueue.length; i++) {
    drawMiniPiece(GameState.nextQueue[i], SIDE_PANEL_X + SIDE_PANEL_WIDTH/2, 145 + i * 50, 0.5);
  }

  // STATS
  ctx.fillStyle = COLOR_CYAN;
  ctx.font = '11px "Courier New"';
  ctx.textAlign = 'left';
  let statsY = 310;
  ctx.shadowBlur = 4;
  ctx.shadowColor = COLOR_CYAN;
  ctx.fillText('SCORE', SIDE_PANEL_X + 12, statsY); statsY += 15;
  ctx.fillStyle = COLOR_WHITE;
  ctx.fillText(String(GameState.score), SIDE_PANEL_X + 12, statsY); statsY += 22;
  ctx.fillStyle = COLOR_CYAN;
  ctx.fillText('HIGH', SIDE_PANEL_X + 12, statsY); statsY += 15;
  ctx.fillStyle = COLOR_YELLOW;
  ctx.fillText(String(GameState.highScore), SIDE_PANEL_X + 12, statsY); statsY += 22;
  ctx.fillStyle = COLOR_CYAN;
  ctx.fillText('LEVEL', SIDE_PANEL_X + 12, statsY); statsY += 15;
  ctx.fillStyle = COLOR_WHITE;
  ctx.fillText(String(GameState.level), SIDE_PANEL_X + 12, statsY); statsY += 22;
  ctx.fillStyle = COLOR_CYAN;
  ctx.fillText('LINES', SIDE_PANEL_X + 12, statsY); statsY += 15;
  ctx.fillStyle = COLOR_WHITE;
  ctx.fillText(String(GameState.lines), SIDE_PANEL_X + 12, statsY); statsY += 22;
  if (GameState.scoreMultiplier > 1) {
    ctx.fillStyle = COLOR_MAGENTA;
    ctx.fillText('MULT x' + GameState.scoreMultiplier, SIDE_PANEL_X + 12, statsY);
  }
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawFloatingTexts(dt) {
  for (let i = GameState.floatingTexts.length - 1; i >= 0; i--) {
    const ft = GameState.floatingTexts[i];
    ft.y += ft.vy * dt;
    ft.life -= dt;
    if (ft.life <= 0) {
      GameState.floatingTexts.splice(i, 1);
      continue;
    }
    ctx.save();
    ctx.globalAlpha = ft.life / ft.maxLife;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 14px "Courier New"';
    ctx.textAlign = 'center';
    ctx.shadowBlur = 8;
    ctx.shadowColor = ft.color;
    ctx.fillText(ft.text, Math.floor(ft.x), Math.floor(ft.y));
    ctx.restore();
  }
}

function drawTetrisText(dt) {
  if (!GameState.tetrisTextAnim) return;
  GameState.tetrisTextAnim.time += dt;
  const t = GameState.tetrisTextAnim.time / GameState.tetrisTextAnim.duration;
  if (t >= 1) { GameState.tetrisTextAnim = null; return; }
  const scale = 0.3 + Math.min(t * 4, 1) * 2;
  const alpha = t < 0.7 ? 1 : (1 - (t - 0.7) / 0.3);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(BOARD_PIXEL_WIDTH/2, BOARD_PIXEL_HEIGHT/2);
  ctx.scale(scale, scale);
  ctx.font = 'bold 32px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR_YELLOW;
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_MAGENTA;
  ctx.fillText('TETRIS!', 0, 0);
  ctx.restore();
}

function drawRainbowFlash(dt) {
  if (GameState.rainbowFlashTime <= 0) return;
  GameState.rainbowFlashTime -= dt;
  const phase = (1 - GameState.rainbowFlashTime / 0.8);
  const hue = (phase * 360) % 360;
  ctx.save();
  ctx.globalAlpha = 0.15 * (GameState.rainbowFlashTime / 0.8);
  ctx.fillStyle = 'hsl(' + hue + ', 100%, 60%)';
  ctx.fillRect(0, 0, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);
  ctx.restore();
}

function drawCRTOverlay() {
  ctx.save();
  // Scanlines
  ctx.globalAlpha = 0.03;
  ctx.fillStyle = '#000';
  for (let y = 0; y < CANVAS_HEIGHT; y += 2) {
    ctx.fillRect(0, y, CANVAS_WIDTH, 1);
  }
  ctx.globalAlpha = 1;
  // Vignette
  const grad = ctx.createRadialGradient(
    CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT * 0.3,
    CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_HEIGHT * 0.75
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.25)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  // Flicker
  if (GameState.flickerActive) {
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }
  ctx.restore();
}

function drawFlash() {
  if (!GameState.flashColor || GameState.flashAlpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = GameState.flashAlpha;
  ctx.fillStyle = GameState.flashColor;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

function drawTitleScreen() {
  // Draw falling pieces in background
  for (let i = 0; i < GameState.titleFallingPieces.length; i++) {
    const tp = GameState.titleFallingPieces[i];
    ctx.save();
    ctx.translate(tp.x + 30, tp.y + 30);
    ctx.rotate(tp.angle);
    ctx.globalAlpha = 0.6;
    drawMiniPiece(tp.key, 0, 0, 1.0);
    ctx.restore();
  }
  // Title text
  ctx.save();
  ctx.font = 'bold 50px "Courier New"';
  ctx.textAlign = 'center';
  ctx.fillStyle = COLOR_CYAN;
  ctx.shadowBlur = 25;
  ctx.shadowColor = COLOR_CYAN;
  ctx.fillText('TETRIS', BOARD_PIXEL_WIDTH/2, 180);
  ctx.fillStyle = COLOR_MAGENTA;
  ctx.shadowColor = COLOR_MAGENTA;
  ctx.font = 'bold 14px "Courier New"';
  ctx.fillText('NEON ARCADE EDITION', BOARD_PIXEL_WIDTH/2, 210);

  ctx.font = '13px "Courier New"';
  ctx.fillStyle = COLOR_WHITE;
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_WHITE;
  const blink = Math.floor(performance.now() / 500) % 2 === 0;
  if (blink) {
    ctx.fillText('PRESS SPACE OR TAP TO START', BOARD_PIXEL_WIDTH/2, 380);
  }

  ctx.font = '10px "Courier New"';
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.fillText('← → MOVE   ↑ ROTATE   ↓ SOFT', BOARD_PIXEL_WIDTH/2, 440);
  ctx.fillText('SPACE HARD DROP   C HOLD   Z FLIP', BOARD_PIXEL_WIDTH/2, 458);
  ctx.fillText('P PAUSE   M MUTE   ESC EXIT', BOARD_PIXEL_WIDTH/2, 476);

  if (GameState.highScore > 0) {
    ctx.fillStyle = COLOR_YELLOW;
    ctx.shadowBlur = 6;
    ctx.shadowColor = COLOR_YELLOW;
    ctx.fillText('HIGH SCORE: ' + GameState.highScore, BOARD_PIXEL_WIDTH/2, 510);
  }
  if (GameState.leaderboard.length > 0) {
    ctx.fillStyle = COLOR_CYAN;
    ctx.shadowBlur = 4;
    ctx.shadowColor = COLOR_CYAN;
    ctx.font = 'bold 11px "Courier New"';
    ctx.fillText('TOP 3', BOARD_PIXEL_WIDTH/2, 540);
    for (let i = 0; i < GameState.leaderboard.length; i++) {
      ctx.fillStyle = COLOR_WHITE;
      ctx.shadowBlur = 0;
      ctx.fillText((i + 1) + '. ' + GameState.leaderboard[i], BOARD_PIXEL_WIDTH/2, 558 + i * 14);
    }
  }
  ctx.restore();
}

function drawLoadingScreen() {
  ctx.save();
  ctx.fillStyle = COLOR_CYAN;
  ctx.font = 'bold 30px "Courier New"';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 15;
  ctx.shadowColor = COLOR_CYAN;
  ctx.fillText('LOADING', CANVAS_WIDTH/2, 250);

  const barX = CANVAS_WIDTH/2 - 100;
  const barY = 290;
  ctx.shadowBlur = 0;
  ctx.strokeStyle = COLOR_CYAN;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, 200, 18);
  ctx.fillStyle = COLOR_MAGENTA;
  ctx.shadowBlur = 10;
  ctx.shadowColor = COLOR_MAGENTA;
  ctx.fillRect(barX + 2, barY + 2, 196 * GameState.loadingProgress, 14);

  ctx.shadowBlur = 0;
  ctx.fillStyle = COLOR_WHITE;
  ctx.font = '12px "Courier New"';
  ctx.fillText(Math.floor(GameState.loadingProgress * 100) + '%', CANVAS_WIDTH/2, 335);
  ctx.restore();
}

function drawPausedOverlay() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);
  ctx.fillStyle = COLOR_CYAN;
  ctx.font = 'bold 36px "Courier New"';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_CYAN;
  ctx.fillText('PAUSED', BOARD_PIXEL_WIDTH/2, BOARD_PIXEL_HEIGHT/2);
  ctx.font = '11px "Courier New"';
  ctx.fillStyle = COLOR_WHITE;
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_WHITE;
  ctx.fillText('Press P or RESUME to continue', BOARD_PIXEL_WIDTH/2, BOARD_PIXEL_HEIGHT/2 + 40);
  ctx.restore();
}

function drawGameOverScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.75)';
  ctx.fillRect(0, 0, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);
  ctx.fillStyle = COLOR_RED;
  ctx.font = 'bold 32px "Courier New"';
  ctx.textAlign = 'center';
  ctx.shadowBlur = 20;
  ctx.shadowColor = COLOR_RED;
  ctx.fillText('GAME OVER', BOARD_PIXEL_WIDTH/2, 200);

  ctx.fillStyle = COLOR_WHITE;
  ctx.font = '14px "Courier New"';
  ctx.shadowBlur = 6;
  ctx.shadowColor = COLOR_WHITE;
  ctx.fillText('SCORE: ' + GameState.score, BOARD_PIXEL_WIDTH/2, 260);
  ctx.fillStyle = COLOR_YELLOW;
  ctx.shadowColor = COLOR_YELLOW;
  ctx.fillText('HIGH:  ' + GameState.highScore, BOARD_PIXEL_WIDTH/2, 285);
  ctx.fillStyle = COLOR_CYAN;
  ctx.shadowColor = COLOR_CYAN;
  ctx.fillText('LINES: ' + GameState.lines, BOARD_PIXEL_WIDTH/2, 310);
  ctx.fillText('LEVEL: ' + GameState.level, BOARD_PIXEL_WIDTH/2, 335);

  const blink = Math.floor(performance.now() / 500) % 2 === 0;
  if (blink) {
    ctx.fillStyle = COLOR_MAGENTA;
    ctx.shadowColor = COLOR_MAGENTA;
    ctx.font = 'bold 14px "Courier New"';
    ctx.fillText('PRESS SPACE TO REPLAY', BOARD_PIXEL_WIDTH/2, 420);
  }
  ctx.restore();
}

function render(dt) {
  // Slow-mo affects animations only when in game over
  let renderDt = dt;
  if (GameState.slowMoTimer > 0) {
    renderDt = dt * 0.2;
    GameState.slowMoTimer -= dt;
  }

  // Clear
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Apply screen shake
  let shakeX = 0, shakeY = 0;
  if (GameState.shakeTime > 0) {
    const intensity = GameState.shakeIntensity * (GameState.shakeTime / 0.3);
    shakeX = (Math.random() - 0.5) * intensity * 2;
    shakeY = (Math.random() - 0.5) * intensity * 2;
    GameState.shakeTime -= dt;
    if (GameState.shakeTime <= 0) GameState.shakeIntensity = 0;
  }

  ctx.save();
  ctx.translate(Math.floor(shakeX), Math.floor(shakeY));

  // Background board area
  ctx.fillStyle = 'rgba(10,12,20,0.8)';
  ctx.fillRect(0, 0, BOARD_PIXEL_WIDTH, BOARD_PIXEL_HEIGHT);

  if (GameState.state === GAME_STATE_LOADING) {
    drawLoadingScreen();
  } else if (GameState.state === GAME_STATE_TITLE) {
    drawBoardGrid();
    drawTitleScreen();
    drawSidePanels();
  } else {
    drawBoardGrid();
    drawBoard();
    if (GameState.state === GAME_STATE_PLAYING || GameState.state === GAME_STATE_PAUSED) {
      drawCurrentPieceAndGhost();
    }
    drawRainbowFlash(renderDt);
    ParticleSystem.draw(ctx);
    drawFloatingTexts(renderDt);
    drawTetrisText(renderDt);
    drawSidePanels();

    if (GameState.state === GAME_STATE_PAUSED) {
      drawPausedOverlay();
    } else if (GameState.state === GAME_STATE_GAME_OVER) {
      drawGameOverScreen();
    }
  }

  ctx.restore();

  // Flash
  drawFlash();
  if (GameState.flashAlpha > 0) {
    GameState.flashAlpha = Math.max(0, GameState.flashAlpha - dt * 1.5);
  }

  // CRT
  drawCRTOverlay();
}

// =====================================================================
// === MAIN LOOP =======================================================
// =====================================================================
let lastFrameTime = 0;
let running = true;

function updateFlicker(dt) {
  GameState.flickerTimer += dt;
  if (!GameState.flickerActive && GameState.flickerTimer > 10) {
    GameState.flickerActive = true;
    GameState.flickerDuration = 0.08;
    GameState.flickerTimer = 0;
  }
  if (GameState.flickerActive) {
    GameState.flickerDuration -= dt;
    if (GameState.flickerDuration <= 0) GameState.flickerActive = false;
  }
}

function updateEscWarning(dt) {
  if (GameState.escWarningActive) {
    GameState.escWarningTime -= dt;
    if (GameState.escWarningTime <= 0) {
      GameState.escWarningActive = false;
      escOverlay.style.display = 'none';
    }
  }
}

function mainLoop(timestamp) {
  if (!running) return;
  if (!lastFrameTime) lastFrameTime = timestamp;
  let dt = (timestamp - lastFrameTime) / 1000;
  lastFrameTime = timestamp;
  if (dt > 0.1) dt = 0.1; // cap for tab switch

  // Loading state advance
  if (GameState.state === GAME_STATE_LOADING) {
    const elapsed = performance.now() - GameState.loadingStartTime;
    GameState.loadingProgress = Math.min(1, elapsed / GameState.loadingDuration);
    if (GameState.loadingProgress >= 1) {
      GameState.state = GAME_STATE_TITLE;
    }
  } else if (GameState.state === GAME_STATE_TITLE) {
    updateTitleScreen(dt);
  } else if (GameState.state === GAME_STATE_PLAYING) {
    Input.update(dt);
    updateGameLogic(dt);
  } else if (GameState.state === GAME_STATE_GAME_OVER) {
    updateGameOver(dt);
  }

  ParticleSystem.update(dt);
  updateFlicker(dt);
  updateEscWarning(dt);

  render(dt);

  requestAnimationFrame(mainLoop);
}

// =====================================================================
// === INIT ============================================================
// =====================================================================
function init() {
  loadPersistedData();
  GameState.board = createEmptyBoard();
  GameState.state = GAME_STATE_LOADING;
  GameState.loadingStartTime = performance.now();
  updateHudTitle(0);

  // Buttons
  exitBtn.addEventListener('click', function() {
    AudioEngine.sfxClick();
    doExit();
  });
  muteBtn.addEventListener('click', function() { toggleMute(); });
  pauseBtn.addEventListener('click', function() { togglePause(); });

  // Touch buttons
  const allButtons = document.querySelectorAll('[data-key]');
  allButtons.forEach(function(btn) {
    const key = btn.getAttribute('data-key');
    const press = function(e) {
      e.preventDefault();
      btn.classList.add('pressed');
      AudioEngine.init();
      if (GameState.state === GAME_STATE_TITLE) {
        startGame();
        return;
      }
      if (GameState.state === GAME_STATE_GAME_OVER) {
        startGame();
        return;
      }
      Input.handleKeyDown({ key: key, preventDefault: function(){} });
    };
    const release = function(e) {
      e.preventDefault();
      btn.classList.remove('pressed');
      Input.handleKeyUp({ key: key });
    };
    btn.addEventListener('touchstart', press, { passive: false });
    btn.addEventListener('touchend', release, { passive: false });
    btn.addEventListener('touchcancel', release, { passive: false });
    btn.addEventListener('mousedown', press);
    btn.addEventListener('mouseup', release);
    btn.addEventListener('mouseleave', release);
  });

  // Tap canvas to start (title or game over)
  canvas.addEventListener('click', function() {
    AudioEngine.init();
    if (GameState.state === GAME_STATE_TITLE || GameState.state === GAME_STATE_GAME_OVER) {
      startGame();
    }
  });

  // Keyboard
  window.addEventListener('keydown', function(e) {
    AudioEngine.init();
    Input.handleKeyDown(e);
  });
  window.addEventListener('keyup', function(e) {
    Input.handleKeyUp(e);
  });

  // Prevent context menu on long press
  window.addEventListener('contextmenu', function(e) { e.preventDefault(); });

  // Resize handler — scale wrapper to fit screen
  function fitToScreen() {
    const wrap = document.getElementById('gameWrapper');
    const wRatio = window.innerWidth / 480;
    const hRatio = window.innerHeight / 691;
    const scale = Math.min(wRatio, hRatio);
    wrap.style.transform = 'scale(' + scale + ')';
    wrap.style.transformOrigin = 'center center';
  }
  window.addEventListener('resize', fitToScreen);
  fitToScreen();

  requestAnimationFrame(mainLoop);
}

init();
</script>
</body>
</html>
`;

export const TetrisGame = () => (
  <iframe
    srcDoc={TETRIS_HTML}
    style={{
      width: '100%',
      height: '100%',
      border: 'none',
      display: 'block',
      background: '#050505',
    }}
    title="Tetris"
    sandbox="allow-scripts allow-same-origin"
  />
);
