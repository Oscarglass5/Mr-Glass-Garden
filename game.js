// ============================================================
//  MR GLASS' GARDEN — Phaser 3 Edition
//  Year 11 Biology progress-tracking game world
// ============================================================

var TILE = 32;
var MAP_W = 40;   // tiles wide
var MAP_H = 30;   // tiles tall
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
  var at = {}; CONFIG_ASSESSMENTS.forEach(function(a){ at[a.key] = false; });
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
// crop growth stage 0..5 from module progress
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
    this.load.image('terrain', A+'Terrain.png');
    this.load.image('gardenbeds', A+'Garden_beds.png');
    this.load.image('pondborder', A+'PondBorders.png');
    this.load.spritesheet('player', A+'Player.png', { frameWidth:80, frameHeight:80 });
    this.load.spritesheet('crop_m1', A+'Zucchini.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('crop_m2', A+'Cabbage.png',  { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('crop_m3', A+'Pumpkin.png',  { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('crop_m4', A+'Tomato.png',   { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('water', A+'Water_tile_animation.png', { frameWidth:32, frameHeight:32 });
    this.load.spritesheet('butterfly', A+'White_butterfly_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('bee', A+'Bee_animation.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdfly', A+'Bird_fly.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('birdtakeoff', A+'Bird_take-off.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('leaves', A+'Leaves.png', { frameWidth:16, frameHeight:16 });
    this.load.spritesheet('drops', A+'Drops.png', { frameWidth:16, frameHeight:16 });
    this.load.image('commontree', A+'Common_tree.png');
    this.load.image('birch', A+'Birch.png');
    this.load.image('fir', A+'Fir.png');
    this.load.image('appletree', A+'Apple_tree.png');
    this.load.image('seedling', A+'Hole_with_a_seedling.png');
    this.load.image('treeshadow', A+'Tree_shadow.png');
    this.load.image('bushes', A+'Bushes.png');
    this.load.image('stones', A+'Stones.png');
    this.load.image('flowers', A+'Flowers.png');
    this.load.image('grassplant', A+'Grass.png');
    this.load.image('decoration', A+'Decoration.png');
    this.load.image('decorations', A+'Decorations.png');
    this.load.image('wood', A+'Wood.png');
  },
  create: function(){ buildAnimations(this); this.scene.start('Garden'); }
});

function buildAnimations(scene){
  var anims = scene.anims;
  // Player rows: 0 idle-down,1 walk-down(6),2 idle-up?,... we detected:
  // row0=1 idle, row1=walk(6 used 8 cells?), let's map directions:
  // Layout (6 cols/row, 8 rows): treat rows in pairs (idle, walk) per dir
  // Row0: idle down | Row1: walk down
  // Row2: idle up   | Row3: walk up   (but row3 had 6)
  // We'll use: down idle=frame0, down walk=6..11; up idle=12, up walk=18..23;
  // left idle=24, left walk=30..35; right idle=36, right walk=42..47
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

  // water shimmer (3 frames, but sheet may include gaps; use 0,1,2)
  if (!anims.exists('water-anim'))
    anims.create({ key:'water-anim',
      frames: anims.generateFrameNumbers('water', { start:0, end:2 }),
      frameRate:4, repeat:-1 });
  // butterfly
  if (!anims.exists('butterfly-fly'))
    anims.create({ key:'butterfly-fly',
      frames: anims.generateFrameNumbers('butterfly', { start:0, end:2 }),
      frameRate:8, repeat:-1 });
  // bee
  if (!anims.exists('bee-fly'))
    anims.create({ key:'bee-fly',
      frames: anims.generateFrameNumbers('bee', { start:0, end:2 }),
      frameRate:10, repeat:-1 });
  // bird flying
  if (!anims.exists('bird-fly'))
    anims.create({ key:'bird-fly',
      frames: anims.generateFrameNumbers('birdfly', { start:0, end:3 }),
      frameRate:8, repeat:-1 });
  // bird takeoff (play once)
  if (!anims.exists('bird-takeoff'))
    anims.create({ key:'bird-takeoff',
      frames: anims.generateFrameNumbers('birdtakeoff', { start:0, end:4 }),
      frameRate:10, repeat:0 });
}

// ============================================================
//  GARDEN SCENE — the world
// ============================================================
// Tile types for the ground layer
var T_GRASS=0, T_PATH=1, T_DIRT=2, T_STONE=3, T_WATER=4;

// Module bed regions (tile coords) — left side of the world
var BED_DEFS = [
  { m:'m1', cropKey:'crop_m1', c1:2,  r1:3,  c2:8,  r2:7,  title:'M1: CELLS' },
  { m:'m2', cropKey:'crop_m2', c1:2,  r1:9,  c2:8,  r2:13, title:'M2: ORGANISATION' },
  { m:'m3', cropKey:'crop_m3', c1:2,  r1:17, c2:8,  r2:21, title:'M3: DIVERSITY' },
  { m:'m4', cropKey:'crop_m4', c1:2,  r1:23, c2:8,  r2:27, title:'M4: ECOSYSTEMS' }
];
// Crops.png growth rows: each crop occupies 2 rows (top = mature tall part,
// bottom = base). We map a single representative frame per stage from the sheet.
// Sheet is 8 cols x 11 rows of 16px. We'll use columns as growth stages:
// col0=seed, col1=sprout, col2=small, col3=mid, col4=large... per crop pair.
// For simplicity we use a per-crop base row and pick column = stage.

var GardenScene = new Phaser.Class({
  Extends: Phaser.Scene,
  initialize: function GardenScene(){ Phaser.Scene.call(this, { key:'Garden' }); },

  
  create: function(){
    var self = this;
    this.fc = 0;

    this.buildGround();
    this.buildStructures();
    this.buildBeds();
    this.buildDecorations();
    this.buildCreatures();
    this.buildPlayer();
    this.buildInteractables();
    this.buildHUD();

    // camera
    this.cameras.main.setBounds(0,0,WORLD_W,WORLD_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,E,SPACE,ESC');
    this.input.keyboard.on('keydown-E', function(){ self.tryInteract(); });
    this.input.keyboard.on('keydown-ESC', function(){ closeModal(); });

    // first-visit greeting / welcome
    if (ST.mailRead.indexOf('greeted')===-1){
      this.time.delayedCall(400, function(){ self.showToast('Welcome to the garden!'); });
    } else {
      this.showToast('Welcome back!');
    }
  },

  // ---- GROUND ----
  buildGround: function(){
    var TM = [];
    for (var r=0;r<MAP_H;r++){ TM.push([]); for (var c=0;c<MAP_W;c++) TM[r].push(T_GRASS); }
    // central paths
    for (var r=0;r<MAP_H;r++){ TM[r][10]=T_PATH; TM[r][11]=T_PATH; }
    for (var c=0;c<MAP_W;c++){ TM[17][c]=T_PATH; TM[18][c]=T_PATH; }
    // pond top-right
    for (var r=2;r<7;r++) for (var c=26;c<32;c++) TM[r][c]=T_WATER;
    // stone / cave bottom-right
    for (var r=22;r<29;r++) for (var c=28;c<38;c++) TM[r][c]=T_STONE;
    // module bed dirt
    BED_DEFS.forEach(function(b){
      for (var r=b.r1;r<=b.r2;r++) for (var c=b.c1;c<=b.c2;c++) TM[r][c]=T_DIRT;
    });
    this.TM = TM;
    this.renderGroundCanvas();
  },

  // Build ground using an offscreen canvas for precise tile cropping
  renderGroundCanvas: function(){
    var TM = this.TM;
    var key = 'groundtex';
    var cnv = this.textures.createCanvas(key, WORLD_W, WORLD_H);
    var ctx = cnv.getContext();
    ctx.imageSmoothingEnabled = false;
    var terr = this.textures.get('terrain').getSourceImage();
    var TS=16, STRIDE=17;
    function tile(sx, sy, dx, dy){
      ctx.drawImage(terr, sx, sy, TS, TS, dx, dy, TILE, TILE);
    }
    for (var r=0;r<MAP_H;r++){
      for (var c=0;c<MAP_W;c++){
        var tt = TM[r][c];
        var h = ((c*2654435761)^(r*2246822519))>>>0;
        if (tt===T_GRASS) tile((h%3)*STRIDE, 0, c*TILE, r*TILE);
        else if (tt===T_PATH) tile((h%3)*STRIDE, STRIDE, c*TILE, r*TILE);
        else if (tt===T_DIRT){
          // garden bed soil from gardenbeds sheet
          var gb = this.textures.get('gardenbeds').getSourceImage();
          ctx.drawImage(gb, (h%3)*16, (h%2)*16, 16,16, c*TILE, r*TILE, TILE, TILE);
        }
        else if (tt===T_STONE) tile((h%3)*STRIDE, 8*STRIDE, c*TILE, r*TILE);
        else if (tt===T_WATER){
          ctx.fillStyle = '#2048a8'; ctx.fillRect(c*TILE, r*TILE, TILE, TILE);
        }
      }
    }
    // path edge shadows
    ctx.fillStyle='rgba(0,0,0,0.18)';
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      var tt=TM[r][c];
      if (tt===T_PATH || tt===T_DIRT){
        var above = r>0 ? TM[r-1][c] : T_GRASS;
        if (above===T_GRASS) ctx.fillRect(c*TILE, r*TILE, TILE, 4);
      }
    }
    cnv.refresh();
    this.add.image(0,0,key).setOrigin(0,0).setDepth(0);

    // animated water tiles on top of water cells
    this.waterTiles = [];
    for (var r=0;r<MAP_H;r++) for (var c=0;c<MAP_W;c++){
      if (TM[r][c]===T_WATER){
        var w = this.add.sprite(c*TILE, r*TILE, 'water').setOrigin(0,0).setDepth(1);
        w.setDisplaySize(TILE,TILE);
        w.play('water-anim');
        w.anims.setProgress(((c+r)%3)/3);
        this.waterTiles.push(w);
      }
    }
  },

  // ---- STRUCTURES (trees, pond border, buildings as sprites) ----
  buildStructures: function(){
    this.structures = [];
    var self = this;
    // helper: place a cropped region of an image as a sprite with depth = baseline Y
    function placeCrop(key, sx, sy, sw, sh, wx, wy, dw, dh){
      var img = self.textures.get(key).getSourceImage();
      // create a unique cropped texture once
      var tkey = key+'_'+sx+'_'+sy+'_'+sw+'_'+sh;
      if (!self.textures.exists(tkey)){
        var cnv = self.textures.createCanvas(tkey, sw, sh);
        cnv.getContext().drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        cnv.refresh();
      }
      var spr = self.add.image(wx, wy, tkey).setOrigin(0.5, 1);
      if (dw) spr.setDisplaySize(dw, dh);
      spr.setDepth(wy);
      return spr;
    }
    this.placeCrop = placeCrop;

    // Pond border around the pond (top-right). PondBorders.png is 96x96 single sprite.
    placeCrop('pondborder', 0,0,96,96, 28*TILE+TILE, 4*TILE+TILE, TILE*5, TILE*5).setDepth(5);

    // Perimeter trees (Common_tree, Birch, Fir) using cropped regions.
    // Common_tree large canopy region approx (257,8,125,168)
    var treeSpots = [
      [1,2,'fir'],[1,8,'birch'],[1,14,'commontree'],[1,20,'fir'],[1,27,'birch'],
      [38,3,'commontree'],[38,9,'fir'],[38,15,'birch'],[38,22,'commontree'],
      [13,1,'birch'],[20,1,'commontree'],[33,1,'fir'],
      [14,28,'commontree'],[22,28,'birch'],[30,29,'fir'],[6,29,'commontree']
    ];
    treeSpots.forEach(function(t){
      var wx=t[0]*TILE, wy=t[1]*TILE, kind=t[2];
      // shadow
      self.placeCrop('treeshadow',0,0,80,48, wx, wy+6, TILE*2, TILE*0.8).setDepth(wy-1).setAlpha(0.25);
      if (kind==='fir') placeCrop('fir',100,0,91,159, wx, wy, TILE*2.6, TILE*4.4);
      else if (kind==='birch') placeCrop('birch',131,0,84,176, wx, wy, TILE*2.4, TILE*4.6);
      else placeCrop('commontree',257,8,125,168, wx, wy, TILE*3, TILE*4.4);
    });
  },

  // ---- MODULE BEDS (crop growth) ----
  buildBeds: function(){
    this.beds = [];
    var self = this;
    BED_DEFS.forEach(function(b){
      var x1=b.c1*TILE, y1=b.r1*TILE;
      var bw=(b.c2-b.c1+1)*TILE, bh=(b.r2-b.r1+1)*TILE;
      // bed border frame
      var g = self.add.graphics().setDepth(2);
      g.lineStyle(3, 0x5a3808, 1).strokeRect(x1+1,y1+1,bw-2,bh-2);
      g.lineStyle(1, 0xc08040, 1).strokeRect(x1+3,y1+3,bw-6,bh-6);
      // title text
      self.add.text(x1+bw/2, y1-10, b.title, {
        fontFamily:'monospace', fontSize:'11px', color:'#f0c870', stroke:'#1a0e04', strokeThickness:3
      }).setOrigin(0.5).setDepth(3);
      // crop sprite container — we'll fill with plants
      var plants = self.add.container(0,0).setDepth(y1+bh);
      // progress bar bg
      var barBg = self.add.rectangle(x1, y1+bh-7, bw, 8, 0x0a0502).setOrigin(0,0).setDepth(y1+bh+1);
      var barFill = self.add.rectangle(x1, y1+bh-7, 0, 8, 0x80c040).setOrigin(0,0).setDepth(y1+bh+1);
      var stageTxt = self.add.text(x1+bw/2, y1+bh-3, '', {
        fontFamily:'monospace', fontSize:'8px', color:'#f0d060'
      }).setOrigin(0.5,1).setDepth(y1+bh+2);

      var bed = { def:b, plants:plants, barFill:barFill, stageTxt:stageTxt,
                  x1:x1,y1:y1,bw:bw,bh:bh, lastStage:-1 };
      self.beds.push(bed);
      self.refreshBed(bed);
    });
  },

  refreshBed: function(bed){
    var b = bed.def;
    var stage = moduleStage(b.m);
    var prog = moduleProgress(b.m);
    bed.barFill.width = bed.bw * prog.pct;
    bed.barFill.fillColor = prog.pct>=1 ? 0x40c020 : prog.pct>0.5 ? 0x80c040 : prog.pct>0 ? 0xc8901c : 0x604020;
    var labels=['BARE','PLANTED','SPROUTING','GROWING','THRIVING','COMPLETE'];
    bed.stageTxt.setText(labels[stage]);

    if (stage === bed.lastStage) return;
    bed.lastStage = stage;
    bed.plants.removeAll(true);
    if (stage===0) return;

    // crop sheet slots: 2=seeds,3=sprout,4=seedling,5=mid,6=mature
    var slot = [0,2,3,4,5,6][stage];
    var cols = 2 + stage, rows = 2 + Math.floor(stage/2);
    var spX = bed.bw/(cols+1), spY = bed.bh/(rows+1);
    var size = Math.min(TILE*(0.7+stage*0.09), TILE*1.35);
    for (var ri=0;ri<rows;ri++){
      for (var ci=0;ci<cols;ci++){
        var px = bed.x1 + spX*(ci+1);
        var py = bed.y1 + spY*(ri+1);
        var s = this.add.image(px, py, b.cropKey, slot).setDisplaySize(size,size);
        bed.plants.add(s);
      }
    }
  },

  // ---- DECORATIONS (bushes, flowers, stones) ----
  buildDecorations: function(){
    var self = this;
    function place(key, sx, sy, sw, sh, wx, wy, dw, dh, depth){
      var sp = self.placeCrop(key, sx, sy, sw, sh, wx, wy, dw, dh);
      sp.setDepth(depth!==undefined?depth:wy);
      return sp;
    }
    // bushes along path edges (Bushes.png: plain top 0-42, flowering 52-95)
    var bushSpots = [[9,4],[9,6],[9,11],[9,19],[13,17],[20,17],[27,18],[14,2],[24,2]];
    bushSpots.forEach(function(p,i){
      var row = i%2===0?4:54;
      place('bushes',0,row,62,42, p[0]*TILE, p[1]*TILE, TILE+8, TILE+8);
    });
    // stones near cave (Stones.png 4 variants)
    var stoneVar=[[0,32],[33,29],[65,29],[100,40]];
    [[29,22],[33,24],[36,26],[30,27]].forEach(function(p,i){
      var v=stoneVar[i%4];
      place('stones',v[0],0,v[1],32, p[0]*TILE, p[1]*TILE, TILE, TILE);
    });
    // flowers along central path (Flowers.png tulips, 4 variants 16x32)
    var flowerSpots=[[12,8],[12,12],[12,22],[16,16],[22,16],[26,16],[14,19]];
    flowerSpots.forEach(function(p,i){
      place('flowers',(i%4)*16,9,16,22, p[0]*TILE, p[1]*TILE, TILE*0.7, TILE);
    });
    // grass plants (Grass.png decorative fern, 40px wide region)
    [[19,9],[20,13],[31,6],[34,14],[15,25]].forEach(function(p){
      place('grassplant',0,0,40,80, p[0]*TILE, p[1]*TILE, TILE, TILE*1.4);
    });
    // wood pile near market
    place('wood',0,0,16,16, 14*TILE, 9*TILE, TILE, TILE);
    place('wood',16,0,16,16, 14*TILE+12, 9*TILE+4, TILE, TILE);
  },

  // ---- CREATURES (butterflies, bees, birds) ----
  buildCreatures: function(){
    var self = this;
    this.butterflies = [];
    this.bees = [];
    this.birds = [];

    var bflySpots=[[14,9],[20,6],[30,11],[6,5],[34,8]];
    bflySpots.forEach(function(p,i){
      var s = self.add.sprite(p[0]*TILE, p[1]*TILE, 'butterfly').setDepth(9000);
      s.play('butterfly-fly'); s.setScale(1.1);
      s.home = { x:p[0]*TILE, y:p[1]*TILE }; s.t = Math.random()*Math.PI*2; s.idx=i;
      self.butterflies.push(s);
    });
    // bees patrol the module beds
    var beeSpots=[[5,5],[5,11],[5,19],[6,24]];
    beeSpots.forEach(function(p,i){
      var s = self.add.sprite(p[0]*TILE, p[1]*TILE, 'bee').setDepth(9000);
      s.play('bee-fly');
      s.home={ x:p[0]*TILE, y:p[1]*TILE }; s.t=i*1.5;
      self.bees.push(s);
    });
    // birds: perch then fly
    var birdSpots=[[18,5],[26,3],[11,2]];
    birdSpots.forEach(function(p){
      var s = self.add.sprite(p[0]*TILE, p[1]*TILE, 'birdfly', 0).setDepth(9000);
      s.setScale(1.3);
      s.state='perch'; s.timer = 120 + Math.random()*180;
      s.home={ x:p[0]*TILE, y:p[1]*TILE };
      s.vx=0; s.vy=0;
      self.birds.push(s);
    });

    // falling leaves (particle-like)
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
          // respawn perched
          s.state='perch'; s.timer=180+Math.random()*200;
          s.x = (4+Math.random()*(MAP_W-8))*TILE;
          s.y = (1+Math.random()*3)*TILE;
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

  // ---- PLAYER ----
  buildPlayer: function(){
    this.player = this.physics.add.sprite(11*TILE, 18*TILE, 'player', 0);
    this.player.setOrigin(0.5, 0.85);
    // collision body smaller than the 80px frame (feet area)
    this.player.body.setSize(20, 16);
    this.player.body.setOffset(30, 56);
    this.player.setDepth(this.player.y);
    this.player.facing = 'down';
    this.player.play('idle-down');

    // world bounds
    this.physics.world.setBounds(0,0,WORLD_W,WORLD_H);
    this.player.setCollideWorldBounds(true);

    // static collision rectangles for buildings/pond/cave
    this.solids = this.physics.add.staticGroup();
    var self=this;
    function solid(cx, cy, cw, ch){   // tile coords
      var r = self.add.rectangle(cx*TILE, cy*TILE, cw*TILE, ch*TILE).setOrigin(0,0);
      self.physics.add.existing(r, true);
      self.solids.add(r);
    }
    solid(13,2, 7,5);   // farmhouse
    solid(28,22,7,6);   // cave
    solid(24,9, 3,4);   // well
    solid(22,1, 5,4);   // study tree
    solid(13,16,2,2);   // mailbox
    solid(26,2, 6,5);   // pond
    solid(13,9, 6,5);   // market
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
    // normalise diagonal
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

  // ---- INTERACTABLES ----
  buildInteractables: function(){
    // each: id, label, tile centre, radius (tiles)
    this.objs = [
      { id:'house',   label:'FARMHOUSE — Syllabus',    cx:16.5, cy:4.5, r:4.5 },
      { id:'tree',    label:'STUDY TREE — Quizzes',     cx:24,   cy:3,   r:3.5 },
      { id:'garden',  label:'MODULE BEDS — Dot Points', cx:5,    cy:15,  r:6   },
      { id:'well',    label:'WELL — Practicals',         cx:25.5, cy:11,  r:3   },
      { id:'mailbox', label:'MAILBOX — Messages',        cx:14,   cy:17,  r:2.5 },
      { id:'market',  label:'MARKET STALL',             cx:16,   cy:11,  r:3.5 },
      { id:'cave',    label:'CAVE — Extension',          cx:31.5, cy:25,  r:4   }
    ];
  },

  nearObj: function(){
    var px=this.player.x/TILE, py=this.player.y/TILE;
    for (var i=0;i<this.objs.length;i++){
      var o=this.objs[i];
      if (Phaser.Math.Distance.Between(px,py,o.cx,o.cy) < o.r) return o;
    }
    return null;
  },

  tryInteract: function(){
    if (modalIsOpen()) return;
    var o = this.nearObj();
    if (!o) return;
    if (o.id==='cave' && overallConfidentPct() < 0.75){
      this.showToast('The cave is locked — reach 75% confident dot points.');
      return;
    }
    openModal(o.id, this);
  },

  // ---- HUD ----
  buildHUD: function(){
    var cam = this.cameras.main;
    // hint text (fixed to camera)
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
  },

  // ---- main loop ----
  update: function(){
    this.fc++;
    if (modalIsOpen()){
      this.player.body.setVelocity(0,0);
      this.player.anims.stop();
    } else {
      this.updatePlayer();
    }
    this.updateCreatures();
    this.updateHUD();
    // refresh bed progress bars live (cheap)
    if (this.fc % 30 === 0 && this.beds){
      for (var i=0;i<this.beds.length;i++) this.refreshBed(this.beds[i]);
    }
  }

});

// ============================================================
//  PHASER GAME CONFIG
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
