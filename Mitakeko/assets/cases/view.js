import { esc,icon,options } from '../ui.js';
import { findLesson } from '../data/index.js';
import { scoreView } from './notation.js';
import { excerptVariant,caseBarRanges } from './models.js';

const list=items=>`<ul>${items.map(item=>`<li>${esc(item)}</li>`).join('')}</ul>`;
const citations=(study,ids)=>ids.map(id=>{
  const source=study.sources.find(s=>s.id===id);
  return source?`<a class="case-citation" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.kind)} · ${esc(source.title)} ↗</a>`:'';
}).join('');

export function defaultCaseSettings(excerpt) {
  return {variant:excerpt.variants[0].id,solo:'all',bpm:excerpt.bpm||72,pulse:false};
}

export function caseFigureView(study,excerpt,settings=defaultCaseSettings(excerpt)) {
  const variant=excerptVariant(excerpt,settings.variant),id=excerpt.id;
  return `<figure class="case-excerpt" id="case-figure-${esc(id)}" data-case-figure="${esc(id)}">
    <figcaption class="case-excerpt-heading"><span class="section-kicker">SCORE & SOUND · 谱例与对照</span><h3>${esc(excerpt.title)}</h3><span class="case-evidence-tag">${esc(excerpt.identity)}</span><p>${esc(excerpt.locator)}</p></figcaption>
    <div class="case-figure-controls">
      <label>谱例版本<select id="case-${esc(id)}-variant" data-case-field="variant" data-excerpt="${esc(id)}">${options(excerpt.variants.map(v=>v.id),settings.variant,value=>excerpt.variants.find(v=>v.id===value).label)}</select></label>
      <label>试听声部<select id="case-${esc(id)}-solo" data-case-field="solo" data-excerpt="${esc(id)}">${options(['all',...variant.parts.map(p=>p.id)],settings.solo,value=>value==='all'?'全部声部':variant.parts.find(p=>p.id===value).name)}</select></label>
      <label class="case-speed">示例速度 <output id="case-${esc(id)}-bpm-value">${settings.bpm} BPM</output><input id="case-${esc(id)}-bpm" type="range" min="40" max="120" step="1" value="${settings.bpm}" data-case-field="bpm" data-excerpt="${esc(id)}" aria-label="${esc(excerpt.title)}示例速度"></label>
    </div>
    <label class="check-row case-pulse-control"><input id="case-${esc(id)}-pulse" type="checkbox" data-case-field="pulse" data-excerpt="${esc(id)}" ${settings.pulse?'checked':''}>合成拍点参照（本站添加，未写入原谱）</label>
    <div class="case-variant-note"><strong>${esc(variant.identity)} · ${esc(variant.label)}</strong><p>${esc(variant.description)}</p></div>
    <div class="case-play-row"><button type="button" class="btn btn-primary" data-case-play="${esc(id)}" aria-pressed="false">${icon('play')}试听此谱例</button><span class="case-play-status" data-case-status="${esc(id)}" role="status">合成示例 · 尚未播放</span></div>
    <div class="case-score-container ${settings.solo==='all'?'':'has-solo'}" data-solo="${esc(settings.solo)}">${scoreView(excerpt,variant)}</div>
    <p class="case-caption">${esc(excerpt.caption)}</p>
    <p class="source-note">试听按四分音符计算BPM；播放位置按小节提示。合成音色用于辨认关系，未模拟原录音的发音、音量平衡和自由速度。</p>
    <div class="case-figure-sources">${citations(study,excerpt.sourceIds)}</div>
    ${excerpt.sourceImage?`<details class="case-original"><summary>打开对应原谱核对</summary><p>${esc(excerpt.sourceImage.caption)}</p><a href="${esc(excerpt.sourceImage.href)}" target="_blank" rel="noopener noreferrer">查看可放大的原谱摘图 ↗</a></details>`:''}
  </figure>`;
}

function structureView(structure) {
  return `<figure class="case-structure"><figcaption><span class="section-kicker">FORM MAP · 结构谱</span><h3>${esc(structure.title)}</h3><p>${esc(structure.caption)}</p></figcaption><ol class="case-structure-grid">${structure.columns.map(column=>`<li><span class="structure-letter">${esc(column.id)}</span><h4>${esc(column.title)}</h4><p>${esc(column.description)}</p><dl><dt>听觉地标</dt><dd>${esc(column.listen)}</dd><dt>结构作用 · 本站分析</dt><dd>${esc(column.analysis)}</dd></dl></li>`).join('')}</ol>${structure.indexContrast?`<div class="case-index-contrast"><div><strong>创作的分段</strong><span>A</span><span>B</span><span>C</span><span>D</span></div><div><strong>2016再版索引</strong>${[1,2,3,4,5].map(n=>`<span>.${n}</span>`).join('')}</div><p class="source-note">两行表示不同层级。这里不建立切点对应关系，方块宽度也不表示时长。</p></div>`:''}</figure>`;
}

export function studyView(study) {
  return `<article class="case-study" aria-label="${esc(study.title)}">
    <header class="case-study-hero"><span class="eyebrow">CLOSE LISTENING · 深度欣赏案例</span><h2>${esc(study.title)}</h2><p class="case-thesis">${esc(study.thesis)}</p><p>${esc(study.scope)}</p></header>
    <section class="case-recording"><h3>先固定版本与分析范围</h3><dl><dt>本次录音</dt><dd>${esc(study.recording.label)}</dd><dt>谱本或依据</dt><dd>${esc(study.recording.scoreEdition)}</dd><dt>怎样找到片段</dt><dd>${esc(study.recording.locator)}</dd></dl><p class="source-note">${esc(study.recording.caveat)}</p></section>
    <nav class="case-study-toc" aria-label="深度案例目录">${study.sections.map((section,i)=>`<button type="button" data-action="scroll" data-target="case-section-${esc(section.id)}"><span>${String(i+1).padStart(2,'0')}</span>${esc(section.heading)}</button>`).join('')}</nav>
    <div class="case-evidence-key"><p><strong>读谱：</strong>用来源定位核对音名、时值与声部。</p><p><strong>听觉线索：</strong>在自己的录音中寻找可重复确认的事件。</p><p><strong>分析与改写：</strong>解释关系，并用控制变量的合成示例检验解释。</p></div>
    ${study.sections.map((section,i)=>`<section class="case-analysis-section" id="case-section-${esc(section.id)}"><span class="section-kicker">${String(i+1).padStart(2,'0')} · ${esc(section.evidenceKind)}</span><h2>${esc(section.heading)}</h2><p class="case-claim">${esc(section.claim)}</p><div class="case-inline-evidence">${citations(study,section.evidence)}</div>${section.explanation.map(paragraph=>`<p>${esc(paragraph)}</p>`).join('')}<div class="case-listen-cues"><h3>${icon('sound')}在录音中听什么</h3>${list(section.listen)}</div><div class="case-concept-links"><span>回到课程核对</span>${section.lessonIds.map(id=>`<a href="#/lesson/${id}">${esc(findLesson(id)?.title||id)} ${icon('arrow')}</a>`).join('')}</div>${section.structure&&study.structure?structureView(study.structure):''}${section.excerptId?caseFigureView(study,study.excerpts.find(e=>e.id===section.excerptId)):''}</section>`).join('')}
    <section class="case-transfer"><span class="section-kicker">TRY THE WRITING DECISION</span><h2>${esc(study.practice.title)}</h2><ol>${study.practice.instructions.map(item=>`<li>${esc(item)}</li>`).join('')}</ol><details><summary>对照自己的结果：应当能解释什么</summary>${list(study.practice.criteria)}</details></section>
    <section class="case-takeaways"><h2>把这次分析带走</h2>${list(study.takeaways)}</section>
    <section class="case-source-list"><h2>本页使用的证据</h2><ol>${study.sources.map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a><span>${esc(source.kind)}</span><p>${esc(source.locator)}</p></li>`).join('')}</ol><p class="source-note">具体的音符摘录、分析减缩与本站原创改写在每张谱例旁分别标注。本页不附商业录音；可在下方选择本地文件重听。</p></section>
  </article>`;
}

export function setCasePlayback(playing,context=null) {
  for(const button of document.querySelectorAll('[data-case-play]')) {
    const active=playing&&context?.excerptId===button.dataset.casePlay;
    button.setAttribute('aria-pressed',String(active));
    button.innerHTML=icon(active?'stop':'play')+(active?'停止此谱例':'试听此谱例');
  }
  for(const status of document.querySelectorAll('[data-case-status]')) {
    const active=playing&&context?.excerptId===status.dataset.caseStatus;
    if(active)status.dataset.played='true';
    status.textContent=active?`正在循环 · ${context.variantLabel} · ${context.soloLabel} · ${context.bpm} BPM`:status.dataset.played?'合成示例 · 已停止':'合成示例 · 尚未播放';
  }
  if(!playing)document.querySelectorAll('.case-score-bar.is-playing').forEach(node=>node.classList.remove('is-playing'));
}

export function highlightCaseBar(context,beat) {
  const figure=document.getElementById('case-figure-'+context.excerptId);if(!figure)return;
  const bar=caseBarRanges(context.excerpt).findIndex(range=>beat>=range.start&&beat<range.end);
  for(const node of figure.querySelectorAll('[data-case-bar]'))node.classList.toggle('is-playing',Number(node.dataset.caseBar)===bar);
}

export function applyCaseSolo(excerptId,solo) {
  const figure=document.getElementById('case-figure-'+excerptId);if(!figure)return;
  for(const part of figure.querySelectorAll('[data-score-part]'))part.classList.toggle('is-muted',solo!=='all'&&part.dataset.scorePart!==solo);
}
