// Chord-symbol mode identifies a root pitch class and quality; optional bass is exact MIDI.
export const CHORD_TYPES = Object.freeze([
  { id: 'major', family: 'triad', suffix: '', label: '大三和弦', intervals: [0, 4, 7] },
  { id: 'minor', family: 'triad', suffix: 'm', label: '小三和弦', intervals: [0, 3, 7] },
  { id: 'dominant7', family: 'seventh', suffix: '7', label: '属七和弦', intervals: [0, 4, 7, 10] },
  { id: 'major7', family: 'seventh', suffix: 'maj7', label: '大七和弦', intervals: [0, 4, 7, 11] },
  { id: 'minor7', family: 'seventh', suffix: 'm7', label: '小七和弦', intervals: [0, 3, 7, 10] },
  { id: 'dim', family: 'triad', suffix: 'dim', label: '减三和弦', intervals: [0, 3, 6] },
  { id: 'aug', family: 'triad', suffix: 'aug', label: '增三和弦', intervals: [0, 4, 8] },
  { id: 'halfDiminished7', family: 'seventh', suffix: 'm7♭5', label: '半减七和弦', intervals: [0, 3, 6, 10] },
  { id: 'diminished7', family: 'seventh', suffix: 'dim7', label: '减七和弦', intervals: [0, 3, 6, 9] },
  { id: 'minorMajor7', family: 'seventh', suffix: 'm(maj7)', label: '小大七和弦', intervals: [0, 3, 7, 11] },
  { id: 'sus2', family: 'suspended', suffix: 'sus2', label: '挂二和弦', intervals: [0, 2, 7] },
  { id: 'sus4', family: 'suspended', suffix: 'sus4', label: '挂四和弦', intervals: [0, 5, 7] },
  { id: 'dominant7sus4', family: 'suspended', suffix: '7sus4', label: '属七挂四和弦', intervals: [0, 5, 7, 10] },
  { id: 'major6', family: 'sixth', suffix: '6', label: '大六和弦', intervals: [0, 4, 7, 9] },
  { id: 'minor6', family: 'sixth', suffix: 'm6', label: '小六和弦', intervals: [0, 3, 7, 9] },
  { id: 'sixNine', family: 'sixth', suffix: '6/9', label: '六九和弦', intervals: [0, 4, 7, 9, 14] },
  { id: 'add9', family: 'extended', suffix: 'add9', label: '加九和弦', intervals: [0, 4, 7, 14] },
  { id: 'minorAdd9', family: 'extended', suffix: 'm(add9)', label: '小加九和弦', intervals: [0, 3, 7, 14] },
  { id: 'dominant9', family: 'extended', suffix: '9', label: '属九和弦', intervals: [0, 4, 7, 10, 14] },
  { id: 'major9', family: 'extended', suffix: 'maj9', label: '大九和弦', intervals: [0, 4, 7, 11, 14] },
  { id: 'minor9', family: 'extended', suffix: 'm9', label: '小九和弦', intervals: [0, 3, 7, 10, 14] },
  { id: 'dominant11', family: 'extended', suffix: '11', label: '属十一和弦', intervals: [0, 4, 7, 10, 14, 17] },
  { id: 'major11', family: 'extended', suffix: 'maj11', label: '大十一和弦', intervals: [0, 4, 7, 11, 14, 17] },
  { id: 'minor11', family: 'extended', suffix: 'm11', label: '小十一和弦', intervals: [0, 3, 7, 10, 14, 17] },
  { id: 'dominant13', family: 'extended', suffix: '13', label: '属十三和弦', intervals: [0, 4, 7, 10, 14, 17, 21] },
  { id: 'major13', family: 'extended', suffix: 'maj13', label: '大十三和弦', intervals: [0, 4, 7, 11, 14, 17, 21] },
  { id: 'minor13', family: 'extended', suffix: 'm13', label: '小十三和弦', intervals: [0, 3, 7, 10, 14, 17, 21] },
  { id: 'dominant7Flat9', family: 'altered', suffix: '7♭9', label: '属七降九和弦', intervals: [0, 4, 7, 10, 13] },
  { id: 'dominant7Sharp9', family: 'altered', suffix: '7♯9', label: '属七升九和弦', intervals: [0, 4, 7, 10, 15] },
  { id: 'dominant7Sharp5', family: 'altered', suffix: '7♯5', label: '属七升五和弦', intervals: [0, 4, 8, 10] },
  { id: 'dominant7Flat5', family: 'altered', suffix: '7♭5', label: '属七降五和弦', intervals: [0, 4, 6, 10] },
].map(type => Object.freeze({ ...type, intervals: Object.freeze(type.intervals) })));

export const CHORD_FAMILIES = Object.freeze([
  { id: 'triad', label: '三和弦' },
  { id: 'seventh', label: '七和弦' },
  { id: 'suspended', label: '挂留和弦' },
  { id: 'sixth', label: '六和弦' },
  { id: 'extended', label: '加音与扩展和弦' },
  { id: 'altered', label: '变化属和弦' },
].map(family => Object.freeze({ ...family, qualities: Object.freeze(CHORD_TYPES.filter(type => type.family === family.id).map(type => type.id)) })));
const familyQualities = family => CHORD_TYPES.filter(type => type.family === family).map(type => type.id);

export const NOTATION_LEVELS = Object.freeze([
  { id: 'notation-triads', title: '大小三和弦', subtitle: '听出根音音级与和弦色彩', description: '大三、小三和弦等概率，包含全部密集转位。', qualities: ['major', 'minor'] },
  { id: 'notation-sevenths', title: '七和弦', subtitle: '分辨三种七和弦色彩', description: '属七、大七、小七和弦等概率，包含全部密集转位。', qualities: ['dominant7', 'major7', 'minor7'] },
  { id: 'notation-suspended', title: '挂留和弦', subtitle: '听见二度与四度的悬念', description: '挂二、挂四与属七挂四和弦等概率。', qualities: familyQualities('suspended') },
  { id: 'notation-sixth', title: '六与六九和弦', subtitle: '分辨六度与九度的色彩', description: '大六、小六、六九和弦等概率，六九保留完整复合音程。', qualities: familyQualities('sixth') },
  { id: 'notation-extended', title: '加音与扩展和弦', subtitle: '从加九到完整十三和弦', description: '加九与九、十一、十三和弦等概率，采用保留全部成员的完整叠置训练模板。', qualities: familyQualities('extended') },
  { id: 'notation-altered', title: '变化属和弦', subtitle: '听辨升降九度与五度', description: '降九、升九、升五、降五属和弦等概率。', qualities: familyQualities('altered') },
  { id: 'notation-mixed', title: '和弦综合', subtitle: '在三十一种和弦之间自由听辨', description: '六个家族的三十一种和弦等概率混合，不提前提示性质。', qualities: CHORD_TYPES.map(type => type.id) },
].map(level => Object.freeze({ ...level, qualities: Object.freeze(level.qualities) })));

const TYPE_BY_ID = new Map(CHORD_TYPES.map(type => [type.id, type]));
const ROOT_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const pitchClass = midi => ((midi % 12) + 12) % 12;
const sameNotes = (a, b) => a.length === b.length && a.every((note, i) => note === b[i]);

function validRange(range, minimumKeys = 1) {
  return range && Number.isInteger(range.low) && Number.isInteger(range.high)
    && range.low >= 0 && range.high <= 127 && range.high - range.low + 1 >= minimumKeys;
}

function validIdentity(root, quality) {
  return Number.isInteger(root) && root >= 0 && root < 12 && TYPE_BY_ID.has(quality);
}

export function chordSymbol(root, quality) {
  if (!validIdentity(root, quality)) throw new RangeError('和弦根音需为 0–11 的音级，并选择支持的和弦性质。');
  return ROOT_NAMES[root] + TYPE_BY_ID.get(quality).suffix;
}

function memberClasses(root, quality) {
  return TYPE_BY_ID.get(quality).intervals.map(interval => (root + interval) % 12);
}

/** Scoring identity is a pitch-class set (plus exact bass when requested), not a label. */
export function chordSoundIdentity(root, quality, bass) {
  if (!validIdentity(root, quality)) throw new RangeError('无法为不支持的根音或和弦性质建立声音身份。');
  if (bass !== undefined && bass !== null && (!Number.isInteger(bass) || bass < 0 || bass > 127)) throw new RangeError('最低音身份需为 MIDI 0–127 的整数。');
  const members = [...new Set(memberClasses(root, quality))].sort((a, b) => a - b).join(',');
  return bass === undefined || bass === null ? members : `${members}|bass:${bass}`;
}

function bassesFor(root, quality, range) {
  const members = new Set(memberClasses(root, quality));
  const options = [];
  for (let midi = range.low; midi <= range.high; midi++) if (members.has(pitchClass(midi))) options.push(midi);
  return options;
}

function fromBass(root, quality, bass, range) {
  if (!Number.isInteger(bass) || bass < range.low || bass > range.high) return null;
  const type = TYPE_BY_ID.get(quality);
  const memberIndex = type.intervals.findIndex(interval => (root + interval) % 12 === pitchClass(bass));
  if (memberIndex < 0) return null;
  // Rotate the original, unflattened interval template. Earlier members move to
  // the tail by whole octaves until strictly above the preceding member. This
  // retains compound 9ths/11ths/13ths instead of compressing them into one octave.
  // For the original five qualities it is exactly their old close-position rotation.
  const rotated = [...type.intervals.slice(memberIndex)];
  for (const interval of type.intervals.slice(0, memberIndex)) {
    let raised = interval;
    while (raised <= rotated.at(-1)) raised += 12;
    rotated.push(raised);
  }
  const offsets = rotated.map(interval => interval - rotated[0]);
  const notes = offsets.map(offset => bass + offset);
  return notes.at(-1) <= range.high ? notes : null;
}

function voicingsFor(root, quality, range) {
  return bassesFor(root, quality, range).map(bass => fromBass(root, quality, bass, range)).filter(Boolean);
}

/** Return an independently constructed preview, never the target's actual voicing. */
export function notationVoicing({ root, quality, bass } = {}, range, { previewBass } = {}) {
  if (!validIdentity(root, quality) || !validRange(range)) return null;
  const requestedBass = bass ?? previewBass;
  if (requestedBass !== undefined && requestedBass !== null) return fromBass(root, quality, requestedBass, range);
  const instances = voicingsFor(root, quality, range);
  return instances.length ? [...instances[Math.floor(instances.length / 2)]] : null;
}

/**
 * Serializable null-model answer space. Bass options deliberately include high
 * chord members whose complete close-position preview cannot fit in the range.
 */
export function createNotationSpace({ range = { low: 36, high: 83 }, qualities = CHORD_TYPES.map(type => type.id), assessBass = false } = {}) {
  if (!validRange(range, 12)) throw new RangeError('记号模式的全局键域需包含至少 12 个连续半音琴键，请在全局设置中扩大键域。');
  if (!Array.isArray(qualities) || !qualities.length || qualities.some(quality => !TYPE_BY_ID.has(quality))) throw new RangeError('请至少选择一种支持的和弦性质。');
  if (typeof assessBass !== 'boolean') throw new RangeError('最低音听辨开关需为布尔值。');
  const enabled = [...new Set(qualities)];
  const roots = Array.from({ length: 12 }, (_, i) => i);
  const fixedRange = { low: range.low, high: range.high };
  const bassOptions = {};
  const candidates = [];
  for (const root of roots) {
    for (const quality of enabled) {
      if (!voicingsFor(root, quality, fixedRange).length) throw new RangeError(`${chordSymbol(root, quality)} 在当前键域没有保留全部成员与复合音程的合法排列，请扩大键域或取消该性质。`);
      const identityWeight = 1 / roots.length / enabled.length;
      if (assessBass) {
        const options = bassesFor(root, quality, fixedRange);
        bassOptions[`${root}:${quality}`] = options;
        for (const bass of options) candidates.push({ root, quality, bass, label: chordSymbol(root, quality), identityKey: chordSoundIdentity(root, quality), equivalenceKey: chordSoundIdentity(root, quality, bass), weight: identityWeight / options.length });
      } else {
        candidates.push({ root, quality, label: chordSymbol(root, quality), identityKey: chordSoundIdentity(root, quality), equivalenceKey: chordSoundIdentity(root, quality), weight: identityWeight });
      }
    }
  }
  return {
    range: fixedRange, roots, qualities: enabled, assessBass,
    candidateCount: candidates.length,
    rawCandidateCount: candidates.length,
    effectiveCandidateCount: new Set(candidates.map(candidate => candidate.equivalenceKey)).size,
    ...(assessBass ? { bassOptions } : {}),
    candidates,
  };
}

function randomIndex(length, rng) {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('随机源需返回 0–1 的数值。');
  return Math.min(length - 1, Math.floor(value * length));
}

/** Quality is uniform first; distinct concrete pitch sets of that quality are uniform second. */
export function generateNotationQuestion(space, previousNotes = [], rng = Math.random) {
  if (!space || !validRange(space.range, 12) || !Array.isArray(space.qualities) || !space.qualities.length || space.qualities.some(quality => !TYPE_BY_ID.has(quality))) throw new RangeError('记号关卡配置无效，请重新创建答案空间。');
  const qualities = [...new Set(space.qualities)];
  const quality = qualities[randomIndex(qualities.length, rng)];
  const instanceMap = new Map();
  for (let root = 0; root < 12; root++) {
    for (const notes of voicingsFor(root, quality, space.range)) {
      const key = notes.join(',');
      // Symmetric aug/dim7 roots may yield identical sound: retain one instance,
      // with its first (lowest-PC) root as a deterministic reveal label.
      if (!instanceMap.has(key)) instanceMap.set(key, { root, notes });
    }
  }
  const instances = [...instanceMap.values()];
  if (!instances.length) throw new RangeError('当前和弦性质在键域中没有合法题目，请调整配置。');
  const previous = [...new Set(previousNotes)].sort((a, b) => a - b);
  const excluded = instances.findIndex(instance => sameNotes(instance.notes, previous));
  const available = instances.length - (excluded >= 0 && instances.length > 1 ? 1 : 0);
  let index = randomIndex(available, rng);
  if (instances.length > 1 && excluded >= 0 && index >= excluded) index++;
  const { root, notes } = instances[index];
  return { notes: [...notes], root, quality, bass: notes[0], label: chordSymbol(root, quality), identityKey: chordSoundIdentity(root, quality), equivalenceKey: chordSoundIdentity(root, quality, space.assessBass ? notes[0] : undefined) };
}
