import { esc, pretty, options } from '../ui.js';
import { chordNotes, chordSymbol, noteToMidi, parseNote, transposeOctaves } from '../music/theory.js';
import { scoreView } from '../cases/notation.js';

const copy = value => JSON.parse(JSON.stringify(value));
const WAVES = ['sine', 'triangle', 'sawtooth', 'square'];
const WAVE_LABELS = { sine:'正弦', triangle:'三角', sawtooth:'锯齿', square:'方波' };
const SPACES = { dry:'干声', echo:'短延迟', room:'短混响' };
const HARMONIES = { C:['C3','major'], Am:['A2','minor'], F:['F3','major'], Dm:['D3','minor'], G:['G3','major'], G7:['G3','dom7'], Em:['E3','minor'], Fm:['F3','minor'] };
const CLIPS = ['A','B','Aprime'];
function safeTimbreRoot(value) {
  try {
    const root=parseNote(value);if(root.midi<36||root.midi>84)return 'C4';
    chordNotes(root.name,'major');return root.name;
  }catch{return 'C4';}
}
const clipLabel = id => id === 'Aprime' ? 'A′' : id;
const field = (label, control) => `<label class="lab-field"><span>${label}</span>${control}</label>`;
const select = (name, values, value, label=v=>v, extra='') => `<select id="lab-dev-${name}${extra.match(/data-index="(\d+)"/)?.[1]??''}" data-lab-field="dev-${name}" ${extra}>${options(values,value,label)}</select>`;
const button = (action,label,extra='') => `<button class="btn btn-small" type="button" data-lab-action="dev-${action}" ${extra}>${label}</button>`;
const checkbox = (key,label,value) => `<label class="check-row"><input id="lab-dev-${key}" type="checkbox" data-lab-field="dev-${key}" ${value?'checked':''}>${label}</label>`;
const bounded = (value,min,max,fallback) => Number.isFinite(value) ? Math.max(min,Math.min(max,value)) : fallback;
const tone = (note,beat,duration,layer='melody',channel=2,velocity=.64,extra={}) => ({ note,beat,duration,kind:'tone',layer,channel,velocity,...extra });
const LEGACY_MELODY = [
  ['E4',0,2],['G4',2,1],['E4',3,1], ['A4',4,2],['G4',6,1],['E4',7,1],
  ['D4',8,2],['F4',10,1],['B3',11,1], ['E4',12,2],['D4',14,1],['C4',15,1]
];
const HARMONIC_MELODY=[['E4',0,1],['G4',1,1],['G4',2,1],['E4',3,1],['F4',4,1],['A4',5,1],['G4',6,1],['F4',7,1],['D4',8,1],['F4',9,1],['B4',10,1],['D5',11,1],['E5',12,1],['D5',13,1],['C5',14,2]];
const REHARM_MELODY=[['E4',0,1],['G4',1,1],['E4',2,2],['F4',4,2],['E4',6,1],['C4',7,1]];
const fixedMelody = s => (s.devMelodyProfile==='legacy'?LEGACY_MELODY:s.scenario==='reharmonization'?REHARM_MELODY:HARMONIC_MELODY).map(([n,b,d])=>tone(n,b,d));
const sectionDefaults = (wave='triangle',scale=1,octave=0,attack=.02,release=.18,sustain=false,tail=0) => ({ waveform:wave,scale,octave,attack,release,sustain,tail });
const formSnapshot = s => copy({clips:s.clips,order:s.order,sections:s.devSections});

function normalizedFormSnapshot(raw,fallback) {
  if(!raw||typeof raw!=='object'||!Array.isArray(raw.order)||raw.order.length<2||raw.order.length>4||!raw.order.every(id=>CLIPS.includes(id)))return copy(fallback);
  const result={clips:{},order:[...raw.order],sections:{}};
  for(const id of CLIPS){
    const notes=raw.clips?.[id],source=raw.sections?.[id];
    if(!Array.isArray(notes)||notes.length!==16||!source||typeof source!=='object')return copy(fallback);
    try{if(!notes.every(note=>note===null||(parseNote(note).midi>=36&&parseNote(note).midi<=96)))return copy(fallback);}catch{return copy(fallback);}
    if(![.5,1,2].includes(source.scale)||![-1,0,1].includes(source.octave)||!WAVES.includes(source.waveform))return copy(fallback);
    const section={waveform:source.waveform,scale:source.scale,octave:source.octave,attack:bounded(source.attack,.005,.6,fallback.sections[id].attack),release:bounded(source.release,.03,1.2,fallback.sections[id].release),sustain:source.sustain===true,tail:[0,1,2,4].includes(source.tail)?source.tail:0};
    if(notes.filter(Boolean).some(note=>{const midi=noteToMidi(transposeOctaves(note,section.octave));return midi<36||midi>96;}))section.octave=0;
    result.clips[id]=[...notes];result.sections[id]=section;
  }
  return result;
}

export function supportsDevelopment(s) {
  return ['timbre','form'].includes(s.type) || (s.type==='progression' && ['harmonic-rhythm','reharmonization'].includes(s.scenario)) || (s.type==='chord' && s.scenario==='nonchord');
}

export function developmentDefaults(type,config={}) {
  const scenario=config.scenario||'';
  if (!supportsDevelopment({type,scenario})) return {};
  const out={
    devDurations:[4,4,4,4],devDurationsA:[4,4,4,4],devMelodyProfile:'lesson', devHarmony:scenario==='reharmonization'?['Am','Am','Dm','C']:['C','F','G7','C'],
    devHarmonyA:scenario==='reharmonization'?['C','C','F','C']:['C','F','G7','C'], devNonchord:'passing', devReharmRepeats:1, devPhrase:scenario==='space'?'single':scenario==='delivery'?'delivery':config.phrase==='long'?'long':'short',
    devTimbreA:{waveform:'triangle',attack:.02,release:.18,space:'dry'},
    devSections:{ A:sectionDefaults(), B:sectionDefaults(), Aprime:sectionDefaults() }
  };
  if(type==='timbre')out.root=safeTimbreRoot(config.root||'C4');
  if (type==='form') {
    const A=['C4','E4','G4',null,'E4','D4','C4',null,'C4','E4','G4',null,'E4','D4','C4',null];
    const B=['G4','A4','B4','A4','G4',null,'D4',null,'G4','A4','B4','A4','G4','F4','D4',null];
    out.clips={A,B,Aprime:[...A.slice(0,12),'D4','B3','C4',null]};
    out.order=scenario==='song'?['A','A','B','Aprime']:['A','B','Aprime'];
    if(scenario==='ternary') {
      out.clips.A=['C4','D4','E4',null,'D4','E4','F4',null,'C4','D4','E4',null,'D4','E4','F4',null];
      out.clips.B=['G5',null,null,null,'F5',null,null,null,'E5',null,null,null,'D5',null,null,null];
      out.clips.Aprime=[...out.clips.A.slice(0,12),'C4',null,null,null];
      for(const id of CLIPS)out.devSections[id].sustain=true;
    }
    if (scenario==='sonata') {
      out.clips.A=['C4','E4','G4','E4','D4','C4','G4','C4','B4','A4','G4','F#4','G4','A4','B4','G4'];
      out.clips.B=['C4','E4',null,null,'D4','F4',null,null,'E4','G4',null,null,'F#4','A4',null,null];
      out.clips.Aprime=['C4','E4','G4','E4','D4','C4','G4','C4','E4','D4','C4','B3','C4','D4','E4','C4'];
      out.devSections.B=sectionDefaults('triangle',.5,0);
    }
    if (scenario==='timbre-form') {
      out.clips.A=['C4',null,'D4',null,'E4',null,'G4',null,'C4',null,'D4',null,'E4',null,'G4',null];
      out.clips.B=['G5',null,null,null,'F5',null,null,null,'E5',null,null,null,'D5',null,null,null];
      out.clips.Aprime=[...out.clips.A.slice(0,12),'E4',null,null,null];
      out.devSections.A.sustain=true;
      out.devSections.B=sectionDefaults('sine',1,0,.35,.9,true);
      out.devSections.Aprime=sectionDefaults('triangle',1,0,.02,.35,true,2);
    }
    out.devFormA=formSnapshot(out);
  }
  return copy(out);
}

export function normalizeDevelopment(raw,out) {
  if (!supportsDevelopment(out)) return out;
  if(raw.devMelodyProfile==='legacy'||raw.devMelodyProfile==='lesson')out.devMelodyProfile=raw.devMelodyProfile;
  else if(out.type==='progression'&&(raw.devHarmony||raw.devDurations))out.devMelodyProfile='legacy';
  if(out.type==='timbre')out.root=safeTimbreRoot(out.root);
  if([1,2,4].includes(raw.devReharmRepeats))out.devReharmRepeats=raw.devReharmRepeats;
  if(Array.isArray(raw.devDurations)&&raw.devDurations.length===4&&raw.devDurations.every(n=>Number.isFinite(n)&&n>=.5&&n<=14.5)&&Math.abs(raw.devDurations.reduce((a,b)=>a+b,0)-16)<1e-7)out.devDurations=[...raw.devDurations];
  if(Array.isArray(raw.devDurationsA)&&raw.devDurationsA.length===4&&raw.devDurationsA.every(n=>Number.isFinite(n)&&n>=.5&&n<=14.5)&&Math.abs(raw.devDurationsA.reduce((a,b)=>a+b,0)-16)<1e-7)out.devDurationsA=[...raw.devDurationsA];
  for(const key of ['devHarmony','devHarmonyA'])if(Array.isArray(raw[key])&&raw[key].length===4&&raw[key].every(id=>Object.hasOwn(HARMONIES,id)))out[key]=[...raw[key]];
  if(['passing','neighbor','suspension'].includes(raw.devNonchord))out.devNonchord=raw.devNonchord;
  if(['short','long','sparse','single','pair','dense','delivery'].includes(raw.devPhrase))out.devPhrase=raw.devPhrase;
  const settings=(source,target)=>{
    if(!source||typeof source!=='object')return;
    if(WAVES.includes(source.waveform))target.waveform=source.waveform;
    target.attack=bounded(source.attack,.005,.6,target.attack);target.release=bounded(source.release,.03,1.2,target.release);
  };
  settings(raw.devTimbreA,out.devTimbreA);
  if(Object.hasOwn(SPACES,raw.devTimbreA?.space))out.devTimbreA.space=raw.devTimbreA.space;
  for(const id of CLIPS){const source=raw.devSections?.[id],target=out.devSections[id];settings(source,target);if([.5,1,2].includes(source?.scale))target.scale=source.scale;if([-1,0,1].includes(source?.octave))target.octave=source.octave;if(source||raw.clips){target.sustain=source?.sustain===true;target.tail=[0,1,2,4].includes(source?.tail)?source.tail:0;}
    if(out.clips?.[id]?.filter(Boolean).some(note=>{const midi=noteToMidi(transposeOctaves(note,target.octave));return midi<36||midi>96;}))target.octave=0;
  }
  if(out.type==='form')out.devFormA=normalizedFormSnapshot(raw.devFormA,out.devFormA);
  return out;
}

function harmonicModel(s,variant) {
  const reharm=s.scenario==='reharmonization',lesson=s.devMelodyProfile!=='legacy';
  const ids=reharm?(variant==='A'||variant==='reference'?s.devHarmonyA:s.devHarmony):['C','F','G7','C'];
  const lengths=reharm?Array(4).fill(lesson?2:4):variant==='reference'?[4,4,4,4]:variant==='A'?s.devDurationsA:s.devDurations;
  const events=fixedMelody(s),starts=[],frames=[];let cursor=0;
  ids.forEach((id,i)=>{starts.push(cursor);const previous=frames.at(-1);if(reharm&&lesson&&previous?.id===id)previous.duration+=lengths[i];else frames.push({id,beat:cursor,duration:lengths[i]});cursor+=lengths[i];});
  for(const {id,beat,duration} of frames){const [root,quality]=HARMONIES[id];chordNotes(root,quality).forEach(note=>events.push(tone(note,beat,duration,'melody',0,.35)));if(s.withBass!==false)events.push(tone(transposeOctaves(root,-1),beat,duration,'bass',1,.55));}
  const repeats=reharm?(s.devReharmRepeats||1):1;return {beats:cursor*repeats,events:Array.from({length:repeats},(_,r)=>events.map(e=>({...e,beat:e.beat+r*cursor}))).flat(),meta:{meter:'4/4',stepsPerBeat:2,beatUnit:'四分音符',chordStarts:Array.from({length:repeats},(_,r)=>starts.map(b=>b+r*cursor)).flat()}};
}

function nonchordModel(s) {
  let melody,harmonies;
  if(s.devNonchord==='neighbor'){melody=[['E4',0,1],['F4',1,1],['E4',2,2]];harmonies=[['C3','major',0,4]];}
  else if(s.devNonchord==='suspension'){melody=[['F4',0,3],['E4',3,1]];harmonies=[['F3','major',0,2],['C3','major',2,2]];}
  else {melody=[['C4',0,1],['D4',1,1],['E4',2,2]];harmonies=[['C3','major',0,4]];}
  const events=melody.map(([n,b,d])=>tone(n,b,d));
  harmonies.forEach(([root,quality,beat,duration])=>chordNotes(root,quality).forEach(note=>events.push(tone(note,beat,duration,'bass',0,.35))));
  return {beats:4,events,meta:{meter:'4/4',stepsPerBeat:2,beatUnit:'四分音符'}};
}

function timbreModel(s,variant) {
  const setting=variant==='A'?s.devTimbreA:variant==='dry'?{...s,space:'dry'}:s;
  const chord=chordNotes(safeTimbreRoot(s.root),'major'),notes=s.scenario==='envelope'?Array(4).fill(chord[0]):[chord[0],chord[2],chord[1],chord[0]],duration=s.devPhrase==='long'?1.75:.35;
  const pattern=s.devPhrase==='delivery'?Array.from({length:8},(_,i)=>[notes[i%4],i*2]):s.devPhrase==='single'?[[chord[0],0]]:s.devPhrase==='pair'?[[chord[0],0],[chord[2],2]]:s.devPhrase==='dense'?Array.from({length:8},(_,i)=>[i%2?chord[2]:chord[0],i*.5]):notes.flatMap((note,i)=>s.devPhrase==='sparse'&&i%2===1?[]:[[note,i*2]]);
  const events=pattern.map(([note,beat])=>tone(note,beat,duration,'melody',2,.65,{waveform:setting.waveform,attack:setting.attack,release:setting.release}));
  return {beats:s.devPhrase==='delivery'?16:['single','pair','dense'].includes(s.devPhrase)?4:8,events,meta:{meter:'4/4',stepsPerBeat:2,beatUnit:'四分音符',space:setting.space}};
}

function formModel(s,variant) {
  if(variant==='A')s={...s,clips:s.devFormA.clips,order:s.devFormA.order,devSections:s.devFormA.sections};
  const order=variant==='clip'?[s.selectedClip]:s.order,events=[],boundaries=[];let cursor=0;
  for(const id of order){
    const setting=s.devSections[id],scale=setting.scale;
    boundaries.push(cursor);
    const limit=16-(setting.tail||0),indices=s.clips[id].flatMap((note,i)=>note&&i<limit?[i]:[]);
    indices.forEach((i,index)=>{const duration=setting.sustain?(indices[index+1]??limit)-i:Math.min(.82,limit-i);events.push(tone(transposeOctaves(s.clips[id][i],setting.octave),cursor+i*scale,duration*scale,'melody',2,.65,{waveform:setting.waveform,attack:setting.attack,release:setting.release}));});
    if(s.scenario==='sonata'){
      const maps={
        A:[['C3','major',0,4],['F3','major',4,2],['D3','dom7',6,2],['G3','major',8,4],['D3','dom7',12,2],['G3','major',14,2]],
        B:[['A2','minor',0,4],['D3','minor',4,4],['E3','minor',8,4],['D3','dom7',12,4]],
        Aprime:[['C3','major',0,4],['F3','major',4,2],['G3','dom7',6,2],['C3','major',8,4],['G3','dom7',12,2],['C3','major',14,2]]
      };
      for(const [root,quality,beat,duration] of maps[id]){
        if(beat>=limit)continue;
        for(const note of chordNotes(root,quality))events.push(tone(note,cursor+beat*scale,Math.min(duration,limit-beat)*scale,'bass',0,.32));
      }
    }
    cursor+=16*scale;
  }
  return {beats:cursor,events,meta:{meter:'4/4',stepsPerBeat:2,beatUnit:'四分音符',sectionStarts:boundaries}};
}

export function developmentModel(s,variant='current') {
  if(s.type==='progression')return harmonicModel(s,variant);
  if(s.type==='chord')return nonchordModel(s);
  if(s.type==='timbre')return timbreModel(s,variant);
  return formModel(s,variant);
}

export function developmentScoreData(model,title='当前模型') {
  const groups=[{id:'melody',name:'旋律',channel:2,clef:'treble'},{id:'harmony',name:'和声',channel:0,clef:'bass'},{id:'root-bass',name:'另加根音低音',channel:1,clef:'bass'}];
  const parts=groups.map(group=>{
    const grouped=new Map();
    for(const event of model.events.filter(event=>event.channel===group.channel)){
      const key=event.beat+':'+event.duration;
      if(!grouped.has(key))grouped.set(key,{beat:event.beat,duration:event.duration,notes:[]});
      grouped.get(key).notes.push(event.note);
    }
    const written=[],ordered=[...grouped.values()].sort((a,b)=>a.beat-b.beat);let end=0;
    for(const event of ordered){if(event.beat>end+1e-7)written.push({beat:end,duration:event.beat-end,notes:[]});written.push(event);end=Math.max(end,event.beat+event.duration);}
    if(end<model.beats-1e-7&&(ordered.length||group.channel===2))written.push({beat:end,duration:model.beats-end,notes:[]});
    return {...group,events:written};
  }).filter(part=>part.events.length);
  return {excerpt:{id:'development-model',title,originalModel:true,meter:'4/4',beatsPerBar:4,bars:model.beats/4},variant:{id:'current',label:'原创教学模型：'+title,parts}};
}
function miniatureScore(model,title){const {excerpt,variant}=developmentScoreData(model,title);return scoreView(excerpt,variant);}

function membership(s) {
  const unit=s.devMelodyProfile==='legacy'?4:2,model=harmonicModel(s,'current');
  return s.devHarmony.map((id,i)=>{const beat=i*unit,[root,quality]=HARMONIES[id],note=model.events.find(e=>e.channel===2&&e.beat<=beat&&e.beat+e.duration>beat)?.note;if(!note)return '';const member=chordNotes(root,quality).findIndex(n=>noteToMidi(n)%12===noteToMidi(note)%12);return `<tr><th scope="row">第${Math.floor(beat/4)+1}小节第${beat%4+1}拍</th><td>${pretty(note)}</td><td>${id}</td><td>${member>=0?'和弦内音 · '+['根音','三音','五音','七音'][member]:'不在基本和弦中；结合前后运动判断其处理'}</td></tr>`;}).join('');
}

function harmonyView(s) {
  const reharm=s.scenario==='reharmonization';let cursor=0;
  const rows=s.devDurations.map((duration,i)=>{const start=cursor;cursor+=duration;return `<div class="progression-frame" data-lab-start="${start}" data-lab-end="${cursor}"><strong>${['C','F','G7','C'][i]}</strong><small>起点：第${start+1}拍</small>${field('持续拍数',`<input data-lab-field="dev-duration" data-index="${i}" type="number" min=".5" max="14.5" step=".5" value="${duration}" aria-label="第${i+1}个和弦持续拍数">`)}</div>`;}).join('');
  if(reharm)return `<p class="lab-help">旋律音高、起点、时值与音量保持不变，只编辑下方分段伴奏。先比较首拍E：C和弦中是三音，Am和弦中是五音。</p><div class="lab-fields">${s.devHarmony.map((id,i)=>field(s.devMelodyProfile==='legacy'?`第${i+1}小节和弦`:`第${Math.floor(i/2)+1}小节${i%2?3:1}—${i%2?4:2}拍`,select('harmony',Object.keys(HARMONIES),id,v=>v,`data-index="${i}"`))).join('')}</div><div class="lab-fields">${field('重复两小节素材',select('reharm-repeats',[1,2,4],s.devReharmRepeats||1,n=>n+'次（'+n*(s.devMelodyProfile==='legacy'?4:2)+'小节）'))}</div><div class="preset-row">${button('harmony-c','正文甲：C｜F—C')}${button('harmony-am','正文乙：Am｜Dm—C')}${button('save-harmony','将伴奏保存为A')}${button('a','听伴奏A＋相同旋律')}</div><div style="max-width:100%;overflow-x:auto"><table class="case-score-table"><caption>每次伴奏入口与同时旋律音的关系</caption><thead><tr><th>位置</th><th>固定旋律</th><th>和弦</th><th>局部关系</th></tr></thead><tbody>${membership(s)}</tbody></table></div><p class="lab-help">这张表只检查音高类别是否属于基本和弦，不自动判定整句好坏。其余旋律音也要结合强弱拍、持续时间与解决方式听辨。</p>${miniatureScore(developmentModel(s),'固定旋律与可变和声')}`;
  return `<p class="lab-help">同一条16拍旋律与总长度保持不变。改变一个和弦的时长，会由相邻和弦补偿，避免把“和声变化”与“整首加速”混淆。</p><div class="progression-frames">${rows}</div><div class="preset-row">${button('regular','均匀：4＋4＋4＋4')}${button('delay','推迟末和弦：4＋4＋6＋2')}${button('reference','听均匀对照')}${button('save-rhythm','保存当前时点为A')}${button('a','听时点A')}</div><p class="lab-help">末C在第${s.devDurations.slice(0,3).reduce((a,b)=>a+b,0)+1}拍进入；正文旋律E5仍在第13拍进入（旧版草稿用E4）。比较这个E先落在G7之上、还是与C同时落下。各行最少半拍，四个和弦合计16拍。</p>${miniatureScore(developmentModel(s),'和声起点与相同旋律')}`;
}

function nonchordView(s) {
  const explanations={passing:'C4—D4—E4在C和弦之上：两端为和弦音，D4以级进连接。这里D处于较弱的位置；不能只凭“不在和弦里”就叫经过音。',neighbor:'E4—F4—E4在C和弦之上：从和弦音出发，向上级进后回到原音。F4是上邻音，不是连接不同两端的经过音。',suspension:'F4先是F和弦的根音，持续跨过第3拍的C和弦起点，相对C3低音形成纯十一度（四度类复音程）；第4拍下行到E4成为大十度。这是有准备的4—3延留的复音程形式。跨界处只延续，不再次起音。'};
  return `<div class="lab-fields">${field('旋律处理',select('nonchord',['passing','neighbor','suspension'],s.devNonchord,id=>({passing:'经过音',neighbor:'邻音',suspension:'有准备的延留'}[id])))}</div><p class="lab-help">${explanations[s.devNonchord]}</p>${miniatureScore(developmentModel(s),'和弦外音的前后文')}<p class="lab-help">先唱旋律，再留意每次背景和弦更换的位置；这些名称描述音符在特定语境中的运动方式，不能替代听觉判断。</p>`;
}

function timbreView(s) {
  const duration=s.devPhrase==='long'?1.75:.35, spacing=['sparse','single'].includes(s.devPhrase)?4:s.devPhrase==='dense'?.5:2, gap=spacing-duration;
  return `<div class="lab-fields">${field('起始音',`<input id="lab-dev-root" type="text" data-lab-field="dev-root" value="${esc(s.root)}" maxlength="6" spellcheck="false" aria-label="音色模型起始音">`)}${field('音符与留白',select('phrase',['single','pair','dense','short','long','sparse','delivery'],s.devPhrase,id=>({delivery:'四小节：MIDI交付示例',single:'一小节：首拍单音',pair:'一小节：第1、3拍两音',dense:'一小节：连续八分音符',short:'两小节：四个短音',long:'两小节：四个长音',sparse:'两小节：隔次删去起音'}[id])))}${field('波形',select('waveform',WAVES,s.waveform,id=>WAVE_LABELS[id]))}${field('空间',select('space',Object.keys(SPACES),s.space,id=>SPACES[id]))}</div>${['attack','release'].map((name,i)=>field(i?'释放时间（秒）':'起音时间（秒）',`<input id="lab-dev-${name}" type="range" data-lab-field="dev-${name}" min="${i?.03:.005}" max="${i?1.2:.6}" step="${i?.01:.005}" value="${s[name]}" aria-label="${i?'释放':'起音'}时间"><output>${s[name]}秒</output>`)).join('')}<div class="preset-row">${button('save-timbre','保存音色参数为A')}${button('a','听音色A（相同音符）')}${button('dry','听当前参数干声')}</div><p class="lab-help">起始音${pretty(s.root)}；${s.devPhrase==='delivery'?'本轮四小节16拍，八次起音每隔2拍出现':s.devPhrase==='single'?'本轮四拍，只有第1拍起音':s.devPhrase==='pair'?'本轮四拍，第1、3拍起音':s.devPhrase==='dense'?'本轮四拍，每半拍起音一次':s.devPhrase==='sparse'?'本轮八拍，保留第1、5拍起音，删去第3、7拍':'本轮八拍，四次起音每隔2拍出现'}。按键时值${duration}拍，下一音前有${gap}拍空隙。BPM=${s.bpm}时，空隙约${(gap*60/s.bpm).toFixed(2)}秒；当前释放${s.release}秒。短音/长音改变持续时间；隔次删去起音改变事件密度。起音过长时，短音的包络会自动压缩起音段。</p><details><summary>查看当前音符与时值谱例</summary>${miniatureScore(developmentModel(s),'音色模型的按键时序')}</details><p class="lab-help">A只保存波形、包络与空间参数，每次对照仍用当前完全相同的音高与时序。切换留白方案后，A与当前模型都采用该方案；要比较删减前后，保持音色不变，分别试听短音与隔次删去起音。延迟或混响可能填满空隙；释放与效果尾声也可越过下一音的起点。MIDI保留按键时序，波形与空间效果请在接收软件中另设。</p>`;
}

function formView(s) {
  const setting=s.devSections[s.selectedClip];let cursor=0;
  const map=s.order.map(id=>{const start=cursor;cursor+=16*s.devSections[id].scale;return `<span data-lab-start="${start}" data-lab-end="${cursor}">${clipLabel(id)} · ${start+1}—${cursor}拍</span>`;}).join('');
  const descriptions={song:'当前默认A—A—B—A′。重复的A共享同一材料；B形成对比，末段保留A身份并改变句尾。AABA是材料布局，不自动等于所有歌曲的主副歌。',sonata:'这是压缩的原创奏鸣曲功能模型：A前8拍陈述C调材料P，后8拍让材料S在G背景中出现（含F♯）；B把P的两音碎片模进，在Am、Dm、Em、D7背景上用一半时值加工；A′前8拍回到P，后8拍把S调整到C背景。听副部材料的调性归宿，而不只听“A回来”。它省略真实长曲的过渡、扩展与比例，不是任何原作的曲式结论。', 'timbre-form':'A与B可分别设置波形、包络、音区和时间比例。默认B采用较高音区长音与慢起音，A′恢复A的波形。把音色变化与实际段落边界一起听。',revision:'先确定要修订的是材料、句尾、比例还是音色。复制A到A′后只改变一项，并用“只听当前片段”确认；不要把所有维度同时改掉。',ternary:'A—B—A′：在返回中保留身份，并允许句尾、音区或配器改变。三个片段可有不同长度，地图直接显示实际拍数。'};
  return `<p class="lab-help">${descriptions[s.scenario]||descriptions.ternary}</p><div class="section-sequence">${map}</div><div class="lab-fields">${field('正在编辑',select('clip',CLIPS,s.selectedClip,clipLabel))}${field('排列顺序',select('order',['ABA','AB','AABA','AAprimeB'],s.order.join(',')==='A,Aprime,B'?'AAprimeB':s.order.length===2?'AB':s.order.length===4?'AABA':'ABA',id=>({ABA:'A—B—A′',AB:'A—B',AABA:'A—A—B—A′',AAprimeB:'A—A′—B'}[id])))}${field('片段时间比例',select('section-scale',[.5,1,2],setting.scale,n=>n+'倍（'+16*n+'拍）'))}${field('片段移高/低八度',select('section-octave',[-1,0,1],setting.octave,n=>n===0?'原音区':n>0?'高八度':'低八度'))}${field('末尾留白（原始拍数）',select('section-tail',[0,1,2,4],setting.tail||0,n=>n+'拍'))}${field('片段波形',select('section-waveform',WAVES,setting.waveform,id=>WAVE_LABELS[id]))}${field('片段起音（秒）',`<input data-lab-field="dev-section-attack" type="number" min=".005" max=".6" step=".005" value="${setting.attack}">`)}${field('片段释放（秒）',`<input data-lab-field="dev-section-release" type="number" min=".03" max="1.2" step=".01" value="${setting.release}">`)}</div>${checkbox('section-sustain','空格延续前音，直到下一起音或片段末尾留白开始',setting.sustain)}<div class="motif-grid">${[0,1,2,3].map(bar=>`<section class="motif-bar"><span>材料第${bar+1}组</span><div class="motif-beats">${[0,1,2,3].map(beat=>{const i=bar*4+beat;return field(`位置${i+1}${i>=16-(setting.tail||0)?'（尾声留白，不发声）':''}`,`<input data-lab-field="dev-clip-note" data-index="${i}" type="text" value="${esc(s.clips[s.selectedClip][i]||'')}" maxlength="6" placeholder="${setting.sustain?'延续前音':'休止'}" aria-label="${clipLabel(s.selectedClip)}位置${i+1}音名">`);}).join('')}</div></section>`).join('')}</div><div class="preset-row">${button('clip','只听当前片段')}${button('copy-a','将A材料复制到当前片段')}</div><p class="lab-help">每个位置间隔1拍，时间比例同时改变音符间距与时值。不勾选延续时，每个音按住0.82拍，空白为休止；勾选后，空格延续前音而不重新起音。末尾留白会截短持续音并静音该区已有音符，保留输入便于撤销。输入C4、B3、F#4或Bb4等音名，支持C2—C7；移八度后限制仍须满足。“将A材料复制到当前片段”只复制音名网格，时间比例、空格延续、末尾留白和音色仍沿用当前片段设置。当前全曲共${cursor}拍（${(cursor/4).toFixed(1)}个4/4小节）。同名片段在所有位置同步更新，A、B、A′的材料与音色分别保存。</p><details data-lab-playback="clip"><summary>查看当前片段谱例与时值</summary>${miniatureScore(developmentModel(s,'clip'),'当前片段')}</details>`;
}

export function developmentView(s) {
  if(s.type==='progression')return `${s.devMelodyProfile==='legacy'?'<p class="lab-help">这是恢复的旧版16拍旋律草稿；上方正文已校正，恢复本课起点后可载入与正文一致的例子。原草稿与伴奏A仍保留。</p>':''}${harmonyView(s)}`;
  if(s.type==='chord')return nonchordView(s);
  if(s.type==='timbre')return timbreView(s);
  const unchanged=JSON.stringify(formSnapshot(s))===JSON.stringify(s.devFormA);
  return formView(s)+`<div class="preset-row">${button('save-form','保存全曲初稿')}${button('a','听全曲初稿')}</div><p class="lab-help">${unchanged?'当前全曲与初稿相同。':'当前全曲已有修订，可与全曲初稿回听比较。'}全曲初稿保存全部片段音符、排列、时间比例、音区和音色；它与结构中的片段A是两回事。试听初稿与当前版本共用当前BPM，初稿不会随之后的编辑改变。</p>`;
}

export async function developmentAction(target,s,host) {
  const action=target.dataset.labAction;if(!action?.startsWith('dev-'))return false;
  const key=action.slice(4);
  if(['a','reference','dry','clip'].includes(key)){const variant=key==='a'?'A':key;await host.play(developmentModel(s,variant),s.bpm,variant);return true;}
  if(key==='save-rhythm'){s.devDurationsA=[...s.devDurations];host.notify('已保存当前四个和弦的时点为A。');}
  else if(key==='delay')s.devDurations=[4,4,6,2];
  else if(key==='regular')s.devDurations=[4,4,4,4];
  else if(key==='harmony-c')s.devHarmony=s.devMelodyProfile==='legacy'?['C','F','G7','C']:['C','C','F','C'];
  else if(key==='harmony-am')s.devHarmony=s.devMelodyProfile==='legacy'?['Am','Dm','G7','C']:['Am','Am','Dm','C'];
  else if(key==='save-harmony'){s.devHarmonyA=[...s.devHarmony];host.notify('已保存伴奏A；对照时旋律保持不变。');}
  else if(key==='save-timbre'){s.devTimbreA={waveform:s.waveform,attack:s.attack,release:s.release,space:s.space};host.notify('已保存音色A；对照采用相同音高与时序。');}
  else if(key==='save-form'&&s.type==='form'){s.devFormA=formSnapshot(s);host.notify('已保存全曲初稿；之后的片段、顺序与音色编辑不会改变它。');}
  else if(key==='copy-a')s.clips[s.selectedClip]=[...s.clips.A];
  else return false;
  host.touch();host.render();host.restart();return true;
}

export async function developmentField(target,s,host,eventType='change') {
  const fieldName=target.dataset.labField;if(!fieldName?.startsWith('dev-'))return false;
  if(eventType!=='change')return true;
  const key=fieldName.slice(4),value=target.value,index=Number(target.dataset.index);
  try {
    if(key==='duration'){
      const next=Number(value),other=index===3?2:index+1,delta=next-s.devDurations[index];
      if(!Number.isFinite(next)||next<.5||s.devDurations[other]-delta<.5)throw new Error('四个和弦合计16拍，每个至少半拍；请先从相邻和弦腾出时间。');
      s.devDurations[index]=next;s.devDurations[other]-=delta;
    }
    else if(key==='reharm-repeats'&&[1,2,4].includes(Number(value)))s.devReharmRepeats=Number(value);
    else if(key==='harmony'&&Object.hasOwn(HARMONIES,value))s.devHarmony[index]=value;
    else if(key==='nonchord'&&['passing','neighbor','suspension'].includes(value))s.devNonchord=value;
    else if(key==='phrase'&&['short','long','sparse','single','pair','dense','delivery'].includes(value))s.devPhrase=value;
    else if(key==='root'){const p=parseNote(value);if(p.midi<36||p.midi>84)throw new Error('起始音请使用C2—C6。');chordNotes(p.name,'major');s.root=p.name;}
    else if(key==='waveform'&&WAVES.includes(value))s.waveform=value;
    else if(key==='space'&&Object.hasOwn(SPACES,value))s.space=value;
    else if(key==='attack'||key==='release')s[key]=bounded(Number(value),key==='attack'?.005:.03,key==='attack'?.6:1.2,s[key]);
    else if(key==='clip'&&CLIPS.includes(value))s.selectedClip=value;
    else if(key==='order')s.order=value==='AB'?['A','B']:value==='AABA'?['A','A','B','Aprime']:value==='AAprimeB'?['A','Aprime','B']:['A','B','Aprime'];
    else if(key==='section-sustain')s.devSections[s.selectedClip].sustain=target.checked;
    else if(key==='section-tail'&&[0,1,2,4].includes(Number(value)))s.devSections[s.selectedClip].tail=Number(value);
    else if(key==='section-scale'&&[.5,1,2].includes(Number(value)))s.devSections[s.selectedClip].scale=Number(value);
    else if(key==='section-octave'&&[-1,0,1].includes(Number(value))){
      const octave=Number(value);if(s.clips[s.selectedClip].filter(Boolean).some(note=>{const midi=noteToMidi(transposeOctaves(note,octave));return midi<36||midi>96;}))throw new Error('移八度后请保持C2—C7范围。');s.devSections[s.selectedClip].octave=octave;
    }
    else if(key==='section-waveform'&&WAVES.includes(value))s.devSections[s.selectedClip].waveform=value;
    else if(key==='section-attack'||key==='section-release'){const name=key.slice(8);s.devSections[s.selectedClip][name]=bounded(Number(value),name==='attack'?.005:.03,name==='attack'?.6:1.2,s.devSections[s.selectedClip][name]);}
    else if(key==='clip-note'){
      const note=value.trim()?parseNote(value).name:null;if(note){const midi=noteToMidi(transposeOctaves(note,s.devSections[s.selectedClip].octave));if(midi<36||midi>96)throw new Error('片段发声音高请保持C2—C7范围。');}s.clips[s.selectedClip][index]=note;
    }
    else return false;
    host.touch();host.render(target.id);host.restart();return true;
  }catch(error){host.notify(error.message);host.render(target.id);return true;}
}
