import { esc,pretty,icon,options,noteChips,staffSvg,contourSvg } from '../ui.js';
import { ROOTS,parseNote,noteToMidi,midiToNote,frequency,MODES,CHORDS,PROGRESSIONS,intervalBetween,scaleNotes,chordNotes,chordSymbol,diatonicChords,voiceLeadingCost } from '../music/theory.js';
import { METERS,drumPattern,makeListeningModel,intervalModel,scaleModel,chordModel,progressionModel,progressionVoicings,meteredRhythmModel,pulseModel,melodyModel,formModel,timbreModel } from '../music/models.js';
import { encodeMidi } from '../music/midi.js';
import { LAB_TYPES,MELODY_NOTES,makeLab } from './defaults.js';
import { supportsTimed,timedModel,timedView,timedAction,timedField } from './timed.js';
import { supportsEnsemble,ensembleModel,ensembleView,ensembleAction,ensembleField } from './ensemble.js';
import { supportsDevelopment,developmentModel,developmentView,developmentAction,developmentField } from './development.js';
import { supportsFoundation,foundationModel,foundationView,foundationAction,foundationField } from './foundation-lab.js';
import { supportsNotation,notationModel,notationView,notationAction,notationField } from './notation-lab.js';
import { supportsCollections,collectionsModel,collectionsView,collectionsAction,collectionsField } from './collections.js';
import { supportsTonal,tonalModel,tonalView,tonalAction,tonalField } from './tonal.js';
const specialized=s=>supportsTimed(s)||supportsEnsemble(s)||supportsDevelopment(s)||supportsFoundation(s)||supportsNotation(s)||supportsCollections(s)||supportsTonal(s);
const copy=value=>JSON.parse(JSON.stringify(value));
const select=(field,values,current,label=value=>value)=>`<select id="lab-${field}" data-lab-field="${field}">${options(values,current,label)}</select>`;
const field=(label,control)=>`<label class="lab-field"><span>${label}</span>${control}</label>`;
const rootSelect=s=>select('root',[...new Set([...ROOTS,s.root])],s.root,pretty);
function range(fieldName,label,value,min,max,step=1,suffix='') {return `<label class="lab-range"><span>${label}<output data-readout="${fieldName}">${value}${suffix}</output></span><input id="lab-${fieldName}" data-lab-field="${fieldName}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-label="${label}"></label>`;}
function referencePreset(s) {return s.progression==='modulationG'?'tonicizationG':s.progression==='tonicizationG'?'modulationG':s.progression==='modal'?'modalMinor':s.progression==='borrowed'?'borrowedReference':s.progression==='secondary'?'secondaryDiatonic':s.progression==='deceptive'?'authentic':'deceptive';}
export function labModel(s,variant='current') {
  if(supportsTimed(s))return timedModel(s,variant);
  if(supportsEnsemble(s))return ensembleModel(s,variant);
  if(supportsDevelopment(s))return developmentModel(s,variant);
  if(supportsFoundation(s))return foundationModel(s,variant);
  if(supportsNotation(s))return notationModel(s,variant);
  if(supportsCollections(s))return collectionsModel(s,variant);
  if(supportsTonal(s))return tonalModel(s,variant);
  switch(s.type) {
    case 'layers':return makeListeningModel();
    case 'tempo':return variant==='texture'?makeListeningModel():pulseModel(s.meter);
    case 'rhythm':return meteredRhythmModel(variant==='A'?s.drumsA:s.drums,s.meter);
    case 'pitch':return {beats:2,events:[{beat:0,duration:1.5,note:midiToNote(s.pitch),kind:'tone',layer:'melody',velocity:.75}]};
    case 'interval':return intervalModel(s.intervalNotes,s.harmonic);
    case 'scale':return scaleModel(s.root,s.mode);
    case 'chord':return chordModel(s.root,s.quality,s.inversion);
    case 'progression':return progressionModel(variant==='reference'?referencePreset(s):s.progression,{smooth:s.smooth,beatsPerChord:s.beatsPerChord,withBass:s.withBass});
    case 'voicing':return progressionModel(s.progression,{smooth:variant==='root'?false:variant==='smooth'?true:s.smooth,beatsPerChord:s.beatsPerChord,withBass:s.withBass});
    case 'motif':return melodyModel(variant==='A'?s.melodyA:s.melody,{accompaniment:s.withBass});
    case 'timbre':return timbreModel(variant==='dry'?{...s,space:'dry'}:s);
    case 'form':return variant==='clip'?melodyModel(s.clips[s.selectedClip]):formModel(s.clips,s.order);
    default:return makeListeningModel();
  }
}
export function labView(lesson,s,{backupAvailable=false}={}) {
  let stage='',starterPanel='';
  const labTitle=({duration:'起音、时值与延音',syncopation:'切分与不规则分组','rhythm-project':'八小节节奏项目',sequence:'模进、移调与增值',phrase:'问答与句尾',groove:'鼓与低音',texture:'织体与独立线条',counterpoint:'两声部写作',register:'音区与密度','harmonic-rhythm':'旋律与和声时点',reharmonization:'同一旋律的两套和声',nonchord:'和弦外音的上下文',song:'AABA歌曲模型',sonata:'奏鸣曲功能模型','timbre-form':'音色与段落安排'})[s.scenario]||LAB_TYPES[s.type];
  if(s.type==='layers')stage=layers(s);
  if(s.type==='tempo')stage=`<div class="tempo-readout"><strong class="tempo-number">${s.bpm}</strong><span class="bpm">BPM<small>当前拍单位：${METERS[s.meter].unit}</small></span></div><div class="lab-fields">${field('拍号示例',select('meter',Object.keys(METERS),s.meter))}</div><div class="beat-row">${Array.from({length:METERS[s.meter].beats},(_,i)=>`<div class="beat-dot" data-pulse="${i}">${i+1}</div>`).join('')}</div><p class="lab-help">本模型的${s.meter}按${METERS[s.meter].unit}数拍。改变BPM后从头播放，保持相同拍单位比较。</p>`;
  if(s.type==='rhythm')stage=rhythm(s);
  if(s.type==='pitch')stage=pitch(s);
  if(s.type==='interval')stage=interval(s);
  if(s.type==='scale')stage=scale(s);
  if(s.type==='chord')stage=chord(s);
  if(s.type==='progression'||s.type==='voicing')stage=progression(s);
  if(s.type==='motif')stage=motif(s);
  if(s.type==='timbre')stage=timbre(s);
  if(s.type==='form')stage=form(s);
  if(supportsTimed(s))stage=timedView(s);
  if(supportsEnsemble(s))stage=ensembleView(s);
  if(supportsDevelopment(s))stage=developmentView(s);
  if(supportsFoundation(s))stage=foundationView(s,stage);
  if(supportsNotation(s))stage=notationView(s);
  if(supportsCollections(s))stage=collectionsView(s);
  if(supportsTonal(s))stage=tonalView(s);
  if(/^u\d\d-\d\d$/.test(lesson?.id||'')) {
    const atStart=JSON.stringify(s)===JSON.stringify(makeLab(lesson.lab.type,lesson.lab.config));
    starterPanel=`<section class="lab-start-panel" aria-label="本课起点与草稿"><strong>${atStart?'当前设置为本课起点':'当前设置与本课起点不同'}</strong><p>实验会保留上次的草稿。先载入本课起点核对正文，再修改一个变量；载入前的草稿另存一份，可撤销恢复。再次载入会替换这份备份，笔记与学习进度保留。</p><div class="preset-row"><button class="btn btn-small" data-lab-action="load-lesson-start" type="button">载入本课起点</button><button class="btn btn-small" data-lab-action="restore-lesson-draft" type="button" ${backupAvailable?'':'disabled'}>恢复载入前草稿</button></div></section>`;
  }
  const textEntry=/<input\b(?=[^>]*data-lab-field)(?![^>]*type="(?:checkbox|range)")/.test(stage);
  stage=`<p class="lab-focus">${esc(s.focus||'自由比较：先保留一个版本，再只改变一个变量。')}</p>${textEntry?'<p class="lab-help">音名与拍数输入后，按 Enter 应用并更新谱例；也可移出输入框提交。</p>':''}${stage}`;
  const extras=specialized(s)?'':s.type==='tempo'?'<button class="btn btn-soft" data-lab-action="texture" type="button">听完整组合</button>':s.type==='progression'?`<button class="btn btn-soft" data-lab-action="reference" type="button">听对照模型</button>`:s.type==='voicing'?'<button class="btn btn-soft" data-lab-action="root" type="button">听原位连接</button><button class="btn btn-soft" data-lab-action="smooth" type="button">听邻近连接</button>':'';
  return `<div class="lab-heading"><div><span class="lab-label">LISTEN · COMPARE · MAKE</span><h2 class="lab-title">${labTitle}</h2></div><span class="lab-status" id="lab-status">原创教学模型</span></div>${starterPanel}<div class="lab-transport">${range('bpm','速度',s.bpm,40,180,1,' BPM')}<div class="lab-toolbar"><button class="btn btn-primary" id="lab-play" data-lab-action="play" type="button" aria-pressed="false">${icon('play')}播放当前模型</button>${extras}<button class="btn btn-small" data-lab-action="midi" type="button">${icon('download')}导出MIDI</button></div><p class="lab-help">BPM表示每分钟的计速拍数，拍单位以本实验标注为准；初次可先保持默认速度。</p></div><div class="lab-stage">${stage}</div><p class="model-note">模型用于演示本课关系，未还原原曲录音。带试听按钮的音名可单独播放；MIDI保存音符事件，实际音色由接收软件决定。</p>`;
}
function layers(s) {
  return `<div class="soundscape">${['melody','bass','rhythm'].map((role,j)=>`<div class="model-layer ${s.layers[role]?'':'is-muted'}"><div class="layer-top"><span>${['旋律线条','低音线条','打击节奏'][j]}</span><span>${s.layers[role]?'正在参与':'暂时退出'}</span></div><div class="note-grid">${Array.from({length:16},(_,i)=>`<span class="note-mark" style="--note-height:${[16,31,21,36][(i+j)%4]}px"></span>`).join('')}</div></div>`).join('')}</div><div class="layer-controls">${['melody','bass','rhythm'].map((role,i)=>`<button class="layer-card ${s.layers[role]?'is-on':''}" data-lab-action="layer" data-role="${role}" type="button" aria-pressed="${s.layers[role]}"><span class="layer-name"><i class="layer-indicator"></i>${['旋律','低音','节奏'][i]}</span><span class="layer-description">${s.layers[role]?'点击让它退出':'点击重新加入'}</span></button>`).join('')}</div><div class="preset-row"><button class="btn btn-small" data-lab-action="solo" type="button">只听低音</button><button class="btn btn-small" data-lab-action="all" type="button">恢复完整组合</button></div>`;
}
function rhythm(s) {
  const m=METERS[s.meter],count=m.beats*m.subdivision;
  return `<div class="lab-fields">${field('拍号',select('meter',Object.keys(METERS),s.meter))}<span class="lab-help">每拍${m.subdivision}格；BPM以${m.unit}为单位</span></div><p class="lab-help">格子依次切换：留白 → 普通打击 → 重音。分组：${m.groups}。</p><div class="rhythm-bars">${[0,1].map(bar=>`<section class="rhythm-bar"><h3>第${bar+1}小节</h3>${['kick','snare','hat'].map((role,j)=>`<div class="drum-row"><span class="drum-label">${['底鼓','军鼓','踩镲'][j]}</span><div class="drum-steps" style="grid-template-columns:repeat(${count},minmax(0,1fr))">${Array.from({length:count},(_,i)=>{const index=bar*count+i,on=s.drums[role][index];return `<button type="button" class="step ${on?'is-active':''} ${on===2?'is-accent':''}" data-lab-action="drum" data-role="${role}" data-index="${index}" data-playhead="${index}" aria-label="${['底鼓','军鼓','踩镲'][j]} 第${bar+1}小节第${i+1}格 ${['留白','普通','重音'][on]}">${i%m.subdivision===0?Math.floor(i/m.subdivision)+1:'·'}</button>`;}).join('')}</div></div>`).join('')}</section>`).join('')}</div><div class="preset-row"><button class="btn btn-small" data-lab-action="rhythm-a" type="button">听版本A</button><button class="btn btn-small" data-lab-action="save-rhythm" type="button">把当前保存为A</button><button class="btn btn-small" data-lab-action="reset-rhythm" type="button">恢复拍号示例</button></div><p class="lab-help">${JSON.stringify(s.drums)===JSON.stringify(s.drumsA)?'当前与版本A相同。':'当前B与A已有差异，回听并描述重音、留白或位置的改变。'}</p>`;
}
function pitch(s) {
  return `<div class="notation-panel">${staffSvg(midiToNote(s.pitch))}<div class="pitch-readout"><strong>${pretty(midiToNote(s.pitch))}</strong><span>${frequency(s.pitch).toFixed(1)} Hz</span></div></div><div class="keyboard">${[48,60,72].map(base=>`<div class="octave"><div class="octave-label">${midiToNote(base)}—${midiToNote(base+11)}</div><div class="white-keys">${[0,2,4,5,7,9,11].map(n=>`<button class="piano-key is-white ${s.pitch===base+n?'is-selected':''}" data-lab-action="pitch" data-midi="${base+n}" type="button" aria-label="弹奏${midiToNote(base+n)}"><span>${midiToNote(base+n)}</span></button>`).join('')}${[1,3,6,8,10].map((n,i)=>`<button class="piano-key is-black ${s.pitch===base+n?'is-selected':''}" data-lab-action="pitch" data-midi="${base+n}" style="left:${[1,2,4,5,6][i]/7*100}%" type="button" aria-label="弹奏${midiToNote(base+n)}"><span>${pretty(midiToNote(base+n).replace(/\d/,''))}</span></button>`).join('')}</div></div>`).join('')}</div><div class="lab-fields">${field('直接选择音高',select('pitch',Array.from({length:36},(_,i)=>i+48),s.pitch,n=>pretty(midiToNote(n))))}</div><p class="lab-help">键盘按十二平均律发声，C4为中央C。这里的音名显示采用升号拼写；音程实验允许分别输入等音的不同写法。</p>`;
}
function interval(s) {
  const result=intervalBetween(...s.intervalNotes);
  return `<div class="lab-fields">${field('第一个音',`<input id="lab-interval-a" data-lab-field="interval-a" type="text" maxlength="6" value="${esc(s.intervalNotes[0])}" spellcheck="false">`)}${field('第二个音',`<input id="lab-interval-b" data-lab-field="interval-b" type="text" maxlength="6" value="${esc(s.intervalNotes[1])}" spellcheck="false">`)}</div><div class="relationship-result"><span>由拼写与距离共同确定</span><strong>${result.label}</strong><div><span>字母跨度：${result.number}度</span><span>半音距离：${result.semitones}</span></div></div>${noteChips(s.intervalNotes)}<label class="check-row"><input type="checkbox" data-lab-field="harmonic" ${s.harmonic?'checked':''}>仅同时播放两音</label><div class="preset-row"><button class="btn btn-small" data-lab-action="interval-preset" data-pair="C4,D#4" type="button">C—D♯</button><button class="btn btn-small" data-lab-action="interval-preset" data-pair="C4,Eb4" type="button">C—E♭</button><button class="btn btn-small" data-lab-action="invert-interval" type="button">把下方音移高八度</button></div><p class="lab-help">比较增二度与小三度：在十二平均律里可以同样宽，写作与分析中的身份仍不同。默认依次播放两音，再同时播放。</p>`;
}
function scale(s) {
  const notes=scaleNotes(s.root,s.mode),table=notes.length===8?diatonicChords(s.root,s.mode):[];
  return `<div class="lab-fields">${field('起始音',rootSelect(s))}${field('音阶模型',select('mode',Object.keys(MODES),s.mode,m=>MODES[m].label))}</div>${noteChips(notes)}<div class="scale-steps">${MODES[s.mode].intervals.map((value,i,all)=>`<span>${i===0?'起点':value-all[i-1]===1?'半音':value-all[i-1]===2?'全音':(value-all[i-1])+'半音'}</span>`).join('')}<span>到八度：${12-MODES[s.mode].intervals.at(-1)}半音</span></div>${table.length?`<h3 class="small-heading">在这组七声音阶上叠置三度</h3><div class="diatonic-grid">${table.map((c,i)=>`<button class="diatonic-cell" data-lab-action="diatonic" data-index="${i}" type="button"><strong>${c.numeral}</strong><span>${pretty(c.symbol)}</span><small>${c.notes.map(n=>pretty(n.replace(/-?\d$/,''))).join(' · ')}</small></button>`).join('')}</div>`:''}<p class="lab-help">播放从所选起始音向上至八度。音集合本身不自动证明一首作品的调中心。旋律小调此处只演示上行形式。</p>`;
}
function chord(s) {
  const notes=chordNotes(s.root,s.quality,s.inversion);
  return `<div class="lab-fields">${field('根音',rootSelect(s))}${field('性质',select('quality',Object.keys(CHORDS),s.quality,q=>CHORDS[q].label))}${field('转位',select('inversion',Array.from({length:CHORDS[s.quality].intervals.length},(_,i)=>i),s.inversion,i=>i===0?'原位':`第${i}转位`))}</div><div class="relationship-result"><span>${CHORDS[s.quality].label}</span><strong>${pretty(chordSymbol(s.root,s.quality))}</strong><div><span>根音 ${pretty(s.root)}</span><span>当前低音 ${pretty(notes[0])}</span></div></div>${noteChips(notes)}<p class="lab-help">先听同时发声，再听分解构成音。改变转位时根音不变，低音与排列改变。sus、add与七和弦的区别在组成音中核对。</p>`;
}
function movement(frames) {return frames.slice(1).reduce((sum,frame,i)=>sum+(frame.notes.length===frames[i].notes.length?voiceLeadingCost(frames[i].notes,frame.notes):0),0);}
const bassLabel=(frame,s)=>'上方配置最低音 '+pretty(frame.notes[0])+(s.withBass?'；另加根音低音 '+pretty(midiToNote(noteToMidi(frame.root)-12)):'；未另加低音');
function progression(s) {
  const frames=progressionVoicings(s.progression,s.smooth),root=progressionVoicings(s.progression,false),smooth=progressionVoicings(s.progression,true);
  return `<div class="lab-fields">${field('模型',select('progression',Object.keys(PROGRESSIONS),s.progression,p=>PROGRESSIONS[p].label))}${field('每个和弦持续',select('beatsPerChord',[1,2,4],s.beatsPerChord,n=>n+'拍'))}</div><label class="check-row"><input type="checkbox" data-lab-field="smooth" ${s.smooth?'checked':''}>采用邻近移动的配置</label><label class="check-row"><input type="checkbox" data-lab-field="withBass" ${s.withBass?'checked':''}>另加根音低音</label><div class="progression-frames">${frames.map((frame,i)=>`<div class="progression-frame" data-chord-index="${i}"><span>${frame.numeral}</span><strong>${pretty(chordSymbol(frame.root,frame.quality))}</strong><small>${frame.notes.map(pretty).join(' · ')}</small><em>${bassLabel(frame,s)}</em></div>`).join('')}</div>${s.type==='voicing'?`<div class="movement-comparison"><span>原位示例移动：<strong>${movement(root)}</strong> 半音</span><span>邻近配置移动：<strong>${movement(smooth)}</strong> 半音</span></div><p class="lab-help">移动统计只比较相同音数、按音高排序的线条。它演示一种局部选择，不代替风格中的对位或四部写作规则。</p>`:`<p class="lab-help">速度保持不变时，改变每个和弦的拍数，听和声节奏怎样变化。所有标记只分析当前模型。对照模型：${PROGRESSIONS[referencePreset(s)].label}。</p>`}`;
}
function melodyEditor(notes) {
  return `<div class="motif-contour-wrap">${contourSvg(notes)}</div><div class="motif-grid">${Array.from({length:4},(_,bar)=>`<section class="motif-bar"><span>第${bar+1}小节</span><div class="motif-beats">${Array.from({length:4},(_,beat)=>{const i=bar*4+beat;return `<label class="note-select" data-note-beat="${i}"><small>第${beat+1}拍</small><select data-lab-field="melody" data-index="${i}" aria-label="第${bar+1}小节第${beat+1}拍">${options(['',...MELODY_NOTES],notes[i]||'',n=>n?pretty(n):'休止')}</select></label>`;}).join('')}</div></section>`).join('')}</div>`;
}
function motif(s) {
  return `${melodyEditor(s.melody)}<div class="preset-row"><button class="btn btn-small" data-lab-action="repeat" type="button">重复第一小节</button><button class="btn btn-small" data-lab-action="variation" type="button">变化最后一小节</button><button class="btn btn-small" data-lab-action="save-melody" type="button">保留当前为A</button><button class="btn btn-small" data-lab-action="melody-a" type="button">听草稿A</button></div><label class="check-row"><input data-lab-field="withBass" type="checkbox" ${s.withBass?'checked':''}>加入固定 I—IV—V—I 伴奏</label><p class="lab-help">本编辑区限定C大调自然音，每格一拍，四小节。先保留草稿A，再做变化；可导出当前MIDI或整份学习记录。</p>`;
}
function timbre(s) {
  return `<div class="lab-fields">${field('波形',select('waveform',['sine','triangle','sawtooth','square'],s.waveform,w=>({sine:'正弦',triangle:'三角',sawtooth:'锯齿',square:'方波'}[w])))}${field('空间',select('space',['dry','echo','room'],s.space,e=>({dry:'干声',echo:'短延迟',room:'短混响'}[e])))}</div>${range('attack','起音时间',s.attack,.005,.6,.005,'秒')}${range('release','释放时间',s.release,.03,1.2,.01,'秒')}<svg class="envelope-plot" viewBox="0 0 500 125" role="img" aria-label="包络示意，横轴时间，纵轴相对响度"><path d="M24 100H480M24 100V14" fill="none" stroke="currentColor" opacity=".2"/><path d="M24 100L${45+s.attack*200} 20L${90+s.attack*200} 48H${340-s.release*50}L470 100" fill="none" stroke="currentColor" stroke-width="2"/><text x="28" y="119" font-size="10" fill="currentColor">起音 → 持续 → 释放；示意而非测量曲线</text></svg><p class="lab-help">固定音高、节奏和整体音量，比较波形与包络。延迟及混响为浏览器内合成预设；改变参数后从头试听。</p>`;
}
function form(s) {
  return `<div class="section-sequence">${s.order.map((id,i)=>`<span data-section-index="${i}">${id==='Aprime'?'A′':id}</span>`).join('')}</div><div class="lab-fields">${field('正在编辑',select('selectedClip',['A','B','Aprime'],s.selectedClip,id=>id==='Aprime'?'A′':id))}${field('结构模型',`<select id="lab-order" data-lab-field="order">${options(['ABA','AB','AABA'],s.order.length===2?'AB':s.order.length===4?'AABA':'ABA',v=>({ABA:'A—B—A′',AB:'A—B',AABA:'A—A—B—A′'}[v]))}</select>`)}</div>${melodyEditor(s.clips[s.selectedClip])}<div class="preset-row"><button class="btn btn-small" data-lab-action="clip" type="button">只听当前片段</button><button class="btn btn-small" data-lab-action="copy-a" type="button">从A复制材料到当前片段</button></div><p class="lab-help">A、B、A′分别保存。每片段四小节；最多四个片段位置组成十六小节。结构名称提供观察框架，实际段落也要结合材料和听觉证据。</p>`;
}
export async function handleLabAction(button,s,host) {
  const action=button.dataset.labAction;
  if(action==='play'){if(host.playing())host.stop();else await host.play(labModel(s),s.bpm);return;}
  if(action==='note'){await host.preview(button.dataset.note);return;}
  if(action==='pitch'){s.pitch=Number(button.dataset.midi);host.touch();await host.preview(midiToNote(s.pitch));host.render();return;}
  if(action==='midi') {const model=labModel(s);if(s.type==='layers'&&!supportsEnsemble(s))model.events=model.events.filter(e=>s.layers[e.layer]);host.download(encodeMidi(model,s.bpm),'tingjian-'+s.type+'.mid','audio/midi');return;}
  if(supportsTimed(s)&&await timedAction(button,s,host))return;
  if(supportsEnsemble(s)&&await ensembleAction(button,s,host))return;
  if(supportsDevelopment(s)&&await developmentAction(button,s,host))return;
  if(supportsFoundation(s)&&await foundationAction(button,s,host))return;
  if(supportsNotation(s)&&await notationAction(button,s,host))return;
  if(supportsCollections(s)&&await collectionsAction(button,s,host))return;
  if(supportsTonal(s)&&await tonalAction(button,s,host))return;
  const variants={texture:'texture',reference:'reference',root:'root',smooth:'smooth','rhythm-a':'A','melody-a':'A',clip:'clip'};
  if(variants[action]){await host.play(labModel(s,variants[action]),s.bpm,variants[action]);return;}
  if(action==='layer')s.layers[button.dataset.role]=!s.layers[button.dataset.role];
  else if(action==='solo')s.layers={melody:false,bass:true,rhythm:false};
  else if(action==='all')s.layers={melody:true,bass:true,rhythm:true};
  else if(action==='drum'){const row=s.drums[button.dataset.role],index=Number(button.dataset.index);row[index]=(row[index]+1)%3;}
  else if(action==='save-rhythm'){s.drumsA=copy(s.drums);host.notify('已保留当前节奏为A，之后的修改成为B。');}
  else if(action==='reset-rhythm'){s.drums=drumPattern(s.meter);}
  else if(action==='interval-preset')s.intervalNotes=button.dataset.pair.split(',');
  else if(action==='invert-interval') {const lower=s.intervalNotes.map(noteToMidi);const i=lower[0]<=lower[1]?0:1;const p=parseNote(s.intervalNotes[i]);if(p.midi+12>96){host.notify('已到本实验C2至C7的范围边界，请先输入较低的音。');return;}s.intervalNotes[i]=p.letter+(p.accidental>0?'#'.repeat(p.accidental):'b'.repeat(-p.accidental))+(p.octave+1);}
  else if(action==='diatonic'){const c=diatonicChords(s.root,s.mode)[Number(button.dataset.index)];await host.play(chordModel(c.root,c.quality),s.bpm);return;}
  else if(action==='repeat')s.melody=Array.from({length:4},()=>[...s.melody.slice(0,4)]).flat();
  else if(action==='variation')s.melody.splice(12,4,'G4','E4','D4','C4');
  else if(action==='save-melody'){s.melodyA=[...s.melody];host.notify('已保留当前旋律为草稿A。');}
  else if(action==='copy-a')s.clips[s.selectedClip]=[...s.clips.A];
  else return;
  host.touch();host.render();host.restart();
}
export async function handleLabField(target,s,host,eventType='change') {
  const key=target.dataset.labField;if(!key)return;
  try {
    if(supportsTimed(s)&&await timedField(target,s,host,eventType))return;
    if(supportsEnsemble(s)&&await ensembleField(target,s,host,eventType))return;
    if(supportsDevelopment(s)&&await developmentField(target,s,host,eventType))return;
    if(supportsFoundation(s)&&await foundationField(target,s,host,eventType))return;
    if(supportsNotation(s)&&await notationField(target,s,host,eventType))return;
    if(supportsCollections(s)&&await collectionsField(target,s,host,eventType))return;
    if(supportsTonal(s)&&await tonalField(target,s,host,eventType))return;
    if(['bpm','attack','release'].includes(key)) {
      s[key]=Math.max(Number(target.min),Math.min(Number(target.max),Number(target.value)));host.touch();
      const output=document.querySelector(`[data-readout="${key}"]`);if(output)output.textContent=s[key]+(key==='bpm'?' BPM':'秒');
      if(eventType==='change'){host.render(target.id);host.restart();}return;
    }
    if(eventType!=='change')return;
    if(key==='root'){parseNote(target.value);s.root=target.value;}
    else if(key==='mode'&&MODES[target.value])s.mode=target.value;
    else if(key==='quality'&&CHORDS[target.value]){s.quality=target.value;s.inversion=0;}
    else if(key==='inversion')s.inversion=Number(target.value);
    else if(key==='progression'&&PROGRESSIONS[target.value])s.progression=target.value;
    else if(key==='beatsPerChord')s.beatsPerChord=Number(target.value);
    else if(['smooth','harmonic','withBass'].includes(key))s[key]=target.checked;
    else if(key==='meter'&&METERS[target.value]){s.meter=target.value;s.drums=drumPattern(s.meter);s.drumsA=drumPattern(s.meter);}
    else if(key==='interval-a'||key==='interval-b'){const p=parseNote(target.value);if(p.midi<36||p.midi>96)throw new Error('此实验请使用C2至C7的音高。');s.intervalNotes[key==='interval-a'?0:1]=p.name;}
    else if(key==='pitch'){s.pitch=Number(target.value);host.touch();await host.preview(midiToNote(s.pitch));host.render(target.id);return;}
    else if(key==='waveform'&&['sine','triangle','sawtooth','square'].includes(target.value))s.waveform=target.value;
    else if(key==='space'&&['dry','echo','room'].includes(target.value))s.space=target.value;
    else if(key==='selectedClip'&&['A','B','Aprime'].includes(target.value))s.selectedClip=target.value;
    else if(key==='order')s.order=target.value==='AB'?['A','B']:target.value==='AABA'?['A','A','B','Aprime']:['A','B','Aprime'];
    else if(key==='melody') {const value=target.value||null;if(value&&!MELODY_NOTES.includes(value))return;const notes=s.type==='form'?s.clips[s.selectedClip]:s.melody;notes[Number(target.dataset.index)]=value;}
    else return;
    host.touch();host.render(target.id);host.restart();
  }catch(error){host.notify(error.message);}
}
