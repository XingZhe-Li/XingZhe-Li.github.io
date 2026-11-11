// Every preset is a recipe for the same category → generator → parameter → instance pipeline.
export const LEVELS = [
  { id: 'single', number: 1, title: '单音起步', subtitle: '一个声音，一个位置', category: 'single', tag: '单音', description: '在全局键域中均匀生成一个音，建立音高与琴键的联系。' },
  { id: 'octave', number: 2, title: '八度双音', subtitle: '听见同名音的距离', category: 'double', tag: '双音', description: '两个音相距一个八度，寻找它们各自的准确位置。' },
  { id: 'interval', number: 3, title: '常用间隔', subtitle: '从熟悉的距离开始', category: 'double', tag: '双音', description: '从 3、4、5、7、8、9 半音间隔中均匀抽取，再生成合法双音。' },
  { id: 'free-pair', number: 4, title: '自由双音', subtitle: '不预设两音的关系', category: 'double', tag: '双音', description: '任意两个不同琴键，没有额外跨度限制。' },
  { id: 'triad', number: 5, title: '大小三和弦', subtitle: '认识完整的和弦色彩', category: 'chord', tag: '和弦', description: '大三与小三和弦等概率，采用原位、密集排列。' },
  { id: 'inversion', number: 6, title: '三和弦转位', subtitle: '换一种排列，听同一色彩', category: 'chord', tag: '和弦', description: '大小三和弦，原位、第一与第二转位等概率。' },
  { id: 'free-three', number: 7, title: '自由三音', subtitle: '逐步分辨更多声部', category: 'freeMulti', tag: '多音', description: '在全局键域均匀抽取三个不同琴键，允许全跨度。' },
  { id: 'seventh', number: 8, title: '基本七和弦', subtitle: '发现第四个音的色彩', category: 'chord', tag: '和弦', description: '属七、大七、小七和弦等概率，采用原位、密集排列。' },
  { id: 'free-four', number: 9, title: '自由四音', subtitle: '让每一个声音都清晰', category: 'freeMulti', tag: '多音', description: '在全局键域均匀抽取四个不同琴键，允许全跨度。' },
  { id: 'mixed', number: 10, title: '综合混合', subtitle: '听见什么，就找到什么', category: 'mixed', tag: '混合', description: '单音、双音、自由多音与和弦四大类各占 25%，提交前不提示本题类型。' },
];

export const DEFAULT_CUSTOM = Object.freeze({
  categories: Object.freeze(['single', 'double', 'freeMulti', 'chord']),
  doubleModes: Object.freeze(['octave', 'interval', 'free']),
  intervals: Object.freeze([3, 4, 5, 7, 8, 9]),
  counts: Object.freeze([3, 4]),
  chordModes: Object.freeze(['rootTriad', 'invertedTriad', 'rootSeventh']),
  triadQualities: Object.freeze(['major', 'minor']),
  inversions: Object.freeze([0, 1, 2]),
  seventhQualities: Object.freeze(['dominant7', 'major7', 'minor7']),
  maxSpan: null,
});

const CATEGORY_LABELS = { single: '单音', double: '双音', freeMulti: '自由多音', chord: '和弦' };
const QUALITY_LABELS = { major: '大三和弦', minor: '小三和弦', dominant7: '属七和弦', major7: '大七和弦', minor7: '小七和弦' };
const CHORD_TONES = { major: [0, 4, 7], minor: [0, 3, 7], dominant7: [0, 4, 7, 10], major7: [0, 4, 7, 11], minor7: [0, 3, 7, 10] };
const GENERATOR_LABELS = { uniformSingle: '单音', octave: '八度双音', interval: '间隔双音', freePair: '自由双音', freeMulti: '自由多音', rootTriad: '原位三和弦', invertedTriad: '三和弦转位', rootSeventh: '原位七和弦' };
const unique = values => [...new Set(values)];
const clone = value => JSON.parse(JSON.stringify(value));

export function createRecipe(levelId, custom = {}) {
  if (typeof levelId === 'number' || /^\d+$/.test(String(levelId))) levelId = LEVELS[Number(levelId) - 1]?.id;
  const config = { ...clone(DEFAULT_CUSTOM), ...clone(custom) };
  const generator = id => {
    if (id === 'uniformSingle') return { id };
    if (id === 'octave') return { id, distances: [12] };
    if (id === 'interval') return { id, distances: unique(config.intervals) };
    if (id === 'freePair') return { id, counts: [2] };
    if (id === 'freeMulti') return { id, counts: unique(config.counts) };
    if (id === 'rootTriad') return { id, qualities: unique(config.triadQualities), inversions: [0] };
    if (id === 'invertedTriad') return { id, qualities: unique(config.triadQualities), inversions: unique(config.inversions) };
    if (id === 'rootSeventh') return { id, qualities: unique(config.seventhQualities), inversions: [0] };
    return { id };
  };
  const category = (id, generators) => ({ id, generators: generators.map(generator) });
  const presets = {
    single: () => [category('single', ['uniformSingle'])],
    octave: () => [category('double', ['octave'])],
    interval: () => [category('double', ['interval'])],
    'free-pair': () => [category('double', ['freePair'])],
    triad: () => [category('chord', ['rootTriad'])],
    inversion: () => [category('chord', ['invertedTriad'])],
    'free-three': () => [{ id: 'freeMulti', generators: [{ id: 'freeMulti', counts: [3] }] }],
    seventh: () => [category('chord', ['rootSeventh'])],
    'free-four': () => [{ id: 'freeMulti', generators: [{ id: 'freeMulti', counts: [4] }] }],
    mixed: () => [category('single', ['uniformSingle']), category('double', ['octave', 'interval', 'freePair']), { id: 'freeMulti', generators: [{ id: 'freeMulti', counts: [3, 4] }] }, category('chord', ['rootTriad', 'invertedTriad', 'rootSeventh'])],
    custom: () => unique(config.categories).map(id => {
      if (id === 'single') return category(id, ['uniformSingle']);
      if (id === 'double') return category(id, unique(config.doubleModes).map(mode => ({ octave: 'octave', interval: 'interval', free: 'freePair' })[mode] ?? mode));
      if (id === 'freeMulti') return category(id, ['freeMulti']);
      if (id === 'chord') return category(id, unique(config.chordModes));
      return category(id, []);
    }),
  };
  if (!presets[levelId]) throw new RangeError(`未知关卡：${levelId}`);
  // Presets retain their confirmed parameters even if a caller has custom form values.
  if (levelId !== 'custom' && Object.keys(custom).length) return createRecipe(levelId);
  return { id: levelId, categories: presets[levelId](), maxSpan: levelId === 'custom' ? config.maxSpan : null };
}

function choose(n, k) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let i = 1; i <= Math.min(k, n - k); i++) result = result * (n - i + 1) / i;
  return Math.round(result);
}

function offsetsFor(quality, inversion) {
  const tones = CHORD_TONES[quality];
  if (!tones) return null;
  if (inversion === 0) return [...tones];
  // Root means the actually sounding root; move the tones above it down, not the root up.
  const split = inversion;
  return [...tones.slice(split).map(tone => tone - 12), ...tones.slice(0, split)].sort((a, b) => a - b);
}

function branches(generator) {
  if (generator.id === 'uniformSingle') return [{ kind: 'single' }];
  if (generator.id === 'octave' || generator.id === 'interval') return (generator.distances ?? []).map(distance => ({ kind: 'interval', distance }));
  if (generator.id === 'freePair' || generator.id === 'freeMulti') return (generator.counts ?? []).map(count => ({ kind: 'free', count }));
  if (['rootTriad', 'invertedTriad', 'rootSeventh'].includes(generator.id)) return (generator.qualities ?? []).flatMap(quality => (generator.inversions ?? []).map(inversion => ({ kind: 'chord', quality, inversion })));
  return [];
}

function freeBlocks(count, { low, high }, maxSpan) {
  const blocks = [];
  let total = 0;
  for (let minimum = low; minimum <= high - count + 1; minimum++) {
    const available = Math.min(high - minimum, maxSpan ?? high - low);
    const weight = choose(available, count - 1);
    if (weight) {
      blocks.push({ minimum, available, weight, start: total });
      total += weight;
    }
  }
  return { blocks, total };
}

function candidateOffsets(branch) {
  if (branch.kind === 'single') return [0];
  if (branch.kind === 'interval') return [0, branch.distance];
  if (branch.kind === 'chord') return offsetsFor(branch.quality, branch.inversion);
  return null;
}

function instanceCount(branch, range, maxSpan) {
  if (branch.kind === 'free') return freeBlocks(branch.count, range, maxSpan).total;
  const offsets = candidateOffsets(branch);
  if (!offsets) return 0;
  const span = offsets.at(-1) - offsets[0];
  return maxSpan !== null && span > maxSpan ? 0 : Math.max(0, range.high - range.low - span + 1);
}

export function validateRecipe(recipe, range = { low: 36, high: 83 }) {
  const errors = [];
  if (!range || !Number.isInteger(range.low) || !Number.isInteger(range.high) || range.low < 0 || range.high > 127 || range.high <= range.low) return ['全局键域需包含至少两个琴键，音高范围为 MIDI 0–127。'];
  if (recipe.maxSpan !== null && (!Number.isInteger(recipe.maxSpan) || recipe.maxSpan < 1 || recipe.maxSpan > 127)) return ['最大跨度需为 1–127 半音，或选择不限制。'];
  if (!Array.isArray(recipe.categories) || !recipe.categories.length) return [...errors, '请至少启用一个出题大类。'];
  for (const category of recipe.categories) {
    const prefix = CATEGORY_LABELS[category.id] ?? category.id;
    if (!CATEGORY_LABELS[category.id]) errors.push(`未知出题大类：${category.id}。`);
    if (!category.generators?.length) { errors.push(`${prefix}：请至少选择一种生成模式。`); continue; }
    for (const generator of category.generators) {
      const label = `${prefix} / ${GENERATOR_LABELS[generator.id] ?? generator.id}`;
      const options = branches(generator);
      if (!GENERATOR_LABELS[generator.id] || !options.length) { errors.push(`${label}：请完整选择生成参数。`); continue; }
      for (const branch of options) {
        if (branch.kind === 'interval' && (!Number.isInteger(branch.distance) || branch.distance < 1 || branch.distance > 127)) { errors.push(`${label}：音程必须为 1–127 的整数半音。`); continue; }
        if (branch.kind === 'free' && (!Number.isInteger(branch.count) || branch.count < 2 || branch.count > 5)) { errors.push(`${label}：自由多音需为 2–5 个不同音。`); continue; }
        if (branch.kind === 'chord') {
          const allowed = generator.id === 'rootSeventh' ? ['dominant7', 'major7', 'minor7'] : ['major', 'minor'];
          if (!allowed.includes(branch.quality) || !Number.isInteger(branch.inversion) || branch.inversion < 0 || branch.inversion > (generator.id === 'invertedTriad' ? 2 : 0)) { errors.push(`${label}：和弦性质或转位不受支持。`); continue; }
        }
        if (instanceCount(branch, range, recipe.maxSpan) === 0) {
          const detail = branch.distance ? `${branch.distance} 半音` : branch.count ? `${branch.count} 音` : branch.quality ? `${QUALITY_LABELS[branch.quality]}·${branch.inversion} 转位` : '';
          errors.push(`${label}${detail ? `（${detail}）` : ''}在当前键域或跨度下没有合法题目，请调整配置。`);
        }
      }
    }
  }
  return unique(errors);
}

function sampleIndex(total, rng) {
  const value = rng();
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError('随机源需返回 0–1 的数值。');
  return Math.min(total - 1, Math.floor(value * total));
}
const pick = (values, rng) => values[sampleIndex(values.length, rng)];
function indexAvoiding(total, excluded, rng) {
  if (total <= 1) return 0;
  if (excluded < 0) return sampleIndex(total, rng);
  const index = sampleIndex(total - 1, rng);
  return index >= excluded ? index + 1 : index;
}

function combinationAt(size, count, rank) {
  const indices = [];
  let next = 0;
  for (let remaining = count; remaining > 0; remaining--) {
    while (rank >= choose(size - next - 1, remaining - 1)) {
      rank -= choose(size - next - 1, remaining - 1);
      next++;
    }
    indices.push(next++);
  }
  return indices;
}

function combinationRank(indices, size) {
  let rank = 0, next = 0;
  for (let i = 0; i < indices.length; i++) {
    for (; next < indices[i]; next++) rank += choose(size - next - 1, indices.length - i - 1);
    next++;
  }
  return rank;
}

function freeInstance(count, range, maxSpan, previousNotes, rng) {
  const { blocks, total } = freeBlocks(count, range, maxSpan);
  let excluded = -1;
  const previous = [...new Set(previousNotes)].sort((a, b) => a - b);
  const oldBlock = blocks.find(block => block.minimum === previous[0]);
  if (previous.length === count && oldBlock && previous.at(-1) <= oldBlock.minimum + oldBlock.available) {
    excluded = oldBlock.start + combinationRank(previous.slice(1).map(note => note - oldBlock.minimum - 1), oldBlock.available);
  }
  const rank = indexAvoiding(total, excluded, rng);
  const block = blocks.find(item => rank < item.start + item.weight);
  return [block.minimum, ...combinationAt(block.available, count - 1, rank - block.start).map(index => block.minimum + 1 + index)];
}

function fixedInstance(branch, range, maxSpan, previousNotes, rng) {
  const offsets = candidateOffsets(branch);
  const firstRoot = range.low - offsets[0];
  const total = instanceCount(branch, range, maxSpan);
  const previous = [...new Set(previousNotes)].sort((a, b) => a - b);
  const previousRoot = previous[0] - offsets[0];
  const candidateIndex = previousRoot - firstRoot;
  const matches = previous.length === offsets.length && candidateIndex >= 0 && candidateIndex < total && offsets.every((offset, i) => previousRoot + offset === previous[i]);
  const root = firstRoot + indexAvoiding(total, matches ? candidateIndex : -1, rng);
  return { notes: offsets.map(offset => root + offset), root };
}

export function generateQuestion(recipe, range = { low: 36, high: 83 }, previousNotes = [], rng = Math.random) {
  const errors = validateRecipe(recipe, range);
  if (errors.length) throw new RangeError(errors.join('\n'));
  const category = pick(recipe.categories, rng);
  const generator = pick(category.generators, rng);
  let branch;
  if (['rootTriad', 'invertedTriad', 'rootSeventh'].includes(generator.id)) branch = { kind: 'chord', quality: pick(generator.qualities, rng), inversion: pick(generator.inversions, rng) };
  else branch = pick(branches(generator), rng);
  const instance = branch.kind === 'free' ? { notes: freeInstance(branch.count, range, recipe.maxSpan, previousNotes, rng) } : fixedInstance(branch, range, recipe.maxSpan, previousNotes, rng);
  const { notes } = instance;
  let label = GENERATOR_LABELS[generator.id];
  if (branch.kind === 'interval') label = `${branch.distance} 半音双音`;
  if (branch.kind === 'free') label = `自由${branch.count}音`;
  if (branch.kind === 'chord') label = `${QUALITY_LABELS[branch.quality]} · ${['原位', '第一转位', '第二转位'][branch.inversion]}`;
  return {
    notes, category: category.id, generator: generator.id, label, bass: notes[0],
    ...(branch.kind === 'chord' ? { quality: branch.quality, inversion: branch.inversion, root: instance.root } : {}),
    ...(branch.kind === 'interval' ? { distance: branch.distance } : {}),
  };
}
