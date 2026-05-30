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
  return { dp:dp, qz:qz, pr:pr, at:at, mailRead:[], achievements:[] };
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
var FARMHOUSE = { c:1, r:1, w:5, h:6 };   // place at cols 1-5, rows 1-6 (scaled up slightly)
var NOTICEBOARD = { c:6, r:6 };
var WELL = { c:7, r:7 };
var STUDY_TREE = { c:18, r:11, w:3, h:3 }; // 3x3 footprint
var CAVE = { c:36, r:0, w:3, h:3 };        // top-right, ACROSS the river/waterfall channel

// Garden beds (spread out, 4-tile-wide, 4-tile-tall footprints)
var BED_DEFS = [
  { m:'m1', cropKey:'crop_m1', c1:2,  r1:18, c2:5,  r2:21, title:'M1: CELLS' },
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

    // Existing assets we still use
    this.load.spritesheet('player', A+'Player.png', { frameWidth:80, frameHeight:80 });
    this.load.spritesheet('water', A+'Water_tile_animation.png', { frameWidth:32, frameHeight:32 });
    this.load.spritesheet('butterfly', A+'White_butterfly_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('bee', A+'Bee_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdfly', A+'Bird_fly.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdtakeoff', A+'Bird_take-off.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('leaves', A+'Leaves.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('drops', A+'Drops.png', { frameWidth:16, frameHeight:16 });
    this.load.image('seedling', A+'Hole_with_a_seedling.png');
    this.load.image('treeshadow', A+'Tree_shadow.png');
    this.load.image('pondborder', A+'PondBorders.png'); // re-used as the well
    // Scatter decor — trees + flowers from the original asset set
    this.load.image('commontree', A+'Common_tree.png');
    this.load.image('birch',      A+'Birch.png');
    this.load.image('fir',        A+'Fir.png');
    this.load.image('appletree',  A+'Apple_tree.png');
    this.load.image('flowers',    A+'Flowers.png');
  },
  create: function(){ buildAnimations(this); this.scene.start('Garden'); }
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

    // ---- Path network (yellow sand) ----
    function p(c, r){ if (r>=0 && r<MAP_H && c>=0 && c<MAP_W && TM[r][c] === T_GRASS) TM[r][c] = T_PATH; }

    // Centre ring around the Study Tree (tree at cols 18-20 rows 11-13).
    // Path frames a 5x5 ring at cols 17-21 rows 10-14 (perimeter only).
    for (var c=17; c<=21; c++){ p(c, 10); p(c, 14); }
    for (var r=11; r<=13; r++){ p(17, r); p(21, r); }

    // Path from farmhouse south to the centre ring
    for (var r=7; r<=10; r++) p(4, r);
    for (var c=4; c<=17; c++) p(c, 10);

    // Path south to M1 bed (cols 2-5, rows 18-21) — col 4 down then west under bed
    for (var r=11; r<=17; r++) p(4, r);
    for (var c=2; c<=7; c++)  p(c, 17);

    // Path NE to M2 bed (cols 26-29, rows 4-7)
    for (var c=21; c<=25; c++) p(c, 9);
    for (var r=4;  r<=9;  r++) p(25, r);

    // Path east to M3 bed (cols 27-30, rows 17-20)
    for (var c=21; c<=26; c++) p(c, 15);
    for (var r=15; r<=17; r++) p(26, r);

    // Path south to M4 bed (cols 13-16, rows 21-24)
    for (var r=14; r<=20; r++) p(17, r);
    for (var c=13; c<=17; c++) p(c, 20);

    // Path east heading toward the cave — terminates at the river (col 32)
    for (var c=22; c<=32; c++) p(c, 12);

    // Cave-side path (on the FAR bank of the river)
    // Cave at cols 36-38 rows 0-2; path runs south from col 37
    for (var r=3; r<=26; r++) p(37, r);
    // Path along the foot of the cave entrance
    for (var c=36; c<=38; c++) p(c, 3);

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
    var terrEx = this.textures.get('ts_terrainEx').getSourceImage();

    // Helper: draw a 32px tile from a sheet at (sc,sr) tile coords to (dx,dy) world px
    function drawTile(img, sc, sr, dx, dy){
      ctx.drawImage(img, sc*TS, sr*TS, TS, TS, dx, dy, TS, TS);
    }

    // Grass variants (TerrainA5 row 0): cols 1,2 plain; cols 3,4 with tufts
    // We retint slightly darker for nicer contrast with paths. Approach: draw, then
    // overlay a 12% black wash on the whole grass field for cohesion.
    for (var r=0;r<MAP_H;r++){
      for (var c=0;c<MAP_W;c++){
        if (TM[r][c] === T_GRASS){
          var h = ((c*2654435761)^(r*2246822519))>>>0;
          var v = h % 10;
          var sc = (v<6) ? 1 : (v<8 ? 2 : (v<9 ? 3 : 4));
          drawTile(terrA5, sc, 0, c*TS, r*TS);
        }
      }
    }
    // Subtle darkening wash on grass for richer palette
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_GRASS) ctx.fillRect(c*TS, r*TS, TS, TS);
    }

    // Garden bed soil — use a brown wash plus subtle texture
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_DIRT){
        ctx.fillStyle = '#6b4a26';
        ctx.fillRect(c*TS, r*TS, TS, TS);
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        var h = ((c*1597334677)^(r*3812015801))>>>0;
        for (var i=0;i<5;i++){
          var sx = (h>>>(i*3)) & 31, sy = (h>>>(i*4+1)) & 31;
          ctx.fillRect(c*TS+sx, r*TS+sy, 2, 2);
        }
        ctx.strokeStyle = '#3e2a14';
        ctx.lineWidth = 1;
        ctx.strokeRect(c*TS+0.5, r*TS+0.5, TS-1, TS-1);
      }
    }

    // Path tiles — auto-tile based on neighbours.
    // Map of 8-neighbour pattern -> (sc,sr) tile pick.
    // We use only N/S/E/W edges for picking the 9-cell autotile (cols 0-3, rows 1-3).
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
      // Pick tile column (0..3) and row (1..3) on TerrainA5
      var sc = w ? 0 : (e ? 3 : 1);
      var sr = n ? 1 : (s ? 3 : 2);
      drawTile(terrA5, sc, sr, c*TS, r*TS);
    }

    // Water cells — base colour first (animated sprites layered on top in next step)
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_WATER || TM[r][c] === T_WATERFALL){
        ctx.fillStyle = '#4a8ec8';
        ctx.fillRect(c*TS, r*TS, TS, TS);
      }
    }

    // Stone borders around water (rock rim where water meets non-water)
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] !== T_WATER && TM[r][c] !== T_WATERFALL) continue;
      // Pick neighbour-aware rock edge tile from TerrainEx (cols 5-7 rows 4-6 are rock walls; we use simple darken)
      // Quick approach: overlay dark stone rim on the outer edges of water
      ctx.fillStyle = '#3a3a48';
      var below = (r+1<MAP_H && TM[r+1][c] !== T_WATER && TM[r+1][c] !== T_WATERFALL);
      var above = (r-1>=0 && TM[r-1][c] !== T_WATER && TM[r-1][c] !== T_WATERFALL);
      var right = (c+1<MAP_W && TM[r][c+1] !== T_WATER && TM[r][c+1] !== T_WATERFALL);
      var left  = (c-1>=0 && TM[r][c-1] !== T_WATER && TM[r][c-1] !== T_WATERFALL);
      if (below) ctx.fillRect(c*TS, r*TS+TS-3, TS, 3);
      if (above) ctx.fillRect(c*TS, r*TS, TS, 3);
      if (right) ctx.fillRect(c*TS+TS-3, r*TS, 3, TS);
      if (left)  ctx.fillRect(c*TS, r*TS, 3, TS);
    }

    // Path edge shadow (small drop into grass)
    ctx.fillStyle='rgba(0,0,0,0.22)';
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_PATH){
        var above = r>0 ? TM[r-1][c] : T_GRASS;
        if (above===T_GRASS) ctx.fillRect(c*TS, r*TS, TS, 3);
      }
    }

    cnv.refresh();
    this.add.image(0,0,key).setOrigin(0,0).setDepth(0);

    // ---- Animated water on top of water cells ----
    this.waterTiles = [];
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c] === T_WATER){
        var w = this.add.sprite(c*TS, r*TS, 'water').setOrigin(0,0).setDepth(1);
        w.setDisplaySize(TS, TS);
        w.play('water-anim');
        w.anims.setProgress(((c+r)%3)/3);
        // Slightly darker tint over the river/pond water for richer palette
        w.setTint(0x8fc0e0);
        w.setAlpha(0.92);
        this.waterTiles.push(w);
      }
    }
    // ---- Waterfall band: stack the TerrainA5 waterfall tiles vertically at top of channel ----
    // Sheet tile rows for the waterfall: top=(5..7,1), mid=(5..7,2..5), bottom=(5..7,6)
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
    // Top fence: row 0, cols 0..32 (stops just before the waterfall at col 33)
    var fenceH_sx = 5*TS, fenceH_sy = 1*TS;
    var fenceV_sx = 5*TS, fenceV_sy = 1*TS;
    for (var c=0; c<=32; c++){
      this._placeCropImage('ts_details', fenceH_sx, fenceH_sy, TS, TS,
        c*TS + TS/2, 0*TS + TS, TS, TS, 0*TS + TS + 1);
    }
    // Left fence: col 0, rows 0..21 (stops before the pond at row 22)
    for (var r=0; r<=21; r++){
      this._placeCropImage('ts_details', fenceV_sx, fenceV_sy, TS, TS,
        0*TS + TS/2, r*TS + TS, TS, TS, r*TS + TS + 1);
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
    // Source: Buildings32 cols 0-3 rows 0-5 = px(0,0,128,192). Scale up to FARMHOUSE w x h tiles.
    var fhPxX = (FARMHOUSE.c) * TS;
    var fhPxY = (FARMHOUSE.r) * TS;
    var fhW = FARMHOUSE.w * TS, fhH = FARMHOUSE.h * TS;
    // Centre of footprint, anchored at bottom (origin 0.5, 1)
    shadow(fhPxX + fhW/2, fhPxY + fhH + 4, fhW*0.85, 14);
    this._placeCropImage('ts_buildings', 0, 0, 128, 192,
      fhPxX + fhW/2, fhPxY + fhH, fhW, fhH, fhPxY + fhH);

    // ---- NOTICEBOARD (mailbox replacement next to farmhouse) ----
    // Source: Buildings32 col 4 row 0 = px(128,0,32,32)
    var nbX = NOTICEBOARD.c * TS, nbY = NOTICEBOARD.r * TS;
    shadow(nbX + TS/2, nbY + TS, TS*0.7, 8);
    this._placeCropImage('ts_buildings', 128, 0, 32, 32,
      nbX + TS/2, nbY + TS, TS, TS, nbY + TS);

    // ---- WELL (uses existing PondBorders.png — small water vessel) ----
    var wlX = WELL.c * TS, wlY = WELL.r * TS;
    shadow(wlX + TS, wlY + TS*2 + 4, TS*1.5, 10);
    var well = this.add.image(wlX + TS, wlY + TS*2, 'pondborder').setOrigin(0.5,1);
    well.setDisplaySize(TS*1.8, TS*1.8);
    well.setDepth(wlY + TS*2);
    // Water inside the well — fill-from-bottom based on practicals progress
    this.wellFill = this.add.rectangle(wlX + TS, wlY + TS*0.9, TS*1.0, 1, 0x5fa8d8)
      .setOrigin(0.5, 1).setDepth(wlY + TS*2 - 1);
    this.wellFillBaseY = wlY + TS*1.5;

    // ---- STUDY TREE (centre of map) — growth-stage aware ----
    var stX = STUDY_TREE.c * TS, stY = STUDY_TREE.r * TS;
    var stW = STUDY_TREE.w * TS, stH = STUDY_TREE.h * TS;
    var centreX = stX + stW/2, baseY = stY + stH;
    // Persistent shadow
    this.treeShadow = self.add.graphics().setDepth(baseY - 1);
    this.treeShadow.fillStyle(0x000000, 0.45);
    this.treeShadow.fillEllipse(centreX, baseY + 2, stW*0.9, 16);
    // Tree sprite — refreshed by refreshStudyTree() based on treeStage()
    this.studyTreeSprite = null;
    this.studyTreeCentreX = centreX;
    this.studyTreeBaseY   = baseY;
    this.studyTreeMaxW    = stW;
    this.studyTreeMaxH    = stH * 1.4; // tree sprite extends above its footprint
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
    if (stage === 0){
      // Seedling
      this.studyTreeSprite = this.add.image(this.studyTreeCentreX, this.studyTreeBaseY, 'seedling')
        .setOrigin(0.5, 1).setDisplaySize(TILE*1.2, TILE*1.2).setDepth(this.studyTreeBaseY);
      return;
    }
    // Source: Details32 cols 4-6 rows 6-8 = px(128, 192, 96, 96) — full green tree
    var scale = [0, 0.30, 0.50, 0.70, 0.85, 1.00][stage];
    var w = this.studyTreeMaxW * scale;
    var h = this.studyTreeMaxH * scale;
    this.studyTreeSprite = this._placeCropImage('ts_details', 128, 192, 96, 96,
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

    // Grid: 2 cols x 2 rows = 4 plants total, spread to the edges of the bed
    // Each plant ~28-32px depending on stage.
    var cols = 2, rows = 2;
    var marginX = 6, marginY = 6;
    var usableW = bed.bw - marginX*2;
    var usableH = bed.bh - marginY*2;
    var stepX = usableW / (cols - 1);
    var stepY = usableH / (rows - 1);
    var size = Math.min(TILE * (0.85 + stage*0.05), TILE * 1.15);

    for (var ri=0; ri<rows; ri++){
      for (var ci=0; ci<cols; ci++){
        var px = bed.x1 + marginX + ci*stepX;
        var py = bed.y1 + marginY + ri*stepY;
        // Slice the crop tile from Crops32 into a unique texture and place it
        var tkey = 'crop_'+b.m+'_s'+stage;
        if (!this.textures.exists(tkey)){
          var src = this.textures.get('ts_crops').getSourceImage();
          var cnv = this.textures.createCanvas(tkey, 32, 32);
          cnv.getContext().drawImage(src, sx, sy, 32, 32, 0, 0, 32, 32);
          cnv.refresh();
        }
        var s = this.add.image(px, py, tkey).setOrigin(0.5, 0.5).setDisplaySize(size, size);
        bed.plants.add(s);
      }
    }
  },

  // ============================================================
  //  DECORATIONS — scattered trees + denser flowers (deterministic)
  // ============================================================
  buildDecorations: function(){
    var self = this;
    var TS = TILE;
    var TM = this.TM;

    // Deterministic hash: same world layout every reload, different per "salt"
    function hash(c, r, salt){
      return ((c * 2654435761) ^ (r * 2246822519) ^ (salt * 3266489917)) >>> 0;
    }
    // Is this tile clean grass and clear of paths/structures/water?
    function isOpenGrass(c, r){
      if (c < 1 || c > MAP_W-2 || r < 1 || r > MAP_H-2) return false;
      if (TM[r][c] !== T_GRASS) return false;
      return true;
    }
    // Is any neighbour within `n` tiles a path or a bed? (used to keep trees off path edges)
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
    // Reserved zones (tile coords): don't place trees inside these.
    // Keeps the area around the player spawn, buildings, and the cave-side strip clear.
    var RESERVED = [
      { c1:0,  r1:0,  c2:8,  r2:9  },  // farmhouse cluster + spawn area
      { c1:5,  r1:5,  c2:10, r2:10 },  // around well & noticeboard
      { c1:15, r1:8,  c2:23, r2:16 },  // central study-tree ring + a buffer
      { c1:36, r1:0,  c2:39, r2:29 }   // cave-side strip (player never sees up close)
    ];
    function inReserved(c, r){
      for (var i=0;i<RESERVED.length;i++){
        var z = RESERVED[i];
        if (c>=z.c1 && c<=z.c2 && r>=z.r1 && r<=z.r2) return true;
      }
      return false;
    }

    // ---- TREE VARIANTS — picked from Common_tree, Birch, Fir, Apple_tree ----
    // Each has source rect on its sheet plus a target display size in tiles.
    var TREE_VARIANTS = [
      // Common_tree — three lush variants
      { key:'commontree', sx:256, sy:16,  sw:144, sh:192, dispW:2.8, dispH:3.6 },
      { key:'commontree', sx:16,  sy:80,  sw:128, sh:144, dispW:2.4, dispH:2.8 },
      { key:'commontree', sx:144, sy:16,  sw:128, sh:192, dispW:2.6, dispH:3.6 },
      // Birch
      { key:'birch',      sx:128, sy:16,  sw:128, sh:160, dispW:2.4, dispH:3.2 },
      { key:'birch',      sx:40,  sy:48,  sw:80,  sh:144, dispW:1.8, dispH:3.0 },
      // Fir
      { key:'fir',        sx:96,  sy:0,   sw:80,  sh:144, dispW:1.9, dispH:3.2 },
      { key:'fir',        sx:0,   sy:80,  sw:64,  sh:80,  dispW:1.5, dispH:2.0 },
      // Apple_tree — blossom + fruiting variants for variety
      { key:'appletree',  sx:128, sy:32,  sw:128, sh:160, dispW:2.4, dispH:3.0 },
      { key:'appletree',  sx:256, sy:32,  sw:128, sh:160, dispW:2.4, dispH:3.0 },
      { key:'appletree',  sx:16,  sy:336, sw:128, sh:160, dispW:2.4, dispH:3.0 }
    ];

    // ---- Scatter trees ----
    var placedTrees = [];      // [c, r] of placed positions for min-distance check
    var MIN_TREE_DIST = 3.5;   // tiles between trees
    for (var r=1; r<MAP_H-1; r++){
      for (var c=1; c<MAP_W-1; c++){
        if (!isOpenGrass(c, r)) continue;
        if (inReserved(c, r)) continue;
        if (nearPathOrBed(c, r, 1)) continue;        // not right next to a path/bed
        var h = hash(c, r, 11);
        if ((h % 100) >= 5) continue;                // ~5% base chance
        // Min distance to other trees
        var tooClose = false;
        for (var ti=0; ti<placedTrees.length; ti++){
          var dx = placedTrees[ti][0]-c, dy = placedTrees[ti][1]-r;
          if (dx*dx + dy*dy < MIN_TREE_DIST*MIN_TREE_DIST){ tooClose = true; break; }
        }
        if (tooClose) continue;
        placedTrees.push([c, r]);
        var variant = TREE_VARIANTS[h % TREE_VARIANTS.length];
        // Slight pixel-level jitter so trees don't sit on perfectly even grid lines
        var jx = ((h >>> 8) % 11) - 5;
        var jy = ((h >>> 4) % 7) - 3;
        var wx = c*TS + TS/2 + jx;
        var wy = r*TS + TS + jy;
        // Drop shadow
        var sg = self.add.graphics().setDepth(wy - 1);
        sg.fillStyle(0x000000, 0.40);
        sg.fillEllipse(wx, wy + 2, TS * variant.dispW * 0.65, 10);
        self._placeCropImage(variant.key, variant.sx, variant.sy, variant.sw, variant.sh,
          wx, wy, TS * variant.dispW, TS * variant.dispH, wy);
      }
    }

    // ---- Scatter flowers (denser, allowed near paths for a cosy feel) ----
    // Flowers.png: 4 cells across (16 wide each), each cell 16x32. We pull the
    // bottom portion of each cell where the tulip is drawn.
    for (var r=1; r<MAP_H-1; r++){
      for (var c=1; c<MAP_W-1; c++){
        if (!isOpenGrass(c, r)) continue;
        if (inReserved(c, r) && !(c>=15 && c<=23 && r>=8 && r<=16)) continue;
        // Allow flowers inside the central tree ring (cosy feel near focal point)
        var h = hash(c, r, 23);
        if ((h % 100) >= 14) continue;               // ~14% chance — denser than trees
        // Don't overlap trees
        var tooCloseToTree = false;
        for (var ti=0; ti<placedTrees.length; ti++){
          var dx = placedTrees[ti][0]-c, dy = placedTrees[ti][1]-r;
          if (dx*dx + dy*dy < 1.5*1.5){ tooCloseToTree = true; break; }
        }
        if (tooCloseToTree) continue;
        // Up to 1-3 flower sprites per tile (clusters look cosier)
        var clusterSize = 1 + ((h >>> 12) % 3);
        for (var k=0; k<clusterSize; k++){
          var jx = ((h >>> (k*5)) % 22) - 11;
          var jy = ((h >>> (k*5 + 3)) % 14) - 7;
          var wx = c*TS + TS/2 + jx;
          var wy = r*TS + TS + jy;
          var variant = ((h >>> (k*7)) % 4);
          self._placeCropImage('flowers', variant*16, 9, 16, 22,
            wx, wy, TS*0.55, TS*0.85, wy);
        }
      }
    }

    // ---- A few hand-placed mushrooms / stones near tree groupings for charm ----
    // (uses tiny details from Details32; deliberately sparse)
    var stoneSpots = [[10,8],[27,11],[12,15]];
    stoneSpots.forEach(function(p, i){
      if (TM[p[1]][p[0]] !== T_GRASS) return;
      var stoneTiles = [[1,4],[2,4],[3,4]];
      var s = stoneTiles[i % 3];
      var wx = p[0]*TS + TS/2, wy = p[1]*TS + TS;
      var g = self.add.graphics().setDepth(wy - 1);
      g.fillStyle(0x000000, 0.35);
      g.fillEllipse(wx, wy, TS*0.6, 6);
      self._placeCropImage('ts_details', s[0]*32, s[1]*32, 32, 32, wx, wy, TS*0.85, TS*0.85, wy);
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
    // Bees patrol near beds
    var beeSpots = BED_DEFS.map(function(b){ return [b.c1+1, b.r1+1]; });
    beeSpots.forEach(function(p,i){
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

    // Rain (Drops.png) — light, persistent drizzle across the whole world
    this.raindrops = [];
    var NUM_DROPS = 40;
    for (var i=0;i<NUM_DROPS;i++){
      var frame = Math.floor(Math.random()*8);
      var rd = this.add.image(
        Math.random()*WORLD_W,
        Math.random()*WORLD_H,
        'drops', frame
      ).setDepth(9700).setAlpha(0.55);
      rd.vx = -0.4 - Math.random()*0.4;   // slight leftward drift (wind)
      rd.vy = 3.2 + Math.random()*2.0;     // 3.2 - 5.2 px/frame
      rd.frameRotate = Math.floor(Math.random()*30) + 12;  // change frame every N frames
      rd.frameCount = 0;
      this.raindrops.push(rd);
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
    // Rain
    if (this.raindrops){
      this.raindrops.forEach(function(rd){
        rd.x += rd.vx;
        rd.y += rd.vy;
        rd.frameCount++;
        if (rd.frameCount >= rd.frameRotate){
          rd.frameCount = 0;
          rd.setFrame(Math.floor(Math.random()*8));
        }
        if (rd.y > WORLD_H + 16){
          rd.y = -16 - Math.random()*40;
          rd.x = Math.random() * WORLD_W;
        }
        if (rd.x < -16) rd.x = WORLD_W + 16;
      });
    }
  },

  // ============================================================
  //  PLAYER + collision
  // ============================================================
  buildPlayer: function(){
    // Spawn just outside the farmhouse front door (~ col 3, row 8)
    this.player = this.physics.add.sprite(3*TILE + TILE/2, 8*TILE + TILE/2, 'player', 0);
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
    // Farmhouse footprint
    solid(FARMHOUSE.c, FARMHOUSE.r, FARMHOUSE.w, FARMHOUSE.h);
    // Noticeboard
    solid(NOTICEBOARD.c, NOTICEBOARD.r, 1, 1);
    // Well
    solid(WELL.c, WELL.r, 2, 2);
    // Study tree
    solid(STUDY_TREE.c, STUDY_TREE.r, STUDY_TREE.w, STUDY_TREE.h);
    // Cave block (cosmetic — player can't reach it anyway because of river)
    solid(CAVE.c, CAVE.r, CAVE.w, CAVE.h);
    // Garden beds
    BED_DEFS.forEach(function(b){
      solid(b.c1, b.r1, b.c2-b.c1+1, b.r2-b.r1+1);
    });
    // Top fence (row 0 cols 0..32)
    solid(0, 0, 33, 1);
    // Left fence (col 0 rows 0..21)
    solid(0, 0, 1, 22);
    // Water cells — turn TM scan into a tight rectangle set so the player can't cross the river or pond
    var TM = this.TM;
    // Build merged collision rectangles row-by-row (simple horizontal runs)
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
      // Near M1 (SW bed) — on path north of bed
      { x: 4*TS + TS/2,  y: 17*TS + TS/2, face:'down'  },
      // Centre ring west side
      { x: 17*TS + TS/2, y: 12*TS + TS/2, face:'right' },
      // Near M2 (NE bed) — on path south of bed
      { x: 25*TS + TS/2, y: 8*TS  + TS/2, face:'right' },
      // Centre ring east side
      { x: 21*TS + TS/2, y: 12*TS + TS/2, face:'down'  },
      // Near M3 (E bed) — on path west of bed
      { x: 26*TS + TS/2, y: 16*TS + TS/2, face:'right' },
      // Centre ring south
      { x: 21*TS + TS/2, y: 14*TS + TS/2, face:'left'  },
      // Near M4 (S bed) — on path north of bed
      { x: 16*TS + TS/2, y: 20*TS + TS/2, face:'down'  },
      // Centre ring south-west
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
      { id:'house',     label:'FARMHOUSE — (coming soon)',  cx: FARMHOUSE.c + FARMHOUSE.w/2, cy: FARMHOUSE.r + FARMHOUSE.h/2, r:4.5 },
      { id:'tree',      label:'STUDY TREE — Quizzes',        cx: STUDY_TREE.c + STUDY_TREE.w/2, cy: STUDY_TREE.r + STUDY_TREE.h/2, r:3.5 },
      { id:'well',      label:'WELL — Practicals',           cx: WELL.c + 1, cy: WELL.r + 1, r:2.5 },
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

    this.controls = this.add.text(VIEW_W-10, 10, 'WASD move · E interact', {
      fontFamily:'monospace', fontSize:'10px', color:'#80c040',
      backgroundColor:'#0a0804cc', padding:{x:6,y:3}
    }).setOrigin(1,0).setScrollFactor(0).setDepth(99999);

    this.toastTxt = this.add.text(VIEW_W/2, 50, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#80c040',
      backgroundColor:'#0a0804ee', padding:{x:10,y:5}
    }).setOrigin(0.5).setScrollFactor(0).setDepth(99999).setAlpha(0);
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
    // Update well water level
    if (this.wellFill){
      var lvl = wellLevel();
      var maxH = TILE * 1.1;
      this.wellFill.height = maxH * lvl;
      this.wellFill.y = this.wellFillBaseY;
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
