/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Instagram, 
  Facebook, 
  Music2, 
  Disc, 
  Play, 
  Cloud, 
  Video, 
  ExternalLink,
  Youtube,
  Mail,
  MessageCircle,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Volume2,
  VolumeX
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";
import { LoadingScreen } from "./components/LoadingScreen";
import { MySongs } from "./components/MySongsPage";
import { DrawingsPage } from "./components/DrawingsPage";
import { useDeviceType } from "./hooks/useDeviceType";
import { Sarahni } from "./components/Sarahni";

const GAME_CODE_CONTENT = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Lumenfall — The Last Ember</title>
<style>
  html,body{margin:0;padding:0;background:#05060d;overflow:hidden;font-family:'Trebuchet MS',sans-serif;color:#e8eaf3;height:100%;}
  #wrap{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;}
  canvas{display:block;background:#05060d;image-rendering:pixelated;box-shadow:0 0 80px rgba(120,160,255,0.15);cursor:crosshair;}
  #hint{position:fixed;bottom:8px;left:50%;transform:translateX(-50%);font-size:11px;color:#6a7090;letter-spacing:2px;pointer-events:none;}
</style>
</head>
<body>
<div id="wrap"><canvas id="c" width="960" height="540"></canvas></div>
<div id="hint">A / D move • SPACE jump (double) • J attack • K dash • L spirit-burst • P pause</div>
<script>
"use strict";
// Fix for fetch error in some environments
(function() {
  try {
    const originalFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get: function() { return originalFetch; },
      set: function(v) { 
        console.warn('Attempted to overwrite window.fetch, ignoring to prevent crash.');
      },
      configurable: true,
      enumerable: true
    });
  } catch (e) {}
})();
/* =========================================================
   LUMENFALL — THE LAST EMBER
   A handcrafted single-file 2D action platformer.
   Story: The world's last Ember has been shattered into 5 shards
   scattered across the dying realms. You are Kael, the Emberbearer.
   Reclaim the shards, defeat the Hollow King, and reignite the world.
   ========================================================= */

const CV = document.getElementById('c');
const X  = CV.getContext('2d');
const W  = CV.width, H = CV.height;

/* ---------- Utility ---------- */
const TAU = Math.PI*2;
const rand = (a,b)=>a+Math.random()*(b-a);
const irand = (a,b)=>Math.floor(rand(a,b));
const clamp = (v,a,b)=>v<a?a:v>b?b:v;
const lerp = (a,b,t)=>a+(b-a)*t;
const dist2 = (x,y,x2,y2)=>{const dx=x-x2,dy=y-y2;return dx*dx+dy*dy;};

/* ---------- Audio (Web Audio synth) ---------- */
let AC=null, masterGain=null;
function initAudio(){
  if(AC) return;
  try{
    AC = new (window.AudioContext||window.webkitAudioContext)();
    masterGain = AC.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(AC.destination);
  }catch(e){AC=null;}
}
function beep(freq,dur,type='sine',vol=0.2,slide=0){
  if(!AC)return;
  const o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.value=freq;
  if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),AC.currentTime+dur);
  g.gain.value=vol;
  g.gain.exponentialRampToValueAtTime(0.0001,AC.currentTime+dur);
  o.connect(g);g.connect(masterGain);
  o.start();o.stop(AC.currentTime+dur);
}
function noiseBurst(dur,vol=0.2,filt=800){
  if(!AC)return;
  const buf=AC.createBuffer(1,AC.sampleRate*dur,AC.sampleRate);
  const d=buf.getChannelData(0);
  for(let i=0;i<d.length;i++)d[i]=(Math.random()*2-1)*(1-i/d.length);
  const s=AC.createBufferSource();s.buffer=buf;
  const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=filt;
  const g=AC.createGain();g.gain.value=vol;
  s.connect(f);f.connect(g);g.connect(masterGain);
  s.start();
}
const SFX={
  jump:()=>{beep(420,0.12,'square',0.18,200);},
  djump:()=>{beep(620,0.14,'square',0.16,300);},
  hit:()=>{noiseBurst(0.12,0.35,1200);beep(180,0.08,'square',0.18,-80);},
  slash:()=>{beep(900,0.06,'square',0.12,-400);noiseBurst(0.05,0.15,3000);},
  dash:()=>{noiseBurst(0.18,0.18,3000);beep(720,0.14,'sawtooth',0.1,-300);},
  pickup:()=>{beep(880,0.1,'triangle',0.18);beep(1320,0.12,'triangle',0.15);},
  hurt:()=>{beep(220,0.22,'sawtooth',0.25,-120);noiseBurst(0.18,0.18,500);},
  burst:()=>{beep(540,0.3,'sine',0.22,400);beep(220,0.4,'sine',0.18,300);},
  shard:()=>{[660,880,1320].forEach((f,i)=>setTimeout(()=>beep(f,0.18,'triangle',0.2),i*70));},
  boss:()=>{beep(80,0.6,'sawtooth',0.3,40);noiseBurst(0.4,0.2,300);},
  win:()=>{[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,0.25,'triangle',0.25),i*150));},
  lose:()=>{[400,300,200].forEach((f,i)=>setTimeout(()=>beep(f,0.4,'sawtooth',0.25),i*200));}
};

/* ---------- Input ---------- */
const KEY={};
addEventListener('keydown',e=>{KEY[e.key.toLowerCase()]=true;KEY[e.code]=true;initAudio();
  if(['Space','ArrowUp','ArrowDown'].includes(e.code))e.preventDefault();});
addEventListener('keyup',  e=>{KEY[e.key.toLowerCase()]=false;KEY[e.code]=false;});
addEventListener('mousedown',()=>initAudio());

/* ---------- Particles ---------- */
const particles=[];
function spawnP(x,y,opt={}){
  particles.push(Object.assign({
    x,y,vx:rand(-1,1),vy:rand(-2,0),
    life:1,decay:rand(0.01,0.04),
    size:rand(2,4),color:'#ffd089',glow:true,grav:0.05
  },opt));
}
function emit(x,y,n,opt){for(let i=0;i<n;i++)spawnP(x,y,typeof opt==='function'?opt():opt);}
function updateParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.vy+=p.grav;
    p.x+=p.vx;p.y+=p.vy;
    p.life-=p.decay;
    if(p.life<=0)particles.splice(i,1);
  }
}
function drawParticles(){
  X.save();
  for(const p of particles){
    if(p.glow){X.globalCompositeOperation='lighter';}
    else X.globalCompositeOperation='source-over';
    X.globalAlpha=clamp(p.life,0,1);
    X.fillStyle=p.color;
    X.beginPath();X.arc(p.x-cam.x,p.y-cam.y,p.size*Math.max(0.2,p.life),0,TAU);X.fill();
  }
  X.restore();
}

/* ---------- Camera ---------- */
const cam={x:0,y:0,tx:0,ty:0,shake:0,sx:0,sy:0};
function updateCam(){
  cam.x=lerp(cam.x,cam.tx,0.12);
  cam.y=lerp(cam.y,cam.ty,0.12);
  cam.shake*=0.86;
  cam.sx=(Math.random()-0.5)*cam.shake;
  cam.sy=(Math.random()-0.5)*cam.shake;
}
function shake(v){cam.shake=Math.min(20,cam.shake+v);}

/* ---------- World / Stages ---------- */
/* Each stage: tile-based platforms, enemies, theme palette, hazards, shard at end */
const TS=40; // tile size
const STAGES=[
  {
    name:"Whispering Glade",
    sub:"Where the first ember slept",
    palette:{sky1:'#1a2a4a',sky2:'#3a5a8a',sun:'#ffe6a3',ground:'#1f3a26',ground2:'#0f1f12',accent:'#7be096',leaf:'#3aa063',mist:'#a3d6b3'},
    weather:'leaves',
    width:80,
    builder:(M)=>{
      // ground
      for(let i=0;i<80;i++)M[i]={h:11};
      // dips and platforms
      M[14].h=9;M[15].h=9;M[16].h=9;
      M[22].h=13;M[23].h=13;
      M[30].h=8;M[31].h=8;M[32].h=8;M[33].h=8;
      M[40].h=12;M[41].h=12;M[42].h=12;
      M[50].h=7;M[51].h=7;M[52].h=7;
      M[60].h=10;M[61].h=10;
      M[70].h=9;M[71].h=9;M[72].h=9;
      // floating platforms (separate array)
      return [
        {x:18*TS,y:H-10*TS,w:3*TS,h:14},
        {x:36*TS,y:H-12*TS,w:3*TS,h:14},
        {x:46*TS,y:H-11*TS,w:2*TS,h:14},
        {x:56*TS,y:H-13*TS,w:3*TS,h:14},
        {x:66*TS,y:H-10*TS,w:2*TS,h:14},
      ];
    },
    enemies:(s)=>[
      {type:'walker',x:8*TS,y:0,col:'#9ce0a0'},
      {type:'walker',x:25*TS,y:0,col:'#9ce0a0'},
      {type:'flyer', x:38*TS,y:H-300,col:'#bff5c2'},
      {type:'walker',x:52*TS,y:0,col:'#9ce0a0'},
      {type:'flyer', x:62*TS,y:H-280,col:'#bff5c2'},
      {type:'walker',x:74*TS,y:0,col:'#9ce0a0'},
    ]
  },
  {
    name:"Sunken Ruins",
    sub:"Drowned halls of forgotten kings",
    palette:{sky1:'#0d1b3a',sky2:'#1d3a6a',sun:'#7fbfff',ground:'#1a2a44',ground2:'#0d1726',accent:'#7fc8ff',leaf:'#3a7abf',mist:'#a3c6ff'},
    weather:'bubbles',
    width:90,
    builder:(M)=>{
      for(let i=0;i<90;i++)M[i]={h:11};
      // pits
      [12,13,28,29,42,43,44,58,59,72,73].forEach(i=>M[i].h=20);
      M[20].h=8;M[21].h=8;
      M[34].h=9;M[35].h=9;M[36].h=9;
      M[50].h=7;M[51].h=7;
      M[64].h=10;M[65].h=10;
      M[80].h=8;M[81].h=8;M[82].h=8;
      return [
        {x:14*TS,y:H-7*TS,w:3*TS,h:14},
        {x:30*TS,y:H-9*TS,w:2*TS,h:14},
        {x:44*TS,y:H-8*TS,w:3*TS,h:14},
        {x:54*TS,y:H-12*TS,w:3*TS,h:14},
        {x:68*TS,y:H-9*TS,w:3*TS,h:14},
        {x:84*TS,y:H-11*TS,w:2*TS,h:14},
      ];
    },
    enemies:(s)=>[
      {type:'walker',x:10*TS,y:0,col:'#7fc8ff'},
      {type:'shooter',x:26*TS,y:H-420,col:'#a3e0ff'},
      {type:'walker',x:38*TS,y:0,col:'#7fc8ff'},
      {type:'flyer', x:50*TS,y:H-340,col:'#cfe7ff'},
      {type:'shooter',x:62*TS,y:H-380,col:'#a3e0ff'},
      {type:'walker',x:78*TS,y:0,col:'#7fc8ff'},
      {type:'flyer', x:86*TS,y:H-300,col:'#cfe7ff'}
    ]
  },
  {
    name:"Ashen Wastes",
    sub:"Where the sun forgot its name",
    palette:{sky1:'#3a1a1a',sky2:'#7a3525',sun:'#ff7f4a',ground:'#2a1a1a',ground2:'#150a0a',accent:'#ffb380',leaf:'#a04030',mist:'#e2a280'},
    weather:'embers',
    width:95,
    builder:(M)=>{
      for(let i=0;i<95;i++)M[i]={h:11};
      // jagged terrain
      const peaks=[10,16,24,32,40,48,56,64,72,80,88];
      peaks.forEach((p,i)=>{M[p].h=8-(i%3);M[p+1]&&(M[p+1].h=9-(i%3));});
      // lava pits
      [20,21,36,37,52,53,68,69,84,85].forEach(i=>{M[i].h=20;M[i].lava=true;});
      return [
        {x:22*TS,y:H-10*TS,w:3*TS,h:14},
        {x:38*TS,y:H-11*TS,w:3*TS,h:14},
        {x:54*TS,y:H-12*TS,w:3*TS,h:14},
        {x:70*TS,y:H-10*TS,w:3*TS,h:14},
        {x:86*TS,y:H-11*TS,w:3*TS,h:14},
      ];
    },
    enemies:(s)=>[
      {type:'walker',x:8*TS,y:0,col:'#ff8a55'},
      {type:'flyer', x:18*TS,y:H-340,col:'#ffb280'},
      {type:'shooter',x:30*TS,y:H-380,col:'#ff9a6a'},
      {type:'walker',x:44*TS,y:0,col:'#ff8a55'},
      {type:'flyer', x:56*TS,y:H-360,col:'#ffb280'},
      {type:'charger',x:66*TS,y:0,col:'#ff5a30'},
      {type:'walker',x:78*TS,y:0,col:'#ff8a55'},
      {type:'shooter',x:90*TS,y:H-380,col:'#ff9a6a'}
    ]
  },
  {
    name:"Crystal Aether",
    sub:"A kingdom of light suspended in the void",
    palette:{sky1:'#150a3a',sky2:'#3a1a7a',sun:'#d8a3ff',ground:'#2a1a55',ground2:'#150a2a',accent:'#cfa3ff',leaf:'#7a4ad0',mist:'#d6b3ff'},
    weather:'stars',
    width:100,
    builder:(M)=>{
      for(let i=0;i<100;i++)M[i]={h:20}; // mostly void
      // islands
      const islands=[[2,8,10],[12,17,9],[22,28,11],[32,36,8],[40,46,10],[50,55,9],[60,68,11],[72,76,8],[82,88,10],[92,99,11]];
      islands.forEach(([a,b,h])=>{for(let i=a;i<=b;i++)M[i].h=h;});
      return [
        {x:10*TS,y:H-12*TS,w:2*TS,h:14},
        {x:20*TS,y:H-13*TS,w:2*TS,h:14},
        {x:30*TS,y:H-11*TS,w:2*TS,h:14},
        {x:38*TS,y:H-14*TS,w:2*TS,h:14},
        {x:48*TS,y:H-12*TS,w:2*TS,h:14},
        {x:58*TS,y:H-15*TS,w:2*TS,h:14},
        {x:68*TS,y:H-13*TS,w:2*TS,h:14},
        {x:78*TS,y:H-12*TS,w:2*TS,h:14},
        {x:88*TS,y:H-14*TS,w:2*TS,h:14},
      ];
    },
    enemies:(s)=>[
      {type:'flyer', x:14*TS,y:H-400,col:'#d8b3ff'},
      {type:'shooter',x:24*TS,y:H-420,col:'#b487ff'},
      {type:'charger',x:34*TS,y:0,col:'#9560ff'},
      {type:'flyer', x:44*TS,y:H-380,col:'#d8b3ff'},
      {type:'shooter',x:54*TS,y:H-420,col:'#b487ff'},
      {type:'flyer', x:64*TS,y:H-360,col:'#d8b3ff'},
      {type:'charger',x:74*TS,y:0,col:'#9560ff'},
      {type:'shooter',x:84*TS,y:H-420,col:'#b487ff'},
      {type:'flyer', x:94*TS,y:H-400,col:'#d8b3ff'}
    ]
  },
  {
    name:"The Hollow Throne",
    sub:"The end of all light",
    palette:{sky1:'#0a0510',sky2:'#2a0a3a',sun:'#ff4080',ground:'#1a0820',ground2:'#0a0410',accent:'#ff60a0',leaf:'#80205a',mist:'#c060a0'},
    weather:'voidsparks',
    width:60,
    builder:(M)=>{
      for(let i=0;i<60;i++)M[i]={h:11};
      // arena
      M[10].h=8;M[11].h=8;
      M[20].h=10;M[21].h=10;
      M[40].h=10;M[41].h=10;
      M[50].h=8;M[51].h=8;
      return [
        {x:12*TS,y:H-7*TS,w:3*TS,h:14},
        {x:25*TS,y:H-9*TS,w:3*TS,h:14},
        {x:38*TS,y:H-9*TS,w:3*TS,h:14},
        {x:48*TS,y:H-7*TS,w:3*TS,h:14},
      ];
    },
    enemies:(s)=>[
      {type:'boss',x:32*TS,y:H-400,col:'#ff60a0'}
    ]
  }
];

/* ---------- Game State ---------- */
const STATE={MENU:0,STORY:1,PLAY:2,PAUSE:3,DEAD:4,WIN:5,STAGE_INTRO:6,STAGE_END:7};
let game={
  state:STATE.MENU,
  stage:0,
  shards:0,
  score:0,
  bestScore:+(localStorage.getItem('lumenfall_best')||0),
  time:0,
  hud:{flash:0},
  unlocks:{dash:false,burst:false,doubleJump:true},
  introT:0
};

/* world data */
let map=[], platforms=[], enemies=[], pickups=[], projectiles=[], shardObj=null, hazards=[];

/* ---------- Player ---------- */
const player={
  x:120,y:H-300,w:28,h:44,
  vx:0,vy:0,
  onGround:false,
  facing:1,
  jumps:2,maxJumps:2,
  hp:5,maxHp:5,
  energy:3,maxEnergy:3,
  energyRegen:0,
  invuln:0,
  attacking:0,attackCD:0,attackHits:[],
  dashing:0,dashCD:0,
  burstCD:0,
  hurt:0,
  victory:0,
  walkT:0,
  trail:[],
  reset(x,y){this.x=x;this.y=y;this.vx=this.vy=0;this.hp=this.maxHp;this.energy=this.maxEnergy;this.invuln=60;this.victory=0;this.trail=[];}
};

/* ---------- Stage Loading ---------- */
function loadStage(idx){
  game.stage=idx;
  const s=STAGES[idx];
  map=new Array(s.width);
  platforms=s.builder(map);
  hazards=[];
  for(let i=0;i<s.width;i++){
    if(map[i].lava){
      hazards.push({x:i*TS,y:H-map[i].h*TS,w:TS,h:60,type:'lava'});
    }
  }
  // pickups
  pickups=[];
  const pcount = idx<4 ? 8+idx*2 : 5;
  for(let k=0;k<pcount;k++){
    const ix=irand(3,s.width-3);
    const py=H-(map[ix].h+1)*TS - 10;
    pickups.push({x:ix*TS+TS/2,y:py,t:0,collected:false,type:'ember'});
  }
  // healing pickups occasionally
  for(let k=0;k<2;k++){
    const ix=irand(5,s.width-5);
    const py=H-(map[ix].h+2)*TS;
    pickups.push({x:ix*TS+TS/2,y:py,t:0,collected:false,type:'heart'});
  }
  // hidden secret
  if(idx<4){
    pickups.push({x:(s.width-4)*TS,y:120,t:0,collected:false,type:'secret'});
  }
  // enemies
  enemies=s.enemies(idx).map(e=>buildEnemy(e));
  // shard at end
  shardObj={x:(s.width-2)*TS,y:H-(map[s.width-2].h+2)*TS - 30,t:0,collected:false,boss:idx===4};
  projectiles=[];
  particles.length=0;
  player.reset(120,H-(map[2].h+3)*TS);
  cam.x=0;cam.y=0;
  game.introT=120;
}

/* ---------- Enemies ---------- */
function buildEnemy(e){
  const base={x:e.x,y:e.y,w:34,h:34,vx:0,vy:0,hp:2,col:e.col,type:e.type,t:Math.random()*100,onGround:false,hurt:0,dead:false};
  if(e.type==='walker'){base.hp=2;base.dir=Math.random()<0.5?-1:1;}
  if(e.type==='flyer') {base.hp=2;base.bx=e.x;base.by=e.y;base.w=32;base.h=24;}
  if(e.type==='shooter'){base.hp=3;base.cd=60;base.w=36;base.h=36;}
  if(e.type==='charger'){base.hp=4;base.dir=-1;base.charge=0;base.w=40;base.h=36;}
  if(e.type==='boss')  {base.hp=40;base.maxHp=40;base.phase=0;base.w=90;base.h=110;base.cd=120;base.target=null;base.bx=e.x;base.by=e.y;base.fly=true;}
  return base;
}

/* ---------- Collision ---------- */
function groundY(px){
  const i=Math.floor(px/TS);
  if(i<0||i>=map.length)return H;
  return H-map[i].h*TS;
}
function rectVsRect(a,b){
  return a.x<b.x+b.w && a.x+a.w>b.x && a.y<b.y+b.h && a.y+a.h>b.y;
}
function collideTerrain(o){
  // ground
  o.onGround=false;
  const fl=Math.floor(o.x/TS), fr=Math.floor((o.x+o.w)/TS);
  let topY=H;
  for(let i=fl;i<=fr;i++){
    if(i<0||i>=map.length)continue;
    const gy=H-map[i].h*TS;
    if(gy<topY)topY=gy;
  }
  if(o.y+o.h>topY){
    if(o.vy>=0){o.y=topY-o.h;o.vy=0;o.onGround=true;}
  }
  // walls (treat steep height differences as walls)
  const cx=Math.floor((o.x+o.w/2)/TS);
  if(cx>=0&&cx<map.length){
    const here=H-map[cx].h*TS;
    const left=cx>0?H-map[cx-1].h*TS:here;
    const right=cx<map.length-1?H-map[cx+1].h*TS:here;
    if(o.y+o.h>left+4 && o.x<cx*TS){o.x=cx*TS-o.w;o.vx=Math.min(0,o.vx);}
    if(o.y+o.h>right+4 && o.x+o.w>(cx+1)*TS){o.x=(cx+1)*TS;o.vx=Math.max(0,o.vx);}
  }
  // platforms
  for(const p of platforms){
    if(o.vy>=0 && o.y+o.h>=p.y && o.y+o.h<=p.y+p.h+8 && o.x+o.w>p.x+4 && o.x<p.x+p.w-4){
      const prev=o.y+o.h-o.vy;
      if(prev<=p.y+1){o.y=p.y-o.h;o.vy=0;o.onGround=true;}
    }
  }
  // bounds
  if(o.x<0){o.x=0;o.vx=Math.max(0,o.vx);}
  const max=map.length*TS;
  if(o.x+o.w>max){o.x=max-o.w;o.vx=Math.min(0,o.vx);}
}

/* ---------- Player Update ---------- */
function updatePlayer(){
  const p=player;
  if(p.victory>0){p.victory++;p.vx*=0.9;p.vy+=0.5;collideTerrain(p);return;}
  // move
  const speed=4.2;
  let ax=0;
  if(KEY['a']||KEY['arrowleft']){ax-=1;p.facing=-1;}
  if(KEY['d']||KEY['arrowright']){ax+=1;p.facing=1;}
  if(p.dashing>0){
    p.vx=p.facing*11;
    p.dashing--;
    p.invuln=Math.max(p.invuln,4);
    if(p.dashing%2===0)emit(p.x+p.w/2,p.y+p.h/2,1,()=>({x:p.x+p.w/2,y:p.y+p.h/2,vx:rand(-1,1),vy:rand(-1,1),life:0.6,decay:0.04,size:rand(2,4),color:'#9ad6ff',glow:true,grav:0}));
  } else {
    p.vx = lerp(p.vx, ax*speed, 0.25);
  }
  // jump
  if((KEY[' ']||KEY['Space']||KEY['w']||KEY['arrowup']) && !p._jumpHeld){
    if(p.jumps>0){
      p.vy = p.jumps===p.maxJumps?-11:-10;
      p.jumps--;
      if(p.jumps===p.maxJumps-1)SFX.jump();else SFX.djump();
      emit(p.x+p.w/2,p.y+p.h,8,()=>({x:p.x+p.w/2,y:p.y+p.h,vx:rand(-2,2),vy:rand(-1,1),life:0.6,decay:0.05,size:rand(2,4),color:'#ffe6a3',glow:true,grav:0.05}));
    }
    p._jumpHeld=true;
  }
  if(!(KEY[' ']||KEY['Space']||KEY['w']||KEY['arrowup']))p._jumpHeld=false;

  // attack
  if((KEY['j']) && p.attackCD<=0){
    p.attacking=18;p.attackCD=22;p.attackHits=[];
    SFX.slash();
  }
  // dash
  if((KEY['k']) && p.dashCD<=0 && p.dashing<=0 && game.unlocks.dash){
    p.dashing=14;p.dashCD=50;
    SFX.dash();
  }
  // burst
  if((KEY['l']) && p.burstCD<=0 && p.energy>=1 && game.unlocks.burst){
    p.energy--;p.burstCD=40;
    spirit_burst();
    SFX.burst();
  }

  // gravity
  if(p.dashing<=0)p.vy+=0.55;
  if(p.vy>16)p.vy=16;

  // apply
  p.x+=p.vx;p.y+=p.vy;
  collideTerrain(p);

  if(p.onGround){p.jumps=p.maxJumps;}

  // walk anim
  if(Math.abs(p.vx)>0.5 && p.onGround)p.walkT+=Math.abs(p.vx)*0.05;
  // trail
  p.trail.push({x:p.x+p.w/2,y:p.y+p.h/2,life:1});
  if(p.trail.length>10)p.trail.shift();
  for(const t of p.trail)t.life-=0.1;

  // timers
  if(p.attacking>0)p.attacking--;
  if(p.attackCD>0)p.attackCD--;
  if(p.dashCD>0)p.dashCD--;
  if(p.burstCD>0)p.burstCD--;
  if(p.invuln>0)p.invuln--;
  if(p.hurt>0)p.hurt--;
  p.energyRegen++;
  if(p.energyRegen>180 && p.energy<p.maxEnergy){p.energy++;p.energyRegen=0;}

  // attack hitbox
  if(p.attacking>10){
    const hb={x:p.x+(p.facing>0?p.w-6:-30),y:p.y+4,w:42,h:p.h-8};
    for(const e of enemies){
      if(e.dead||p.attackHits.includes(e))continue;
      if(rectVsRect(hb,e)){
        damageEnemy(e,1);
        p.attackHits.push(e);
        p.vx -= p.facing*2;
      }
    }
  }

  // hazards
  for(const h of hazards){
    if(rectVsRect(p,h)){hurtPlayer(2);p.vy=-9;}
  }
  // enemies
  for(const e of enemies){
    if(e.dead||p.invuln>0)continue;
    if(rectVsRect(p,e)){
      hurtPlayer(e.type==='boss'?2:1);
      p.vx = (p.x<e.x?-1:1)*8;p.vy=-7;
    }
  }
  // projectiles
  for(let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i];
    if(pr.foe && p.invuln<=0 && rectVsRect(pr,p)){
      hurtPlayer(1);projectiles.splice(i,1);
      continue;
    }
    if(!pr.foe){
      for(const e of enemies){
        if(e.dead)continue;
        if(rectVsRect(pr,e)){damageEnemy(e,1);projectiles.splice(i,1);break;}
      }
    }
  }
  // pickups
  for(const pk of pickups){
    if(pk.collected)continue;
    if(Math.hypot(pk.x-(p.x+p.w/2),pk.y-(p.y+p.h/2))<26){
      pk.collected=true;
      if(pk.type==='ember'){game.score+=50;p.energy=Math.min(p.maxEnergy,p.energy+1);emit(pk.x,pk.y,18,()=>({x:pk.x,y:pk.y,vx:rand(-3,3),vy:rand(-3,1),life:1,decay:0.03,size:rand(2,4),color:'#ffd089',glow:true,grav:0.05}));SFX.pickup();}
      if(pk.type==='heart'){p.hp=Math.min(p.maxHp,p.hp+2);emit(pk.x,pk.y,20,()=>({x:pk.x,y:pk.y,vx:rand(-3,3),vy:rand(-3,1),life:1,decay:0.03,size:rand(2,5),color:'#ff80a0',glow:true,grav:0.05}));SFX.pickup();}
      if(pk.type==='secret'){game.score+=500;p.maxHp+=1;p.hp=p.maxHp;emit(pk.x,pk.y,40,()=>({x:pk.x,y:pk.y,vx:rand(-4,4),vy:rand(-5,1),life:1.2,decay:0.02,size:rand(2,5),color:'#ffffff',glow:true,grav:0.02}));SFX.shard();}
      game.hud.flash=15;
    }
  }
  // shard
  if(shardObj && !shardObj.collected){
    if(Math.hypot(shardObj.x-(p.x+p.w/2),shardObj.y-(p.y+p.h/2))<36){
      // For boss stage, only after boss dead
      if(shardObj.boss){
        const boss=enemies.find(e=>e.type==='boss');
        if(!boss||!boss.dead)return;
      }
      shardObj.collected=true;
      game.shards++;
      game.score+=1000;
      SFX.shard();
      shake(8);
      emit(shardObj.x,shardObj.y,80,()=>({x:shardObj.x,y:shardObj.y,vx:rand(-6,6),vy:rand(-7,2),life:1.5,decay:0.015,size:rand(2,6),color:'#ffe6a3',glow:true,grav:0.02}));
      p.victory=1;
      setTimeout(()=>{
        if(game.stage>=STAGES.length-1){
          game.state=STATE.WIN;SFX.win();
          if(game.score>game.bestScore){game.bestScore=game.score;localStorage.setItem('lumenfall_best',game.score);}
        } else {
          // unlock progression
          if(game.stage===0){game.unlocks.dash=true;}
          if(game.stage===1){game.unlocks.burst=true;}
          if(game.stage===2){player.maxHp+=1;}
          if(game.stage===3){player.maxEnergy+=1;}
          loadStage(game.stage+1);
          game.state=STATE.STAGE_INTRO;
        }
      },1400);
    }
  }
  // fall death
  if(p.y>H+200)hurtPlayer(99);
}

function hurtPlayer(n){
  if(player.invuln>0)return;
  player.hp-=n;
  player.invuln=70;
  player.hurt=20;
  shake(10);
  SFX.hurt();
  game.hud.flash=18;
  if(player.hp<=0){
    player.hp=0;
    game.state=STATE.DEAD;
    SFX.lose();
  }
}

function damageEnemy(e,n){
  e.hp-=n;e.hurt=10;
  shake(3);
  SFX.hit();
  emit(e.x+e.w/2,e.y+e.h/2,12,()=>({x:e.x+e.w/2,y:e.y+e.h/2,vx:rand(-3,3),vy:rand(-3,1),life:0.8,decay:0.04,size:rand(2,4),color:'#ffd089',glow:true,grav:0.1}));
  if(e.hp<=0){
    e.dead=true;
    game.score+= e.type==='boss'?5000:100;
    emit(e.x+e.w/2,e.y+e.h/2,28,()=>({x:e.x+e.w/2,y:e.y+e.h/2,vx:rand(-5,5),vy:rand(-5,2),life:1,decay:0.025,size:rand(2,5),color:'#ffe6a3',glow:true,grav:0.05}));
    if(e.type==='boss'){
      shake(20);
      // shower of embers
      for(let i=0;i<200;i++)particles.push({x:e.x+e.w/2,y:e.y+e.h/2,vx:rand(-8,8),vy:rand(-10,2),life:rand(1,2),decay:0.012,size:rand(2,6),color:i%2?'#ffd089':'#ff80a0',glow:true,grav:0.04});
    }
  }
}

function spirit_burst(){
  const cx=player.x+player.w/2,cy=player.y+player.h/2;
  emit(cx,cy,60,()=>({x:cx,y:cy,vx:rand(-8,8),vy:rand(-8,8),life:1.2,decay:0.02,size:rand(2,6),color:'#ffe6a3',glow:true,grav:0}));
  shake(8);
  for(const e of enemies){
    if(e.dead)continue;
    if(Math.hypot(e.x+e.w/2-cx,e.y+e.h/2-cy)<160){
      damageEnemy(e,3);
      e.vx=(e.x<cx?-1:1)*6;e.vy=-6;
    }
  }
  for(let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i];
    if(pr.foe && Math.hypot(pr.x-cx,pr.y-cy)<160)projectiles.splice(i,1);
  }
}

/* ---------- Enemies Update ---------- */
function updateEnemies(){
  for(const e of enemies){
    if(e.dead)continue;
    e.t++;
    if(e.hurt>0)e.hurt--;
    if(e.type==='walker'){
      e.vx=e.dir*1.2;
      e.vy+=0.5;
      e.x+=e.vx;e.y+=e.vy;
      collideTerrain(e);
      // turn around if at edge
      const ahead=Math.floor((e.x+(e.dir>0?e.w+4:-4))/TS);
      if(ahead<0||ahead>=map.length||H-map[ahead].h*TS>e.y+e.h+8){e.dir*=-1;}
      if(e.vx===0 && e.t>4)e.dir*=-1;
    }
    if(e.type==='flyer'){
      e.x = e.bx + Math.sin(e.t*0.03)*120;
      e.y = e.by + Math.cos(e.t*0.04)*30;
    }
    if(e.type==='shooter'){
      e.vy+=0.3;
      e.x+=e.vx;e.y+=e.vy;
      collideTerrain(e);
      e.cd--;
      if(e.cd<=0){
        e.cd=110-game.stage*8;
        const dx=player.x-e.x, dy=player.y-e.y;
        const d=Math.hypot(dx,dy)||1;
        projectiles.push({x:e.x+e.w/2,y:e.y+e.h/2,w:14,h:14,vx:dx/d*4,vy:dy/d*4,life:120,foe:true,color:e.col});
      }
    }
    if(e.type==='charger'){
      e.vy+=0.5;
      const dist = Math.abs(player.x-e.x);
      if(dist<300 && Math.abs(player.y-e.y)<80)e.charge=40;
      if(e.charge>0){e.charge--;e.dir=player.x<e.x?-1:1;e.vx=e.dir*5;}
      else e.vx=e.dir*1.5;
      e.x+=e.vx;e.y+=e.vy;
      collideTerrain(e);
      const ahead=Math.floor((e.x+(e.dir>0?e.w+4:-4))/TS);
      if(ahead<0||ahead>=map.length||H-map[ahead].h*TS>e.y+e.h+8){e.dir*=-1;}
    }
    if(e.type==='boss'){
      updateBoss(e);
    }
  }
  enemies = enemies.filter(e=>!(e.dead && e.type==='boss' && Math.random()<0)); // keep
}

function updateBoss(b){
  b.t++;
  // float around
  const px=player.x+player.w/2, py=player.y+player.h/2;
  const tx = px + Math.sin(b.t*0.02)*200;
  const ty = H-450 + Math.sin(b.t*0.013)*60;
  b.x = lerp(b.x,tx-b.w/2,0.02);
  b.y = lerp(b.y,ty-b.h/2,0.02);
  b.cd--;
  // phases by hp
  const ratio = b.hp/b.maxHp;
  if(b.cd<=0){
    if(ratio>0.66){
      // ring of bullets
      for(let i=0;i<10;i++){
        const a=i/10*TAU + b.t*0.01;
        projectiles.push({x:b.x+b.w/2,y:b.y+b.h/2,w:14,h:14,vx:Math.cos(a)*3,vy:Math.sin(a)*3,life:160,foe:true,color:'#ff80a0'});
      }
      b.cd=120;
    } else if(ratio>0.33){
      // aimed triple shot
      const dx=px-b.x, dy=py-b.y; const d=Math.hypot(dx,dy)||1;
      for(let i=-1;i<=1;i++){
        const a=Math.atan2(dy,dx)+i*0.2;
        projectiles.push({x:b.x+b.w/2,y:b.y+b.h/2,w:16,h:16,vx:Math.cos(a)*5,vy:Math.sin(a)*5,life:160,foe:true,color:'#ff60a0'});
      }
      b.cd=70;
    } else {
      // ring + aimed
      for(let i=0;i<14;i++){
        const a=i/14*TAU + b.t*0.02;
        projectiles.push({x:b.x+b.w/2,y:b.y+b.h/2,w:14,h:14,vx:Math.cos(a)*3.5,vy:Math.sin(a)*3.5,life:160,foe:true,color:'#ff40a0'});
      }
      const dx=px-b.x, dy=py-b.y; const d=Math.hypot(dx,dy)||1;
      projectiles.push({x:b.x+b.w/2,y:b.y+b.h/2,w:20,h:20,vx:dx/d*6,vy:dy/d*6,life:200,foe:true,color:'#ffffff'});
      b.cd=80;
      SFX.boss();
    }
  }
  // continuous trailing embers
  if(b.t%4===0)particles.push({x:b.x+b.w/2,y:b.y+b.h,vx:rand(-1,1),vy:rand(0,2),life:1,decay:0.03,size:rand(2,4),color:'#ff60a0',glow:true,grav:0});
}

/* ---------- Projectiles ---------- */
function updateProjectiles(){
  for(let i=projectiles.length-1;i>=0;i--){
    const p=projectiles[i];
    p.x+=p.vx;p.y+=p.vy;p.life--;
    if(p.life<=0)projectiles.splice(i,1);
  }
}

/* ---------- Drawing ---------- */
function clearBG(){
  const s=STAGES[game.stage];
  const grd=X.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,s.palette.sky1);
  grd.addColorStop(1,s.palette.sky2);
  X.fillStyle=grd;X.fillRect(0,0,W,H);
  // sun/moon
  X.save();
  X.globalCompositeOperation='lighter';
  const cx=W*0.7, cy=H*0.3;
  const grad=X.createRadialGradient(cx,cy,5,cx,cy,180);
  grad.addColorStop(0,s.palette.sun);
  grad.addColorStop(1,'transparent');
  X.fillStyle=grad;X.fillRect(0,0,W,H);
  X.restore();
}

function drawParallaxMountains(){
  const s=STAGES[game.stage];
  // far layer
  for(let layer=0;layer<3;layer++){
    const off = cam.x*(0.1+layer*0.15);
    X.fillStyle = layer===0?s.palette.mist:layer===1?s.palette.leaf:s.palette.ground;
    X.globalAlpha = 0.4 + layer*0.2;
    X.beginPath();
    X.moveTo(0,H);
    for(let i=0;i<=20;i++){
      const x=i*W/20;
      const seed = (i+layer*7);
      const h = 120 + Math.sin(seed*1.7)*60 + layer*40 - off*0.001;
      X.lineTo(x, H - h - layer*30 + Math.sin((x+off)*0.005+layer)*20);
    }
    X.lineTo(W,H);X.closePath();X.fill();
  }
  X.globalAlpha=1;
}

function drawWeather(){
  const s=STAGES[game.stage];
  const t=performance.now()*0.001;
  X.save();
  X.globalCompositeOperation='lighter';
  if(s.weather==='leaves'){
    for(let i=0;i<30;i++){
      const x=((i*73 + t*40)%W);
      const y=((i*97 + t*60+Math.sin(t+i)*30)%H);
      X.fillStyle='#7be096';X.globalAlpha=0.5;
      X.beginPath();X.ellipse(x,y,3,2,t+i,0,TAU);X.fill();
    }
  } else if(s.weather==='bubbles'){
    for(let i=0;i<25;i++){
      const x=((i*97 + Math.sin(t+i)*30)%W);
      const y=H - ((t*40 + i*60)%H);
      X.fillStyle='#9cd3ff';X.globalAlpha=0.4;
      X.beginPath();X.arc(x,y,2+Math.sin(t+i)*1.5,0,TAU);X.fill();
    }
  } else if(s.weather==='embers'){
    for(let i=0;i<60;i++){
      const x=((i*53 + t*30+Math.sin(t+i)*20)%W);
      const y=H - ((t*80 + i*40)%H);
      X.fillStyle=i%2?'#ffae66':'#ffd089';X.globalAlpha=0.6;
      X.beginPath();X.arc(x,y,1.5,0,TAU);X.fill();
    }
  } else if(s.weather==='stars'){
    for(let i=0;i<80;i++){
      const x=(i*131%W);
      const y=(i*71%H);
      X.fillStyle='#ffffff';X.globalAlpha=0.4+Math.sin(t*2+i)*0.4;
      X.beginPath();X.arc(x,y,1+(i%3===0?1:0),0,TAU);X.fill();
    }
  } else if(s.weather==='voidsparks'){
    for(let i=0;i<40;i++){
      const x=((i*53 + t*60)%W);
      const y=((i*97 + t*40+Math.sin(t+i)*40)%H);
      X.fillStyle=i%2?'#ff60a0':'#c060a0';X.globalAlpha=0.6;
      X.beginPath();X.arc(x,y,2,0,TAU);X.fill();
    }
  }
  X.restore();
}

function drawTerrain(){
  const s=STAGES[game.stage];
  X.save();
  X.translate(-cam.x-cam.sx,-cam.y-cam.sy);
  // ground tiles
  for(let i=0;i<map.length;i++){
    const m=map[i];
    if(m.h>=20)continue;
    const x=i*TS, y=H-m.h*TS;
    // top strip
    X.fillStyle=s.palette.accent;
    X.fillRect(x,y,TS,4);
    // body gradient
    const g=X.createLinearGradient(0,y,0,H);
    g.addColorStop(0,s.palette.ground);
    g.addColorStop(1,s.palette.ground2);
    X.fillStyle=g;
    X.fillRect(x,y+4,TS,H-y-4);
    // inset texture
    X.fillStyle=s.palette.ground2;
    if(i%3===0){X.fillRect(x+6,y+12,4,4);X.fillRect(x+22,y+22,3,3);}
  }
  // hazards (lava)
  for(const h of hazards){
    if(h.type==='lava'){
      const t=performance.now()*0.005;
      const g=X.createLinearGradient(0,h.y,0,h.y+h.h);
      g.addColorStop(0,'#ffe066');
      g.addColorStop(0.4,'#ff7a30');
      g.addColorStop(1,'#7a1a08');
      X.fillStyle=g;X.fillRect(h.x,h.y+Math.sin(t+h.x*0.01)*2,h.w,h.h);
      // bubbles
      X.fillStyle='#ffd089';
      for(let i=0;i<3;i++){
        const bx=h.x+((i*13+t*30)%h.w);
        const by=h.y+Math.sin(t*2+i)*4+4;
        X.beginPath();X.arc(bx,by,2,0,TAU);X.fill();
      }
    }
  }
  // platforms
  for(const p of platforms){
    X.fillStyle=s.palette.accent;
    X.fillRect(p.x,p.y,p.w,3);
    const g=X.createLinearGradient(0,p.y,0,p.y+p.h);
    g.addColorStop(0,s.palette.ground);
    g.addColorStop(1,s.palette.ground2);
    X.fillStyle=g;
    X.fillRect(p.x,p.y+3,p.w,p.h-3);
    // glowing runes
    X.save();
    X.globalCompositeOperation='lighter';
    X.fillStyle=s.palette.accent;
    for(let k=0;k<p.w/20;k++){
      const a=0.3+Math.sin(performance.now()*0.003+k+p.x)*0.2;
      X.globalAlpha=a;
      X.beginPath();X.arc(p.x+10+k*20,p.y+8,2,0,TAU);X.fill();
    }
    X.restore();
  }
  X.restore();
}

function drawPickups(){
  X.save();
  X.translate(-cam.x-cam.sx,-cam.y-cam.sy);
  const t=performance.now()*0.005;
  for(const p of pickups){
    if(p.collected)continue;
    p.t++;
    const yo = Math.sin(t+p.x*0.01)*4;
    X.save();
    X.globalCompositeOperation='lighter';
    if(p.type==='ember'){
      const g=X.createRadialGradient(p.x,p.y+yo,2,p.x,p.y+yo,16);
      g.addColorStop(0,'#fff4c0');g.addColorStop(0.5,'#ffae66');g.addColorStop(1,'transparent');
      X.fillStyle=g;X.fillRect(p.x-20,p.y+yo-20,40,40);
      X.fillStyle='#fff';X.beginPath();X.arc(p.x,p.y+yo,3,0,TAU);X.fill();
    } else if(p.type==='heart'){
      const g=X.createRadialGradient(p.x,p.y+yo,2,p.x,p.y+yo,18);
      g.addColorStop(0,'#ffd0e0');g.addColorStop(0.5,'#ff5080');g.addColorStop(1,'transparent');
      X.fillStyle=g;X.fillRect(p.x-22,p.y+yo-22,44,44);
      X.fillStyle='#ff80a0';
      drawHeart(p.x,p.y+yo,8);
    } else if(p.type==='secret'){
      const g=X.createRadialGradient(p.x,p.y+yo,2,p.x,p.y+yo,30);
      g.addColorStop(0,'#ffffff');g.addColorStop(0.5,'#a0e0ff');g.addColorStop(1,'transparent');
      X.fillStyle=g;X.fillRect(p.x-30,p.y+yo-30,60,60);
      X.fillStyle='#fff';
      X.save();X.translate(p.x,p.y+yo);X.rotate(t);
      X.fillRect(-3,-12,6,24);X.fillRect(-12,-3,24,6);X.restore();
    }
    X.restore();
  }
  // shard
  if(shardObj && !shardObj.collected){
    if(!shardObj.boss || (enemies.find(e=>e.type==='boss')||{dead:true}).dead){
      shardObj.t++;
      const yo=Math.sin(t)*6;
      X.save();
      X.globalCompositeOperation='lighter';
      const g=X.createRadialGradient(shardObj.x,shardObj.y+yo,2,shardObj.x,shardObj.y+yo,50);
      g.addColorStop(0,'#fff8d0');g.addColorStop(0.4,'#ffae66');g.addColorStop(1,'transparent');
      X.fillStyle=g;X.fillRect(shardObj.x-50,shardObj.y+yo-50,100,100);
      X.translate(shardObj.x,shardObj.y+yo);X.rotate(t*0.5);
      X.fillStyle='#fff4c0';
      X.beginPath();X.moveTo(0,-18);X.lineTo(10,0);X.lineTo(0,22);X.lineTo(-10,0);X.closePath();X.fill();
      X.fillStyle='#ffae66';
      X.beginPath();X.moveTo(0,-12);X.lineTo(6,0);X.lineTo(0,16);X.lineTo(-6,0);X.closePath();X.fill();
      X.restore();
    }
  }
  X.restore();
}
function drawHeart(x,y,s){
  X.beginPath();
  X.moveTo(x,y+s*0.3);
  X.bezierCurveTo(x,y-s*0.4,x-s,y-s*0.4,x-s,y);
  X.bezierCurveTo(x-s,y+s*0.5,x,y+s*0.8,x,y+s);
  X.bezierCurveTo(x,y+s*0.8,x+s,y+s*0.5,x+s,y);
  X.bezierCurveTo(x+s,y-s*0.4,x,y-s*0.4,x,y+s*0.3);
  X.fill();
}

function drawEnemies(){
  X.save();X.translate(-cam.x-cam.sx,-cam.y-cam.sy);
  for(const e of enemies){
    if(e.dead)continue;
    const flash = e.hurt>5;
    if(e.type==='walker')drawWalker(e,flash);
    else if(e.type==='flyer')drawFlyer(e,flash);
    else if(e.type==='shooter')drawShooter(e,flash);
    else if(e.type==='charger')drawCharger(e,flash);
    else if(e.type==='boss')drawBoss(e,flash);
  }
  X.restore();
}
function drawWalker(e,flash){
  const t=e.t*0.1;
  X.save();X.translate(e.x+e.w/2,e.y+e.h/2);
  // shadow
  X.fillStyle='rgba(0,0,0,0.3)';X.beginPath();X.ellipse(0,e.h/2+2,16,5,0,0,TAU);X.fill();
  X.fillStyle=flash?'#fff':e.col;
  // body
  const sq=Math.sin(t)*2;
  X.beginPath();X.ellipse(0,0,e.w/2,e.h/2-sq,0,0,TAU);X.fill();
  // legs
  X.fillStyle='#1a1a1a';
  X.fillRect(-10,e.h/2-6,5,8+Math.sin(t)*3);
  X.fillRect(5,e.h/2-6,5,8+Math.cos(t)*3);
  // eyes
  X.fillStyle='#fff';X.beginPath();X.arc(-6,-4,4,0,TAU);X.arc(6,-4,4,0,TAU);X.fill();
  X.fillStyle='#000';X.beginPath();X.arc(-6+(e.dir||1),-4,2,0,TAU);X.arc(6+(e.dir||1),-4,2,0,TAU);X.fill();
  // mouth
  X.strokeStyle='#000';X.lineWidth=1.5;X.beginPath();X.arc(0,4,4,0.2,Math.PI-0.2);X.stroke();
  X.restore();
}
function drawFlyer(e,flash){
  const t=e.t*0.2;
  X.save();X.translate(e.x+e.w/2,e.y+e.h/2);
  // wings
  X.fillStyle=flash?'#fff':e.col;
  X.globalAlpha=0.7;
  const wf=Math.sin(t)*0.6+0.6;
  X.beginPath();X.ellipse(-e.w/2-4,0,12,8*wf,0.4,0,TAU);X.fill();
  X.beginPath();X.ellipse(e.w/2+4,0,12,8*wf,-0.4,0,TAU);X.fill();
  X.globalAlpha=1;
  // body
  X.fillStyle=flash?'#fff':e.col;
  X.beginPath();X.ellipse(0,0,e.w/2,e.h/2,0,0,TAU);X.fill();
  // eye
  X.fillStyle='#fff';X.beginPath();X.arc(0,-2,5,0,TAU);X.fill();
  X.fillStyle='#000';X.beginPath();X.arc(player.x>e.x?2:-2,-2,2,0,TAU);X.fill();
  X.restore();
}
function drawShooter(e,flash){
  const t=e.t*0.05;
  X.save();X.translate(e.x+e.w/2,e.y+e.h/2);
  X.fillStyle='rgba(0,0,0,0.3)';X.beginPath();X.ellipse(0,e.h/2+2,18,5,0,0,TAU);X.fill();
  // tower body
  X.fillStyle=flash?'#fff':e.col;
  X.beginPath();
  X.moveTo(-e.w/2,e.h/2);
  X.lineTo(-e.w/2+4,-e.h/2);
  X.lineTo(0,-e.h/2-6);
  X.lineTo(e.w/2-4,-e.h/2);
  X.lineTo(e.w/2,e.h/2);
  X.closePath();X.fill();
  // eye
  const ang=Math.atan2(player.y-e.y,player.x-e.x);
  X.fillStyle='#000';X.beginPath();X.arc(0,-4,8,0,TAU);X.fill();
  X.fillStyle='#ff80a0';X.beginPath();X.arc(Math.cos(ang)*3,-4+Math.sin(ang)*3,4,0,TAU);X.fill();
  // glow
  X.save();X.globalCompositeOperation='lighter';
  X.fillStyle='#ff80a0';X.globalAlpha=0.3+Math.sin(t*4)*0.2;
  X.beginPath();X.arc(0,-4,12,0,TAU);X.fill();
  X.restore();
  X.restore();
}
function drawCharger(e,flash){
  const t=e.t*0.15;
  X.save();X.translate(e.x+e.w/2,e.y+e.h/2);
  X.fillStyle='rgba(0,0,0,0.3)';X.beginPath();X.ellipse(0,e.h/2+2,22,5,0,0,TAU);X.fill();
  X.fillStyle=flash?'#fff':e.col;
  X.beginPath();
  X.moveTo(-e.w/2,e.h/2);
  X.lineTo(-e.w/2+8,-e.h/2);
  X.lineTo(e.w/2-8,-e.h/2);
  X.lineTo(e.w/2,e.h/2);
  X.closePath();X.fill();
  // horns
  X.fillStyle='#fff';
  X.beginPath();X.moveTo(-e.w/2+4,-e.h/2);X.lineTo(-e.w/2-2,-e.h/2-10);X.lineTo(-e.w/2+10,-e.h/2-2);X.fill();
  X.beginPath();X.moveTo(e.w/2-4,-e.h/2);X.lineTo(e.w/2+2,-e.h/2-10);X.lineTo(e.w/2-10,-e.h/2-2);X.fill();
  // eyes
  X.fillStyle='#ff2020';
  X.beginPath();X.arc(-7,-5,3,0,TAU);X.arc(7,-5,3,0,TAU);X.fill();
  // legs
  X.fillStyle='#1a1a1a';
  X.fillRect(-12,e.h/2-4,5,8+Math.sin(t)*3);
  X.fillRect(7,e.h/2-4,5,8+Math.cos(t)*3);
  if(e.charge>0){
    X.save();X.globalCompositeOperation='lighter';
    X.fillStyle='#ff4040';X.globalAlpha=0.6;
    X.beginPath();X.arc(0,0,e.w*0.7,0,TAU);X.fill();
    X.restore();
  }
  X.restore();
}
function drawBoss(b,flash){
  const t=b.t*0.05;
  X.save();X.translate(b.x+b.w/2,b.y+b.h/2);
  // outer aura
  X.save();X.globalCompositeOperation='lighter';
  const g=X.createRadialGradient(0,0,10,0,0,140);
  g.addColorStop(0,'#ff60a0');g.addColorStop(0.4,'#ff2080');g.addColorStop(1,'transparent');
  X.fillStyle=g;X.beginPath();X.arc(0,0,140,0,TAU);X.fill();
  X.restore();
  // crown
  X.fillStyle=flash?'#fff':'#1a0a20';
  X.beginPath();
  X.moveTo(-40,-50);
  X.lineTo(-30,-80);
  X.lineTo(-15,-55);
  X.lineTo(0,-90);
  X.lineTo(15,-55);
  X.lineTo(30,-80);
  X.lineTo(40,-50);
  X.closePath();X.fill();
  // body (cloak)
  X.fillStyle=flash?'#fff':'#2a0a3a';
  X.beginPath();
  X.moveTo(-45,-50);
  X.bezierCurveTo(-60,0,-50,40,-30,55);
  X.lineTo(30,55);
  X.bezierCurveTo(50,40,60,0,45,-50);
  X.closePath();X.fill();
  // crown gems
  X.fillStyle='#ff80a0';
  X.beginPath();X.arc(-30,-72,4,0,TAU);X.arc(0,-82,5,0,TAU);X.arc(30,-72,4,0,TAU);X.fill();
  // face mask
  X.fillStyle='#0a0510';
  X.beginPath();X.ellipse(0,-30,28,18,0,0,TAU);X.fill();
  // glowing eyes
  X.save();X.globalCompositeOperation='lighter';
  X.fillStyle='#ff60a0';
  const ef=1+Math.sin(t*3)*0.3;
  X.beginPath();X.ellipse(-10,-30,5*ef,3*ef,0,0,TAU);X.fill();
  X.beginPath();X.ellipse(10,-30,5*ef,3*ef,0,0,TAU);X.fill();
  X.restore();
  // wisps
  X.save();X.globalCompositeOperation='lighter';
  for(let i=0;i<6;i++){
    const a=t+i;
    X.fillStyle='#ff60a0';X.globalAlpha=0.4;
    X.beginPath();X.arc(Math.cos(a)*70,Math.sin(a)*40-20,6,0,TAU);X.fill();
  }
  X.restore();
  X.restore();
}

function drawProjectiles(){
  X.save();X.translate(-cam.x-cam.sx,-cam.y-cam.sy);
  X.globalCompositeOperation='lighter';
  for(const p of projectiles){
    const c=p.color||'#ffd089';
    const g=X.createRadialGradient(p.x,p.y,2,p.x,p.y,16);
    g.addColorStop(0,c);g.addColorStop(1,'transparent');
    X.fillStyle=g;X.fillRect(p.x-16,p.y-16,32,32);
    X.fillStyle='#fff';X.beginPath();X.arc(p.x,p.y,3,0,TAU);X.fill();
  }
  X.restore();
}

function drawPlayer(){
  const p=player;
  X.save();X.translate(-cam.x-cam.sx,-cam.y-cam.sy);
  // trail
  X.save();X.globalCompositeOperation='lighter';
  for(const t of p.trail){
    if(t.life<=0)continue;
    X.globalAlpha=t.life*0.4;
    X.fillStyle='#ffd089';
    X.beginPath();X.arc(t.x,t.y,12*t.life,0,TAU);X.fill();
  }
  X.restore();
  // shadow
  X.fillStyle='rgba(0,0,0,0.4)';
  const gy=groundY(p.x+p.w/2);
  X.beginPath();X.ellipse(p.x+p.w/2,gy-1,16,4,0,0,TAU);X.fill();
  // body
  X.save();
  X.translate(p.x+p.w/2, p.y+p.h/2);
  if(p.facing<0)X.scale(-1,1);
  const blink=p.invuln>0 && Math.floor(p.invuln/4)%2===0;
  const tilt = clamp(p.vx*0.03,-0.2,0.2);
  X.rotate(tilt);
  if(p.victory>0){
    // victory pose
    const vt=p.victory*0.1;
    drawKael(0,0,vt,'victory',blink);
  } else if(p.dashing>0){
    drawKael(0,0,p.walkT,'dash',blink);
  } else if(p.attacking>0){
    drawKael(0,0,p.walkT,'attack',blink,p.attacking);
  } else if(!p.onGround){
    drawKael(0,0,p.walkT,'jump',blink);
  } else if(Math.abs(p.vx)>0.5){
    drawKael(0,0,p.walkT,'walk',blink);
  } else {
    drawKael(0,0,performance.now()*0.003,'idle',blink);
  }
  X.restore();
  // hurt flash
  if(p.hurt>0){
    X.save();X.globalCompositeOperation='lighter';
    X.fillStyle='#ff4040';X.globalAlpha=p.hurt/20;
    X.fillRect(p.x-4,p.y-4,p.w+8,p.h+8);
    X.restore();
  }
  X.restore();
}

function drawKael(cx,cy,t,state,blink,atk){
  // Kael — the Emberbearer. Hooded figure with glowing scarf.
  const bob = state==='walk'?Math.sin(t*2)*2 : state==='idle'?Math.sin(t)*1.5 : 0;
  const legA = state==='walk'?Math.sin(t*2)*8 : state==='jump'?6:0;
  const armA = state==='attack' ? lerp(-1.6, 1.6, 1-atk/18) : state==='walk' ? Math.sin(t*2+Math.PI)*0.5 : state==='dash'? -0.6 : Math.sin(t)*0.1;

  // ember aura
  X.save();X.globalCompositeOperation='lighter';
  const g=X.createRadialGradient(0,bob,2,0,bob,40);
  g.addColorStop(0,'rgba(255,200,120,0.6)');
  g.addColorStop(1,'transparent');
  X.fillStyle=g;X.fillRect(-40,-40,80,80);
  X.restore();

  // legs
  X.fillStyle='#3a2a44';
  X.fillRect(-8, 6+bob, 6, 14 - Math.abs(legA)*0.3);
  X.fillRect( 2, 6+bob, 6, 14 - Math.abs(legA)*0.3);
  // boots
  X.fillStyle='#1a0a20';
  X.fillRect(-9,18+bob,8,4);X.fillRect(1,18+bob,8,4);

  // body (cloak)
  X.fillStyle='#2a1a3a';
  X.beginPath();
  X.moveTo(-12,-8+bob);
  X.lineTo(-14,12+bob);
  X.lineTo(14,12+bob);
  X.lineTo(12,-8+bob);
  X.closePath();X.fill();

  // belt with ember
  X.fillStyle='#7a4ad0';X.fillRect(-12,4+bob,24,3);
  X.save();X.globalCompositeOperation='lighter';
  X.fillStyle='#ffd089';
  X.beginPath();X.arc(0,5+bob,4,0,TAU);X.fill();
  X.restore();

  // scarf (animated)
  X.fillStyle='#ff7a4a';
  X.beginPath();
  X.moveTo(-6,-4+bob);
  X.quadraticCurveTo(-22,4+bob+Math.sin(t*2)*3,-26,12+bob+Math.sin(t*2+1)*3);
  X.quadraticCurveTo(-18,2+bob,-6,0+bob);
  X.fill();

  // arms
  X.save();
  X.translate(8,-2+bob);X.rotate(armA);
  X.fillStyle='#3a2a44';
  X.fillRect(-3,0,6,14);
  // hand
  X.fillStyle='#e8c8a0';X.fillRect(-3,12,6,5);
  // sword when attacking
  if(state==='attack'){
    X.save();
    X.translate(0,14);
    X.rotate(-0.3);
    // blade glow
    X.save();X.globalCompositeOperation='lighter';
    X.fillStyle='#ffd089';X.globalAlpha=0.5;
    X.fillRect(-4,-30,8,30);
    X.restore();
    X.fillStyle='#fff';X.fillRect(-2,-28,4,28);
    X.fillStyle='#7a4ad0';X.fillRect(-5,0,10,3);
    X.restore();
    // slash arc
    X.save();X.globalCompositeOperation='lighter';
    X.strokeStyle='#fff4c0';X.lineWidth=3;X.globalAlpha=atk/18;
    X.beginPath();X.arc(0,8,28,-1.2,1.2);X.stroke();
    X.restore();
  }
  X.restore();
  // back arm
  X.save();
  X.translate(-8,-2+bob);X.rotate(-armA*0.5);
  X.fillStyle='#241430';
  X.fillRect(-3,0,6,12);
  X.restore();

  // head
  X.fillStyle='#e8c8a0';
  X.beginPath();X.ellipse(0,-14+bob,8,9,0,0,TAU);X.fill();
  // hood
  X.fillStyle='#2a1a3a';
  X.beginPath();
  X.moveTo(-10,-10+bob);
  X.quadraticCurveTo(-12,-26+bob,0,-26+bob);
  X.quadraticCurveTo(12,-26+bob,10,-10+bob);
  X.lineTo(8,-12+bob);
  X.quadraticCurveTo(0,-18+bob,-8,-12+bob);
  X.closePath();X.fill();
  // hood shadow on face
  X.fillStyle='rgba(0,0,0,0.4)';
  X.beginPath();X.ellipse(0,-16+bob,7,4,0,0,TAU);X.fill();
  // eye glow
  if(!blink){
    X.save();X.globalCompositeOperation='lighter';
    X.fillStyle='#ffd089';
    X.beginPath();X.arc(2,-15+bob,2,0,TAU);X.fill();
    X.beginPath();X.arc(2,-15+bob,4,0,TAU);X.globalAlpha=0.4;X.fill();
    X.restore();
  }
}

/* ---------- HUD ---------- */
function drawHUD(){
  // top-left: hp
  X.save();
  // hp hearts
  for(let i=0;i<player.maxHp;i++){
    const x=20+i*22, y=20;
    X.fillStyle=i<player.hp?'#ff5080':'#3a1a30';
    drawHeart(x,y,8);
    X.strokeStyle='#000';X.lineWidth=1;X.stroke();
  }
  // energy
  for(let i=0;i<player.maxEnergy;i++){
    const x=20+i*22, y=46;
    X.save();X.globalCompositeOperation='lighter';
    X.fillStyle=i<player.energy?'#ffd089':'#3a2a18';
    X.beginPath();X.arc(x,y,7,0,TAU);X.fill();
    X.restore();
    X.strokeStyle='#000';X.lineWidth=1;X.beginPath();X.arc(x,y,7,0,TAU);X.stroke();
  }
  // shards
  for(let i=0;i<5;i++){
    const x=W-30-i*26, y=24;
    X.save();X.translate(x,y);X.rotate(0.2);
    X.fillStyle=i<game.shards?'#ffd089':'#1a1a2a';
    X.beginPath();X.moveTo(0,-10);X.lineTo(7,0);X.lineTo(0,12);X.lineTo(-7,0);X.closePath();X.fill();
    X.strokeStyle='#000';X.stroke();
    if(i<game.shards){
      X.save();X.globalCompositeOperation='lighter';
      X.fillStyle='#ffae66';X.globalAlpha=0.5+Math.sin(performance.now()*0.005+i)*0.3;
      X.beginPath();X.moveTo(0,-10);X.lineTo(7,0);X.lineTo(0,12);X.lineTo(-7,0);X.closePath();X.fill();
      X.restore();
    }
    X.restore();
  }
  // score
  X.fillStyle='#fff';X.font='bold 16px Trebuchet MS';X.textAlign='center';
  X.fillText('SCORE  '+game.score, W/2, 28);
  // stage name
  X.font='12px Trebuchet MS';X.fillStyle='#a0b0d0';
  X.fillText(STAGES[game.stage].name.toUpperCase(), W/2, 46);
  // boss bar
  const boss=enemies.find(e=>e.type==='boss'&&!e.dead);
  if(boss){
    const bw=400, bx=(W-bw)/2, by=H-40;
    X.fillStyle='rgba(0,0,0,0.6)';X.fillRect(bx-2,by-2,bw+4,18);
    X.fillStyle='#1a0510';X.fillRect(bx,by,bw,14);
    const r=boss.hp/boss.maxHp;
    const g=X.createLinearGradient(bx,0,bx+bw,0);
    g.addColorStop(0,'#ff60a0');g.addColorStop(1,'#ff2050');
    X.fillStyle=g;X.fillRect(bx,by,bw*r,14);
    X.fillStyle='#fff';X.font='bold 12px Trebuchet MS';X.textAlign='center';
    X.fillText('THE HOLLOW KING',W/2,by+11);
  }
  // damage flash
  if(game.hud.flash>0){
    X.fillStyle='rgba(255,255,255,'+(game.hud.flash/40)+')';
    X.fillRect(0,0,W,H);
    game.hud.flash--;
  }
  // intro text
  if(game.introT>0){
    const a = game.introT>60? (120-game.introT)/60 : game.introT/60;
    X.save();
    X.globalAlpha=clamp(a,0,1);
    X.fillStyle='rgba(0,0,0,0.5)';X.fillRect(0,H/2-60,W,120);
    X.fillStyle='#fff';X.font='bold 38px Trebuchet MS';X.textAlign='center';
    X.fillText(STAGES[game.stage].name, W/2, H/2-5);
    X.font='italic 16px Trebuchet MS';X.fillStyle='#ffd089';
    X.fillText(STAGES[game.stage].sub, W/2, H/2+25);
    X.restore();
    game.introT--;
  }
  // controls reminder bottom
  X.font='11px Trebuchet MS';X.fillStyle='rgba(255,255,255,0.4)';X.textAlign='left';
  let ctl='AD MOVE  SPACE JUMP(x2)  J ATTACK';
  if(game.unlocks.dash)ctl+='  K DASH';
  if(game.unlocks.burst)ctl+='  L BURST';
  X.fillText(ctl, 20, H-10);
  X.restore();
}

/* ---------- Screens ---------- */
function drawMenu(){
  // bg
  const t=performance.now()*0.001;
  const grd=X.createLinearGradient(0,0,0,H);
  grd.addColorStop(0,'#1a0a30');grd.addColorStop(1,'#3a1050');
  X.fillStyle=grd;X.fillRect(0,0,W,H);
  // floating embers
  X.save();X.globalCompositeOperation='lighter';
  for(let i=0;i<60;i++){
    const x=(i*53+t*40)%W;
    const y=H-((t*60+i*40)%H);
    X.fillStyle='#ffae66';X.globalAlpha=0.5;
    X.beginPath();X.arc(x,y,2,0,TAU);X.fill();
  }
  // central ember orb
  const cx=W/2, cy=H/2-30;
  const g=X.createRadialGradient(cx,cy,5,cx,cy,180);
  g.addColorStop(0,'#fff4c0');g.addColorStop(0.3,'#ffae66');g.addColorStop(1,'transparent');
  X.fillStyle=g;X.fillRect(0,0,W,H);
  X.restore();
  // title
  X.textAlign='center';
  X.fillStyle='#fff';X.font='bold 64px Trebuchet MS';
  X.fillText('LUMENFALL', W/2, H/2-20);
  X.font='italic 22px Trebuchet MS';X.fillStyle='#ffd089';
  X.fillText('— The Last Ember —', W/2, H/2+15);
  X.fillStyle='#a0b0d0';X.font='14px Trebuchet MS';
  X.fillText('The world is dying. Five shards of light remain.', W/2, H/2+55);
  X.fillText('You are Kael, the last Emberbearer. Reignite the realms.', W/2, H/2+75);
  // press start
  if(Math.floor(t*2)%2===0){
    X.fillStyle='#fff';X.font='bold 18px Trebuchet MS';
    X.fillText('▶  PRESS  ENTER  TO  BEGIN  ◀', W/2, H/2+130);
  }
  X.font='11px Trebuchet MS';X.fillStyle='#6a7090';
  X.fillText('A · D move    SPACE jump (double)    J attack    K dash (unlocked)    L spirit burst (unlocked)', W/2, H-30);
  X.fillText('Best Score: '+game.bestScore, W/2, H-12);
}

function drawDeath(){
  X.fillStyle='rgba(0,0,0,0.7)';X.fillRect(0,0,W,H);
  X.textAlign='center';X.fillStyle='#ff6080';X.font='bold 56px Trebuchet MS';
  X.fillText('THE EMBER FADES', W/2, H/2-20);
  X.fillStyle='#fff';X.font='18px Trebuchet MS';
  X.fillText('Your light has dimmed... Press R to rekindle, or M for menu.', W/2, H/2+30);
  X.fillStyle='#ffd089';
  X.fillText('Score: '+game.score+'   |   Shards: '+game.shards+'/5', W/2, H/2+60);
}

function drawWin(){
  const t=performance.now()*0.001;
  X.fillStyle='rgba(10,5,20,0.85)';X.fillRect(0,0,W,H);
  X.save();X.globalCompositeOperation='lighter';
  for(let i=0;i<150;i++){
    const a=i/150*TAU+t*0.5;
    const r=200+Math.sin(t*2+i)*30;
    X.fillStyle=i%3===0?'#ffd089':'#ffffff';X.globalAlpha=0.4;
    X.beginPath();X.arc(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r,2,0,TAU);X.fill();
  }
  X.restore();
  X.textAlign='center';X.fillStyle='#fff';X.font='bold 56px Trebuchet MS';
  X.fillText('THE WORLD REIGNITES', W/2, H/2-30);
  X.font='18px Trebuchet MS';X.fillStyle='#ffd089';
  X.fillText('The Hollow King is undone. Light returns to Lumenfall.', W/2, H/2+10);
  X.fillStyle='#fff';
  X.fillText('Final Score: '+game.score+'   |   Best: '+game.bestScore, W/2, H/2+45);
  X.font='14px Trebuchet MS';X.fillStyle='#a0b0d0';
  X.fillText('Press R to play again, or M for menu.', W/2, H/2+80);
}

function drawPause(){
  X.fillStyle='rgba(0,0,0,0.55)';X.fillRect(0,0,W,H);
  X.textAlign='center';X.fillStyle='#fff';X.font='bold 48px Trebuchet MS';
  X.fillText('PAUSED', W/2, H/2);
  X.font='16px Trebuchet MS';X.fillStyle='#a0b0d0';
  X.fillText('Press P to resume, M for menu', W/2, H/2+30);
}

/* ---------- Main loop ---------- */
let last=0, accum=0;
function loop(ts){
  const dt = Math.min(33, ts-last); last=ts;
  if(game.state===STATE.MENU){
    drawMenu();
    if(KEY['Enter']||KEY['enter']||KEY['return']){
      game.state=STATE.PLAY;
      game.stage=0;game.shards=0;game.score=0;
      game.unlocks={dash:false,burst:false,doubleJump:true};
      player.maxHp=5;player.maxEnergy=3;
      loadStage(0);
    }
  } else if(game.state===STATE.PLAY){
    update();
    render();
    drawHUD();
    if(KEY['p']){game.state=STATE.PAUSE;KEY['p']=false;}
  } else if(game.state===STATE.PAUSE){
    render();drawHUD();drawPause();
    if(KEY['p']){game.state=STATE.PLAY;KEY['p']=false;}
    if(KEY['m']){game.state=STATE.MENU;KEY['m']=false;}
  } else if(game.state===STATE.STAGE_INTRO){
    update();render();drawHUD();
    if(game.introT<=0)game.state=STATE.PLAY;
  } else if(game.state===STATE.DEAD){
    render();drawHUD();drawDeath();
    if(KEY['r']){game.state=STATE.PLAY;loadStage(game.stage);KEY['r']=false;}
    if(KEY['m']){game.state=STATE.MENU;KEY['m']=false;}
  } else if(game.state===STATE.WIN){
    drawWin();
    if(KEY['r']){game.state=STATE.PLAY;game.stage=0;game.shards=0;game.score=0;game.unlocks={dash:false,burst:false,doubleJump:true};player.maxHp=5;player.maxEnergy=3;loadStage(0);KEY['r']=false;}
    if(KEY['m']){game.state=STATE.MENU;KEY['m']=false;}
  }
  requestAnimationFrame(loop);
}

function update(){
  game.time++;
  updatePlayer();
  updateEnemies();
  updateProjectiles();
  updateParticles();
  // camera
  cam.tx = clamp(player.x - W/2, 0, map.length*TS - W);
  cam.ty = clamp(player.y - H/2, -100, 0);
  updateCam();
  // ambient embers in current biome
  if(game.time%3===0){
    const px=cam.x+Math.random()*W, py=cam.y+Math.random()*H;
    const s=STAGES[game.stage];
    particles.push({x:px,y:py,vx:rand(-0.3,0.3),vy:rand(-0.6,-0.2),life:1.5,decay:0.01,size:rand(1,2),color:s.palette.accent,glow:true,grav:0});
  }
}

function render(){
  clearBG();
  drawParallaxMountains();
  drawWeather();
  drawTerrain();
  drawPickups();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  drawParticles();
  // vignette
  X.save();
  const v=X.createRadialGradient(W/2,H/2,W*0.3,W/2,H/2,W*0.7);
  v.addColorStop(0,'transparent');v.addColorStop(1,'rgba(0,0,0,0.55)');
  X.fillStyle=v;X.fillRect(0,0,W,H);
  X.restore();
}

/* ---------- Boot ---------- */
loadStage(0); // pre-build
game.state=STATE.MENU;
requestAnimationFrame(loop);
</script>
</body>
</html>
`;

const CONFIG_ASSETS = {
  mainBackground: "images/hero_bg.jpg",
  nameHeaderBg: "images/header_bg.gif",
  footerDecoration: "images/footer_deco.gif",
  spotifyIcon: "https://img.icons8.com/plasticine/1200/spotify--v2.jpg",
  profileImg: "images/profile_img.jpg",
  vaultPlaylistCover: "images/playlist_cover.jpg",
  youtubeHighlightsBg: "images/yt_highlights.gif",
  gmailBg: "images/gmail_bg.gif",
  whatsappBg: "images/whatsapp_bg.gif",
  telegramBg: "images/telegram_bg.gif"
};

const STREAMING_PLATFORMS = [
  {
    name: "Spotify",
    url: "https://open.spotify.com/artist/5nwGOyilF1p4uv35v6vb2u",
    icon: Music2,
    color: "#1DB954",
    isSpotify: true,
  },
  {
    name: "Apple Music",
    url: "https://music.apple.com/us/artist/nl/1535833912",
    icon: Music2,
    color: "#FA243C",
  },
  {
    name: "Deezer",
    url: "https://www.deezer.com/en/artist/362375722",
    icon: Disc,
    color: "#FF0000",
  },
  {
    name: "Amazon Music",
    url: "https://music.amazon.fr/artists/B0025ODH90/nl",
    icon: Music2,
    color: "#00A8E1",
  },
  {
    name: "Anghami",
    url: "https://play.anghami.com/artist/1430009",
    icon: Music2,
    color: "#ED1B24",
  },
  {
    name: "SoundCloud",
    url: "https://on.soundcloud.com/Ok8zBgOjCPqjvStEA",
    icon: Cloud,
    color: "#FF3300",
  },
];

const SOCIAL_CHANNELS = [
  {
    name: "Instagram",
    url: "https://www.instagram.com/nordine_el_mobaraki/",
    icon: Instagram,
    color: "#E4405F",
  },
  {
    name: "TikTok",
    url: "https://www.tiktok.com/@nourdine_el_mobaraki",
    icon: Video,
    color: "#000000",
  },
  {
    name: "Facebook",
    url: "https://www.facebook.com/profile.php?id=61558584390374",
    icon: Facebook,
    color: "#1877F2",
  },
];

const CONTACT_METHODS = [
  {
    name: "Gmail",
    value: "noureddinelmobaraki@gmail.com",
    url: "mailto:noureddinelmobaraki@gmail.com",
    icon: Mail,
    bg: "images/gmail_bg.gif",
    color: "#EA4335"
  },
  {
    name: "WhatsApp",
    value: "+212 612-806932",
    url: "https://wa.me/212612806932",
    icon: MessageCircle,
    bg: "images/whatsapp_bg.gif",
    color: "#25D366"
  },
  {
    name: "Telegram",
    value: "+212 612 806932",
    url: "https://t.me/212612806932",
    icon: Send,
    bg: "images/telegram_bg.gif",
    color: "#0088CC"
  }
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

const ME_BIT_IMAGES = [
  "images/me_bit_1.jpg",
  "images/me_bit_2.jpg",
  "images/me_bit_3.jpg",
  "images/me_bit_4.jpg",
  "images/me_bit_5.jpg",
  "images/me_bit_6.jpg",
  "images/me_bit_7.jpg",
  "images/me_bit_8.jpg",
  "images/me_bit_9.jpg"
];

const STYLES = {
  SHADOW_WHITE: { textShadow: '2px 2px 0px rgba(255,255,255,0.8)' },
  SHADOW_BLACK_LG: { textShadow: '4px 4px 0px rgba(0,0,0,0.8)' },
  SHADOW_BLACK_SM: { textShadow: '2px 2px 0px rgba(0,0,0,0.5)' },
  SHADOW_BLACK_SOLID: { textShadow: '2px 2px 0 #000' },
  CIRCLE: { borderRadius: '50%' }
};

export default function App() {
  const { isMobile } = useDeviceType();
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Step 1: start muted — browsers always allow this
    audio.muted = true;
    audio.play().then(() => {
      // Step 2: unmute immediately after playback starts
      setTimeout(() => {
        audio.muted = false;
        setIsPlaying(true);
      }, 300);
    }).catch(() => {
      // Fallback if even muted play fails
      audio.muted = false;
      const handlers = ['scroll','click','keydown','touchstart','mousemove','wheel'];
      const once = () => {
        audio.play().then(() => {
          setIsPlaying(true);
          handlers.forEach(e => document.removeEventListener(e, once));
        }).catch(() => {});
      };
      handlers.forEach(e => document.addEventListener(e, once, { passive: true }));
      return () => handlers.forEach(e => document.removeEventListener(e, once));
    });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
  }, [loaded]);

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSongPlay = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {!loaded && (
        <LoadingScreen 
          onComplete={() => setLoaded(true)} 
          onAudioUnlock={() => {
            const audio = audioRef.current;
            if (!audio) return;
            audio.play().then(() => setIsPlaying(true)).catch(() => {});
          }}
        />
      )}
      <div style={{ opacity: loaded ? 1 : 0, transition: 'opacity 500ms ease-in' }}>
        <div 
          className="min-h-screen w-full relative flex flex-col items-center py-10 px-6 sm:px-10 overflow-x-hidden"
        >
      {/* Retro Overlays */}
      <div className="noise-overlay" />
      <div className="scanline" />

      {/* Global Background Image Layer with Parallax */}
      <div 
        className="fixed inset-[-5%] z-[-2] bg-cover bg-center bg-fixed transition-transform duration-300 ease-out"
        style={{ 
          backgroundImage: `url('${CONFIG_ASSETS.mainBackground}')`,
          filter: 'blur(4px) brightness(0.7)',
          transform: `translate3d(${mousePos.x}px, ${mousePos.y}px, 0)`
        }}
      />
      
      {/* Backdrop Tint Layer */}
      <div className="fixed inset-0 z-[-1] bg-[#121212]/40" />

      {/* Grid Pattern Layer (Editorial Aesthetic) */}
      <div 
        className="fixed inset-0 opacity-15 z-0 pointer-events-none"
        style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, #fff 1px, transparent 0)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Background Audio */}
      <audio 
        id="bg-audio" 
        ref={audioRef}
        loop 
        preload="auto"
      >
        <source src="music.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>

      {/* Floating Audio Control Button - Small & Elegant */}
      <button
        onClick={toggleAudio}
        className="fixed bottom-4 right-4 z-[120] bg-black/30 backdrop-blur-lg border border-white/10 p-2.5 rounded-full text-white/80 hover:text-white hover:bg-black/50 transition-all hover:scale-105 active:scale-90 shadow-xl group border-dashed"
        aria-label="Toggle Background Music"
      >
        {isPlaying ? (
          <Volume2 className="w-4 h-4 group-hover:animate-pulse" />
        ) : (
          <VolumeX className="w-4 h-4 text-zinc-500" />
        )}
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-black/90 text-white px-2 py-0.5 rounded text-[10px] font-mono tracking-tighter whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/5 uppercase">
          {isPlaying ? 'Sound On' : 'Sound Off'}
        </div>
      </button>

      {/* Professional Gallery Modal */}
      <AnimatePresence mode="wait">
        {isGalleryOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-10 md:p-14"
          >
            {/* Backdrop Blur */}
            <div 
              className="absolute inset-0 bg-black/95 backdrop-blur-3xl cursor-crosshair"
              onClick={() => setIsGalleryOpen(false)}
            />
            
            {/* Close Button */}
            {isMobile ? (
              <button className="mobile-back-btn" onClick={() => setIsGalleryOpen(false)}>
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
            ) : (
              <motion.button 
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                onClick={() => setIsGalleryOpen(false)}
                className="absolute top-6 right-6 sm:top-10 sm:right-10 z-[110] text-white hover:text-white hover:bg-red-600 transition-all bg-black/50 p-3 rounded-full border border-white/20 shadow-xl"
              >
                <X className="w-8 h-8" />
              </motion.button>
            )}

            <div className={`relative w-full h-full flex flex-col z-[105] overflow-hidden ${isMobile ? 'pt-[calc(var(--safe-top)+60px)]' : 'gap-6'}`}>
              {/* Gallery Content */}
              <div className={`flex-1 flex flex-col md:flex-row overflow-hidden ${isMobile ? '' : 'gap-6'}`}>
                
                {/* Main View Area */}
                <div className={`${isMobile ? 'order-1' : 'flex-1'} glass-morphism rounded-3xl relative flex items-center justify-center overflow-hidden shadow-inner group`}>
                  {selectedImageIndex !== null ? (
                    <motion.div
                      key={selectedImageIndex}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 200 }}
                      className={`w-full h-full flex items-center justify-center cursor-zoom-in ${isMobile ? 'p-0' : 'p-4 sm:p-8'}`}
                    >
                      <img 
                        src={ME_BIT_IMAGES[selectedImageIndex]}
                        alt="Selected Shot"
                        className={`${isMobile ? 'w-full h-full object-cover' : 'max-w-full max-h-full object-contain'} shadow-[0_0_80px_rgba(255,255,255,0.08)] rounded-sm transition-transform duration-700 hover:scale-110`}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                      />
                      
                      {/* Navigation Controls on Main View */}
                      {!isMobile && (
                        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-6 pointer-events-none">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const prev = selectedImageIndex > 0 ? selectedImageIndex - 1 : ME_BIT_IMAGES.length - 1;
                              setSelectedImageIndex(prev);
                            }}
                            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                          >
                            <ChevronLeft className="w-10 h-10" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const next = selectedImageIndex < ME_BIT_IMAGES.length - 1 ? selectedImageIndex + 1 : 0;
                              setSelectedImageIndex(next);
                            }}
                            className="w-14 h-14 flex items-center justify-center rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 pointer-events-auto hover:bg-white hover:text-black hover:scale-110 transition-all shadow-2xl"
                          >
                            <ChevronRight className="w-10 h-10" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="text-zinc-600 font-manga text-3xl animate-pulse tracking-widest">
                      SELECT A MOMENT
                    </div>
                  )}
                </div>

                {/* Thumbnails Interaction for Mobile */}
                {isMobile && (
                  <div className="order-2 w-full h-[100px] overflow-x-auto flex items-center gap-2 px-4 py-2 border-t border-white/10 bg-black/50 backdrop-blur-md">
                    {ME_BIT_IMAGES.map((src, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`
                          relative h-full aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all duration-300 shrink-0
                          ${selectedImageIndex === idx 
                            ? 'border-white scale-95' 
                            : 'border-transparent opacity-50'}
                        `}
                      >
                        <img src={src} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Thumbnails Sidebar - Desktop only */}
                {!isMobile && (
                  <div className="w-full md:w-96 flex flex-col gap-6 glass-morphism p-6 rounded-3xl overflow-hidden shadow-2xl">
                    <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                      <div className="flex flex-col">
                        <h3 className="font-manga text-white text-2xl tracking-tight leading-none uppercase">Shot Archive</h3>
                        <span className="font-hand text-zinc-400 text-sm mt-1 italic">Moments in time</span>
                      </div>
                      <div className="bg-white/10 px-3 py-1 rounded-full text-zinc-100 font-mono text-xs">
                        {selectedImageIndex !== null ? selectedImageIndex + 1 : 0} / {ME_BIT_IMAGES.length}
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto grid grid-cols-5 md:grid-cols-2 gap-3 pr-2 custom-scrollbar pb-4 content-start">
                      {ME_BIT_IMAGES.map((src, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImageIndex(idx)}
                          className={`
                            relative aspect-[3/4] rounded-xl border-2 overflow-hidden transition-all duration-300 transform
                            ${selectedImageIndex === idx 
                              ? 'border-white scale-95 shadow-[0_0_20px_white/20] ring-4 ring-white/10' 
                              : 'border-transparent hover:border-white/30 opacity-40 hover:opacity-100 hover:scale-[1.02]'}
                          `}
                        >
                          <img 
                            src={src} 
                            alt={`Moment ${idx + 1}`} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                          {selectedImageIndex === idx && (
                            <div className="absolute inset-0 bg-white/10 backdrop-none" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Enhanced Info Footer - Desktop only */}
              {!isMobile && (
                <motion.div 
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="bg-white p-8 manga-border border-black shadow-[12px_12px_0px_#fff] flex flex-col md:flex-row justify-between items-center gap-6"
                >
                  <div className="flex items-center gap-6">
                    <div className="p-4 bg-black text-white rounded-2xl shadow-lg -rotate-3 group-hover:rotate-0 transition-transform">
                      <Maximize2 className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="font-manga text-3xl font-black uppercase text-black leading-none tracking-tight">Theater Mode</h4>
                      <p className="font-hand text-zinc-500 text-xl mt-1">Curated photography and sketches from Noordine's private collection.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-zinc-100 rounded-full text-zinc-400 font-mono text-xs uppercase tracking-widest">
                      <span>Arrows to navigate</span>
                      <div className="w-1 h-1 bg-zinc-300 rounded-full" />
                      <span>ESC to close</span>
                    </div>
                    <button 
                      onClick={() => setIsGalleryOpen(false)}
                      className="manga-button bg-black text-white px-10 py-3 font-manga text-2xl hover:bg-zinc-800 tracking-tighter"
                    >
                      LEAVE THEATER
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Wrapper */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-5xl flex flex-col gap-14"
      >
        {/* Navigation Tabs */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap justify-center sm:justify-start gap-4 mb-4"
        >
          <button 
            onClick={() => scrollToSection('me-bit-gallery')}
            className="manga-button !py-2 !px-8 text-sm sm:text-lg transition-all bg-black text-white shadow-[12px_12px_0px_#fff] -translate-y-1"
          >
            ME BIT
          </button>
          <button 
            onClick={() => scrollToSection('my-songs-section')}
            className="manga-button !py-2 !px-8 text-sm sm:text-lg transition-all bg-black text-white shadow-[12px_12px_0px_#fff] -translate-y-1"
          >
            MY SONGS
          </button>
          <button 
            onClick={() => scrollToSection('drawings-section')}
            className="manga-button !py-2 !px-8 text-sm sm:text-lg transition-all bg-black text-white shadow-[8px_8px_0px_rgba(255,255,255,0.2)] hover:shadow-[12px_12px_0px_#fff] -translate-y-1"
          >
            MY DRAWINGS
          </button>
        </motion.div>

        <div className="flex flex-col gap-14">
            {/* Top Contact Section */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full"
            >
            {CONTACT_METHODS.map((method, idx) => (
              <a
                key={method.name}
                href={method.url}
                target="_blank"
                rel="noreferrer"
                className="manga-border group relative flex flex-col items-center justify-center p-6 border-[4px] border-black overflow-hidden bg-white transition-all duration-300 hover:scale-[1.05] hover:-rotate-1 active:scale-95 shadow-[8px_8px_0px_#000]"
              >
                {/* GIF Background */}
                <div 
                  className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-500 group-hover:scale-110 opacity-30 blur-[2px] group-hover:blur-0"
                  style={{ backgroundImage: `url('${method.bg}')` }}
                />
                {/* Content Overlay */}
                <div className="relative z-10 flex flex-col items-center gap-2">
                  <div 
                    className="p-3 bg-black text-white manga-border border-white/20 shadow-[4px_4px_0px_rgba(0,0,0,0.5)] group-hover:bg-white group-hover:text-black transition-colors"
                    style={STYLES.CIRCLE}
                  >
                    <method.icon className="w-8 h-8" />
                  </div>
                  <span className="font-manga text-2xl font-black text-black uppercase tracking-tighter" style={STYLES.SHADOW_WHITE}>
                    {method.name}
                  </span>
                  <span className="text-xs font-bold text-black/70 bg-white/80 px-2 py-0.5 manga-border border-black truncate max-w-full">
                    {method.value}
                  </span>
                </div>
              </a>
            ))}
          </motion.div>
          
          {/* Editorial Header Section */}
          <motion.header 
            variants={itemVariants}
            className="flex flex-col md:flex-row items-end justify-between gap-6 w-full"
          >
            <div 
              className="manga-border p-8 flex-1 min-w-[60%] relative group overflow-hidden border-[4px] border-black transition-all duration-500 hover:scale-[1.01]"
              id="header-card"
            >
              {/* Header Background Image with Zoom & Pan Hover Effect */}
              <div 
                className="absolute inset-0 z-[-1] bg-cover bg-center transition-all duration-700 blur-[3px] group-hover:blur-0 group-hover:scale-125 group-hover:translate-y-[-10%]"
                style={{ backgroundImage: `url('${CONFIG_ASSETS.nameHeaderBg}')` }}
              />
              {/* Dark Overlay for Text Legibility */}
              <div className="absolute inset-0 z-[-1] bg-black/40 transition-opacity group-hover:opacity-30" />
              
              <h1 
                className="font-manga text-5xl md:text-7xl font-black uppercase tracking-tight text-white leading-none"
                style={STYLES.SHADOW_BLACK_LG}
              >
                Noureddin El Mobaraki
              </h1>
              
              <div className="mt-6 flex items-center gap-4 text-white font-bold uppercase italic border-t-2 border-white/50 pt-4">
                <span className="text-xl font-manga" style={STYLES.SHADOW_BLACK_SM}>Casablanca 📍</span>
                <span className="text-sm bg-black text-white px-3 py-1 manga-border border-white/30 truncate">
                  "NL" | "Nordine GB"
                </span>
              </div>
              <p 
                className="mt-4 font-hand text-2xl text-white leading-tight max-w-xl"
                style={{ 
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.1)',
                  filter: 'drop-shadow(2px 2px 2px #000)'
                }}
              >
                <span className="text-yellow-400">“24 years old.</span> Just a simple <span className="text-zinc-400">5/10</span> kind of person. I’m into <span className="border-b-2 border-dashed border-red-500">drawing</span>, cooking for fun, and overthinking <span className="text-cyan-300">random stuff</span> that probably helps nobody. That’s pretty much it.”
              </p>
            </div>

            {/* Profile Image Square Box */}
            <div 
              className="manga-card bg-white p-0 flex flex-col items-center justify-center w-48 aspect-square hidden md:flex rotate-2 hover:rotate-0 transition-transform overflow-hidden border-[3px] border-black"
            >
              <img 
                src={CONFIG_ASSETS.profileImg} 
                alt="Profile" 
                className="w-full h-full object-cover" 
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>

          </motion.header>

          {/* Highlights Section - Spotify Vault & YouTube */}
          <motion.section 
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 gap-8"
          >
            {/* The Vault - Playlist Section */}
            <div className="flex flex-col gap-4">
              <h3 className="font-manga text-xl font-bold bg-white text-black inline-block px-4 py-1 manga-border w-fit -rotate-2 shadow-[3px_3px_0px_#000]">
                ■ THE VAULT
              </h3>
              <a 
                href="https://open.spotify.com/playlist/2NdDhxkVxypu1MkuVRCgId?si=R2iXNEuyQxOHwRwPPs_t7w"
                target="_blank"
                rel="noreferrer"
                id="vault-playlist"
                className="group relative overflow-hidden border-[3px] border-black transition-all duration-300 hover:scale-[1.02] flex-1 min-h-[200px]"
                style={{ borderRadius: '12px 5px 18px 8px / 8px 18px 5px 12px' }}
              >
                <img 
                  src={CONFIG_ASSETS.vaultPlaylistCover} 
                  alt="NL fv songs of all time" 
                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.8] group-hover:brightness-100 transition-all"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                  <span className="font-hand text-3xl text-white">NL fv songs of all time</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Music2 className="w-5 h-5 text-[#1DB954]" />
                    <span className="text-sm text-zinc-300 uppercase font-manga tracking-widest">Listen on Spotify</span>
                  </div>
                </div>
              </a>
            </div>

            {/* YouTube Highlights Section */}
            <div className="flex flex-col gap-4">
              <h3 className="font-manga text-xl font-bold bg-black text-white inline-block px-4 py-1 manga-border w-fit rotate-1 shadow-[3px_3px_0px_#fff] border-white">
                ■ HIGHLIGHTS
              </h3>
              <a 
                href="https://www.youtube.com/@nourdin_el_mobaraki"
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden border-[3px] border-black transition-all duration-300 hover:scale-[1.02] flex-1 min-h-[200px]"
                style={{ borderRadius: '5px 15px 8px 20px / 15px 8px 20px 5px' }}
              >
                <div 
                  className="absolute inset-0 bg-cover bg-center filter grayscale group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
                  style={{ backgroundImage: `url('${CONFIG_ASSETS.youtubeHighlightsBg}')` }}
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                  <Youtube className="w-16 h-16 text-white drop-shadow-[0_0_15px_red] mb-2" />
                  <span className="font-manga text-3xl text-white uppercase tracking-tighter" style={STYLES.SHADOW_BLACK_SOLID}>
                    Watch on YouTube
                  </span>
                </div>
              </a>
            </div>
          </motion.section>

          <main className="grid grid-cols-1 md:grid-cols-2 gap-10">
            
            {/* Streaming Platforms Section */}
            <motion.section variants={itemVariants} className="flex flex-col gap-6">
              <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit -rotate-1 shadow-[4px_4px_0px_#000]">
                ■ STREAMING PLATFORMS
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                {STREAMING_PLATFORMS.map((platform, idx) => (
                  <div
                    key={platform.name}
                    id={`stream-${idx}`}
                  >
                    <a
                      href={platform.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`manga-button flex items-center gap-3 group ${platform.isSpotify ? 'spotify-king' : ''}`}
                    >
                      {platform.isSpotify ? (
                        <img src={CONFIG_ASSETS.spotifyIcon} alt="Spotify" className="w-8 h-8 shrink-0 object-contain drop-shadow-[0_0_8px_#1DB954]" referrerPolicy="no-referrer" loading="lazy" />
                      ) : (
                        <platform.icon className="w-6 h-6 shrink-0" />
                      )}
                      <span className="text-base sm:text-lg whitespace-nowrap overflow-hidden text-ellipsis">{platform.name}</span>
                    </a>
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Social Channels Section */}
            <motion.section variants={itemVariants} className="flex flex-col gap-6">
              <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit rotate-1 shadow-[4px_4px_0px_#000]">
                ■ SOCIAL CHANNELS
              </h2>
            
            <div className="flex flex-col gap-5">
              {SOCIAL_CHANNELS.map((channel, idx) => (
                <a
                  key={channel.name}
                  id={`social-${idx}`}
                  href={channel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="manga-button flex justify-between items-center group overflow-hidden"
                  style={{ 
                    transform: `rotate(${idx % 2 === 0 ? '-0.5deg' : '0.5deg'})`,
                    borderRadius: '8px 15px 5px 22px / 22px 5px 15px 8px'
                  }}
                >
                  <div className="flex items-center gap-4">
                    <channel.icon className="w-6 h-6" />
                    <span className="text-xl">{channel.name}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          </motion.section>
        </main>

        {/* ME bit Interactive Gallery - Moved out of grid to be more prominent */}
        <motion.section 
          variants={itemVariants}
          className="flex flex-col gap-4 mt-8"
          id="me-bit-gallery"
        >
          <div className="flex justify-between items-end">
            <h2 className="font-manga text-3xl font-bold text-white text-left tracking-wider">
              ME bit
            </h2>
            <span className="font-hand text-zinc-400 text-sm italic mb-1">Click to enter theater mode</span>
          </div>
          
          <div 
            onClick={() => {
              setIsGalleryOpen(true);
              if (selectedImageIndex === null) setSelectedImageIndex(0);
            }}
            className="relative w-full border-[4px] border-black bg-white p-[10px] overflow-hidden group cursor-[zoom-in] shadow-[10px_10px_0px_rgba(0,0,0,0.8)] hover:shadow-[14px_14px_0px_rgba(0,0,0,1)] transition-all h-[280px]"
          >
            <div className="me-bit-track flex gap-[10px]">
              {[...ME_BIT_IMAGES, ...ME_BIT_IMAGES].map((src, idx) => (
                <div 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImageIndex(idx % ME_BIT_IMAGES.length);
                    setIsGalleryOpen(true);
                  }}
                  className="inline-block h-[250px] w-auto aspect-[3/4] shrink-0 border-[2px] border-black overflow-hidden relative group/item"
                >
                  <img 
                    src={src}
                    alt={`Me bit ${idx}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 scale-110 group-hover:scale-100"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover/item:bg-transparent transition-colors" />
                </div>
              ))}
            </div>
            
            {/* Overlay hint */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <div className="bg-white text-black p-4 manga-border border-black flex items-center gap-3 scale-90 group-hover:scale-100 transition-transform shadow-[5px_5px_0_black]">
                <Maximize2 className="w-6 h-6" />
                <span className="font-manga text-xl font-bold">OPEN GALLERY</span>
              </div>
            </div>
          </div>
        </motion.section>

        {/* My Songs Section - Now right after Me bit */}
          <motion.div 
            variants={itemVariants} 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            id="my-songs-section"
          >
            <MySongs 
              onSongPlay={handleSongPlay} 
            />
          </motion.div>

          {/* Sarahni Section */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <Sarahni />
          </motion.div>

          {/* My Drawings Section */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <DrawingsPage onSongPlay={handleSongPlay} />
          </motion.div>

        {/* THE GAME BOX Section */}
        <motion.section 
          variants={itemVariants}
          className="mt-10 flex flex-col gap-6"
        >
          <div className="flex flex-col gap-4 relative">
            <h2 className="font-manga text-2xl font-bold bg-white text-black inline-block px-5 py-2 manga-border w-fit -rotate-1 shadow-[4px_4px_0px_#000]">
              ■ THE GAME BOX
            </h2>
            
            <div className="relative bg-white border-[5px] border-black shadow-[12px_12px_0px_#000] rounded-none overflow-hidden group">
              {/* Arcade Mode Label */}
              <div className="absolute top-0 left-0 bg-black text-white px-4 py-1 font-bold z-20 border-b-[3px] border-r-[3px] border-black uppercase tracking-widest text-xs">
                Arcade Mode
              </div>
              
              <div className="w-full relative">
                <iframe
                  id="game-iframe"
                  srcDoc={GAME_CODE_CONTENT}
                  className="w-full h-[600px] border-none overflow-hidden block"
                  title="Arcade Game"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <button
                onClick={() => {
                  const iframe = document.getElementById('game-iframe');
                  if (iframe?.requestFullscreen) {
                    iframe.requestFullscreen();
                  }
                }}
                className="manga-button bg-black text-white flex items-center gap-2 group hover:scale-110 active:scale-95 px-8 py-3"
              >
                <Play className="w-5 h-5 fill-current" />
                <span className="font-manga text-xl">Full Screen</span>
              </button>
            </div>
          </div>
        </motion.section>
      </div>

      {/* Editorial Footer */}
        <motion.footer 
          variants={itemVariants}
          className="mt-10 flex flex-col items-center gap-8 border-t-4 border-black pt-10"
        >
          {/* Footer Decoration Image with Float Animation */}
          <img 
            id="footer-image"
            src={CONFIG_ASSETS.footerDecoration}
            alt="Footer Decoration"
            className="w-full max-w-[600px] border-[3px] border-black shadow-[10px_10px_0px_#000] rounded-xl hover:scale-[1.02] transition-transform animate-float"
            referrerPolicy="no-referrer"
            loading="lazy"
          />

          <div className="flex flex-col md:flex-row justify-between items-center w-full gap-6">
            <div className="flex gap-4">
              <div className="w-4 h-4 bg-black manga-border rounded-none" />
              <div className="w-4 h-4 bg-black manga-border rounded-none" />
              <div className="w-4 h-4 bg-black manga-border rounded-none" />
            </div>
            <p className="font-manga text-2xl text-black bg-white px-6 py-1 manga-border -rotate-1 shadow-[4px_4px_0px_#000] italic">
              NL // NOURDINE GB © 2026
            </p>
          </div>
        </motion.footer>
      </motion.div>
        </div>
      </div>
    </>
  );
}
