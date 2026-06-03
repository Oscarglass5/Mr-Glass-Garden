// ============================================================
//  MR GLASS' GARDEN — DOM UI overlays (modals)
//  Pure DOM, sits above the Phaser canvas.
// ============================================================
var _modalScene = null;
var _farmerModule = null;    // when set (e.g. 'm1'), shows that module's dot points
var _pendingSkillHint = null; // set before openModal('skills') to auto-open a specific skill's prompt

function modalIsOpen(){
  return document.getElementById('modal-overlay').classList.contains('open');
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
  _farmerModule = null;
  // Re-enable Phaser keyboard capture when modal closes
  if (_modalScene && _modalScene.input && _modalScene.input.keyboard){
    _modalScene.input.keyboard.enableGlobalCapture();
  }
}
function pbColor(pct){
  if (pct>=1) return '#40c020';
  if (pct>=0.5) return '#80c040';
  if (pct>0) return '#c8901c';
  return '#806840';
}

function openModal(id, scene){
  _modalScene = scene;
  // Disable Phaser keyboard capture so textarea/input elements receive keystrokes
  if (scene && scene.input && scene.input.keyboard){
    scene.input.keyboard.disableGlobalCapture();
  }
  var ov = document.getElementById('modal-overlay');
  var title = document.getElementById('modal-title');
  var body = document.getElementById('modal-body');
  ov.classList.add('open');

  if (id==='house'){
    title.textContent='FARMHOUSE — PRACTICALS';
    body.innerHTML = wellHTML();   // reuses the practicals UI; "well" is just a function name now
    attachPR();
  }
  else if (id==='customise'){
    title.textContent='APPEARANCE';
    body.innerHTML = customiseHTML();
    attachCustomise();
  }
  else if (id==='skills'){
    // If a specific skill was hinted (e.g. pressing E at pond → fishing),
    // skip straight to the study prompt for that skill.
    if (_pendingSkillHint && skillUnlocked(_pendingSkillHint) && !ST.session){
      var hint = _pendingSkillHint;
      _pendingSkillHint = null;
      openStudyPromptFor(hint);
      return;
    }
    _pendingSkillHint = null;
    title.textContent='SKILLS';
    body.innerHTML = skillsHTML();
    attachSkills();
  }
  else if (id==='farmer'){
    title.textContent='THE FARMER';
    _farmerModule = null;
    body.innerHTML = farmerPickerHTML();
    attachFarmerPicker();
  }
  else if (id==='tree'){ title.textContent='STUDY TREE — QUIZZES'; body.innerHTML = treeHTML(); attachQZ(); }
  else if (id==='mailbox'){
    title.textContent='NOTICEBOARD — MESSAGES'; body.innerHTML = mailHTML();
    CONFIG_MAIL.forEach(function(_,i){ if(ST.mailRead.indexOf(i)===-1) ST.mailRead.push(i); });
    saveState();
  }
  else if (id==='cave'){
    title.textContent='CAVE — EXTENSION';
    body.innerHTML = '<p class="note" style="font-size:13px;line-height:1.8">The vines part. You step inside.<br><br>Extension content will appear here as it unlocks.</p>';
  }
  else if (id==='takeaway'){
    // Called automatically when a passive session timer expires
    openTakeawayModal();
    return;   // openTakeawayModal builds its own content; skip the ov.classList.add below
  }
}

// ============================================================
//  FARMER — module picker, then single-module dot-points view
// ============================================================
function farmerPickerHTML(){
  var stageNames=['Bare','Planted','Sprouting','Growing','Thriving','Complete'];
  var h = '<p class="note" style="font-size:13px;line-height:1.6">'
        + '"G\'day. Which module are you working on today?"</p>';
  h += '<div class="modulepick">';
  Object.keys(CONFIG_SYLLABUS).forEach(function(m){
    var p = moduleProgress(m), st = moduleStage(m), pct = Math.round(p.pct*100);
    var col = st===5 ? '#40a020' : (pct>0 ? '#c8901c' : '#806840');
    h += '<button class="modbtn" data-m="'+m+'">'
       +   '<div class="modtitle">'+CONFIG_SYLLABUS[m].title+'</div>'
       +   '<div class="modsub">Stage: <b style="color:'+col+'">'+stageNames[st]+'</b> &middot; '+pct+'% complete</div>'
       +   '<div class="pbar" style="margin:6px 0 0"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(p.pct)+'"></div></div>'
       + '</button>';
  });
  h += '</div>';
  return h;
}
function attachFarmerPicker(){
  document.querySelectorAll('.modbtn').forEach(function(el){
    el.onclick = function(){
      _farmerModule = el.dataset.m;
      document.getElementById('modal-title').textContent =
        'THE FARMER — ' + CONFIG_SYLLABUS[_farmerModule].title.toUpperCase();
      document.getElementById('modal-body').innerHTML = farmerModuleHTML(_farmerModule);
      attachFarmerDP();
    };
  });
}
function farmerModuleHTML(m){
  var p = moduleProgress(m), st = moduleStage(m), pct = Math.round(p.pct*100);
  var stageNames=['Bare','Planted','Sprouting','Growing','Thriving','Complete'];
  var h = '<button class="backbtn" id="farmer-back">&lsaquo; Choose a different module</button>';
  h += '<div class="legend"><span><i class="box none"></i>Not started</span>'
     + '<span><i class="box prog"></i>In progress</span>'
     + '<span><i class="box conf"></i>Confident</span></div>';
  h += '<div class="stats">'
     + '<div class="stat"><label>STAGE</label><b style="color:'+(st===5?'#40a020':'#c8901c')+'">'+stageNames[st]+'</b></div>'
     + '<div class="stat"><label>CONFIDENT</label><b style="color:#40a020">'+p.conf+'/'+p.total+'</b></div>'
     + '<div class="stat"><label>IN PROGRESS</label><b style="color:#c8901c">'+p.prog+'</b></div>'
     + '</div>';
  h += '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(p.pct)+'"></div></div>';
  h += '<p class="note">Tap a dot point to cycle: not started &rarr; in progress &rarr; confident. The bed reflects your progress.</p>';

  CONFIG_SYLLABUS[m].iq.forEach(function(q, qi){
    h += '<div class="iq">'+q.label+'</div>';
    q.points.forEach(function(pt, pi){
      var key = m+'_'+qi+'_'+pi, s = ST.dp[key] || 'none';
      var sym = s==='conf'?'&#10003;' : s==='prog'?'~' : '';
      h += '<div class="dp" data-k="'+key+'"><i class="box '+s+'">'+sym+'</i><span>'+pt+'</span></div>';
    });
  });
  return h;
}
function attachFarmerDP(){
  var back = document.getElementById('farmer-back');
  if (back) back.onclick = function(){
    _farmerModule = null;
    document.getElementById('modal-title').textContent = 'THE FARMER';
    document.getElementById('modal-body').innerHTML = farmerPickerHTML();
    attachFarmerPicker();
  };
  document.querySelectorAll('.dp').forEach(function(el){
    el.onclick = function(){
      var k = el.dataset.k, c = ST.dp[k] || 'none';
      ST.dp[k] = c==='none' ? 'prog' : c==='prog' ? 'conf' : 'none';
      saveState();
      if (_modalScene){
        checkAchievements(_modalScene);
        if (ST.dp[k]==='conf') _modalScene.showToast('Confident! The bed grows.');
        else if (ST.dp[k]==='prog') _modalScene.showToast('In progress — bed watered.');
        if (_modalScene.beds) _modalScene.beds.forEach(function(b){ _modalScene.refreshBed(b); });
      }
      document.getElementById('modal-body').innerHTML = farmerModuleHTML(_farmerModule);
      attachFarmerDP();
    };
  });
}

// ============================================================
//  STUDY TREE — quizzes
// ============================================================
function treeHTML(){
  var t=0, d=0; Object.keys(ST.qz).forEach(function(k){ t++; if(ST.qz[k]) d++; });
  var pct = t>0 ? Math.round(d/t*100) : 0, st = treeStage();
  var labs=['Bare sapling','First buds','Leaves appearing','Growing well','Full canopy','In full bloom'];
  var h = '<div class="stats"><div class="stat"><label>COMPLETED</label><b style="color:#40a020">'+d+'/'+t+'</b></div>'
        + '<div class="stat"><label>STAGE</label><b style="color:#c8901c">'+st+'/5</b></div></div>';
  h += '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(pct/100)+'"></div></div>';
  h += '<p class="note">'+labs[st]+'</p>';
  Object.keys(CONFIG_QUIZZES).forEach(function(m){
    var md=0; CONFIG_QUIZZES[m].forEach(function(_,i){ if(ST.qz[m+'_'+i]) md++; });
    h += '<div class="sect"><div class="grouphead">'+CONFIG_SYLLABUS[m].title.split(':')[1].trim()+' — '+md+'/'+CONFIG_QUIZZES[m].length+'</div>';
    CONFIG_QUIZZES[m].forEach(function(q,i){
      var key = m+'_'+i, dn = ST.qz[key];
      h += '<div class="row" data-k="'+key+'"><span>'+q+'</span><i class="chk '+(dn?'on':'')+'">'+(dn?'&#10003;':'')+'</i></div>';
    });
    h += '</div>';
  });
  return h;
}
function attachQZ(){
  document.querySelectorAll('.row[data-k]').forEach(function(el){
    if (el.dataset.k.indexOf('m')!==0) return;
    el.onclick = function(){
      var prev = treeStage();
      ST.qz[el.dataset.k] = !ST.qz[el.dataset.k]; saveState();
      if (_modalScene){
        checkAchievements(_modalScene);
        var cur = treeStage();
        if (cur > prev){
          var msgs = ['','First buds!','Leaves growing!','Thriving!','Full canopy!','In full bloom!'];
          _modalScene.showToast(msgs[cur]);
        }
        if (_modalScene.refreshStudyTree) _modalScene.refreshStudyTree();
      }
      document.getElementById('modal-body').innerHTML = treeHTML(); attachQZ();
    };
  });
}

// ============================================================
//  WELL — practicals
// ============================================================
function wellHTML(){
  // Practicals tracker (originally the Well; now opened from the Farmhouse).
  // Kept the function name for minimal churn.
  var d=0; Object.keys(ST.pr).forEach(function(k){ if(ST.pr[k]) d++; });
  var pct = Math.round(d/CONFIG_PRACTICALS.length*100);
  var h = '<div class="stats"><div class="stat"><label>LOGGED</label><b style="color:#40a020">'+d+'/'+CONFIG_PRACTICALS.length+'</b></div>'
        + '<div class="stat"><label>PROGRESS</label><b style="color:#4878d8">'+pct+'%</b></div></div>';
  h += '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(pct/100)+'"></div></div>';
  h += '<p class="note">Mark off each practical as you complete it.</p>';
  CONFIG_PRACTICALS.forEach(function(p,i){
    var key = 'p'+i, dn = ST.pr[key];
    h += '<div class="row" data-k="'+key+'"><span>'+p+'</span><i class="chk '+(dn?'on':'')+'">'+(dn?'&#10003;':'')+'</i></div>';
  });
  return h;
}
function attachPR(){
  document.querySelectorAll('.row[data-k]').forEach(function(el){
    if (el.dataset.k.indexOf('p')!==0) return;
    el.onclick = function(){
      ST.pr[el.dataset.k] = !ST.pr[el.dataset.k]; saveState();
      if (_modalScene) _modalScene.showToast('Practical logged.');
      document.getElementById('modal-body').innerHTML = wellHTML(); attachPR();
    };
  });
}

// ============================================================
//  MAIL / NOTICEBOARD
// ============================================================
function mailHTML(){
  if (!CONFIG_MAIL.length) return '<p class="note">No messages yet.</p>';
  return CONFIG_MAIL.map(function(m,i){
    var unread = ST.mailRead.indexOf(i)===-1;
    return '<div class="mail'+(unread?' new':'')+'"><div class="mfrom">FROM: '+m.from+(unread?' <b style="color:#6878c8">[NEW]</b>':'')+'</div>'
         + '<div class="msubj">'+m.subject+'</div><div class="mbody">'+m.body+'</div></div>';
  }).join('');
}

// close button
window.addEventListener('DOMContentLoaded', function(){
  document.getElementById('modal-close').onclick = closeModal;
});

// ============================================================
//  SKILLS — panel with correct totalXP state model
// ============================================================
function skillsHTML(){
  if (typeof CONFIG_SKILLS === 'undefined' || !ST.skills){
    return '<p class="note">Skills data not available.</p>';
  }

  // Check if a session is currently active
  var activeSession = ST.session;
  var activeRemaining = activeSession ? sessionRemainingMs() : 0;
  var activeExpired   = activeSession && activeRemaining === 0;

  var h = '';

  // ---- Active session banner ----
  if (activeSession){
    var acfg = CONFIG_SKILLS[activeSession.skill] || {};
    if (activeExpired){
      h += '<div class="session-banner expired">'
         + '<b>Session complete!</b> Close this panel and submit your takeaway.'
         + '</div>';
    } else {
      var am = Math.floor(activeRemaining/60000), as2 = Math.floor((activeRemaining%60000)/1000);
      h += '<div class="session-banner active">'
         + '<b>' + (acfg.activityLabel || activeSession.skill) + '</b><br>'
         + '"' + (activeSession.study||'').substring(0,80) + '"<br>'
         + '<span class="session-time">' + am + ':' + (as2<10?'0':'') + as2 + ' remaining</span>'
         + '</div>';
    }
  }

  h += '<p class="note" style="font-size:13px;line-height:1.55">'
     + 'Start a 15-minute study session to earn ' + SESSION_XP_REWARD + ' XP. '
     + 'Each level costs more XP than the last.</p>';

  // ---- Tabs: Skills | Journal ----
  h += '<div class="skill-tabs">'
     + '<button class="skill-tab active" id="tab-skills">Skills</button>'
     + '<button class="skill-tab" id="tab-journal">Journal (' + (ST.journal ? ST.journal.length : 0) + ')</button>'
     + '<button class="skill-tab" id="tab-fish">Fish Log</button>'
     + '</div>';
  h += '<div id="skills-panel">';

  h += '<div class="skillsbox">';
  Object.keys(CONFIG_SKILLS).forEach(function(key){
    var cfg = CONFIG_SKILLS[key];
    var locked = !skillUnlocked(key);
    var pr = progressFor((ST.skills[key] || {totalXP:0}).totalXP);
    var atMax = pr.level >= SKILL_MAX_LEVEL;
    var pct = atMax ? 100 : (pr.next > 0 ? Math.min(100, Math.round(pr.xp / pr.next * 100)) : 0);
    var sessionActive = activeSession && activeSession.skill === key && !activeExpired;

    h += '<div class="skillrow' + (locked ? ' locked' : '') + '">';
    h +=   '<div class="skilllead">';
    h +=     '<div class="skillicon" style="background:' + cfg.color + '">' + cfg.letter + '</div>';
    h +=     '<div class="skillbody">';
    h +=       '<div class="skillname">' + cfg.name + ' <span class="skilllvl">Lv ' + pr.level + '</span></div>';
    h +=       '<div class="skillblurb">' + cfg.blurb + '</div>';
    if (locked && cfg.unlockHint){
      h +=     '<div class="skilllock">' + cfg.unlockHint + '</div>';
    }
    h +=     '</div>';
    h +=   '</div>';
    if (atMax){
      h += '<div class="skillbar"><div class="skillfill" style="width:100%;background:' + cfg.color + '">MAX LEVEL</div></div>';
    } else {
      h += '<div class="skillbar"><div class="skillfill" style="width:' + pct + '%;background:' + cfg.color + '"></div>'
         + '<span class="skillxp">' + pr.xp + ' / ' + pr.next + ' XP (Total: ' + (ST.skills[key]||{totalXP:0}).totalXP + ')</span>'
         + '</div>';
    }
    if (!locked && !atMax){
      h += '<div class="skillactions">';
      if (sessionActive){
        h += '<button class="studybtn disabled" disabled>Session in progress...</button>';
      } else if (activeSession && !activeExpired){
        h += '<button class="studybtn disabled" disabled>Finish active session first</button>';
      } else {
        h += '<button class="studybtn" data-skill="' + key + '">Start study session (earn ' + SESSION_XP_REWARD + ' XP)</button>';
      }
      h += '</div>';
    }
    h += '</div>';
  });
  h += '</div>';  // skillsbox

  h += '</div>';  // skills-panel

  h += '<div id="journal-panel" style="display:none">';
  h += journalHTML();
  h += '</div>';

  h += '<div id="fish-panel" style="display:none">';
  h += fishLogHTML();
  h += '</div>';

  return h;
}

function journalHTML(){
  if (!ST.journal || ST.journal.length === 0){
    return '<p class="note">No journal entries yet. Complete a study session to add one.</p>';
  }
  var h = '<div class="journal-list">';
  ST.journal.forEach(function(entry){
    var cfg = CONFIG_SKILLS[entry.skill] || {};
    var d = new Date(entry.timestamp);
    var dateStr = d.toLocaleDateString('en-AU', {day:'numeric',month:'short',year:'numeric'});
    h += '<div class="journal-entry">';
    h +=   '<div class="journal-head">';
    h +=     '<span class="journal-skill" style="background:' + (cfg.color||'#888') + '">' + (cfg.name||entry.skill) + '</span>';
    h +=     '<span class="journal-date">' + dateStr + '</span>';
    h +=     '<span class="journal-xp">+' + entry.xp + ' XP</span>';
    h +=   '</div>';
    h +=   '<div class="journal-study"><b>Studied:</b> ' + entry.study + '</div>';
    h +=   '<div class="journal-takeaway"><b>Takeaway:</b> ' + entry.takeaway + '</div>';
    h +=   '<button class="removebtn" data-eid="' + entry.id + '">Remove &amp; refund XP</button>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

// ---- Fish log tab content ----
function fishLogHTML(){
  if (!ST.fishCaught || Object.keys(ST.fishCaught).length === 0){
    return '<p class="note">No fish caught yet. Complete a fishing session to catch some!</p>';
  }
  var h = '<div class="journal-list">';
  // Sort: rare first, then uncommon, then common
  var byRarity = { rare:[], uncommon:[], common:[] };
  FISH_DEFS.forEach(function(f){
    var count = ST.fishCaught[f.id] || 0;
    if (count > 0) byRarity[f.rarity].push({ def:f, count:count });
  });
  ['rare','uncommon','common'].forEach(function(rarity){
    if (!byRarity[rarity].length) return;
    h += '<div class="journal-head"><span class="journal-skill" style="background:'
       + (rarity==='rare'?'#8a3070':rarity==='uncommon'?'#4878a8':'#4a6028')
       + '">' + rarity.toUpperCase() + '</span></div>';
    byRarity[rarity].forEach(function(item){
      h += '<div class="journal-entry" style="padding:8px 12px;">';
      h += '<div class="journal-head">';
      // Fish sprite from fish_pack.png
      h += '<canvas id="fishcanvas_' + item.def.id + '" width="32" height="32" '
         + 'style="image-rendering:pixelated;width:48px;height:48px;border:1px solid #c8a868;"></canvas>';
      h += '<span style="font-family:monospace;font-size:14px;flex:1;margin-left:10px">' + item.def.name + '</span>';
      h += '<span class="journal-xp">×' + item.count + '</span>';
      h += '</div></div>';
    });
  });
  h += '</div>';
  return h;
}

function attachFishCanvases(){
  // Draw each fish sprite onto its canvas element after the DOM is built
  var fishImg = null;
  try {
    var tex = (typeof Phaser !== 'undefined' && window.__phaserGame)
      ? window.__phaserGame.scene.scenes[1].textures.get('fish_pack')
      : null;
    if (tex) fishImg = tex.getSourceImage();
  } catch(e){}
  if (!fishImg) return;
  FISH_DEFS.forEach(function(f){
    var canvas = document.getElementById('fishcanvas_' + f.id);
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(fishImg, f.gridX*32, f.gridY*32, 32, 32, 0, 0, 32, 32);
  });
}

function showFishCatchModal(caught){
  var ov = document.getElementById('modal-overlay');
  var title = document.getElementById('modal-title');
  var body = document.getElementById('modal-body');
  title.textContent = 'SESSION COMPLETE — FISH CAUGHT!';
  var h = '<p class="note" style="font-size:13px">Good work. Here\'s what you caught:</p>';
  h += '<div style="display:flex;gap:16px;justify-content:center;padding:16px 0;flex-wrap:wrap">';
  caught.forEach(function(f){
    h += '<div style="text-align:center">';
    h += '<canvas id="catchcanvas_' + f.id + '" width="32" height="32" '
       + 'style="image-rendering:pixelated;width:64px;height:64px;display:block;margin:0 auto 6px;"></canvas>';
    h += '<div style="font-family:monospace;font-size:12px">' + f.name + '</div>';
    h += '<div style="font-size:11px;color:'
       + (f.rarity==='rare'?'#c060a0':f.rarity==='uncommon'?'#6090c8':'#70a060')
       + '">' + f.rarity + '</div>';
    h += '</div>';
  });
  h += '</div>';
  h += '<button class="studybtn" id="catch-close-btn" style="width:100%;margin-top:8px">'
     + 'Continue (+' + SESSION_XP_REWARD + ' XP saved to journal)</button>';
  body.innerHTML = h;
  ov.classList.add('open');

  // Draw fish sprites
  setTimeout(function(){
    var fishImg = null;
    try {
      var tex = window.__phaserGame ? window.__phaserGame.scene.scenes[1].textures.get('fish_pack') : null;
      if (tex) fishImg = tex.getSourceImage();
    } catch(e){}
    if (fishImg){
      caught.forEach(function(f){
        var canvas = document.getElementById('catchcanvas_' + f.id);
        if (!canvas) return;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(fishImg, f.gridX*32, f.gridY*32, 32, 32, 0, 0, 32, 32);
      });
    }
    var btn = document.getElementById('catch-close-btn');
    if (btn) btn.onclick = function(){
      closeModal();
      if (_modalScene) _modalScene.showToast('+' + SESSION_XP_REWARD + ' XP earned!');
    };
  }, 50);
}

function attachSkills(){
  // Tab switching
  var tabSkills   = document.getElementById('tab-skills');
  var tabJournal  = document.getElementById('tab-journal');
  var tabFish     = document.getElementById('tab-fish');
  var panelSkills  = document.getElementById('skills-panel');
  var panelJournal = document.getElementById('journal-panel');
  var panelFish    = document.getElementById('fish-panel');
  function showTab(active){
    [tabSkills,tabJournal,tabFish].forEach(function(t){ if(t) t.classList.remove('active'); });
    [panelSkills,panelJournal,panelFish].forEach(function(p){ if(p) p.style.display='none'; });
    active.tab.classList.add('active');
    active.panel.style.display = '';
    if (active.onShow) active.onShow();
  }
  if (tabSkills){
    tabSkills.onclick  = function(){ showTab({tab:tabSkills,  panel:panelSkills}); };
    tabJournal.onclick = function(){ showTab({tab:tabJournal, panel:panelJournal}); };
    if (tabFish) tabFish.onclick = function(){ showTab({tab:tabFish, panel:panelFish,
      onShow: function(){ setTimeout(attachFishCanvases, 30); }}); };
  }
  // Start session buttons
  document.querySelectorAll('.studybtn:not(.disabled)').forEach(function(el){
    el.onclick = function(){
      var key = el.dataset.skill;
      if (!key || !skillUnlocked(key)) return;
      openStudyPromptFor(key);
    };
  });
  // Journal remove buttons
  document.querySelectorAll('.removebtn').forEach(function(el){
    el.onclick = function(){
      var eid = el.dataset.eid;
      if (confirm('Remove this entry and refund its XP?')){
        journalRemoveEntry(eid);
        document.getElementById('modal-body').innerHTML = skillsHTML();
        attachSkills();
        // re-switch to journal tab
        var tj = document.getElementById('tab-journal');
        var ts = document.getElementById('tab-skills');
        var pj = document.getElementById('journal-panel');
        var ps = document.getElementById('skills-panel');
        if (tj){ tj.classList.add('active'); ts.classList.remove('active'); pj.style.display=''; ps.style.display='none'; }
      }
    };
  });
}

// ---- Study prompt modal (pre-session sentence entry) ----
function openStudyPromptFor(skillKey){
  var cfg = CONFIG_SKILLS[skillKey];
  if (!cfg) return;
  closeModal();
  var ov = document.getElementById('modal-overlay');
  var title = document.getElementById('modal-title');
  var body  = document.getElementById('modal-body');
  title.textContent = cfg.name.toUpperCase() + ' — START SESSION';
  body.innerHTML =
    '<p class="note" style="font-size:13px;line-height:1.65">'
    + 'Before your ' + SESSION_DURATION_MS/60000 + '-minute ' + cfg.activityLabel.toLowerCase() + ' session, '
    + 'write one sentence about what you plan to focus on.'
    + '</p>'
    + '<textarea id="study-input" style="width:100%;height:80px;box-sizing:border-box;'
    + 'font-family:monospace;font-size:13px;background:#1a1208;color:#f0d060;'
    + 'border:1px solid #6a5030;padding:8px;resize:vertical" '
    + 'placeholder="e.g. I am going to review the fluid mosaic model and membrane transport."></textarea>'
    + '<div style="margin-top:12px;display:flex;gap:10px">'
    + '<button class="studybtn" id="study-start-btn" data-skill="' + skillKey + '">Start session</button>'
    + '<button class="backbtn" id="study-cancel-btn">Cancel</button>'
    + '</div>';
  ov.classList.add('open');
  var startBtn  = document.getElementById('study-start-btn');
  var cancelBtn = document.getElementById('study-cancel-btn');
  var input     = document.getElementById('study-input');
  cancelBtn.onclick = function(){ openModal('skills', _modalScene); };
  startBtn.onclick  = function(){
    var text = (input.value || '').trim();
    if (!text){ input.style.border = '1px solid #c04040'; return; }
    if (!sessionStart(skillKey, text)){
      body.innerHTML = '<p class="note">A session is already in progress. Finish it first.</p>';
      return;
    }
    closeModal();
    // Trigger animation (walk to water/bed, show tool, fade to black)
    if (_modalScene && _modalScene.startSessionAnimation) _modalScene.startSessionAnimation(skillKey);
    if (_modalScene && _modalScene.updateSessionBar) _modalScene.updateSessionBar();
    if (_modalScene) _modalScene.showToast('Session started — focus and study!');
  };
}

// ---- Takeaway modal (post-session sentence entry) ----
function openTakeawayModal(){
  var s = ST.session;
  if (!s){ closeModal(); return; }
  var cfg = CONFIG_SKILLS[s.skill] || {};
  var ov = document.getElementById('modal-overlay');
  var title = document.getElementById('modal-title');
  var body  = document.getElementById('modal-body');
  title.textContent = cfg.name ? cfg.name.toUpperCase() + ' — SESSION COMPLETE' : 'SESSION COMPLETE';
  body.innerHTML =
    '<p class="note" style="font-size:13px;line-height:1.65">'
    + 'Well done! Write one sentence summarising what you learned or revised.'
    + '</p>'
    + '<div style="font-size:12px;color:#a09070;margin-bottom:8px">'
    + 'You studied: &ldquo;' + s.study + '&rdquo;</div>'
    + '<textarea id="takeaway-input" style="width:100%;height:80px;box-sizing:border-box;'
    + 'font-family:monospace;font-size:13px;background:#1a1208;color:#f0d060;'
    + 'border:1px solid #6a5030;padding:8px;resize:vertical" '
    + 'placeholder="e.g. I revised how the sodium-potassium pump uses active transport..."></textarea>'
    + '<div style="margin-top:12px">'
    + '<button class="studybtn" id="takeaway-submit-btn">Submit &amp; earn ' + SESSION_XP_REWARD + ' XP</button>'
    + '</div>'
    + '<p class="note" style="font-size:11px;margin-top:10px;color:#806840">'
    + 'This entry will be saved to your journal.</p>';
  ov.classList.add('open');
  var submitBtn = document.getElementById('takeaway-submit-btn');
  var input     = document.getElementById('takeaway-input');
  submitBtn.onclick = function(){
    var text = (input.value || '').trim();
    if (!text){ input.style.border = '1px solid #c04040'; return; }
    var skill = s.skill;
    var entry = sessionComplete(text);
    if (entry && _modalScene){
      addSkillXP(entry.skill, entry.xp, _modalScene);
      if (_modalScene.updateSessionBar) _modalScene.updateSessionBar();
    }
    // For fishing sessions, roll a fish catch and show it
    if (skill === 'fishing' && typeof rollFishCatch === 'function'){
      var caught = rollFishCatch();
      // Save to state
      if (!ST.fishCaught) ST.fishCaught = {};
      caught.forEach(function(f){ ST.fishCaught[f.id] = (ST.fishCaught[f.id] || 0) + 1; });
      saveState();
      showFishCatchModal(caught);
    } else {
      closeModal();
      if (_modalScene) _modalScene.showToast('+' + SESSION_XP_REWARD + ' XP! Entry saved to journal.');
    }
  };
}
var CHAR_DEFS = [
  { key:'player',  label:'Default',     desc:'Original student' },
  { key:'char1',   label:'Character 1', desc:'Blue jacket' },
  { key:'char2',   label:'Character 2', desc:'Orange hair' },
  { key:'char3',   label:'Character 3', desc:'Dark uniform' }
];

function customiseHTML(){
  var cur=(ST.appearance&&ST.appearance.character)||'player';
  var h='<p class="note" style="font-size:12px;line-height:1.6">Choose your character.</p>';
  h+='<div class="char-picker">';
  CHAR_DEFS.forEach(function(cd){
    var sel=cur===cd.key;
    h+='<div class="char-option'+(sel?' selected':'')+'" data-charkey="'+cd.key+'">';
    h+='<canvas class="char-preview" id="charcanvas_'+cd.key+'" width="32" height="32" '
      +'style="image-rendering:pixelated;width:64px;height:64px;display:block;margin:0 auto 6px;"></canvas>';
    h+='<div class="char-label">'+cd.label+'</div>';
    h+='<div class="char-desc">'+cd.desc+'</div>';
    h+='</div>';
  });
  h+='</div>';
  return h;
}


function attachCustomise(){
  setTimeout(function(){
    CHAR_DEFS.forEach(function(cd){
      var canvas=document.getElementById('charcanvas_'+cd.key);
      if(!canvas||!_modalScene) return;
      try {
        var tex=_modalScene.textures.get(cd.key);
        if(!tex) return;
        var src=tex.getSourceImage();
        if(!src||!src.width) return;
        var ctx=canvas.getContext('2d');
        ctx.imageSmoothingEnabled=false;
        if(cd.key==='player') ctx.drawImage(src,0,0,80,80,0,0,32,32);
        else ctx.drawImage(src,32,0,32,32,0,0,32,32);
      } catch(e){}
    });
  }, 30);
  document.querySelectorAll('.char-option').forEach(function(el){
    el.onclick=function(){
      var key=el.dataset.charkey;
      if(!ST.appearance) ST.appearance={};
      ST.appearance.character=key;
      saveState();
      if(_modalScene&&_modalScene.swapPlayerCharacter) _modalScene.swapPlayerCharacter(key);
      document.getElementById('modal-body').innerHTML=customiseHTML();
      attachCustomise();
    };
  });
}


