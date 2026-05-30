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
  return {
    dp:dp, qz:qz, pr:pr, at:at,
    mailRead:[], achievements:[],
    // Character appearance — null means "use the sprite's original colour"
    appearance: { hair:null, skin:null, clothes:null, eyes:null }
  };
}

// Garden-themed colour palettes for character customisation.
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

// Classify a pixel's body-part category. Returns 'hair'|'skin'|'clothes'|null.
// Heuristics derived from the Player.png HSV clusters: dark pixels = hair,
// warm peachy mid-V = skin, blue mid-saturation = clothes. Everything else
// (eyes, shoes, leather, edge anti-alias) is left as-is.
function classifyPixel(r, g, b){
  var hsl = rgbToHsl(r, g, b);
  var hue = hsl[0], sat = hsl[1], lum = hsl[2];
  // Hair = very dark (low luminance)
  if (lum < 0.18) return 'hair';
  // Skin = warm hue, mid-high luminance, low-mid saturation
  if ((hue < 0.10 || hue > 0.92) && lum > 0.45 && sat > 0.10 && sat < 0.65) return 'skin';
  // Clothes = blueish hue with reasonable saturation
  if (hue >= 0.50 && hue <= 0.72 && sat > 0.18) return 'clothes';
  return null;
}

// Recolour the player sprite based on user's chosen palette hexes.
// Stores the result as a new texture under key 'player' (replacing the original).
function applyAppearance(scene){
  if (!ST || !ST.appearance) return;
  var srcKey = 'player_src';
  // Stash the untouched original under 'player_src' on first call
  if (!scene.textures.exists(srcKey)){
    var origImg = scene.textures.get('player').getSourceImage();
    var origCnv = document.createElement('canvas');
    origCnv.width = origImg.width; origCnv.height = origImg.height;
    origCnv.getContext('2d').drawImage(origImg, 0, 0);
    scene.textures.addCanvas(srcKey, origCnv);
  }
  var srcImg = scene.textures.get(srcKey).getSourceImage();
  var w = srcImg.width, h = srcImg.height;
  var cnv = document.createElement('canvas');
  cnv.width = w; cnv.height = h;
  var ctx = cnv.getContext('2d');
  ctx.drawImage(srcImg, 0, 0);
  var ap = ST.appearance;
  if (ap.hair || ap.skin || ap.clothes){
    var imgd = ctx.getImageData(0, 0, w, h);
    var d = imgd.data;
    var targets = {
      hair:    ap.hair    ? rgbToHsl(hexToRgb(ap.hair).r,    hexToRgb(ap.hair).g,    hexToRgb(ap.hair).b)    : null,
      skin:    ap.skin    ? rgbToHsl(hexToRgb(ap.skin).r,    hexToRgb(ap.skin).g,    hexToRgb(ap.skin).b)    : null,
      clothes: ap.clothes ? rgbToHsl(hexToRgb(ap.clothes).r, hexToRgb(ap.clothes).g, hexToRgb(ap.clothes).b) : null
    };
    for (var i=0; i<d.length; i+=4){
      if (d[i+3] === 0) continue;
      var part = classifyPixel(d[i], d[i+1], d[i+2]);
      if (!part || !targets[part]) continue;
      var orig = rgbToHsl(d[i], d[i+1], d[i+2]);
      // Take target hue + saturation, keep original luminance (preserves shading).
      var out = hslToRgb(targets[part][0], targets[part][1], orig[2]);
      d[i] = out[0]; d[i+1] = out[1]; d[i+2] = out[2];
    }
    ctx.putImageData(imgd, 0, 0);
  }
  // Replace the player texture
  if (scene.textures.exists('player')) scene.textures.remove('player');
  scene.textures.addSpriteSheet('player', cnv, { frameWidth: 80, frameHeight: 80 });
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
var FARMHOUSE = { c:3, r:3, w:5, h:6 };   // cols 3-7, rows 3-8
var NOTICEBOARD = { c:8, r:8 };
var WELL = { c:9, r:9 };
var STUDY_TREE = { c:18, r:11, w:3, h:3 }; // 3x3 footprint
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
  m3: [[4,5],[5,5],[6,5],[7,5],[7,5]],  // pumpkin (cols 4-7 row 5)
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
    this.load.image('ts_plants',    A+'Plants.png');

    // Existing assets we still use
    this.load.image('terrain',    A+'Terrain.png');       // bright-green grass (the old look)
    this.load.image('gardenbeds', A+'Garden_beds.png');   // soil texture for module beds
    this.load.spritesheet('player', A+'Player.png', { frameWidth:80, frameHeight:80 });
    this.load.spritesheet('water', A+'Water_tile_animation.png', { frameWidth:32, frameHeight:32 });
    this.load.spritesheet('butterfly', A+'White_butterfly_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('bee', A+'Bee_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdfly', A+'Bird_fly.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdtakeoff', A+'Bird_take-off.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('leaves', A+'Leaves.png', { frameWidth:16, frameHeight:16 });
    this.load.image('seedling', A+'Hole_with_a_seedling.png');
    this.load.image('pondborder', A+'PondBorders.png'); // re-used as the well
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
    ['ts_buildings','ts_details','ts_crops','ts_terrainA5','ts_terrainEx','ts_orchard','ts_plants'].forEach(keyOut);

    // Apply any saved character appearance to the player sprite before animations build
    applyAppearance(this);

    buildAnimations(this);
    this.scene.start('Garden');
  }
});

function buildAnimations(scene){
  var anims = scene.anims;
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
  },

  // ============================================================
  //  GROUND LAYER
  // ============================================================
  buildGround: function(){
    var TM = [];
    for (var r=0;r<MAP_H;r++){ TM.push([]); for (var c=0;c<MAP_W;c++) TM[r].push(T_GRASS); }

    // ---- River + waterfall + pond ----
    // Waterfall: cols 33-35 rows 0-2 (water cascading from above-map)
    for (var r=0; r<=2; r++){
      for (var c=33; c<=35; c++) TM[r][c] = T_WATERFALL;
    }
    // Vertical river: cols 33-35 rows 3-26 (carries on south from waterfall)
    for (var r=3; r<=26; r++){
      for (var c=33; c<=35; c++) TM[r][c] = T_WATER;
    }
    // Horizontal river across the bottom: cols 0-39 rows 27-29
    for (var r=27; r<=29; r++){
      for (var c=0; c<=39; c++) TM[r][c] = T_WATER;
    }
    // Bottom-left pond (extends north of the bottom river, blending in)
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

    // Centre ring (2 thick) around Study Tree at cols 18-20 rows 11-13
    pathRect(16, 22,  9, 10);    // N strip
    pathRect(16, 22, 14, 15);    // S strip
    pathRect(16, 17, 11, 13);    // W side
    pathRect(21, 22, 11, 13);    // E side

    // Upper E-W corridor: south of farmhouse to centre ring
    pathRect(6, 22,  9, 10);

    // Lower E-W corridor: extends east toward cave river edge
    pathRect(6, 32, 14, 15);

    // Vertical "lung" linking upper to lower west of tree
    pathRect(6, 7, 11, 13);

    // South vertical down to M1 bed (cols 4-7 rows 18-21)
    pathRect(6, 7, 16, 17);

    // South vertical down to M4 bed (cols 13-16 rows 21-24)
    pathRect(16, 17, 16, 20);

    // Upper-corridor north spur to M2 bed (cols 26-29 rows 4-7)
    pathRect(24, 25, 6, 8);

    // Lower-corridor south spur to M3 bed (cols 27-30 rows 17-20)
    pathRect(25, 26, 16, 17);

    // Cave-side path (far bank, unreachable across river)
    pathRect(37, 38,  3, 26);
    pathRect(36, 38,  3,  4);

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
    var terrOld = this.textures.get('terrain').getSourceImage();      // bright green grass
    var gardenbeds = this.textures.get('gardenbeds').getSourceImage(); // soil texture

    // Helper: draw a 32px tile from a sheet at (sc,sr) tile coords on TerrainA5
    function drawA5(sc, sr, dx, dy){
      ctx.drawImage(terrA5, sc*TS, sr*TS, TS, TS, dx, dy, TS, TS);
    }
    // Old Terrain.png grass is 16x16 source, scaled up to 32x32 destination
    function drawGrassOld(variantCol, dx, dy){
      ctx.drawImage(terrOld, variantCol*16, 0, 16, 16, dx, dy, TS, TS);
    }
    // Garden_beds.png soil — 16x16 source, scaled to 32x32. 3 col x 2 row of interior soil.
    function drawSoil(sc, sr, dx, dy){
      ctx.drawImage(gardenbeds, sc*16, sr*16, 16, 16, dx, dy, TS, TS);
    }

    // ---- GRASS — bright-green old Terrain.png, 3 variants, deterministic per tile ----
    for (var r=0;r<MAP_H;r++){
      for (var c=0;c<MAP_W;c++){
        if (TM[r][c] === T_GRASS){
          var h = ((c*2654435761)^(r*2246822519))>>>0;
          drawGrassOld(h % 3, c*TS, r*TS);
        }
      }
    }

    // ---- GARDEN BED SOIL — old Garden_beds.png interior tiles ----
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_DIRT){
        var h = ((c*1597334677)^(r*3812015801))>>>0;
        drawSoil(h % 3, h % 2, c*TS, r*TS);
      }
    }

    // ---- PATH tiles — auto-tile from TerrainA5 (cols 0-3, rows 1-3) ----
    function isPath(c, r){
      if (r<0||r>=MAP_H||c<0||c>=MAP_W) return false;
      return TM[r][c] === T_PATH;
    }
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] !== T_PATH) continue;
      var n = !isPath(c, r-1);
      var s = !isPath(c, r+1);
      var e = !isPath(c+1, r);
      var w = !isPath(c-1, r);
      var sc = w ? 0 : (e ? 3 : 1);
      var sr = n ? 1 : (s ? 3 : 2);
      drawA5(sc, sr, c*TS, r*TS);
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
    // ---- Waterfall band ----
    for (var rr=0; rr<=2; rr++){
      for (var ci=0; ci<3; ci++){
        var sx = (5+ci)*TS, sy;
        if (rr===0) sy = 1*TS;
        else if (rr===1) sy = 3*TS;
        else sy = 6*TS;
        this._placeCropImage('ts_terrainA5', sx, sy, TS, TS,
          (33+ci)*TS + TS/2, rr*TS + TS, TS, TS, 1);
      }
    }
  },

  // ============================================================
  //  Helper to extract a sub-region of a loaded image as a sprite
  // ============================================================
  _placeCropImage: function(key, sx, sy, sw, sh, wx, wy, dw, dh, depth){
    var img = this.textures.get(key).getSourceImage();
    var tkey = key+'_'+sx+'_'+sy+'_'+sw+'_'+sh;
    if (!this.textures.exists(tkey)){
      var cnv = this.textures.createCanvas(tkey, sw, sh);
      cnv.getContext().drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      cnv.refresh();
    }
    var spr = this.add.image(wx, wy, tkey).setOrigin(0.5, 1);
    if (dw) spr.setDisplaySize(dw, dh);
    if (depth!==undefined) spr.setDepth(depth);
    else spr.setDepth(wy);
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
    // Mix of thick shrubs, fir trees, mushrooms, and boulders for an authentic woodland feel.
    var FOREST = [
      // type: 'shrub' | 'fir' | 'mushroom' | 'boulder'
      // Each entry references a 32x32 region of Details32, with sub-tile rendering size.
      { type:'shrub',    sx: 14*32, sy: 5*32, sw: 32, sh: 32, dispW: 1.15, dispH: 1.15, weight: 25 },
      { type:'shrub',    sx: 15*32, sy: 5*32, sw: 32, sh: 32, dispW: 1.15, dispH: 1.15, weight: 25 },
      { type:'shrub',    sx: 13*32, sy: 5*32, sw: 32, sh: 32, dispW: 1.05, dispH: 1.05, weight: 20 },
      // Fir trees from Details32 (cols 1-3 rows 9-11, 96x96)
      { type:'fir',      sx: 32,    sy: 288,  sw: 96, sh: 96, dispW: 2.4,  dispH: 3.2,  weight: 10 },
      // Mushrooms — Details32 has small mushroom-like tiles around col 12-13 row 12 in Plants.png
      // but we keep this layer simple using Details32 small detail tiles (cols 0, 1 row 4 = small fungus shapes)
      { type:'mushroom', sx: 0,     sy: 4*32, sw: 32, sh: 32, dispW: 0.7,  dispH: 0.7,  weight: 8  },
      // Boulders — Details32 (cols 1-3 row 4)
      { type:'boulder',  sx: 1*32,  sy: 4*32, sw: 32, sh: 32, dispW: 0.95, dispH: 0.95, weight: 6  },
      { type:'boulder',  sx: 2*32,  sy: 4*32, sw: 32, sh: 32, dispW: 0.95, dispH: 0.95, weight: 6  }
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
      var h = shrubHash(c, r, salt);
      var f = pickForest(h);
      var jx = ((h >>> 5) % 11) - 5;
      var jy = ((h >>> 9) % 7) - 3;
      var wx = c*TS + TS/2 + jx;
      var wy = r*TS + TS + jy;
      // Optional ground shadow for taller items
      if (f.type === 'fir' || f.type === 'boulder'){
        var sg = this.add.graphics().setDepth(wy - 1);
        sg.fillStyle(0x000000, 0.40);
        sg.fillEllipse(wx, wy - 2, TS * f.dispW * 0.50, 7);
      }
      this._placeCropImage('ts_details', f.sx, f.sy, f.sw, f.sh,
        wx, wy, TS * f.dispW, TS * f.dispH, wy);
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

    // Helper to drop a slightly-darker shadow ellipse under a sprite
    function shadow(wx, wy, w, h){
      var g = self.add.graphics().setDepth(wy - 1);
      g.fillStyle(0x000000, 0.45);  // darker than the old 0.25
      g.fillEllipse(wx, wy - 2, w, h);
      return g;
    }

    // ---- FARMHOUSE (top-left) ----
    // Source: Buildings32 cols 0-4 rows 0-5 = px(0,0,160,192). Was 128 wide which cut off
    // the right edge with the chimney/birdhouse — corrected to 160.
    var fhPxX = (FARMHOUSE.c) * TS;
    var fhPxY = (FARMHOUSE.r) * TS;
    var fhW = FARMHOUSE.w * TS, fhH = FARMHOUSE.h * TS;
    shadow(fhPxX + fhW/2, fhPxY + fhH + 4, fhW*0.85, 14);
    this._placeCropImage('ts_buildings', 0, 0, 160, 192,
      fhPxX + fhW/2, fhPxY + fhH, fhW, fhH, fhPxY + fhH);

    // ---- NOTICEBOARD (mailbox replacement next to farmhouse) ----
    // Source: Buildings32 col 4 row 0 = px(128,0,32,32)
    var nbX = NOTICEBOARD.c * TS, nbY = NOTICEBOARD.r * TS;
    shadow(nbX + TS/2, nbY + TS, TS*0.7, 8);
    this._placeCropImage('ts_buildings', 128, 0, 32, 32,
      nbX + TS/2, nbY + TS, TS, TS, nbY + TS);

    // (Well removed — practicals tracker is now part of the Farmhouse interaction.)

    // ---- STUDY TREE (centre of map) — apple tree from Orchard tileset.
    //      Largest tree when fully grown. Base centred in the central square.
    var stX = STUDY_TREE.c * TS, stY = STUDY_TREE.r * TS;
    var stW = STUDY_TREE.w * TS, stH = STUDY_TREE.h * TS;
    // Centre of the path ring (centre of the 3x3 footprint, anchored at base)
    var centreX = stX + stW/2;
    var baseY = stY + stH;     // base of the tree sits at the bottom of its footprint
    this.studyTreeSprite = null;
    this.studyTreeShadow = null;
    this.studyTreeCentreX = centreX;
    this.studyTreeBaseY   = baseY;
    // Make the apple tree the LARGEST tree at full growth — scale up considerably.
    this.studyTreeMaxW    = TS * 4.5;
    this.studyTreeMaxH    = TS * 5.5;
    this.refreshStudyTree();

    // ---- CAVE (top-right, beyond river) ----
    var cvX = CAVE.c * TS, cvY = CAVE.r * TS;
    var cvW = CAVE.w * TS, cvH = CAVE.h * TS;
    shadow(cvX + cvW/2, cvY + cvH + 2, cvW*0.85, 12);
    // Source: TerrainExpanded cols 10-12 rows 5-7 -> px(320,160,96,96)
    this._placeCropImage('ts_terrainEx', 320, 160, 96, 96,
      cvX + cvW/2, cvY + cvH, cvW, cvH, cvY + cvH);
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

    // Apple-tree growth progression on Orchard32 (each variant is 64x96 px = 2x3 tiles):
    //   stage 1: small sprout       (1, 2) — 32x64
    //   stage 2: white blossom      (2, 0) — 64x96 (cols 2-3, rows 0-2)
    //   stage 3: green leafy        (4, 0) — 64x96 (cols 4-5, rows 0-2)
    //   stage 4: bigger green       (6, 0) — 64x96 (cols 6-7, rows 0-2)
    //   stage 5: full red apple     (8, 0) — 64x96 (cols 8-9, rows 0-2)
    var VARIANTS = [
      null,
      { sx:32,  sy:64, sw:32, sh:64, scale:0.30 },
      { sx:64,  sy:0,  sw:64, sh:96, scale:0.55 },
      { sx:128, sy:0,  sw:64, sh:96, scale:0.75 },
      { sx:192, sy:0,  sw:64, sh:96, scale:0.90 },
      { sx:256, sy:0,  sw:64, sh:96, scale:1.00 }
    ];
    var v = VARIANTS[stage];
    var w = this.studyTreeMaxW * v.scale;
    var h = this.studyTreeMaxH * v.scale;

    // Procedural shadow that hugs the BASE/TRUNK (not the full canopy width),
    // shifted UP from the base of the sprite to sit at trunk level.
    // The trunk is at the bottom ~15% of these tree sprites.
    var trunkY = this.studyTreeBaseY - 4;   // shadow sits at trunk base
    var shadowW = w * 0.40;                  // narrower than canopy
    var shadowAlpha = 0.30 + v.scale * 0.20; // 0.36 → 0.50 across stages
    this.studyTreeShadow = this.add.graphics().setDepth(this.studyTreeBaseY - 1);
    this.studyTreeShadow.fillStyle(0x000000, shadowAlpha);
    this.studyTreeShadow.fillEllipse(this.studyTreeCentreX, trunkY, shadowW, 6 + v.scale * 8);

    this.studyTreeSprite = this._placeCropImage('ts_orchard', v.sx, v.sy, v.sw, v.sh,
      this.studyTreeCentreX, this.studyTreeBaseY, w, h, this.studyTreeBaseY);
  },

  // ============================================================
  //  GARDEN BEDS — spread out, no progress bar, wider crop grid
  // ============================================================
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

    // Lookup tile coords on Crops32 for this crop+stage
    var cropPos = CROP_TILES[b.m][stage-1];
    var sx = cropPos[0] * 32, sy = cropPos[1] * 32;

    // Dense grid: 4 cols x 4 rows = 16 plants per bed. Each plant is smaller now.
    var cols = 4, rows = 4;
    var marginX = 10, marginY = 10;
    var usableW = bed.bw - marginX*2;
    var usableH = bed.bh - marginY*2;
    var stepX = usableW / (cols - 1);
    var stepY = usableH / (rows - 1);
    // Smaller crops: stage 1 = 18px, stage 5 = 22px (well under TILE size)
    var size = 18 + stage * 1.0;

    // Slice the crop tile once and reuse
    var tkey = 'crop_'+b.m+'_s'+stage;
    if (!this.textures.exists(tkey)){
      var src = this.textures.get('ts_crops').getSourceImage();
      var cnv = this.textures.createCanvas(tkey, 32, 32);
      cnv.getContext().drawImage(src, sx, sy, 32, 32, 0, 0, 32, 32);
      cnv.refresh();
    }

    for (var ri=0; ri<rows; ri++){
      for (var ci=0; ci<cols; ci++){
        // Slight jitter for a natural farm look (deterministic per cell)
        var hh = ((b.c1+ci)*73 ^ (b.r1+ri)*131 ^ stage*17) >>> 0;
        var jx = ((hh >>> 3) % 5) - 2;
        var jy = ((hh >>> 7) % 5) - 2;
        var px = bed.x1 + marginX + ci*stepX + jx;
        var py = bed.y1 + marginY + ri*stepY + jy;
        var s = this.add.image(px, py, tkey).setOrigin(0.5, 0.5).setDisplaySize(size, size);
        bed.plants.add(s);
      }
    }
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
        // Procedural drop shadow — at the TRUNK level, not below the leaves.
        // Tree sprites are drawn with origin (0.5, 1) so wy is the base; the
        // trunk meets ground roughly at wy itself, but we nudge up slightly so
        // the shadow visually anchors to the trunk rather than overshooting.
        var sg = self.add.graphics().setDepth(wy - 1);
        sg.fillStyle(0x000000, 0.40);
        sg.fillEllipse(wx, wy - 2, TS * variant.dispW * 0.40, 8);
        self._placeCropImage('ts_details', variant.sx, variant.sy, variant.sw, variant.sh,
          wx, wy, TS * variant.dispW, TS * variant.dispH, wy);
      }
    }

    // ---- SUNFLOWERS — organised placement inside the farm + along the borders ----
    // Source: Plants.png at (1, 13) px(32, 416). A 32x32 cell with a tall sunflower.
    var SUN_SPOTS = [
      // Inside the farm — flanking key landmarks
      [11, 9], [11, 15],
      [22, 9], [22, 15],
      [9, 12], [9, 13],
      [27, 10], [27, 14],
      [14, 19], [18, 19],
      // Inside the perimeter — a cosy line of sunflowers along the fence lines
      [4, 3], [10, 3], [16, 3], [22, 3], [28, 3], [31, 3],
      [3, 12], [3, 16], [3, 20]
    ];
    SUN_SPOTS.forEach(function(pt){
      var c = pt[0], r = pt[1];
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) return;
      if (TM[r][c] !== T_GRASS) return;
      var wx = c*TS + TS/2, wy = r*TS + TS;
      var g = self.add.graphics().setDepth(wy - 1);
      g.fillStyle(0x000000, 0.30);
      g.fillEllipse(wx, wy - 1, TS*0.45, 4);
      self._placeCropImage('ts_plants', 32, 416, 32, 32, wx, wy, TS*0.95, TS*1.20, wy);
    });
    this.sunflowerSpots = SUN_SPOTS.slice();

    // ---- LILY PADS on the pond ----
    var LILY_SPOTS = [ [3, 24], [5, 23], [7, 25], [2, 26], [6, 24] ];
    LILY_SPOTS.forEach(function(pt){
      var c = pt[0], r = pt[1];
      if (c < 0 || c >= MAP_W || r < 0 || r >= MAP_H) return;
      if (TM[r][c] !== T_WATER) return;
      var wx = c*TS + TS/2, wy = r*TS + TS/2;
      // Plants.png at (20, 13) — small lily pad
      self._placeCropImage('ts_plants', 20*32, 13*32, 32, 32, wx, wy, TS*0.7, TS*0.5, 2);
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
  },

  updatePlayer: function(){
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
    f.setOrigin(0.5, 0.85);
    f.setDepth(f.y);
    f.setTint(0xf4c87a);  // straw-yellow tint to distinguish from the player
    f.facing = 'down';
    f.play('idle-down');
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
      if (f.anims.currentAnim===null || f.anims.currentAnim.key!=='idle-'+face) f.play('idle-'+face);
      f.facing = face;
      f.setDepth(f.y);
      return;
    }
    if (this.farmerPause > 0){
      this.farmerPause -= dtMs;
      if (f.anims.currentAnim===null || f.anims.currentAnim.key!=='idle-'+f.facing) f.play('idle-'+f.facing);
      return;
    }
    var wp = this.farmerRoute[this.farmerIdx];
    var dx = wp.x - f.x, dy = wp.y - f.y;
    var d = Math.hypot(dx, dy);
    if (d < 3){
      // Arrived — pause briefly then advance
      this.farmerPause = 1200 + Math.random()*900;
      f.facing = wp.face || 'down';
      f.play('idle-'+f.facing);
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
    var anim = 'walk-'+face;
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
      { id:'tree',      label:'STUDY TREE — Quizzes',        cx: STUDY_TREE.c + STUDY_TREE.w/2, cy: STUDY_TREE.r + STUDY_TREE.h/2, r:3.5 },
      { id:'mailbox',   label:'NOTICEBOARD — Messages',      cx: NOTICEBOARD.c + 0.5, cy: NOTICEBOARD.r + 0.5, r:2.0 },
      { id:'cave',      label:'CAVE — Extension',            cx: CAVE.c + CAVE.w/2, cy: CAVE.r + CAVE.h/2, r:4.0 }
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
      // The cave is across the river; player can't physically reach it, but
      // if the river is ever crossable this preserves the unlock.
      if (overallConfidentPct() < 0.75){
        this.showToast('The cave is locked — reach 75% confident dot points.');
        return;
      }
    }
    openModal(o.id, this);
  },

  // ============================================================
  //  HUD
  // ============================================================
  buildHUD: function(){
    this.hint = this.add.text(VIEW_W/2, VIEW_H-30, '', {
      fontFamily:'monospace', fontSize:'13px', color:'#f0d060',
      backgroundColor:'#0a0804cc', padding:{x:10,y:5}
    }).setOrigin(0.5).setScrollFactor(0).setDepth(99999).setVisible(false);

    this.badge = this.add.text(10, 10, CONFIG_SEASON_BADGE, {
      fontFamily:'monospace', fontSize:'10px', color:'#f0d060',
      backgroundColor:'#0a0804cc', padding:{x:6,y:3}
    }).setScrollFactor(0).setDepth(99999);

    this.controls = this.add.text(VIEW_W-10, 10, 'WASD move \u00b7 E interact', {
      fontFamily:'monospace', fontSize:'10px', color:'#80c040',
      backgroundColor:'#0a0804cc', padding:{x:6,y:3}
    }).setOrigin(1,0).setScrollFactor(0).setDepth(99999);

    this.toastTxt = this.add.text(VIEW_W/2, 50, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#80c040',
      backgroundColor:'#0a0804ee', padding:{x:10,y:5}
    }).setOrigin(0.5).setScrollFactor(0).setDepth(99999).setAlpha(0);

    // ---- Customise button in the bottom-right corner of the viewport ----
    var self = this;
    this.customBtn = this.add.text(VIEW_W-10, VIEW_H-10, 'CUSTOMISE', {
      fontFamily:'monospace', fontSize:'11px', color:'#1a2a14',
      backgroundColor:'#9ad08a', padding:{x:10,y:6}
    }).setOrigin(1,1).setScrollFactor(0).setDepth(99999).setInteractive({ useHandCursor:true });
    this.customBtn.on('pointerdown', function(){ openModal('customise', self); });
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
      this.updatePlayer();
    }
    this.updateCreatures();
    this.updateFarmer(delta);
    this.updateHUD();
    if (this.fc % 30 === 0 && this.beds){
      for (var i=0;i<this.beds.length;i++) this.refreshBed(this.beds[i]);
      this.refreshStudyTree();
    }
  }
});

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
  scene: [ BootScene, GardenScene ],
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

var game = new Phaser.Game(phaserConfig);
