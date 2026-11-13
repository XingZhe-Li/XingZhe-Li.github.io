import { esc, pretty, options } from '../ui.js';
import { parseNote, transposeOctaves } from '../music/theory.js';
import { progressionModel } from '../music/models.js';
import { scoreView } from '../cases/notation.js';

const copy = value => JSON.parse(JSON.stringify(value));
const EPS = 1e-7;
const MIN_DURATION = 1 / 24;
const RHYTHM_SCENARIOS = ['notation-basics', 'duration', 'syncopation', 'rhythm-project'];
const SCENARIOS = [...RHYTHM_SCENARIOS, 'motif', 'sequence', 'phrase', 'riff', 'development'];
const TRANSFORMS = ['major-second', 'perfect-fifth', 'octave-up', 'octave-down', 'diatonic-step', 'augment', 'diminish'];
const event = (note, beat, duration) => ({ note, beat, duration });
const near = (a, b) => Math.abs(a - b) < EPS;
const PROJECT_ROLES = ['kick', 'snare', 'hat'];
const PROJECT_NAMES = { kick: '底鼓', snare: '军鼓', hat: '踩镲' };
const isProject = s => s.type === 'rhythm' && s.timedScenario === 'rhythm-project';
function projectDrums() {
  return Object.fromEntries(PROJECT_ROLES.map(role => [role, Array.from({ length: 64 }, (_, index) => {
    const step = index % 8;
    if (role === 'hat') return step === 0 ? 2 : 1;
    if (role === 'kick') return step === 0 ? 2 : step === 4 ? 1 : 0;
    return step === 2 || step === 6 ? 2 : 0;
  })]));
}

function normalizeProjectDrums(raw, fallback) {
  return Object.fromEntries(PROJECT_ROLES.map(role => [role, Array.isArray(raw?.[role]) && raw[role].length === 64 && raw[role].every(value => [0, 1, 2].includes(value)) ? [...raw[role]] : [...fallback[role]]]));
}

function projectModel(s, variant) {
  const pattern = variant === 'A' ? s.timedProjectA : s.timedProjectDrums, events = [];
  for (const kind of PROJECT_ROLES) pattern[kind].forEach((value, index) => {
    if (value) events.push({ beat: index / 2, duration: kind === 'hat' ? .1 : .2, kind, layer: 'rhythm', velocity: value === 2 ? .88 : .43, channel: 9 });
  });
  return { beats: 32, events: events.sort((a, b) => a.beat - b.beat), meta: { meter: '4/4', beatUnit: '四分音符', stepsPerBeat: 2 } };
}

function projectView(s) {
  const counts = PROJECT_ROLES.map(role => `${PROJECT_NAMES[role]}${s.timedProjectDrums[role].filter(Boolean).length}次`);
  const changes = PROJECT_ROLES.map(role => s.timedProjectDrums[role].filter((value, index) => value !== s.timedProjectA[role][index]).length).reduce((sum, value) => sum + value, 0);
  return `<h3 class="small-heading">八小节 · 三声部节奏作品</h3><p class="lab-help">固定4/4、八小节，共32个四分拍；每拍两格。底鼓、军鼓、踩镲可同时发声且分别编辑。每格依次切换：留白 → 普通 → 重音。鼓声自然衰减；格子表示起音与力度，不表示延音线。</p><div class="rhythm-bars timed-project-bars">${Array.from({ length: 8 }, (_, bar) => `<section class="rhythm-bar"><h3>第${bar + 1}小节</h3>${PROJECT_ROLES.map(role => `<div class="drum-row"><span class="drum-label">${PROJECT_NAMES[role]}</span><div class="drum-steps" style="grid-template-columns:repeat(8,minmax(0,1fr))">${Array.from({ length: 8 }, (_, step) => {
    const index = bar * 8 + step, value = s.timedProjectDrums[role][index];
    return `<button type="button" class="step ${value ? 'is-active' : ''} ${value === 2 ? 'is-accent' : ''}" data-lab-action="timed-project-step" data-role="${role}" data-index="${index}" data-playhead="${index}" aria-label="${PROJECT_NAMES[role]} 第${bar + 1}小节第${step + 1}格 ${['留白', '普通', '重音'][value]}">${step % 2 === 0 ? Math.floor(step / 2) + 1 : '·'}</button>`;
  }).join('')}</div></div>`).join('')}</section>`).join('')}</div><div class="preset-row"><button class="btn btn-small" data-lab-action="timed-save" type="button">保留全部三声部为A</button><button class="btn btn-small" data-lab-action="timed-a" type="button">听八小节草稿A</button><button class="btn btn-small" data-lab-action="timed-project-copy" type="button">把前两小节复制到八小节</button><button class="btn btn-small" data-lab-action="timed-project-fill" type="button">只为第八小节加入过门</button><button class="btn btn-small" data-lab-action="timed-reset" type="button">恢复三声部起点</button></div><p class="lab-help" data-timed-feedback>当前起音：${counts.join('，')}。与A比较，共${changes}个声部格的起音或力度改变。复制按钮保留前两小节的三条线；过门只改变第八小节军鼓最后两拍，不改变前七小节。</p><p class="lab-help">先保持底鼓与军鼓提供方向，再用踩镲留白或重音调整表面运动。保留A后，只改变一个声部并回听；最后比较第八小节过门是否提示下一轮第一拍。播放、MIDI及学习记录均包含完整八小节三条线。</p>`;
}

export function supportsTimed(s) {
  return s.type === 'motif' || (s.type === 'rhythm' && RHYTHM_SCENARIOS.includes(s.timedScenario));
}
const barLength = s => s.type === 'rhythm' && s.timedScenario === 'syncopation' ? 5 : 4;
const horizons = s => [.5, 1, 2, 4, 8].map(bars => bars * barLength(s));

/** Fractions are kept as numbers only after parsing, so 1/3 is not rounded to .33. */
export function parseBeat(value) {
  const text = String(value).trim();
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*(?:\d+(?:\.\d*)?|\.\d+))?$/.test(text)) throw new Error('拍数请填写非负数或分数，例如 1.5、3/2、1/3。');
  const [numerator, denominator = '1'] = text.split('/');
  const result = Number(numerator) / Number(denominator);
  if (!Number.isFinite(result)) throw new Error('分母必须大于0。');
  return result;
}

export function beatText(value) {
  if (near(value, Math.round(value))) return String(Math.round(value));
  for (const denominator of [2, 3, 4, 6, 8, 12, 24]) {
    const numerator = Math.round(value * denominator);
    if (near(value, numerator / denominator)) return `${numerator}/${denominator}`;
  }
  return String(Number(value.toFixed(5)));
}

function initialEvents(scenario) {
  if (scenario === 'notation-basics') return [event('C4',0,1),event('C4',1,.5),event('C4',2,2)];
  if (scenario === 'syncopation') return [event('C4', 0, 1), event('C4', 2.5, 1), event('C4', 4.5, 1), event('C4', 6, .5), event('C4', 7.5, 1), event('C4', 9, 1)];
  if (scenario === 'rhythm-project') return Array.from({ length: 8 }, (_, bar) => [event('C4', bar * 4, .5), event('C4', bar * 4 + 1.5, .5), event('C4', bar * 4 + 3, .5)]).flat();
  if (scenario === 'duration') return [event('C4',0,1.5),event('C4',2,1/3),event('C4',2+1/3,1/3),event('C4',2+2/3,1/3),event('C4',3,1)];
  if (scenario === 'sequence') return [['C4','D4','E4'],['C4','D4','E4'],['C4','D4','G4'],['D4','E4','F4']].flatMap((notes,bar)=>notes.map((note,i)=>event(note,bar*4+i,i===2?2:1)));
  if (scenario === 'phrase') return [event('C4',0,1),event('E4',1,1),event('G4',2,1),event('E4',3,1),event('D4',4,2),event('G4',6,2),event('C4',8,1),event('E4',9,1),event('G4',10,1),event('E4',11,1),event('D4',12,1),event('B3',13,1),event('C4',14,2)];
  if (scenario === 'riff') return [event('C3',0,1),event('G2',1,1),event('C3',2,2),event('Bb2',4,3)];
  if (scenario === 'development') return [event('C4',0,1),event('D4',1,1),event('E4',2,2),event('G4',4,4),event('C4',8,1),event('D4',9,1),event('E4',10,2),event('C4',12,4)];
  return [0,4].flatMap(start=>[event('C4',start,.5),event('D4',start+.5,.5),event('G4',start+1,1)]);
}

export function timedDefaults(type, config = {}) {
  if (type !== 'motif' && !(type === 'rhythm' && RHYTHM_SCENARIOS.includes(config.scenario))) return {};
  const scenario = type === 'rhythm' ? config.scenario : SCENARIOS.includes(config.scenario) && !RHYTHM_SCENARIOS.includes(config.scenario) ? config.scenario : 'motif';
  const beats = config.scenario==='motif' ? 4 : ['notation-basics','duration','riff'].includes(scenario) ? 8 : scenario === 'syncopation' ? 10 : scenario === 'rhythm-project' ? 32 : 16;
  const events = initialEvents(scenario).filter(e=>e.beat<beats);
  return { timedScenario: scenario, timedBeats: beats, timedABeats: beats, timedEvents: events, timedA: copy(events), timedTransform: 'major-second', timedASound: scenario === 'rhythm-project' ? 'snare' : 'tone', timedAPulse: scenario === 'syncopation', timedSound: scenario === 'rhythm-project' ? 'snare' : 'tone', timedPulse: scenario === 'syncopation', timedGrouping: '3+2', timedAGrouping: '3+2', withBass: false, ...(scenario === 'rhythm-project' ? { timedProjectDrums: projectDrums(), timedProjectA: projectDrums() } : {}) };
}

function validEvents(value, beats) {
  if (!Array.isArray(value) || value.length > 64) return null;
  try {
    const result = value.map(item => {
      const note = parseNote(item.note);
      if (note.midi < 36 || note.midi > 96 || !Number.isFinite(item.beat) || item.beat < 0 || !Number.isFinite(item.duration) || item.duration < MIN_DURATION || item.beat + item.duration > beats + EPS) throw new Error('音符超出实验范围。');
      return { note: note.name, beat: item.beat, duration: item.duration };
    }).sort((a, b) => a.beat - b.beat);
    if (result.some((item, i) => i && result[i - 1].beat + result[i - 1].duration > item.beat + EPS)) return null;
    return result;
  } catch { return null; }
}

/** Mutates the already-created safe defaults; an invalid imported sequence cannot poison playback. */
export function normalizeTimed(raw, out) {
  if (!supportsTimed(out)) return out;
  if (isProject(out)) {
    out.timedProjectDrums = normalizeProjectDrums(raw.timedProjectDrums, out.timedProjectDrums);
    out.timedProjectA = normalizeProjectDrums(raw.timedProjectA, out.timedProjectA);
    return out;
  }
  const beats = horizons(out).includes(raw.timedBeats) ? raw.timedBeats : out.timedBeats;
  const aBeats = horizons(out).includes(raw.timedABeats) ? raw.timedABeats : out.timedABeats;
  for (const [field, lengthField, length, legacy] of [['timedEvents', 'timedBeats', beats, 'melody'], ['timedA', 'timedABeats', aBeats, 'melodyA']]) {
    const restored = validEvents(raw[field], length);
    if (restored) { out[field] = restored; out[lengthField] = length; }
    else if (out.type === 'motif' && raw[field] === undefined && Array.isArray(raw[legacy]) && raw[legacy].length === 16) {
      const migrated = validEvents(raw[legacy].flatMap((note, beat) => note ? [event(note, beat, .82)] : []), 16);
      if (migrated) { out[field] = migrated; out[lengthField] = 16; }
    }
  }
  if (TRANSFORMS.includes(raw.timedTransform)) out.timedTransform = raw.timedTransform;
  for (const key of ['timedSound', 'timedASound']) if (['tone', 'kick', 'snare', 'hat'].includes(raw[key])) out[key] = raw[key];
  for (const key of ['timedPulse', 'timedAPulse']) if (typeof raw[key] === 'boolean') out[key] = raw[key];
  for (const key of ['timedGrouping', 'timedAGrouping']) if (['3+2', '2+3'].includes(raw[key])) out[key] = raw[key];
  return out;
}

export function timedModel(s, variant = 'current') {
  if (isProject(s)) return projectModel(s, variant);
  const source = variant === 'A' ? s.timedA : s.timedEvents;
  const beats = variant === 'A' ? s.timedABeats : s.timedBeats;
  const kind = s.type === 'rhythm' ? variant === 'A' ? s.timedASound : s.timedSound : 'tone';
  const events = source.map(item => ({ ...item, kind, layer: kind === 'tone' ? 'melody' : 'rhythm', velocity: .7, channel: kind === 'tone' ? 0 : 9, attack: .01, release: .04 }));
  if (s.type === 'rhythm' && (variant === 'A' ? s.timedAPulse : s.timedPulse)) {
    const grouping = variant === 'A' ? s.timedAGrouping : s.timedGrouping;
    for (let beat = 0; beat < beats; beat++) events.push({ beat, duration: .1, kind: 'hat', layer: 'rhythm', velocity: beat % barLength(s) === 0 ? .7 : beat % barLength(s) === Number(grouping[0]) ? .5 : .2, channel: 9 });
  }
  if (s.type === 'motif' && s.withBass) {
    if(s.timedScenario==='development'){for(const [note,beat] of [['C3',0],['G2',4],['C3',8],['C3',12]])if(beat<beats)events.push({note,beat,duration:Math.min(4,beats-beat),kind:'tone',layer:'bass',velocity:.4,channel:1});}
    else for (let offset = 0; offset < beats; offset += 16) {
      const backing = progressionModel('triads', { smooth: true, beatsPerChord: 4 });
      events.push(...backing.events.filter(item => item.beat + offset < beats).map(item => ({ ...item, beat: item.beat + offset, duration: Math.min(item.duration, beats - item.beat - offset), velocity: item.velocity * .5, channel: item.layer === 'bass' ? 1 : 2 })));
    }
  }
  return { beats, events, meta: { meter: barLength(s) === 5 ? '5/4' : '4/4', beatUnit: '四分音符', stepsPerBeat: 6 } };
}

function withRests(events, beats) {
  let end = 0;
  const result = [];
  for (const item of events) {
    if (item.beat > end + EPS) result.push({ beat: end, duration: item.beat - end, notes: [] });
    result.push({ beat: item.beat, duration: item.duration, notes: [item.note] });
    end = item.beat + item.duration;
  }
  if (end < beats - EPS) result.push({ beat: end, duration: beats - end, notes: [] });
  return result;
}

function score(s) {
  const perBar = barLength(s);
  const excerpt = { id: 'timed-draft', title: '原创时值草稿', originalModel: true, meter: perBar === 5 ? '5/4' : '4/4', beatsPerBar: perBar, bars: Math.ceil(s.timedBeats / perBar), barBeats:Array.from({length:Math.ceil(s.timedBeats/perBar)},(_,i)=>Math.min(perBar,s.timedBeats-i*perBar)) };
  const kind = s.type === 'rhythm' ? s.timedSound : 'tone';
  const written = withRests(s.timedEvents, s.timedBeats).map(item => kind !== 'tone' && item.notes.length ? { ...item, notes: [], kind } : item);
  const variant = { id: 'current', label: '当前原创草稿', parts: [{ id: 'timed-line', name: kind === 'tone' ? '旋律／时值线' : ({ kick: '底鼓', snare: '军鼓', hat: '踩镲' })[kind], clef: kind === 'tone' ? s.timedScenario==='riff'?'bass':'treble' : 'percussion', events: written }] };
  return `${s.withBass&&s.type==='motif'||s.timedPulse?'<p class="lab-help">谱例与文字表只记录可编辑线条；另加的固定伴奏、参照拍点未记入此谱。</p>':''}${scoreView(excerpt, variant)}`;
}

function differences(s) {
  const max = Math.max(s.timedEvents.length, s.timedA.length);
  let pitch = 0, onset = 0, duration = 0;
  for (let i = 0; i < max; i++) {
    const a = s.timedA[i], b = s.timedEvents[i];
    if (!a || !b) continue;
    if (a.note !== b.note) pitch++;
    if (!near(a.beat, b.beat)) onset++;
    if (!near(a.duration, b.duration)) duration++;
  }
  const count = s.timedEvents.length - s.timedA.length;
  return `与A逐项比较：音高改变${pitch}处、起点改变${onset}处、时值改变${duration}处；音符数量${count >= 0 ? '+' : ''}${count}；总长${s.timedABeats}→${s.timedBeats}拍。增删音符后，逐项编号会移动，应结合谱例回听。`;
}

function feedback(s) {
  const events = s.timedEvents;
  const ties = events.filter(item => Math.floor((item.beat + EPS) / barLength(s)) !== Math.floor((item.beat + item.duration - EPS) / barLength(s))).length;
  const thirds = events.filter(item => near(item.duration, 1 / 3)).length;
  const firstEnd = events.filter(item => item.beat < 8).at(-1), last = events.at(-1);
  if(s.timedScenario==='notation-basics')return `${events.length}次起音；四分音符1拍，八分音符1/2拍，二分音符2拍；空隙为休止，同一音的持续不等于再次起音。`;
  return `${events.length}次起音；${ties}个跨小节持续音（跨线处不重击）；${thirds}个1/3拍音。${s.type === 'motif' ? `前8拍最后起音为${firstEnd ? pretty(firstEnd.note) : '休止'}，全句最后起音为${last ? pretty(last.note) : '休止'}。落音本身不能单独证明终止，需结合和声与拍位。` : '附点四分音符=3/2拍；一拍三等分的每份=1/3拍；延音线连接的是同一持续音。'}`;
}

const transformLabels = { 'major-second': '严格上移大二度（音程与节奏不变）', 'perfect-fifth': '严格上移纯五度', 'octave-up': '上移八度', 'octave-down': '下移八度', 'diatonic-step': 'C大调顺阶上移一级（仅自然音）', augment: '时值扩大2倍（同时放大起点）', diminish: '时值缩小为1/2（同时缩小起点）' };
const scenarioTitles = { 'notation-basics':'起音、持续与休止', duration: '持续、附点、三等分与延音', syncopation: '5/4中的切分持续与3+2／2+3重音', 'rhythm-project': '八小节节奏草稿', motif: '短—短—长动机', sequence: '严格移调与调内模进', phrase: '前后句与落音', riff: '带留白的二小节低音riff', development: '同开头、不同句尾' };

export function timedView(s) {
  if (isProject(s)) return projectView(s);
  const lessonGuide=({motif:'本课一轮4拍：C4从起点0响半拍，D4从0.5响半拍，G4从1响1拍，最后2拍休止。',sequence:'本课16拍依次为A、A、A′、调内模进B；整体变换会处理全部四小节。只想改第三次出现时，请编辑该小节的音符行。',phrase:'前8拍为问句，后8拍为答句；正文两句共同的第一小节保持相同，只在后半句比较落点。',riff:'正文低音模式为C3、G2、C3、B♭2，时值1、1、2、3拍，最后1拍休止；可复制为四轮再只删末轮末音。',development:'前8拍为C—D—E—G，后8拍为C—D—E—C，时值均为1、1、2、4拍；先无伴奏比较末音。','notation-basics':'本课固定参照音，不要求先认识音名；第1小节依次含四分音、八分音、半拍休止、二分长音，第2小节整小节休止。'})[s.timedScenario]||'';
  return `<h3 class="small-heading">${scenarioTitles[s.timedScenario]}</h3><p class="lab-help">恢复本课起点时的材料：${lessonGuide}</p><p class="lab-help">四分音符=1拍，起点从0计：0是第一拍，${barLength(s)}是第二小节首拍。起点与时值可填整数或分数，空隙为休止；一个长音跨小节会显示延音线。音名支持C2—C7及升降号。此编辑器保持单声部，重叠起音会被拒绝。</p><div class="lab-fields"><label class="lab-field"><span>片段总长</span><select id="lab-timed-beats" data-lab-field="timed-beats">${options(horizons(s), s.timedBeats, value => `${value}拍 / ${value / barLength(s)}小节`)}</select></label>${s.type === 'rhythm' ? `<label class="lab-field"><span>试听声部</span><select id="lab-timed-sound" data-lab-field="timed-sound">${options(['tone', 'kick', 'snare', 'hat'], s.timedSound, value => ({ tone: '持续音（听时值）', kick: '底鼓', snare: '军鼓', hat: '踩镲' })[value])}</select></label><label class="check-row"><input type="checkbox" data-lab-field="timed-pulse" ${s.timedPulse ? 'checked' : ''}>加入参照拍点（踩镲）</label>` : ''}${s.timedScenario === 'syncopation' ? `<label class="lab-field"><span>拍点重音分组</span><select id="lab-timed-grouping" data-lab-field="timed-grouping">${options(['3+2', '2+3'], s.timedGrouping)}</select></label>` : ''}</div>${s.type === 'rhythm' ? '<p class="lab-help">持续音能听清延长和重新起音；鼓声自然衰减，时值只记事件占用长度。需要核对延音线时请切回持续音。参照拍点保持四分音符间隔。</p>' : ''}<div class="timed-events">${s.timedEvents.map((item, index) => `<div class="timed-event-row" data-timed-index="${index}"><strong>音${index + 1}</strong><label class="lab-field"><span>音名</span><input id="lab-timed-note-${index}" data-lab-field="timed-note" data-index="${index}" value="${esc(item.note)}" maxlength="6" aria-label="音${index + 1}音名"></label><label class="lab-field"><span>起点（拍）</span><input id="lab-timed-beat-${index}" data-lab-field="timed-beat" data-index="${index}" value="${beatText(item.beat)}" inputmode="decimal" aria-label="音${index + 1}起点"></label><label class="lab-field"><span>持续（拍）</span><input id="lab-timed-duration-${index}" data-lab-field="timed-duration" data-index="${index}" value="${beatText(item.duration)}" inputmode="decimal" aria-label="音${index + 1}时值"></label><button class="btn btn-small" data-lab-action="timed-remove" data-index="${index}" type="button" aria-label="删除音${index + 1}">删除</button></div>`).join('')}</div><div class="preset-row"><button class="btn btn-small" data-lab-action="timed-add" type="button">在空隙加入一音</button><button class="btn btn-small" data-lab-action="timed-save" type="button">保留当前为A</button><button class="btn btn-small" data-lab-action="timed-a" type="button">听草稿A</button><button class="btn btn-small" data-lab-action="timed-reset" type="button">恢复本课材料</button></div>${s.timedScenario==='riff'?'<div class="preset-row"><button class="btn btn-small" data-lab-action="timed-riff-repeat" type="button">把二小节重复四轮</button><button class="btn btn-small" data-lab-action="timed-riff-ending" type="button">第四轮删去末音</button></div>':''}${s.type === 'motif' ? `<div class="lab-fields"><label class="lab-field"><span>整体变换</span><select id="lab-timed-transform" data-lab-field="timed-transform">${options(TRANSFORMS, s.timedTransform, value => transformLabels[value])}</select></label><button class="btn btn-soft" data-lab-action="timed-transform" type="button">应用到当前旋律</button></div><label class="check-row"><input data-lab-field="withBass" type="checkbox" ${s.withBass ? 'checked' : ''}>${s.timedScenario==='development'?'加入句尾G→C低音参照':'加入固定C—F—G—C伴奏（和弦读法见U06—U07；不能自动适配移调）'}</label>` : s.timedScenario==='notation-basics'?'':`<div class="preset-row"><button class="btn btn-small" data-lab-action="timed-example" data-example="dotted" type="button">等分与附点</button><button class="btn btn-small" data-lab-action="timed-example" data-example="triplet" type="button">一拍三等分</button><button class="btn btn-small" data-lab-action="timed-example" data-example="tie" type="button">跨小节延音</button><button class="btn btn-small" data-lab-action="timed-example" data-example="retrigger" type="button">跨线处重新起音</button></div>`}<p class="lab-help" data-timed-feedback>${esc(feedback(s))}</p><p class="lab-help" data-timed-comparison>${esc(differences(s))}</p><details class="timed-score"><summary>查看随草稿更新的谱例与完整时值表</summary>${score(s)}</details>`;
}

function assertDraft(events, beats) {
  const result = validEvents(events, beats);
  if (!result) throw new Error('请保持C2—C7、正时值及单声部；音符不可重叠或超过片段结尾。最短时值为1/24拍，最多64音。');
  return result;
}

function spelledTranspose(note, letterSteps, semitones) {
  const parsed = parseNote(note), position = parsed.octave * 7 + parsed.index + letterSteps;
  const index = ((position % 7) + 7) % 7, octave = Math.floor(position / 7), letter = 'CDEFGAB'[index];
  const natural = parseNote(letter + octave), accidental = parsed.midi + semitones - natural.midi;
  if (Math.abs(accidental) > 2) throw new Error('此变换需要超过重升降号的拼写，请先换一个起点。');
  return letter + (accidental > 0 ? '#'.repeat(accidental) : 'b'.repeat(-accidental)) + octave;
}

export function transformTimed(events, operation) {
  if (!TRANSFORMS.includes(operation)) throw new Error('未知的动机变换。');
  return events.map(item => {
    if (operation === 'augment' || operation === 'diminish') {
      const ratio = operation === 'augment' ? 2 : .5;
      return { ...item, beat: item.beat * ratio, duration: item.duration * ratio };
    }
    let note;
    if (operation === 'major-second') note = spelledTranspose(item.note, 1, 2);
    if (operation === 'perfect-fifth') note = spelledTranspose(item.note, 4, 7);
    if (operation === 'octave-up' || operation === 'octave-down') note = transposeOctaves(item.note, operation === 'octave-up' ? 1 : -1);
    if (operation === 'diatonic-step') {
      const parsed = parseNote(item.note);
      if (parsed.accidental) throw new Error('调内模进按钮限定C大调自然音；含变音的严格移调请选大二度或纯五度。');
      const position = parsed.octave * 7 + parsed.index + 1;
      note = 'CDEFGAB'[position % 7] + Math.floor(position / 7);
    }
    return { ...item, note };
  });
}

export async function timedAction(button, s, host) {
  const action = button.dataset.labAction;
  if (!supportsTimed(s) || !action?.startsWith('timed-')) return false;
  try {
    if (action === 'timed-a') { await host.play(timedModel(s, 'A'), s.bpm, 'A'); return true; }
    if (isProject(s)) {
      if (action === 'timed-save') { s.timedProjectA = copy(s.timedProjectDrums); host.notify('已把完整八小节、三条声部的起音与力度保留为A。'); }
      else if (action === 'timed-project-step') {
        const role = button.dataset.role, index = Number(button.dataset.index);
        if (!PROJECT_ROLES.includes(role) || !Number.isInteger(index) || index < 0 || index >= 64) return true;
        s.timedProjectDrums[role][index] = (s.timedProjectDrums[role][index] + 1) % 3;
      }
      else if (action === 'timed-project-copy') {
        for (const role of PROJECT_ROLES) { const first = s.timedProjectDrums[role].slice(0, 16); s.timedProjectDrums[role] = Array.from({ length: 4 }, () => [...first]).flat(); }
      }
      else if (action === 'timed-project-fill') s.timedProjectDrums.snare.splice(60, 4, 1, 1, 1, 2);
      else if (action === 'timed-reset') s.timedProjectDrums = projectDrums();
      else return true;
      host.touch(); host.render(); host.restart(); return true;
    }
    if (action === 'timed-save') { s.timedA = copy(s.timedEvents); s.timedABeats = s.timedBeats; s.timedAGrouping = s.timedGrouping; s.timedASound = s.timedSound; s.timedAPulse = s.timedPulse; host.notify('已保留音高、起点、时值与总长为A。'); }
    else if (action === 'timed-remove') s.timedEvents.splice(Number(button.dataset.index), 1);
    else if (action === 'timed-add') {
      let start = 0;
      for (const item of s.timedEvents) { if (item.beat - start >= .5 - EPS) break; start = item.beat + item.duration; }
      const next = s.timedEvents.find(item => item.beat >= start + EPS), available = (next?.beat ?? s.timedBeats) - start;
      if (available < MIN_DURATION) throw new Error('当前片段没有空隙，请先缩短一音或延长片段。');
      s.timedEvents = assertDraft([...s.timedEvents, event('C4', start, Math.min(.5, available))], s.timedBeats);
    }
    else if(action==='timed-riff-repeat'){if(s.timedBeats!==8)throw new Error('请先恢复本课二小节材料，再复制四轮。');s.timedEvents=Array.from({length:4},(_,i)=>s.timedEvents.map(e=>({...e,beat:e.beat+i*8}))).flat();s.timedBeats=32;}
    else if(action==='timed-riff-ending'){if(s.timedBeats!==32)throw new Error('请先把二小节重复四轮。');const last=s.timedEvents.filter(e=>e.beat>=24).at(-1);if(last)s.timedEvents=s.timedEvents.filter(e=>e!==last);}
    else if (action === 'timed-reset') { s.timedEvents = initialEvents(s.timedScenario); s.timedBeats = s.timedScenario==='motif'?4:['notation-basics','duration','riff'].includes(s.timedScenario) ? 8 : s.timedScenario === 'syncopation' ? 10 : s.timedScenario === 'rhythm-project' ? 32 : 16; s.timedEvents=s.timedEvents.filter(e=>e.beat<s.timedBeats); }
    else if (action === 'timed-example') {
      const example = button.dataset.example, nextBar = barLength(s);
      if (example === 'dotted') s.timedEvents = [event('C4', 0, 1), event('C4', 1, 1), event('C4', nextBar, 1.5), event('C4', nextBar + 1.5, .5)];
      else if (example === 'triplet') s.timedEvents = [event('C4', 0, .5), event('C4', .5, .5), event('C4', nextBar, 1 / 3), event('C4', nextBar + 1 / 3, 1 / 3), event('C4', nextBar + 2 / 3, 1 / 3)];
      else if (example === 'tie') s.timedEvents = [event('C4', nextBar - .5, 1)];
      else if (example === 'retrigger') s.timedEvents = [event('C4', nextBar - .5, .5), event('C4', nextBar, .5)];
      else return false;
    }
    else if (action === 'timed-transform') {
      const changed = transformTimed(s.timedEvents, s.timedTransform);
      let beats = s.timedTransform==='augment'?s.timedBeats*2:s.timedTransform==='diminish'?s.timedBeats/2:s.timedBeats;
      if(!horizons(s).includes(beats))throw new Error('变换后的完整片段（含休止）超出本实验可选长度，请先调整总长。');
      const end = Math.max(0, ...changed.map(item => item.beat + item.duration));
      if (end > beats) beats = [8, 16, 32].find(value => value >= end - EPS);
      if (!beats) throw new Error('扩大后的片段超过32拍，请缩短材料后再试。');
      s.timedEvents = assertDraft(changed, beats); s.timedBeats = beats;
    }
    else return false;
    host.touch(); host.render(); host.restart();
  } catch (error) { host.notify(error.message); }
  return true;
}

export async function timedField(target, s, host, eventType = 'change') {
  const field = target.dataset.labField;
  if (!supportsTimed(s) || !field?.startsWith('timed-')) return false;
  if (isProject(s)) return true;
  if (eventType !== 'change') return true;
  try {
    if (field === 'timed-transform') { if (!TRANSFORMS.includes(target.value)) return true; s.timedTransform = target.value; }
    else if (field === 'timed-sound') { if (!['tone', 'kick', 'snare', 'hat'].includes(target.value)) return true; s.timedSound = target.value; }
    else if (field === 'timed-pulse') s.timedPulse = target.checked;
    else if (field === 'timed-grouping') { if (!['3+2', '2+3'].includes(target.value)) return true; s.timedGrouping = target.value; }
    else if (field === 'timed-beats') {
      const beats = Number(target.value);
      if (!horizons(s).includes(beats)) return true;
      assertDraft(s.timedEvents, beats); s.timedBeats = beats;
    }
    else {
      const index = Number(target.dataset.index), draft = copy(s.timedEvents);
      if (!draft[index]) return true;
      if (field === 'timed-note') draft[index].note = parseNote(target.value).name;
      else if (field === 'timed-beat') draft[index].beat = parseBeat(target.value);
      else if (field === 'timed-duration') draft[index].duration = parseBeat(target.value);
      else return false;
      s.timedEvents = assertDraft(draft, s.timedBeats);
    }
    host.touch(); host.render(target.id); host.restart();
  } catch (error) { host.notify(error.message); host.render(target.id); }
  return true;
}
