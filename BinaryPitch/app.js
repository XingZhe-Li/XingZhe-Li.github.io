import { LEVELS, DEFAULT_CUSTOM, createRecipe, validateRecipe, generateQuestion } from './src/generators.js';
import { scoreAnswer } from './src/scoring.js';
import { noteName, isBlack, soundToken, rangeNotes } from './src/music.js';
import { PianoAudio, TIMBRES } from './src/audio.js';
import { SAMPLE_CREDITS } from './src/piano-samples.js';
import { CHORD_TYPES, NOTATION_LEVELS } from './src/notation.js';
import { createNotationUI } from './src/notation-ui.js';

const $ = selector => document.querySelector(selector);
const audio = new PianoAudio();
let settingsPreviewRequest = 0;
let notationUI;
const readStore = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const saveStore = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Training works without storage. */ } };
const storedRange = readStore('binarypitch.range', {low: 36, high: 83});
const storedTimbre = readStore('binarypitch.timbre', 'piano');
const state = {
  screen: 'catalog', filter: 'all',
  mode: readStore('binarypitch.mode','keyboard') === 'notation' ? 'notation' : 'keyboard',
  assessBass: readStore('binarypitch.notationBass',false) === true,
  notationQualities: CHORD_TYPES.map(type=>type.id),
  range: Number.isInteger(storedRange.low) && Number.isInteger(storedRange.high) && storedRange.low >= 21 && storedRange.high <= 108 && storedRange.high > storedRange.low ? storedRange : {low: 36, high: 83},
  timbre: TIMBRES.some(item => item.id === storedTimbre) ? storedTimbre : 'piano',
  history: [],
  custom: structuredClone(DEFAULT_CUSTOM), round: null,
};
audio.setTimbre(state.timbre);
const storedNotationQualities = readStore('binarypitch.notationQualities',null);
if(Array.isArray(storedNotationQualities) && storedNotationQualities.length && storedNotationQualities.every(id=>CHORD_TYPES.some(type=>type.id===id))) state.notationQualities=[...new Set(storedNotationQualities)];
const storedHistory = readStore('binarypitch.history', []);
state.history = Array.isArray(storedHistory) ? storedHistory.filter(x => x && Number.isFinite(x.average) && levelIdsSafe(x.recommended)).slice(0, 20) : [];
function levelIdsSafe(id) { return ['single','free-pair','inversion','free-three','free-four','notation-custom'].includes(id) || NOTATION_LEVELS.some(level=>level.id===id); }
const groups = {single: '单音', double: '双音', freeMulti: '自由多音', chord: '和弦', mixed: '综合'};
const levelIds = ['single', 'octave', 'interval', 'free-pair', 'triad', 'inversion', 'free-three', 'seventh', 'free-four', 'mixed'];
const subtitles = ['建立每个音的独立记忆', '听见相隔八度的两个音', '从熟悉的间隔找到两端', '让两个声音各自清晰', '辨认和弦里的每个音', '根音不总在最下方', '听见三个独立的声音', '为听觉增加一个声部', '四个音，也逐个听清', '不预告下一题的类型'];
const titles = ['单音起步', '八度双音', '常用间隔', '自由双音', '大小三和弦', '三和弦转位', '自由三音', '基本七和弦', '自由四音', '综合听辨'];
const descriptions = ['在整个键域中随机听辨一个具体音高。', '两个音相隔 12 半音，仍需准确找到各自八度。', '在 3、4、5、7、8、9 半音的间隔中练习双音。', '任意两个不同琴键，同时起音，不限制跨度。', '大三、小三和弦，原位与密集排列。', '大三、小三和弦，混合原位与两种转位。', '任意三个不同琴键，练习分离与记忆多个音高。', '属七、大七、小七和弦，原位与密集排列。', '任意四个不同琴键，挑战多声部音高记忆。', '单音、双音、自由多音、和弦各占 25%。'];
const icons = {
  play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
  grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  tune: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="var(--paper)"/><circle cx="15" cy="17" r="3" fill="var(--paper)"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>',
};
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const fmt = value => Number(value).toFixed(1);
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('visible');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => $('#toast').classList.remove('visible'), 4000);
}
function glyph(count, className = '') {
  return `<span class="note-glyph ${className}" aria-hidden="true">${Array.from({length: count}, (_, i) => `<i style="--i:${i};--n:${count}"></i>`).join('')}</span>`;
}
function shell(content) {
  notationUI?.destroyWheels();
  $('#app').innerHTML = `
    <aside class="rail">
      <a href="#" data-action="catalog" class="brand" aria-label="BinaryPitch 首页"><span class="brand-mark"><i></i><i></i><i></i></span><span>Binary<span class="brand-light">Pitch</span><small>听见每一个音</small></span></a>
      <div class="rail-label">你的听觉练习室</div>
      <nav aria-label="主导航"><button class="nav-item ${state.mode==='keyboard'?'active':''}" data-action="catalog" data-mode="keyboard">${icons.grid}琴键关卡<span>10</span></button><button class="nav-item ${state.mode==='notation'?'active':''}" data-action="catalog" data-mode="notation">${icons.grid}和弦记号<span>${NOTATION_LEVELS.length}</span></button><button class="nav-item" data-action="custom">${icons.tune}自定义练习</button></nav>
      <div class="rail-note"><span class="tiny-keyboard" aria-hidden="true">▮ ▯ ▮ ▯ ▯</span><p>从找音开始，<br>慢慢听出答案。</p><small>所有关卡自由选择<br>没有解锁门槛</small></div>
      <button class="range-control" data-action="settings" ${state.screen === 'training' ? 'disabled title="本局设置已固定，回到目录后可修改"' : ''}><span class="status-dot"></span><span>全局设置<strong>${noteName(state.range.low)} — ${noteName(state.range.high)}</strong><small class="settings-timbre">${TIMBRES.find(item => item.id === state.timbre).label}</small></span>${icons.tune}</button>
      <div class="prototype-label">LOCAL PROTOTYPE <span>0.1</span></div>
    </aside>
    <main id="main">${content}</main>`;
}
function renderCatalog() {
  if(state.mode==='notation')return notationUI.renderCatalog();
  state.screen = 'catalog';
  const latest = state.history.find(item=>(item.mode||'keyboard')==='keyboard');
  const cards = LEVELS.map((level, i) => ({...level, title: titles[i], number: i + 1, description: descriptions[i]}));
  shell(`
    <header class="topline"><span>THE LISTENING ROOM <span class="slash">/</span> 练习目录</span><span class="pill">琴键模式 <span class="status-dot"></span></span></header>
    <section class="catalog-hero">
      <div class="hero-copy"><div class="eyebrow">一点点，把声音变成熟悉的名字。</div><h1>练习听见，<br>每一个音。</h1><p>从单音到和弦，在黑白键之间建立音高记忆。<br>可以试听、可以找音，也可以直接给出你的答案。</p><button class="button primary" data-action="start" data-level="${latest?.recommended || 'single'}">${icons.play}${latest ? '开始推荐练习' : '从单音开始'}</button><span class="hero-footnote">每局 10 题 · 所有关卡开放</span></div>
      <div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="art-label">LISTEN. FIND. REMEMBER.</div><div class="art-notes">${glyph(1)}${glyph(2)}${glyph(3)}</div><div class="art-keyboard">${Array.from({length: 12}, (_, i) => `<i class="art-white ${[0,1,3,4,5,7,8,10,11].includes(i) ? 'has-black' : ''} ${i === 5 ? 'art-hit' : ''}"></i>`).join('')}</div><div class="art-caption"><span>A little closer, every time.</span><span>01 — ∞</span></div></div>
    </section>
    <section class="catalog-section" aria-labelledby="catalog-title"><div class="section-heading"><div><span class="eyebrow">CHOOSE YOUR PRACTICE</span><h2 id="catalog-title">今天，想听见什么？</h2></div>${latest ? `<div class="last-score"><span>上次听力分</span><strong>${fmt(latest.average)}</strong><small>试用局分</small></div>` : '<p class="section-side">按自己的节奏选择，无需依次通关。</p>'}</div>
      <div class="filters" role="group" aria-label="关卡分类">${[['all','全部关卡'],['single','单音'],['double','双音'],['chord','和弦'],['freeMulti','自由多音'],['mixed','综合']].map(([id,title])=>`<button data-action="filter" data-filter="${id}" class="filter ${state.filter === id ? 'selected' : ''}" aria-pressed="${state.filter === id}">${title}</button>`).join('')}</div>
      <div class="level-grid">${cards.filter(level => state.filter === 'all' || level.category === state.filter).map(level => `<button class="level-card" data-action="start" data-level="${level.id}"><div class="card-top"><span class="level-no">${String(level.number).padStart(2,'0')}</span><span class="card-tag">${groups[level.category] || '综合'}</span></div>${glyph(level.number === 1 ? 1 : level.number <= 4 ? 2 : [5,6,7].includes(level.number) ? 3 : 4)}<h3>${level.title}</h3><p>${level.description}</p><div class="card-bottom"><span>10 题 / 一局</span>${icons.arrow}</div></button>`).join('')}
      <button class="level-card custom-card" data-action="custom"><div class="card-top"><span class="level-no">＋</span><span class="card-tag">自由配置</span></div><div class="custom-lines" aria-hidden="true"><i></i><i></i><i></i></div><h3>你的专属练习</h3><p>选择题型、间隔和和弦，让下一局由你定义。</p><div class="card-bottom"><span>自定义关卡</span>${icons.arrow}</div></button></div>
    </section>
    <footer class="page-footer"><span>音高记忆，从每一次认真聆听开始。</span><span>支持真实钢琴采样 · 和弦记号模式已开放</span></footer>`);
}
function levelMeta(id) {
  const i = levelIds.indexOf(id);
  return i < 0 ? {id: 'custom', title: '自定义练习', number: '＋', subtitle: '按你的配方，练习自己的声音'} : {id, title: titles[i], number: String(i+1).padStart(2, '0'), subtitle: subtitles[i]};
}
function startRound(id, custom = state.custom) {
  const recipe = createRecipe(id, custom);
  const errors = validateRecipe(recipe, state.range);
  if (errors.length) { toast(errors.join('；')); return false; }
  state.mode='keyboard';
  audio.setTimbre(state.timbre);
  state.round = {mode:'keyboard',level: levelMeta(id), recipe: structuredClone(recipe), range: {...state.range}, timbre: state.timbre, results: [], index: 0, previous: [], audioReady: state.timbre !== 'sampledPiano', loadingAudio: false, audioError: false};
  nextQuestion();
  if (!state.round.audioReady) prepareRoundAudio(state.round);
  return true;
}
async function prepareRoundAudio(r) {
  if (r.loadingAudio) return;
  r.loadingAudio = true; r.audioReady = false; r.audioError = false;
  updateSelection();
  try {
    await audio.prepare(r.range);
    if (state.round !== r || state.screen !== 'training') return;
    r.audioReady = true;
  } catch {
    if (state.round !== r || state.screen !== 'training') return;
    r.audioError = true;
  } finally {
    r.loadingAudio = false;
    if (state.round === r && state.screen === 'training') updateSelection();
  }
}
function nextQuestion() {
  if(state.round.mode==='notation')return notationUI.newQuestion();
  const r = state.round;
  audio.stop();
  r.question = generateQuestion(r.recipe, r.range, r.previous);
  r.previous = [...r.question.notes]; r.selected = new Set(); r.auditions = new Set();
  r.revealed = false; r.heard = false; r.result = null; r.pendingAuditions = 0;
  state.screen = 'training'; renderTraining();
  window.scrollTo({top: 0, behavior: 'instant'});
}
function keyboardHTML() {
  const r = state.round;
  let low = r.range.low, high = r.range.high;
  if (isBlack(low)) low--; if (isBlack(high)) high++;
  const notes = rangeNotes({low, high});
  const whites = notes.filter(n => !isBlack(n));
  let seenWhites = 0;
  return `<div class="keyboard-scroll"><div class="piano" style="--white-count:${whites.length}" role="group" aria-label="钢琴键盘 ${noteName(r.range.low)}至${noteName(r.range.high)}">${notes.map(note => {
    const black = isBlack(note);
    const index = black ? seenWhites - .31 : seenWhites++;
    const inRange = note >= r.range.low && note <= r.range.high;
    return `<button type="button" class="piano-key ${black ? 'black' : 'white'} ${inRange ? '' : 'outside'}" style="--key-index:${index}" data-note="${note}" ${inRange ? '' : 'disabled'} aria-label="${noteName(note)}，未选择" aria-pressed="false"><span class="key-state"></span><span class="key-name ${note % 12 === 0 ? 'c-note' : ''}">${noteName(note)}</span>${note === 60 ? '<span class="middle-c">中央 C</span>' : ''}</button>`;
  }).join('')}</div></div>`;
}
function renderTraining() {
  if(state.round.mode==='notation')return notationUI.renderTraining();
  const r = state.round;
  shell(`<header class="topline"><button class="text-button" data-action="leave">${icons.back}返回目录</button><span>琴键模式 <span class="slash">/</span> ${noteName(r.range.low)}—${noteName(r.range.high)} · ${r.range.high-r.range.low+1} 键</span></header>
    <section class="practice-heading"><div><div class="eyebrow">PRACTICE ${r.level.number}</div><h1>${r.level.title}</h1><p>${r.level.subtitle}</p></div><div class="round-progress"><span>本局进度 <strong>${r.index+1}<i>/ 10</i></strong></span><div class="progress-dots">${Array.from({length:10},(_,i)=>`<i class="${i < r.index ? 'done' : i === r.index ? 'current' : ''}"></i>`).join('')}</div></div></section>
    <section class="listening-panel"><div class="listen-graphic" aria-hidden="true">${Array.from({length:15},(_,i)=>`<i style="--h:${[12,22,34,19,44,30,51,64,39,54,28,42,25,17,10][i]}px;--i:${i}"></i>`).join('')}</div><div class="listen-copy"><span class="eyebrow">LISTEN CLOSELY</span><h2 id="target-prompt">先听一听题目</h2><p>找到所有实际发声的琴键，八度也要一致。</p></div><button class="button dark" id="replay-target" data-action="target">${icons.play}<span>播放题目</span></button><span class="free-replay">可重复播放 · 不计试听量</span></section>
    <section class="instrument-panel"><div class="instrument-heading"><div><h2>在琴键上找到答案</h2><p>单击试听并切换选中状态，组合试听请使用下方按钮。</p></div><div class="audition-meter"><span>不同试听声音</span><strong id="audition-count">0</strong><button class="info-tip" aria-label="试听计数说明" title="同一精确音高集合只计一次；一种组合也计一个单位。题目重放不计。">?</button></div></div>${keyboardHTML()}<div class="keyboard-caption"><span>点击 = 试听单音 ＋ 切换选择</span><span>← 可横向滚动查看完整键域 →</span></div>
      <div class="answer-bar"><div class="selection-group"><span class="label">我的选择 <b id="selected-count">0</b></span><div id="selected-notes" class="selected-notes"><span class="empty-selection">还没有选择琴键</span></div></div><div class="answer-actions"><button class="button secondary" id="play-selected" data-action="selected" disabled>${icons.play}播放所选</button><button class="text-button" id="clear-selected" data-action="clear" disabled>清空</button><button class="button primary" id="submit-answer" data-action="submit" disabled>提交答案 ${icons.arrow}</button></div></div>
    </section><div class="audio-status" role="status" aria-live="polite"><span id="audio-status-text"></span><button class="text-button" data-action="retry-audio" id="retry-audio" hidden>重新加载采样 ${icons.arrow}</button></div><section id="feedback" class="feedback" aria-live="polite"></section><div class="practice-footnote"><span>不计时。先听、寻找，再慢慢减少对试听的依赖。</span><span>每种单音 / 组合仅记录一次</span></div>`);
  updateSelection();
}
function updateSelection() {
  if(state.round?.mode==='notation')return notationUI.updateSelection();
  const r = state.round; if (state.screen !== 'training') return;
  const selected = [...r.selected].sort((a,b)=>a-b);
  $('#selected-count').textContent = selected.length;
  $('#selected-notes').innerHTML = selected.length ? selected.map(n=>`<span class="note-chip">${noteName(n)}</span>`).join('') : '<span class="empty-selection">还没有选择琴键</span>';
  $('#audition-count').textContent = r.auditions.size;
  $('#play-selected').disabled = !r.audioReady || !selected.length;
  $('#clear-selected').disabled = !r.audioReady || r.revealed || !selected.length;
  $('#submit-answer').disabled = !r.audioReady || r.revealed || !r.heard || r.pendingAuditions > 0;
  $('#replay-target').disabled = !r.audioReady;
  $('#retry-audio').hidden = !r.audioError;
  $('#audio-status-text').textContent = r.loadingAudio ? '正在加载本局键域的真实钢琴采样，完成后即可开始。' : r.audioError ? '钢琴采样加载失败，请重试；也可返回目录选择其他音色。' : `本局音色：${TIMBRES.find(item => item.id === r.timbre).label}${r.timbre === 'sampledPiano' ? ' · 采样已就绪' : ''}`;
  for (const key of document.querySelectorAll('.piano-key:not(.outside)')) {
    key.disabled = !r.audioReady;
    const note = Number(key.dataset.note);
    const chosen = r.selected.has(note), target = r.question.notes.includes(note);
    key.classList.toggle('selected', chosen && !r.revealed);
    key.classList.toggle('correct', r.revealed && chosen && target);
    key.classList.toggle('missed', r.revealed && !chosen && target);
    key.classList.toggle('wrong', r.revealed && chosen && !target);
    key.setAttribute('aria-pressed', String(chosen));
    key.setAttribute('aria-label', `${noteName(note)}，${r.revealed ? (target ? (chosen ? '正确' : '漏选') : chosen ? '错选' : '未选择') : chosen ? '已选择' : '未选择'}`);
    key.querySelector('.key-state').textContent = r.revealed ? (target ? chosen ? '✓' : '＋' : chosen ? '×' : '') : chosen ? '•' : '';
  }
}
async function play(notes, {count = false, sequence = false} = {}) {
  if (!notes.length || !state.round.audioReady) return;
  const r = state.round, question = r.question;
  const shouldCount = count && !r.revealed;
  if (shouldCount) { r.pendingAuditions++; updateSelection(); }
  try {
    const played = await audio.play(notes, {sequence});
    if (played && shouldCount && state.round === r && r.question === question && !r.revealed) r.auditions.add(soundToken(notes));
  } catch { toast(r.timbre === 'sampledPiano' ? '真实钢琴播放失败，请重试或返回目录重新选择音色。' : '声音未能启动，请确认浏览器允许播放音频后再试。'); }
  finally {
    if (shouldCount && r.question === question) r.pendingAuditions--;
    if (state.round === r && r.question === question) updateSelection();
  }
}
async function playTarget() {
  const r = state.round, question = r.question;
  if (!r.audioReady) return;
  try {
    const played = await audio.play(question.notes);
    if (!played || state.round !== r || r.question !== question || state.screen !== 'training') return;
    r.heard = true; $('#replay-target span').textContent = '重放题目';
    $('#target-prompt').textContent = r.revealed ? '再听一次答案' : '听见了什么？'; updateSelection();
    $('.listen-graphic').classList.remove('playing'); void $('.listen-graphic').offsetWidth; $('.listen-graphic').classList.add('playing');
  } catch { toast(r.timbre === 'sampledPiano' ? '真实钢琴播放失败，请重试或返回目录重新选择音色。' : '声音未能启动，请重试或检查浏览器音频权限。'); }
}
function submit() {
  if(state.round?.mode==='notation')return notationUI.submit();
  const r = state.round; if (!r.audioReady || r.revealed || !r.heard || r.pendingAuditions > 0) return;
  r.result = scoreAnswer({keyCount: r.range.high-r.range.low+1, target: r.question.notes, answer: [...r.selected], auditionCount: r.auditions.size});
  r.revealed = true;
  r.results.push({...r.result, target: [...r.question.notes], answer: [...r.selected], label: r.question.label});
  const s = r.result;
  const perfect = s.correctCount === s.targetCount && s.wrongCount === 0;
  const noteList = notes => notes.length ? notes.map(n=>`<span class="note-chip">${noteName(n)}</span>`).join('') : '<span class="muted">无</span>';
  $('#feedback').innerHTML = `<div class="feedback-main"><div class="score-block"><span class="eyebrow">THIS QUESTION</span><strong>${fmt(s.score)}<small>分</small></strong><span>${perfect ? '所有音高都找到了' : s.correctCount ? '已有一些声音被你听见' : '再听一次，建立新的记忆'}</span></div><div class="feedback-detail"><h3>${escape(r.question.label || '答案已揭晓')}</h3><div class="feedback-notes"><div><span class="legend correct-label">✓ 正确 ${s.correctCount}</span>${noteList(r.question.notes.filter(n=>r.selected.has(n)))}</div><div><span class="legend missed-label">＋ 漏选 ${s.missedCount}</span>${noteList(r.question.notes.filter(n=>!r.selected.has(n)))}</div><div><span class="legend wrong-label">× 错选 ${s.wrongCount}</span>${noteList([...r.selected].filter(n=>!r.question.notes.includes(n)))}</div></div><p class="score-equation">答案分 <b>${fmt(s.answerScore)}</b><span>×</span>试听系数 <b>${s.auditionFactor.toFixed(3)}</b><span>=</span><b>${fmt(s.score)}</b></p></div></div><div class="feedback-bottom"><button class="button secondary" data-action="learn">${icons.play}整体 → 分音 → 整体</button><span>提交后自由试听，分数已冻结。</span><button class="button primary" data-action="next">${r.index === 9 ? '查看本局结果' : '下一题'} ${icons.arrow}</button></div>`;
  $('#feedback').classList.add('visible'); $('#submit-answer').hidden = true;
  updateSelection();
}
function recommendation(average) {
  return average >= 265 ? 'free-four' : average >= 205 ? 'free-three' : average >= 145 ? 'inversion' : average >= 85 ? 'free-pair' : 'single';
}
function finishRound() {
  if(state.round.mode==='notation')return notationUI.finishRound();
  audio.stop();
  const r = state.round;
  const average = r.results.reduce((sum,x)=>sum+x.score,0)/r.results.length;
  const recommended = recommendation(average);
  state.history.unshift({mode:'keyboard',average, recommended, level: r.level.id, date: Date.now()});
  state.history = state.history.slice(0,20); saveStore('binarypitch.history',state.history);
  state.screen = 'results'; renderResults(average, recommended);
  window.scrollTo({top:0,behavior:'instant'});
}
function renderResults(average, recommended) {
  if(state.round.mode==='notation')return notationUI.renderResults();
  const r = state.round, next = levelMeta(recommended);
  const perfect = r.results.filter(s=>s.correctCount===s.targetCount && s.wrongCount===0).length;
  shell(`<header class="topline"><button class="text-button" data-action="catalog">${icons.back}返回目录</button><span>ROUND COMPLETE <span class="slash">/</span> ${r.level.title}</span></header><section class="result-hero"><span class="eyebrow">每一次认真聆听，都在积累。</span><h1>这一局，听见了。</h1><div class="result-score"><strong>${fmt(average)}</strong><span>本局听力分<small>10 题算术平均 · 试用规则</small></span></div><div class="result-stats"><span><b>${perfect} / 10</b> 完全正确</span><span><b>${r.results.reduce((sum,x)=>sum+x.correctCount,0)}</b> 个音准确识别</span><span><b>${noteName(r.range.low)}–${noteName(r.range.high)}</b> 本局键域</span></div></section><section class="recommendation"><div>${glyph(recommended==='single'?1:recommended==='free-pair'?2:recommended==='free-four'?4:3)}<div><span class="eyebrow">NEXT PRACTICE · 试用推荐</span><h2>${next.title}</h2><p>根据本局统一听力分推荐。你也可以继续当前关卡。</p></div></div><button class="button primary" data-action="start" data-level="${recommended}">练习这一关 ${icons.arrow}</button></section><section class="results-detail"><div class="section-heading"><h2>本局的 10 次聆听</h2><button class="button secondary" data-action="restart">再练一局 ${icons.arrow}</button></div><div class="result-table-wrap"><table class="result-table"><thead><tr><th>题目</th><th>目标音高</th><th>识别情况</th><th>试听量</th><th>得分</th></tr></thead><tbody>${r.results.map((s,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td class="mono">${s.target.map(noteName).join(' · ')}</td><td>${s.correctCount} 正确 · ${s.missedCount} 漏选 · ${s.wrongCount} 错选</td><td>${s.auditionCount}</td><td><strong>${fmt(s.score)}</strong></td></tr>`).join('')}</tbody></table></div><p class="trial-note">原型暂用均分 85 / 145 / 205 / 265 作为推荐分界，不限制自由选关；长期局分与推荐规则尚待定稿。</p></section>`);
}
function optionsHTML(current, low = 21, high = 108) {
  return Array.from({length: high-low+1},(_,i)=>`<option value="${low+i}" ${current===low+i?'selected':''}>${noteName(low+i)}</option>`).join('');
}
function openSettings() {
  if (state.screen === 'training') return;
  const timbre = TIMBRES.find(item => item.id === state.timbre);
  $('#settings-dialog').innerHTML = `<form id="settings-form">
    <div class="dialog-heading"><div><span class="eyebrow">GLOBAL SETTINGS</span><h2 id="settings-title">设置你的练习室</h2></div><button type="button" class="close-button" data-close="settings-dialog" aria-label="关闭">×</button></div>
    <p class="dialog-intro">所有预设与自定义关卡共用键域和音色。保存后从下一局生效。</p>
    <fieldset class="timbre-settings"><legend>音色</legend>
      <div class="timbre-controls"><label for="timbre-select" class="sr-only">练习音色</label><select id="timbre-select" name="timbre">${TIMBRES.map(item => `<option value="${item.id}" ${item.id === state.timbre ? 'selected' : ''}>${item.label}</option>`).join('')}</select><button type="button" class="button secondary" data-action="preview-timbre">${icons.play}试听音色</button></div>
      <p class="timbre-description" id="timbre-description">${timbre.description}</p>
      <p class="sample-credits" id="sample-credits" ${state.timbre === 'sampledPiano' ? '' : 'hidden'}>录音：<a href="${SAMPLE_CREDITS.sourceUrl}" target="_blank" rel="noopener">Alexander Holm · Salamander</a> · <a href="${SAMPLE_CREDITS.licenseUrl}" target="_blank" rel="noopener">CC BY 3.0</a></p>
      <p id="timbre-preview-status" class="timbre-preview-status" role="status" aria-live="polite"></p><p class="form-hint">试听 C4 · E4 · G4，不计入练习。真实钢琴使用录音采样，其余为合成音色。</p>
    </fieldset>
    <fieldset><legend>琴键范围</legend><div class="range-preview"><span id="range-display">${noteName(state.range.low)} — ${noteName(state.range.high)}</span><b id="range-count">${state.range.high-state.range.low+1} 键</b></div>
      <div class="form-row"><label>最低音<select name="low">${optionsHTML(state.range.low)}</select></label><label>最高音<select name="high">${optionsHTML(state.range.high)}</select></label></div><button type="button" class="text-button" data-action="reset-range">恢复默认 C2 — B5（48 键）</button><p class="form-hint">中央 C = C4。评分参照固定为 48 键单音 100 分。</p>
    </fieldset>
    <p class="form-error" id="range-error" role="alert"></p><div class="dialog-footer"><button type="button" class="button secondary" data-close="settings-dialog">取消</button><button class="button primary" type="submit">保存设置 ${icons.arrow}</button></div>
  </form>`;
  $('#settings-dialog').showModal();
}
async function previewTimbre() {
  const form = $('#settings-form');
  if (!form || !$('#settings-dialog').open) return;
  const request = ++settingsPreviewRequest;
  const id = form.elements.timbre.value;
  const button = form.querySelector('[data-action="preview-timbre"]');
  button.disabled = true;
  $('#timbre-preview-status').textContent = id === 'sampledPiano' ? '正在加载真实钢琴采样…' : '';
  try {
    audio.setTimbre(id);
    const played = await audio.play([60, 64, 67]);
    if (request === settingsPreviewRequest && $('#settings-dialog').open) $('#timbre-preview-status').textContent = played ? '正在试听，保存后从下一局生效。' : '';
  } catch {
    if (request === settingsPreviewRequest && $('#settings-dialog').open) $('#timbre-preview-status').textContent = id === 'sampledPiano' ? '采样加载失败，可再次点击试听重试。' : '声音未能启动，请重试或检查浏览器音频权限。';
  } finally {
    if (request === settingsPreviewRequest && $('#settings-dialog').open) button.disabled = false;
  }
}
$('#settings-dialog').addEventListener('close', () => { settingsPreviewRequest++; audio.setTimbre(state.timbre); });
const checks = (name, options, selected) => options.map(([value,label])=>`<label class="check-chip"><input type="checkbox" name="${name}" value="${value}" ${selected.includes(value)?'checked':''}><span>${label}</span></label>`).join('');
function openCustom() {
  if(state.mode==='notation')return notationUI.openCustom();
  if (state.screen === 'training') { toast('请先结束当前练习，再配置下一局。'); return; }
  const c = state.custom;
  $('#custom-dialog').innerHTML = `<form id="custom-form"><div class="dialog-heading"><div><span class="eyebrow">MAKE IT YOURS</span><h2 id="custom-title">定制你的下一局</h2></div><button type="button" class="close-button" data-close="custom-dialog" aria-label="关闭">×</button></div><p class="dialog-intro">先等概率抽取启用的大类，再在类内等概率抽取模式与参数。每局 10 题。</p><fieldset><legend>01 · 参与的题型大类</legend><div class="check-group">${checks('categories',[['single','单音'],['double','双音'],['freeMulti','自由多音'],['chord','和弦']],c.categories)}</div></fieldset><fieldset data-category="double"><legend>02 · 双音</legend><div class="check-group">${checks('doubleModes',[['octave','八度双音'],['interval','指定间隔'],['free','自由双音']],c.doubleModes)}</div><label class="sub-label">指定间隔（半音）</label><div class="check-group small-checks">${checks('intervals',Array.from({length:12},(_,i)=>[i+1,String(i+1)]),c.intervals)}</div></fieldset><fieldset data-category="freeMulti"><legend>03 · 自由多音</legend><div class="check-group">${checks('counts',[[3,'三音'],[4,'四音'],[5,'五音']],c.counts)}</div></fieldset><fieldset data-category="chord"><legend>04 · 和弦</legend><div class="check-group">${checks('chordModes',[['rootTriad','原位三和弦'],['invertedTriad','三和弦转位'],['rootSeventh','原位七和弦']],c.chordModes)}</div><label class="sub-label">三和弦性质</label><div class="check-group">${checks('triadQualities',[['major','大三'],['minor','小三']],c.triadQualities)}</div><label class="sub-label">转位模式中的排列</label><div class="check-group">${checks('inversions',[[0,'原位'],[1,'第一转位'],[2,'第二转位']],c.inversions)}</div><label class="sub-label">七和弦性质</label><div class="check-group">${checks('seventhQualities',[['dominant7','属七'],['major7','大七'],['minor7','小七']],c.seventhQualities)}</div></fieldset><div class="form-row"><label>最大跨度（全局约束）<select name="maxSpan">${[[0,'不限制'],[12,'12 半音 / 一个八度'],[19,'19 半音'],[24,'24 半音 / 两个八度']].map(([v,l])=>`<option value="${v}" ${(c.maxSpan||0)===v?'selected':''}>${l}</option>`).join('')}</select></label><div class="custom-range"><span>当前全局键域</span><strong>${noteName(state.range.low)} — ${noteName(state.range.high)}</strong><small>可在目录的键域设置中修改</small></div></div><p class="form-hint">提交前不显示题型或目标音数。无解的配置会在开局前提示，不会删音或改变八度。</p><p id="custom-error" class="form-error" role="alert"></p><div class="dialog-footer"><button type="button" class="button secondary" data-close="custom-dialog">取消</button><button class="button primary" type="submit">开始自定义练习 ${icons.arrow}</button></div></form>`;
  updateCustomFields(); $('#custom-dialog').showModal();
}
function updateCustomFields() {
  const form = $('#custom-form');
  const categories = [...form.querySelectorAll('[name="categories"]:checked')].map(x=>x.value);
  for (const fieldset of form.querySelectorAll('[data-category]')) {
    fieldset.disabled = !categories.includes(fieldset.dataset.category);
  }
}
function leave() {
  if (state.screen === 'training' && !state.round.revealed) {
    toast('已返回目录；未完成的本局不会计入记录。');
  }
  audio.stop(); renderCatalog();
}
document.addEventListener('click', event => {
  const key = event.target.closest('[data-note]');
  if (key && !key.disabled) {
    const r=state.round, note=Number(key.dataset.note);
    if (!r.revealed) { r.selected.has(note) ? r.selected.delete(note) : r.selected.add(note); updateSelection(); }
    play([note], {count: !r.revealed}); return;
  }
  const close = event.target.closest('[data-close]'); if (close) { document.getElementById(close.dataset.close).close(); return; }
  const button = event.target.closest('[data-action]'); if (!button || button.disabled) return;
  event.preventDefault();
  const action = button.dataset.action, r=state.round;
  if(notationUI.handleAction(action,button))return;
  if (action === 'catalog' || action === 'leave') {
    if(button.dataset.mode){state.mode=button.dataset.mode;saveStore('binarypitch.mode',state.mode);}
    leave();
  }
  if (action === 'start') startRound(button.dataset.level);
  if (action === 'filter') {state.filter=button.dataset.filter;renderCatalog();}
  if (action === 'settings') openSettings();
  if (action === 'preview-timbre') previewTimbre();
  if (action === 'retry-audio') prepareRoundAudio(r);
  if (action === 'custom') openCustom();
  if (action === 'target') playTarget();
  if (action === 'selected') play([...r.selected].sort((a,b)=>a-b),{count:!r.revealed});
  if (action === 'clear' && !r.revealed) {r.selected.clear();updateSelection();}
  if (action === 'submit') submit();
  if (action === 'learn') play(r.question.notes,{sequence:true});
  if (action === 'next') {if (r.index === 9) finishRound(); else {r.index++; nextQuestion();}}
  if (action === 'restart') startRound(r.level.id, state.custom);
  if (action === 'reset-range') { const form=$('#settings-form'); form.low.value='36';form.high.value='83';form.dispatchEvent(new Event('change',{bubbles:true})); }
});
document.addEventListener('change', event => {
  notationUI.handleChange(event);
  if (event.target.closest('#custom-form')) updateCustomFields();
  const form=event.target.closest('#settings-form');
  if (form) {
    if (event.target.name === 'timbre') {
      settingsPreviewRequest++;
      audio.stop();
      $('#timbre-description').textContent = TIMBRES.find(item => item.id === form.elements.timbre.value).description;
      $('#sample-credits').hidden = form.elements.timbre.value !== 'sampledPiano';
      $('#timbre-preview-status').textContent = '';
      form.querySelector('[data-action="preview-timbre"]').disabled = false;
    }
    const low=Number(form.low.value), high=Number(form.high.value);
    $('#range-display').textContent=`${noteName(low)} — ${noteName(high)}`;
    $('#range-count').textContent=`${Math.max(0,high-low+1)} 键`;
  }
});
document.addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target;
  if(notationUI.handleSubmit(form))return;
  if (form.id==='settings-form') {
    const low=Number(form.low.value), high=Number(form.high.value);
    if (low>=high) {$('#range-error').textContent='最高音需要高于最低音，键域至少包含两个琴键。';return;}
    state.range={low,high};state.timbre=form.elements.timbre.value;
    saveStore('binarypitch.range',state.range);saveStore('binarypitch.timbre',state.timbre);
    audio.setTimbre(state.timbre);$('#settings-dialog').close();
    if(state.screen==='catalog') renderCatalog(); else renderResults(state.history[0].average,state.history[0].recommended);
    toast('全局设置已保存，新一局将使用所选键域和音色。');
  }
  if(form.id==='custom-form') {
    const values = (name, numeric=false) => [...form.querySelectorAll(`[name="${name}"]:checked`)].map(x=>numeric?Number(x.value):x.value);
    const custom=Object.fromEntries(['categories','doubleModes','intervals','counts','chordModes','triadQualities','inversions','seventhQualities'].map(name=>[name,values(name,['intervals','counts','inversions'].includes(name))]));
    custom.maxSpan=Number(form.maxSpan.value)||null;
    const errors=validateRecipe(createRecipe('custom',custom),state.range);
    if(errors.length) {$('#custom-error').textContent=errors.join('；');return;}
    state.custom=custom;$('#custom-dialog').close(); startRound('custom', custom);
  }
});
notationUI=createNotationUI({state,audio,shell,toast,icons,glyph,saveStore,play,nextQuestion,prepareRoundAudio});
renderCatalog();
