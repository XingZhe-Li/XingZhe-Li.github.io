import { units,lessons,cases,guides,findLesson,findUnit } from './data/index.js';
import { LAB_TYPES } from './labs/defaults.js';
import { labView,labModel,handleLabAction,handleLabField } from './labs/index.js';
import { AudioEngine } from './audio/engine.js';
import { STORAGE_KEY,LEGACY_KEY,createState,normalizeState,labFor,completionMissing,loadLessonStart,restoreLessonDraft } from './state.js';
import { shell,homeView,unitView,lessonView,completionView,quizContent,casesView,caseView,labsView,scratchView,guidesView,guideView,glossaryView,notesView } from './views.js';
import { icon } from './ui.js';
import { findCaseStudy,findCaseExcerpt } from './cases/index.js';
import { caseModel,excerptVariant } from './cases/models.js';
import { defaultCaseSettings,caseFigureView,setCasePlayback,highlightCaseBar,applyCaseSolo } from './cases/view.js';

const app=document.querySelector('#app'),engine=new AudioEngine();
document.querySelector('#skip-to-content').addEventListener('click',event=>{event.preventDefault();const main=document.querySelector('#main-content');main?.setAttribute('tabindex','-1');main?.focus();});
let state=createState(),storageAvailable=true,protectedRecord=false,startupNotice='',route={},currentLab=null;
let playGeneration=0,playingOwner=null,playingVariant='current',restartTimer=null,toastTimer=null,audioUrl=null,menuReturn=null;
let casePlayback=null,caseSettings=new Map();
let playingDescription='',playingLoops=true;
try {
  const saved=localStorage.getItem(STORAGE_KEY),legacy=localStorage.getItem(LEGACY_KEY);
  if(saved)state=normalizeState(JSON.parse(saved),lessons);
  else if(legacy){state=normalizeState(JSON.parse(legacy),lessons);startupNotice='已迁移原型的笔记与草稿，请在学习记录页备份。';}
}catch{storageAvailable=false;protectedRecord=true;startupNotice='无法读取本地记录，原记录已保留。当前学习请先导出JSON；导入有效备份后恢复自动保存。';}
engine.setVolume(state.settings.volume);
function notify(message) {
  const toast=document.querySelector('#toast');clearTimeout(toastTimer);
  toast.textContent=message;toast.classList.add('is-visible');
  toastTimer=setTimeout(()=>{toast.classList.remove('is-visible');toast.textContent='';},4800);
}
function persist() {
  if(protectedRecord){const label=document.querySelector('#storage-status');if(label)label.textContent='原记录已保留';return;}
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageAvailable=true;}
  catch{if(storageAvailable)notify('浏览器无法保存记录，请导出JSON备份。');storageAvailable=false;}
  const label=document.querySelector('#storage-status');if(label)label.textContent=storageAvailable?'本地保存':'请导出备份';
}
function download(data,name,type) {
  const blob=new Blob([data],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function parseRoute() {
  const parts=location.hash.replace(/^#\/?/,'').split('/');
  const type=parts[0]||'home',id=parts[1]||'';
  if(type==='home')return {type:'home',label:'学习路线'};
  if(type==='unit'&&findUnit(id))return {type,id,label:findUnit(id).title};
  if(type==='lesson'&&findLesson(id))return {type,id,label:findUnit(findLesson(id).unitId).title};
  if(type==='case'&&cases.some(c=>c.id===id))return {type,id,label:'聆听案例'};
  if(type==='guide'&&guides.some(g=>g.id===id))return {type,id,label:'进阶路线'};
  if(type==='lab'&&Object.hasOwn(LAB_TYPES,id))return {type,id,label:LAB_TYPES[id]};
  const labels={cases:'聆听案例',labs:'自由实验',guides:'进阶路线',glossary:'术语词典',notes:'笔记与学习记录'};
  if(Object.hasOwn(labels,type))return {type,label:labels[type]};
  return {type:'home',label:'学习路线',invalid:true};
}
function closeMenu(restore=false) {
  document.body.classList.remove('menu-open');document.querySelector('[data-action="menu"]')?.setAttribute('aria-expanded','false');
  if(restore)menuReturn?.focus();
}
function stopSynth() {
  playGeneration++;clearTimeout(restartTimer);restartTimer=null;playingOwner=null;engine.stop();setPlaying(false);casePlayback=null;
}
function stopAll(){stopSynth();document.querySelector('#local-audio')?.pause();}
function cleanupAudio() {
  const audio=document.querySelector('#local-audio');if(audio){audio.pause();audio.removeAttribute('src');audio.load();}
  if(audioUrl){URL.revokeObjectURL(audioUrl);audioUrl=null;}
}
function setPlaying(playing) {
  setCasePlayback(playing,casePlayback);
  const button=document.querySelector('#lab-play'),status=document.querySelector('#lab-status');
  if(button){button.setAttribute('aria-pressed',String(playing));button.innerHTML=icon(playing?'stop':'play')+(playing?'停止播放':'播放当前模型');}
  const variantLabels={current:'当前模型',reference:'对照模型 · 当前编辑区不随声高亮',root:'原位连接 · 当前卡片不随声高亮',smooth:'邻近连接 · 当前卡片不随声高亮',A:'草稿A · 当前编辑区不随声高亮',clip:'当前片段',texture:'完整组合',upper:'上声部',lower:'下声部',bass:'低音独听',drums:'固定鼓组',accompaniment:'上方伴奏',dry:'干声对照',scope:'临时变音实际读法',phrase:'当前移调短句',phraseA:'移调前短句A',numbered:'当前数字句','numbered-reference':'另一主音的数字句'};
  if(status)status.textContent=playing?(playingLoops?'正在循环 · ':'正在播放 · ')+(variantLabels[playingVariant]||playingDescription||'模型'):'原创教学模型';
  if(!playing)document.querySelectorAll('.is-playhead').forEach(el=>el.classList.remove('is-playhead'));
}
function markActivity(owner,key) {
  if(!findLesson(owner))return;
  state.activity[owner]||={played:false,changed:false};state.activity[owner][key]=true;persist();refreshCompletion();
}
function highlight({beat,step}) {
  if(!currentLab)return;
  const s=currentLab.state;
  const current=playingVariant==='current';
  for(const el of document.querySelectorAll('[data-pulse]'))el.classList.toggle('is-playhead',current&&Number(el.dataset.pulse)===Math.floor(beat)%({ '3/4':3,'6/8':2,'5/4':5 }[s.meter]||4));
  for(const el of document.querySelectorAll('[data-playhead]'))el.classList.toggle('is-playhead',current&&Number(el.dataset.playhead)===step);
  for(const el of document.querySelectorAll('[data-note-beat]'))el.classList.toggle('is-playhead',current&&Number(el.dataset.noteBeat)===Math.floor(beat)%16);
  for(const el of document.querySelectorAll('[data-chord-index]'))el.classList.toggle('is-playhead',current&&Number(el.dataset.chordIndex)===Math.floor(beat/s.beatsPerChord));
  for(const el of document.querySelectorAll('[data-section-index]'))el.classList.toggle('is-playhead',current&&Number(el.dataset.sectionIndex)===Math.floor(beat/16));
  for(const el of document.querySelectorAll('#lesson-lab [data-start][data-end],#lesson-lab [data-lab-start][data-lab-end]')) {
    const start=Number(el.dataset.start??el.dataset.labStart),end=Number(el.dataset.end??el.dataset.labEnd);
    const region=el.closest('[data-lab-playback]')?.dataset.labPlayback||'current';
    el.classList.toggle('is-playhead',region===playingVariant&&beat>=start&&beat<end);
  }
}
async function play(model,bpm,owner,variant='current',caseContext=null) {
  clearTimeout(restartTimer);document.querySelector('#local-audio')?.pause();
  const token=++playGeneration;playingOwner=owner;playingVariant=variant;casePlayback=caseContext;playingDescription=model.meta?.playbackLabel||'';playingLoops=model.meta?.loop!==false;
  document.querySelectorAll('.is-playhead').forEach(el=>el.classList.remove('is-playhead'));
  document.querySelectorAll('.case-score-bar.is-playing').forEach(el=>el.classList.remove('is-playing'));
  try {
    const started=await engine.play(model,{bpm,
      onState:playing=>{if(token===playGeneration)setPlaying(playing);},
      onStep:position=>{if(token!==playGeneration)return;if(casePlayback?.owner===owner)highlightCaseBar(casePlayback,position.beat);else if(currentLab?.owner===owner)highlight(position);},
      onError:error=>{if(token===playGeneration){playingOwner=null;setPlaying(false);notify(error.message);}}
    });
    if(token!==playGeneration||!(currentLab?.owner===owner||casePlayback?.owner===owner))return false;
    if(started){markActivity(owner,'played');setPlaying(true);}else{playingOwner=null;setPlaying(false);}
    return started;
  }catch(error){if(token===playGeneration){playingOwner=null;setPlaying(false);notify(error.message);}return false;}
}
async function preview(note,owner) {
  stopSynth();const token=playGeneration;
  try{const started=await engine.preview(note);if(token===playGeneration&&currentLab?.owner===owner&&started!==false)markActivity(owner,'played');}
  catch(error){if(token===playGeneration)notify(error.message);}
}
function renderLab(focusId) {
  if(!currentLab)return;
  const el=document.querySelector('#lesson-lab');if(!el)return;
  const disclosureKey=node=>node.dataset.labDisclosure||node.id||node.querySelector('summary')?.textContent.trim();
  const openDetails=new Set([...el.querySelectorAll('details[open]')].map(disclosureKey));
  el.innerHTML=labView(currentLab.lesson,currentLab.state,{backupAvailable:Boolean(state.labBackups[currentLab.owner])});
  for(const node of el.querySelectorAll('details'))if(openDetails.has(disclosureKey(node)))node.open=true;
  setPlaying(engine.isPlaying&&playingOwner===currentLab.owner);
  if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
}
function hostFor(lab) {
  const live=()=>currentLab===lab;
  return {
    play:(model,bpm,variant)=>live()?play(model,bpm,lab.owner,variant):false,
    preview:note=>live()?preview(note,lab.owner):false,
    playing:()=>live()&&engine.isPlaying&&playingOwner===lab.owner,
    stop:stopSynth,
    touch:()=>{if(live()){markActivity(lab.owner,'changed');persist();}},
    render:focusId=>{if(live())renderLab(focusId);},
    restart:()=>{if(!live()||!engine.isPlaying||playingOwner!==lab.owner)return;if(playingVariant!=='current'){stopSynth();notify('设置已更新，请重新选择相应的独听或对照试听。');return;}clearTimeout(restartTimer);restartTimer=setTimeout(()=>{if(live()&&engine.isPlaying&&playingOwner===lab.owner)play(labModel(lab.state),lab.state.bpm,lab.owner);},100);},
    notify,download
  };
}
function refreshCompletion() {
  const lesson=route.type==='lesson'?findLesson(route.id):null;if(!lesson)return;
  if(state.completed.includes(lesson.id)&&completionMissing(state,lesson).length){state.completed=state.completed.filter(id=>id!==lesson.id);persist();refreshProgress();}
  const node=document.querySelector('#completion-status');if(node)node.outerHTML=completionView(lesson,state);
}
function refreshProgress() {
  document.querySelector('[data-progress-count]')?.replaceChildren(String(state.completed.length));
  const fill=document.querySelector('.sidebar-foot .progress-fill');if(fill)fill.style.width=state.completed.length/lessons.length*100+'%';
  const active=document.querySelector('.unit-lesson-list .is-active');active?.classList.toggle('is-complete',state.completed.includes(route.id));
  if(active){const index=active.querySelector('.lesson-index');if(index)index.textContent=state.completed.includes(route.id)?'✓':String(findUnit(findLesson(route.id).unitId).lessons.findIndex(l=>l.id===route.id)+1);}
  if(route.type==='lesson'){const unit=findUnit(findLesson(route.id).unitId),small=document.querySelector('.unit-nav-head.is-active small');if(small)small.textContent=unit.lessons.filter(l=>state.completed.includes(l.id)).length+'/4';}
}
function renderPage({focus=false}={}) {
  stopSynth();cleanupAudio();closeMenu();route=parseRoute();currentLab=null;caseSettings=new Map();
  let body='';
  if(route.type==='home')body=homeView(state);
  if(route.type==='unit')body=unitView(findUnit(route.id),state);
  if(route.type==='lesson'){
    const lesson=findLesson(route.id);state.lastLesson=lesson.id;
    currentLab={owner:lesson.id,lesson,state:labFor(state,lesson)};
    body=lessonView(lesson,state,labView(lesson,currentLab.state,{backupAvailable:Boolean(state.labBackups[lesson.id])}));persist();
  }
  if(route.type==='cases')body=casesView();
  if(route.type==='case')body=caseView(cases.find(c=>c.id===route.id));
  if(route.type==='labs')body=labsView();
  if(route.type==='lab'){
    const lesson={id:'scratch-'+route.id,lab:{type:route.id,config:{}}};
    currentLab={owner:lesson.id,lesson,state:labFor(state,lesson)};
    body=scratchView(route.id,labView(lesson,currentLab.state));
  }
  if(route.type==='guides')body=guidesView();
  if(route.type==='guide')body=guideView(guides.find(g=>g.id===route.id));
  if(route.type==='glossary')body=glossaryView();
  if(route.type==='notes')body=notesView(state);
  app.innerHTML=shell(state,route,body);document.title=(route.type==='lesson'?findLesson(route.id).title:route.label)+' · 听见';
  if(!storageAvailable)document.querySelector('#storage-status').textContent='请导出备份';
  if(route.type==='case')attachAudioPlayer();
  if(focus){window.scrollTo({top:0,behavior:'instant'});document.querySelector('h1')?.focus({preventScroll:true});}
  if(route.invalid)notify('这个页面不存在，已回到课程总览。');
}
function filter(selector,needle,key,result,empty) {
  const query=needle.trim().toLocaleLowerCase();let count=0;
  document.querySelectorAll(selector).forEach(el=>{const show=el.dataset[key].toLocaleLowerCase().includes(query);el.hidden=!show;if(show)count++;});
  const status=document.querySelector(result);if(status)status.textContent=`找到 ${count} ${key==='searchText'?'个单元':'个术语'}`;
  if(empty)document.querySelector(empty).hidden=count>0;
}
function caseControl(excerptId) {
  const study=route.type==='case'?findCaseStudy(route.id):null,excerpt=findCaseExcerpt(study,excerptId);
  if(!excerpt)return null;
  if(!caseSettings.has(excerptId))caseSettings.set(excerptId,defaultCaseSettings(excerpt));
  return {study,excerpt,settings:caseSettings.get(excerptId)};
}
function updateCaseControl(target,eventType) {
  const control=caseControl(target.dataset.excerpt);if(!control)return;
  const {study,excerpt,settings}=control,key=target.dataset.caseField;
  try {
    if(key==='bpm') {
      settings.bpm=Math.round(Math.max(40,Math.min(120,Number(target.value))));
      document.getElementById('case-'+excerpt.id+'-bpm-value').textContent=settings.bpm+' BPM';
      stopSynth();if(eventType==='input')return;
    }else if(eventType!=='change')return;
    else if(key==='variant'){const variant=excerptVariant(excerpt,target.value);settings.variant=variant.id;if(!variant.parts.some(part=>part.id===settings.solo))settings.solo='all';}
    else if(key==='solo'){if(target.value!=='all'&&!excerptVariant(excerpt,settings.variant).parts.some(part=>part.id===target.value))return;settings.solo=target.value;}
    else if(key==='pulse')settings.pulse=target.checked;
    else return;
    stopSynth();const focusId=target.id;
    document.getElementById('case-figure-'+excerpt.id).outerHTML=caseFigureView(study,excerpt,settings);
    applyCaseSolo(excerpt.id,settings.solo);if(focusId)document.getElementById(focusId)?.focus({preventScroll:true});
  }catch(error){notify(error.message);}
}
app.addEventListener('click',async event=>{
  const caseButton=event.target.closest('[data-case-play]');
  if(caseButton) {
    const control=caseControl(caseButton.dataset.casePlay);if(!control)return;
    if(engine.isPlaying&&casePlayback?.excerptId===control.excerpt.id){stopSynth();return;}
    try {
      const {study,excerpt,settings}=control,variant=excerptVariant(excerpt,settings.variant),owner='case-'+study.caseId+'-'+excerpt.id;
      const context={owner,excerptId:excerpt.id,excerpt,variantLabel:variant.label,soloLabel:settings.solo==='all'?'全部声部':variant.parts.find(part=>part.id===settings.solo).name,bpm:settings.bpm};
      await play(caseModel(excerpt,settings.variant,settings.solo,settings.pulse),settings.bpm,owner,settings.variant,context);
    }catch(error){notify(error.message);}return;
  }
  const labButton=event.target.closest('[data-lab-action]');
  if(labButton&&currentLab){
    const lab=currentLab;
    if(['load-lesson-start','restore-lesson-draft'].includes(labButton.dataset.labAction)&&findLesson(lab.owner)) {
      stopSynth();
      const next=labButton.dataset.labAction==='load-lesson-start'?loadLessonStart(state,lab.lesson):restoreLessonDraft(state,lab.lesson);
      if(next){lab.state=next;markActivity(lab.owner,'changed');persist();renderLab();notify(labButton.dataset.labAction==='load-lesson-start'?'已载入本课起点，原草稿已备份。':'已恢复载入前草稿。');}
      return;
    }
    try{await handleLabAction(labButton,lab.state,hostFor(lab));}catch(error){notify(error.message);}return;
  }
  const button=event.target.closest('[data-action]');if(!button)return;
  const action=button.dataset.action,lesson=route.type==='lesson'?findLesson(route.id):null;
  if(action==='menu'){menuReturn=button;document.body.classList.toggle('menu-open');button.setAttribute('aria-expanded',String(document.body.classList.contains('menu-open')));if(document.body.classList.contains('menu-open'))document.querySelector('.sidebar-close')?.focus();}
  if(action==='menu-close')closeMenu(true);
  if(action==='stop')stopAll();
  if(action==='scroll'){const target=document.getElementById(button.dataset.target);target?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});}
  if(action==='export'){download(JSON.stringify(state,null,2),'tingjian-study-'+new Date().toISOString().slice(0,10)+'.json','application/json');notify('已导出学习记录，包含笔记、实验草稿和进度。');}
  if(action==='answer'&&lesson){const question=Number(button.dataset.question),option=Number(button.dataset.option);state.answers[lesson.id]||=lesson.quiz.map(()=>null);state.answers[lesson.id][question]=option;persist();document.querySelector('#quiz-content').innerHTML=quizContent(lesson,state);document.querySelector(`[data-question="${question}"][data-option="${option}"]`)?.focus({preventScroll:true});refreshCompletion();}
  if(action==='bookmark'&&lesson){state.bookmarks=state.bookmarks.includes(lesson.id)?state.bookmarks.filter(id=>id!==lesson.id):[...state.bookmarks,lesson.id];button.setAttribute('aria-pressed',String(state.bookmarks.includes(lesson.id)));button.textContent=state.bookmarks.includes(lesson.id)?'已加入复习':'加入复习';persist();}
  if(action==='complete'&&lesson){const missing=completionMissing(state,lesson);if(missing.length){notify('还需要：'+missing.join('；'));document.querySelector('#completion-status')?.scrollIntoView({block:'center'});}else{if(!state.completed.includes(lesson.id))state.completed.push(lesson.id);persist();refreshCompletion();refreshProgress();notify('已记录本课完成。带着一个问题进入下一课。');}}
  if(action==='audio-start'||action==='audio-end'){const audio=document.querySelector('#local-audio');if(!audio?.src){notify('请先选择本地音频。');return;}document.querySelector(action==='audio-start'?'#loop-start':'#loop-end').value=audio.currentTime.toFixed(1);validateLoop();}
});
app.addEventListener('keydown',async event=>{
  const target=event.target;
  if(event.key==='Enter'&&target.matches('input[data-lab-field]:not([type="range"]):not([type="checkbox"])')&&currentLab) {
    event.preventDefault();await handleLabField(target,currentLab.state,hostFor(currentLab));
  }
});
app.addEventListener('input',event=>{
  const target=event.target;
  if(target.dataset.caseField)updateCaseControl(target,'input');
  if(target.id==='master-volume'){state.settings.volume=Number(target.value);engine.setVolume(state.settings.volume);const audio=document.querySelector('#local-audio');if(audio)audio.volume=state.settings.volume;persist();}
  if(target.id==='course-search')filter('[data-search-text]',target.value,'searchText','#search-result','#search-empty');
  if(target.id==='glossary-search')filter('[data-glossary-text]',target.value,'glossaryText','#glossary-result');
  if(target.id==='lesson-note'&&route.type==='lesson'){state.notes[route.id]=target.value.slice(0,8000);persist();}
  if(['loop-start','loop-end'].includes(target.id))validateLoop();
  if(target.dataset.labField&&currentLab)handleLabField(target,currentLab.state,hostFor(currentLab),'input');
});
app.addEventListener('change',async event=>{
  const target=event.target;
  if(target.dataset.caseField){updateCaseControl(target,'change');return;}
  if(target.dataset.labField&&currentLab){await handleLabField(target,currentLab.state,hostFor(currentLab));return;}
  if(target.dataset.practice!==undefined&&route.type==='lesson'){const l=findLesson(route.id);state.practice[l.id]||=l.practice.criteria.map(()=>false);state.practice[l.id][Number(target.dataset.practice)]=target.checked;persist();refreshCompletion();}
  if(target.id==='import-record'){
    const file=target.files?.[0];if(!file)return;stopAll();
    try{if(file.size>2*1024*1024)throw new Error('记录文件过大，请选择2MB以内的学习记录JSON。');const imported=normalizeState(JSON.parse(await file.text()),lessons);for(const draft of [...Object.values(imported.labs),...Object.values(imported.labBackups)]){labModel(draft);labView(null,draft);}state=imported;protectedRecord=false;engine.setVolume(state.settings.volume);persist();renderPage();notify('已导入学习记录。');}
    catch(error){notify('未导入：'+error.message);}finally{target.value='';}
  }
  if(target.id==='local-audio-file')loadAudio(target.files?.[0]);
  if(['loop-start','loop-end','audio-loop'].includes(target.id))validateLoop();
});
function loopRange() {
  const audio=document.querySelector('#local-audio'),start=Number(document.querySelector('#loop-start')?.value),end=Number(document.querySelector('#loop-end')?.value);
  const valid=Number.isFinite(audio?.duration)&&Number.isFinite(start)&&Number.isFinite(end)&&start>=0&&end>start&&end<=audio.duration;
  return {audio,start,end,valid};
}
function validateLoop() {
  const {audio,start,end,valid}=loopRange(),enabled=document.querySelector('#audio-loop')?.checked,status=document.querySelector('#audio-loop-status');
  if(status)status.textContent=!audio?.src?'先选文件，再设置起点与终点。':!valid?'片段范围无效：起点需小于终点，并处于音频时长之内。':enabled?`循环 ${start.toFixed(1)}—${end.toFixed(1)} 秒`:`片段范围 ${start.toFixed(1)}—${end.toFixed(1)} 秒；勾选后循环。`;
  if(valid&&enabled&&(audio.currentTime<start||audio.currentTime>=end))audio.currentTime=start;
  return valid;
}
function attachAudioPlayer() {
  const audio=document.querySelector('#local-audio');audio.volume=state.settings.volume;
  audio.addEventListener('play',()=>{if(!audio.isConnected)return;stopSynth();const range=loopRange();if(document.querySelector('#audio-loop').checked&&range.valid&&(audio.currentTime<range.start||audio.currentTime>=range.end))audio.currentTime=range.start;});
  audio.addEventListener('loadedmetadata',()=>{if(!audio.isConnected)return;document.querySelector('#loop-end').value=Math.min(10,audio.duration).toFixed(1);for(const id of ['loop-start','loop-end'])document.getElementById(id).max=String(audio.duration);validateLoop();});
  audio.addEventListener('timeupdate',()=>{if(!audio.isConnected)return;const range=loopRange();if(document.querySelector('#audio-loop').checked&&range.valid&&audio.currentTime>=range.end)audio.currentTime=range.start;});
  audio.addEventListener('ended',()=>{if(!audio.isConnected)return;const range=loopRange();if(document.querySelector('#audio-loop').checked&&range.valid){audio.currentTime=range.start;audio.play().catch(()=>{if(audio.isConnected)notify('请点击播放继续循环。');});}});
  audio.addEventListener('error',()=>{if(audio.isConnected&&audio.src)notify('浏览器无法解码此音频，请尝试MP3、WAV或其他支持的格式。');});
}
function loadAudio(file) {
  if(!file)return;stopAll();cleanupAudio();const audio=document.querySelector('#local-audio');
  audioUrl=URL.createObjectURL(file);audio.src=audioUrl;audio.load();document.querySelector('#audio-file-name').textContent=file.name+' · 仅在本页使用';
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){if(document.body.classList.contains('menu-open'))closeMenu(true);else stopAll();}
  if(event.key==='Tab'&&document.body.classList.contains('menu-open')){
    const focusable=[...document.querySelectorAll('.sidebar a,.sidebar button')].filter(el=>el.getClientRects().length),first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
});
window.addEventListener('hashchange',()=>renderPage({focus:true}));
window.addEventListener('pagehide',()=>{stopAll();persist();});
renderPage();persist();if(startupNotice)notify(startupNotice);
