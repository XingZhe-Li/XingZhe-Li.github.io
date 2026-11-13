import { esc,pretty,options,noteChips } from '../ui.js';
import { parseNote,noteToMidi,midiToNote,frequency,scaleNotes,intervalBetween,transposeOctaves } from '../music/theory.js';
import { scoreView } from '../cases/notation.js';

const copy=value=>JSON.parse(JSON.stringify(value));
const LETTERS=['C','D','E','F','G','A','B'],NATURAL=[0,2,4,5,7,9,11],SYLLABLES=['do','re','mi','fa','sol','la','si'];
const TONICS=['C4','G4','D4','F4','Bb3'];
const TRANSPOSE={upM2:{diatonic:1,semitones:2,label:'上移大二度'},downm3:{diatonic:-2,semitones:-3,label:'下移小三度'},upP5:{diatonic:4,semitones:7,label:'上移纯五度'},up8:{diatonic:7,semitones:12,label:'上移八度'},down8:{diatonic:-7,semitones:-12,label:'下移八度'}};
const field=(label,control)=>`<label class="lab-field"><span>${label}</span>${control}</label>`;
const select=(name,values,current,label=value=>value)=>`<select id="lab-notation-${name}" data-lab-field="notation-${name}">${options(values,current,label)}</select>`;
const button=(action,label,extra='')=>`<button type="button" class="btn btn-small" data-lab-action="notation-${action}" ${extra}>${label}</button>`;
const tone=(note,beat,duration=1)=>({note,beat,duration,kind:'tone',layer:'melody',channel:0,velocity:.7});
const safeNote=(note,min=36,max=96)=>{try{const p=parseNote(note);return p.midi>=min&&p.midi<=max?p.name:null;}catch{return null;}};
export const supportsNotation=s=>['pitch','interval'].includes(s.type);

export function transposeWritten(note,diatonic,semitones) {
  const p=parseNote(note),position=p.octave*7+p.index+diatonic,index=((position%7)+7)%7,octave=Math.floor(position/7);
  const accidental=p.midi+semitones-((octave+1)*12+NATURAL[index]);
  if(Math.abs(accidental)>2)throw new Error('此移调需要三重升降号；请先选较简单的拼写。');
  const result=LETTERS[index]+(accidental>0?'#'.repeat(accidental):'b'.repeat(-accidental))+octave;
  if(!safeNote(result))throw new Error('移调后请保持C2至C7的音域。');
  return result;
}
const validPhrase=value=>Array.isArray(value)&&value.length>=2&&value.length<=8&&value.every(note=>safeNote(note));
const validPair=value=>Array.isArray(value)&&value.length===2&&value.every(note=>safeNote(note));
const snapshot=s=>({pitch:s.pitch,spelling:s.notationSpelling,reference:s.notationReference,intervalNotes:[...s.intervalNotes],harmonic:s.harmonic});
export function notationDefaults(type,config={}) {
  if(!supportsNotation({type}))return {};
  const first=safeNote(config.intervalNotes?.[0],48,83)||safeNote(config.root,48,83)||'C4';
  const selected=type==='pitch'?first:'C4';
  const out={notationSpelling:selected,notationReference:selected,notationClef:'treble',notationTonic:'C4',notationSolfeggio:'movable',notationDigits:'12321',notationTranspose:'upM2',notationPhrase:['C4','D4','Eb4','G4'],notationPhraseA:['C4','D4','Eb4','G4'],notationMarks:['#','none','none','natural','none','none','none','none'],notationKey:'natural',notationScopeTie:false};
  if(type==='pitch')out.pitch=noteToMidi(first);
  out.notationA={pitch:noteToMidi(selected),spelling:selected,reference:selected,intervalNotes:validPair(config.intervalNotes)?[...config.intervalNotes]:['C4','E4'],harmonic:false};
  return out;
}
export function normalizeNotation(raw,out) {
  if(!supportsNotation(out)||!raw||typeof raw!=='object')return out;
  const spelling=safeNote(raw.notationSpelling,48,83);
  out.notationSpelling=spelling&&noteToMidi(spelling)===out.pitch?spelling:midiToNote(out.pitch);
  if(safeNote(raw.notationReference,48,83))out.notationReference=parseNote(raw.notationReference).name;
  if(['treble','bass'].includes(raw.notationClef))out.notationClef=raw.notationClef;
  if(TONICS.includes(raw.notationTonic))out.notationTonic=raw.notationTonic;
  if(['movable','fixed'].includes(raw.notationSolfeggio))out.notationSolfeggio=raw.notationSolfeggio;
  if(['12321','1321'].includes(raw.notationDigits))out.notationDigits=raw.notationDigits;
  if(Object.hasOwn(TRANSPOSE,raw.notationTranspose))out.notationTranspose=raw.notationTranspose;
  for(const key of ['notationPhrase','notationPhraseA'])if(validPhrase(raw[key]))out[key]=raw[key].map(note=>parseNote(note).name);
  if(Array.isArray(raw.notationMarks)&&raw.notationMarks.length===8&&raw.notationMarks.every(mark=>['none','#','b','natural'].includes(mark)))out.notationMarks=[...raw.notationMarks];
  if(['natural','sharp'].includes(raw.notationKey))out.notationKey=raw.notationKey;
  if(typeof raw.notationScopeTie==='boolean')out.notationScopeTie=raw.notationScopeTie;
  if(out.notationMarks[4]!=='none')out.notationScopeTie=false;
  const a=raw.notationA;
  if(a&&Number.isInteger(a.pitch)&&a.pitch>=48&&a.pitch<=83&&safeNote(a.spelling,48,83)&&noteToMidi(a.spelling)===a.pitch&&safeNote(a.reference,48,83)&&validPair(a.intervalNotes)&&typeof a.harmonic==='boolean')out.notationA={pitch:a.pitch,spelling:parseNote(a.spelling).name,reference:parseNote(a.reference).name,intervalNotes:a.intervalNotes.map(note=>parseNote(note).name),harmonic:a.harmonic};
  return out;
}

export function numberedNotes(s,tonic=s.notationTonic) {
  const scale=scaleNotes(tonic,'major');
  return [...s.notationDigits].map(digit=>scale[Number(digit)-1]);
}
export function notationReading(note,tonic='C4',system='movable') {
  const p=parseNote(note),root=parseNote(tonic),distance=p.octave*7+p.index-(root.octave*7+root.index),degree=((distance%7)+7)%7;
  const reference=scaleNotes(tonic,'major',false)[degree],octaves=Math.floor(distance/7),expected=noteToMidi(reference)+octaves*12,alteration=p.midi-expected;
  const sign=alteration>0?'♯'.repeat(alteration):'♭'.repeat(-alteration);
  const alterationWord=value=>value===0?'':value===1?'升':value===-1?'降':value===2?'重升':value===-2?'重降':`${value>0?'升高':'降低'}${Math.abs(value)}个半音的`;
  return {degree:degree+1,alteration,octaves,number:sign+(degree+1),syllable:system==='fixed'?alterationWord(p.accidental)+SYLLABLES[p.index]:alterationWord(alteration)+SYLLABLES[degree]};
}

/** Resolve actual pitch from key default and same-octave, same-bar accidental scope. */
export function accidentalReading(s) {
  const bases=['F4','F4','F5','F4','F4','F4','F5','F4'],rows=[];let memory=new Map();
  bases.forEach((written,beat)=>{
    if(beat%4===0)memory=new Map();
    const mark=s.notationMarks[beat],keyDefault=s.notationKey==='sharp'?'#':'';
    let accidental,reason;
    const continuation=beat===4&&s.notationScopeTie&&mark==='none';
    if(continuation){accidental=parseNote(rows[3].sounding).accidental;reason='承接前小节延音，保持原音高；不把它登记为本小节新临时记号。';}
    else if(mark!=='none'){accidental=mark==='natural'?0:mark==='#'?1:-1;memory.set(written,accidental);reason='本次明确记号；登记到本小节同一八度位置。';}
    else {accidental=memory.has(written)?memory.get(written):(keyDefault?1:0);reason=memory.has(written)?'沿用本小节同一八度位置的临时记号。':'按调号默认值；其他八度或前小节的临时记号不传递。';}
    const p=parseNote(written),sounding=p.letter+(accidental>0?'#'.repeat(accidental):'b'.repeat(-accidental))+p.octave;
    rows.push({beat,written,mark,sounding,reason,continuation});
  });
  return rows;
}
function scopeModel(s) {
  const events=[];
  for(const row of accidentalReading(s)){
    if(row.continuation)events.at(-1).duration+=1;
    else events.push(tone(row.sounding,row.beat));
  }
  return {beats:8,events,meta:{meter:'4/4',beatUnit:'四分音符',stepsPerBeat:2}};
}
export function notationModel(s,variant='current') {
  if(variant==='scope')return scopeModel(s);
  if(variant==='phrase'||variant==='phraseA')return {beats:(variant==='phraseA'?s.notationPhraseA:s.notationPhrase).length,events:(variant==='phraseA'?s.notationPhraseA:s.notationPhrase).map((note,beat)=>tone(note,beat))};
  if(variant==='numbered'||variant==='numbered-reference'){
    const notes=numberedNotes(s,variant==='numbered-reference'?(s.notationTonic==='G4'?'C4':'G4'):s.notationTonic);
    return {beats:notes.length,events:notes.map((note,beat)=>tone(note,beat))};
  }
  const a=variant==='A'?s.notationA:null;
  if(s.type==='pitch'){
    const note=a?.spelling||s.notationSpelling;
    if(variant==='reference')return {beats:4,events:[tone(s.notationReference,0),tone(note,1,2)]};
    return {beats:2,events:[tone(note,0,1)]};
  }
  const notes=a?.intervalNotes||s.intervalNotes,harmonic=a?.harmonic??s.harmonic;
  return {beats:4,events:harmonic?notes.map(note=>tone(note,0,2)):[tone(notes[0],0),tone(notes[1],1),...notes.map(note=>tone(note,2,2))],meta:{meter:'4/4',stepsPerBeat:2,beatUnit:'四分音符'}};
}
/** Keep unplayed time visible as rests in the single notated analytical line. */
export function notationScoreEvents(model) {
  const grouped=new Map();
  for(const e of model.events){const key=e.beat+':'+e.duration;if(!grouped.has(key))grouped.set(key,{beat:e.beat,duration:e.duration,notes:[]});grouped.get(key).notes.push(e.note);}
  const events=[];let end=0;
  for(const event of [...grouped.values()].sort((a,b)=>a.beat-b.beat)){
    if(event.beat>end+1e-8)events.push({beat:end,duration:event.beat-end,notes:[]});
    events.push(event);end=Math.max(end,event.beat+event.duration);
  }
  if(end<model.beats-1e-8)events.push({beat:end,duration:model.beats-end,notes:[]});
  return events;
}
function modelScore(s,model,title,playback='current') {
  return `<div data-lab-playback="${esc(playback)}">${scoreView({id:'notation-'+title,title,originalModel:true,meter:'4/4',beatsPerBar:4,bars:Math.ceil(model.beats/4),...(model.beats%4?{barBeats:Array.from({length:Math.ceil(model.beats/4)},(_,i)=>Math.min(4,model.beats-i*4))}:{})},{id:'current',label:title,parts:[{id:'notation-line',name:title,clef:s.notationClef,events:notationScoreEvents(model)}]})}</div>`;
}
function keyboard(s) {
  return `<div class="keyboard">${[48,60,72].map(base=>`<div class="octave"><div class="octave-label">${midiToNote(base)}—${midiToNote(base+11)}</div><div class="white-keys">${[0,2,4,5,7,9,11].map(n=>`<button class="piano-key is-white ${s.pitch===base+n?'is-selected':''}" data-lab-action="notation-pitch" data-midi="${base+n}" type="button" aria-label="弹奏${midiToNote(base+n)}"><span>${midiToNote(base+n)}</span></button>`).join('')}${[1,3,6,8,10].map((n,i)=>`<button class="piano-key is-black ${s.pitch===base+n?'is-selected':''}" data-lab-action="notation-pitch" data-midi="${base+n}" style="left:${[1,2,4,5,6][i]/7*100}%" type="button" aria-label="弹奏${midiToNote(base+n)}"><span>${pretty(midiToNote(base+n).replace(/\d/,''))}</span></button>`).join('')}</div></div>`).join('')}</div>`;
}
function numbersView(s) {
  const notes=numberedNotes(s),other=s.notationTonic==='G4'?'C4':'G4',reading=notationReading(s.notationSpelling,s.notationTonic,s.notationSolfeggio);
  return `<details data-lab-disclosure="notation-numbers"><summary>首调数字、固定唱名与具体八度</summary><div class="lab-fields">${field('数字1对应的大调起音',select('tonic',TONICS,s.notationTonic,n=>'1='+pretty(n)))}${field('唱名约定',select('solfeggio',['movable','fixed'],s.notationSolfeggio,n=>n==='movable'?'首调do（大调模型）':'固定唱名（C=do）'))}${field('数字句',select('digits',['12321','1321'],s.notationDigits,n=>[...n].join('—')))}</div><p class="lab-help">当前具体音${pretty(s.notationSpelling)}：以${pretty(s.notationTonic)}为1的大调参照，数字为${reading.number}，相对起音八度${reading.octaves>=0?'+':''}${reading.octaves}；所选唱名${esc(reading.syllable)}。变化唱名在这里用“升／降＋基本音节”说明，不混用其他教学体系。</p>${noteChips(notes)}<p class="lab-help">${[...s.notationDigits].join('—')} → ${notes.map(pretty).join('—')}。各字母后的数字是绝对八度号，简谱八度位置由上／下点表示；这里以明确文字说明相对八度。固定唱名随字母，首调唱名随所选大调角色。</p><div class="preset-row">${button('numbered','听当前数字句')}${button('numbered-reference','对照1='+pretty(other))}</div></details>`;
}
function pitchView(s) {
  const ref=noteToMidi(s.notationReference),distance=s.pitch-ref,direction=Math.sign(distance),path=Array.from({length:Math.abs(distance)+1},(_,i)=>midiToNote(ref+i*direction));
  return `<div class="lab-fields">${field('谱号',select('clef',['treble','bass'],s.notationClef,n=>n==='treble'?'高音谱号':'低音谱号'))}${field('保留拼写的具体音',`<input id="lab-notation-spelling" data-lab-field="notation-spelling" value="${esc(s.notationSpelling)}" maxlength="6" aria-label="具体音名，保留升降拼写">`)}</div>${modelScore(s,notationModel(s),'具体音与谱号')}<div class="relationship-result"><strong>${pretty(s.notationSpelling)}</strong><span>等音键位${pretty(midiToNote(s.pitch))} · ${frequency(s.pitch).toFixed(2)}Hz</span></div>${keyboard(s)}<div class="preset-row">${button('anchor','以当前音设置参考')}${button('compare','依次听参考与当前')}${button('save','保存当前为A')}${button('a','听草稿A')}</div><p class="lab-help">参考${pretty(s.notationReference)}→当前${pretty(s.notationSpelling)}：${distance>0?'上行':distance<0?'下行':'同高'}${Math.abs(distance)}个半音，频率比${(frequency(s.pitch)/frequency(ref)).toFixed(4)}。路径${path.map(pretty).join(' → ')}；数的是相邻间隔${Math.abs(distance)}次，不是${path.length}个键。此处仅使用十二平均律，不把滑音或其他调律压成固定键位。</p>${numbersView(s)}`;
}
function scopeView(s) {
  const rows=accidentalReading(s);
  return `<details data-lab-disclosure="notation-scope"><summary>临时变音、小节边界与跨线延音</summary><div class="lab-fields">${field('F的调号默认值',select('key',['natural','sharp'],s.notationKey,n=>n==='natural'?'无升降调号，F默认自然':'一个升号，所有八度F默认升'))}</div><label class="check-row"><input id="lab-notation-scope-tie" data-lab-field="notation-scope-tie" type="checkbox" ${s.notationScopeTie?'checked':''}>把第4拍F4连到第5拍，不重新起音（第5拍无新记号）</label><p class="lab-help">这里明确只有一个谱表。F4与F5是不同八度位置；进入第2小节时临时记号记忆重置，调号仍有效。表格的“无记号”表示原始写法；右列显示实际读音。</p><div class="lab-table-wrap"><table class="lab-event-table"><thead><tr><th>位置／写音</th><th>本次记号</th><th>实际读音与依据</th></tr></thead><tbody>${rows.map(row=>`<tr><th>第${Math.floor(row.beat/4)+1}小节第${row.beat%4+1}拍<br>${row.written}</th><td>${select('mark-'+row.beat,['none','#','b','natural'],row.mark,n=>({none:'无新记号','#':'升号♯',b:'降号♭',natural:'还原号♮'}[n]))}</td><td>${pretty(row.sounding)}${row.continuation?'（延续）':''}<br>${row.reason}</td></tr>`).join('')}</tbody></table></div>${button('scope','听实际读法')}<p class="lab-help">下方为读音结果的教学谱示，各音写出实际音高；临时记号原始输入以表格为准，不把结果谱上的重复提示号当成新的题面。</p>${modelScore(s,scopeModel(s),'临时变音读音结果','scope')}</details>`;
}
function phraseView(s) {
  return `<details data-lab-disclosure="notation-phrase"><summary>整句移调：同时保留字母与半音距离</summary><div class="lab-fields">${field('2至8个音，以空格分隔',`<input id="lab-notation-phrase" data-lab-field="notation-phrase" value="${esc(s.notationPhrase.join(' '))}" aria-label="待移调的短句音名">`)}</div>${noteChips(s.notationPhrase)}<div class="preset-row">${button('save-phrase','保留短句为A')}${button('phrase','听当前短句')}${button('phraseA','听短句A')}${button('transpose-phrase','按所选音程移调整句')}</div><p class="lab-help">所选操作${TRANSPOSE[s.notationTranspose].label}。每个音按同一个有方向的字母步数与半音数移动，发生越界或需要三重变音时整次操作拒绝，不截断短句。A保留原来整句。</p>${modelScore(s,notationModel(s,'phrase'),'当前移调短句','phrase')}</details>`;
}
function intervalView(s) {
  const result=intervalBetween(...s.intervalNotes),simple=result.number>8?((result.number-2)%7)+2:result.number;
  return `<div class="lab-fields">${s.intervalNotes.map((note,i)=>field(`第${i+1}个具体音`,`<input id="lab-notation-interval-${i}" data-lab-field="notation-interval-${i}" value="${esc(note)}" maxlength="6" aria-label="第${i+1}个音程端点">`)).join('')}${field('谱号',select('clef',['treble','bass'],s.notationClef,n=>n==='treble'?'高音谱号':'低音谱号'))}</div><div class="relationship-result"><span>字母跨度与半音距离共同决定</span><strong>${result.label}</strong><p>包含两端的字母跨度${result.number}度；实际距离${result.semitones}个半音。${result.number>8?`复音程还原为${result.quality}${simple}度；每移除一个八度，度数减7、半音减12。`:'简单音程转位先交换上下，通常互补度数之和为9；它与整组移调不同。'}</p></div>${noteChips(s.intervalNotes)}<label class="check-row"><input id="lab-notation-harmonic" data-lab-field="harmonic" type="checkbox" ${s.harmonic?'checked':''}>只听同时发声（取消后依次听两音，再听同时发声）</label>${modelScore(s,notationModel(s),'当前两音关系')}<div class="preset-row">${button('pair','C—D♯', 'data-pair="C4,D#4"')}${button('pair','C—E♭','data-pair="C4,Eb4"')}${button('reduce','复音程还原')}${button('invert','简单音程转位')}${button('expand','上音移高八度')}${button('save','保留两音为A')}${button('a','听草稿A')}</div><div class="lab-fields">${field('整体移调音程',select('transpose',Object.keys(TRANSPOSE),s.notationTranspose,key=>TRANSPOSE[key].label))}${button('transpose-pair','移调两个端点')}</div><p class="lab-help">复音程先还原，再做简单转位；转位按钮实际交换上下端点。移调则同时移动所有端点，保持内部音程和节奏。C3—B5键盘与C2—C7音程输入的边界各自明确。</p>${phraseView(s)}${scopeView(s)}`;
}
export function notationView(s) {return `<p class="lab-help">输入具体音名后按Enter应用；谱例保留字母与升降拼写。主播放与MIDI导出上方当前音或两音关系；展开区使用各自的试听按钮，数字句、整句及变音读法分别核对。${s.type==='pitch'?'单音样本为一拍音符加一拍休止，共两拍；短谱标出实际长度，不冒充完整4/4小节。':''}</p>${s.type==='pitch'?pitchView(s):intervalView(s)}`;}

function orderedPair(notes) {return [...notes].sort((a,b)=>noteToMidi(a)-noteToMidi(b));}
export function reducedPair(notes) {
  const [low,initialHigh]=orderedPair(notes);let high=initialHigh;
  while(intervalBetween(low,high).number>8)high=transposeOctaves(high,-1);
  if(!safeNote(high))throw new Error('还原后超出音域，请先输入较高的下端音。');
  return [low,high];
}
export function invertedPair(notes) {
  const sorted=orderedPair(notes),relationship=intervalBetween(...sorted);
  if(relationship.number>8||relationship.semitones>12)throw new Error('请先把复音程还原为八度以内，再做简单音程转位。');
  const raised=transposeOctaves(sorted[0],1);
  if(!safeNote(raised))throw new Error('转位后超出C2至C7，请降低原音区。');
  return [sorted[1],raised];
}
export async function notationAction(target,s,host) {
  const key=target.dataset.labAction;if(!supportsNotation(s)||!key?.startsWith('notation-'))return false;
  const action=key.slice(9),playVariants={a:'A',scope:'scope',phrase:'phrase',phraseA:'phraseA',numbered:'numbered','numbered-reference':'numbered-reference',compare:'reference'};
  if(playVariants[action]){await host.play(notationModel(s,playVariants[action]),s.bpm,playVariants[action]);return true;}
  try {
    if(action==='pitch'){const midi=Number(target.dataset.midi);if(!Number.isInteger(midi)||midi<48||midi>83)return true;s.pitch=midi;s.notationSpelling=midiToNote(midi);host.touch();host.render();await host.preview(s.notationSpelling);return true;}
    if(action==='anchor')s.notationReference=s.notationSpelling;
    else if(action==='save')s.notationA=snapshot(s);
    else if(action==='pair'){const pair=target.dataset.pair?.split(',');if(!validPair(pair))return true;s.intervalNotes=pair;}
    else if(action==='reduce')s.intervalNotes=reducedPair(s.intervalNotes);
    else if(action==='invert')s.intervalNotes=invertedPair(s.intervalNotes);
    else if(action==='expand'){const pair=orderedPair(s.intervalNotes),next=transposeOctaves(pair[1],1);if(!safeNote(next))throw new Error('移高后超出C2至C7。');s.intervalNotes=[pair[0],next];}
    else if(action==='transpose-pair'||action==='transpose-phrase'){const operation=TRANSPOSE[s.notationTranspose],key=action==='transpose-pair'?'intervalNotes':'notationPhrase';s[key]=s[key].map(note=>transposeWritten(note,operation.diatonic,operation.semitones));}
    else if(action==='save-phrase')s.notationPhraseA=[...s.notationPhrase];
    else return true;
    host.touch();host.render();host.restart();
  }catch(error){host.notify(error.message);}
  return true;
}
export async function notationField(target,s,host,eventType='change') {
  const key=target.dataset.labField;if(!supportsNotation(s)||!key?.startsWith('notation-'))return false;
  if(eventType!=='change')return true;
  try {
    const field=key.slice(9),value=target.value;
    if(field==='spelling'){const note=safeNote(value,48,83);if(!note)throw new Error('键盘与具体音谱示支持C3至B5；请附正确八度号。');s.notationSpelling=note;s.pitch=noteToMidi(note);}
    else if(field==='clef'&&['treble','bass'].includes(value))s.notationClef=value;
    else if(field==='tonic'&&TONICS.includes(value))s.notationTonic=value;
    else if(field==='solfeggio'&&['fixed','movable'].includes(value))s.notationSolfeggio=value;
    else if(field==='digits'&&['12321','1321'].includes(value))s.notationDigits=value;
    else if(field==='transpose'&&Object.hasOwn(TRANSPOSE,value))s.notationTranspose=value;
    else if(field==='interval-0'||field==='interval-1'){const note=safeNote(value);if(!note)throw new Error('音程输入支持C2至C7，需保留字母、升降与八度。');s.intervalNotes[Number(field.at(-1))]=note;}
    else if(field==='phrase'){const notes=value.trim().split(/\s+/);if(!validPhrase(notes))throw new Error('请填2至8个C2—C7音名，以空格分隔。');s.notationPhrase=notes.map(note=>parseNote(note).name);}
    else if(field==='key'&&['natural','sharp'].includes(value))s.notationKey=value;
    else if(field==='scope-tie'){s.notationScopeTie=target.checked;if(target.checked)s.notationMarks[4]='none';}
    else if(/^mark-[0-7]$/.test(field)&&['none','#','b','natural'].includes(value)){const index=Number(field.at(-1));s.notationMarks[index]=value;if(index===4&&value!=='none')s.notationScopeTie=false;}
    else return true;
    host.touch();host.render(target.id);host.restart();
  }catch(error){host.notify(error.message);host.render(target.id);}
  return true;
}
