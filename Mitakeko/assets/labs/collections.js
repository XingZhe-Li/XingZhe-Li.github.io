import { esc,pretty,options,noteChips } from '../ui.js';
import { MODES,parseNote,noteToMidi,scaleNotes,transposeOctaves,diatonicChords,intervalBetween } from '../music/theory.js';
import { chordModel } from '../music/models.js';
import { scoreView } from '../cases/notation.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const NOTES_MIN=36,NOTES_MAX=96;
const COMPARISONS={dorian:{reference:'naturalMinor',current:'dorian',indices:[4,5,6,7],label:'自然小调 ↔ Dorian（第6级）'},mixolydian:{reference:'major',current:'mixolydian',indices:[4,5,6,7],label:'大调 ↔ Mixolydian（第7级）'},lydian:{reference:'major',current:'lydian',indices:[2,3,4,7],label:'大调 ↔ Lydian（第4级）'}};
const keys=['collectionPath','collectionDirection','collectionClassical','collectionEdited','collectionPhrase','collectionDrone','collectionDroneNote','collectionComparison','collectionCenter'];
const field=(label,control)=>`<label class="lab-field"><span>${label}</span>${control}</label>`;
const select=(key,values,value,label=v=>v)=>`<select id="lab-collections-${key}" data-lab-field="collections-${key}">${options(values,value,label)}</select>`;
const button=(action,label,extra='')=>`<button class="btn btn-small" type="button" data-lab-action="collections-${action}" ${extra}>${label}</button>`;
const noteInput=(key,note,label,index='')=>`<input id="lab-collections-${key}${index}" data-lab-field="collections-${key}" ${index!==''?`data-index="${index}"`:''} type="text" maxlength="6" value="${esc(note||'')}" aria-label="${esc(label)}" spellcheck="false">`;
const check=(key,label,value)=>`<label class="check-row"><input type="checkbox" data-lab-field="collections-${key}" ${value?'checked':''}>${label}</label>`;
const validNote=(note,min=NOTES_MIN,max=NOTES_MAX)=>{try{const midi=parseNote(note).midi;return midi>=min&&midi<=max;}catch{return false;}};
const derived=(root,mode)=>{const notes=scaleNotes(root,mode);if(!notes.every(note=>validNote(note)))throw new RangeError('派生音阶需保持在C2—C7范围内。');return notes;};
const droneFor=root=>noteToMidi(root)>=48?transposeOctaves(root,-1):root;
const comparisonFor=mode=>Object.hasOwn(COMPARISONS,mode)?mode:'none';
const profilePhrase=(root,mode)=>{const notes=derived(root,mode),indices=COMPARISONS[mode]?.indices||(notes.length===8?[4,5,6,7]:[0,1,2,notes.length-1]);return indices.map(i=>notes[i]);};
const snapshot=s=>copy({root:s.root,mode:s.mode,...Object.fromEntries(keys.map(key=>[key,s[key]]))});

export const supportsCollections=s=>s.type==='scale';
export function collectionsDefaults(type,config={}) {
  if(type!=='scale')return {};
  let root=config.root||'C4',mode=Object.hasOwn(MODES,config.mode)?config.mode:'major';
  try{if(!validNote(root,36,84))throw Error();derived(root,mode);root=parseNote(root).name;}catch{root='C4';mode='major';}
  const center=root==='A3'&&mode==='naturalMinor'?'white-A':'scale';
  const out={root,mode,collectionPath:center==='white-A'||Object.hasOwn(COMPARISONS,mode)?'phrase':'scale',collectionDirection:'up',collectionClassical:false,collectionEdited:derived(root,mode),collectionPhrase:center==='white-A'?['C4','B3','A3','A3']:profilePhrase(root,mode),collectionDrone:center==='white-A'||Object.hasOwn(COMPARISONS,mode),collectionDroneNote:droneFor(root),collectionComparison:comparisonFor(mode),collectionCenter:center};
  out.collectionsA=snapshot(out);return out;
}

function normalizedDraft(raw,fallback) {
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return copy(fallback);
  const out=copy(fallback);
  try{
    const root=raw.root??out.root,mode=raw.mode??out.mode;
    if(validNote(root,36,84)&&Object.hasOwn(MODES,mode)){derived(root,mode);out.root=parseNote(root).name;out.mode=mode;}
    else return out;
  }catch{return out;}
  const formula=derived(out.root,out.mode);
  for(const [key,values] of [['collectionPath',['scale','phrase']],['collectionDirection',['up','down','up-down']],['collectionComparison',['none',...Object.keys(COMPARISONS)]],['collectionCenter',['scale','white-A','white-C']]])if(values.includes(raw[key]))out[key]=raw[key];
  for(const key of ['collectionClassical','collectionDrone'])if(typeof raw[key]==='boolean')out[key]=raw[key];
  if(validNote(raw.collectionDroneNote,36,84))out.collectionDroneNote=parseNote(raw.collectionDroneNote).name;
  out.collectionEdited=Array.isArray(raw.collectionEdited)&&raw.collectionEdited.length===formula.length&&raw.collectionEdited.every(note=>validNote(note))?raw.collectionEdited.map(note=>parseNote(note).name):formula;
  if(Array.isArray(raw.collectionPhrase)&&raw.collectionPhrase.length===4&&raw.collectionPhrase.every(note=>note===null||validNote(note)))out.collectionPhrase=raw.collectionPhrase.map(note=>note===null?null:parseNote(note).name);
  return out;
}
export function normalizeCollections(raw,out) {
  if(!supportsCollections(out))return out;
  const fresh=collectionsDefaults('scale',{root:out.root,mode:out.mode});
  const cleaned=normalizedDraft(raw,snapshot(fresh));
  out.root=cleaned.root;out.mode=cleaned.mode;
  for(const key of keys)out[key]=copy(cleaned[key]);
  out.collectionsA=normalizedDraft(raw?.collectionsA,fresh.collectionsA);
  return out;
}

export function collectionScalePath(s,reference=false) {
  const up=reference?derived(s.root,s.mode):s.collectionEdited;
  const down=s.collectionClassical&&s.mode==='melodicMinor'?derived(s.root,'naturalMinor').reverse():[...up].reverse();
  return s.collectionDirection==='down'?down:s.collectionDirection==='up-down'?[...up,...down.slice(1)]:[...up];
}
const centered=id=>id==='white-A'?{root:'A3',mode:'naturalMinor',collectionPhrase:['C4','B3','A3','A3'],collectionDroneNote:'A2'}:{root:'C4',mode:'major',collectionPhrase:['E4','D4','C4','C4'],collectionDroneNote:'C3'};
export function collectionPhraseData(s,reference=false) {
  if(!reference)return {notes:s.collectionPhrase,drone:s.collectionDroneNote};
  const comparison=COMPARISONS[s.collectionComparison];
  if(comparison){const notes=derived(s.root,comparison.reference);return {notes:comparison.indices.map(i=>notes[i]),drone:s.collectionDroneNote};}
  if(s.collectionCenter==='white-A'||s.collectionCenter==='white-C'){const other=centered(s.collectionCenter==='white-A'?'white-C':'white-A');return {notes:other.collectionPhrase,drone:other.collectionDroneNote};}
  return {notes:profilePhrase(s.root,s.mode),drone:s.collectionDroneNote};
}
export function collectionsModel(input,variant='current') {
  const s=variant==='A'?{...input,...input.collectionsA}:input;
  const reference=variant==='reference',events=[];
  if(s.collectionPath==='scale') {
    const notes=collectionScalePath(s,reference),beats=notes.length*.5+.5;
    notes.forEach((note,i)=>events.push({beat:i*.5,duration:i===notes.length-1?1:.5,note,kind:'tone',layer:'melody',velocity:.62,channel:0,partId:'line'}));
    if(s.collectionDrone)events.push({beat:0,duration:beats,note:s.collectionDroneNote,kind:'tone',layer:'bass',velocity:.35,channel:1,partId:'drone'});
    return {beats,events,meta:{meter:'4/4',beatUnit:'四分音符',stepsPerBeat:2}};
  }
  const phrase=collectionPhraseData(s,reference);
  phrase.notes.forEach((note,i)=>{if(note)events.push({beat:i,duration:i===3?3:1,note,kind:'tone',layer:'melody',velocity:.64,channel:0,partId:'line'});});
  if(s.collectionDrone)events.push({beat:0,duration:8,note:phrase.drone,kind:'tone',layer:'bass',velocity:.35,channel:1,partId:'drone'});
  return {beats:8,events,meta:{meter:'4/4',beatUnit:'四分音符',stepsPerBeat:2}};
}

function resetMaterial(s) {
  s.collectionEdited=derived(s.root,s.mode);s.collectionPhrase=profilePhrase(s.root,s.mode);s.collectionDroneNote=droneFor(s.root);s.collectionComparison=comparisonFor(s.mode);s.collectionCenter='scale';
}
function chordTable(s) {
  if(derived(s.root,s.mode).length!==8)return [];
  return diatonicChords(s.root,s.mode).map(chord=>{
    let root=chord.root,notes=[...chord.notes];
    while(Math.max(...notes.map(noteToMidi))>96){root=transposeOctaves(root,-1);notes=notes.map(note=>transposeOctaves(note,-1));}
    return {...chord,root,notes};
  });
}
export function collectionConstructionEvidence(s) {
  const formula=derived(s.root,s.mode),notes=s.collectionEdited;
  const changed=notes.flatMap((note,i)=>note===formula[i]?[]:[{degree:i+1,note,expected:formula[i],samePitch:noteToMidi(note)===noteToMidi(formula[i])}]);
  const steps=notes.slice(1).map((note,i)=>noteToMidi(note)-noteToMidi(notes[i]));
  return {changed,steps,formula};
}
export function collectionPhraseEvidence(s) {
  const writtenClass=note=>parseNote(note).name.replace(/-?\d$/,'');
  const formulaSet=new Map(derived(s.root,s.mode).map(note=>[noteToMidi(note)%12,writtenClass(note)]));
  return collectionPhraseData(s).notes.map(note=>{
    if(!note)return {note:null,soundingMember:false,writtenMember:false,expected:null};
    const expected=formulaSet.get(noteToMidi(note)%12)??null;
    return {note,soundingMember:expected!==null,writtenMember:expected===writtenClass(note),expected};
  });
}
function referenceLabel(s) {
  if(s.collectionPath==='scale')return '听公式音阶对照';
  if(COMPARISONS[s.collectionComparison])return '听'+MODES[COMPARISONS[s.collectionComparison].reference].label+'短句';
  if(['white-A','white-C'].includes(s.collectionCenter))return '听同白键集合中的'+(s.collectionCenter==='white-A'?'C':'A')+'中心模型';
  return '听当前集合的公式短句';
}
export function collectionScoreParts(s) {
  const model=collectionsModel(s),parts=['line','drone'].map(id=>{
    const sounds=model.events.filter(e=>e.partId===id).sort((a,b)=>a.beat-b.beat),events=[];let end=0;
    for(const event of sounds){
      if(event.beat>end+1e-8)events.push({beat:end,duration:event.beat-end,notes:[]});
      events.push({beat:event.beat,duration:event.duration,notes:[event.note]});end=event.beat+event.duration;
    }
    if((sounds.length||id==='line')&&end<model.beats-1e-8)events.push({beat:end,duration:model.beats-end,notes:[]});
    return {id,name:id==='line'?'当前材料线':'可选参照低音',clef:id==='line'?'treble':'bass',events};
  }).filter(part=>part.events.length);
  if(!parts.length)parts.push({id:'line',name:'休止草稿',clef:'treble',events:[{beat:0,duration:model.beats,notes:[]}]});
  return parts;
}
function score(s) {
  const model=collectionsModel(s);
  return scoreView({id:'collection-draft',title:'原创音阶与中心模型',originalModel:true,meter:'4/4',beatsPerBar:4,bars:Math.ceil(model.beats/4),barBeats:Array.from({length:Math.ceil(model.beats/4)},(_,i)=>Math.min(4,model.beats-i*4))},{id:'current',label:'当前原创草稿',parts:collectionScoreParts(s)});
}
export function collectionsView(s) {
  const evidence=collectionConstructionEvidence(s),table=chordTable(s);
  const changed=evidence.changed.length?evidence.changed.map(item=>`第${item.degree}音${pretty(item.note)}，公式为${pretty(item.expected)}${item.samePitch?'（同响、拼写不同）':''}`).join('；'):'当前草稿与所选公式一致。';
  const inputScale=evidence.formula.map((note,i)=>field(`音级位置${i+1} · 公式${pretty(note)}`,noteInput('degree',s.collectionEdited[i],`音阶第${i+1}音`,String(i)))).join('');
  const phraseInfo=collectionPhraseEvidence(s).map(({note,soundingMember,writtenMember,expected},i)=>{
    if(!note)return `${i+1}:休止`;
    return `${i+1}:${pretty(note)}${!soundingMember?'（集合外）':writtenMember?'（集合内）':`（音高类别在集合内；公式拼写为${pretty(expected)}）`}`;
  }).join('；');
  const minor=evidence.formula.length===8&&['naturalMinor','harmonicMinor','melodicMinor'].includes(s.mode)?`第6→7级为${intervalBetween(evidence.formula[5],evidence.formula[6]).label}；第7→高主音为${intervalBetween(evidence.formula[6],evidence.formula[7]).label}。`:'';
  const spellingRule=evidence.formula.length===8?'八度终点除外，核对七个字母各出现一次。':'五声音集按所选音级核对，不要求七个字母齐全。';
  return `<div class="lab-fields">${field('起点／主音参照',noteInput('root',s.root,'音阶起点'))}${field('集合模型',select('mode',Object.keys(MODES),s.mode,id=>MODES[id].label))}${field('播放材料',select('path',['scale','phrase'],s.collectionPath,id=>id==='scale'?'音阶构造与方向':'短句与中心线索'))}</div><p class="lab-help">更换起点或集合会重置当前音阶草稿和短句；已保存的A独立保留。所有片段为原创教学模型，不自动判定实际作品的调中心。</p>
    <label class="check-row"><input type="checkbox" data-lab-field="collections-drone" ${s.collectionDrone?'checked':''}>加入持续参照低音</label><div class="lab-fields">${field('参照低音',noteInput('drone-note',s.collectionDroneNote,'持续参照低音音名'))}</div>
    ${s.collectionPath==='scale'?`<div class="lab-fields">${field('音阶方向',select('direction',['up','down','up-down'],s.collectionDirection,id=>({up:'上行',down:'下行','up-down':'上行后下行'}[id])))}</div>${check('classical','旋律小调采用古典音阶练习下行还原',s.collectionClassical)}<p class="lab-help">普通下行反转当前草稿；勾选后，旋律小调的下行段改用自然小调公式，第6、7级还原，上行仍用当前草稿。这是一种练习约定，不是所有下降旋律的规则；爵士旋律小调常双向使用升6、7的集合。</p><div class="lab-fields">${inputScale}</div><div class="preset-row">${button('formula','将草稿还原为公式')}${button('white','改成同字母自然音路径')}</div><p class="lab-help" data-collections-evidence>${esc(changed)} 相邻有向半音差：${evidence.steps.join('、')}。${minor}同响不等于拼写身份相同；${spellingRule}</p>`:`<div class="lab-fields">${field('同中心单音级对照',select('comparison',['none',...Object.keys(COMPARISONS)],s.collectionComparison,id=>id==='none'?'自由短句／中心比较':COMPARISONS[id].label))}${s.collectionPhrase.map((note,i)=>field(`第${i+1}音 · 第${i+1}拍起，持续${i===3?3:1}拍`,noteInput('phrase',note,`短句第${i+1}音`,String(i)))).join('')}</div><div class="preset-row">${button('center','共享白键：C中心','data-center="white-C"')}${button('center','共享白键：A中心','data-center="white-A"')}</div><p class="lab-help" data-collections-evidence>${esc(phraseInfo)}。短句总长8拍，空白输入为休止，最后一音后有2拍留白；参照低音可独立撤去。${s.collectionCenter==='white-A'||s.collectionCenter==='white-C'?'C/A两个模型共享白键集合，但旋律轮廓与低音共同改变，不能称为严格移调。':'当前短句以'+pretty(s.root)+'为主音参照，音级对照沿用同一参照。'}不能把末音或低音单独当成调性证明。</p><p class="lab-help">同中心对照加载相同节奏的公式短句：Dorian只改第6级，Mixolydian只改第7级，Lydian只改第4级。之后的自由修改可能改变多个音，需根据实际草稿重新核验。</p>`}
    <div class="preset-row">${button('reference',referenceLabel(s))}${button('save','保留当前为A')}${button('a','听草稿A')}</div><p class="lab-help">${JSON.stringify(snapshot(s))===JSON.stringify(s.collectionsA)?'当前与A相同。':'当前与已保存A存在音符、方向或参照设置差异。'}A保存音符、集合、方向、短句及低音设置；两版沿用当前BPM。</p>
    <details><summary>查看当前发声音名、谱例与时值表</summary>${noteChips(s.collectionPath==='scale'?collectionScalePath(s):s.collectionPhrase.filter(Boolean))}${score(s)}</details>
    ${table.length?`<details><summary>进阶选看（U06后）：按公式七声音阶叠三度</summary><p class="lab-help">为保持C2—C7试听范围，过高的和弦整体降低八度；级数与性质保持，音名列出实际配置。</p><div class="diatonic-grid">${table.map((c,i)=>`<button class="diatonic-cell" type="button" data-lab-action="collections-diatonic" data-index="${i}"><strong>${c.numeral}</strong><span>${pretty(c.symbol)}</span><small>${c.notes.map(pretty).join(' · ')}</small></button>`).join('')}</div></details>`:'<p class="lab-help">五声音集不套用七级叠三度表；其文化与风格身份需要具体传统和音乐语境，不能仅由五个音决定。</p>'}`;
}

export async function collectionsAction(buttonNode,s,host) {
  const action=buttonNode.dataset.labAction;
  if(!supportsCollections(s)||!action?.startsWith('collections-'))return false;
  const key=action.slice(12);
  if(key==='a'||key==='reference'){await host.play(collectionsModel(s,key==='a'?'A':'reference'),s.bpm,key==='a'?'A':'reference');return true;}
  if(key==='diatonic'){const chord=chordTable(s)[Number(buttonNode.dataset.index)];if(chord)await host.play(chordModel(chord.root,chord.quality),s.bpm,'reference');return true;}
  try {
    if(key==='save'){s.collectionsA=snapshot(s);host.notify('已保留音阶、短句与参照设置为A。');}
    else if(key==='formula')s.collectionEdited=derived(s.root,s.mode);
    else if(key==='white'){const notes=derived(s.root,s.mode).map(note=>{const p=parseNote(note);return p.letter+p.octave;});if(!notes.every(note=>validNote(note)))throw new Error('自然音路径超出C2—C7，请先调整起点。');s.collectionEdited=notes;}
    else if(key==='center'&&['white-A','white-C'].includes(buttonNode.dataset.center)){Object.assign(s,centered(buttonNode.dataset.center));s.collectionPath='phrase';s.collectionDrone=true;s.collectionComparison='none';s.collectionCenter=buttonNode.dataset.center;s.collectionEdited=derived(s.root,s.mode);}
    else return false;
    host.touch();host.render();host.restart();
  }catch(error){host.notify(error.message);}
  return true;
}
export async function collectionsField(target,s,host,eventType='change') {
  const fieldName=target.dataset.labField;
  if(!supportsCollections(s)||!fieldName?.startsWith('collections-'))return false;
  if(eventType!=='change')return true;
  const key=fieldName.slice(12),value=target.value,index=Number(target.dataset.index);
  try {
    if(key==='root'){const note=parseNote(value).name;if(!validNote(note,36,84))throw new Error('起点请使用C2—C6，并保证派生音阶不超过C7。');derived(note,s.mode);s.root=note;resetMaterial(s);}
    else if(key==='mode'&&Object.hasOwn(MODES,value)){derived(s.root,value);s.mode=value;resetMaterial(s);}
    else if(key==='path'&&['scale','phrase'].includes(value))s.collectionPath=value;
    else if(key==='direction'&&['up','down','up-down'].includes(value))s.collectionDirection=value;
    else if(key==='classical')s.collectionClassical=target.checked;
    else if(key==='drone')s.collectionDrone=target.checked;
    else if(key==='drone-note'){if(!validNote(value,36,84))throw new Error('参照低音请使用C2—C6。');s.collectionDroneNote=parseNote(value).name;}
    else if(key==='degree'&&Number.isInteger(index)&&index>=0&&index<s.collectionEdited.length){if(!validNote(value))throw new Error('音阶草稿请使用C2—C7的有效音名。');s.collectionEdited[index]=parseNote(value).name;}
    else if(key==='phrase'&&Number.isInteger(index)&&index>=0&&index<4){const note=value.trim()?parseNote(value).name:null;if(note&&!validNote(note))throw new Error('短句请使用C2—C7，留空表示休止。');s.collectionPhrase[index]=note;}
    else if(key==='comparison'&&['none',...Object.keys(COMPARISONS)].includes(value)){
      if(value!=='none'){derived(s.root,COMPARISONS[value].current);s.mode=COMPARISONS[value].current;resetMaterial(s);s.collectionDrone=true;}
      s.collectionComparison=value;s.collectionCenter='scale';
    }
    else return false;
    host.touch();host.render(target.id);host.restart();
  }catch(error){host.notify(error.message);host.render(target.id);}
  return true;
}
