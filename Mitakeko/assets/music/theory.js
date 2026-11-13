const LETTERS = ['C','D','E','F','G','A','B'];
const NATURAL = [0,2,4,5,7,9,11];
const SHARPS = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const FLATS = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
export const ROOTS = ['C4','Db4','D4','Eb4','E4','F4','F#4','G4','Ab3','A3','Bb3','B3'];
export function parseNote(value) {
  if(typeof value!=='string')throw new TypeError('请使用 C4、F#4 或 Bb3 这样的音名。');
  const text=value.trim().replaceAll('♯','#').replaceAll('♭','b');
  const m=/^([A-Ga-g])(#{1,2}|b{1,2})?(-?\d)$/.exec(text);
  if(!m)throw new RangeError('无法识别音名：'+value);
  const letter=m[1].toUpperCase(),index=LETTERS.indexOf(letter),accidental=(m[2]||'').split('').reduce((sum,c)=>sum+(c==='#'?1:-1),0),octave=Number(m[3]);
  const midi=(octave+1)*12+NATURAL[index]+accidental;
  if(midi<0||midi>127)throw new RangeError('音高超出 MIDI 范围。');
  return {letter,index,accidental,octave,midi,name:letter+(m[2]||'')+octave};
}
export const noteToMidi = value => parseNote(value).midi;
export function midiToNote(value,prefer='sharp') {
  if(!Number.isInteger(value)||value<0||value>127)throw new RangeError('无效 MIDI 音高。');
  return (prefer==='flat'?FLATS:SHARPS)[value%12]+(Math.floor(value/12)-1);
}
export function frequency(value) {
  const midi=typeof value==='number'?value:noteToMidi(value);
  if(!Number.isFinite(midi)||midi<0||midi>127)throw new RangeError('无效音高。');
  return 440*2**((midi-69)/12);
}
export function transposeOctaves(note,octaves) {
  const p=parseNote(note);return p.letter+(p.accidental>0?'#'.repeat(p.accidental):'b'.repeat(-p.accidental))+(p.octave+octaves);
}
function spell(midi,diatonicPosition) {
  const index=((diatonicPosition%7)+7)%7,octave=Math.floor(diatonicPosition/7);
  const delta=midi-((octave+1)*12+NATURAL[index]);
  if(Math.abs(delta)>2)throw new RangeError('此示例需要超过重升降号的拼写。');
  return LETTERS[index]+(delta>0?'#'.repeat(delta):'b'.repeat(-delta))+octave;
}
export function intervalBetween(first,second) {
  const a=parseNote(first),b=parseNote(second),diatonic=Math.abs((b.octave*7+b.index)-(a.octave*7+a.index));
  const number=diatonic+1,simple=diatonic%7+1,octaves=Math.floor(diatonic/7),semitones=Math.abs(b.midi-a.midi);
  const expected=NATURAL[simple-1]+12*octaves,delta=semitones-expected,perfect=[1,4,5].includes(simple);
  let quality;
  if(perfect)quality=delta===0?'纯':delta===1?'增':delta===-1?'减':delta>1?'倍增':'倍减';
  else quality=delta===0?'大':delta===-1?'小':delta===1?'增':delta===-2?'减':delta>1?'倍增':'倍减';
  const numerals=['','一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五'];
  return {number,simple,semitones,quality,direction:Math.sign(b.midi-a.midi),label:quality+(numerals[number]||number)+'度'};
}
export const MODES = {
  major:{label:'大调音阶',intervals:[0,2,4,5,7,9,11],degrees:[0,1,2,3,4,5,6]},
  naturalMinor:{label:'自然小调音阶',intervals:[0,2,3,5,7,8,10],degrees:[0,1,2,3,4,5,6]},
  harmonicMinor:{label:'和声小调',intervals:[0,2,3,5,7,8,11],degrees:[0,1,2,3,4,5,6]},
  melodicMinor:{label:'旋律小调上行形式',intervals:[0,2,3,5,7,9,11],degrees:[0,1,2,3,4,5,6]},
  dorian:{label:'Dorian / 多利亚',intervals:[0,2,3,5,7,9,10],degrees:[0,1,2,3,4,5,6]},
  mixolydian:{label:'Mixolydian / 混合利底亚',intervals:[0,2,4,5,7,9,10],degrees:[0,1,2,3,4,5,6]},
  lydian:{label:'Lydian / 利底亚',intervals:[0,2,4,6,7,9,11],degrees:[0,1,2,3,4,5,6]},
  phrygian:{label:'Phrygian / 弗里吉亚',intervals:[0,1,3,5,7,8,10],degrees:[0,1,2,3,4,5,6]},
  majorPentatonic:{label:'大调五声音集',intervals:[0,2,4,7,9],degrees:[0,1,2,4,5]},
  minorPentatonic:{label:'小调五声音集',intervals:[0,3,5,7,10],degrees:[0,2,3,4,6]}
};
export function scaleNotes(root='C4',mode='major',includeOctave=true) {
  const p=parseNote(root),definition=MODES[mode];if(!definition)throw new RangeError('未知音阶模型。');
  const notes=definition.intervals.map((semi,i)=>spell(p.midi+semi,p.octave*7+p.index+definition.degrees[i]));
  if(includeOctave)notes.push(spell(p.midi+12,p.octave*7+p.index+7));
  return notes;
}
export const CHORDS = {
  major:{label:'大三和弦',suffix:'',intervals:[0,4,7],degrees:[0,2,4]},
  minor:{label:'小三和弦',suffix:'m',intervals:[0,3,7],degrees:[0,2,4]},
  diminished:{label:'减三和弦',suffix:'°',intervals:[0,3,6],degrees:[0,2,4]},
  augmented:{label:'增三和弦',suffix:'+',intervals:[0,4,8],degrees:[0,2,4]},
  maj7:{label:'大七和弦',suffix:'maj7',intervals:[0,4,7,11],degrees:[0,2,4,6]},
  min7:{label:'小七和弦',suffix:'m7',intervals:[0,3,7,10],degrees:[0,2,4,6]},
  dom7:{label:'属七型和弦',suffix:'7',intervals:[0,4,7,10],degrees:[0,2,4,6]},
  halfDim7:{label:'半减七和弦',suffix:'ø7',intervals:[0,3,6,10],degrees:[0,2,4,6]},
  dim7:{label:'减七和弦',suffix:'°7',intervals:[0,3,6,9],degrees:[0,2,4,6]},
  sus2:{label:'挂二和弦',suffix:'sus2',intervals:[0,2,7],degrees:[0,1,4]},
  sus4:{label:'挂四和弦',suffix:'sus4',intervals:[0,5,7],degrees:[0,3,4]},
  add9:{label:'附加九音和弦',suffix:'add9',intervals:[0,4,7,14],degrees:[0,2,4,8]}
};
export function chordNotes(root='C4',quality='major',inversion=0) {
  const p=parseNote(root),d=CHORDS[quality];if(!d)throw new RangeError('未知和弦类型。');
  if(!Number.isInteger(inversion)||inversion<0||inversion>=d.intervals.length)throw new RangeError('无效转位。');
  const notes=d.intervals.map((semi,i)=>spell(p.midi+semi,p.octave*7+p.index+d.degrees[i]));
  const bass=notes[inversion],bassMidi=noteToMidi(bass);
  return [bass,...notes.filter((_,i)=>i!==inversion).map(note=>{
    while(noteToMidi(note)<bassMidi)note=transposeOctaves(note,1);
    return note;
  }).sort((a,b)=>noteToMidi(a)-noteToMidi(b))];
}
export function chordSymbol(root,quality) {
  const p=parseNote(root);return p.name.replace(/-?\d$/,'')+(CHORDS[quality]?.suffix||'');
}
export function diatonicChords(root='C4',mode='major') {
  const scale=scaleNotes(root,mode,false);if(scale.length!==7)throw new RangeError('此表使用七声音阶。');
  const romans=['I','II','III','IV','V','VI','VII'];
  return scale.map((r,i)=>{
    const third=i+2,fifth=i+4;
    const notes=[r,transposeOctaves(scale[third%7],Math.floor(third/7)),transposeOctaves(scale[fifth%7],Math.floor(fifth/7))];
    const semis=notes.map(n=>noteToMidi(n)-noteToMidi(r));
    const quality=Object.keys(CHORDS).find(k=>CHORDS[k].intervals.length===3&&JSON.stringify(CHORDS[k].intervals)===JSON.stringify(semis))||'major';
    const numeral=quality==='minor'?romans[i].toLowerCase():quality==='diminished'?romans[i].toLowerCase()+'°':quality==='augmented'?romans[i]+'+':romans[i];
    return {degree:i+1,root:r,quality,notes,numeral,symbol:chordSymbol(r,quality)};
  });
}
export const PROGRESSIONS = {
  tonicizationG:{label:'短暂指向G后回C：C—Am—D7—G—G7—C',items:[['C4','major','I (C)'],['A3','minor','vi (C)'],['D4','dom7','V7/V (C)'],['G3','major','V (C)'],['G3','dom7','V7 (C)'],['C4','major','I (C)']]},
  modulationG:{label:'在G调延展与收束：C—Am—D7—G—Am—D7—G',items:[['C4','major','I (C)'],['A3','minor','vi (C)'],['D4','dom7','V7/V (C)'],['G3','major','V (C) / I (G)'],['A3','minor','ii (G)'],['D4','dom7','V7 (G)'],['G3','major','I (G)']]},
  authentic:{label:'C大调：I—IV—V7—I',items:[['C4','major','I'],['F4','major','IV'],['G4','dom7','V7'],['C4','major','I']]},
  triads:{label:'三和弦连接：I—IV—V—I',items:[['C4','major','I'],['F4','major','IV'],['G4','major','V'],['C4','major','I']]},
  deceptive:{label:'C大调：I—IV—V7—vi',items:[['C4','major','I'],['F4','major','IV'],['G4','dom7','V7'],['A3','minor','vi']]},
  jazz251:{label:'C调：ii7—V7—Imaj7',items:[['D4','min7','ii7'],['G4','dom7','V7'],['C4','maj7','Imaj7']]},
  secondary:{label:'C调：I—V7/ii—ii—V7—I',items:[['C4','major','I'],['A3','dom7','V7/ii'],['D4','minor','ii'],['G4','dom7','V7'],['C4','major','I']]},
  borrowed:{label:'C调借用：I—IV—iv—I',items:[['C4','major','I'],['F4','major','IV'],['F4','minor','iv'],['C4','major','I']]},
  modal:{label:'A Dorian：i—♭VII—IV—i',items:[['A3','minor','i'],['G3','major','♭VII'],['D4','major','IV'],['A3','minor','i']]},
  modalMinor:{label:'A自然小调对照：i—♭VII—iv—i',items:[['A3','minor','i'],['G3','major','♭VII'],['D4','minor','iv'],['A3','minor','i']]},
  borrowedReference:{label:'借用对照：I—IV—IV—I',items:[['C4','major','I'],['F4','major','IV'],['F4','major','IV'],['C4','major','I']]},
  secondaryDiatonic:{label:'副属对照：I—vi—ii—V7—I',items:[['C4','major','I'],['A3','minor','vi'],['D4','minor','ii'],['G4','dom7','V7'],['C4','major','I']]}
};
export function voiceLeadingCost(a,b) {
  if(a.length!==b.length)throw new RangeError('请比较相同数量的声部。');
  const aa=a.map(n=>typeof n==='number'?n:noteToMidi(n)).sort((x,y)=>x-y),bb=b.map(n=>typeof n==='number'?n:noteToMidi(n)).sort((x,y)=>x-y);
  return aa.reduce((sum,n,i)=>sum+Math.abs(n-bb[i]),0);
}
export function closestVoicing(notes,previous=null) {
  const original=notes.map(noteToMidi).sort((a,b)=>a-b),candidates=[];
  for(let inversion=0;inversion<original.length;inversion++) {
    const inverted=original.slice(inversion).concat(original.slice(0,inversion).map(n=>n+12));
    for(let octave=-2;octave<=1;octave++) {
      const c=inverted.map(n=>n+12*octave);if(c[0]<48||c.at(-1)>84)continue;
      const cost=previous&&previous.length===c.length?voiceLeadingCost(previous,c):Math.abs(c.reduce((s,n)=>s+n,0)/c.length-64);
      candidates.push({notes:c,cost});
    }
  }
  candidates.sort((a,b)=>a.cost-b.cost);return (candidates[0]?.notes||original).map(n=>{const written=notes.find(s=>noteToMidi(s)%12===n%12);return transposeOctaves(written,(n-noteToMidi(written))/12);});
}
