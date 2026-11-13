import { noteToMidi, midiToNote, frequency, scaleNotes, chordNotes, PROGRESSIONS, closestVoicing, transposeOctaves } from './theory.js';
export { noteToMidi, midiToNote, frequency } from './theory.js';

/** Original teaching models. Events use the model's beat unit; 6/8 models explicitly use dotted-quarter beats. */
export const NOTE_CHOICES = Object.freeze(['C4', 'D4', 'E4', 'G4', 'A4']);

export const DEFAULT_DRUMS = Object.freeze({
  kick: Object.freeze([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]),
  snare: Object.freeze([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0]),
  hat: Object.freeze([1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
});

// The first bar is a starting idea; the learner supplies the following three bars.
export const DEFAULT_MOTIF = Object.freeze([
  'C4', 'E4', 'G4', 'E4', null, null, null, null,
  null, null, null, null, null, null, null, null,
]);

const KINDS = new Set(['tone','kick','snare','hat']);
const LAYERS = new Set(['melody','bass','rhythm']);

/** Validate without mutating the supplied model. Throws a useful error on invalid input. */
export function validateModel(model) {
  if (!model || !Number.isFinite(model.beats) || model.beats <= 0 || model.beats > 256) {
    throw new RangeError('教学片段需要有 0—256 拍之间的有效长度。');
  }
  if (!Array.isArray(model.events) || model.events.length > 8192) throw new TypeError('教学片段的音符事件无效。');
  for (const event of model.events) {
    if (!event || !Number.isFinite(event.beat) || event.beat < 0 || event.beat >= model.beats) {
      throw new RangeError('声音事件必须位于片段内。');
    }
    if (!Number.isFinite(event.duration) || event.duration <= 0 || event.beat + event.duration > model.beats + 1e-8) {
      throw new RangeError('声音事件的时值必须为正，且不超过片段末尾。');
    }
    if (!KINDS.has(event.kind) || !LAYERS.has(event.layer)) throw new TypeError('未知的声音或声部类型。');
    if (!Number.isFinite(event.velocity) || event.velocity < 0 || event.velocity > 1) throw new RangeError('声音力度需要在 0—1 之间。');
    if (event.kind === 'tone') noteToMidi(event.note);
  }
  return true;
}

export function makeListeningModel() {
  const events = [];
  const melody = ['C5', 'E5', 'G5', 'E5', 'D5', 'F5', 'A5', 'G5', 'E5', 'D5', 'C5', 'G4', 'D5', 'E5', 'D5', 'C5'];
  const bass = ['C3', 'G2', 'A2', 'E3', 'F3', 'C3', 'G2', 'G2'];
  melody.forEach((note, beat) => events.push({ beat, duration: beat % 4 === 3 ? 0.75 : 0.58, kind: 'tone', note, layer: 'melody', velocity: beat % 4 === 0 ? 0.82 : 0.68 }));
  bass.forEach((note, index) => events.push({ beat: index * 2, duration: 1.6, kind: 'tone', note, layer: 'bass', velocity: 0.8 }));
  for (let beat = 0; beat < 16; beat += 0.5) {
    events.push({ beat, duration: 0.12, kind: 'hat', layer: 'rhythm', velocity: Number.isInteger(beat) ? 0.48 : 0.27 });
    if (beat % 2 === 0) events.push({ beat, duration: 0.26, kind: 'kick', layer: 'rhythm', velocity: 0.78 });
    if (beat % 2 === 1) events.push({ beat, duration: 0.21, kind: 'snare', layer: 'rhythm', velocity: 0.52 });
  }
  return { beats: 16, events: events.sort((a, b) => a.beat - b.beat) };
}

export function makePulseModel() {
  return {
    beats: 4,
    events: [0, 1, 2, 3].map(beat => ({ beat, duration: 0.24, kind: 'kick', layer: 'rhythm', velocity: beat === 0 ? 0.95 : 0.48 })),
  };
}

export function makeRhythmModel(pattern = DEFAULT_DRUMS) {
  const events = [];
  for (const kind of ['kick', 'snare', 'hat']) {
    const row = pattern?.[kind];
    if (!Array.isArray(row) || row.length !== 16 || row.some(value => value !== 0 && value !== 1 && value !== false && value !== true)) {
      throw new TypeError('节奏需要三行各 16 个开关格。');
    }
    row.forEach((on, index) => {
      if (on) events.push({ beat: index * 0.5, duration: kind === 'hat' ? 0.1 : 0.24, kind, layer: 'rhythm', velocity: kind === 'kick' ? 0.82 : kind === 'snare' ? 0.62 : 0.42 });
    });
  }
  return { beats: 8, events: events.sort((a, b) => a.beat - b.beat) };
}

export function makeMelodyModel(notes = DEFAULT_MOTIF) {
  if (!Array.isArray(notes) || notes.length !== 16) throw new TypeError('旋律需要四小节、每小节四拍，共 16 个位置。');
  const events = [];
  notes.forEach((note, beat) => {
    if (note === null || note === '' || note === undefined) return;
    noteToMidi(note);
    events.push({ beat, duration: 0.82, kind: 'tone', note, layer: 'melody', velocity: beat % 4 === 0 ? 0.83 : 0.72 });
  });
  return { beats: 16, events };
}

export const METERS = {
  '4/4':{label:'4/4',beats:4,subdivision:2,unit:'四分音符',groups:'2 + 2 + 2 + 2'},
  '3/4':{label:'3/4',beats:3,subdivision:2,unit:'四分音符',groups:'2 + 2 + 2'},
  '6/8':{label:'6/8',beats:2,subdivision:3,unit:'附点四分音符',groups:'3 + 3'},
  '5/4':{label:'5/4',beats:5,subdivision:2,unit:'四分音符',groups:'每拍2格；试用重音组成3拍 + 2拍'}
};
export function drumPattern(meter='4/4') {
  const m=METERS[meter];if(!m)throw new RangeError('未知拍号。');
  const length=m.beats*m.subdivision*2;
  return Object.fromEntries(['kick','snare','hat'].map(kind=>[kind,Array.from({length},(_,i)=>{
    const beat=i/m.subdivision;
    if(kind==='hat')return i%(m.beats*m.subdivision)===0?2:1;
    if(kind==='kick')return beat%m.beats===0?2:Number.isInteger(beat)&&beat%2===0?1:0;
    return Number.isInteger(beat)&&beat%2===1?2:0;
  })]));
}
export function meteredRhythmModel(pattern,meter='4/4') {
  const m=METERS[meter];if(!m)throw new RangeError('未知拍号。');
  const length=m.beats*m.subdivision*2,events=[];
  for(const kind of ['kick','snare','hat']) {
    if(!Array.isArray(pattern[kind])||pattern[kind].length!==length)throw new RangeError('节奏格与拍号不一致。');
    pattern[kind].forEach((value,i)=>{if(![0,1,2].includes(value))throw new RangeError('节奏格值无效。');if(value)events.push({beat:i/m.subdivision,duration:Math.min(.2,.8/m.subdivision),kind,layer:'rhythm',velocity:value===2?.88:.43});});
  }
  return {beats:m.beats*2,events,meta:{meter,stepsPerBeat:m.subdivision,beatUnit:m.unit}};
}
export function pulseModel(meter='4/4') {
  const m=METERS[meter]||METERS['4/4'];
  return {beats:m.beats,events:Array.from({length:m.beats},(_,i)=>({beat:i,duration:.15,kind:'kick',layer:'rhythm',velocity:i===0?.95:.48})),meta:{meter,stepsPerBeat:m.subdivision,beatUnit:m.unit}};
}
export function intervalModel(notes=['C4','E4'],harmonic=false) {
  const a=notes[0],b=notes[1];noteToMidi(a);noteToMidi(b);
  const events=harmonic?[a,b].map(note=>({beat:0,duration:2,kind:'tone',note,layer:'melody',velocity:.65})):[{beat:0,note:a},{beat:1,note:b},{beat:2,note:a},{beat:2,note:b}].map(e=>({...e,duration:e.beat===2?1.5:.7,kind:'tone',layer:'melody',velocity:.65}));
  return {beats:4,events};
}
export function scaleModel(root='C4',mode='major') {
  const notes=scaleNotes(root,mode);
  return {beats:notes.length*.5+.5,events:notes.map((note,i)=>({beat:i*.5,duration:i===notes.length-1?.75:.4,kind:'tone',note,layer:'melody',velocity:i===0||i===notes.length-1?.85:.62}))};
}
export function chordModel(root='C4',quality='major',inversion=0) {
  const notes=chordNotes(root,quality,inversion);
  return {beats:5,events:[...notes.map(note=>({beat:0,duration:1.8,note,kind:'tone',layer:'melody',velocity:.55})),...notes.map((note,i)=>({beat:2+i*.5,duration:.42,note,kind:'tone',layer:'melody',velocity:.7}))]};
}
export function progressionVoicings(name='authentic',smooth=false) {
  const preset=PROGRESSIONS[name]||PROGRESSIONS.authentic;let previous=null;
  return preset.items.map(([root,quality,numeral])=>{
    let notes=chordNotes(root,quality);if(smooth)notes=closestVoicing(notes,previous);previous=notes;
    return {root,quality,numeral,notes};
  });
}
export function progressionModel(name='authentic',{smooth=false,beatsPerChord=4,withBass=true}={}) {
  const frames=progressionVoicings(name,smooth),events=[];
  frames.forEach((frame,i)=>{
    const beat=i*beatsPerChord;
    for(const note of frame.notes)events.push({beat,duration:beatsPerChord-.15,note,kind:'tone',layer:'melody',velocity:.43});
    if(withBass)events.push({beat,duration:beatsPerChord-.1,note:transposeOctaves(frame.root,-1),kind:'tone',layer:'bass',velocity:.7});
  });
  return {beats:frames.length*beatsPerChord,events};
}
export function melodyModel(notes,{accompaniment=false}={}) {
  const result=makeMelodyModel(notes);
  if(accompaniment) {
    const backing=progressionModel('triads',{smooth:true,beatsPerChord:4});
    result.events.push(...backing.events.map(e=>({...e,velocity:e.velocity*.55})));
  }
  return result;
}
export function formModel(clips,order=['A','B','Aprime']) {
  const events=[];order.forEach((id,i)=>{
    const clip=clips[id];if(!Array.isArray(clip)||clip.length!==16)throw new RangeError('每个片段需要16个四分拍位。');
    events.push(...melodyModel(clip).events.map(e=>({...e,beat:e.beat+i*16})));
  });return {beats:order.length*16,events};
}
export function timbreModel({waveform='triangle',attack=.02,release=.15,space='dry'}={}) {
  return {beats:8,events:['C4','G4','E4','C4'].map((note,i)=>({beat:i*2,duration:1.3,note,kind:'tone',layer:'melody',velocity:.7,waveform,attack,release})),meta:{space}};
}
