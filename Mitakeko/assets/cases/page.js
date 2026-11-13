import { lessons } from '../data/index.js';
import { esc,icon } from '../ui.js';
import { findCaseStudy } from './index.js';
import { studyView } from './view.js';

const pageTitle=(eyebrow,title,description)=>`<header class="page-heading"><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${esc(title)}</h1><p class="lede">${esc(description)}</p></header>`;

export function caseDirectoryView(cases) {
  cases=[...cases].sort((a,b)=>Number(Boolean(findCaseStudy(b.id)))-Number(Boolean(findCaseStudy(a.id))));
  return `${pageTitle('YOUR LISTENING, REVISITED','从你的听歌经验出发','先从有谱例与来源的深度案例进入，再把方法用到其他熟悉的作品。Fishmans与拉赫的两页包含具体写法、听觉线索、课程概念与可播放的对照。')}<div class="case-grid">${cases.map((c,i)=>{
    const study=findCaseStudy(c.id);
    return `<article class="case-card ${study?'is-deep-case':''}"><div class="case-cover cover-${i%5}" aria-hidden="true"><span>${String(i+1).padStart(2,'0')}</span><span>${study?'深度分析':esc(c.focus.split('、')[0])}</span></div><div class="case-card-content"><span class="case-artist">${esc(c.artist)}</span><h2><a href="#/case/${c.id}">${esc(c.title)}</a></h2>${study?'<span class="case-evidence-tag">谱例 · 乐理解释 · 声部试听</span>':''}<p class="case-question">${esc(study?study.thesis:c.questions[0])}</p><a class="case-link" href="#/case/${c.id}">${study?'打开深度案例':'打开导听卡'} ${icon('arrow')}</a></div></article>`;
  }).join('')}</div>`;
}

export function caseDetailView(c) {
  const related=lessons.filter(l=>l.caseIds.includes(c.id)),study=findCaseStudy(c.id);
  return `${pageTitle(study?'LISTENING CASE · 谱面、声音与写法':'LISTENING CASE · 版本与证据',c.title,c.focus)}<div class="case-detail"><section class="example-box"><h2>${esc(c.artist)}</h2><p>专辑 / 录音线索：${esc(c.album)}</p><p class="source-note">${esc(study?'本页从指定版本与可核对来源出发，区分谱面事实、听觉线索和分析解释。':c.context)}</p>${c.link?`<a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">查阅作品资料 ↗</a>`:''}</section>${study?studyView(study):`<section class="reading"><h2>三遍重听，追踪三个问题</h2><ol>${c.questions.map(q=>`<li>${esc(q)}</li>`).join('')}</ol><p>${esc(c.note)}</p></section>`}
  <section class="local-listener lab" id="case-local-listener"><div class="lab-heading"><div><span class="lab-label">YOUR RECORDING · LOCAL ONLY</span><h2>回到自己的录音核对</h2></div></div><div class="lab-stage"><p>选择你已有的音频，按本页的听觉地标寻找片段，再设置循环。文件仅由浏览器读取，不上传，也不写入学习记录。播放原录音与合成谱例会互相停止。</p><label class="btn btn-soft import-label">选择本地音频<input id="local-audio-file" type="file" accept="audio/*" class="sr-only"></label><p id="audio-file-name" class="source-note" role="status">尚未选择音频文件</p><audio id="local-audio" controls preload="metadata" aria-label="本地录音播放器"></audio><div class="audio-loop-fields"><label>片段起点（秒）<input id="loop-start" type="number" min="0" step=".1" value="0"></label><label>片段终点（秒）<input id="loop-end" type="number" min="0" step=".1" value="10"></label><button class="btn btn-small" type="button" data-action="audio-start">将当前位置设为起点</button><button class="btn btn-small" type="button" data-action="audio-end">将当前位置设为终点</button></div><label class="check-row"><input id="audio-loop" type="checkbox">循环所选片段</label><p class="source-note" id="audio-loop-status" role="status">先选文件，再设置起点与终点；没有跨录音通用的时间码。</p></div></section>
  <section class="dashboard-section"><h2>在课程里继续推演</h2><div class="notes-list">${related.map(l=>`<a class="roadmap-row" href="#/lesson/${l.id}"><span>${l.unitId}</span><span><strong>${esc(l.title)}</strong><small>${esc(l.summary)}</small></span>${icon('arrow')}</a>`).join('')}</div></section></div>`;
}
