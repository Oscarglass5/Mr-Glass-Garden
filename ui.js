// ============================================================
//  MR GLASS' GARDEN — DOM UI overlays (modals)
//  Pure DOM, sits above the Phaser canvas.
// ============================================================
var _modalScene = null;

function modalIsOpen(){
  return document.getElementById('modal-overlay').classList.contains('open');
}
function closeModal(){
  document.getElementById('modal-overlay').classList.remove('open');
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

  if (id==='house'){ title.textContent='FARMHOUSE — SYLLABUS'; body.innerHTML = farmhouseHTML(); attachDP(); }
  else if (id==='tree'){ title.textContent='STUDY TREE — QUIZZES'; body.innerHTML = treeHTML(); attachQZ(); }
  else if (id==='garden'){ title.textContent='MODULE BEDS — PROGRESS'; body.innerHTML = gardenHTML(); attachAT(); }
  else if (id==='well'){ title.textContent='WELL — PRACTICALS'; body.innerHTML = wellHTML(); attachPR(); }
  else if (id==='mailbox' || id==='market'){
    title.textContent='MAILBOX — MESSAGES'; body.innerHTML = mailHTML();
    CONFIG_MAIL.forEach(function(_,i){ if(ST.mailRead.indexOf(i)===-1) ST.mailRead.push(i); });
    saveState();
  }
  else if (id==='cave'){
    title.textContent='CAVE — EXTENSION';
    body.innerHTML = '<p style="color:#406080;font-size:13px;line-height:2">The vines part. You step inside.<br><br>Extension content will appear here as it unlocks.</p>';
  }
}

// ---- Farmhouse (dot points) ----
function farmhouseHTML(){
  var conf=0,prog=0,total=0;
  Object.keys(ST.dp).forEach(function(k){ total++; if(ST.dp[k]==='conf')conf++; else if(ST.dp[k]==='prog')prog++; });
  var pct = total>0 ? Math.round((conf+prog*0.5)/total*100) : 0;
  var h = '<div class="legend"><span><i class="box none"></i>Not started</span>'
        + '<span><i class="box prog"></i>In progress</span>'
        + '<span><i class="box conf"></i>Confident</span></div>';
  h += '<div class="stats"><div class="stat"><label>CONFIDENT</label><b style="color:#40a020">'+conf+'</b></div>'
     + '<div class="stat"><label>IN PROGRESS</label><b style="color:#c8901c">'+prog+'</b></div>'
     + '<div class="stat"><label>TOTAL</label><b style="color:#a08850">'+total+'</b></div></div>';
  h += '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(pct/100)+'"></div></div>';
  var stageNames=['Bare','Planted','Sprouting','Growing','Thriving','Complete'];
  Object.keys(CONFIG_SYLLABUS).forEach(function(m){
    var p = moduleProgress(m), st = moduleStage(m);
    h += '<div class="sect"><div class="sect-title">'+CONFIG_SYLLABUS[m].title
       + ' <span style="font-size:9px;color:'+(st===5?'#40a020':'#c8901c')+'">['+stageNames[st]+' · '+Math.round(p.pct*100)+'%]</span></div>';
    CONFIG_SYLLABUS[m].iq.forEach(function(q,qi){
      h += '<div class="iq">'+q.label+'</div>';
      q.points.forEach(function(pt,pi){
        var key=m+'_'+qi+'_'+pi, s=ST.dp[key]||'none';
        var sym = s==='conf'?'&#10003;' : s==='prog'?'~' : '';
        h += '<div class="dp" data-k="'+key+'"><i class="box '+s+'">'+sym+'</i><span>'+pt+'</span></div>';
      });
    });
    h += '</div>';
  });
  return h;
}
function attachDP(){
  document.querySelectorAll('.dp').forEach(function(el){
    el.onclick = function(){
      var k = el.dataset.k, c = ST.dp[k]||'none';
      ST.dp[k] = c==='none'?'prog' : c==='prog'?'conf' : 'none';
      saveState();
      if (_modalScene){ checkAchievements(_modalScene);
        if (ST.dp[k]==='conf') _modalScene.showToast('Confident! The bed grows.');
        else if (ST.dp[k]==='prog') _modalScene.showToast('In progress — bed watered.');
        if (_modalScene.beds) _modalScene.beds.forEach(function(b){ _modalScene.refreshBed(b); });
      }
      document.getElementById('modal-body').innerHTML = farmhouseHTML(); attachDP();
    };
  });
}

// ---- Study tree (quizzes) ----
function treeHTML(){
  var t=0,d=0; Object.keys(ST.qz).forEach(function(k){ t++; if(ST.qz[k])d++; });
  var pct = t>0?Math.round(d/t*100):0, st=treeStage();
  var labs=['Bare sapling','First buds','Leaves appearing','Growing well','Full canopy','In full bloom'];
  var h = '<div class="stats"><div class="stat"><label>COMPLETED</label><b style="color:#40a020">'+d+'/'+t+'</b></div>'
        + '<div class="stat"><label>STAGE</label><b style="color:#c8901c">'+st+'/5</b></div></div>';
  h += '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(pct/100)+'"></div></div>';
  h += '<p class="note">'+labs[st]+'</p>';
  Object.keys(CONFIG_QUIZZES).forEach(function(m){
    var md=0; CONFIG_QUIZZES[m].forEach(function(_,i){ if(ST.qz[m+'_'+i])md++; });
    h += '<div class="sect"><div class="grouphead">'+CONFIG_SYLLABUS[m].title.split(':')[1].trim()+' — '+md+'/'+CONFIG_QUIZZES[m].length+'</div>';
    CONFIG_QUIZZES[m].forEach(function(q,i){
      var key=m+'_'+i, dn=ST.qz[key];
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
      var prev=treeStage();
      ST.qz[el.dataset.k] = !ST.qz[el.dataset.k]; saveState();
      if (_modalScene){ checkAchievements(_modalScene);
        var cur=treeStage();
        if (cur>prev){ var msgs=['','First buds!','Leaves growing!','Thriving!','Full canopy!','In full bloom!']; _modalScene.showToast(msgs[cur]); }
      }
      document.getElementById('modal-body').innerHTML = treeHTML(); attachQZ();
    };
  });
}

// ---- Garden (assessments + bed summary) ----
function gardenHTML(){
  var h = '<p class="note">Each bed grows as you mark dot points in the Farmhouse. Mark assessment tasks below as you submit them.</p>';
  var stageNames=['Bare soil','Seeds planted','Sprouting','Growing','Almost there','Complete!'];
  Object.keys(CONFIG_SYLLABUS).forEach(function(m){
    var p=moduleProgress(m), st=moduleStage(m), pct=Math.round(p.pct*100);
    h += '<div class="bed"><b>'+CONFIG_SYLLABUS[m].title+'</b>'
       + '<div class="note2">'+stageNames[st]+' — '+pct+'%</div>'
       + '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(p.pct)+'"></div></div>'
       + '<div class="note2">'+p.conf+' confident · '+p.prog+' in progress · '+(p.total-p.conf-p.prog)+' not started</div></div>';
  });
  h += '<div class="sect-title" style="margin-top:14px">ASSESSMENT TASKS</div>';
  CONFIG_ASSESSMENTS.forEach(function(a){
    var dn=ST.at[a.key];
    h += '<div class="bed"><b>'+a.label+'</b><div class="note2">'+a.desc+' · '+a.term+'</div>'
       + '<button class="btn'+(dn?' done':'')+'" data-k="'+a.key+'">'+(dn?'&#10003; SUBMITTED':'Mark submitted')+'</button></div>';
  });
  return h;
}
function attachAT(){
  document.querySelectorAll('.btn[data-k]:not(.done)').forEach(function(el){
    el.onclick = function(){
      ST.at[el.dataset.k]=true; saveState();
      if (_modalScene) _modalScene.showToast('Task submitted!');
      document.getElementById('modal-body').innerHTML = gardenHTML(); attachAT();
    };
  });
}

// ---- Well (practicals) ----
function wellHTML(){
  var d=0; Object.keys(ST.pr).forEach(function(k){ if(ST.pr[k])d++; });
  var pct=Math.round(d/CONFIG_PRACTICALS.length*100);
  var h = '<div class="stats"><div class="stat"><label>LOGGED</label><b style="color:#40a020">'+d+'/'+CONFIG_PRACTICALS.length+'</b></div>'
        + '<div class="stat"><label>WELL LEVEL</label><b style="color:#4878d8">'+pct+'%</b></div></div>';
  h += '<div class="pbar"><div class="pfill" style="width:'+pct+'%;background:'+pbColor(pct/100)+'"></div></div>';
  CONFIG_PRACTICALS.forEach(function(p,i){
    var key='p'+i, dn=ST.pr[key];
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

// ---- Mail ----
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
