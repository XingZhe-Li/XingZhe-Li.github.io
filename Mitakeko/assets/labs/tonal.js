import { esc,pretty,options,noteChips } from '../ui.js';
import { ROOTS,CHORDS,PROGRESSIONS,parseNote,noteToMidi,chordNotes,chordSymbol,scaleNotes,diatonicChords,intervalBetween,transposeOctaves,closestVoicing } from '../music/theory.js';
import { chordModel,progressionModel,progressionVoicings } from '../music/models.js';
import { scoreView } from '../cases/notation.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const finiteNote=n=>{try{const p=parseNote(n);return p.midi>=36&&p.midi<=96;}catch{return false;}};
const pc=n=>noteToMidi(n)%12;
const name=n=>parseNote(n).name.replace(/-?\d$/,'');
const tone=(note,beat,duration,partId,channel,velocity=.55,layer='melody')=>({note,beat,duration,kind:'tone',layer,partId,channel,velocity});
const field=(label,control)=>`<label class="lab-field"><span>${label}</span>${control}</label>`;
const select=(key,values,current,label=v=>v)=>`<select id="lab-tonal-${key}" data-lab-field="tonal-${key}">${options(values,current,label)}</select>`;
const button=(key,label,extra='')=>`<button type="button" class="btn btn-small" data-lab-action="tonal-${key}" ${extra}>${label}</button>`;
const check=(key,label,value)=>`<label class="check-row"><input data-lab-field="tonal-${key}" type="checkbox" ${value?'checked':''}>${label}</label>`;
export const supportsTonal=s=>s.type==='chord'&&s.scenario!=='nonchord'||s.type==='voicing'&&s.scenario!=='counterpoint'||s.type==='progression'&&!['harmonic-rhythm','reharmonization'].includes(s.scenario);
export function tonalDefaults(type,config={}) {
  if(!supportsTonal({type,scenario:config.scenario}))return {};
  return {tonalExtension:'none',tonalCustom:false,tonalUpper:['C4','E4','G4'],tonalBassOn:false,tonalBass:'C3',tonalKey:'C4',tonalPattern:'preset',tonalCadence:'off',tonalCadenceBass:'root',tonalContext:'ending',tonalVoiceMode:type==='voicing'?(config.progression==='jazz251'?'guides':'course'):'preset',tonalVoiceOffsets:Array.from({length:3},()=>Array(7).fill(0)),tonalSecondaryTarget:'ii',tonalBorrowed:'iv',tonalGuides:false,tonalModalMelody:false,tonalPedal:false,tonalDensity:'full',tonalColor:false,tonalLastHold:false,tonalOnce:true,tonalA:null};
}
const enums={tonalExtension:['none','9','maj9'],tonalKey:['C4','G3','D4','F3'],tonalPattern:['preset','ii251'],tonalCadence:['off','PAC','IAC','HC','deceptive'],tonalCadenceBass:['root','first'],tonalContext:['ending','middle'],tonalVoiceMode:['preset','course','guides'],tonalSecondaryTarget:['ii','V'],tonalBorrowed:['iv','bVI','bVII'],tonalDensity:['full','half']};
const booleans=['tonalCustom','tonalBassOn','tonalGuides','tonalModalMelody','tonalPedal','tonalColor','tonalLastHold','tonalOnce'];
const keys=[...Object.keys(enums),...booleans,'tonalUpper','tonalBass','tonalVoiceOffsets'];
function normalizeFields(raw,out) {
  if(!raw||typeof raw!=='object')return;
  for(const [key,values] of Object.entries(enums))if(values.includes(raw[key]))out[key]=raw[key];
  for(const key of booleans)if(typeof raw[key]==='boolean')out[key]=raw[key];
  if(Array.isArray(raw.tonalUpper)&&raw.tonalUpper.length>=1&&raw.tonalUpper.length<=8&&raw.tonalUpper.every(finiteNote))out.tonalUpper=raw.tonalUpper.map(n=>parseNote(n).name);
  if(finiteNote(raw.tonalBass))out.tonalBass=parseNote(raw.tonalBass).name;
  if(Array.isArray(raw.tonalVoiceOffsets)&&raw.tonalVoiceOffsets.length===3&&raw.tonalVoiceOffsets.every(row=>Array.isArray(row)&&row.length===7&&row.every(n=>[-1,0,1].includes(n))))out.tonalVoiceOffsets=raw.tonalVoiceOffsets.map(row=>[...row]);
}
const snapshot=s=>Object.fromEntries(['root','quality','inversion','progression','smooth','beatsPerChord','withBass',...keys].map(k=>[k,copy(s[k])]));
export function normalizeTonal(raw,out) {
  if(!supportsTonal(out))return out;
  normalizeFields(raw,out);
  if(raw?.tonalA&&typeof raw.tonalA==='object'){
    const candidate={...out,tonalA:null};normalizeFields(raw.tonalA,candidate);
    if(finiteNote(raw.tonalA.root)&&noteToMidi(raw.tonalA.root)<=84)candidate.root=parseNote(raw.tonalA.root).name;
    for(const [key,registry] of [['quality',CHORDS],['progression',PROGRESSIONS]])if(Object.hasOwn(registry,raw.tonalA[key]))candidate[key]=raw.tonalA[key];
    if(Number.isInteger(raw.tonalA.inversion)&&raw.tonalA.inversion>=0&&raw.tonalA.inversion<CHORDS[candidate.quality].intervals.length)candidate.inversion=raw.tonalA.inversion;else candidate.inversion=0;
    for(const key of ['smooth','withBass'])if(typeof raw.tonalA[key]==='boolean')candidate[key]=raw.tonalA[key];
    if([1,2,4].includes(raw.tonalA.beatsPerChord))candidate.beatsPerChord=raw.tonalA.beatsPerChord;
    try{chordNotes(candidate.root,candidate.quality);chordMembers(candidate);out.tonalA=snapshot(candidate);}catch{}
  }
  try{chordMembers(out);}catch{out.tonalExtension='none';}
  return out;
}
export function chordMembers(s) {
  if(s.tonalExtension==='none')return chordNotes(s.root,s.quality);
  const notes=[...chordNotes(s.root,s.tonalExtension==='9'?'dom7':'maj7'),transposeOctaves(scaleNotes(s.root,'major')[1],1)];
  if(!notes.every(finiteNote))throw new Error('九和弦模型的全部成员请保持C2—C7；先把根音降低。');
  return notes;
}
function upper(s) {return s.tonalCustom?s.tonalUpper:s.tonalExtension==='none'?chordNotes(s.root,s.quality,s.inversion):chordMembers(s);}
function chordSound(s,solo) {
  if(!s.tonalCustom&&!s.tonalBassOn&&s.tonalExtension==='none'&&!['upper','bass'].includes(solo))return {...chordModel(s.root,s.quality,s.inversion),meta:{loop:!s.tonalOnce}};
  const notes=upper(s),beats=Math.max(5,2+notes.length*.5),events=[];
  if(solo!=='bass'){
    notes.forEach(note=>events.push(tone(note,0,2,'upper',0)));
    notes.forEach((note,i)=>events.push(tone(note,2+i*.5,.42,'upper',0,.7)));
  }
  if(s.tonalBassOn&&solo!=='upper')events.push(tone(s.tonalBass,0,2,'bass',1,.6,'bass'));
  return {beats,events,meta:{loop:!s.tonalOnce}};
}
const reference=s=>({modulationG:'tonicizationG',tonicizationG:'modulationG',modal:'modalMinor',modalMinor:'modal',borrowed:'borrowedReference',borrowedReference:'borrowed',secondary:'secondaryDiatonic',secondaryDiatonic:'secondary',deceptive:'authentic'}[s.progression]||'deceptive');
const letters=['C','D','E','F','G','A','B'],natural=[0,2,4,5,7,9,11];
/** C-key relationship transposition retains both staff displacement and chromatic displacement. */
export function transposeFromC(note,target) {
  const n=parseNote(note),t=parseNote(target),position=n.octave*7+n.index+(t.octave*7+t.index-28),index=((position%7)+7)%7,octave=Math.floor(position/7),midi=n.midi+t.midi-60,delta=midi-((octave+1)*12+natural[index]);
  if(Math.abs(delta)>2)throw new Error('该移调需要超出重升降号的拼写。');
  const result=letters[index]+(delta>0?'#'.repeat(delta):'b'.repeat(-delta))+octave;if(!finiteNote(result))throw new Error('移调后超出C2—C7。');return result;
}
function harmonicFrames(s,variant) {
  const ref=variant==='reference',preset=ref?reference(s):s.progression;
  let frames=progressionVoicings(preset,s.smooth);
  const make=items=>items.map(([root,quality,numeral])=>({root,quality,numeral,notes:chordNotes(root,quality)}));
  if(s.progression==='secondary'&&s.tonalSecondaryTarget==='V')frames=make([['C4','major','I'],['D4',ref?'minor':'dom7',ref?'ii':'V7/V'],['G3','major','V'],['G3','dom7','V7'],['C4','major','I']]);
  if(s.progression==='borrowed'&&s.tonalBorrowed!=='iv')frames=make([['C4','major','I'],['F4','major','IV'],s.tonalBorrowed==='bVI'?[ref?'A3':'Ab3',ref?'minor':'major',ref?'vi':'♭VI']:[ref?'B3':'Bb3',ref?'diminished':'major',ref?'vii°':'♭VII'],['C4','major','I']]);
  if(['authentic','triads','deceptive','jazz251'].includes(s.progression)){
    if(s.tonalPattern==='ii251')frames=make([['C4','major','I'],['D4','minor','ii'],['G4','dom7','V7'],['C4','major','I']]);
    if(s.tonalKey!=='C4')frames=frames.map(frame=>({...frame,root:transposeFromC(frame.root,s.tonalKey),notes:frame.notes.map(n=>transposeFromC(n,s.tonalKey))}));
  }
  if(s.tonalColor){
    frames=make([['C4','major','色彩1'],['Eb4','major','色彩2'],['Ab3','major','色彩3'],['C4','major','返回']]);
    if(ref?!s.smooth:s.smooth){let previous=null;frames=frames.map(frame=>{const notes=closestVoicing(frame.notes,previous);previous=notes;return {...frame,notes};});}
  }
  return frames;
}
const COURSE={roots:['C3','F2','G2','C3'],lines:[['E4','F4','F4','E4'],['G4','A4','G4','G4'],['C5','C5','B4','C5']],labels:['I','IV','V7（省略D）','I']};
const GUIDES={roots:['D3','G2','C3'],lines:[['F4','F4','E4'],['C5','B4','B4']],labels:['ii7（三、七音）','V7（七、三音）','Imaj7（三、七音）']};
function voiceParts(s) {
  const source=s.tonalVoiceMode==='guides'?GUIDES:COURSE;
  return {...source,lines:source.lines.map((line,j)=>line.map((n,i)=>transposeOctaves(n,s.tonalVoiceOffsets[j][i])))};
}
function voicesSound(s,variant) {
  if(s.tonalVoiceMode==='preset'||['root','smooth'].includes(variant))return {...progressionModel(s.progression,{smooth:variant==='root'?false:variant==='smooth'?true:s.smooth,beatsPerChord:s.beatsPerChord,withBass:s.withBass}),meta:{loop:!s.tonalOnce}};
  const parts=voiceParts(s),events=[],len=s.beatsPerChord;
  parts.lines.forEach((line,j)=>line.forEach((note,i)=>events.push(tone(note,i*len,len,'voice-'+j,j))));
  if(s.withBass)parts.roots.forEach((note,i)=>events.push(tone(note,i*len,len,'bass',3,.6,'bass')));
  return {beats:parts.roots.length*len,events:variant==='bass'||variant.startsWith('voice-')?events.filter(e=>e.partId===variant):events,meta:{loop:!s.tonalOnce}};
}
function cadenceSound(s,variant) {
  const id=s.tonalCadence,count=id==='HC'?3:4,roots=['C3','F2','G2',id==='deceptive'?'A2':'C3'];
  if(s.tonalCadenceBass==='first')roots[count-1]=id==='HC'?'B2':id==='deceptive'?'C3':'E3';
  const lines=[['E4','F4','F4','E4'],['G4','A4','B4','C5'],['E5','F5','D5',id==='IAC'?'E5':'C5']];
  const events=[],len=s.beatsPerChord;
  for(let i=0;i<count;i++){
    const duration=i===count-1?len*2:len;
    events.push(tone(roots[i],i*len,duration,'bass',3,.6,'bass'));
    lines.forEach((line,j)=>events.push(tone(line[i],i*len,duration,'voice-'+j,j)));
  }
  let beats=(count+1)*len;
  if(s.tonalContext==='middle'){
    for(const [root,quality] of [['F3','major'],['G3','dom7']]){chordNotes(root,quality).forEach(n=>events.push(tone(n,beats,len,'continuation',4)));beats+=len;}
  }
  return {beats,events:variant==='bass'||variant.startsWith('voice-')?events.filter(e=>e.partId===variant):events,meta:{loop:!s.tonalOnce,cadence:id,context:s.tonalContext}};
}
function guideLines(s,variant) {
  const ref=variant==='reference';
  if(s.progression==='secondary')return s.tonalSecondaryTarget==='V'?[['E4',ref?'F4':'F#4','G4','F4','E4'],['G4',ref?'A4':'C5','B4','B4','C5']]:[['E4',ref?'C4':'C#4','D4','B3','C4'],['G4',ref?'E4':'G4','F4','F4','E4']];
  if(s.progression==='borrowed')return [['G4','A4',s.tonalBorrowed==='iv'?(ref?'A4':'Ab4'):s.tonalBorrowed==='bVI'?(ref?'A4':'Ab4'):(ref?'B4':'Bb4'),'G4']];
  if(['modal','modalMinor'].includes(s.progression))return [['C5','B4',(ref?reference(s):s.progression)==='modal'?'F#4':'F4','A4']];
  if(['modulationG','tonicizationG'].includes(s.progression))return (variant==='reference'?reference(s):s.progression)==='modulationG'?[['G4','A4','F#4','G4','A4','F#4','G4']]:[['G4','A4','F#4','G4','F4','E4']];
  return [];
}
function progressionSound(s,variant) {
  const frames=harmonicFrames(s,variant),events=[],len=s.beatsPerChord,hold=s.tonalLastHold&&!s.tonalColor&&['authentic','triads','deceptive','jazz251'].includes(s.progression);
  frames.forEach((frame,i)=>{const length=hold&&i===frames.length-1?len*2:len;for(const note of frame.notes)events.push(tone(note,i*len,length,'chords',0,.43));if(s.withBass)events.push(tone(transposeOctaves(frame.root,-1),i*len,length,'bass',1,.7,'bass'));});
  const guides=guideLines(s,variant),solo=variant.startsWith('guide-');
  if((s.tonalGuides||solo)&&!s.tonalColor)guides.forEach((line,j)=>line.forEach((note,i)=>{if(i<frames.length)events.push(tone(note,i*len,len,'guide-'+j,j+2,.6));}));
  if(s.tonalModalMelody&&['modal','modalMinor'].includes(s.progression)&&!s.tonalColor){
    const minor=(variant==='reference'?reference(s):s.progression)==='modalMinor',notes=['A3','C4','E4','C4','B3','D4','G4','D4','D4',minor?'F4':'F#4','A4',minor?'F4':'F#4','C4','B3','A3',null];
    notes.forEach((note,i)=>{if(note&&(s.tonalDensity==='full'||i%2===0))events.push(tone(note,i*len/4,Math.min(i===14?len/2:len/4,frames.length*len-i*len/4),'modal-melody',4,.65));});
  }
  if(s.tonalPedal&&['modal','modalMinor'].includes(s.progression)&&!s.tonalColor)events.push(tone('A2',0,frames.length*len,'pedal',5,.4,'bass'));
  return {beats:(frames.length+(hold?1:0))*len,events:solo?events.filter(e=>e.partId===variant):events,meta:{loop:!s.tonalOnce,meter:'4/4',beatUnit:'四分音符',stepsPerBeat:2,chordStarts:frames.map((_,i)=>i*len)}};
}
export function tonalModel(input,variant='current') {
  const s=variant==='A'&&input.tonalA?{...input,...copy(input.tonalA)}:input;
  const model=s.type==='chord'?chordSound(s,variant):s.type==='voicing'?voicesSound(s,variant):s.tonalCadence!=='off'?cadenceSound(s,variant):progressionSound(s,variant);
  const label=variant.startsWith('voice-')?'上方声部'+(Number(variant.slice(6))+1):variant.startsWith('guide-')?'导向线'+(Number(variant.slice(6))+1):({bass:s.type==='chord'?'独立低音':'低音线',upper:'上方配置'}[variant]);
  if(label)model.meta={...model.meta,playbackLabel:label};
  return model;
}
export function chordEvidence(s) {
  const members=chordMembers(s),notes=upper(s),all=s.tonalBassOn?[...notes,s.tonalBass]:notes,lowest=[...all].sort((a,b)=>noteToMidi(a)-noteToMidi(b))[0],memberNames=members.map(name),actualNames=[...new Set(notes.map(name))];
  return {members,lowest,symbol:(s.tonalExtension==='none'?chordSymbol(s.root,s.quality):name(s.root)+s.tonalExtension)+(name(lowest)===name(s.root)?'':'/'+name(lowest)),memberIndex:memberNames.indexOf(name(lowest)),missing:memberNames.filter(n=>!actualNames.includes(n)),extra:actualNames.filter(n=>!memberNames.includes(n))};
}
function inversionText(s,evidence) {
  if(evidence.missing.length||evidence.extra.length)return '自写配置尚未符合目标成员，先核对成员后再按实际最低音判断';
  if(evidence.memberIndex<0)return '不属于所选和弦，是和弦外低音，不能称作它的转位';
  const degrees=s.tonalExtension==='none'?CHORDS[s.quality].degrees:[0,2,4,6,8],degree=degrees[evidence.memberIndex];
  const role=({0:'根音',1:'二音',2:'三音',3:'四音',4:'五音',6:'七音',8:'九音'})[degree]||'成员';
  const ordinary=degrees.every((d,i)=>d===i*2)&&[3,4].includes(degrees.length);
  if(ordinary)return role+'在最低处，为'+(evidence.memberIndex===0?'原位':'第'+evidence.memberIndex+'转位');
  return role+'在最低处；sus或扩展配置用斜线标明低音，不套用本课三／七和弦的转位编号';
}
function chordView(s) {
  const evidence=chordEvidence(s),members=evidence.members;
  const ordinary=[3,4].includes(CHORDS[s.quality].degrees.length)&&CHORDS[s.quality].degrees.every((d,i)=>d===i*2);
  const bassName=i=>({0:'根音',1:'二音',2:'三音',3:'四音',4:'五音',6:'七音',8:'九音'}[CHORDS[s.quality].degrees[i]])||'成员';
  const names=members.map(name),derivation=members.map((n,i)=>`<tr><td>${pretty(n)}</td><td>${(s.tonalExtension==='none'?({0:'根音',1:'二音',2:'三音',3:'四音',4:'五音',6:'七音',8:'九音'}[CHORDS[s.quality].degrees[i]]):['根音','三音','五音','七音','九音'][i])||'成员'}</td><td>${intervalBetween(s.root,n).label} / ${Math.abs(noteToMidi(n)-noteToMidi(s.root))}半音</td></tr>`).join('');
  return `<div class="lab-fields">${field('根音',select('root',[...new Set([...ROOTS,s.root])],s.root,pretty))}${field('性质',select('quality',Object.keys(CHORDS),s.quality,q=>CHORDS[q].label))}${field(ordinary?'转位（自动基础配置）':'最低成员（自动基础配置）',select('inversion',Array.from({length:CHORDS[s.quality].intervals.length},(_,i)=>i),s.inversion,i=>ordinary?(i?'第'+i+'转位':'原位'):bassName(i)+'在最低处').replace('<select ',s.tonalCustom||s.tonalExtension!=='none'?'<select disabled ':'<select '))}${field('完整九和弦模型',select('extension',['none','9','maj9'],s.tonalExtension,v=>({none:'按基础性质',9:'属九：大三＋小七＋九',maj9:'大九：大三＋大七＋九'}[v])))}</div><h3 class="small-heading">目标构成音（用来核对）</h3>${noteChips(members)}<p class="lab-help">自动配置按所选根音、性质、转位发声；勾选自写后，性质成为核对目标，实际使用下方输入的上方音，改性质不会自动替换自写音。先取消自写可回到自动配置。</p><h3 class="small-heading">当前实际发声的上方配置</h3>${noteChips(upper(s))}<p class="lab-help">${s.tonalBassOn?'另加独立低音'+pretty(s.tonalBass)+'；齐奏时参与。':'未另加独立低音。'}主播放先齐奏约两拍，再从第3拍依次分解上方成员；下方手唱各四拍的任务需自己数拍，按钮不会自动连奏四种性质。</p><div class="relationship-result"><strong>${evidence.missing.length||evidence.extra.length?'待核对：':''}${pretty(evidence.symbol)}</strong><span>目标和弦身份＋实际低音；根音${pretty(s.root)}，最低音${pretty(evidence.lowest)}</span></div><div class="lab-table-wrap"><table class="lab-event-table"><thead><tr><th>成员拼写</th><th>成员角色</th><th>距根音</th></tr></thead><tbody>${derivation}</tbody></table></div><p class="lab-help">先按根、三、五（再加七、九）核对字母，再量实际音程。sus2/sus4的第二成员是二音/四音，不是三音；表中叠三度角色只适用于三度结构。sus与add模型请直接核对音名及距根音的度数。${members.length>=3?`最初三成员的相邻距离：${intervalBetween(members[0],members[1]).label}，${intervalBetween(members[1],members[2]).label}。`:''}</p>${check('custom','使用下方自写上方配置（可作构造与开放配音练习）',s.tonalCustom)}${field('上方音名，空格分隔',`<input id="lab-tonal-upper" data-lab-field="tonal-upper" value="${esc(s.tonalUpper.join(' '))}" aria-label="自写和弦上方配置">`)}<div class="preset-row">${button('copy-derived','从当前性质复制构成音')}${button('open','把第二成员移高八度')}</div>${check('bass-on','另加独立低音，上方音符保持原位',s.tonalBassOn)}${field('独立低音',`<input id="lab-tonal-bass" data-lab-field="tonal-bass-note" value="${esc(s.tonalBass)}" aria-label="独立低音音名">`)}<div class="preset-row">${['C3','E3','G2','D3'].map(n=>button('bass-preset',pretty(n),`data-note="${n}"`)).join('')}${button('upper','只听上方')}${button('bass','只听独立低音',s.tonalBassOn?'':'disabled')}</div><p class="lab-help" data-tonal-evidence>实际最低音：${pretty(evidence.lowest)}；按当前成员拼写${inversionText(s,evidence)}。上方自写配置：${evidence.missing.length?'缺少 '+evidence.missing.map(pretty).join('、'):'成员齐全'}；${evidence.extra.length?'额外/异名拼写 '+evidence.extra.map(pretty).join('、'):'没有额外拼写'}。同键异名仍须按理论关系改正，程序不会把所有等音自动当作正确成员。</p>`;
}
function score(model,title) {
  const groups=new Map();for(const event of model.events){if(event.kind!=='tone')continue;const id=event.partId||event.layer;if(!groups.has(id))groups.set(id,{id,name:id==='bass'?'低音':id==='pedal'?'A持续参照':id==='modal-melody'?'调式旋律':id.startsWith('voice-')?'上方声部'+(Number(id.slice(6))+1):id,clef:id==='bass'||id==='pedal'?'bass':'treble',events:[]});const group=groups.get(id);let item=group.events.find(e=>e.beat===event.beat&&e.duration===event.duration);if(!item){item={beat:event.beat,duration:event.duration,notes:[]};group.events.push(item);}item.notes.push(event.note);}
  return scoreView({id:'tonal',originalModel:true,title,meter:'4/4',beatsPerBar:4,bars:Math.ceil(model.beats/4),barBeats:Array.from({length:Math.ceil(model.beats/4)},(_,i)=>Math.min(4,model.beats-i*4))},{id:'current',label:title,parts:[...groups.values()]});
}
export function voiceEvidence(s) {
  const parts=voiceParts(s);return parts.lines.map(line=>line.slice(1).map((note,i)=>({from:line[i],to:note,same:line[i]===note,distance:noteToMidi(note)-noteToMidi(line[i])})));
}
function voiceView(s) {
  const parts=voiceParts(s),evidence=voiceEvidence(s);
  return `<div class="lab-fields">${field('连接模型',select('voice-mode',['course','guides','preset'],s.tonalVoiceMode,v=>({course:'C—F—G7—C：低音＋三条上方线',guides:'Dm7—G7—Cmaj7：两条三七音导向线',preset:'完整和弦的邻近配置'}[v])))}</div>${s.tonalVoiceMode==='preset'?`${field('完整进行',select('progression',Object.keys(PROGRESSIONS),s.progression,p=>PROGRESSIONS[p].label))}${check('smooth','采用邻近配置（取消后听原位块状）',s.smooth)}<p class="lab-help">完整配置以原有邻近算法演示局部选择；逐条编辑与独听请选上面的三线或导向线模型。</p>`:`<p class="lab-help">${s.tonalVoiceMode==='course'?'G7在此明确省略五音D，上方F、G、B加G低音保留功能骨架。':'此处只奏三音/七音与根音低音：Dm7中省略A，G7中省略D，Cmaj7中省略G；不将它们误当成完整成员表。'}</p><div class="lab-table-wrap"><table class="lab-event-table"><thead><tr><th>声部</th>${parts.labels.map(l=>`<th>${l}</th>`).join('')}<th>独听</th></tr></thead><tbody>${parts.lines.map((line,j)=>`<tr><th>线${j+1}</th>${line.map((note,i)=>`<td>${pretty(note)}<br>${button('octave-up','↑8',`data-voice="${j}" data-frame="${i}"`)}${button('octave-down','↓8',`data-voice="${j}" data-frame="${i}"`)}</td>`).join('')}<td>${button('voice-'+j,'听线'+(j+1))}</td></tr>`).join('')}</tbody></table></div><p class="lab-help">${evidence.map((line,j)=>`线${j+1}：${line.map(e=>`${pretty(e.from)}→${pretty(e.to)}（${e.same?'原位保持':(e.distance>0?'上行':'下行')+Math.abs(e.distance)+'半音'}）`).join('；')}`).join('<br>')}。相同音名不同八度是移动，不能记作原位共同音。</p>${score(voicesSound(s,'current'),'独立声部的实际音高与时值')}`}`;
}
export function cadenceEvidence(s) {
  const model=cadenceSound(s,'current'),count=s.tonalCadence==='HC'?3:4,beat=(count-1)*s.beatsPerChord,notes=model.events.filter(e=>e.beat===beat).map(e=>e.note),bass=model.events.find(e=>e.beat===beat&&e.partId==='bass').note,top=[...notes].sort((a,b)=>noteToMidi(b)-noteToMidi(a))[0];
  return {bass,top,rootPosition:s.tonalCadenceBass==='root',tonicTop:pc(top)===0,ending:s.tonalContext==='ending'};
}
function progressionView(s) {
  const frames=harmonicFrames(s,'current'),g=s.tonalColor||s.tonalCadence!=='off'?[]:guideLines(s,'current');
  let controls=`<div class="lab-fields">${field('进行模型',select('progression',Object.keys(PROGRESSIONS),s.progression,p=>PROGRESSIONS[p].label))}${field('每和弦拍数',select('beats',[1,2,4],s.beatsPerChord,n=>n+'拍'))}</div>${check('smooth','上方采用邻近配置',s.smooth)}`;
  if(['authentic','triads','deceptive','jazz251'].includes(s.progression))controls+=`<div class="lab-fields">${field('同一关系的调',select('key',['C4','G3','D4','F3'],s.tonalKey,n=>pretty(name(n))+'大调'))}${field('关系模型',select('pattern',['preset','ii251'],s.tonalPattern,n=>n==='preset'?'所选原进行':'I—ii—V7—I'))}</div>${check('last-hold','只把最后和弦停留加倍，其余拍位不变',s.tonalLastHold)}<div class="diatonic-grid">${diatonicChords(s.tonalKey,'major').map((c,i)=>`<button type="button" class="diatonic-cell" data-lab-action="tonal-diatonic" data-index="${i}"><strong>${c.numeral}</strong><span>${pretty(c.symbol)}</span><small>${c.notes.map(pretty).join(' · ')}</small></button>`).join('')}</div>`;
  if(s.progression==='secondary')controls+=field('局部目标',select('secondary-target',['ii','V'],s.tonalSecondaryTarget,n=>n==='ii'?'Dm：A7的C♯→D，G→F':'G：D7的F♯→G，C→B'));
  if(s.progression==='borrowed')controls+=field('借用成员',select('borrowed',['iv','bVI','bVII'],s.tonalBorrowed,n=>({iv:'iv：F—A♭—C',bVI:'♭VI：A♭—C—E♭',bVII:'♭VII：B♭—D—F'}[n])));
  if(['modal','modalMinor'].includes(s.progression))controls+=`${check('modal-melody','加入以A为落点的原创旋律（第三小节六音随D/Dm对照）',s.tonalModalMelody)}${check('pedal','另加持续A2参照（中心线索之一）',s.tonalPedal)}${field('只删减旋律入口',select('density',['full','half'],s.tonalDensity,n=>n==='full'?'完整旋律':'只保留隔次起音'))}${check('color','替换为C—E♭—A♭—C共同音色彩模型',s.tonalColor)}`;
  controls+=`<div class="progression-frames" data-lab-playback="${s.tonalCadence==='off'?'current':'inactive'}">${frames.map((f,i)=>`<div class="progression-frame" data-lab-start="${i*s.beatsPerChord}" data-lab-end="${(i+1)*s.beatsPerChord}"><span>${f.numeral}</span><strong>${pretty(chordSymbol(f.root,f.quality))}</strong><small>${f.notes.map(pretty).join(' · ')}</small></div>`).join('')}</div><div class="preset-row">${button('reference',s.tonalColor?'听另一种配置（相同和弦）':'听对照进行',s.tonalCadence!=='off'?'disabled':'')}</div><p class="lab-help">当前模型的对照：${harmonicFrames(s,'reference').map(f=>pretty(chordSymbol(f.root,f.quality))).join('—')}。${s.tonalCadence!=='off'?'句末实验已开启，关闭后恢复这里的进行比较。':''}</p>`;
  if(g.length)controls+=`${check('guides','合奏中突出所列导向线',s.tonalGuides)}<p class="lab-help">${g.map((line,j)=>`导向线${j+1}：${line.map(pretty).join('—')}`).join('；')}。${s.progression==='modulationG'||s.progression==='tonicizationG'?'Am在C中为vi，在G中为ii；D7的F♯只是一条证据，继续的Am—D7—G与最终落点才加强G参照。':'这些线来自当前原创模型，不是录音转写。'}</p><div class="preset-row">${g.map((_,j)=>button('guide-'+j,'只听导向线'+(j+1))).join('')}</div>`;
  if(s.tonalModalMelody&&['modal','modalMinor'].includes(s.progression)&&!s.tonalColor&&s.tonalCadence==='off'){const actual=progressionSound(s,'current');controls+=`<details><summary>查看当前调式旋律与持续音的实际谱例</summary><p class="lab-help">与正文所列A3起句相同；只删减入口时，留下的音高与时值不变。参照低音只在勾选时列出。</p>${score({...actual,events:actual.events.filter(e=>['modal-melody','pedal'].includes(e.partId))},'当前调式旋律与A参照')}</details>`;}
  if(s.tonalColor)controls+='<p class="lab-help">色彩模型的原位配置保留实际共同音：C—E♭共享G4，E♭—A♭共享E♭4，A♭—C共享C4。共同音与局部移动可解释连接；没有因此证明它只能按某一种调内功能解释。对照切换原位与邻近配置，和弦身份、低音与时值保持；可再保存A作其他修订。</p>';
  controls+=`<details><summary>句末条件实验：属到主运动何时可称终止</summary><p class="lab-help">此实验固定C大调，独立于上方的调与进行选择；开启后取代上方播放模型。更改上方进行参数会退出句末实验；需要本文声部关系时请在这里重新选择。低音固定保留以检查根音位置，三条上方线可分别独听。</p><div class="lab-fields">${field('句末模型',select('cadence',['off','PAC','IAC','HC','deceptive'],s.tonalCadence,n=>({off:'关闭，使用上方进行',PAC:'V7—I，最高声部落C',IAC:'V7—I，最高声部落E',HC:'在V7停住',deceptive:'V7—vi，保留导向线'}[n])))}${field('末和弦低音',select('cadence-bass',['root','first'],s.tonalCadenceBass,n=>n==='root'?'根音':'改为三音'))}${field('句法语境',select('context',['ending','middle'],s.tonalContext,n=>n==='ending'?'作为模型句末停留':'后面继续F—G7，作为句中运动'))}</div>${s.tonalCadence!=='off'?`<p class="lab-help">${(()=>{const e=cadenceEvidence(s);return `本句末模型突出三条线：IV省略五音C，正格版I省略五音G，并有成员重复；它不是完整四部规则训练。实际末和弦低音${pretty(e.bass)}、最高发声音${pretty(e.top)}；${e.rootPosition?'末和弦根音位置':'末和弦已转位'}；${e.ending?'本模型用长时值停留作句末':'后面仍有延续，不能仅凭此运动断定句末终止'}。${s.tonalCadence==='PAC'||s.tonalCadence==='IAC'?e.rootPosition&&e.tonicTop&&e.ending?'本模型同时满足句末、V与I根音位置、最高声部落主音三个完全正格终止条件。':'完全正格条件未同时满足；按低音、最高声部及语境分别说明，不能因和弦含C就命名完全正格终止。':'这里检查停在V或转向vi的不同和弦去向；具体终止命名仍受句法与风格限制。'}`;})()}</p><div class="preset-row">${button('voice-0','只听七音解决线')}${button('voice-1','只听导音解决线')}${button('voice-2','只听最高声部')}${button('bass','只听低音')}</div><div data-lab-playback="current">${score(cadenceSound(s,'current'),'句末模型：低音、导向线与最高声部')}</div>`:'<p class="lab-help">选一个句末模型后，它会取代上方进行。先保持低音与语境不变，只在C/E最高声部之间比较；再单独改变低音或后续延续。</p>'}</details>`;
  return controls;
}
export function tonalView(s) {
  return `${s.type==='chord'?chordView(s):s.type==='voicing'?voiceView(s):progressionView(s)}${s.type!=='chord'&&!(s.type==='progression'&&s.tonalCadence!=='off')?check('bass','另加模型低音',s.withBass):''}${check('once','播放一遍后停止，保留末尾中心参照',s.tonalOnce)}<div class="preset-row">${button('save','保存当前设置为草稿A')}${button('a','听草稿A',s.tonalA?'':'disabled')}</div><p class="lab-help">原创教学材料。${s.tonalA?'草稿A保留保存时的音符配置与关系设置，回听沿用当前BPM。':'先保存A，再只改一个变量。'}音程拼写、声部移动与句末条件是可核对的证据，不自动给风格或音乐质量评分。</p>`;
}
export async function tonalAction(target,s,host) {
  const action=target.dataset.labAction;if(!action?.startsWith('tonal-')||!supportsTonal(s))return false;
  const key=action.slice(6);
  if(key==='a'){await host.play(tonalModel(s,'A'),s.bpm,'A');return true;}
  if((key==='reference'||key.startsWith('guide-'))&&s.type==='progression'&&s.tonalCadence!=='off'){host.notify('请先关闭固定C调句末实验，再听上方进行的对照或导向线；句末声部请使用下方专用按钮。');return true;}
  if(['reference','upper','bass'].includes(key)||key.startsWith('guide-')||key.startsWith('voice-')){await host.play(tonalModel(s,key),s.bpm,key);return true;}
  if(key==='diatonic'){const c=diatonicChords(s.tonalKey,'major')[Number(target.dataset.index)];if(c)await host.play(chordModel(c.root,c.quality),s.bpm,'diatonic');return true;}
  try{
    if(key==='save'){s.tonalA=snapshot(s);host.notify('已保存当前音乐设置为草稿A。');}
    else if(key==='copy-derived'){const notes=copy(s.tonalExtension==='none'?chordNotes(s.root,s.quality,s.inversion):chordMembers(s));if(!notes.every(finiteNote))throw new Error('复制为可编辑配置前，请把所有发声音降至C2—C7。');s.tonalUpper=notes;s.tonalCustom=true;}
    else if(key==='open'){const notes=copy(s.tonalCustom?s.tonalUpper:upper(s));if(notes.length<2)throw new Error('至少需要两个上方成员。');notes[1]=transposeOctaves(notes[1],1);if(!notes.every(finiteNote))throw new Error('移高后请保持C2—C7。');s.tonalUpper=notes;s.tonalCustom=true;}
    else if(key==='bass-preset'){if(!finiteNote(target.dataset.note))return true;s.tonalBass=target.dataset.note;s.tonalBassOn=true;}
    else if(key==='octave-up'||key==='octave-down'){const j=Number(target.dataset.voice),i=Number(target.dataset.frame),value=s.tonalVoiceOffsets[j]?.[i]+(key==='octave-up'?1:-1);if(![-1,0,1].includes(value))throw new Error('此声部事件允许相对原谱上下一个八度。');s.tonalVoiceOffsets[j][i]=value;}
    else return true;
    host.touch();host.render();host.restart();
  }catch(error){host.notify(error.message);}
  return true;
}
export async function tonalField(target,s,host,eventType='change') {
  const fieldName=target.dataset.labField;if(!fieldName?.startsWith('tonal-')||!supportsTonal(s))return false;
  if(eventType!=='change')return true;
  const key=fieldName.slice(6),value=target.value,own='tonal'+key.split('-').map(p=>p[0].toUpperCase()+p.slice(1)).join('');
  try{
    if(key==='root'){if(!finiteNote(value)||noteToMidi(value)>84)throw new Error('根音请使用C2—C6。');chordNotes(value,s.quality);const draft={...s,root:parseNote(value).name};chordMembers(draft);s.root=draft.root;}
    else if(key==='quality'&&Object.hasOwn(CHORDS,value)){chordNotes(s.root,value);s.quality=value;s.inversion=0;s.tonalExtension='none';}
    else if(key==='inversion'&&Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<CHORDS[s.quality].intervals.length)s.inversion=Number(value);
    else if(key==='progression'&&Object.hasOwn(PROGRESSIONS,value)){s.progression=value;s.tonalCadence='off';s.tonalColor=false;}
    else if(key==='beats'&&[1,2,4].includes(Number(value)))s.beatsPerChord=Number(value);
    else if(key==='smooth')s.smooth=target.checked;
    else if(key==='bass')s.withBass=target.checked;
    else if(key==='upper'){const notes=value.trim().split(/\s+/);if(notes.length<1||notes.length>8||!notes.every(finiteNote))throw new Error('请用空格分隔1—8个C2至C7音名，保留升降号与八度。');s.tonalUpper=notes.map(n=>parseNote(n).name);s.tonalCustom=true;}
    else if(key==='bass-note'){if(!finiteNote(value))throw new Error('独立低音请使用C2—C7。');s.tonalBass=parseNote(value).name;}
    else if(enums[own]?.includes(value)){if(own==='tonalExtension')chordMembers({...s,tonalExtension:value});s[own]=value;}
    else if(booleans.includes(own))s[own]=target.checked;
    else return true;
    if(s.type==='progression'&&!['cadence','cadence-bass','context','once','beats'].includes(key))s.tonalCadence='off';
    host.touch();host.render(target.id);host.restart();
  }catch(error){host.notify(error.message);host.render(target.id);}
  return true;
}
