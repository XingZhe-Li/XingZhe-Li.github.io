import { CHORD_TYPES, CHORD_FAMILIES, NOTATION_LEVELS, createNotationSpace, generateNotationQuestion, notationVoicing, chordSymbol } from './notation.js';
import { scoreNotationAnswer } from './notation-scoring.js';
import { noteName } from './music.js';
import { TIMBRES } from './audio.js';
import { createWheel } from './wheel.js';

const ROOT_LABELS = ['C','C♯','D','E♭','E','F','F♯','G','A♭','A','B♭','B'];
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = value => Number(value).toFixed(1);
const CARD_SYMBOLS = {'notation-triads':'Cm','notation-sevenths':'Cmaj7','notation-suspended':'Csus4','notation-sixth':'C6','notation-extended':'Cmaj9','notation-altered':'C7♭9','notation-mixed':'C13'};

export function createNotationUI({state, audio, shell, toast, icons, glyph, saveStore, play, nextQuestion, prepareRoundAudio}) {
  const $ = selector => document.querySelector(selector);
  let wheels = {};
  const isNotation = () => state.round?.mode === 'notation';
  const destroyWheels = () => { Object.values(wheels).forEach(wheel=>wheel.destroy()); wheels = {}; };
  const choices = ids => CHORD_TYPES.filter(type=>ids.includes(type.id));
  const labelFor = answer => Number.isInteger(answer.root) && answer.quality ? chordSymbol(answer.root,answer.quality) : '等待你的选择';
  const resultSymbols = result => [...new Set([chordSymbol(result.target.root,result.target.quality),...(result.equivalents||[]).map(answer=>chordSymbol(answer.root,answer.quality))])].map(escape).join(' ≡ ');
  function renderCatalog() {
    state.screen='catalog';
    const latest=state.history.find(item=>item.mode==='notation' && item.assessBass===state.assessBass);
    shell(`<header class="topline"><span>THE LISTENING ROOM <span class="slash">/</span> 和弦记号</span><span class="pill">滚轮作答 <span class="status-dot"></span></span></header>
      <section class="notation-hero"><div><span class="eyebrow">A NAME FOR WHAT YOU HEAR</span><h1>给声音，<br>一个名字。</h1><p>选择音级与和弦类型，把听见的声音组合成一个记号。<br>需要时，再准确辨认最下面的那个音。</p><button class="button primary" data-action="notation-start" data-level="notation-triads">${icons.play}开始大小三和弦</button></div><div class="symbol-art" aria-hidden="true"><span>ROOT + QUALITY</span><strong>C<span>7</span></strong><div><i>C</i><b>＋</b><i>7</i><b>＝</b><em>C7</em></div><small>Listen to the whole. Name what you hear.</small></div></section>
      <section class="notation-mode-panel"><div><h2>本局的作答要求</h2><p>音级与类型始终需要作答；开启后，最低音还要精确到八度。</p></div><label class="bass-toggle"><input type="checkbox" id="notation-bass-toggle" ${state.assessBass?'checked':''}><span class="toggle-track"></span><span>判断具体最低音<small>${state.assessBass?'三个滚轮 · 例如 C7，最低音 E3':'两个滚轮 · 例如 C ＋ 7'}</small></span></label></section>
      <section class="catalog-section"><div class="section-heading"><div><span class="eyebrow">CHORD PRACTICE</span><h2>听见和弦的名字</h2></div>${latest?`<div class="last-score"><span>上次记号听力分</span><strong>${fmt(latest.average)}</strong><small>试用局分</small></div>`:'<p class="section-side">每局 10 题 · 任意选择</p>'}</div><div class="level-grid notation-level-grid">${NOTATION_LEVELS.map((level,i)=>`<button class="level-card" data-action="notation-start" data-level="${level.id}"><div class="card-top"><span class="level-no">C${i+1}</span><span class="card-tag">${state.assessBass?'名称 ＋ 最低音':'和弦名称'}</span></div><div class="card-symbol">${CARD_SYMBOLS[level.id]||'C'}</div><h3>${level.title}</h3><p>${level.description}</p><div class="card-bottom"><span>10 题 / 一局</span>${icons.arrow}</div></button>`).join('')}<button class="level-card custom-card" data-action="custom"><div class="card-top"><span class="level-no">＋</span><span class="card-tag">自由配置</span></div><div class="card-symbol">?</div><h3>自定义和弦</h3><p>选择参与出题的和弦类型，以及是否判断具体最低音。</p><div class="card-bottom"><span>自定义关卡</span>${icons.arrow}</div></button></div></section>
      <footer class="page-footer"><span>滚轮选择不发声，点击试听才记录声音。</span><span>${CHORD_TYPES.length} 种类型 · 同一全局键域与音色</span></footer>`);
  }
  function start(id, config = {}) {
    const preset=NOTATION_LEVELS.find(level=>level.id===id);
    if (!preset && id!=='notation-custom') {toast('未找到这个和弦关卡。');return false;}
    const qualities=config.qualities || preset?.qualities || state.notationQualities;
    const assessBass=config.assessBass ?? state.assessBass;
    let space;
    try {space=createNotationSpace({range:state.range,qualities,assessBass});} catch(error) {toast(error.message);return false;}
    state.mode='notation';audio.setTimbre(state.timbre);
    state.round={mode:'notation',level:preset?{...preset,number:`C${NOTATION_LEVELS.indexOf(preset)+1}`}:{id,title:'自定义和弦',number:'＋',subtitle:'按自己的配方，辨认和弦'},space,notationConfig:{qualities:[...space.qualities],assessBass},range:{...state.range},timbre:state.timbre,results:[],index:0,previous:[],audioReady:state.timbre!=='sampledPiano',loadingAudio:false,audioError:false};
    nextQuestion();if(!state.round.audioReady)prepareRoundAudio(state.round);return true;
  }
  function newQuestion() {
    const r=state.round;audio.stop();
    r.question=generateNotationQuestion(r.space,r.previous);r.previous=[...r.question.notes];
    r.answer={root:null,quality:null,bass:null};r.previewBass=null;r.revealed=false;r.heard=false;r.result=null;r.auditions=new Set();r.pendingAuditions=0;
    state.screen='training';renderTraining();window.scrollTo({top:0,behavior:'instant'});
  }
  function bassOptions() {
    const r=state.round,a=r.answer;
    if(!Number.isInteger(a.root)||!a.quality)return [];
    if(r.space.assessBass)return r.space.bassOptions[`${a.root}:${a.quality}`] || [];
    const type=CHORD_TYPES.find(type=>type.id===a.quality);
    return Array.from({length:r.range.high-r.range.low+1},(_,i)=>r.range.low+i).filter(note=>type.intervals.some(interval=>interval%12===(note%12-a.root+12)%12));
  }
  function candidateNotes() {
    const r=state.round,a=r.answer;
    if(r.space.assessBass && !Number.isInteger(a.bass))return null;
    return notationVoicing(a,r.range,r.space.assessBass?{}:{previewBass:r.previewBass});
  }
  function answerComplete() {
    const r=state.round,a=r.answer;
    return Number.isInteger(a.root)&&Boolean(a.quality)&&(!r.space.assessBass||Number.isInteger(a.bass));
  }
  function rebuildBass() {
    const r=state.round,options=bassOptions();
    if(r.space.assessBass) {
      if(!options.includes(r.answer.bass))r.answer.bass=null;
      wheels.bass.setItems(options.map(note=>({value:note,label:noteName(note)})),r.answer.bass);
    } else {
      if(!options.includes(r.previewBass)) {
        const notes=notationVoicing(r.answer,r.range);r.previewBass=notes?.[0]??null;
      }
      const select=$('#notation-preview-bass');
      select.innerHTML=options.length?options.map(note=>`<option value="${note}" ${note===r.previewBass?'selected':''}>${noteName(note)}</option>`).join(''):'<option value="">先选择和弦</option>';
      select.disabled=r.revealed||!options.length;
    }
  }
  function changeField(field,value) {
    const r=state.round;if(r.revealed)return;
    r.answer[field]=value;
    if(field!=='bass')rebuildBass();updateSelection();
  }
  function renderTraining() {
    const r=state.round,N=r.space.effectiveCandidateCount??r.space.candidateCount,K=Math.ceil(Math.log2(N+1));
    shell(`<header class="topline"><button class="text-button" data-action="leave">${icons.back}返回目录</button><span>和弦记号 <span class="slash">/</span> ${r.space.assessBass?'判断具体最低音':'只判断和弦名称'}</span></header>
      <section class="practice-heading"><div><span class="eyebrow">CHORD PRACTICE ${r.level.number}</span><h1>${r.level.title}</h1><p>${r.level.subtitle}</p></div><div class="round-progress"><span>本局进度 <strong>${r.index+1}<i>/ 10</i></strong></span><div class="progress-dots">${Array.from({length:10},(_,i)=>`<i class="${i<r.index?'done':i===r.index?'current':''}"></i>`).join('')}</div></div></section>
      <section class="listening-panel"><div class="listen-graphic" aria-hidden="true">${Array.from({length:15},(_,i)=>`<i style="--h:${[12,22,34,19,44,30,51,64,39,54,28,42,25,17,10][i]}px;--i:${i}"></i>`).join('')}</div><div class="listen-copy"><span class="eyebrow">LISTEN CLOSELY</span><h2 id="target-prompt">先听一听题目</h2><p>${r.space.assessBass?'辨认和弦名称，以及实际发声的最低音。':'辨认和弦名称，具体音区与排列不影响答案。'}</p></div><button class="button dark" id="replay-target" data-action="target">${icons.play}<span>播放题目</span></button><span class="free-replay">可重复播放 · 不计试听量</span></section>
      <section class="notation-answer-panel"><div class="instrument-heading"><div><h2>组合你的和弦答案</h2><p>滚动、点击或使用方向键选择。修改答案不发声。</p></div><div class="audition-meter"><span>不同试听声音</span><strong id="audition-count">0</strong></div></div><div class="notation-answer-display" aria-live="polite"><strong id="notation-answer-label">等待你的选择</strong>${r.space.assessBass?'<span id="notation-bass-label">最低音待选</span>':'<span>本局不判断具体最低音</span>'}</div>
      <div class="answer-wheels ${r.space.assessBass?'three-wheels':'two-wheels'}"><div class="wheel-group"><label id="root-wheel-title">和弦音级</label><div id="root-wheel-host"></div></div><span class="wheel-plus" aria-hidden="true">＋</span><div class="wheel-group"><label>和弦类型</label><div id="quality-wheel-host"></div></div>${r.space.assessBass?'<span class="wheel-plus bass-separator" aria-hidden="true">＋</span><div class="wheel-group"><label>最低音 · 含八度</label><div id="bass-wheel-host"></div></div>':''}</div>
      <div class="notation-preview"><div><span class="eyebrow">CANDIDATE PREVIEW</span><p id="notation-preview-notes">选好和弦后，可试听当前候选。</p>${r.space.assessBass?'':`<label class="preview-bass-control">试听用最低音<select id="notation-preview-bass" aria-label="试听用最低音"><option value="">先选择和弦</option></select><small>辅助设置，不参与答案</small></label>`}</div><div class="notation-preview-actions"><button class="button secondary" id="notation-play" data-action="notation-play" disabled>${icons.play}试听候选和弦</button><button class="text-button" id="notation-lowest" data-action="notation-lowest" disabled>单听最低音</button></div></div>
      <div class="answer-bar"><p class="notation-budget">首次试听不扣分 · 本局 ${N} 个不同和弦候选<br><small>累计 ${K} 种声音时，本题得分归零；重复声音免费。</small></p><div class="answer-actions"><button class="text-button" id="notation-clear" data-action="notation-clear">清空答案</button><button class="button primary" id="submit-answer" data-action="submit" disabled>提交答案 ${icons.arrow}</button></div></div></section>
      <div class="audio-status" role="status" aria-live="polite"><span id="audio-status-text"></span><button class="text-button" data-action="retry-audio" id="retry-audio" hidden>重新加载采样 ${icons.arrow}</button></div><section id="feedback" class="feedback" aria-live="polite"></section><div class="practice-footnote"><span>同声等价记号均可作答。题目分音在提交后开放。</span><span>${noteName(r.range.low)}–${noteName(r.range.high)} · ${r.range.high-r.range.low+1} 键</span></div>`);
    wheels.root=createWheel($('#root-wheel-host'),{id:'notation-root-wheel',label:'和弦音级',items:ROOT_LABELS.map((label,value)=>({label,value})),value:r.answer.root,onChange:value=>changeField('root',value)});
    wheels.quality=createWheel($('#quality-wheel-host'),{id:'notation-quality-wheel',label:'和弦类型',items:choices(r.space.qualities).map(type=>({value:type.id,label:type.suffix||'大三',detail:type.label})),value:r.answer.quality,onChange:value=>changeField('quality',value)});
    if(r.space.assessBass)wheels.bass=createWheel($('#bass-wheel-host'),{id:'notation-bass-wheel',label:'最低音，含八度',items:[],value:r.answer.bass,onChange:value=>changeField('bass',value),placeholder:'选择最低音'});
    rebuildBass();updateSelection();
  }
  function updateSelection() {
    const r=state.round;if(!isNotation()||state.screen!=='training')return;
    const a=r.answer,notes=candidateNotes(),bass=r.space.assessBass?a.bass:r.previewBass;
    $('#notation-answer-label').textContent=labelFor(a);
    if(r.space.assessBass)$('#notation-bass-label').textContent=Number.isInteger(a.bass)?`最低音 ${noteName(a.bass)}`:'最低音待选';
    $('#notation-preview-notes').textContent=notes?`将试听：${notes.map(noteName).join(' · ')}`:Number.isInteger(a.root)&&a.quality&&Number.isInteger(bass)?'该最低音无法在当前键域内完整试听；可以单听最低音，或调整选择。':'选好和弦后，可试听当前候选。';
    $('#notation-play').disabled=!r.audioReady||!notes;
    $('#notation-lowest').disabled=!r.audioReady||!Number.isInteger(bass);
    $('#notation-clear').disabled=r.revealed;
    $('#submit-answer').disabled=!r.audioReady||r.revealed||!r.heard||r.pendingAuditions>0||!answerComplete();
    $('#replay-target').disabled=!r.audioReady;
    $('#audition-count').textContent=r.auditions.size;
    $('#retry-audio').hidden=!r.audioError;
    $('#audio-status-text').textContent=r.loadingAudio||(!r.audioReady&&!r.audioError)?'正在加载本局键域的真实钢琴采样，完成后即可开始。':r.audioError?'钢琴采样加载失败，请重试或返回目录选择其他音色。':`本局音色：${TIMBRES.find(item=>item.id===r.timbre).label}${r.timbre==='sampledPiano'?' · 采样已就绪':''}`;
    Object.values(wheels).forEach(wheel=>wheel.setDisabled(r.revealed||!r.audioReady));
  }
  function submit() {
    const r=state.round;if(!r.audioReady||r.revealed||!r.heard||r.pendingAuditions>0||!answerComplete())return;
    const target={root:r.question.root,quality:r.question.quality,bass:r.question.bass};
    const result=scoreNotationAnswer({space:r.space,target,answer:r.answer,auditionCount:r.auditions.size});
    const full=scoreNotationAnswer({space:r.space,target,answer:target,auditionCount:0});
    r.result=result;r.revealed=true;
    r.results.push({...result,target:{...target},answer:{...r.answer},notes:[...r.question.notes],fullScore:full.score,label:r.question.label});
    const reference=result.reference||target,assessed=result.acceptedAnswer||r.answer;
    const rows=[['root','音级',ROOT_LABELS[reference.root],ROOT_LABELS[assessed.root]],['quality','类型',CHORD_TYPES.find(type=>type.id===reference.quality).label,CHORD_TYPES.find(type=>type.id===assessed.quality).label],...(r.space.assessBass?[['bass','最低音',noteName(target.bass),noteName(r.answer.bass)]]:[])];
    const perfect=result.correctCount===result.fieldCount;
    const aliases=[...new Set((result.equivalents||[target]).map(answer=>chordSymbol(answer.root,answer.quality)))];
    const normalization=assessed.root!==r.answer.root||assessed.quality!==r.answer.quality;
    const referenceChanged=reference.root!==target.root||reference.quality!==target.quality;
    const feedbackNote=[aliases.length>1?`同声等价记号：<strong>${aliases.map(escape).join('、')}</strong>。${r.space.assessBass?'这些名称均可作答，最低音仍需一致。':'这些名称均可作答。'}`:'',normalization?`你的 ${escape(chordSymbol(r.answer.root,r.answer.quality))} 按同声记号 ${escape(chordSymbol(assessed.root,assessed.quality))} 对照以下字段。`:'',referenceChanged?`字段按本题的等价记号 ${escape(chordSymbol(reference.root,reference.quality))} 核对。`:'',result.isEquivalentChord&&r.space.assessBass&&!result.matches.bass?'和弦名称已识别，具体最低音还需修正。':''].filter(Boolean).join('<br>');
    $('#feedback').innerHTML=`<div class="feedback-main">
      <div class="score-block"><span class="eyebrow">THIS QUESTION</span><strong>${fmt(result.score)}<small>分</small></strong><span>${perfect?'本题要求的答案全部正确':'把听见的信息，一点点补齐'}</span></div>
      <div class="feedback-detail"><h3>正确和弦：${escape(chordSymbol(target.root,target.quality))}${r.space.assessBass?`　最低音 ${noteName(target.bass)}`:''}</h3>
        ${feedbackNote?`<p class="notation-equivalents">${feedbackNote}</p>`:''}
        <div class="notation-field-feedback">${rows.map(([id,label,expected,actual])=>`<div class="field-feedback ${result.matches[id]?'match':'mismatch'}"><span>${result.matches[id]?'✓':'×'} ${label}</span><b>${escape(actual)}</b>${result.matches[id]?'':`<small>对照：${escape(expected)}</small>`}</div>`).join('')}</div>
        <p class="notation-revealed-notes">实际发声：${r.question.notes.map(noteName).join(' · ')}${r.space.assessBass?'':`；最低音 ${noteName(target.bass)}（本局不判分）`}</p>
        <p class="score-equation">答案分 <b>${fmt(result.answerScore)}</b><span>×</span>试听系数 <b>${result.auditionFactor.toFixed(3)}</b><span>=</span><b>${fmt(result.score)}</b></p>
        <p class="notation-score-detail">随机达到当前表现的概率 ${(result.probability*100).toFixed(3)}% · ${result.candidateCount} 个不同和弦候选 · ${result.zeroBudget} 种试听归零</p>
      </div></div><div class="feedback-bottom"><button class="button secondary" data-action="learn">${icons.play}整体 → 分音 → 整体</button><span>成绩已冻结，可自由学习。</span><button class="button primary" data-action="next">${r.index===9?'查看本局结果':'下一题'} ${icons.arrow}</button></div>`;
    $('#feedback').classList.add('visible');$('#submit-answer').hidden=true;updateSelection();
  }
  function finishRound() {
    audio.stop();const r=state.round;
    const average=r.results.reduce((sum,x)=>sum+x.score,0)/r.results.length;
    const completion=r.results.reduce((sum,x)=>sum+(x.fullScore>0?x.score/x.fullScore:0),0)/r.results.length;
    const ladder=NOTATION_LEVELS.map(level=>level.id),position=ladder.indexOf(r.level.id);
    const recommended=completion>=.75&&position>=0?ladder[Math.min(position+1,ladder.length-1)]:r.level.id;
    r.summary={average,completion,recommended};
    state.history.unshift({mode:'notation',assessBass:r.space.assessBass,average,recommended,level:r.level.id,date:Date.now()});state.history=state.history.slice(0,20);saveStore('binarypitch.history',state.history);
    state.screen='results';renderResults();window.scrollTo({top:0,behavior:'instant'});
  }
  function renderResults() {
    const r=state.round,{average,completion,recommended}=r.summary;
    const next=NOTATION_LEVELS.find(level=>level.id===recommended)||{title:'继续自定义和弦'};
    const perfect=r.results.filter(x=>x.correctCount===x.fieldCount).length;
    shell(`<header class="topline"><button class="text-button" data-action="catalog">${icons.back}返回目录</button><span>CHORD ROUND COMPLETE <span class="slash">/</span> ${r.level.title}</span></header><section class="result-hero"><span class="eyebrow">把听见的声音，变成清楚的名字。</span><h1>这一局，听见了。</h1><div class="result-score"><strong>${fmt(average)}</strong><span>本局记号听力分<small>10 题算术平均 · 试用局分</small></span></div><div class="result-stats"><span><b>${perfect} / 10</b> 完全正确</span><span><b>${(completion*100).toFixed(0)}%</b> 本局完成度 · 试用</span><span><b>${r.space.assessBass?'含具体最低音':'和弦名称'}</b> 作答要求</span></div></section><section class="recommendation"><div>${glyph(3)}<div><span class="eyebrow">NEXT CHORD PRACTICE · 试用推荐</span><h2>${next.title}</h2><p>继续在记号模式中练习，也可以自由选择其他关卡。</p></div></div><button class="button primary" data-action="notation-recommend" data-level="${recommended}">练习这一关 ${icons.arrow}</button></section><section class="results-detail"><div class="section-heading"><h2>本局的 10 次聆听</h2><button class="button secondary" data-action="notation-restart">再练一局 ${icons.arrow}</button></div><div class="result-table-wrap"><table class="result-table"><thead><tr><th>题目</th><th>正确和弦</th>${r.space.assessBass?'<th>正确最低音</th>':''}<th>你的答案</th><th>正确项</th><th>试听量</th><th>得分</th></tr></thead><tbody>${r.results.map((x,i)=>`<tr><td>${String(i+1).padStart(2,'0')}</td><td class="mono">${resultSymbols(x)}</td>${r.space.assessBass?`<td class="mono">${noteName(x.target.bass)}</td>`:''}<td class="mono">${escape(chordSymbol(x.answer.root,x.answer.quality))}${r.space.assessBass?` · ${noteName(x.answer.bass)}`:''}</td><td>${x.correctCount}/${x.fieldCount}</td><td>${x.auditionCount}</td><td><strong>${fmt(x.score)}</strong></td></tr>`).join('')}</tbody></table></div><p class="trial-note">完成度以每题最终分占该题无额外试听、全部正确分数的比例计算。平均达到 75% 暂推荐下一组；这只是同模式的试用规则，所有关卡仍自由选择。</p></section>`);
  }
  function openCustom() {
    if(state.screen==='training'){toast('请先结束当前练习，再配置下一局。');return;}
    const familyFields=CHORD_FAMILIES.map(family=>`<fieldset class="chord-family-field"><legend>${escape(family.label)}</legend><div class="chord-family-tools"><button type="button" class="text-button" data-action="notation-check" data-family="${family.id}" data-check="all">全选${escape(family.label)}</button><button type="button" class="text-button" data-action="notation-check" data-family="${family.id}" data-check="none">清除此组</button></div><div class="check-group">${CHORD_TYPES.filter(type=>type.family===family.id).map(type=>`<label class="check-chip"><input type="checkbox" name="notationQuality" value="${type.id}" ${state.notationQualities.includes(type.id)?'checked':''}><span>${escape(type.suffix||'大三')} · ${escape(type.label)}</span></label>`).join('')}</div></fieldset>`).join('');
    $('#custom-dialog').innerHTML=`<form id="notation-custom-form">
      <div class="dialog-heading"><div><span class="eyebrow">YOUR CHORD DICTIONARY</span><h2 id="custom-title">自定义和弦练习</h2></div><button type="button" class="close-button" data-close="custom-dialog" aria-label="关闭">×</button></div>
      <p class="dialog-intro">启用的类型等概率出题，使用当前全局键域与音色。每局 10 题，同声的等价记号均可作答。</p>
      <div class="notation-custom-toolbar"><span id="notation-quality-count" aria-live="polite"></span><div><button type="button" class="text-button" data-action="notation-check" data-check="all">全选全部类型</button><button type="button" class="text-button" data-action="notation-check" data-check="none">清空全部类型</button></div></div>
      ${familyFields}
      <label class="bass-toggle custom-bass-toggle"><input type="checkbox" name="assessBass" ${state.assessBass?'checked':''}><span class="toggle-track"></span><span>判断具体最低音<small>开启第三个滚轮，最低音需精确到八度</small></span></label>
      <p class="form-hint">键域 ${noteName(state.range.low)}–${noteName(state.range.high)}。扩展和弦保留九、十一、十三音的跨八度排列，不省略和弦音；当前键域放不下的类型会在开局前提示。</p>
      <p id="notation-custom-error" class="form-error" role="alert"></p><div class="dialog-footer"><button type="button" class="button secondary" data-close="custom-dialog">取消</button><button class="button primary" type="submit">开始和弦练习 ${icons.arrow}</button></div></form>`;
    updateCustomCount();
    $('#custom-dialog').showModal();
  }
  function updateCustomCount() {
    $('#notation-quality-count').textContent=`已选择 ${$('#notation-custom-form').querySelectorAll('[name="notationQuality"]:checked').length} / ${CHORD_TYPES.length} 种`;
  }
  function handleAction(action,button) {
    if(action==='notation-check'){
      const selected=button.dataset.check==='all',family=button.dataset.family;
      for(const input of $('#notation-custom-form').querySelectorAll('[name="notationQuality"]')){
        if(!family||CHORD_TYPES.find(type=>type.id===input.value).family===family)input.checked=selected;
      }
      updateCustomCount();$('#notation-custom-error').textContent='';return true;
    }
    if(action==='notation-start'){start(button.dataset.level);return true;}
    if(action==='notation-play'){const notes=candidateNotes();if(notes)play(notes,{count:!state.round.revealed});return true;}
    if(action==='notation-lowest'){const r=state.round,bass=r.space.assessBass?r.answer.bass:r.previewBass;if(Number.isInteger(bass))play([bass],{count:!r.revealed});return true;}
    if(action==='notation-clear'){
      const r=state.round;if(r.revealed)return true;r.answer={root:null,quality:null,bass:null};r.previewBass=null;
      wheels.root.setItems(ROOT_LABELS.map((label,value)=>({label,value})),null);wheels.quality.setItems(choices(r.space.qualities).map(type=>({value:type.id,label:type.suffix||'大三',detail:type.label})),null);rebuildBass();updateSelection();return true;
    }
    if(action==='notation-restart'){const r=state.round;start(r.level.id,r.notationConfig);return true;}
    if(action==='notation-recommend'){const r=state.round;start(button.dataset.level,button.dataset.level==='notation-custom'?r.notationConfig:{assessBass:r.space.assessBass});return true;}
    return false;
  }
  function handleChange(event) {
    if(event.target.name==='notationQuality'){updateCustomCount();$('#notation-custom-error').textContent='';return;}
    if(event.target.id==='notation-bass-toggle'){
      state.assessBass=event.target.checked;saveStore('binarypitch.notationBass',state.assessBass);renderCatalog();return;
    }
    if(event.target.id==='notation-preview-bass'){
      state.round.previewBass=event.target.value===''?null:Number(event.target.value);updateSelection();
    }
  }
  function handleSubmit(form) {
    if(form.id!=='notation-custom-form')return false;
    const qualities=[...form.querySelectorAll('[name="notationQuality"]:checked')].map(input=>input.value),assessBass=form.elements.assessBass.checked;
    try{createNotationSpace({range:state.range,qualities,assessBass});}catch(error){$('#notation-custom-error').textContent=error.message;return true;}
    state.notationQualities=qualities;state.assessBass=assessBass;saveStore('binarypitch.notationQualities',qualities);saveStore('binarypitch.notationBass',assessBass);$('#custom-dialog').close();start('notation-custom',{qualities,assessBass});return true;
  }
  return {renderCatalog,start,newQuestion,renderTraining,updateSelection,submit,finishRound,renderResults,openCustom,destroyWheels,handleAction,handleChange,handleSubmit};
}
