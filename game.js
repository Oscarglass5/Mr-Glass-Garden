// ============================================================
//  MR GLASS' GARDEN — Phaser 3 Edition
//  Year 11 Biology progress-tracking game world (rebuilt layout)
// ============================================================

var TILE = 32;
var MAP_W = 40;
var MAP_H = 30;
var WORLD_W = MAP_W * TILE;  // 1280
var WORLD_H = MAP_H * TILE;  // 960
var VIEW_W = 960;
var VIEW_H = 600;

// ---- save system ----------------------------------------------------------
var LS_KEY = 'mrglassgarden_phaser_v1';
var ST = null;

function defaultState(){
  var dp = {};
  Object.keys(CONFIG_SYLLABUS).forEach(function(m){
    CONFIG_SYLLABUS[m].iq.forEach(function(q,qi){
      q.points.forEach(function(_,pi){ dp[m+'_'+qi+'_'+pi] = 'none'; });
    });
  });
  var qz = {};
  Object.keys(CONFIG_QUIZZES).forEach(function(m){
    CONFIG_QUIZZES[m].forEach(function(_,i){ qz[m+'_'+i] = false; });
  });
  var pr = {}; CONFIG_PRACTICALS.forEach(function(_,i){ pr['p'+i] = false; });
  var at = {}; (CONFIG_ASSESSMENTS||[]).forEach(function(a){ at[a.key] = false; });
  // Skills: each tracks total XP earned. Level computed from totalXP.
  var skills = {};
  if (typeof CONFIG_SKILLS !== 'undefined'){
    Object.keys(CONFIG_SKILLS).forEach(function(k){ skills[k] = { totalXP: 0 }; });
  }
  return {
    dp:dp, qz:qz, pr:pr, at:at,
    mailRead:[], achievements:[],
    appearance: { hair:null, skin:null, clothes:null, eyes:null },
    skills: skills,
    // Passive-study session in progress (null = none). Persists across reloads.
    session: null,    // { skill, study, startedAt, duration }
    // Journal of completed sessions. Each entry: { id, skill, study, takeaway, xp, timestamp }
    journal: [],
    // Cumulative fish catch counts: { fishId: count, ... }
    fishCaught: {}
  };
}

// ============================================================
//  SKILLS — Fishing, Botany, Cultivation, Spelunking
// ============================================================
// Skills level 0-10. Each skill earns XP through passive study (10 XP per
// 15-min check-in) or active mini-games (variable). Level N→N+1 costs
// (100 + 50*N) XP, so level 1 is quick (~25 min), level 10 is slow (~2h).
// Cumulative XP for level 10 ≈ 3,250 XP ≈ 80 hours per skill at the passive
// rate alone. Mini-games grant larger chunks so the curve is reachable.

var SKILL_MAX_LEVEL = 10;

// ---- Fish definitions (16 fish from fish_pack.png, 32x32 grid) ----
// Rarity: 'common' ~60% pool, 'uncommon' ~30%, 'rare' ~10%
// Grid positions: row 0 = fish 0-6, row 1 = fish 7-13, row 2 = fish 14-15
var FISH_DEFS = [
  { id:'f0',  name:'Carp',           gridX:0, gridY:0, rarity:'common'   },
  { id:'f1',  name:'Bass',           gridX:1, gridY:0, rarity:'common'   },
  { id:'f2',  name:'Mackerel',       gridX:2, gridY:0, rarity:'common'   },
  { id:'f3',  name:'Clownfish',      gridX:3, gridY:0, rarity:'uncommon' },
  { id:'f4',  name:'Salmon',         gridX:4, gridY:0, rarity:'common'   },
  { id:'f5',  name:'Striped Bass',   gridX:5, gridY:0, rarity:'uncommon' },
  { id:'f6',  name:'Blue Tang',      gridX:6, gridY:0, rarity:'uncommon' },
  { id:'f7',  name:'Trout',          gridX:0, gridY:1, rarity:'common'   },
  { id:'f8',  name:'Perch',          gridX:1, gridY:1, rarity:'common'   },
  { id:'f9',  name:'Angelfish',      gridX:2, gridY:1, rarity:'uncommon' },
  { id:'f10', name:'Emperor Fish',   gridX:3, gridY:1, rarity:'rare'     },
  { id:'f11', name:'Discus',         gridX:4, gridY:1, rarity:'rare'     },
  { id:'f12', name:'Tuna',           gridX:5, gridY:1, rarity:'common'   },
  { id:'f13', name:'Pufferfish',     gridX:6, gridY:1, rarity:'uncommon' },
  { id:'f14', name:'Oarfish',        gridX:0, gridY:2, rarity:'rare'     },
  { id:'f15', name:'Dragonfish',     gridX:1, gridY:2, rarity:'rare'     }
];

function rollFishCatch(){
  // Roll 2-3 fish, weighted by rarity
  var pool = [];
  FISH_DEFS.forEach(function(f){
    var weight = f.rarity === 'common' ? 6 : f.rarity === 'uncommon' ? 3 : 1;
    for (var i = 0; i < weight; i++) pool.push(f);
  });
  var count = 2 + (Math.random() < 0.4 ? 1 : 0); // 60% chance of 2, 40% of 3
  var caught = [];
  var usedIdx = [];
  for (var n = 0; n < count; n++){
    var attempts = 0;
    while (attempts < 20){
      var idx = Math.floor(Math.random() * pool.length);
      if (usedIdx.indexOf(pool[idx].id) === -1){
        caught.push(pool[idx]);
        usedIdx.push(pool[idx].id);
        break;
      }
      attempts++;
    }
  }
  return caught;
}

// Passive session length. Teacher-tunable — set to 60_000 (1 min) for testing.
var SESSION_DURATION_MS = 15 * 60 * 1000;   // 15 minutes

// XP awarded per completed passive session.
var SESSION_XP_REWARD = 30;

var CONFIG_SKILLS = {
  fishing: {
    name: 'Fishing',
    blurb: 'Cast a line in the pond. Each fish is a flashcard.',
    activityLabel: 'Fishing at the pond',
    unlockHint: null,
    color: '#4878a8',
    letter: 'F'
  },
  botany: {
    name: 'Botany',
    blurb: 'Identify plant structures and explain their function.',
    activityLabel: 'Tending the garden beds',
    unlockHint: null,
    color: '#4a8a48',
    letter: 'B'
  },
  cultivation: {
    name: 'Cultivation',
    blurb: 'Build concept maps. Place new decorations around the farm.',
    activityLabel: 'Chopping wood',
    unlockHint: 'Unlocks at Module 2 fully confident',
    color: '#c8901c',
    letter: 'C'
  },
  spelunking: {
    name: 'Spelunking',
    blurb: 'Investigate cave specimens with multi-step questions.',
    activityLabel: 'Exploring the cave',
    unlockHint: 'Unlocks at 75% confident dot points overall',
    color: '#7a4818',
    letter: 'S'
  }
};

// XP required to advance from `level` to `level+1`.
function xpForNextLevel(level){
  if (level >= SKILL_MAX_LEVEL) return Infinity;
  return 100 + 50 * level;
}
// Compute current level from a skill's total XP.
function computeLevel(totalXP){
  var lvl = 0, remaining = totalXP || 0;
  while (lvl < SKILL_MAX_LEVEL){
    var cost = xpForNextLevel(lvl);
    if (remaining < cost) break;
    remaining -= cost;
    lvl++;
  }
  return lvl;
}
// Break a total-XP value into {level, xpIntoLevel, nextLevelCost}.
function progressFor(totalXP){
  var lvl = 0, remaining = totalXP || 0;
  while (lvl < SKILL_MAX_LEVEL){
    var cost = xpForNextLevel(lvl);
    if (remaining < cost) return { level: lvl, xp: remaining, next: cost };
    remaining -= cost;
    lvl++;
  }
  return { level: SKILL_MAX_LEVEL, xp: 0, next: 0 };
}

// Add (positive) or remove (negative) XP. Levels recompute automatically.
function addSkillXP(skillKey, amount, scene){
  if (!ST || !ST.skills || !ST.skills[skillKey]) return;
  if (!CONFIG_SKILLS[skillKey]) return;
  var s = ST.skills[skillKey];
  var oldLevel = computeLevel(s.totalXP || 0);
  s.totalXP = Math.max(0, (s.totalXP || 0) + amount);
  var newLevel = computeLevel(s.totalXP);
  saveState();
  if (scene && scene.showToast){
    if (newLevel > oldLevel){
      scene.showToast(CONFIG_SKILLS[skillKey].name + ' is now Level ' + newLevel + '!');
    } else if (newLevel < oldLevel){
      scene.showToast(CONFIG_SKILLS[skillKey].name + ' dropped to Level ' + newLevel + '.');
    }
  }
}

// Whether a skill is currently usable (unlocked).
function skillUnlocked(skillKey){
  if (skillKey === 'cultivation') return moduleConfidentPct('m2') >= 1;
  if (skillKey === 'spelunking')  return overallConfidentPct() >= 0.75;
  return true;
}

// ---- Session lifecycle ----
function sessionStart(skillKey, studyText){
  if (!ST) return false;
  if (ST.session) return false;   // one at a time
  ST.session = {
    skill: skillKey,
    study: studyText,
    startedAt: Date.now(),
    duration: SESSION_DURATION_MS
  };
  saveState();
  return true;
}
function sessionRemainingMs(){
  if (!ST || !ST.session) return 0;
  var elapsed = Date.now() - ST.session.startedAt;
  return Math.max(0, ST.session.duration - elapsed);
}
function sessionExpired(){
  return ST && ST.session && sessionRemainingMs() === 0;
}
function sessionCancel(){
  // Discard session, no XP, no journal entry.
  if (!ST) return;
  ST.session = null;
  saveState();
}
function sessionComplete(takeawayText){
  // Finalise: add journal entry, grant XP, clear session.
  if (!ST || !ST.session) return null;
  var s = ST.session;
  var entry = {
    id: 'j_' + Date.now() + '_' + Math.floor(Math.random()*1000),
    skill: s.skill,
    study: s.study,
    takeaway: takeawayText,
    xp: SESSION_XP_REWARD,
    timestamp: Date.now()
  };
  if (!Array.isArray(ST.journal)) ST.journal = [];
  ST.journal.unshift(entry);
  ST.session = null;
  saveState();
  return entry;
}
function journalRemoveEntry(entryId){
  if (!ST || !Array.isArray(ST.journal)) return;
  var idx = -1;
  for (var i=0; i<ST.journal.length; i++){
    if (ST.journal[i].id === entryId){ idx = i; break; }
  }
  if (idx === -1) return;
  var entry = ST.journal[idx];
  ST.journal.splice(idx, 1);
  // Refund/revoke the XP that this entry granted
  addSkillXP(entry.skill, -entry.xp, null);  // saveState happens inside
}



// Picked to feel cozy and natural rather than cartoon-bright.
var CHAR_PALETTES = {
  hair: [
    { name:'Black',     hex:'#1a1410' },
    { name:'Brown',     hex:'#5c3a20' },
    { name:'Auburn',    hex:'#8b3a1a' },
    { name:'Blonde',    hex:'#d4a868' },
    { name:'Ginger',    hex:'#c0501c' },
    { name:'Silver',    hex:'#a8a8b0' },
    { name:'Lavender',  hex:'#6a5a8a' },
    { name:'Forest',    hex:'#3a5a3a' }
  ],
  skin: [
    { name:'Porcelain', hex:'#f0d4b0' },
    { name:'Fair',      hex:'#e0b890' },
    { name:'Olive',     hex:'#c89668' },
    { name:'Tan',       hex:'#a87848' },
    { name:'Sienna',    hex:'#80502c' },
    { name:'Mahogany',  hex:'#503018' }
  ],
  clothes: [
    { name:'Sky',       hex:'#5a98c8' },
    { name:'Sage',      hex:'#7ca068' },
    { name:'Wheat',     hex:'#c8a868' },
    { name:'Brick',     hex:'#a04830' },
    { name:'Plum',      hex:'#6a3a60' },
    { name:'Charcoal',  hex:'#3a3a3a' },
    { name:'Forest',    hex:'#3a6a40' },
    { name:'Ochre',     hex:'#9a6a20' }
  ],
  eyes: [
    { name:'Brown',     hex:'#5a3818' },
    { name:'Hazel',     hex:'#8a6028' },
    { name:'Blue',      hex:'#4a78a8' },
    { name:'Green',     hex:'#4a8a48' },
    { name:'Grey',      hex:'#888890' },
    { name:'Amber',     hex:'#b87830' }
  ]
};

// Convert hex '#rrggbb' to {r,g,b}
function hexToRgb(hex){
  var n = parseInt(hex.slice(1), 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
// RGB -> HSL
function rgbToHsl(r, g, b){
  r/=255; g/=255; b/=255;
  var max = Math.max(r,g,b), min = Math.min(r,g,b);
  var h, s, l = (max+min)/2;
  if (max===min){ h = s = 0; }
  else {
    var d = max-min;
    s = l > 0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h = (g-b)/d + (g<b?6:0); break;
      case g: h = (b-r)/d + 2; break;
      case b: h = (r-g)/d + 4; break;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l){
  var r, g, b;
  if (s===0){ r = g = b = l; }
  else {
    function hue2rgb(p, q, t){
      if (t<0) t+=1;
      if (t>1) t-=1;
      if (t<1/6) return p + (q-p)*6*t;
      if (t<1/2) return q;
      if (t<2/3) return p + (q-p)*(2/3-t)*6;
      return p;
    }
    var q = l < 0.5 ? l*(1+s) : l+s-l*s;
    var p = 2*l - q;
    r = hue2rgb(p, q, h+1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h-1/3);
  }
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}

// Classify a pixel's body-part category for the player sprite (Player.png).
// Returns 'hair'|'skin'|'clothes'|null.
function classifyPixel(r, g, b){
  var hsl = rgbToHsl(r, g, b);
  var hue = hsl[0], sat = hsl[1], lum = hsl[2];
  // Skip near-black (shadow/outline pixels)
  if (lum < 0.12) return null;
  // Hair: warm brown, mid luminance
  if (hue >= 0.04 && hue <= 0.14 && sat > 0.15 && lum >= 0.12 && lum <= 0.52) return 'hair';
  // Skin: warm peachy, high luminance
  if ((hue < 0.08 || hue > 0.92) && sat > 0.25 && lum > 0.60) return 'skin';
  // Clothes: teal/blue shirt accent OR grey-white shirt body
  if (hue >= 0.48 && hue <= 0.62 && sat > 0.08 && lum > 0.25) return 'clothes';
  if (sat < 0.12 && lum > 0.55) return 'clothes';
  return null;
}

// Recolour the player sprite based on user's chosen palette hexes.
// IMPORTANT: We do not remove + re-add the 'player' texture (that breaks the
// animation system's WebGL texture refs). Instead, we replace the texture's
// source with a canvas ONCE on first call, then repaint that same canvas on
// subsequent calls and tell Phaser the source has changed via refresh().
// Recolour the player sprite based on user's chosen palette hexes.
// Uses Phaser's CanvasTexture API so refresh() actually re-uploads to GPU.
// (addSpriteSheet creates a regular Texture whose refresh() is a no-op for
//  canvas updates — the bug behind earlier failed attempts.)
function applyAppearance(scene){
  // No-op: colour customisation removed. Character selection uses picker.
}

function loadState(){
  ST = defaultState();
  try {
    var raw = localStorage.getItem(LS_KEY);
    if (raw){
      var s = JSON.parse(raw);
      if (s.dp) Object.keys(s.dp).forEach(function(k){ if(k in ST.dp) ST.dp[k]=s.dp[k]; });
      if (s.qz) Object.keys(s.qz).forEach(function(k){ if(k in ST.qz) ST.qz[k]=s.qz[k]; });
      if (s.pr) Object.keys(s.pr).forEach(function(k){ if(k in ST.pr) ST.pr[k]=s.pr[k]; });
      if (s.at) Object.keys(s.at).forEach(function(k){ if(k in ST.at) ST.at[k]=s.at[k]; });
      if (s.mailRead) ST.mailRead = s.mailRead;
      if (s.achievements) ST.achievements = s.achievements;
      if (s.appearance) {
        ['hair','skin','clothes','eyes'].forEach(function(k){
          if (s.appearance[k] !== undefined) ST.appearance[k] = s.appearance[k];
        });
      }
      if (s.skills) {
        Object.keys(s.skills).forEach(function(k){
          if (ST.skills[k] && s.skills[k]){
            // Migrate old {level, xp} -> new {totalXP}
            if (typeof s.skills[k].totalXP === 'number'){
              ST.skills[k].totalXP = s.skills[k].totalXP;
            } else if (typeof s.skills[k].level === 'number' || typeof s.skills[k].xp === 'number'){
              var oldLevel = s.skills[k].level || 0;
              var oldXP    = s.skills[k].xp    || 0;
              var total = 0;
              for (var l=0; l<oldLevel; l++) total += xpForNextLevel(l);
              total += oldXP;
              ST.skills[k].totalXP = total;
            }
          }
        });
      }
      if (s.session !== undefined) ST.session = s.session;
      if (Array.isArray(s.journal)) ST.journal = s.journal;
      if (s.fishCaught && typeof s.fishCaught === 'object') ST.fishCaught = s.fishCaught;
    }
  } catch(e){}
}
function saveState(){
  try { localStorage.setItem(LS_KEY, JSON.stringify(ST)); } catch(e){}
}

// ---- progress helpers -----------------------------------------------------
function moduleProgress(m){
  var total=0, conf=0, prog=0;
  Object.keys(ST.dp).forEach(function(k){
    if (k.indexOf(m+'_')===0){
      total++;
      if (ST.dp[k]==='conf') conf++;
      else if (ST.dp[k]==='prog') prog++;
    }
  });
  return { total:total, conf:conf, prog:prog,
           pct: total>0 ? (conf + prog*0.5)/total : 0 };
}
function moduleConfidentPct(m){
  var p = moduleProgress(m);
  return p.total>0 ? p.conf/p.total : 0;
}
function overallConfidentPct(){
  var total=0, conf=0;
  Object.keys(ST.dp).forEach(function(k){
    total++; if (ST.dp[k]==='conf') conf++;
  });
  return total>0 ? conf/total : 0;
}
function moduleStage(m){
  var p = moduleProgress(m);
  if (p.total===0 || (p.conf===0 && p.prog===0)) return 0;
  if (p.conf===p.total) return 5;
  var pct = p.pct;
  if (pct < 0.2) return 1;
  if (pct < 0.4) return 2;
  if (pct < 0.65) return 3;
  if (pct < 1.0) return 4;
  return 5;
}
function treeStage(){
  var t=0,d=0;
  Object.keys(ST.qz).forEach(function(k){ t++; if(ST.qz[k]) d++; });
  var p = t>0 ? d/t : 0;
  return p===0?0 : p<0.25?1 : p<0.5?2 : p<0.75?3 : p<1?4 : 5;
}
function wellLevel(){
  var t=0,d=0;
  Object.keys(ST.pr).forEach(function(k){ t++; if(ST.pr[k]) d++; });
  return t>0 ? d/t : 0;
}

function checkAchievements(scene){
  CONFIG_ACHIEVEMENTS.forEach(function(a){
    if (ST.achievements.indexOf(a.key)===-1 && a.check(ST)){
      ST.achievements.push(a.key);
      scene.showToast(a.toast);
      saveState();
    }
  });
}

// ============================================================
//  WORLD LAYOUT CONSTANTS (tile coords)
// ============================================================
// Buildings sheet (Buildings32.png, 16x16 of 32px tiles, 512x512)
//   Farmhouse small (red roof): cols 0-3, rows 0-5 -> px(0,0,128,192)
//   Mailbox/noticeboard: col 4, row 0 -> px(128,0,32,32)
// Crops sheet (Crops32.png, 16x16 of 32px tiles)
//   Per-module mature crop tile (col,row):
//     m1 Zucchini = (3,1) ; m2 Cabbage = (3,5) ; m3 Pumpkin = (7,5) ; m4 Tomato = (3,3)
// TerrainA5 sheet (TerrainA5_32.png, 8 wide x 16 tall of 32px tiles, 256x512)
//   Grass plain: (1,0). Grass tufts: (3,0)/(4,0)
//   Sand path 3x3 auto-tile: cols 0-3, rows 1-3 (corners + edges + interior)
//   Waterfall 3x3: cols 5-7 rows 1-6 (anim possible by Y offset; we use static for now)
//   Pure water surface: (4,5) / (4,6)
// Details sheet (Details32.png, 16x16)
//   Fence horizontal plank: (1,1) interior, (0,1) left end, (3,1) right end
//   Fence vertical post: pick (5,1) clean section, (5,0) top cap, (5,3) bottom cap
//   Big green tree (Study Tree): cols 4-6 rows 6-8 -> px(128,192,96,96)
//   Stones, stumps, mushrooms, flowers as decor
// TerrainExpanded sheet (TerrainExpanded32.png, 16x16)
//   Cave entrance: cols 10-12 rows 5-7 -> px(320,160,96,96)

// Position of major structures (tile coords)
// All structures sit inside the fenced area (top fence at row 2, west fence at col 2),
// leaving rows 0-1 and cols 0-1 as grass that's visible-but-unreachable beyond the fence.
var FARMHOUSE = { c:2, r:2, w:7, h:6 };   // cols 3-6, rows 3-8
var NOTICEBOARD = { c:8, r:8 };
var WELL = { c:9, r:9 };
var STUDY_TREE = { c:20, r:11, w:3, h:3 }; // 3x3 footprint (moved 2 cols right to centre on grass patch)
var CAVE = { c:36, r:0, w:3, h:3 };        // top-right, ACROSS the river/waterfall channel

// Garden beds — M1 shifted east to avoid the new west fence
var BED_DEFS = [
  { m:'m1', cropKey:'crop_m1', c1:4,  r1:18, c2:7,  r2:21, title:'M1: CELLS' },
  { m:'m2', cropKey:'crop_m2', c1:26, r1:4,  c2:29, r2:7,  title:'M2: ORGANISATION' },
  { m:'m3', cropKey:'crop_m3', c1:27, r1:17, c2:30, r2:20, title:'M3: DIVERSITY' },
  { m:'m4', cropKey:'crop_m4', c1:13, r1:21, c2:16, r2:24, title:'M4: ECOSYSTEMS' }
];

// Crop tile lookup on Crops32 (each entry is [col,row] in 32px tile units)
// Stages 1-5 map to progressively bigger plant tiles from the same crop's row.
var CROP_TILES = {
  m1: [[0,1],[1,1],[2,1],[3,1],[3,1]],  // zucchini-ish (cols 0-3 row 1)
  m2: [[0,5],[1,5],[2,5],[3,5],[3,5]],  // cabbage (cols 0-3 row 5)
  m3: [[0,7],[1,7],[2,7],[3,7],[3,7]],  // wheat/grain (row 7, distinct from M2 cabbage)
  m4: [[0,3],[1,3],[2,3],[3,3],[3,3]]   // tomato vine (cols 0-3 row 3)
};

// Tile-type map for the ground layer
var T_GRASS=0, T_PATH=1, T_DIRT=2, T_WATER=3, T_WATERFALL=4;

// ============================================================
//  BOOT SCENE — load all assets
// ============================================================
var BootScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function BootScene(){ Phaser.Scene.call(this, { key:'Boot' }); },
  preload: function(){
    var W = this.cameras.main.width, H = this.cameras.main.height;
    var barBg = this.add.rectangle(W/2, H/2, 360, 24, 0x2a1c0a).setStrokeStyle(2, 0x8b6010);
    var bar = this.add.rectangle(W/2-176, H/2, 4, 16, 0x80c040).setOrigin(0,0.5);
    this.add.text(W/2, H/2-40, "MR GLASS' GARDEN", { fontFamily:'monospace', fontSize:'22px', color:'#f0d060' }).setOrigin(0.5);
    var loadTxt = this.add.text(W/2, H/2+40, 'Loading...', { fontFamily:'monospace', fontSize:'12px', color:'#c8a860' }).setOrigin(0.5);
    this.load.on('progress', function(v){ bar.width = 352*v; });
    this.load.on('complete', function(){ loadTxt.setText('Ready!'); });

    var A = 'assets/';
    // New tilesheets (load as images; we slice with placeCrop at runtime)
    this.load.image('ts_buildings', A+'Buildings32.png');
    this.load.image('ts_crops',     A+'Crops32.png');
    this.load.image('ts_terrainA5', A+'TerrainA5_32.png');
    this.load.image('ts_details',   A+'Details32.png');
    this.load.image('ts_terrainEx', A+'TerrainExpanded32.png');
    this.load.image('ts_orchard',   A+'Orchard32.png');
    this.load.image('ts_trees_anim', A+'Trees_animation.png');
    this.load.image('ts_house',      A+'house_details.png');
    this.load.image('ts_plants',    A+'Plants.png');
    this.load.image('ts_grass_at',  A+'Grass_AutoTile.png');
    this.load.image('ts_earth',     A+'Earth.png');
    this.load.image('ts_char_panel',A+'CharacterPanel.png');

    // Footstep sounds — two variants, alternated for natural cadence
    this.load.audio('step1', A+'Step_dirt_1.ogg');
    this.load.audio('step2', A+'Step_dirt_2.ogg');
    this.load.audio('bgmusic', A+'Game song 2.mp3');

    // Existing assets we still use
    this.load.image('gardenbeds', A+'Garden_beds.png');   // soil texture for module beds
    this.load.spritesheet('player', A+'Player.png', { frameWidth:80, frameHeight:80 });
    // Teacher NPC sprite (extracted from the teacher spritesheet, 55x65 cells, 7 cols x 4 rows)
    this.load.spritesheet('water', A+'Water_tile_animation.png', { frameWidth:32, frameHeight:32 });
    this.load.spritesheet('butterfly', A+'White_butterfly_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('bee', A+'Bee_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdfly', A+'Bird_fly.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdtakeoff', A+'Bird_take-off.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('leaves', A+'Leaves.png', { frameWidth:16, frameHeight:16 });
    this.load.image('seedling', A+'Hole_with_a_seedling.png');
    this.load.image('pondborder', A+'PondBorders.png'); // re-used as the well
    // Fishing + botany tool assets
    this.load.image('fish_pack', A+'fish_pack.png');
    this.load.image('ts_tools',  A+'Tools_icons.png');
  },
  create: function(){
    // Strip the near-black background from the new RGB tilesheets so they composite
    // cleanly. Use a vanilla HTMLCanvasElement (no Phaser CanvasTexture intermediate).
    var self = this;
    function keyOut(k){
      var tex = self.textures.get(k);
      if (!tex || typeof tex.getSourceImage !== 'function') return;
      var src = tex.getSourceImage();
      if (!src || !src.width) return;
      var canvas = document.createElement('canvas');
      canvas.width = src.width;
      canvas.height = src.height;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(src, 0, 0);
      var imgd = ctx.getImageData(0, 0, src.width, src.height);
      var d = imgd.data;
      for (var i=0; i<d.length; i+=4){
        if (d[i] + d[i+1] + d[i+2] <= 29) d[i+3] = 0;
      }
      ctx.putImageData(imgd, 0, 0);
      self.textures.remove(k);
      self.textures.addCanvas(k, canvas);
    }
    ['ts_buildings','ts_details','ts_crops','ts_terrainA5','ts_terrainEx','ts_orchard','ts_plants','ts_char_panel','ts_tools','fish_pack'].forEach(keyOut);
    // NOTE: Player.png is RGBA — do NOT run keyOut on it, that strips frames.

    buildAnimations(this);
    applyAppearance(this);
    this.scene.start('Garden');

    // Signal the splash overlay that everything is loaded — enables ENTER button.
    if (typeof window !== 'undefined' && typeof window.markGameReady === 'function'){
      window.markGameReady();
    }
    // Start music when ENTER is clicked on splash (audio context unlocked by then)
    window.__onSplashDismissed = function(){
      if (!window.__phaserGame) return;
      var scenes = window.__phaserGame.scene.scenes;
      for (var si=0; si<scenes.length; si++){
        var sc = scenes[si];
        if (sc.sound && sc.cache && sc.cache.audio && sc.cache.audio.has('bgmusic')){
          if (!sc.bgMusic){
            sc.bgMusic = sc.sound.add('bgmusic',{loop:true,volume:0.20});
            sc.bgMusic.play();
          }
          break;
        }
      }
    };
  }
});

function buildAnimations(scene){
  var anims = scene.anims;
  // Player.png: 80x80px, 6 cols x 8 rows = 48 frames
  function mk(key, frames, rate, repeat){
    if (!anims.exists(key))
      anims.create({ key:key,
        frames: anims.generateFrameNumbers('player', { frames:frames }),
        frameRate: rate, repeat: (repeat===undefined?-1:repeat) });
  }
  mk('idle-down',  [0], 1);
  mk('walk-down',  [6,7,8,9,10,11], 9);
  mk('idle-up',    [12], 1);
  mk('walk-up',    [18,19,20,21,22,23], 9);
  mk('idle-left',  [24], 1);
  mk('walk-left',  [30,31,32,33,34,35], 9);
  mk('idle-right', [36], 1);
  mk('walk-right', [42,43,44,45,46,47], 9);

    if (!anims.exists('water-anim'))
    anims.create({ key:'water-anim',
      frames: anims.generateFrameNumbers('water', { start:0, end:2 }),
      frameRate:4, repeat:-1 });
  if (!anims.exists('butterfly-fly'))
    anims.create({ key:'butterfly-fly',
      frames: anims.generateFrameNumbers('butterfly', { start:0, end:2 }),
      frameRate:8, repeat:-1 });
  if (!anims.exists('bee-fly'))
    anims.create({ key:'bee-fly',
      frames: anims.generateFrameNumbers('bee', { start:0, end:2 }),
      frameRate:10, repeat:-1 });
  if (!anims.exists('bird-fly'))
    anims.create({ key:'bird-fly',
      frames: anims.generateFrameNumbers('birdfly', { start:0, end:3 }),
      frameRate:8, repeat:-1 });
  if (!anims.exists('bird-takeoff'))
    anims.create({ key:'bird-takeoff',
      frames: anims.generateFrameNumbers('birdtakeoff', { start:0, end:4 }),
      frameRate:10, repeat:0 });
}

// ============================================================
//  GARDEN SCENE
// ============================================================
var GardenScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function GardenScene(){ Phaser.Scene.call(this, { key:'Garden' }); },

  create: function(){
    var self = this;
    this.fc = 0;

    this.buildGround();
    this.buildBorders();      // fences along top + left
    this.buildStructures();   // farmhouse, study tree, cave, noticeboard, well
    this.buildBeds();
    this.buildDecorations();
    this.buildCreatures();
    this.buildPlayer();
    this.buildFarmer();
    this.buildInteractables();
    this.buildHUD();

    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE,ESC');
    this.input.keyboard.on('keydown-E', function(){ self.tryInteract(); });
    this.input.keyboard.on('keydown-ESC', function(){ closeModal(); });

    if (ST.mailRead.indexOf('greeted')===-1){
      this.time.delayedCall(400, function(){ self.showToast('Welcome to the garden!'); });
    } else {
      this.showToast('Welcome back!');
    }
    // Initialise grass vibrancy based on current progress
    this._lastVibrancyStage = -1;
    this._vibrancyFlowers = [];
    this.refreshGrassVibrancy();
  },

  // ============================================================
  //  GROUND LAYER
  // ============================================================
  buildGround: function(){
    var TM = [];
    for (var r=0;r<MAP_H;r++){ TM.push([]); for (var c=0;c<MAP_W;c++) TM[r].push(T_GRASS); }

    // ---- River — soft meander from top to bottom of map ----
    // Centreline column is a smooth ease-in-out curve:
    //   rows  0- 6: col 34 (exits top border — implies river flowing from off-screen north)
    //   rows  6-12: curves right to col 36
    //   rows 12-18: straight at col 36
    //   rows 18-26: curves back left to col 33
    // River is 3 tiles wide (centre ± 1). Cave stays at cols 36-38 rows 0-2, clear of water.
    function riverCentreCol(r){
      if (r <= 6) return 34.0;
      if (r <= 12){ var t=(r-6)/6.0; t=t*t*(3-2*t); return 34.0 + t*2.0; }
      if (r <= 18) return 36.0;
      if (r <= 26){ var t=(r-18)/8.0; t=t*t*(3-2*t); return 36.0 - t*3.0; }
      return 33.0;
    }
    for (var r=0; r<=26; r++){
      var cx = riverCentreCol(r);
      for (var offset=-1; offset<=1; offset++){
        var c = Math.round(cx) + offset;
        if (c >= 0 && c < MAP_W) TM[r][c] = T_WATER;
      }
    }
    // Horizontal river across the bottom: rows 27-29 full width
    for (var r=27; r<=29; r++){
      for (var c=0; c<=39; c++) TM[r][c] = T_WATER;
    }
    // Bottom-left pond
    for (var rr=22; rr<=29; rr++){
      for (var cc=0; cc<=9; cc++){
        var d = Math.hypot((cc-4)*1.0, (rr-26)*1.1);
        if (d < 6 || rr >= 27) TM[rr][cc] = T_WATER;
      }
    }

    // ---- Path network (2-tile-wide so grass-edge autotile encroaches on both sides) ----
    function p(c, r){ if (r>=0 && r<MAP_H && c>=0 && c<MAP_W && TM[r][c] === T_GRASS) TM[r][c] = T_PATH; }
    function pathRect(c1, c2, r1, r2){
      for (var r=r1; r<=r2; r++) for (var c=c1; c<=c2; c++) p(c, r);
    }

    // Centre ring (2 thick) around Study Tree at cols 20-22 rows 11-13
    pathRect(18, 24,  9, 10);    // N strip
    pathRect(18, 24, 14, 15);    // S strip
    pathRect(18, 19, 11, 13);    // W side
    pathRect(23, 24, 11, 13);    // E side

    // Upper E-W corridor: south of farmhouse to centre ring
    pathRect(6, 24,  9, 10);

    // Lower E-W corridor: extends east toward cave river edge
    pathRect(6, 32, 14, 15);

    // Vertical "lung" linking upper to lower west of tree
    pathRect(6, 7, 11, 13);

    // South vertical down to M1 bed (cols 4-7 rows 18-21)
    pathRect(6, 7, 16, 17);

    // M4 bed at cols 13-16 rows 21-24 — route south from the centre-ring west side,
    // then bend west to meet the bed's north edge.
    pathRect(13, 19, 19, 20);    // south of centre, going west toward M4 col 13

    // Upper-corridor north spur to M2 bed (cols 26-29 rows 4-7)
    pathRect(24, 25, 6, 8);

    // Lower-corridor south spur to M3 bed (cols 27-30 rows 17-20)
    pathRect(25, 26, 16, 17);

    // Cave-side path (far bank, unreachable across river)
    // River reaches col 37 in the meander middle, so cave path starts at col 38
    pathRect(38, 39,  3, 26);
    pathRect(37, 39,  3,  4);

    // ---- Perimeter paths around each garden bed (1 tile wide outside each bed) ----
    // North and south sides, then west and east sides. p() skips T_DIRT so the bed
    // interior is never overwritten. The perimeter also bridges any gap between the
    // existing network spurs and the bed edges.
    //
    // M1 (cols 4-7, rows 18-21): connect from vertical spur (cols 6-7 rows 16-17)
    pathRect(3,  8, 17, 17);   // N side of M1
    pathRect(3,  8, 22, 22);   // S side of M1
    pathRect(3,  3, 17, 22);   // W side of M1
    pathRect(8,  8, 17, 22);   // E side of M1

    // M2 (cols 26-29, rows 4-7): connect from spur (cols 24-25, rows 6-8)
    pathRect(25, 30, 3,  3);   // N side of M2
    pathRect(25, 30, 8,  8);   // S side of M2 — also bridges spur col 25 to bed col 26
    pathRect(25, 25, 3,  8);   // W side of M2
    pathRect(30, 30, 3,  8);   // E side of M2

    // M3 (cols 27-30, rows 17-20): connect from lower-corridor spur (cols 25-26, rows 16-17)
    pathRect(26, 31, 16, 16);  // N side of M3 — extends spur east to col 26+
    pathRect(26, 31, 21, 21);  // S side of M3
    pathRect(26, 26, 16, 21);  // W side of M3
    pathRect(31, 31, 16, 21);  // E side of M3

    // M4 (cols 13-16, rows 21-24): connect from M4 corridor (cols 13-19, rows 19-20)
    pathRect(12, 17, 20, 20);  // N side of M4
    pathRect(12, 17, 25, 25);  // S side of M4
    pathRect(12, 12, 20, 25);  // W side of M4
    pathRect(17, 17, 20, 25);  // E side of M4

    // ---- Garden bed soil overrides path/grass ----
    BED_DEFS.forEach(function(b){
      for (var r=b.r1;r<=b.r2;r++) for (var c=b.c1;c<=b.c2;c++) TM[r][c] = T_DIRT;
    });

    this.TM = TM;
    this.renderGroundCanvas();
  },

  renderGroundCanvas: function(){
    var TM = this.TM;
    var key = 'groundtex';
    var cnv = this.textures.createCanvas(key, WORLD_W, WORLD_H);
    var ctx = cnv.getContext();
    ctx.imageSmoothingEnabled = false;
    var TS = 32;

    var terrA5 = this.textures.get('ts_terrainA5').getSourceImage();
    var gardenbeds = this.textures.get('gardenbeds').getSourceImage(); // soil texture
    var grassAT = this.textures.get('ts_grass_at').getSourceImage();   // 4×4 grass autotile
    var earthImg = this.textures.get('ts_earth').getSourceImage();     // 2×1 earth variants

    function drawA5(sc, sr, dx, dy){
      ctx.drawImage(terrA5, sc*TS, sr*TS, TS, TS, dx, dy, TS, TS);
    }
    function drawSoil(sc, sr, dx, dy){
      ctx.drawImage(gardenbeds, sc*16, sr*16, 16, 16, dx, dy, TS, TS);
    }
    // Earth tile: 2 variants horizontally
    function drawEarth(dx, dy){
      var h = ((dx*1597334677) ^ (dy*3812015801)) >>> 0;
      var variant = h % 2;
      ctx.drawImage(earthImg, variant*32, 0, 32, 32, dx, dy, TS, TS);
    }
    // Grass autotile: pick the right 32×32 cell from a 4×4 sheet (positions defined below)
    var GRASS_TILES = {
      nw:   [0, 0],   n:   [1, 0],   ne:  [2, 0],   uL:  [3, 0],
      w:    [0, 1],   c0:  [1, 1],   e:   [2, 1],   uR:  [3, 1],
      sw:   [0, 2],   s:   [1, 2],   se:  [2, 2],   dL:  [3, 2],
      c1:   [0, 3],   c2:  [1, 3],   c3:  [2, 3],   dR:  [3, 3]
    };
    function drawGrassTile(name, dx, dy){
      var p = GRASS_TILES[name];
      ctx.drawImage(grassAT, p[0]*TS, p[1]*TS, TS, TS, dx, dy, TS, TS);
    }
    function isGrass(c, r){
      if (r<0 || r>=MAP_H || c<0 || c>=MAP_W) return true;
      var t = TM[r][c];
      // Treat water, path, and bed-dirt as grass so adjacent grass tiles
      // use interior (solid) autotile variants — no colour mismatch or edge fringing.
      if (t === T_WATER || t === T_WATERFALL) return true;
      if (t === T_PATH  || t === T_DIRT)      return true;
      return t === T_GRASS;
    }
    function pickGrass(c, r){
      var hN = !isGrass(c, r-1);
      var hS = !isGrass(c, r+1);
      var hW = !isGrass(c-1, r);
      var hE = !isGrass(c+1, r);
      // Convex (outer) corners — two orthogonal neighbours are non-grass.
      // These use the uL/uR/dL/dR sheet cells which hold the rounded corner sprites.
      // (The nw/ne/sw/se cells at [0,0],[2,0],[0,2],[2,2] are the concave inner-corner
      //  sprites used when a diagonal-only neighbour is non-grass.)
      if (hN && hW) return 'uL';
      if (hN && hE) return 'uR';
      if (hS && hW) return 'dL';
      if (hS && hE) return 'dR';
      // Edges
      if (hN) return 'n';
      if (hS) return 's';
      if (hW) return 'w';
      if (hE) return 'e';
      // Concave (inner) corners — all 4 orthogonal are grass, but a diagonal is non-grass.
      // These use nw/ne/sw/se which hold the small inner-bite corner sprites.
      var dNW = !isGrass(c-1, r-1);
      var dNE = !isGrass(c+1, r-1);
      var dSW = !isGrass(c-1, r+1);
      var dSE = !isGrass(c+1, r+1);
      if (dNW) return 'nw';
      if (dNE) return 'ne';
      if (dSW) return 'sw';
      if (dSE) return 'se';
      // Pure interior — randomise across 4 variants for visual texture
      var h = ((c*2654435761) ^ (r*2246822519)) >>> 0;
      return ['c0','c1','c2','c3'][h % 4];
    }

    // ---- PATHS (earth) — flat earth tile, deterministic per-position variant ----
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_PATH){
        drawEarth(c*TS, r*TS);
      }
    }

    // ---- GARDEN BED SOIL ----
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_DIRT){
        var hh = ((c*1597334677)^(r*3812015801))>>>0;
        drawSoil(hh % 3, hh % 2, c*TS, r*TS);
      }
    }

    // ---- GRASS — autotile overlay on top of earth.
    // Edge/corner grass tiles are partially transparent so the underlying earth
    // shows through, creating the natural grass-encroaching-on-path look.
    // For tiles that have a non-grass neighbour, draw earth FIRST so it shows.
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] !== T_GRASS) continue;
      var pick = pickGrass(c, r);
      var isInterior = (pick === 'c0' || pick === 'c1' || pick === 'c2' || pick === 'c3');
      if (!isInterior){
        // Draw earth underneath so the transparent edges of the grass tile reveal it
        drawEarth(c*TS, r*TS);
      }
      drawGrassTile(pick, c*TS, r*TS);
    }

    // ---- WATER base colour (animated sprites layered on top) — darker for contrast with rock rim ----
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_WATER || TM[r][c] === T_WATERFALL){
        ctx.fillStyle = '#2e6ba0';
        ctx.fillRect(c*TS, r*TS, TS, TS);
      }
    }

    // ---- Water border tiles using TerrainExpanded 9-cell autotile (cols 0-2, rows 8-10) ----
    //   (0,8)=NW corner, (1,8)=N edge,    (2,8)=NE corner
    //   (0,9)=W edge,    (1,9)=interior, (2,9)=E edge
    //   (0,10)=SW corner,(1,10)=S edge,   (2,10)=SE corner
    function isWater(c, r){
      if (r<0||r>=MAP_H||c<0||c>=MAP_W) return false;
      return TM[r][c] === T_WATER || TM[r][c] === T_WATERFALL;
    }
    function drawEx(sc, sr, dx, dy){
      ctx.drawImage(terrEx, sc*TS, sr*TS, TS, TS, dx, dy, TS, TS);
    }
    var terrEx = this.textures.get('ts_terrainEx').getSourceImage();
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] !== T_WATER) continue;
      var n = !isWater(c, r-1);
      var s = !isWater(c, r+1);
      var e = !isWater(c+1, r);
      var w = !isWater(c-1, r);
      // Pick the autotile cell: column is W/E based, row is N/S based
      var sc = w ? 0 : (e ? 2 : 1);
      var sr = n ? 8 : (s ? 10 : 9);
      // Only draw if this is an edge tile (skip pure interior to keep the animated water visible)
      if (n || s || e || w){
        drawEx(sc, sr, c*TS, r*TS);
      }
    }

    // ---- Water INTERIOR (no animation) — same texture as the borders for visual continuity ----
    // TerrainExpanded (1, 9) is the interior fill that matches the rim tiles.
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] !== T_WATER) continue;
      var isInterior = isWater(c, r-1) && isWater(c, r+1) && isWater(c-1, r) && isWater(c+1, r);
      if (isInterior) drawEx(1, 9, c*TS, r*TS);
    }

    // ---- Concave (inner) corners — where water has a non-water DIAGONAL neighbour
    // but all 4 orthogonal neighbours are water. Without these, the rim looks
    // like a hard-cut square. We draw small procedural stone arcs in the corner.
    function drawConcaveCorner(corner, cx, cy){
      // Outer stone
      ctx.fillStyle = '#48485a';
      ctx.beginPath();
      if (corner === 'NW'){
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 10, cy);
        ctx.quadraticCurveTo(cx + 3, cy + 3, cx, cy + 10);
      } else if (corner === 'NE'){
        ctx.moveTo(cx + TS, cy);
        ctx.lineTo(cx + TS - 10, cy);
        ctx.quadraticCurveTo(cx + TS - 3, cy + 3, cx + TS, cy + 10);
      } else if (corner === 'SW'){
        ctx.moveTo(cx, cy + TS);
        ctx.lineTo(cx + 10, cy + TS);
        ctx.quadraticCurveTo(cx + 3, cy + TS - 3, cx, cy + TS - 10);
      } else { // SE
        ctx.moveTo(cx + TS, cy + TS);
        ctx.lineTo(cx + TS - 10, cy + TS);
        ctx.quadraticCurveTo(cx + TS - 3, cy + TS - 3, cx + TS, cy + TS - 10);
      }
      ctx.closePath();
      ctx.fill();
      // Lighter highlight on the stone
      ctx.fillStyle = '#7a7a8c';
      ctx.beginPath();
      if (corner === 'NW'){
        ctx.moveTo(cx + 1, cy + 1);
        ctx.lineTo(cx + 6, cy + 1);
        ctx.quadraticCurveTo(cx + 2, cy + 2, cx + 1, cy + 6);
      } else if (corner === 'NE'){
        ctx.moveTo(cx + TS - 1, cy + 1);
        ctx.lineTo(cx + TS - 6, cy + 1);
        ctx.quadraticCurveTo(cx + TS - 2, cy + 2, cx + TS - 1, cy + 6);
      } else if (corner === 'SW'){
        ctx.moveTo(cx + 1, cy + TS - 1);
        ctx.lineTo(cx + 6, cy + TS - 1);
        ctx.quadraticCurveTo(cx + 2, cy + TS - 2, cx + 1, cy + TS - 6);
      } else {
        ctx.moveTo(cx + TS - 1, cy + TS - 1);
        ctx.lineTo(cx + TS - 6, cy + TS - 1);
        ctx.quadraticCurveTo(cx + TS - 2, cy + TS - 2, cx + TS - 1, cy + TS - 6);
      }
      ctx.closePath();
      ctx.fill();
    }
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] !== T_WATER) continue;
      // Only check tiles where ALL 4 orthogonal neighbours are water (otherwise
      // the edge tiles already handle the rendering).
      var allOrth = isWater(c, r-1) && isWater(c, r+1) && isWater(c-1, r) && isWater(c+1, r);
      if (!allOrth) continue;
      if (!isWater(c-1, r-1)) drawConcaveCorner('NW', c*TS, r*TS);
      if (!isWater(c+1, r-1)) drawConcaveCorner('NE', c*TS, r*TS);
      if (!isWater(c-1, r+1)) drawConcaveCorner('SW', c*TS, r*TS);
      if (!isWater(c+1, r+1)) drawConcaveCorner('SE', c*TS, r*TS);
    }

    // ---- Path edge shadow (small drop into grass) ----
    ctx.fillStyle='rgba(0,0,0,0.22)';
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_PATH){
        var above = r>0 ? TM[r-1][c] : T_GRASS;
        if (above===T_GRASS) ctx.fillRect(c*TS, r*TS, TS, 3);
      }
    }

    cnv.refresh();
    this.add.image(0,0,key).setOrigin(0,0).setDepth(0);

    this.waterTiles = [];   // legacy reference; no animated tiles in this build
    // (No waterfall band — the river is open at the world border.)
  },

  // ============================================================
  //  Helper to extract a sub-region of a loaded image as a sprite
  // ============================================================
  _placeCropImage: function(key, sx, sy, sw, sh, wx, wy, dw, dh, depth){
    var tex = this.textures.get(key);
    if (!tex) return null;
    var img = tex.getSourceImage();
    if (!img) return null;
    var tkey = key+'_'+sx+'_'+sy+'_'+sw+'_'+sh;
    if (!this.textures.exists(tkey)){
      // Use a plain HTMLCanvasElement + addCanvas (NOT createCanvas).
      // createCanvas produces a Phaser CanvasTexture whose __BASE frame has
      // null data, causing setSizeToFrame to crash. addCanvas produces a
      // regular image-backed Texture with valid frame data.
      var c = document.createElement('canvas');
      c.width = sw; c.height = sh;
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      this.textures.addCanvas(tkey, c);
    }
    var spr = this.add.image(wx, wy, tkey).setOrigin(0.5, 1);
    if (dw) spr.setDisplaySize(dw, dh);
    spr.setDepth(depth !== undefined ? depth : wy);
    return spr;
  },

  // ============================================================
  //  BORDERS: fence along top and left edges (player-blocking)
  // ============================================================
  buildBorders: function(){
    var TS = TILE;
    // Horizontal picket fence (Details32 col 6 row 1) for the TOP fence — multiple
    // pickets with horizontal rails; matches the picket-fence look exactly.
    var fenceH_sx = 6*TS, fenceH_sy = 1*TS;
    // Vertical single-post fence (Details32 col 4 row 1) for the WEST fence
    var fenceV_sx = 4*TS, fenceV_sy = 1*TS;

    // Top fence: row 2, cols 2..32 (rows 0-1 stay grass to suggest world continues north)
    for (var c=2; c<=32; c++){
      this._placeCropImage('ts_details', fenceH_sx, fenceH_sy, TS, TS,
        c*TS + TS/2, 2*TS + TS, TS, TS, 2*TS + TS + 1);
    }
    // West fence: col 2, rows 3..21 (cols 0-1 stay grass to suggest world continues west)
    for (var r=3; r<=21; r++){
      this._placeCropImage('ts_details', fenceV_sx, fenceV_sy, TS, TS,
        2*TS + TS/2, r*TS + TS, TS, TS, r*TS + TS + 1);
    }

    // ---- Forest scatter BEYOND the fences (rows 0-1 above top fence, cols 0-1 west of west fence) ----
    // Fir trees, mushrooms, and boulders — no shrubs. Sparse, organic forest edge.
    var FOREST = [
      // Fir trees from Details32 (cols 1-3 rows 9-11, 96x96) — dominant element
      { type:'fir',      sx: 32,    sy: 288,  sw: 96, sh: 96, dispW: 2.4,  dispH: 3.2,  weight: 30 },
      // Mushrooms from Details32 col 0 row 4
      { type:'mushroom', sx: 0,     sy: 4*32, sw: 32, sh: 32, dispW: 0.7,  dispH: 0.7,  weight: 20 },
      // Boulders from Details32 (cols 1-3 row 4)
      { type:'boulder',  sx: 1*32,  sy: 4*32, sw: 32, sh: 32, dispW: 0.95, dispH: 0.95, weight: 15 },
      { type:'boulder',  sx: 2*32,  sy: 4*32, sw: 32, sh: 32, dispW: 0.95, dispH: 0.95, weight: 15 }
    ];
    var totalWeight = 0;
    FOREST.forEach(function(f){ totalWeight += f.weight; });
    function pickForest(h){
      var roll = h % totalWeight, acc = 0;
      for (var i=0; i<FOREST.length; i++){
        acc += FOREST[i].weight;
        if (roll < acc) return FOREST[i];
      }
      return FOREST[0];
    }
    function shrubHash(c, r, salt){
      var h = c * 2654435761;
      h = (h ^ (r * 2246822519)) >>> 0;
      h = (h ^ salt) >>> 0;
      return h;
    }
    function placeForestItem(c, r, salt){
      // Never place forest items on water tiles — the waterfall/stream must
      // extend cleanly to the world border without trees/boulders on top of it.
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) return;
      var tm = this.TM;
      if (tm && (tm[r][c] === T_WATER || tm[r][c] === T_WATERFALL)) return;
      var h = shrubHash(c, r, salt);
      // Only place ~70% of cells — gives breathing room between firs/mushrooms/boulders
      if ((h % 100) < 30) return;
      var f = pickForest(h);
      var jx = ((h >>> 5) % 11) - 5;
      var jy = ((h >>> 9) % 7) - 3;
      var wx = c*TS + TS/2 + jx;
      var wy = r*TS + TS + jy;
      // Optional ground shadow for taller items — at middle of trunk
      if (f.type === 'fir'){
        var trunkMidY = wy - (TS * f.dispH * 0.12);
        var sg = this.add.graphics().setDepth(wy - 1);
        sg.fillStyle(0x000000, 0.40);
        sg.fillEllipse(wx, trunkMidY, TS * f.dispW * 0.45, 7);
      } else if (f.type === 'boulder'){
        var sg2 = this.add.graphics().setDepth(wy - 1);
        sg2.fillStyle(0x000000, 0.35);
        sg2.fillEllipse(wx, wy - 3, TS * f.dispW * 0.55, 5);
      }
      this._placeCropImage('ts_details', f.sx, f.sy, f.sw, f.sh,
        wx, wy, TS * f.dispW, TS * f.dispH, wy);
      // Collision: firs and boulders block (mushrooms are decoration only).
      // These trees/boulders sit beyond the fences anyway, but the colliders
      // also prevent any future glitching through the fence corners.
      if (f.type === 'fir'){
        this.treeColliders = this.treeColliders || [];
        this.treeColliders.push({ x: wx - 8, y: wy - 10, w: 16, h: 10 });
      } else if (f.type === 'boulder'){
        this.treeColliders = this.treeColliders || [];
        this.treeColliders.push({ x: wx - 12, y: wy - 12, w: 24, h: 12 });
      }
    }
    var placeFn = placeForestItem.bind(this);

    // Top band: rows 0-1, cols 0-34
    for (var r=0; r<=1; r++){
      for (var c=0; c<=34; c++){
        placeFn(c, r, 0x12C0FFEE);
      }
    }
    // West band: cols 0-1, rows 2-23
    for (var c=0; c<=1; c++){
      for (var r=2; r<=23; r++){
        placeFn(c, r, 0x1DEAD2);
      }
    }
  },

  // ============================================================
  //  STRUCTURES: farmhouse, noticeboard, well, study tree, cave
  // ============================================================
  buildStructures: function(){
    var self = this;
    var TS = TILE;

    // Helper to drop an elliptical ground shadow (used for trees/decor)
    function shadow(wx, wy, w, h){
      var g = self.add.graphics().setDepth(wy - 1);
      g.fillStyle(0x000000, 0.45);
      g.fillEllipse(wx, wy - 2, w, h);
      return g;
    }
    // Square shadow for buildings — drawn slightly behind (north-east).
    // Procedurally generated rectangle with soft outer fade.
    function buildingShadow(bx, by, bw, bh, offsetX, offsetY){
      var g = self.add.graphics().setDepth(by + bh - 1);
      // Outer soft ring
      g.fillStyle(0x000000, 0.18);
      g.fillRect(bx + offsetX - 4, by + offsetY - 4, bw + 8, bh + 8);
      // Inner darker rectangle
      g.fillStyle(0x000000, 0.36);
      g.fillRect(bx + offsetX, by + offsetY, bw, bh);
      return g;
    }

    // ---- FARMHOUSE (top-left) ----
    // Source: Buildings32 cols 0-3 rows 0-5 = px(0,0,128,192). 4 tiles wide.
    var fhPxX = (FARMHOUSE.c) * TS;
    var fhPxY = (FARMHOUSE.r) * TS;
    var fhW = FARMHOUSE.w * TS, fhH = FARMHOUSE.h * TS;
    // Procedural shadow that follows the sun. Updated each frame in updateSunShadow().
    // Sun rises in the east, sets in the west — so shadow points opposite.
    this._farmhouseShadowMeta = { x: fhPxX, y: fhPxY, w: fhW, h: fhH };
    this._farmhouseShadow = self.add.graphics().setDepth(fhPxY + fhH - 1);
    this.refreshSunShadow();
    // ---- Procedural house matching upload 2 reference ----
    // Drawn entirely with Graphics — no external asset needed.
    (function drawHouse(){
      var hg = self.add.graphics().setDepth(fhPxY + fhH);
      var x = fhPxX, y = fhPxY, w = fhW, h = fhH;
      var mx = x + w/2;  // horizontal centre

      // --- Foundation pebble path (stone surround at base) ---
      hg.fillStyle(0xc0b4a0, 1);
      hg.fillRect(x - 4, y + h*0.62, w + 8, h*0.38 + 4);
      // pebble texture dots
      hg.fillStyle(0xa89880, 0.5);
      for (var pi = 0; pi < 18; pi++){
        var px2 = x + 4 + ((pi * 37) % (w - 8));
        var py2 = y + h*0.66 + ((pi * 19) % Math.round(h*0.28));
        hg.fillCircle(px2, py2, 2 + (pi%3));
      }

      // --- Stone wall facade ---
      hg.fillStyle(0x7a8898, 1);
      hg.fillRect(x + 2, y + h*0.44, w - 4, h*0.38);
      // Stone blocks texture
      hg.lineStyle(1, 0x606878, 0.7);
      var blockH = 8, rowCount = Math.floor(h*0.38/blockH);
      for (var row = 0; row < rowCount; row++){
        var ry2 = y + h*0.44 + row*blockH;
        var offset = (row % 2) * 14;
        for (var bx = x+2; bx < x+w-4; bx += 28){
          hg.strokeRect(bx + offset, ry2, 28, blockH);
        }
      }

      // --- Cream/beige gable below roof peak ---
      hg.fillStyle(0xe8d8b4, 1);
      hg.fillRect(x + 4, y + h*0.22, w - 8, h*0.24);

      // --- Red tiled roof (main body — trapezoid shape) ---
      hg.fillStyle(0x9e3030, 1);
      hg.fillTriangle(
        mx, y + 2,              // peak
        x - 6, y + h*0.44,     // left eave
        x + w + 6, y + h*0.44  // right eave
      );
      // Roof tile rows (darker lines)
      hg.lineStyle(1, 0x7a2020, 0.6);
      var roofH = h*0.42;
      for (var ti = 1; ti < 7; ti++){
        var tFrac = ti / 7;
        var tY = y + 2 + tFrac * roofH;
        var tSpread = tFrac * (w/2 + 6);
        hg.beginPath();
        hg.moveTo(mx - tSpread, tY);
        hg.lineTo(mx + tSpread, tY);
        hg.strokePath();
      }
      // Roof ridge cap (cream strip at peak)
      hg.fillStyle(0xe8d8b4, 1);
      hg.fillRect(mx - 6, y, 12, 12);

      // --- Chimney (left side, slightly above roof line) ---
      hg.fillStyle(0x506070, 1);
      hg.fillRect(x + w*0.22 - 8, y - 14, 16, h*0.28);
      // chimney top cap
      hg.fillStyle(0x404858, 1);
      hg.fillRect(x + w*0.22 - 10, y - 16, 20, 5);
      // chimney smoke hole
      hg.fillStyle(0x202830, 1);
      hg.fillRect(x + w*0.22 - 5, y - 14, 10, 4);

      // --- Eave overhang (cream strip along roof base) ---
      hg.fillStyle(0xddd0b8, 1);
      hg.fillRect(x - 4, y + h*0.42, w + 8, 8);

      // --- Three windows (evenly spaced, warm blue frames) ---
      var winY = y + h*0.50, winW = Math.round(w*0.14), winH2 = Math.round(h*0.20);
      var winPositions = [x + w*0.18, x + w*0.46, x + w*0.74];
      winPositions.forEach(function(wx2){
        // Window frame (brown wood)
        hg.fillStyle(0x8b5a2a, 1);
        hg.fillRect(wx2 - winW/2 - 2, winY - 2, winW + 4, winH2 + 4);
        // Window glass (blue)
        hg.fillStyle(0x7090b8, 1);
        hg.fillRect(wx2 - winW/2, winY, winW, winH2);
        // Window cross (divider)
        hg.fillStyle(0x8b5a2a, 1);
        hg.fillRect(wx2 - 1, winY, 2, winH2);
        hg.fillRect(wx2 - winW/2, winY + winH2/2 - 1, winW, 2);
        // Window highlight
        hg.fillStyle(0xaaccee, 0.5);
        hg.fillRect(wx2 - winW/2 + 2, winY + 2, winW/2 - 3, winH2/2 - 3);
      });

      // --- Arched door (right of centre) ---
      var dX = x + w*0.70, dW = Math.round(w*0.15), dH = Math.round(h*0.28);
      var dY = y + h*0.55;
      // Door frame
      hg.fillStyle(0x6a3a10, 1);
      hg.fillRect(dX - dW/2 - 2, dY - 2, dW + 4, dH + 2);
      // Door arch (top rounded part)
      hg.fillCircle(dX, dY, dW/2 + 2);
      // Door fill
      hg.fillStyle(0x8b5a22, 1);
      hg.fillRect(dX - dW/2, dY, dW, dH);
      hg.fillCircle(dX, dY, dW/2);
      // Door planks (vertical lines)
      hg.lineStyle(1, 0x6a3a10, 0.5);
      hg.beginPath(); hg.moveTo(dX, dY - dW/2); hg.lineTo(dX, dY + dH); hg.strokePath();
      hg.beginPath(); hg.moveTo(dX - dW/4, dY); hg.lineTo(dX - dW/4, dY+dH); hg.strokePath();
      hg.beginPath(); hg.moveTo(dX + dW/4, dY); hg.lineTo(dX + dW/4, dY+dH); hg.strokePath();
      // Door handle
      hg.fillStyle(0xc8a030, 1);
      hg.fillCircle(dX + dW/2 - 5, dY + dH*0.5, 3);
    })();

    // ---- NOTICEBOARD (mailbox replacement next to farmhouse) ----
    // Source: Buildings32 col 4 row 0 = px(128,0,32,32)
    var nbX = NOTICEBOARD.c * TS, nbY = NOTICEBOARD.r * TS;
    shadow(nbX + TS/2, nbY + TS, TS*0.7, 8);
    this._placeCropImage('ts_buildings', 128, 0, 32, 32,
      nbX + TS/2, nbY + TS, TS, TS, nbY + TS);

    // (Well removed — practicals tracker is now part of the Farmhouse interaction.)

    // ---- STUDY TREE (centre of map) — apple tree from Orchard tileset.
    //      Largest tree when fully grown. Base sits at the centre of the path-ring
    //      square (middle row of the 3x3 footprint, NOT the bottom — gives the
    //      canopy room to extend symmetrically above and below).
    var stX = STUDY_TREE.c * TS, stY = STUDY_TREE.r * TS;
    var stW = STUDY_TREE.w * TS, stH = STUDY_TREE.h * TS;
    var centreX = stX + stW/2;
    var baseY = stY + stH/2 + TS/2;   // bottom of MIDDLE row = centre of square
    this.studyTreeSprite = null;
    this.studyTreeShadow = null;
    this.studyTreeCentreX = centreX;
    this.studyTreeBaseY   = baseY;
    this.studyTreeMaxW    = TS * 3.8;
    this.studyTreeMaxH    = TS * 4.5;
    this._buildStudyTreeAtlas();
    this.refreshStudyTree();

    // ---- CAVE (top-right, beyond river) ----
    var cvX = CAVE.c * TS, cvY = CAVE.r * TS;
    var cvW = CAVE.w * TS, cvH = CAVE.h * TS;
    shadow(cvX + cvW/2, cvY + cvH + 2, cvW*0.85, 12);
    // Source: TerrainExpanded cols 10-12 rows 5-7 -> px(320,160,96,96)
    this._placeCropImage('ts_terrainEx', 320, 160, 96, 96,
      cvX + cvW/2, cvY + cvH, cvW, cvH, cvY + cvH);
  },

  _buildStudyTreeAtlas: function(){
    if (this.textures.exists('study_tree_atlas') || !this.textures.exists('ts_trees_anim')) return;
    var src = this.textures.get('ts_trees_anim').getSourceImage();
    if (!src || !src.width) return;
    var FW=64, FH=104, N=10;
    var atlas = this.textures.createCanvas('study_tree_atlas', FW, FH*N);
    var ctx = atlas.getContext();
    for (var i=0;i<N;i++) ctx.drawImage(src,192,i*FH,FW,FH,0,i*FH,FW,FH);
    for (var fi=0;fi<N;fi++) atlas.add(fi,0,0,fi*FH,FW,FH);
    atlas.refresh();
  },

  refreshSunShadow: function(){
    var meta = this._farmhouseShadowMeta;
    var g = this._farmhouseShadow;
    if (!meta || !g) return;
    // Map current real-time to a sun angle.
    // 6am-6pm = visible day; 12pm = sun directly overhead (shadow shortest, south).
    // Use a 24h cycle but only the daytime portion is visible; outside daytime we
    // draw a small twilight shadow.
    var now = new Date();
    var hour = now.getHours() + now.getMinutes()/60;   // 0..24
    var dayPhase;     // 0 = sunrise (east), 0.5 = noon, 1 = sunset (west)
    var visible;
    if (hour < 6 || hour >= 18){
      // Night — keep a faint shadow due south
      dayPhase = 0.5;
      visible = 0.18;
    } else {
      dayPhase = (hour - 6) / 12;   // 6am→0, noon→0.5, 6pm→1
      visible = 1.0;
    }
    // Sun azimuth angle in radians: at sunrise sun is east, so shadow is west.
    // dayPhase 0 → shadow angle = west (PI), 0.5 → south (PI/2), 1 → east (0)
    var shadowAngle = Math.PI - dayPhase * Math.PI;
    // Sun elevation: lowest at sunrise/sunset, highest at noon.
    // Affects shadow LENGTH — long at edges of day, short at noon.
    var sunElevation = Math.sin(dayPhase * Math.PI);  // 0..1
    var shadowLength = (1.2 - sunElevation * 0.7);    // 0.5 at noon, 1.2 at dawn/dusk
    var offsetMag = meta.w * 0.55 * shadowLength;
    var dx = Math.cos(shadowAngle) * offsetMag;
    var dy = Math.sin(shadowAngle) * offsetMag * 0.35; // squash vertically (ground)

    g.clear();
    var alpha = 0.32 * visible;
    g.fillStyle(0x000000, alpha * 0.6);
    g.fillRect(meta.x + dx - 4, meta.y + dy + meta.h*0.4, meta.w + 8, meta.h*0.55);
    g.fillStyle(0x000000, alpha);
    g.fillRect(meta.x + dx, meta.y + dy + meta.h*0.4, meta.w, meta.h*0.55);
  },

  refreshStudyTree: function(){
    var stage = treeStage();
    if (this.studyTreeSprite) this.studyTreeSprite.destroy();
    if (this.studyTreeShadow) { this.studyTreeShadow.destroy(); this.studyTreeShadow = null; }

    if (stage === 0){
      // Seedling — no shadow yet, just the small sprout sprite. Use the tiny
      // seedling at Orchard (0, 2): a 32x32 single-tile sprout.
      this.studyTreeSprite = this._placeCropImage('ts_orchard', 0, 64, 32, 32,
        this.studyTreeCentreX, this.studyTreeBaseY, TS * 0.9, TS * 0.9,
        this.studyTreeBaseY);
      return;
    }

    // Apple-tree growth progression on Orchard32 — each variant is 96×96 (3 wide × 3 tall).
    //   stage 1: small sprout      px(32,  64, 32, 64)
    //   stage 2: white blossom     px(64,   0, 96, 96)
    //   stage 3: green leafy       px(160,  0, 96, 96)
    //   stage 4: bigger green      px(256,  0, 96, 96)
    //   stage 5: red apple         px(256,  0, 96, 96)  -- NOTE: px 352 is the snowy/dead winter variant, do NOT use
    var VARIANTS = [
      null,
      { sx:32,  sy:64, sw:32, sh:64, scale:0.30 },
      { sx:64,  sy:0,  sw:96, sh:96, scale:0.55 },
      { sx:160, sy:0,  sw:96, sh:96, scale:0.75 },
      { sx:256, sy:0,  sw:96, sh:96, scale:0.90 },
      { sx:256, sy:0,  sw:96, sh:96, scale:1.00 }   // red-apple variant (px 256) — NOT px 352 which is the snowy/dead winter tree
    ];
    var v = VARIANTS[stage];
    var w = this.studyTreeMaxW * v.scale;
    var h = this.studyTreeMaxH * v.scale;

    // Procedural shadow that sits AT TRUNK LEVEL (not below the sprite) and
    // scales generously with tree size — a real tree casts a wide pooled shadow.
    // Trunk base is roughly at studyTreeBaseY; the shadow ellipse is drawn slightly above.
    var trunkY = this.studyTreeBaseY - 6;
    var shadowW = w * 0.70;                  // wider than the trunk, fitting the canopy
    var shadowH = 8 + v.scale * 14;          // depth grows with tree size
    var shadowAlpha = 0.32 + v.scale * 0.22; // 0.39 → 0.54 across stages
    this.studyTreeShadow = this.add.graphics().setDepth(this.studyTreeBaseY - 1);
    this.studyTreeShadow.fillStyle(0x000000, shadowAlpha);
    this.studyTreeShadow.fillEllipse(this.studyTreeCentreX, trunkY, shadowW, shadowH);

    this.studyTreeSprite = this._placeCropImage('ts_orchard', v.sx, v.sy, v.sw, v.sh,
      this.studyTreeCentreX, this.studyTreeBaseY, w, h, this.studyTreeBaseY);
  },

  // ============================================================
  //  GARDEN BEDS — spread out, no progress bar, wider crop grid
  // ============================================================
  // ============================================================
  //  GRASS VIBRANCY — progress-driven colour saturation + flower decorations
  // ============================================================
  // 8 vibrancy stages (0-7), driven by overall module + practical + quiz progress.
  // Stage 0: slightly desaturated/pale (start of year)
  // Stage 7: fully vivid, rich green with abundant flowers
  // Ground canvas is retinted in-place each stage change.

  computeVibrancyStage: function(){
    // Weighted score: dot-point confidence (60%), practicals (20%), quizzes (20%)
    var dpConf = overallConfidentPct();
    var pr = 0; var prT = Object.keys(ST.pr).length;
    Object.keys(ST.pr).forEach(function(k){ if(ST.pr[k]) pr++; });
    var prPct = prT > 0 ? pr/prT : 0;
    var qz = 0; var qzT = Object.keys(ST.qz).length;
    Object.keys(ST.qz).forEach(function(k){ if(ST.qz[k]) qz++; });
    var qzPct = qzT > 0 ? qz/qzT : 0;
    var score = dpConf * 0.6 + prPct * 0.2 + qzPct * 0.2;
    return Math.min(7, Math.floor(score * 8));
  },

  refreshGrassVibrancy: function(){
    var stage = this.computeVibrancyStage();
    if (stage === this._lastVibrancyStage) return;
    this._lastVibrancyStage = stage;

    // Tint the ground canvas: multiply each grass pixel's saturation and luminance
    // by a stage-dependent factor. Stage 0 = 0.82 sat / 0.92 lum (slightly pale).
    // Stage 7 = 1.10 sat / 1.05 lum (vivid). Linear interpolation between.
    var satMult = 0.82 + stage * (1.10 - 0.82) / 7;
    var lumMult = 0.92 + stage * (1.05 - 0.92) / 7;

    var tex = this.textures.get('groundtex');
    if (!tex || typeof tex.getContext !== 'function') return;
    var ctx = tex.getContext();
    var TM = this.TM;
    var TS = TILE;

    // Single readback of the entire canvas, then patch only T_GRASS pixels.
    // This is far faster than ~800 individual getImageData/putImageData calls.
    var fullW = WORLD_W, fullH = WORLD_H;
    var imgd = ctx.getImageData(0, 0, fullW, fullH);
    var d = imgd.data;

    for (var r = 0; r < MAP_H; r++){
      for (var c = 0; c < MAP_W; c++){
        if (TM[r][c] !== T_GRASS) continue;
        // Process all pixels in this tile's region of the canvas
        for (var ty = 0; ty < TS; ty++){
          for (var tx = 0; tx < TS; tx++){
            var idx = ((r * TS + ty) * fullW + (c * TS + tx)) * 4;
            if (d[idx+3] === 0) continue;
            var hsl = rgbToHsl(d[idx], d[idx+1], d[idx+2]);
            var newS = Math.min(1.0, hsl[1] * satMult);
            var newL = Math.min(1.0, hsl[2] * lumMult);
            var out = hslToRgb(hsl[0], newS, newL);
            d[idx] = out[0]; d[idx+1] = out[1]; d[idx+2] = out[2];
          }
        }
      }
    }
    ctx.putImageData(imgd, 0, 0);
    tex.refresh();

    // Update flower decorations to match vibrancy stage
    this.refreshVibrancyFlowers(stage);
  },

  refreshVibrancyFlowers: function(stage){
    // Destroy previous vibrancy flower group and rebuild for new stage
    if (this._vibrancyFlowers){
      this._vibrancyFlowers.forEach(function(f){ f.destroy(); });
    }
    this._vibrancyFlowers = [];
    if (stage === 0) return;

    var self = this;
    var TM = this.TM;
    var TS = TILE;

    // Progressive flower/decoration sets — each stage adds more spots
    // All spots are on T_GRASS tiles inside the farm fence
    // Stage 1-2: sparse small flowers along fence lines
    // Stage 3-4: wildflowers scattered in open areas
    // Stage 5-6: dense patches near beds, mushroom clusters
    // Stage 7: full bloom everywhere

    // Flower types from Plants.png:
    //   Small white flower: px(0, 416, 32, 16)  [row 13 col 0, half-tile height]
    //   Daisy cluster:      px(32, 416, 32, 16)
    //   Tall flower:        px(0, 352, 32, 32)  [row 11 col 0]
    //   Tulip:              px(32, 352, 32, 32)
    //   Small bush:         px(64, 352, 32, 32)
    //   Mushroom:           from Details32 col 0 row 4

    var FLOWER_SPOTS = [
      // Stage 1+ (sparse, along paths and fence)
      { c:5,  r:11, type:'small', minStage:1 },
      { c:12, r:9,  type:'small', minStage:1 },
      { c:18, r:16, type:'small', minStage:1 },
      { c:22, r:9,  type:'small', minStage:1 },
      { c:9,  r:17, type:'small', minStage:1 },
      // Stage 2+
      { c:11, r:12, type:'daisy', minStage:2 },
      { c:15, r:9,  type:'daisy', minStage:2 },
      { c:25, r:12, type:'daisy', minStage:2 },
      { c:20, r:16, type:'daisy', minStage:2 },
      { c:7,  r:14, type:'daisy', minStage:2 },
      // Stage 3+
      { c:13, r:13, type:'tall',  minStage:3 },
      { c:19, r:8,  type:'tall',  minStage:3 },
      { c:26, r:13, type:'tall',  minStage:3 },
      { c:10, r:16, type:'tall',  minStage:3 },
      { c:21, r:13, type:'tall',  minStage:3 },
      // Stage 4+
      { c:16, r:12, type:'tulip', minStage:4 },
      { c:23, r:16, type:'tulip', minStage:4 },
      { c:12, r:11, type:'tulip', minStage:4 },
      { c:28, r:9,  type:'tulip', minStage:4 },
      { c:17, r:17, type:'tulip', minStage:4 },
      // Stage 5+ (bushes and mushrooms)
      { c:14, r:14, type:'bush',  minStage:5 },
      { c:22, r:12, type:'bush',  minStage:5 },
      { c:8,  r:13, type:'mush',  minStage:5 },
      { c:25, r:10, type:'mush',  minStage:5 },
      { c:11, r:14, type:'mush',  minStage:5 },
      // Stage 6+
      { c:15, r:11, type:'small', minStage:6 },
      { c:20, r:12, type:'daisy', minStage:6 },
      { c:17, r:8,  type:'tall',  minStage:6 },
      { c:24, r:14, type:'tulip', minStage:6 },
      { c:13, r:16, type:'bush',  minStage:6 },
      // Stage 7 (full bloom)
      { c:16, r:16, type:'tall',  minStage:7 },
      { c:19, r:13, type:'tulip', minStage:7 },
      { c:23, r:11, type:'daisy', minStage:7 },
      { c:14, r:8,  type:'small', minStage:7 },
      { c:26, r:15, type:'mush',  minStage:7 }
    ];

    var FLOWER_DEFS = {
      small: { key:'ts_plants', sx:0,   sy:416, sw:32, sh:16, dw:TILE*0.7,  dh:TILE*0.45 },
      daisy: { key:'ts_plants', sx:32,  sy:416, sw:32, sh:16, dw:TILE*0.75, dh:TILE*0.45 },
      tall:  { key:'ts_plants', sx:0,   sy:352, sw:32, sh:32, dw:TILE*0.8,  dh:TILE*0.9  },
      tulip: { key:'ts_plants', sx:32,  sy:352, sw:32, sh:32, dw:TILE*0.8,  dh:TILE*0.9  },
      bush:  { key:'ts_plants', sx:64,  sy:352, sw:32, sh:32, dw:TILE*1.0,  dh:TILE*0.9  },
      mush:  { key:'ts_details',sx:0,   sy:128, sw:32, sh:32, dw:TILE*0.65, dh:TILE*0.65 }
    };

    FLOWER_SPOTS.forEach(function(spot){
      if (spot.minStage > stage) return;
      var c = spot.c, r = spot.r;
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) return;
      if (TM[r][c] !== T_GRASS) return;
      var fd = FLOWER_DEFS[spot.type];
      if (!fd) return;
      var wx = c * TS + TS/2;
      var wy = r * TS + TS;
      var spr = self._placeCropImage(fd.key, fd.sx, fd.sy, fd.sw, fd.sh,
        wx, wy, fd.dw, fd.dh, wy);
      self._vibrancyFlowers.push(spr);
    });
  },

    buildBeds: function(){
    this.beds = [];
    var self = this;
    BED_DEFS.forEach(function(b){
      var x1=b.c1*TILE, y1=b.r1*TILE;
      var bw=(b.c2-b.c1+1)*TILE, bh=(b.r2-b.r1+1)*TILE;
      // Outer wooden frame
      var g = self.add.graphics().setDepth(2);
      g.lineStyle(3, 0x4a2e08, 1).strokeRect(x1+1, y1+1, bw-2, bh-2);
      g.lineStyle(1, 0xa07030, 1).strokeRect(x1+3, y1+3, bw-6, bh-6);
      // Plant container — depth keyed below bed base so plants sort naturally
      var plants = self.add.container(0,0).setDepth(y1 + bh);
      var bed = { def:b, plants:plants, x1:x1, y1:y1, bw:bw, bh:bh, lastStage:-1 };
      self.beds.push(bed);
      self.refreshBed(bed);
    });
  },

  refreshBed: function(bed){
    var b = bed.def;
    var stage = moduleStage(b.m);
    if (stage === bed.lastStage) return;
    bed.lastStage = stage;
    bed.plants.removeAll(true);
    if (stage === 0) return;

    // Crops32 growth stages per crop row (col 0=seed, 1=sprout, 2=growing, 3=mature):
    // Stage 1 → col 0 (seed, tiny)   stage 2 → col 1 (sprout)
    // Stage 3 → col 2 (growing)      stage 4-5 → col 3 (mature)
    var cropPos = CROP_TILES[b.m][stage-1];
    var sx = cropPos[0] * 32, sy = cropPos[1] * 32;

    // Rendered size (px): seeds are tiny, mature plants fill most of a tile
    // Stage: 1=seed(9px), 2=sprout(14px), 3=growing(20px), 4=mature(26px), 5=full(28px)
    var SIZES = [0, 9, 14, 20, 26, 28];
    var size = SIZES[stage] || 20;

    // 3×3 grid = 9 plants. Neat, evenly spaced, not touching when mature.
    var cols = 3, rows = 3;
    var marginX = 10, marginY = 10;
    var usableW = bed.bw - marginX * 2;
    var usableH = bed.bh - marginY * 2;
    var stepX = usableW / (cols - 1);
    var stepY = usableH / (rows - 1);

    // Slice the crop tile once and reuse per stage
    var tkey = 'crop_' + b.m + '_s' + stage;
    if (!this.textures.exists(tkey)){
      var src = this.textures.get('ts_crops').getSourceImage();
      var bc = document.createElement('canvas');
      bc.width = 32; bc.height = 32;
      bc.getContext('2d').drawImage(src, sx, sy, 32, 32, 0, 0, 32, 32);
      this.textures.addCanvas(tkey, bc);
    }

    for (var ri = 0; ri < rows; ri++){
      for (var ci = 0; ci < cols; ci++){
        // Small deterministic jitter — only for non-seed stages so seeds look uniform
        var hh = ((b.c1 + ci) * 73 ^ (b.r1 + ri) * 131 ^ stage * 17) >>> 0;
        var jx = stage > 1 ? ((hh >>> 3) % 5) - 2 : 0;
        var jy = stage > 1 ? ((hh >>> 7) % 5) - 2 : 0;
        var px = bed.x1 + marginX + ci * stepX + jx;
        var py = bed.y1 + marginY + ri * stepY + jy;
        var s = this.add.image(px, py, tkey).setOrigin(0.5, 0.5).setDisplaySize(size, size);
        bed.plants.add(s);
      }
    }
  },

  enterHouse: function(){
    if (this._transitioning) return;
    this._transitioning=true; var self=this;
    this._savedPlayerX=this.player.x; this._savedPlayerY=this.player.y;
    this.cameras.main.fadeOut(400,0,0,0);
    this.cameras.main.once('camerafadeoutcomplete',function(){
      self._transitioning=false;
      self.scene.sleep('Garden');
      self.scene.run('Interior');
    });
  },

  // ============================================================
  //  DECORATIONS — Details32 trees only, procedurally shadowed
  // ============================================================
  buildDecorations: function(){
    var self = this;
    var TS = TILE;
    var TM = this.TM;

    function hash(c, r, salt){
      return ((c * 2654435761) ^ (r * 2246822519) ^ (salt * 3266489917)) >>> 0;
    }
    function isOpenGrass(c, r){
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) return false;
      return TM[r][c] === T_GRASS;
    }
    function nearPathOrBed(c, r, n){
      for (var dr=-n; dr<=n; dr++){
        for (var dc=-n; dc<=n; dc++){
          var rr=r+dr, cc=c+dc;
          if (rr<0||rr>=MAP_H||cc<0||cc>=MAP_W) continue;
          if (TM[rr][cc] === T_PATH || TM[rr][cc] === T_DIRT) return true;
        }
      }
      return false;
    }
    // Reserved zones: keep clear of spawn, structures, central ring, cave strip
    var RESERVED = [
      { c1:2,  r1:3,  c2:10, r2:11 },  // farmhouse + well + noticeboard + spawn
      { c1:15, r1:8,  c2:23, r2:16 },  // central study-tree ring + buffer
      { c1:36, r1:0,  c2:39, r2:29 }   // cave-side strip
    ];
    function inReserved(c, r){
      for (var i=0;i<RESERVED.length;i++){
        var z = RESERVED[i];
        if (c>=z.c1 && c<=z.c2 && r>=z.r1 && r<=z.r2) return true;
      }
      return false;
    }

    // Three tree variants from Details32 (the only tree assets allowed):
    //   Orange/fall tree:  cols 1-3 rows 6-8  -> px(32, 192, 96, 96)
    //   Green leafy tree:  cols 4-6 rows 6-8  -> px(128, 192, 96, 96)
    //   Conifer/fir tree:  cols 1-3 rows 9-11 -> px(32, 288, 96, 96)
    var TREE_VARIANTS = [
      { sx:32,  sy:192, sw:96, sh:96, dispW:2.4, dispH:2.6 },  // orange/fall
      { sx:128, sy:192, sw:96, sh:96, dispW:2.4, dispH:2.6 },  // green leafy
      { sx:32,  sy:288, sw:96, sh:96, dispW:2.0, dispH:2.8 }   // conifer
    ];

    // ---- Scatter trees deterministically ----
    var placed = [];
    var MIN_TREE_DIST = 3.2;
    // Track tree trunk centres for collision (created by buildPlayer)
    this.treeColliders = this.treeColliders || [];
    for (var r=0; r<MAP_H; r++){
      for (var c=0; c<MAP_W; c++){
        if (!isOpenGrass(c, r)) continue;
        if (inReserved(c, r)) continue;
        if (nearPathOrBed(c, r, 1)) continue;
        var h = hash(c, r, 11);
        if ((h % 100) >= 6) continue;          // ~6% chance
        // min-distance vs other trees
        var tooClose = false;
        for (var ti=0; ti<placed.length; ti++){
          var dx = placed[ti][0]-c, dy = placed[ti][1]-r;
          if (dx*dx + dy*dy < MIN_TREE_DIST*MIN_TREE_DIST){ tooClose = true; break; }
        }
        if (tooClose) continue;
        placed.push([c, r]);
        var variant = TREE_VARIANTS[h % TREE_VARIANTS.length];
        var jx = ((h >>> 8) % 9) - 4;
        var jy = ((h >>> 4) % 5) - 2;
        var wx = c*TS + TS/2 + jx;
        var wy = r*TS + TS + jy;
        // Procedural drop shadow at the MIDDLE of the trunk (raised well above base).
        // Tree sprite is drawn with origin (0.5, 1) so wy is its base. The trunk
        // occupies roughly the bottom 25-30% of the sprite — shadow sits in that band.
        var trunkMidY = wy - (TS * variant.dispH * 0.10);
        var sg = self.add.graphics().setDepth(wy - 1);
        sg.fillStyle(0x000000, 0.40);
        sg.fillEllipse(wx, trunkMidY, TS * variant.dispW * 0.50, 8);
        self._placeCropImage('ts_details', variant.sx, variant.sy, variant.sw, variant.sh,
          wx, wy, TS * variant.dispW, TS * variant.dispH, wy);
        // Trunk collision: a small box at the base of the tree (~12x10 px).
        // The player can brush right up against the canopy, but the trunk blocks them.
        self.treeColliders.push({ x: wx - 6, y: wy - 8, w: 12, h: 8 });
      }
    }

    // ---- SUNFLOWERS — fully bloomed, organised positions ----
    // Source: Plants.png at (2, 12) px(64, 384, 64, 64). A 2x2 sprite of two
    // fully-bloomed sunflowers. We render at 1 tile wide so it's a cosy single
    // sunflower per spot, taking the LEFT half of the 2-tile sprite for variety.
    var SUN_SPOTS = [
      // Inside the farm — flanking key landmarks
      [11, 9], [11, 15],
      [24, 9], [24, 15],
      [9, 12], [9, 13],
      [27, 10], [27, 14],
      [14, 19], [20, 19],
      // Inside the perimeter — a cosy line of sunflowers along the fence lines
      [4, 3], [10, 3], [16, 3], [22, 3], [28, 3], [31, 3],
      [3, 12], [3, 16], [3, 20]
    ];
    SUN_SPOTS.forEach(function(pt, i){
      var c = pt[0], r = pt[1];
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) return;
      if (TM[r][c] !== T_GRASS) return;
      var wx = c*TS + TS/2, wy = r*TS + TS;
      // Small base shadow
      var g = self.add.graphics().setDepth(wy - 1);
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(wx, wy - 1, TS*0.55, 5);
      // Bloomed sunflower — take the LEFT tile of the 2-tile sprite for one flower head.
      // The sprite is 32 wide × 64 tall (1 tile × 2 tiles) showing the full plant.
      // Alternate which half we sample for variety.
      var sx = (i % 2 === 0) ? 64 : 96;
      self._placeCropImage('ts_plants', sx, 384, 32, 64, wx, wy, TS*1.0, TS*1.7, wy);
    });
    this.sunflowerSpots = SUN_SPOTS.slice();

    // ---- LILY PADS on the pond — full 32×32 tiles, multiple variants ----
    // Source: Plants.png (19, 13) = simple pads; (20, 13) = pads with white lotus.
    var LILY_SPOTS = [
      { c:3, r:24, variant:0 }, { c:5, r:23, variant:1 }, { c:7, r:25, variant:0 },
      { c:2, r:26, variant:1 }, { c:6, r:24, variant:0 }, { c:4, r:25, variant:1 },
      { c:8, r:24, variant:0 }, { c:3, r:27, variant:0 }, { c:7, r:23, variant:1 }
    ];
    LILY_SPOTS.forEach(function(pt){
      var c = pt.c, r = pt.r;
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) return;
      if (TM[r][c] !== T_WATER) return;
      var wx = c*TS + TS/2, wy = r*TS + TS/2;
      // Variant 0: simple green pads (19,13); Variant 1: with white flower (20,13)
      var sx = (pt.variant === 0) ? 19*32 : 20*32;
      // Full tile size, depth above water but below floating sprites
      self._placeCropImage('ts_plants', sx, 13*32, 32, 32, wx, wy, TS, TS, 2);
    });
  },

  // ============================================================
  //  CREATURES — bees, butterflies, birds, leaves (unchanged spirit)
  // ============================================================
  buildCreatures: function(){
    var self = this;
    this.butterflies = [];
    this.bees = [];
    this.birds = [];

    var bflySpots = [[14,12],[20,8],[28,14],[10,18],[24,20]];
    bflySpots.forEach(function(p,i){
      var s = self.add.sprite(p[0]*TILE, p[1]*TILE, 'butterfly').setDepth(9000);
      s.play('butterfly-fly'); s.setScale(1.1);
      s.home = { x:p[0]*TILE, y:p[1]*TILE }; s.t = Math.random()*Math.PI*2; s.idx=i;
      self.butterflies.push(s);
    });
    // Bees patrol near beds AND near sunflowers (the new flowers attract pollinators)
    var beeSpots = BED_DEFS.map(function(b){ return [b.c1+1, b.r1+1]; });
    // Take 4 representative sunflower positions for additional bees (interspersed)
    var sunBeeSpots = [[11, 9], [22, 9], [14, 19], [3, 12]];
    var allBeeSpots = beeSpots.concat(sunBeeSpots);
    allBeeSpots.forEach(function(p,i){
      var s = self.add.sprite(p[0]*TILE, p[1]*TILE, 'bee').setDepth(9000);
      s.play('bee-fly');
      s.home={ x:p[0]*TILE, y:p[1]*TILE }; s.t=i*1.5;
      self.bees.push(s);
    });
    // Birds perch then fly off
    var birdSpots = [[18, 4], [26, 2], [12, 6]];
    birdSpots.forEach(function(p){
      var s = self.add.sprite(p[0]*TILE, p[1]*TILE, 'birdfly', 0).setDepth(9000);
      s.setScale(1.3);
      s.state='perch'; s.timer = 120 + Math.random()*180;
      s.home={ x:p[0]*TILE, y:p[1]*TILE };
      s.vx=0; s.vy=0;
      self.birds.push(s);
    });

    // Falling leaves
    this.leaves = [];
    for (var i=0;i<18;i++){
      var lf = this.add.image(Math.random()*WORLD_W, Math.random()*WORLD_H,
        'leaves', Math.floor(Math.random()*8)).setDepth(9500).setAlpha(0.75);
      lf.vx=-0.3-Math.random()*0.4; lf.vy=0.4+Math.random()*0.4;
      lf.rot=Math.random()*Math.PI*2; lf.rotV=(Math.random()-0.5)*0.04;
      lf.wob=Math.random()*Math.PI*2;
      this.leaves.push(lf);
    }
  },

  updateCreatures: function(){
    var self=this, fc=this.fc;
    this.butterflies.forEach(function(s){
      s.t += 0.012;
      s.x = s.home.x + Math.sin(s.t + s.idx*2.1)*TILE*1.2;
      s.y = s.home.y + Math.cos(s.t*1.3 + s.idx*1.7)*TILE*0.8;
      s.setDepth(s.y);
    });
    this.bees.forEach(function(s){
      s.t += 0.02;
      s.x = s.home.x + Math.sin(s.t)*TILE*0.6 + Math.sin(s.t*2.3)*TILE*0.2;
      s.y = s.home.y + Math.cos(s.t*1.4)*TILE*0.5;
      s.setDepth(s.y);
    });
    this.birds.forEach(function(s){
      s.timer--;
      if (s.state==='perch'){
        if (s.timer<=0){ s.state='takeoff'; s.play('bird-takeoff'); s.timer=30;
          s.once('animationcomplete', function(){
            s.state='fly'; s.play('bird-fly');
            s.vx=(Math.random()-0.5)*2.4; s.vy=-1.2-Math.random();
          });
        }
      } else if (s.state==='fly'){
        s.x += s.vx; s.y += s.vy;
        s.setDepth(s.y);
        if (s.y < -40 || s.x < -40 || s.x > WORLD_W+40){
          s.state='perch'; s.timer=180+Math.random()*200;
          s.x = (4+Math.random()*(MAP_W-8))*TILE;
          s.y = (3+Math.random()*3)*TILE;
          s.home={x:s.x,y:s.y}; s.play('bird-fly'); s.anims.stop(); s.setFrame(0);
        }
      }
    });
    this.leaves.forEach(function(lf){
      lf.wob += 0.03;
      lf.x += lf.vx + Math.sin(lf.wob)*0.4;
      lf.y += lf.vy;
      lf.rotation += lf.rotV;
      if (lf.y > WORLD_H){ lf.y=0; lf.x=Math.random()*WORLD_W; lf.setFrame(Math.floor(Math.random()*8)); }
      if (lf.x < 0) lf.x = WORLD_W;
    });
  },

  // ============================================================
  //  PLAYER + collision
  // ============================================================
  buildPlayer: function(){
    // Spawn just south of the (shifted) farmhouse front door
    this.player = this.physics.add.sprite(6*TILE + TILE/2, 10*TILE + TILE/2, 'player', 0);
    this.player.setOrigin(0.5, 0.85);
    this.player.body.setSize(20, 16);
    this.player.body.setOffset(30, 56);
    this.player.setDepth(this.player.y);
    this.player.facing = 'down';
    this.player.play('idle-down');

    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.player.setCollideWorldBounds(true);

    // ---- static collision rectangles ----
    this.solids = this.physics.add.staticGroup();
    var self = this;
    function solid(cx, cy, cw, ch){
      var r = self.add.rectangle(cx*TILE, cy*TILE, cw*TILE, ch*TILE).setOrigin(0,0);
      self.physics.add.existing(r, true);
      self.solids.add(r);
    }
    solid(FARMHOUSE.c, FARMHOUSE.r, FARMHOUSE.w, FARMHOUSE.h);
    solid(NOTICEBOARD.c, NOTICEBOARD.r, 1, 1);
    solid(STUDY_TREE.c, STUDY_TREE.r, STUDY_TREE.w, STUDY_TREE.h);
    solid(CAVE.c, CAVE.r, CAVE.w, CAVE.h);
    BED_DEFS.forEach(function(b){
      solid(b.c1, b.r1, b.c2-b.c1+1, b.r2-b.r1+1);
    });
    // Top fence: row 2, cols 2..32
    solid(2, 2, 31, 1);
    // West fence: col 2, rows 2..21 (includes the corner with the top fence)
    solid(2, 2, 1, 20);
    // Water cells — row-by-row horizontal runs
    var TM = this.TM;
    for (var r=0; r<MAP_H; r++){
      var c = 0;
      while (c < MAP_W){
        if (TM[r][c] === T_WATER || TM[r][c] === T_WATERFALL){
          var start = c;
          while (c < MAP_W && (TM[r][c] === T_WATER || TM[r][c] === T_WATERFALL)) c++;
          solid(start, r, c - start, 1);
        } else {
          c++;
        }
      }
    }
    this.physics.add.collider(this.player, this.solids);

    // Tree-trunk and boulder colliders (gathered during buildDecorations).
    // Each collider is a tiny static rectangle so the player blocks against
    // the trunk but can still walk closely around the canopy.
    if (this.treeColliders && this.treeColliders.length){
      var trunkGroup = this.physics.add.staticGroup();
      this.treeColliders.forEach(function(tc){
        var r = self.add.rectangle(tc.x, tc.y, tc.w, tc.h).setOrigin(0, 0);
        self.physics.add.existing(r, true);
        trunkGroup.add(r);
      });
      this.physics.add.collider(this.player, trunkGroup);
    }
  },

  updatePlayer: function(delta){
    var p = this.player, spd = 150;
    var vx=0, vy=0;
    var k=this.keys, cur=this.cursors;
    if (k.A.isDown || cur.left.isDown) vx=-spd;
    else if (k.D.isDown || cur.right.isDown) vx=spd;
    if (k.W.isDown || cur.up.isDown) vy=-spd;
    else if (k.S.isDown || cur.down.isDown) vy=spd;
    if (vx!==0 && vy!==0){ vx*=0.707; vy*=0.707; }
    p.body.setVelocity(vx, vy);

    var moving = vx!==0 || vy!==0;
    var face = p.facing;
    if (Math.abs(vx) > Math.abs(vy)){ face = vx<0 ? 'left' : 'right'; }
    else if (vy!==0){ face = vy<0 ? 'up' : 'down'; }
    p.facing = face;
    var anim = (moving?'walk-':'idle-')+face;
    if (p.anims.currentAnim===null || p.anims.currentAnim.key!==anim) p.play(anim, true);
    p.setDepth(p.y);

    // ---- Footstep playback ----
    // Walk cycle = 6 frames at 9fps = 666ms. Each cycle has two foot-contacts,
    // so a step every ~333ms feels right. Alternate the two ogg samples.
    if (!this._stepTimer) this._stepTimer = 0;
    if (moving){
      this._stepTimer -= (delta || 16);
      if (this._stepTimer <= 0){
        this._stepTimer = 330;
        if (this.sound && this.sound.locked === false){
          var key = ((this._stepIdx = (this._stepIdx || 0) + 1) % 2 === 0) ? 'step1' : 'step2';
          // Volume slightly randomised for naturalness
          var vol = 0.35 + Math.random() * 0.1;
          try { this.sound.play(key, { volume: vol }); } catch(e) {}
        }
      }
    } else {
      // Reset so the FIRST step after a pause lands quickly, not after a 330ms delay
      this._stepTimer = 80;
    }
  },

  // ============================================================
  //  FARMER NPC — patrols between beds; player talks to him
  // ============================================================
  buildFarmer: function(){
    var TS = TILE;
    // Patrol waypoints: each one is a path tile next to a bed, alternating with
    // a central-ring rest spot. The route is verified against the path layout above.
    this.farmerRoute = [
      // Near M1 (SW bed) — on M1 spur path (cols 6-7, rows 16-17)
      { x: 6*TS + TS/2,  y: 17*TS + TS/2, face:'down'  },
      // Centre ring W side (cols 16-17 rows 11-13)
      { x: 17*TS + TS/2, y: 12*TS + TS/2, face:'right' },
      // Near M2 (NE bed) — on M2 spur (cols 24-25 rows 6-8)
      { x: 25*TS + TS/2, y: 8*TS  + TS/2, face:'right' },
      // Centre ring E side (cols 21-22 rows 11-13)
      { x: 21*TS + TS/2, y: 12*TS + TS/2, face:'down'  },
      // Near M3 (E bed) — on M3 spur (cols 25-26 rows 16-17)
      { x: 26*TS + TS/2, y: 17*TS + TS/2, face:'right' },
      // Centre ring S strip (cols 16-22 rows 14-15)
      { x: 21*TS + TS/2, y: 14*TS + TS/2, face:'left'  },
      // Near M4 (S bed) — on M4 spur (cols 16-17 rows 16-20)
      { x: 16*TS + TS/2, y: 20*TS + TS/2, face:'down'  },
      // Centre ring S strip alt position
      { x: 17*TS + TS/2, y: 14*TS + TS/2, face:'up'    }
    ];
    this.farmerIdx = 0;
    var start = this.farmerRoute[0];

    var f = this.add.sprite(start.x, start.y, 'player', 0);
    f.setOrigin(0.5, 0.85); f.setDepth(f.y); f.setTint(0xf4c87a);
    f.facing = 'down'; f.npcKey = 'player'; f.play('idle-down');
    this.farmer = f;
    this.farmerSpd = 55;       // pixels per second
    this.farmerPause = 0;
  },

  updateFarmer: function(dtMs){
    var f = this.farmer;
    if (!f) return;
    // If player is within talking distance, stop and face them
    var pdx = this.player.x - f.x, pdy = this.player.y - f.y;
    var pDist = Math.hypot(pdx, pdy);
    if (pDist < TILE * 2.2){
      var face = Math.abs(pdx) > Math.abs(pdy)
        ? (pdx<0 ? 'left' : 'right')
        : (pdy<0 ? 'up' : 'down');
      var nearKey = 'idle-' + face;
      if (f.anims.currentAnim===null || f.anims.currentAnim.key!==nearKey) f.play(nearKey);
      f.facing = face;
      f.setDepth(f.y);
      return;
    }
    if (this.farmerPause > 0){
      this.farmerPause -= dtMs;
      var idleKey = 'idle-' + f.facing;
      if (f.anims.currentAnim===null || f.anims.currentAnim.key!==idleKey) f.play(idleKey);
      return;
    }
    var wp = this.farmerRoute[this.farmerIdx];
    var dx = wp.x - f.x, dy = wp.y - f.y;
    var d = Math.hypot(dx, dy);
    if (d < 3){
      // Arrived — pause briefly then advance
      this.farmerPause = 1200 + Math.random()*900;
      f.facing = wp.face || 'down';
      f.play('idle-' + f.facing);
      this.farmerIdx = (this.farmerIdx + 1) % this.farmerRoute.length;
      return;
    }
    var step = this.farmerSpd * dtMs / 1000;
    f.x += (dx/d) * step;
    f.y += (dy/d) * step;
    // Facing
    var face = Math.abs(dx) > Math.abs(dy)
      ? (dx<0 ? 'left' : 'right')
      : (dy<0 ? 'up' : 'down');
    if (face !== f.facing){ f.facing = face; }
    var anim = 'walk-' + face;
    if (f.anims.currentAnim===null || f.anims.currentAnim.key!==anim) f.play(anim, true);
    f.setDepth(f.y);
  },

  // ============================================================
  //  INTERACTABLES
  // ============================================================
  buildInteractables: function(){
    // each: id, label, tile centre, radius (tiles)
    this.objs = [
      { id:'house',     label:'FARMHOUSE — Practicals',     cx: FARMHOUSE.c + FARMHOUSE.w/2, cy: FARMHOUSE.r + FARMHOUSE.h/2, r:4.5 },
      { id:'house_door', label:'DOOR — Enter',                cx: FARMHOUSE.c + FARMHOUSE.w/2, cy: FARMHOUSE.r + FARMHOUSE.h - 0.3, r:1.8 },
      { id:'tree',      label:'STUDY TREE — Quizzes',        cx: STUDY_TREE.c + STUDY_TREE.w/2, cy: STUDY_TREE.r + STUDY_TREE.h/2, r:3.5 },
      { id:'mailbox',   label:'NOTICEBOARD — Messages',      cx: NOTICEBOARD.c + 0.5, cy: NOTICEBOARD.r + 0.5, r:2.0 },
      { id:'cave',      label:'CAVE — Extension',            cx: CAVE.c + CAVE.w/2, cy: CAVE.r + CAVE.h/2, r:4.0 },
      // Skills: pond triggers Fishing — centre on east shore where player can walk
      // (pond water occupies cols 0-8 rows 22-26; east shore walkable from col 8-12)
      { id:'skills',    label:'POND — Fishing skill',        cx: 9,  cy: 23, r:3.5,
        _skillHint: 'fishing' },
      // M1 bed
      { id:'skills',    label:'M1 BED — Botany skill',       cx: BED_DEFS[0].c1 + (BED_DEFS[0].c2-BED_DEFS[0].c1)/2,
        cy: BED_DEFS[0].r1 + (BED_DEFS[0].r2-BED_DEFS[0].r1)/2, r:3.5 },
      // M2 bed
      { id:'skills',    label:'M2 BED — Botany skill',       cx: BED_DEFS[1].c1 + (BED_DEFS[1].c2-BED_DEFS[1].c1)/2,
        cy: BED_DEFS[1].r1 + (BED_DEFS[1].r2-BED_DEFS[1].r1)/2, r:3.5 },
      // M3 bed
      { id:'skills',    label:'M3 BED — Botany skill',       cx: BED_DEFS[2].c1 + (BED_DEFS[2].c2-BED_DEFS[2].c1)/2,
        cy: BED_DEFS[2].r1 + (BED_DEFS[2].r2-BED_DEFS[2].r1)/2, r:3.5 },
      // M4 bed
      { id:'skills',    label:'M4 BED — Botany skill',       cx: BED_DEFS[3].c1 + (BED_DEFS[3].c2-BED_DEFS[3].c1)/2,
        cy: BED_DEFS[3].r1 + (BED_DEFS[3].r2-BED_DEFS[3].r1)/2, r:3.5 }
    ];
  },

  nearObj: function(){
    var px = this.player.x/TILE, py = this.player.y/TILE;
    // Farmer first (proximity-based, not tile-fixed)
    if (this.farmer){
      var fd = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.farmer.x, this.farmer.y);
      if (fd < TILE * 1.6) return { id:'farmer', label:'FARMER — Talk' };
    }
    for (var i=0;i<this.objs.length;i++){
      var o=this.objs[i];
      if (Phaser.Math.Distance.Between(px, py, o.cx, o.cy) < o.r) return o;
    }
    return null;
  },

  tryInteract: function(){
    if (modalIsOpen()) return;
    var o = this.nearObj();
    if (!o) return;
    if (o.id==='cave'){
      if (overallConfidentPct() < 0.75){
        this.showToast('The cave is locked — reach 75% confident dot points.');
        return;
      }
    }
    // For skills interactables, set skill hint so modal auto-opens the prompt
    if (o.id === 'skills'){
      var px = this.player.x / TILE, py = this.player.y / TILE;
      var nearPond = Math.hypot(px - 4, py - 25) < 5.5;
      var hint = o._skillHint || (nearPond ? 'fishing' : 'botany');
      if (typeof _pendingSkillHint !== 'undefined') _pendingSkillHint = hint;
    }
    if (o.id==='house_door'){ this.enterHouse(); return; }
    openModal(o.id, this);
  },

  // ============================================================
  //  HUD
  // ============================================================
  buildHUD: function(){
    this.hint = this.add.text(VIEW_W/2, VIEW_H-40, '', {
      fontFamily:'monospace', fontSize:'17px', color:'#f0d060',
      backgroundColor:'#0a0804cc', padding:{x:14,y:8}
    }).setOrigin(0.5).setScrollFactor(0).setDepth(99999).setVisible(false);

    this.badge = this.add.text(10, 10, CONFIG_SEASON_BADGE, {
      fontFamily:'monospace', fontSize:'14px', color:'#f0d060',
      backgroundColor:'#0a0804cc', padding:{x:10,y:6}
    }).setScrollFactor(0).setDepth(99999);

    this.controls = this.add.text(VIEW_W-10, 10, 'WASD move \u00b7 E interact', {
      fontFamily:'monospace', fontSize:'14px', color:'#80c040',
      backgroundColor:'#0a0804cc', padding:{x:10,y:6}
    }).setOrigin(1,0).setScrollFactor(0).setDepth(99999);

    this.toastTxt = this.add.text(VIEW_W/2, 60, '', {
      fontFamily:'monospace', fontSize:'16px', color:'#80c040',
      backgroundColor:'#0a0804ee', padding:{x:14,y:8}
    }).setOrigin(0.5).setScrollFactor(0).setDepth(99999).setAlpha(0);

    // ---- Customise button in the bottom-right corner of the viewport ----
    var self = this;
    var BTN_W = 144, BTN_H = 48;
    if (!this.textures.exists('custom_btn_tex')){
      var src = this.textures.get('ts_char_panel').getSourceImage();
      var cnv = document.createElement('canvas');
      cnv.width = 96; cnv.height = 32;
      cnv.getContext('2d').drawImage(src, 0, 0, 96, 32, 0, 0, 96, 32);
      this.textures.addCanvas('custom_btn_tex', cnv);
    }
    this.customBtn = this.add.image(VIEW_W-10, VIEW_H-10, 'custom_btn_tex')
      .setOrigin(1,1)
      .setDisplaySize(BTN_W, BTN_H)
      .setScrollFactor(0)
      .setDepth(99999)
      .setInteractive({ useHandCursor:true });
    this.customBtn.on('pointerdown', function(){ openModal('customise', self); });
    this.customBtn.on('pointerover', function(){ self.customBtn.setScale(1.55); });
    this.customBtn.on('pointerout',  function(){ self.customBtn.setScale(1.5); });
    this.customBtn.setScale(1.5);

    // (Top session bar removed — replaced by full-screen overlay + bottom bar)
    // --- Full-screen black study overlay (shown during active session) ---
    // Covers the game world so the student focuses on studying, not the game.
    this.sessionOverlay = this.add.rectangle(VIEW_W/2, VIEW_H/2, VIEW_W, VIEW_H, 0x000000, 0)
      .setScrollFactor(0).setDepth(90000).setVisible(false);

    // Bottom progress bar (visible during session, sits above overlay)
    var barY = VIEW_H - 36;
    this.sessionBarBg2 = this.add.rectangle(VIEW_W/2, barY, VIEW_W - 40, 22, 0x1a1208)
      .setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(91000).setVisible(false)
      .setStrokeStyle(2, 0x6a5030);
    this.sessionBarFill2 = this.add.rectangle(20, barY, 0, 18, 0x4a8a30)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(91001).setVisible(false);
    this.sessionBarLabel2 = this.add.text(VIEW_W/2, barY - 22, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#c8a860'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(91002).setVisible(false);
    this.sessionBarTime2 = this.add.text(VIEW_W/2, barY + 22, '', {
      fontFamily:'Press Start 2P', fontSize:'10px', color:'#f0d060'
    }).setOrigin(0.5, 0.5).setScrollFactor(0).setDepth(91002).setVisible(false);
    this.sessionBarCancel2 = this.add.text(VIEW_W - 20, barY, '[Cancel]', {
      fontFamily:'monospace', fontSize:'12px', color:'#e08070',
      backgroundColor:'#3a1410', padding:{x:6,y:4}
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(91002).setVisible(false)
      .setInteractive({ useHandCursor:true });
    var selfHUD = this;
    this.sessionBarCancel2.on('pointerdown', function(){
      if (confirm('Cancel this session? No XP will be earned.')){
        sessionCancel();
        if (selfHUD._fishingRod){ selfHUD._fishingRod.destroy(); selfHUD._fishingRod = null; }
        if (selfHUD._fishingLine){ selfHUD._fishingLine.destroy(); selfHUD._fishingLine = null; }
        if (selfHUD._toolOverlay){ selfHUD._toolOverlay.destroy(); selfHUD._toolOverlay = null; }
        selfHUD.updateSessionBar();
      }
    });
    this._takeawayPrompted = false;
  },

  updateSessionBar: function(){
    var hasSession = ST && ST.session;
    var barW = VIEW_W - 40;

    if (!hasSession){
      // Hide everything
      this.sessionOverlay.setVisible(false).setAlpha(0);
      this.sessionBarBg2.setVisible(false);
      this.sessionBarFill2.setVisible(false);
      this.sessionBarLabel2.setVisible(false);
      this.sessionBarTime2.setVisible(false);
      this.sessionBarCancel2.setVisible(false);
      if (this._fishingRod){ this._fishingRod.destroy(); this._fishingRod = null; }
      if (this._fishingLine){ this._fishingLine.destroy(); this._fishingLine = null; }
      if (this._toolOverlay){ this._toolOverlay.destroy(); this._toolOverlay = null; }
      this._takeawayPrompted = false;
      return;
    }

    // Show overlay (fade in on first call)
    if (!this.sessionOverlay.visible){
      this.sessionOverlay.setVisible(true).setAlpha(0);
      this.tweens.add({ targets: this.sessionOverlay, alpha: 0.92, duration: 800, ease:'Linear' });
    }
    this.sessionBarBg2.setVisible(true);
    this.sessionBarFill2.setVisible(true);
    this.sessionBarLabel2.setVisible(true);
    this.sessionBarTime2.setVisible(true);
    this.sessionBarCancel2.setVisible(true);

    var cfg = CONFIG_SKILLS[ST.session.skill];
    var study = ST.session.study || '';
    if (study.length > 60) study = study.substring(0, 57) + '...';
    this.sessionBarLabel2.setText((cfg ? cfg.activityLabel : ST.session.skill) + '  —  “' + study + '”');

    var remaining = sessionRemainingMs();
    var totalMs = ST.session.duration;
    var pct = 1 - (remaining / totalMs);
    this.sessionBarFill2.width = barW * pct;

    var m = Math.floor(remaining / 60000);
    var s = Math.floor((remaining % 60000) / 1000);
    var pad = s < 10 ? '0' : '';
    this.sessionBarTime2.setText(m + ':' + pad + s + ' remaining');

    // Trigger takeaway modal when done
    if (remaining === 0 && !this._takeawayPrompted && !modalIsOpen()){
      this._takeawayPrompted = true;
      openModal('takeaway', this);
    }
  },

  // Called when a study session starts — walk player to nearest activity spot,
  // show fishing rod or watering can, then fade to black.
  startSessionAnimation: function(skillKey){
    var self = this;
    var px = this.player.x, py = this.player.y;

    // Fishing: move player to nearest pond edge
    if (skillKey === 'fishing'){
      // Find nearest water-adjacent grass tile in the pond area
      var targetX = 10 * TILE + TILE/2;  // east shore of pond, facing water (west)
      var targetY = 24 * TILE + TILE/2;
      this.player.x = targetX;
      this.player.y = targetY;
      this.player.anims.play('idle-left', true);

      // Draw fishing rod procedurally (Graphics overlay on player)
      var rodG = this.add.graphics().setScrollFactor(1).setDepth(this.player.depth + 1);
      // Rod: a line from player's hand extending left and up
      rodG.lineStyle(2, 0x8b5a2b, 1);
      rodG.beginPath();
      rodG.moveTo(targetX - 8, targetY - 20);
      rodG.lineTo(targetX - 28, targetY - 46);
      rodG.strokePath();
      // Line: thin line from rod tip down to water
      rodG.lineStyle(1, 0xd4c090, 0.9);
      rodG.beginPath();
      rodG.moveTo(targetX - 28, targetY - 46);
      rodG.lineTo(targetX - 38, targetY - 12);
      rodG.strokePath();
      // Bobber: small circle at line end
      rodG.fillStyle(0xc04040, 1);
      rodG.fillCircle(targetX - 38, targetY - 12, 3);
      this._fishingRod = rodG;

    } else if (skillKey === 'botany'){
      // Move player to nearest bed
      var nearBed = null, nearDist = Infinity;
      BED_DEFS.forEach(function(b){
        var bx = (b.c1 + (b.c2 - b.c1)/2) * TILE;
        var by = b.r1 * TILE - TILE/2;
        var d = Math.hypot(px - bx, py - by);
        if (d < nearDist){ nearDist = d; nearBed = b; }
      });
      if (nearBed){
        this.player.x = (nearBed.c1 + (nearBed.c2 - nearBed.c1)/2) * TILE;
        this.player.y = (nearBed.r1 - 1) * TILE + TILE/2;
      }
      this.player.anims.play('idle-down', true);

      // Watering can overlay from Tools_icons.png px(0,32,32,32)
      if (this.textures.exists('ts_tools')){
        var tcanKey = 'watering_can_crop';
        if (!this.textures.exists(tcanKey)){
          var src = this.textures.get('ts_tools').getSourceImage();
          var wcc = document.createElement('canvas');
          wcc.width = 32; wcc.height = 32;
          wcc.getContext('2d').drawImage(src, 0, 32, 32, 32, 0, 0, 32, 32);
          this.textures.addCanvas(tcanKey, wcc);
        }
        var tc = this.add.image(this.player.x + 14, this.player.y - 14, tcanKey)
          .setDisplaySize(24, 24).setDepth(this.player.depth + 1).setScrollFactor(1);
        this._toolOverlay = tc;
      }
    }

    // Fade to black after a short delay showing the animation
    var overlay = this.sessionOverlay;
    this.time.delayedCall(600, function(){
      overlay.setVisible(true).setAlpha(0);
      self.tweens.add({ targets: overlay, alpha: 0.92, duration: 700, ease:'Linear' });
    });
  },

  showToast: function(msg){
    var t = this.toastTxt;
    t.setText(msg).setAlpha(1);
    this.tweens.killTweensOf(t);
    this.tweens.add({ targets:t, alpha:0, delay:2600, duration:600 });
  },

  updateHUD: function(){
    var o = this.nearObj();
    if (o && !modalIsOpen()){
      this.hint.setText('[E]  '+o.label).setVisible(true);
    } else {
      this.hint.setVisible(false);
    }
  },

  // ============================================================
  //  Main loop
  // ============================================================
  update: function(time, delta){
    this.fc++;
    if (modalIsOpen()){
      this.player.body.setVelocity(0,0);
      this.player.anims.stop();
    } else {
      this.updatePlayer(delta);
    }
    this.updateCreatures();
    this.updateFarmer(delta);
    this.updateHUD();
    this.updateSessionBar();
    if (this.fc % 30 === 0 && this.beds){
      for (var i=0;i<this.beds.length;i++) this.refreshBed(this.beds[i]);
      this.refreshStudyTree();
    }
    // Update sun-shadow every ~5 seconds (300 frames at 60fps).
    if (this.fc % 300 === 0 && this.refreshSunShadow) this.refreshSunShadow();
    // Refresh grass vibrancy every 10 seconds
    if (this.fc % 600 === 0) this.refreshGrassVibrancy();
  }
});

// ============================================================
//  INTERIOR SCENE — layout matches reference image (upload 1)
// ============================================================
var InteriorScene = {
  key: 'Interior',
  preload: function(){},

  create: function(){
    var self = this;
    var TS = TILE;
    // Room: 22 tiles wide x 15 tiles tall, centred in viewport
    var RW = 22, RH = 15;
    var OX = Math.floor((VIEW_W - RW*TS)/2);
    var OY = Math.floor((VIEW_H - RH*TS)/2);
    this._OX=OX; this._OY=OY; this._RW=RW; this._RH=RH;
    this._transitioning=false; this._exitHint=null;

    var g = this.add.graphics();

    // ── FLOORS ──
    // Main stone floor (grey-blue, whole interior)
    g.fillStyle(0x7a8090, 1);
    g.fillRect(OX+TS, OY+TS, (RW-2)*TS, (RH-2)*TS);
    // Stone block texture
    g.lineStyle(1, 0x606878, 0.4);
    for (var rr=1;rr<RH-1;rr++) for (var cc=1;cc<RW-1;cc++)
      g.strokeRect(OX+cc*TS, OY+rr*TS, TS, TS);

    // Bedroom red carpet (top-centre area, rows 1-4 cols 5-13)
    g.fillStyle(0x8a2020, 0.85);
    g.fillRect(OX+5*TS, OY+TS, 9*TS, 4*TS);
    // Carpet fringe
    g.lineStyle(2, 0xa03030, 1);
    g.strokeRect(OX+5*TS, OY+TS, 9*TS, 4*TS);

    // Pantry floor — slightly lighter (top-right, rows 1-5 cols 14-21)
    g.fillStyle(0x8a8898, 1);
    g.fillRect(OX+14*TS, OY+TS, 7*TS, 5*TS);

    // Small side room floor (left, rows 7-13 cols 1-5)
    g.fillStyle(0x707080, 1);
    g.fillRect(OX+TS, OY+7*TS, 4*TS, 6*TS);

    // Entry/porch floor (bottom area, row 13 cols 5-17)
    g.fillStyle(0x9a8878, 1);
    g.fillRect(OX+5*TS, OY+12*TS, 12*TS, 2*TS);
    // Red entry mat
    g.fillStyle(0x8a2828, 1);
    g.fillRect(OX+13*TS, OY+13*TS, 5*TS, TS);

    // ── WALLS ──
    // Outer walls (blue-grey stone)
    g.fillStyle(0x606878, 1);
    g.fillRect(OX, OY, RW*TS, TS);                          // N
    g.fillRect(OX, OY+(RH-1)*TS, RW*TS, TS);               // S
    g.fillRect(OX, OY, TS, RH*TS);                          // W
    g.fillRect(OX+(RW-1)*TS, OY, TS, RH*TS);               // E
    // Stone texture on walls
    g.lineStyle(1, 0x505868, 0.8);
    for (var wc=0;wc<RW;wc++){
      for (var rr2=0;rr2<RH;rr2++){
        var onWall = wc===0||wc===RW-1||rr2===0||rr2===RH-1;
        if (onWall && (wc+rr2)%2===0)
          g.strokeRect(OX+wc*TS+3, OY+rr2*TS+3, TS-6, TS-6);
      }
    }

    // White/cream trim border (inner edge of outer walls)
    g.fillStyle(0xece8d8, 1);
    g.fillRect(OX+TS-3, OY+TS-3, (RW-2)*TS+6, 3);          // N inner trim
    g.fillRect(OX+TS-3, OY+(RH-2)*TS, (RW-2)*TS+6, 3);     // S inner trim
    g.fillRect(OX+TS-3, OY+TS-3, 3, (RH-2)*TS+6);          // W inner trim
    g.fillRect(OX+(RW-2)*TS, OY+TS-3, 3, (RH-2)*TS+6);     // E inner trim

    // Interior dividing walls
    // Bedroom/hall divider (horizontal, row 5 cols 1-13)
    g.fillStyle(0x606878, 1);
    g.fillRect(OX+TS, OY+5*TS, 13*TS, TS);
    g.fillStyle(0xece8d8, 1);
    g.fillRect(OX+TS, OY+5*TS, 13*TS, 3);
    g.fillRect(OX+TS, OY+6*TS-3, 13*TS, 3);

    // Pantry vertical divider (col 14, rows 1-6)
    g.fillStyle(0x606878, 1);
    g.fillRect(OX+14*TS, OY+TS, TS, 5*TS);
    g.fillStyle(0xece8d8, 1);
    g.fillRect(OX+14*TS, OY+TS, 3, 5*TS);
    g.fillRect(OX+15*TS-3, OY+TS, 3, 5*TS);

    // Left side room vertical divider (col 5, rows 7-13)
    g.fillStyle(0x606878, 1);
    g.fillRect(OX+5*TS, OY+7*TS, TS, 6*TS);
    // Right side divider (col 14, rows 7-12)
    g.fillRect(OX+14*TS, OY+6*TS, TS, 7*TS);

    // Horizontal entry divider (row 12 cols 5-14)
    g.fillRect(OX+5*TS, OY+12*TS, 9*TS, TS);

    // ── DOOR OPENINGS (gaps in walls) ──
    // Main entrance (south wall, cols 9-11)
    g.fillStyle(0x1a1208, 1);
    g.fillRect(OX+9*TS+2, OY+(RH-1)*TS, TS*2-4, TS);
    // Left side room door (col 5, row 10-11)
    g.fillStyle(0x7a8090, 1);
    g.fillRect(OX+5*TS, OY+10*TS, TS, TS);
    // Pantry door (col 14, row 3-4)
    g.fillStyle(0x8a8898, 1);
    g.fillRect(OX+14*TS, OY+3*TS, TS, TS);
    // Right side door (col 14, row 9)
    g.fillStyle(0x7a8090, 1);
    g.fillRect(OX+14*TS, OY+9*TS, TS, TS);

    // Door exit marker
    this._doorX = OX+10*TS; this._doorY = OY+(RH-1)*TS;

    // ── FURNITURE ──
    // Using the Interior.png tileset via _placeCropImage-style approach but
    // also supplemented with Graphics primitives for a rich look

    var hasFurn = self.textures.exists('ts_interior');
    var fsrc = hasFurn ? self.textures.get('ts_interior').getSourceImage() : null;

    function furnCanvas(sx,sy,sw,sh,tx,ty,dw,dh){
      if (!fsrc) return;
      var key2='int2_'+sx+'_'+sy;
      if (!self.textures.exists(key2)){
        var c2=document.createElement('canvas'); c2.width=sw; c2.height=sh;
        c2.getContext('2d').drawImage(fsrc,sx,sy,sw,sh,0,0,sw,sh);
        self.textures.addCanvas(key2,c2);
      }
      return self.add.image(OX+tx*TS+dw/2,OY+ty*TS+dh,key2)
        .setOrigin(0.5,1).setDisplaySize(dw,dh).setDepth(OY+ty*TS+dh+1);
    }

    // BEDROOM (rows 1-4, cols 5-13)
    // Bed
    if (hasFurn) furnCanvas(0,0,64,64, 5.5,1, TS*2,TS*2);
    // Bedside table
    if (hasFurn) furnCanvas(64,0,32,32, 8,1, TS,TS);
    // Bookshelf
    if (hasFurn) furnCanvas(160,0,32,64, 10,1, TS*1.1,TS*2);
    // Second bookshelf with coloured books
    if (hasFurn) furnCanvas(128,0,32,64, 11.2,1, TS*1.1,TS*2);

    // Windows on N wall above bedroom (painted as Graphics)
    g.fillStyle(0x8b5a2a, 1);
    [[6.5,0.2],[9,0.2]].forEach(function(wp){ // two windows
      g.fillRect(OX+wp[0]*TS-14, OY+wp[1]*TS+2, 28, 22);
      g.fillStyle(0x7090b8, 1);
      g.fillRect(OX+wp[0]*TS-12, OY+wp[1]*TS+4, 24, 18);
      g.fillStyle(0x8b5a2a, 1);
      g.fillRect(OX+wp[0]*TS-1, OY+wp[1]*TS+4, 2, 18);
      g.fillRect(OX+wp[0]*TS-12, OY+wp[1]*TS+13, 24, 2);
    });

    // PANTRY (rows 1-5, cols 15-21)
    // Produce shelves
    if (hasFurn) furnCanvas(0,96,64,64, 15.5,1, TS*2.5,TS*2);
    // Barrels
    if (hasFurn) furnCanvas(64,96,32,32, 18.5,3, TS,TS);
    if (hasFurn) furnCanvas(96,0,32,32, 19.5,1, TS,TS);
    // Second shelf unit
    if (hasFurn) furnCanvas(128,96,32,32, 20,2, TS,TS);

    // MAIN HALL — Round rug + dining table
    // Round purple rug
    g.fillStyle(0x4848a0, 0.9);
    g.fillEllipse(OX+9.5*TS, OY+9.5*TS, TS*5, TS*4.5);
    g.lineStyle(2, 0x6060b8, 1);
    g.strokeEllipse(OX+9.5*TS, OY+9.5*TS, TS*5, TS*4.5);
    // Rug inner dotted border
    g.lineStyle(1, 0x5858b0, 0.6);
    g.strokeEllipse(OX+9.5*TS, OY+9.5*TS, TS*4.2, TS*3.8);

    // Dining table + chairs
    if (hasFurn) furnCanvas(0,160,96,96, 7.5,7.2, TS*3,TS*3);

    // LEFT SIDE ROOM (rows 7-12, cols 1-4)
    // Round arch door on west wall
    g.fillStyle(0x6a3a10, 1);
    g.fillRect(OX+TS+2, OY+10*TS-14, 28, 40);
    g.fillStyle(0x8b5a22, 1);
    g.fillRect(OX+TS+4, OY+10*TS-10, 24, 38);
    g.fillCircle(OX+TS+16, OY+10*TS-10, 12);
    // Small potion/craft table
    if (hasFurn) furnCanvas(0,160,64,48, 1.5,9, TS*1.8,TS*1.5);
    // Barrel
    if (hasFurn) furnCanvas(96,0,32,32, 3.5,11, TS*0.9,TS*0.9);

    // RIGHT SIDE AREA (rows 7-12, cols 15-21)
    // Stone arch on wall
    g.fillStyle(0x505868, 1);
    g.fillRect(OX+16*TS, OY+8*TS, TS*2.5, TS*2.5);
    g.fillStyle(0x404858, 1);
    g.fillCircle(OX+17.25*TS, OY+8*TS, TS*1.25);
    // Crafting bench / pump mechanism
    if (hasFurn) furnCanvas(96,160,64,64, 16.5,9, TS*2,TS*2);
    // Red carpet area
    g.fillStyle(0x8a2020, 0.7);
    g.fillRect(OX+15*TS, OY+12*TS, TS*5, TS);

    // STAIRS (top-left, rows 1-5, cols 1-4)
    var stairG = self.add.graphics().setDepth(OY+5*TS);
    stairG.fillStyle(0x8a6040, 1);
    stairG.fillRect(OX+TS+2, OY+TS+2, TS*4-4, TS*4-4);
    // Stair treads
    stairG.fillStyle(0x705030, 0.5);
    for (var si=0;si<7;si++)
      stairG.fillRect(OX+TS+2, OY+TS+2+si*((TS*4-4)/7), TS*4-4*(si/7), 3);
    // Stair side rails
    stairG.fillStyle(0x5a3820, 1);
    stairG.fillRect(OX+TS+2, OY+TS+2, 4, TS*4-4);
    stairG.fillRect(OX+5*TS-6, OY+TS+2, 4, TS*4-4);

    // ── PHYSICS WALLS ──
    this.iWalls=this.physics.add.staticGroup();
    var self3=this;
    function sw2(x,y,w,h){
      var r=self3.add.rectangle(x,y,w,h).setOrigin(0,0);
      self3.physics.add.existing(r,true); self3.iWalls.add(r);
    }
    // Outer walls
    sw2(OX, OY, RW*TS, TS);
    sw2(OX, OY+(RH-1)*TS, OX+9*TS-OX, TS);             // S left of door
    sw2(OX+11*TS, OY+(RH-1)*TS, (RW-11)*TS, TS);        // S right of door
    sw2(OX, OY, TS, RH*TS);
    sw2(OX+(RW-1)*TS, OY, TS, RH*TS);
    // Interior walls
    sw2(OX+TS, OY+5*TS, 13*TS, TS);
    sw2(OX+14*TS, OY+TS, TS, 5*TS);
    sw2(OX+5*TS, OY+7*TS, TS, 3*TS);   // left room wall N part
    sw2(OX+5*TS, OY+11*TS, TS, 2*TS);  // left room wall S part
    sw2(OX+14*TS, OY+6*TS, TS, 3*TS);  // right divider N part
    sw2(OX+14*TS, OY+10*TS, TS, 3*TS); // right divider S part
    sw2(OX+5*TS, OY+12*TS, 9*TS, TS);  // entry divider

    // Exit hint label
    this.add.text(OX+10*TS, OY+(RH-0.3)*TS, '[E] Exit',
      {fontFamily:'monospace',fontSize:'16px',color:'#f0d060',backgroundColor:'#1a1208',padding:{x:5,y:3}})
      .setOrigin(0.5).setScrollFactor(0).setDepth(99999);

    // ── PLAYER ──
    var ck=(ST&&ST.appearance&&ST.appearance.character)||'player';
    if (!this.textures.exists(ck)) ck='player';
    this._ip=this.physics.add.sprite(OX+10*TS, OY+(RH-2)*TS, ck, ck==='player'?0:1);
    this._ip.charKey=ck; this._ip.setOrigin(0.5,0.85).setDepth(9000).setCollideWorldBounds(true);
    if (ck==='player'){this._ip.body.setSize(20,16);this._ip.body.setOffset(30,56);}
    else{this._ip.body.setSize(14,10);this._ip.body.setOffset(9,20);}
    this._ip.facing='up';
    this._ip.play((ck==='player'?'':''+ck+'-')+'idle-up');
    this.physics.add.collider(this._ip,this.iWalls);

    this._ic=this.input.keyboard.createCursorKeys();
    this._ik=this.input.keyboard.addKeys('W,A,S,D,E,ESC');
    var self4=this;
    this.input.keyboard.on('keydown-E',function(){self4._tryExit();});
    this.input.keyboard.on('keydown-ESC',function(){self4._tryExit();});
    this.cameras.main.fadeIn(400,0,0,0);
  },

  _tryExit: function(){
    if (this._transitioning) return;
    var p=this._ip; if (!p) return;
    var near=Math.abs(p.x-this._doorX)<TILE*2.5 && p.y>this._doorY-TILE*1.5;
    if (!near){
      if (!this._exitHint){
        var self=this, txt=this.add.text(p.x,p.y-TILE*1.5,'Walk to the door',
          {fontFamily:'monospace',fontSize:'15px',color:'#f0d060',backgroundColor:'#1a1208',padding:{x:5,y:3}})
          .setOrigin(0.5).setDepth(99999);
        this._exitHint=txt;
        this.time.delayedCall(1800,function(){if(txt&&txt.scene)txt.destroy();self._exitHint=null;});
      }
      return;
    }
    this._doExit();
  },

  _doExit: function(){
    if (this._transitioning) return;
    this._transitioning=true; var self=this;
    this.cameras.main.fadeOut(400,0,0,0);
    this.cameras.main.once('camerafadeoutcomplete',function(){
      self._transitioning=false;
      self.scene.stop('Interior');
      self.scene.wake('Garden');
    });
  },

  update: function(time,delta){
    var p=this._ip; if (!p||this._transitioning) return;
    var spd=90,k=this._ik,c=this._ic,vx=0,vy=0;
    if((k.A&&k.A.isDown)||(c.left&&c.left.isDown))   vx=-spd;
    if((k.D&&k.D.isDown)||(c.right&&c.right.isDown))  vx=spd;
    if((k.W&&k.W.isDown)||(c.up&&c.up.isDown))        vy=-spd;
    if((k.S&&k.S.isDown)||(c.down&&c.down.isDown))    vy=spd;
    if(vx&&vy){vx*=0.707;vy*=0.707;}
    p.setVelocity(vx,vy);
    var ck=p.charKey||'player',mv=vx!==0||vy!==0,fc=p.facing;
    if(Math.abs(vx)>Math.abs(vy)) fc=vx<0?'left':'right';
    else if(vy!==0) fc=vy<0?'up':'down';
    p.facing=fc;
    var fl=false,af=fc;
    if(ck!=='player'&&fc==='right'){af='left';fl=true;}
    var an=(ck==='player'?'':ck+'-')+(mv?'walk-':'idle-')+af;
    if(!p.anims.currentAnim||p.anims.currentAnim.key!==an) p.play(an,true);
    p.setFlipX(fl); p.setDepth(p.y+1000);
  }
};

// ============================================================
//  PHASER CONFIG
// ============================================================
loadState();

var phaserConfig = {
  type: Phaser.AUTO,
  width: VIEW_W,
  height: VIEW_H,
  parent: 'game-container',
  backgroundColor: '#5a9a2a',
  pixelArt: true,
  roundPixels: true,
  physics: { default:'arcade', arcade:{ debug:false } },
  scene: [ BootScene, GardenScene, InteriorScene ],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

var game = new Phaser.Game(phaserConfig);
if (typeof window !== 'undefined') window.__phaserGame = game;
