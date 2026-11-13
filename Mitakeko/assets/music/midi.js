import { noteToMidi } from './theory.js';
import { validateModel } from './models.js';
const bytes = text => [...text].map(c=>c.charCodeAt(0));
const u32=n=>[(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255];
function variable(value) {let v=value>>>0,result=[v&127];while((v>>>=7)>0)result.unshift((v&127)|128);return result;}
/** Encode original teaching events as a standard MIDI format-0 file. */
export function encodeMidi(model,bpm=90) {
  validateModel(model);if(!Number.isFinite(bpm)||bpm<30||bpm>240)throw new RangeError('MIDI速度无效。');
  const dotted=model.meta?.beatUnit==='附点四分音符';
  const multiplier=[.5,1,1.5,2].includes(model.meta?.quartersPerBeat)?model.meta.quartersPerBeat:dotted?1.5:1,tempo=Math.round(60000000/(bpm*multiplier)),ticksPerBeat=480*multiplier;
  const events=[],drums={kick:36,snare:38,hat:42};
  for(const e of model.events) {
    const channel=e.kind==='tone'?(Number.isInteger(e.channel)&&e.channel>=0&&e.channel<=15&&e.channel!==9?e.channel:e.layer==='bass'?1:0):9,note=e.kind==='tone'?noteToMidi(e.note):drums[e.kind];
    const start=Math.round(e.beat*ticksPerBeat),end=Math.max(start+1,Math.round((e.beat+e.duration)*ticksPerBeat));
    events.push({tick:start,off:false,data:[0x90|channel,note,Math.max(1,Math.min(127,Math.round(e.velocity*100)))]},{tick:end,off:true,data:[0x80|channel,note,0]});
  }
  events.sort((a,b)=>a.tick-b.tick||Number(b.off)-Number(a.off));
  const signature=(model.meta?.meter||'4/4').split('/').map(Number);
  const track=[0,0xff,0x51,3,(tempo>>>16)&255,(tempo>>>8)&255,tempo&255,0,0xff,0x58,4,signature[0],Math.log2(signature[1]),Math.round(multiplier*24),8];
  let last=0;for(const event of events){track.push(...variable(event.tick-last),...event.data);last=event.tick;}
  const end=Math.max(last,Math.round(model.beats*ticksPerBeat));track.push(...variable(end-last),0xff,0x2f,0);
  return new Uint8Array([...bytes('MThd'),0,0,0,6,0,0,0,1,1,224,...bytes('MTrk'),...u32(track.length),...track]);
}
