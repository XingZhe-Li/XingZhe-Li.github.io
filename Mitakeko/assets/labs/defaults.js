import { DEFAULT_MOTIF, drumPattern, METERS } from '../music/models.js';
import { MODES,CHORDS,PROGRESSIONS,parseNote,scaleNotes,chordNotes } from '../music/theory.js';
import { timedDefaults,normalizeTimed } from './timed.js';
import { ensembleDefaults,normalizeEnsemble } from './ensemble.js';
import { developmentDefaults,normalizeDevelopment } from './development.js';
import { foundationDefaults,normalizeFoundation } from './foundation-lab.js';
import { notationDefaults,normalizeNotation } from './notation-lab.js';
import { collectionsDefaults,normalizeCollections } from './collections.js';
import { tonalDefaults,normalizeTonal } from './tonal.js';
export const LAB_TYPES = {
  layers:'声音层次',tempo:'拍点与速度',rhythm:'节奏与分组',pitch:'音高与记谱',interval:'音程拼写',scale:'音阶与调式',motif:'动机与短句',chord:'和弦构造',progression:'和声进行',voicing:'声部连接',timbre:'音色与空间',form:'片段与结构'
};
export const LAB_SCENARIOS = {
  rhythm:['notation-basics','duration','syncopation','rhythm-project'],motif:['motif','sequence','phrase','riff','development'],
  layers:['groove','texture','register'],voicing:['counterpoint'],chord:['nonchord'],
  progression:['harmonic-rhythm','reharmonization'],timbre:['envelope','space','delivery'],
  form:['ternary','song','sonata','timbre-form','revision']
};
export const MELODY_NOTES = ['B3','C4','C#4','D4','Eb4','E4','F4','F#4','G4','Ab4','A4','Bb4','B4','C5','D5','E5','F#5','G5'];
const copy=value=>JSON.parse(JSON.stringify(value));
export function makeLab(type='layers',config={}) {
  if(!LAB_TYPES[type])type='layers';
  let root='C4';try{if(config.root&&parseNote(config.root).midi>=36&&parseNote(config.root).midi<=84)root=config.root;}catch{}
  const meter=METERS[config.meter]?config.meter:'4/4';
  const first=['C4','E4','G4','E4'];
  const A=Array.from({length:4},()=>[...first]).flat();
  return {type,root,mode:MODES[config.mode]?config.mode:'major',quality:CHORDS[config.quality]?config.quality:'major',inversion:0,
    intervalNotes:Array.isArray(config.intervalNotes)&&config.intervalNotes.length===2?[...config.intervalNotes]:['C4','E4'],harmonic:false,
    bpm:90,volume:.5,meter,drums:drumPattern(meter),drumsA:drumPattern(meter),melody:[...DEFAULT_MOTIF],melodyA:[...DEFAULT_MOTIF],
    layers:{melody:true,bass:true,rhythm:true},progression:PROGRESSIONS[config.progression]?config.progression:(type==='voicing'?'triads':'authentic'),smooth:type==='voicing',beatsPerChord:4,withBass:true,
    waveform:'triangle',attack:.02,release:.18,space:'dry',pitch:60,
    clips:{A,B:['G4','A4','G4','E4','F4','G4','F4','D4','E4','F4','E4','D4','D4','E4','D4','C4'],Aprime:A.map((n,i)=>i===15?'C4':n)},order:['A','B','Aprime'],selectedClip:'A',focus:config.focus||'',scenario:config.scenario||'',
    ...timedDefaults(type,config),...ensembleDefaults(type,config),...developmentDefaults(type,config),
    ...foundationDefaults(type,config),...notationDefaults(type,config),...collectionsDefaults(type,config),...tonalDefaults(type,config)};
}
export function normalizeLab(raw,type,config={}) {
  const out=makeLab(type,config);if(!raw||typeof raw!=='object'||Array.isArray(raw))return out;
  const bounded=(key,min,max)=>{if(Number.isFinite(raw[key]))out[key]=Math.max(min,Math.min(max,raw[key]));};
  bounded('bpm',40,180);out.bpm=Math.round(out.bpm);bounded('attack',.005,.6);bounded('release',.03,1.2);bounded('pitch',48,83);out.pitch=Math.round(out.pitch);
  try{const p=parseNote(raw.root);if(p.midi>=36&&p.midi<=84)out.root=p.name;}catch{}
  for(const [field,allowed] of [['mode',MODES],['quality',CHORDS],['progression',PROGRESSIONS],['meter',METERS]])if(Object.hasOwn(allowed,raw[field]))out[field]=raw[field];
  if(Number.isInteger(raw.inversion)&&raw.inversion>=0&&raw.inversion<CHORDS[out.quality].intervals.length)out.inversion=raw.inversion;
  if([1,2,4].includes(raw.beatsPerChord))out.beatsPerChord=raw.beatsPerChord;
  for(const key of ['harmonic','smooth','withBass'])if(typeof raw[key]==='boolean')out[key]=raw[key];
  if(['sine','triangle','sawtooth','square'].includes(raw.waveform))out.waveform=raw.waveform;
  if(['dry','echo','room'].includes(raw.space))out.space=raw.space;
  if(Array.isArray(raw.intervalNotes)&&raw.intervalNotes.length===2){try{if(raw.intervalNotes.every(n=>parseNote(n).midi>=36&&parseNote(n).midi<=96))out.intervalNotes=[...raw.intervalNotes];}catch{}}
  if(raw.layers&&typeof raw.layers==='object')for(const role of ['melody','bass','rhythm'])if(typeof raw.layers[role]==='boolean')out.layers[role]=raw.layers[role];
  const length=METERS[out.meter].beats*METERS[out.meter].subdivision*2;
  for(const key of ['drums','drumsA']){
    out[key]=drumPattern(out.meter);
    for(const role of ['kick','snare','hat'])if(Array.isArray(raw[key]?.[role])&&raw[key][role].length===length&&raw[key][role].every(v=>[0,1,2].includes(v)))out[key][role]=[...raw[key][role]];
  }
  const validMelody=value=>Array.isArray(value)&&value.length===16&&value.every(n=>{if(n===null)return true;try{return parseNote(n).midi>=36&&parseNote(n).midi<=96;}catch{return false;}});
  for(const key of ['melody','melodyA'])if(validMelody(raw[key]))out[key]=[...raw[key]];
  for(const key of ['A','B','Aprime'])if(validMelody(raw.clips?.[key]))out.clips[key]=[...raw.clips[key]];
  if(Array.isArray(raw.order)&&raw.order.length>=2&&raw.order.length<=4&&raw.order.every(s=>['A','B','Aprime'].includes(s)))out.order=[...raw.order];
  if(['A','B','Aprime'].includes(raw.selectedClip))out.selectedClip=raw.selectedClip;
  // A syntactically valid root can require unsupported triple accidentals in
  // its derived scale/chord. Restore a safe lesson root before persisting it.
  try{if(type==='scale')scaleNotes(out.root,out.mode);if(type==='chord')chordNotes(out.root,out.quality,out.inversion);}
  catch{out.root=makeLab(type,config).root;}
  normalizeTimed(raw,out);normalizeEnsemble(raw,out);normalizeDevelopment(raw,out);
  normalizeFoundation(raw,out);normalizeNotation(raw,out);normalizeCollections(raw,out);normalizeTonal(raw,out);
  return copy(out);
}
