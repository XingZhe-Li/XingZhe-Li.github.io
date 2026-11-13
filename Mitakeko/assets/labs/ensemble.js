import { esc, pretty, options } from '../ui.js';
import { noteToMidi, parseNote, transposeOctaves, intervalBetween } from '../music/theory.js';
import { meteredRhythmModel, drumPattern } from '../music/models.js';
import { scoreView } from '../cases/notation.js';

const copy = value => JSON.parse(JSON.stringify(value));
const clean = value => Number(value.toFixed(6));
const row = (note, beat, duration = 1) => ({ note, beat, duration });
const SCENARIOS = new Set(['groove', 'texture', 'register', 'counterpoint']);
const TYPES = { groove:'layers', texture:'layers', register:'layers', counterpoint:'voicing' };
const UPPER = [row('C4',0),row('D4',1),row('E4',2),row('C4',3)];
const TEXTURE_UPPER = [row('C4',0),row('D4',1),row('E4',2),row('G4',3)];
const TEXTURE_IMITATION = [row('C3',1),row('D3',2),row('E3',3),row('G3',4)];
const IMITATION = [row('C3',1),row('D3',2),row('E3',3),row('C3',4)];
const RESPONSE = [row('G3',1),row('C3',2),row('E3',3),row('C3',4)];
const BASS = [row('C3',0,1.5),row('C3',2,1.5),row('C3',4,1.5),row('C3',6,1.5)];
const REGISTER_MELODY = [row('E4',0,1.5),row('G4',2,1.5),row('F4',4,1.5),row('E4',6,1.5)];

export const supportsEnsemble = s => SCENARIOS.has(s.scenario) && TYPES[s.scenario] === s.type;
const snapshot = s => ({ bass:copy(s.ensembleBass),upper:copy(s.ensembleUpper),lower:copy(s.ensembleLower),octave:s.ensembleOctave,density:s.ensembleDensity,texture:s.ensembleTexture });
export function ensembleDefaults(type, config = {}) {
  if (!supportsEnsemble({ type, scenario:config.scenario })) return {};
  const out = { ensembleBass:copy(BASS),ensembleUpper:copy(config.scenario==='texture'?TEXTURE_UPPER:UPPER),ensembleLower:copy(config.scenario==='texture'?TEXTURE_IMITATION:IMITATION),ensembleOctave:0,ensembleDensity:'full',ensembleTexture:'homophony' };
  out.ensembleA = snapshot(out);
  return out;
}
function validRows(value) {
  if (!Array.isArray(value) || value.length > 32) return false;
  const valid=value.every(event => {
    try {
      return event && Number.isFinite(event.beat) && event.beat >= 0 && event.beat < 8 && Number.isFinite(event.duration) && event.duration >= 1/12 && event.beat + event.duration <= 8 + 1e-7 && parseNote(event.note).midi >= 36 && parseNote(event.note).midi <= 96;
    } catch { return false; }
  });
  return valid && !value.some((event,i)=>value.some((other,j)=>i!==j && event.beat < other.beat+other.duration-1e-7 && other.beat < event.beat+event.duration-1e-7));
}
const sanitizedRows=rows=>rows.map(({note,beat,duration})=>({note:parseNote(note).name,beat,duration}));
export function normalizeEnsemble(raw, out) {
  if (!supportsEnsemble(out)) return out;
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  for (const key of ['ensembleBass','ensembleUpper','ensembleLower']) if (validRows(raw[key])) out[key] = sanitizedRows(raw[key]);
  if (Number.isInteger(raw.ensembleOctave) && raw.ensembleOctave >= -2 && raw.ensembleOctave <= 1) out.ensembleOctave = raw.ensembleOctave;
  if (['full','half'].includes(raw.ensembleDensity)) out.ensembleDensity = raw.ensembleDensity;
  if (['monophony','homophony','polyphony'].includes(raw.ensembleTexture)) out.ensembleTexture = raw.ensembleTexture;
  const saved = raw.ensembleA;
  if (saved && validRows(saved.bass) && validRows(saved.upper) && validRows(saved.lower) && Number.isInteger(saved.octave) && saved.octave >= -2 && saved.octave <= 1 && ['full','half'].includes(saved.density) && ['monophony','homophony','polyphony'].includes(saved.texture)) out.ensembleA = {bass:sanitizedRows(saved.bass),upper:sanitizedRows(saved.upper),lower:sanitizedRows(saved.lower),octave:saved.octave,density:saved.density,texture:saved.texture};
  return out;
}
function current(s, variant) {
  if (variant !== 'A') return s;
  const a=s.ensembleA;
  return {...s,ensembleBass:a.bass,ensembleUpper:a.upper,ensembleLower:a.lower,ensembleOctave:a.octave,ensembleDensity:a.density,ensembleTexture:a.texture};
}
function eventsFor(rows, layer, channel, partId, velocity=.62) {
  return rows.map(event => ({...event,kind:'tone',layer,channel,partId,velocity}));
}
function registerParts(s) {
  const starts=Array.from({length:s.ensembleDensity==='full'?8:4},(_,i)=>i*(s.ensembleDensity==='full'?1:2));
  const accompaniment=starts.flatMap(beat=>['E4','G4'].map(note=>row(transposeOctaves(note,s.ensembleOctave),beat,1)));
  return [eventsFor(REGISTER_MELODY,'melody',0,'upper'),eventsFor(accompaniment,'bass',2,'accompaniment',.34),eventsFor([row('C3',0,8)],'bass',1,'lower',.48)];
}
export function ensembleModel(input, variant='current') {
  const s=current(input,variant); let events=[];
  if (s.scenario==='groove') events=[...meteredRhythmModel(drumPattern('4/4'),'4/4').events.map(event=>({...event,partId:'drums'})),...eventsFor(s.ensembleBass,'bass',1,'lower',.7)];
  else if (s.scenario==='register') events=registerParts(s).flat();
  else {
    events=eventsFor(s.ensembleUpper,'melody',0,'upper');
    if (s.scenario==='counterpoint'||s.ensembleTexture==='polyphony') events.push(...eventsFor(s.ensembleLower,'bass',1,'lower'));
    else if(s.ensembleTexture==='homophony') events.push(...s.ensembleUpper.flatMap(event=>eventsFor([row('C3',event.beat,event.duration),row('E3',event.beat,event.duration),row('G3',event.beat,event.duration)],'bass',1,'lower',.3)));
  }
  if (['upper','lower','drums','accompaniment'].includes(variant)) events=events.filter(event=>event.partId===variant);
  return {beats:8,events:events.sort((a,b)=>a.beat-b.beat),meta:{meter:'4/4',beatUnit:'四分音符',stepsPerBeat:2}};
}
export function ensembleScore(s) {
  const model=ensembleModel(s), group=new Map();
  for (const event of model.events) {
    const id=event.partId||'drums';
    if(!group.has(id)) group.set(id,{id,name:({upper:'上声部',lower:s.scenario==='groove'?'低音':'下声部',accompaniment:'伴奏',drums:'固定鼓组'}[id]),clef:id==='drums'?'percussion':id==='upper'||(id==='accompaniment'&&s.ensembleOctave>=0)?'treble':'bass',events:[]});
    const part=group.get(id),chord=event.kind==='tone'&&part.events.find(e=>e.kind==='tone'&&e.beat===event.beat&&e.duration===event.duration);
    if(chord)chord.notes.push(event.note);
    else part.events.push({beat:event.beat,duration:event.duration,notes:event.kind==='tone'?[event.note]:[],kind:event.kind});
  }
  // An intentionally empty voice is a valid exercise, but a score still needs a staff.
  if (!group.size) group.set('upper',{id:'upper',name:'空白草稿',clef:'treble',events:[]});
  return {excerpt:{id:'ensemble-'+s.scenario,originalModel:true,meter:'4/4',beatsPerBar:4,bars:2},variant:{id:'current',parts:[...group.values()]}};
}
function score(s) {const {excerpt,variant}=ensembleScore(s);return scoreView(excerpt,variant);}
const field=(label,control)=>`<label class="lab-field"><span>${label}</span>${control}</label>`;
function editor(rows,key,label) {
  return `<section class="ensemble-editor"><h3 class="small-heading">${label}</h3><p class="lab-help">起点从片段开始计数：0为第1小节第1拍，4为第2小节第1拍。空隙为休止；跨小节长音只触发一次。</p><div class="lab-table-wrap"><table class="lab-event-table"><thead><tr><th>音名</th><th>起点（拍）</th><th>时值（拍）</th><th>操作</th></tr></thead><tbody>${rows.map((event,i)=>`<tr><td><input id="lab-${key}-note-${i}" aria-label="${label}第${i+1}音音名" data-lab-field="ensemble-note" data-key="${key}" data-index="${i}" value="${esc(event.note)}" maxlength="6" size="5"></td><td><input id="lab-${key}-beat-${i}" aria-label="${label}第${i+1}音起点" data-lab-field="ensemble-beat" data-key="${key}" data-index="${i}" type="number" value="${event.beat}" min="0" max="7.75" step="0.25"></td><td><input id="lab-${key}-duration-${i}" aria-label="${label}第${i+1}音时值" data-lab-field="ensemble-duration" data-key="${key}" data-index="${i}" type="number" value="${event.duration}" min="0.25" max="8" step="0.25"></td><td><button class="btn btn-small" data-lab-action="ensemble-delete" data-key="${key}" data-index="${i}" type="button" aria-label="删除${label}第${i+1}音">删除</button></td></tr>`).join('')}</tbody></table></div><button class="btn btn-small" data-lab-action="ensemble-add" data-key="${key}" type="button" ${rows.length>=32?'disabled':''}>添加一个音</button></section>`;
}
function comparison(s) {
  const a=ensembleModel(s,'A'),b=ensembleModel(s);
  const pitches=events=>events.filter(e=>e.kind==='tone').map(e=>`${e.note}@${e.beat}/${e.duration}`).join('|');
  return `<p class="lab-help" aria-live="polite">${pitches(a.events)===pitches(b.events)?'当前与草稿A相同。先保存A，再只改一个变量。':'当前与草稿A已有音符、位置、时值或配置差异。两版使用相同速度与每音力度；密度变化仍会影响总响度。'}</p><div class="preset-row"><button class="btn btn-small" data-lab-action="ensemble-save" type="button">保存当前为A</button><button class="btn btn-soft" data-lab-action="ensemble-a" type="button">听草稿A</button></div>`;
}
export function registerEvidence(s) {
  const [melody,accompaniment]=registerParts(s);
  const range=events=>[Math.min(...events.map(e=>noteToMidi(e.note))),Math.max(...events.map(e=>noteToMidi(e.note)))];
  const a=range(melody),b=range(accompaniment);
  const overlap=Math.max(0,Math.min(a[1],b[1])-Math.max(a[0],b[0]));
  const collisions=accompaniment.filter(e=>melody.some(m=>m.note===e.note&&m.beat<e.beat+e.duration&&e.beat<m.beat+m.duration)).length;
  return {overlap,collisions,attacks:accompaniment.length};
}
function soundingAt(rows,beat) { return rows.find(e=>e.beat<=beat+1e-7&&e.beat+e.duration>beat+1e-7); }
export function motionEvidence(upper,lower) {
  const beats=[...new Set([...upper,...lower].flatMap(e=>[e.beat,e.beat+e.duration]))].sort((a,b)=>a-b);
  const observations=[];let previous;
  for(const beat of beats) {
    const u=soundingAt(upper,beat),l=soundingAt(lower,beat);
    if(!u||!l){previous=undefined;continue;}
    const pair={beat,u:u.note,l:l.note};
    if(previous){const du=Math.sign(noteToMidi(pair.u)-noteToMidi(previous.u)),dl=Math.sign(noteToMidi(pair.l)-noteToMidi(previous.l));
      if(du||dl) observations.push({beat,from:previous.beat,motion:!du||!dl?'斜向':du===dl?'同向':'反向',interval:intervalBetween(pair.l,pair.u).label});
    }
    previous=pair;
  }
  return observations;
}
export function ensembleView(s) {
  let controls='',feedback='';
  if(s.scenario==='groove') {
    controls=`${editor(s.ensembleBass,'ensembleBass','可编辑低音')}<div class="preset-row"><button class="btn btn-small" data-lab-action="ensemble-syncopate" type="button">将第二小节首音提前半拍并延长</button><button class="btn btn-small" data-lab-action="ensemble-bass" type="button">只听低音</button><button class="btn btn-small" data-lab-action="ensemble-drums" type="button">只听固定鼓组</button></div>`;
    const off=s.ensembleBass.filter(e=>Math.abs(e.beat-Math.round(e.beat))>1e-7).length,cross=s.ensembleBass.filter(e=>e.beat<4&&e.beat+e.duration>4).length;
    feedback=`当前低音有${s.ensembleBass.length}次起音，其中${off}次位于拍内分点，${cross}个音跨越小节线。鼓组保持不变，比较低音与底鼓是重合、提前还是错开。跨线长音不会在小节线重新触发。`;
  } else if(s.scenario==='register') {
    controls=`<div class="lab-fields">${field('伴奏整体八度',`<select id="lab-ensemble-octave" data-lab-field="ensemble-octave">${options([-2,-1,0,1],s.ensembleOctave,n=>n===0?'原音区 E4—G4':`${n>0?'升':'降'}${Math.abs(n)}个八度`)}</select>`)}${field('伴奏起音密度',`<select id="lab-ensemble-density" data-lab-field="ensemble-density">${options(['full','half'],s.ensembleDensity,n=>n==='full'?'每拍起音':'每两拍起音')}</select>`)}</div><div class="preset-row"><button class="btn btn-small" data-lab-action="ensemble-upper" type="button">只听旋律</button><button class="btn btn-small" data-lab-action="ensemble-accompaniment" type="button">只听上方伴奏</button></div>`;
    const e=registerEvidence(s);feedback=`旋律固定E4—G4—F4—E4；C3低音固定。伴奏共${e.attacks}个音起音，旋律与伴奏音高范围交集跨度${e.overlap}半音；有${e.collisions}个伴奏音与同音旋律在时间上重叠。这是布局提示，不是掩蔽或清晰度的声学评分。`;
  } else {
    if(s.scenario==='texture') controls+=`<div class="lab-fields">${field('织体',`<select id="lab-ensemble-texture" data-lab-field="ensemble-texture">${options(['monophony','homophony','polyphony'],s.ensembleTexture,n=>({monophony:'单旋律',homophony:'同节奏和弦伴奏',polyphony:'两条独立线条'}[n]))}</select>`)}</div>`;
    controls+=editor(s.ensembleUpper,'ensembleUpper','上声部');
    if(s.scenario==='counterpoint'||s.ensembleTexture==='polyphony') controls+=editor(s.ensembleLower,'ensembleLower','下声部');
    controls+=`${s.scenario==='counterpoint'?'<div class="preset-row"><button class="btn btn-small" data-lab-action="ensemble-parallel" type="button">正文平行三度</button><button class="btn btn-small" data-lab-action="ensemble-contrary" type="button">正文首步反向</button></div>':''}<div class="preset-row"><button class="btn btn-small" data-lab-action="ensemble-imitation" type="button">迟一拍的模仿</button><button class="btn btn-small" data-lab-action="ensemble-response" type="button">换成回应线条</button><button class="btn btn-small" data-lab-action="ensemble-upper" type="button">只听上声部</button><button class="btn btn-small" data-lab-action="ensemble-lower" type="button">只听下声部</button></div>`;
    const observations=motionEvidence(s.ensembleUpper,s.ensembleLower);
    feedback=s.scenario==='texture'&&s.ensembleTexture!=='polyphony'?'单旋律只播放上声部；同节奏伴奏在每次旋律起音时奏出C3—E3—G3，听分工与节奏依赖。切换到独立线条后，下声部可分别改变起音与时值。':`按两线实际同时发声的位置比较相邻音高：${observations.length?observations.map(o=>`第${clean(o.beat+1)}拍 ${o.motion}，垂直${o.interval}`).join('；'):'尚无可比较的连续位置。'}。休止会中断比较；持续音按真实时值参与。这里只描述运动方向，不给风格规则打分。`;
  }
  return `<p class="lab-help">原创${({groove:'鼓与低音',register:'音区与密度',texture:'织体',counterpoint:'两声部'}[s.scenario])}模型 · 4/4 · 两小节，共8拍。</p>${controls}<div class="relationship-result"><span>从当前音符计算</span><p>${feedback}</p></div>${score(s)}${comparison(s)}`;
}
const keys=new Set(['ensembleBass','ensembleUpper','ensembleLower']);
export async function ensembleAction(button,s,host) {
  if(!supportsEnsemble(s)||!button.dataset.labAction?.startsWith('ensemble-')) return false;
  const action=button.dataset.labAction.slice(9),key=button.dataset.key,index=Number(button.dataset.index);
  if(['a','upper','lower','drums','bass','accompaniment'].includes(action)) {
    await host.play(ensembleModel(s,action==='a'?'A':action==='bass'?'lower':action),s.bpm,action==='a'?'A':action);return true;
  }
  if(action==='save'){s.ensembleA=snapshot(s);host.notify('已保存当前配置与线条为草稿A。');}
  else if(action==='add'&&keys.has(key)&&s[key].length<32) {
    const candidates=Array.from({length:29},(_,i)=>i*.25);
    const beat=candidates.find(start=>!s[key].some(e=>e.beat<start+1-1e-7&&start<e.beat+e.duration-1e-7));
    if(beat===undefined){host.notify('片段内没有可容纳一个整拍音的空隙，请先缩短或删除已有音。');return true;}
    s[key].push(row(key==='ensembleUpper'?'C4':'C3',beat,1));s[key].sort((a,b)=>a.beat-b.beat);
  }
  else if(action==='delete'&&keys.has(key)&&Number.isInteger(index)&&index>=0&&index<s[key].length)s[key].splice(index,1);
  else if(action==='syncopate'){
    const i=s.ensembleBass.findIndex(e=>e.beat===4);
    if(i>=0){const candidate=s.ensembleBass.map((event,index)=>index===i?{...event,beat:3.5,duration:2}:event);
      if(!validRows(candidate)){host.notify('提前后会与已有低音重叠，请先缩短相邻音，再重试。');return true;}
      s.ensembleBass=candidate;
    }
    else host.notify('示例操作把起点为4拍的音移到3.5拍、持续2拍。也可直接编辑表格。');
  }
  else if(action==='imitation'||action==='response') {
    s.ensembleUpper=copy(s.scenario==='texture'?TEXTURE_UPPER:UPPER);s.ensembleLower=copy(action==='imitation'?(s.scenario==='texture'?TEXTURE_IMITATION:IMITATION):RESPONSE);s.ensembleTexture='polyphony';
  } else if(action==='parallel'||action==='contrary') {
    s.ensembleLower=['C3','D3','E3','C3'].map((note,i)=>row(note,i));
    s.ensembleUpper=(action==='parallel'?['E4','F4','G4','E4']:['G4','F4','G4','E4']).map((note,i)=>row(note,i));s.ensembleTexture='polyphony';
  } else return true;
  host.touch();host.render();host.restart();return true;
}
export async function ensembleField(target,s,host,eventType='change') {
  const field=target.dataset.labField;
  if(!supportsEnsemble(s)||!field?.startsWith('ensemble-'))return false;
  if(eventType!=='change')return true;
  try {
    const key=target.dataset.key,index=Number(target.dataset.index);
    if(['ensemble-note','ensemble-beat','ensemble-duration'].includes(field)&&keys.has(key)&&Number.isInteger(index)&&index>=0&&index<s[key].length) {
      const revised={...s[key][index]};
      if(field==='ensemble-note') revised.note=parseNote(target.value.trim()).name;
      else revised[field==='ensemble-beat'?'beat':'duration']=Number(target.value);
      if(!validRows([revised]))throw new RangeError('请用C2至C7的音名；起点≥0、时值≥1/12拍，且结束不超过8拍。');
      const other=s[key].filter((_,i)=>i!==index);
      if(other.some(e=>e.beat<revised.beat+revised.duration-1e-7&&revised.beat<e.beat+e.duration-1e-7))throw new RangeError('同一线条的音符不能重叠，请先缩短相邻音或调整起点。');
      s[key][index]=revised;s[key].sort((a,b)=>a.beat-b.beat);
    }
    else if(field==='ensemble-octave'&&[-2,-1,0,1].includes(Number(target.value)))s.ensembleOctave=Number(target.value);
    else if(field==='ensemble-density'&&['full','half'].includes(target.value))s.ensembleDensity=target.value;
    else if(field==='ensemble-texture'&&['monophony','homophony','polyphony'].includes(target.value))s.ensembleTexture=target.value;
    else return true;
    host.touch();host.render(target.id);host.restart();
  }catch(error){host.notify(error.message);host.render(target.id);}
  return true;
}
