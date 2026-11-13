import { esc,pretty,options } from '../ui.js';
import { METERS,drumPattern,meteredRhythmModel,makeListeningModel } from '../music/models.js';

const clone=value=>JSON.parse(JSON.stringify(value));
const base=s=>!s.scenario;
export const supportsFoundation=s=>base(s)&&['layers','tempo','rhythm'].includes(s.type);
const roles=['melody','bass','rhythm'];
const names={melody:'旋律',bass:'低音',rhythm:'敲击'};
const units={meter:'按拍号主要拍',quarter:'四分音符',half:'二分音符'};
const unitFactor=s=>s.foundationUnit==='half'?2:s.foundationUnit==='quarter'?1:s.meter==='6/8'?1.5:1;
const quarterCount=s=>s.meter==='6/8'?3:METERS[s.meter].beats;
const row=(note,beat,duration,layer,velocity=.65)=>({note,beat,duration,layer,velocity,kind:'tone',channel:layer==='bass'?1:0});
export function foundationDefaults(type,config={}) {
  if(!supportsFoundation({type,scenario:config.scenario||''}))return {};
  return {foundationLayersA:{melody:true,bass:true,rhythm:true},foundationBpmA:60,foundationUnit:'meter',foundationUnitA:'meter',foundationMeterA:config.meter||'4/4',foundationSilentA:false,foundationFollow:1,foundationSilent:false,foundationBanks:{},foundationEvidence:{versionA:'本站原创模型A',versionB:'本站原创模型B',observation:'',interpretation:'',confound:''}};
}
function validDrums(value,meter) {
  const n=METERS[meter].beats*METERS[meter].subdivision*2;
  return value&&['kick','snare','hat'].every(k=>Array.isArray(value[k])&&value[k].length===n&&value[k].every(v=>[0,1,2].includes(v)));
}
export function normalizeFoundation(raw,out) {
  if(!supportsFoundation(out))return out;
  for(const key of ['foundationUnit','foundationUnitA'])if(Object.hasOwn(units,raw[key]))out[key]=raw[key];
  if(Number.isFinite(raw.foundationBpmA))out.foundationBpmA=Math.round(Math.max(40,Math.min(180,raw.foundationBpmA)));
  if([.5,1,2].includes(raw.foundationFollow))out.foundationFollow=raw.foundationFollow;
  if(typeof raw.foundationSilent==='boolean')out.foundationSilent=raw.foundationSilent;
  if(typeof raw.foundationSilentA==='boolean')out.foundationSilentA=raw.foundationSilentA;
  if(Object.hasOwn(METERS,raw.foundationMeterA))out.foundationMeterA=raw.foundationMeterA;
  for(const role of roles)if(typeof raw.foundationLayersA?.[role]==='boolean')out.foundationLayersA[role]=raw.foundationLayersA[role];
  for(const key of Object.keys(out.foundationEvidence))if(typeof raw.foundationEvidence?.[key]==='string')out.foundationEvidence[key]=raw.foundationEvidence[key].slice(0,1000);
  for(const meter of Object.keys(METERS)) {
    const bank=raw.foundationBanks?.[meter];
    if(validDrums(bank?.drums,meter)&&validDrums(bank?.A,meter))out.foundationBanks[meter]={drums:clone(bank.drums),A:clone(bank.A)};
  }
  return out;
}
function layerModel(s,variant) {
  const enabled=variant==='A'?s.foundationLayersA:s.layers;
  const events=['C4','E4','G4','E4'].map((note,beat)=>row(note,beat,1,'melody'));
  events.push(row('C3',0,2,'bass'),row('G2',2,2,'bass'));
  for(let beat=0;beat<4;beat+=.5)events.push({kind:'hat',beat,duration:.125,layer:'rhythm',velocity:beat%1?.3:.55});
  return {beats:4,events:events.filter(e=>enabled[e.layer]),meta:{meter:'4/4',stepsPerBeat:2,beatUnit:'四分音符'}};
}
function tempoModel(input,variant) {
  const s=variant==='A'?{...input,meter:input.foundationMeterA,foundationUnit:input.foundationUnitA,foundationSilent:input.foundationSilentA}:input;
  const factor=unitFactor(s);
  if(variant==='texture') {
    const model=makeListeningModel();return {beats:model.beats/factor,events:model.events.map(e=>({...e,beat:e.beat/factor,duration:e.duration/factor})),meta:{meter:'4/4',quartersPerBeat:factor,beatUnit:factor===2?'二分音符':factor===1.5?'附点四分音符':'四分音符',stepsPerBeat:6}};
  }
  const q=quarterCount(s),length=s.foundationSilent?16:q,events=[];
  const writtenStep=!s.foundationSilent&&s.meter==='6/8'?1.5:1;
  for(let beat=0;beat<length;beat+=writtenStep) {
    if(s.foundationSilent&&beat>=8&&beat<12)continue;
    events.push({kind:'kick',beat:beat/factor,duration:.12/factor,layer:'rhythm',velocity:beat%q===0?.8:.45});
  }
  return {beats:length/factor,events,meta:{meter:s.foundationSilent?'4/4':s.meter,stepsPerBeat:6,quartersPerBeat:factor,beatUnit:factor===2?'二分音符':factor===1.5?'附点四分音符':'四分音符'}};
}
/** Both six-eighth examples contain the same 12 onsets; only accent grouping changes. */
export function groupingModel(meter='6/8') {
  const m=METERS[meter],events=Array.from({length:12},(_,i)=>({beat:i/m.subdivision,duration:.25/m.subdivision,kind:'hat',layer:'rhythm',velocity:i%6===0?.85:i%m.subdivision===0?.6:.25}));
  return {beats:m.beats*2,events,meta:{meter,beatUnit:m.unit,stepsPerBeat:m.subdivision,playbackLabel:`${meter}固定六格参照`}};
}
export function foundationModel(s,variant='current') {
  if(s.type==='layers')return layerModel(s,variant);
  if(s.type==='tempo')return tempoModel(s,variant);
  if(variant==='group3')return groupingModel('3/4');
  if(variant==='group6')return groupingModel('6/8');
  return meteredRhythmModel(variant==='A'?s.drumsA:s.drums,s.meter);
}
const button=(action,text,extra='')=>`<button class="btn btn-small" type="button" data-lab-action="foundation-${action}" ${extra}>${text}</button>`;
const label=(name,input)=>`<label class="lab-field"><span>${name}</span>${input}</label>`;
function evidenceView(s) {
  const labels={versionA:'版本A及选段位置',versionB:'版本B及选段位置',observation:'可以重听定位的观察',interpretation:'解释或感受假设',confound:'尚不能排除的其他原因'};
  return `<details><summary>制作可复查的比较证据卡</summary><p class="lab-help">原创模型写清速度与计速音值；真实录音补全发行、演奏版本及各自时间位置。下面内容只作为笔记保存，不自动判定观察是否真实。</p><div class="lab-fields">${Object.keys(labels).map(key=>label(labels[key],`<textarea id="lab-foundation-evidence-${key}" data-lab-field="foundation-evidence" data-key="${key}" maxlength="1000" rows="2">${esc(s.foundationEvidence[key])}</textarea>`)).join('')}</div></details>`;
}
function layersView(s) {
  const full=layerModel({...s,layers:{melody:true,bass:true,rhythm:true}},'current');
  return `<p class="lab-help">正文中的四拍原创模型。图中的入口与持续从实际音符事件生成；关掉一层时，其余音符、时值和每音力度保持。C4、G2等是固定具体音的标签，U01-04再解释；本课先观察何时起音和持续。</p><div class="layer-controls">${roles.map(role=>`<button class="layer-card ${s.layers[role]?'is-on':''}" data-lab-action="foundation-layer" data-role="${role}" type="button" aria-pressed="${s.layers[role]}">${names[role]}：${s.layers[role]?'参与':'退出'}</button>`).join('')}</div><div class="foundation-timeline">${roles.map(role=>`<section class="foundation-line ${s.layers[role]?'':'is-muted'}"><h3>${names[role]}</h3><div class="foundation-events">${full.events.filter(e=>e.layer===role).map(e=>`<span data-lab-start="${e.beat}" data-lab-end="${e.beat+e.duration}">${e.note?pretty(e.note):'敲击'}<small>第${e.beat+1}拍起 · 持续${e.duration}拍</small></span>`).join('')}</div></section>`).join('')}</div><p class="lab-help">正在参与${roles.filter(r=>s.layers[r]).length}层。乐器数与声部数不同；此图只描述本模型的三种角色，不自动分析真实录音。</p><div class="preset-row">${button('solo','只听低音')}${button('all','恢复全部')}${button('save','保留声层组合为A')}${button('a','听声层A')}</div>`;
}
export function foundationFollowPoints(s) {
  const factor=unitFactor(s),length=s.foundationSilent?16:quarterCount(s);
  return Array.from({length:Math.ceil(length/s.foundationFollow)},(_,i)=>({label:i+1,quarter:i*s.foundationFollow,beat:i*s.foundationFollow/factor,duration:s.foundationFollow*.5/factor}));
}
function tempoView(s) {
  const factor=unitFactor(s),q=quarterCount(s),seconds=q/factor*60/s.bpm;
  const unit= factor===2?'二分音符':factor===1.5?'附点四分音符':'四分音符';
  return `<div class="tempo-readout"><strong class="tempo-number">${s.bpm}</strong><span class="bpm">BPM<small>${unit}每分钟${s.bpm}次</small></span></div><div class="lab-fields">${label('拍号',`<select id="lab-foundation-meter" data-lab-field="foundation-meter">${options(Object.keys(METERS),s.meter)}</select>`)}${label('计速音值',`<select id="lab-foundation-unit" data-lab-field="foundation-unit">${options(Object.keys(units),s.foundationUnit,k=>units[k])}</select>`)}${label('身体跟随层（声音不变）',`<select id="lab-foundation-follow" data-lab-field="foundation-follow">${options([.5,1,2],s.foundationFollow,k=>({'0.5':'每半个四分拍',1:'每个四分拍',2:'每两个四分拍'}[k]))}</select>`)}</div><p class="lab-help" data-foundation-seconds>当前计速单位=${factor}个四分音符；一个四分音符${(60/s.bpm/factor).toFixed(3)}秒。${s.meter}一小节含${q}个四分音符，用时${seconds.toFixed(3)}秒。以选定身体层跟随约${(s.bpm*factor/s.foundationFollow).toFixed(1)}次/分；选择身体层不改变音频。</p><div class="beat-row">${foundationFollowPoints(s).map(point=>`<span class="beat-dot" data-lab-start="${point.beat}" data-lab-end="${point.beat+point.duration}">${point.label}</span>`).join('')}</div><label class="check-row"><input type="checkbox" data-lab-field="foundation-silent" ${s.foundationSilent?'checked':''}>保持时间：8个四分拍发声 → 4拍静音 → 4拍恢复（4/4训练）</label><div class="preset-row">${button('60','设为60 BPM')}${button('80','设为80 BPM')}${button('save','保存当前速度与音值为A')}${button('a',`听A：${s.foundationBpmA} BPM`)}${button('texture','听固定4/4组合')}</div><p class="lab-help">A保存拍号、计速音值、BPM与静音训练方案，回听前检查是否只改了一项。静音训练固定4/4的16个四分拍：第1—8拍发声，第9—12拍无敲击，第13—16拍恢复；身体提示仍贯穿全部16拍。组合试听固定4/4，独立于拍号菜单。模型不是任何录音的转写。</p>`;
}
export function foundationView(s,baseView='') {
  if(s.type==='layers')return layersView(s);
  if(s.type==='tempo')return tempoView(s)+evidenceView(s);
  const eighthSeconds=60/s.bpm/(s.meter==='6/8'?3:2),bpm3=60/(eighthSeconds*2),bpm6=60/(eighthSeconds*3);
  return `${baseView}<section class="foundation-grouping"><h3 class="small-heading">同六个八分音符，隔离分组差异</h3><p class="lab-help">下列两份固定参照均为两小节、12个八分起音。八分音符固定${eighthSeconds.toFixed(3)}秒：3/4按四分音符=${bpm3.toFixed(1)} BPM，6/8按附点四分音符=${bpm6.toFixed(1)} BPM；两版小节均长${(eighthSeconds*6).toFixed(3)}秒。它们不改动上方的节奏草稿。</p><div class="preset-row">${button('group3','等速八分：2＋2＋2')}${button('group6','等速八分：3＋3')}${button('native3','相同BPM：听3/4')}${button('native6','相同BPM：听6/8')}</div><p class="lab-help">相同BPM比较保留数字${s.bpm}，两种主要拍音值不同，因此小节时长不同。切换上方拍号会分别保存各拍号的草稿及A，不丢掉先前设置。</p></section>`;
}
function bankMeter(s,meter) {
  s.foundationBanks[s.meter]={drums:clone(s.drums),A:clone(s.drumsA)};s.meter=meter;
  const bank=s.foundationBanks[meter];s.drums=clone(bank?.drums||drumPattern(meter));s.drumsA=clone(bank?.A||drumPattern(meter));
}
export async function foundationAction(el,s,host) {
  const action=el.dataset.labAction;
  if(!supportsFoundation(s)||!action?.startsWith('foundation-'))return false;
  const key=action.slice(11);
  if(key==='a'){await host.play(foundationModel(s,'A'),s.type==='tempo'?s.foundationBpmA:s.bpm,'A');return true;}
  if(key==='texture'){await host.play(foundationModel(s,'texture'),s.bpm,'texture');return true;}
  if(['group3','group6','native3','native6'].includes(key)) {
    const meter=key.endsWith('3')?'3/4':'6/8',eighth=60/s.bpm/(s.meter==='6/8'?3:2),bpm=key.startsWith('group')?60/eighth/METERS[meter].subdivision:s.bpm;
    await host.play(groupingModel(meter),bpm,key);return true;
  }
  if(key==='save') {if(s.type==='layers')s.foundationLayersA={...s.layers};else{s.foundationBpmA=s.bpm;s.foundationUnitA=s.foundationUnit;s.foundationMeterA=s.meter;s.foundationSilentA=s.foundationSilent;}host.notify('已保留本工具的当前对照A。');}
  else if(key==='layer'&&roles.includes(el.dataset.role))s.layers[el.dataset.role]=!s.layers[el.dataset.role];
  else if(key==='solo')s.layers={melody:false,bass:true,rhythm:false};
  else if(key==='all')s.layers={melody:true,bass:true,rhythm:true};
  else if(key==='60'||key==='80')s.bpm=Number(key);
  else return true;
  host.touch();host.render();host.restart();return true;
}
export async function foundationField(el,s,host,eventType='change') {
  const field=el.dataset.labField;
  if(!supportsFoundation(s))return false;
  if(field==='foundation-evidence'&&Object.hasOwn(s.foundationEvidence,el.dataset.key)){s.foundationEvidence[el.dataset.key]=el.value.slice(0,1000);host.touch();return true;}
  if(field==='meter'&&s.type==='rhythm'){if(eventType==='change'&&METERS[el.value]){bankMeter(s,el.value);host.touch();host.render(el.id);host.restart();}return true;}
  if(!field?.startsWith('foundation-'))return false;
  if(eventType!=='change')return true;
  if(field==='foundation-meter'&&METERS[el.value])bankMeter(s,el.value);
  else if(field==='foundation-unit'&&Object.hasOwn(units,el.value))s.foundationUnit=el.value;
  else if(field==='foundation-follow'&&[.5,1,2].includes(Number(el.value)))s.foundationFollow=Number(el.value);
  else if(field==='foundation-silent')s.foundationSilent=el.checked;
  else return true;
  host.touch();host.render(el.id);host.restart();return true;
}
