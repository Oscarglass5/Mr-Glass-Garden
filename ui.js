// ============================================================
//  MR GLASS' GARDEN — DOM UI overlays (modals)
//  Pure DOM, sits above the Phaser canvas.
// ============================================================
var _modalScene = null;
var _farmerModule = null;  // when set (e.g. 'm1'), shows that module's dot points

function modalIsOpen(){
  return document.getElementById('modal-overlay').classList.contains('open');
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
  _farmerModule = null;
}
function pbColor(pct){
  if (pct>=1) return '#40c020';
  if (pct>=0.5) return '#80c040';
  if (pct>0) return '#c8901c';
  return '#806840';
}

function openModal(id, scene){
  _modalScene = scene;
  var ov = document.getElementById('modal-overlay');
  var title = document.getElementById('modal-title');
  var body = document.getElementById('modal-body');
  ov.classList.add('open');

  if (id==='house'){
    title.textContent='FARMHOUSE';
    body.innerHTML = '<p class="note" style="font-size:13px;line-height:1.7">The farmhouse is being renovated. New tools coming soon.</p>';
  }
  else if (id==='farmer'){
    title.textContent='THE FARMER';
    _farmerModule = null;
    body.innerHTML = farmerPickerHTML();
    attachFarmerPicker();
  }
  else if (id==='tree'){ title.textContent='STUDY TREE — QUIZZES'; body.innerHTML = treeHTML(); attachQZ(); }
  else if (id==='well'){ title.textContent='WELL — PRACTICALS'; body.innerHTML = wellHTML(); attachPR(); }
  else if (id==='mailbox'){
    title.textContent='NOTICEBOARD — MESSAGES'; body.innerHTML = mailHTML();
    CONFIG_MAIL.forEach(function(_,i){ if(ST.mailRead.indexOf(i)===-1) ST.mailRead.push(i); });
    saveState();
  }
  else if (id==='cave'){
    title.textContent='CAVE — EXTENSION';
    body.innerHTML = '<p class="note" style="font-size:13px;line-height:1.8">The vines part. You step inside.<br><br>Extension content will appear here as it unlocks.</p>';
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
  var d=0; Object.keys(ST.pr).forEach(function(k){ if(ST.pr[k]) d++; });
  var pct = Math.round(d/CONFIG_PRACTICALS.length*100);
  var h = '<div class="stats"><div class="stat"><label>LOGGED</label><b style="color:#40a020">'+d+'/'+CONFIG_PRACTICALS.length+'</b></div>'
        + '<div class="stat"><label>WELL LEVEL</label><b style="color:#4878d8">'+pct+'%</b></div></div>';
  h += '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(pct/100)+'"></div></div>';
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
      if (_modalScene) _modalScene.showToast('Practical logged — the well fills!');
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
