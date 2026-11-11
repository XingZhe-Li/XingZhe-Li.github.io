import { frequency } from './music.js';
import { PIANO_SAMPLES } from './piano-samples.js';

export const TIMBRES = Object.freeze([
  { id: 'piano', label: '合成钢琴', description: '清晰起音与逐渐衰减的泛音，默认练习音色。' },
  { id: 'brightPiano', label: '明亮钢琴', description: '快速起音、丰富的高次泛音与逐渐衰减的尾音，听感更清脆。' },
  { id: 'sampledPiano', label: '真实钢琴 · 明亮', description: 'Salamander Yamaha C5 实录采样，保留自然起音，带轻度明亮均衡。' },
  { id: 'sine', label: '纯音', description: '只有基频的正弦波，减少泛音带来的音色线索。' },
  { id: 'epiano', label: '柔和电琴', description: '较柔和的起音与温暖衰减，带有适度的高次泛音。' },
  { id: 'organ', label: '风琴', description: '平稳延音与丰富泛音，结尾统一释放。' },
].map(timbre => Object.freeze(timbre)));

const NOTE_SECONDS = 1.5;
const MIN_GAIN = 0.00001;
const SAMPLE_SECONDS = 2;
const SAMPLE_TIMEOUT_MS = 15000;
const SAMPLE_RELEASE_SECONDS = 0.12;
const PROFILES = {
  piano: {
    partials: [1, 0.45, 0.19, 0.1, 0.045, 0.025],
    envelope(gain, amplitude, start, harmonic) {
      // Preserve the original default voice, including its harmonic damping.
      gain.setValueAtTime(0, start);
      gain.linearRampToValueAtTime(amplitude, start + 0.008);
      gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, amplitude * 0.25), start + 0.2);
      gain.exponentialRampToValueAtTime(MIN_GAIN, start + 1.35 / Math.sqrt(harmonic));
    },
  },
  brightPiano: {
    partials: [1, 0.7, 0.52, 0.37, 0.27, 0.2, 0.15, 0.11, 0.08, 0.058, 0.042, 0.03, 0.022, 0.016],
    // Match the original piano's peak harmonic energy. Brightness comes from
    // the spectrum and attack rather than an overall gain increase.
    levelScale: 0.76,
    envelope(gain, amplitude, start, harmonic) {
      gain.setValueAtTime(0, start);
      gain.linearRampToValueAtTime(amplitude, start + 0.0025);
      gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, amplitude * 0.68 / harmonic ** 0.12), start + 0.045);
      gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, amplitude * 0.17 / harmonic ** 0.4), start + 0.24);
      // High partials fade first, leaving a clear, correctly tuned fundamental.
      gain.exponentialRampToValueAtTime(MIN_GAIN, start + 1.47 / harmonic ** 0.55);
    },
  },
  sampledPiano: { sampled: true },
  sine: {
    partials: [1],
    envelope(gain, amplitude, start) {
      gain.setValueAtTime(0, start);
      gain.linearRampToValueAtTime(amplitude, start + 0.02);
      gain.linearRampToValueAtTime(amplitude * 0.92, start + 1.25);
      gain.exponentialRampToValueAtTime(MIN_GAIN, start + 1.48);
    },
  },
  epiano: {
    partials: [1, 0.16, 0.3, 0.06, 0.025, 0.012],
    envelope(gain, amplitude, start, harmonic) {
      gain.setValueAtTime(0, start);
      gain.linearRampToValueAtTime(amplitude, start + 0.02);
      gain.exponentialRampToValueAtTime(Math.max(MIN_GAIN, amplitude * 0.55), start + 0.28);
      gain.exponentialRampToValueAtTime(MIN_GAIN, start + 1.45 / harmonic ** 0.15);
    },
  },
  organ: {
    partials: [1, 0.4, 0.24, 0.15, 0.09, 0.05, 0.035, 0.02],
    envelope(gain, amplitude, start) {
      gain.setValueAtTime(0, start);
      gain.linearRampToValueAtTime(amplitude, start + 0.04);
      gain.setValueAtTime(amplitude, start + 1.35);
      gain.linearRampToValueAtTime(0, start + 1.49);
    },
  },
};

function requireTimbre(id) {
  if (typeof id !== 'string' || !Object.hasOwn(PROFILES, id)) {
    throw new RangeError(`Unknown timbre: ${String(id)}`);
  }
  return PROFILES[id];
}

function requireNotes(notes) {
  if (!Array.isArray(notes) || notes.some(note =>
    !Number.isInteger(note) || note < 0 || note > 127)) {
    throw new RangeError('Playback requires an array of MIDI pitches from 0 to 127.');
  }
  return [...notes];
}

function nearestSample(note) {
  let closest;
  for (const sample of PIANO_SAMPLES) {
    if (!Number.isInteger(sample.midi) || typeof sample.url !== 'string' || !sample.url) {
      throw new Error('真实钢琴采样清单包含无效项目。');
    }
    if (!closest || Math.abs(sample.midi - note) < Math.abs(closest.midi - note)
      || (Math.abs(sample.midi - note) === Math.abs(closest.midi - note)
        && sample.midi < closest.midi)) closest = sample;
  }
  if (!closest) throw new Error('真实钢琴采样清单为空。');
  return closest;
}

function sampleRateFor(note, sample) {
  const tuningCents = sample.tuningCents ?? 0;
  if (!Number.isFinite(tuningCents)) throw new Error(`采样调律数据无效：${sample.url}`);
  // A positive tuningCents means the recording is sharp of its named MIDI pitch.
  const rate = 2 ** ((note - sample.midi) / 12 - tuningCents / 1200);
  if (NOTE_SECONDS * rate > SAMPLE_SECONDS + 1e-8) {
    throw new Error(`音高 ${note} 超出真实钢琴采样的安全移调范围。`);
  }
  return rate;
}

async function withSampleTimeout(promise, message, onTimeout) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(message));
      onTimeout?.();
    }, SAMPLE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function trimSample(context, decoded, url) {
  if (!decoded || !Number.isFinite(decoded.duration) || decoded.duration < SAMPLE_SECONDS
    || !Number.isFinite(decoded.sampleRate) || decoded.sampleRate <= 0
    || !Number.isInteger(decoded.numberOfChannels) || decoded.numberOfChannels < 1
    || typeof decoded.getChannelData !== 'function') {
    throw new Error(`采样解码结果无效或不足 ${SAMPLE_SECONDS} 秒：${url}`);
  }
  const frames = Math.round(SAMPLE_SECONDS * decoded.sampleRate);
  if (decoded.length < frames) throw new Error(`采样帧数不足：${url}`);
  const trimmed = context.createBuffer(decoded.numberOfChannels, frames, decoded.sampleRate);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const data = decoded.getChannelData(channel).subarray(0, frames);
    if (typeof trimmed.copyToChannel === 'function') trimmed.copyToChannel(data, channel);
    else trimmed.getChannelData(channel).set(data);
  }
  return trimmed;
}

// All voices use the requested MIDI fundamental and the same scheduling length.
export class PianoAudio {
  context = null;
  voices = [];
  generation = 0;
  #timbre;
  #sampleBuffers = new Map();
  #sampleLoads = new Map();
  #decodeQueue = Promise.resolve();

  constructor({ timbre = 'piano' } = {}) {
    requireTimbre(timbre);
    this.#timbre = timbre;
  }
  get timbre() {
    return this.#timbre;
  }
  setTimbre(id) {
    requireTimbre(id);
    this.stop();
    this.#timbre = id;
    return this;
  }
  async init() {
    this.context ??= new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') await this.context.resume();
  }
  async #fetchSample(url) {
    const controller = new AbortController();
    const download = (async () => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response || !response.ok) {
        throw new Error(`HTTP ${response?.status ?? '无响应'}：${url}`);
      }
      const type = response.headers?.get?.('content-type')?.toLowerCase() ?? '';
      if (type.includes('text/') || type.includes('json')) {
        throw new Error(`服务器返回了非音频内容：${url}`);
      }
      const bytes = await response.arrayBuffer();
      if (!(bytes instanceof ArrayBuffer) || bytes.byteLength === 0) {
        throw new Error(`采样文件为空或无效：${url}`);
      }
      return bytes;
    })();
    return withSampleTimeout(download, `读取钢琴采样超时：${url}`, () => controller.abort());
  }
  #loadSample(sample) {
    if (this.#sampleBuffers.has(sample.url)) {
      return Promise.resolve(this.#sampleBuffers.get(sample.url));
    }
    if (this.#sampleLoads.has(sample.url)) return this.#sampleLoads.get(sample.url);

    const context = this.context;
    const pending = this.#fetchSample(sample.url)
      .then(bytes => {
        // Only one long original recording is decoded at a time. The cache
        // retains its first two seconds, never the full ~25-second PCM buffer.
        const decode = this.#decodeQueue.then(async () => {
          const decoded = await withSampleTimeout(context.decodeAudioData(bytes),
            `解码钢琴采样超时：${sample.url}`);
          return trimSample(context, decoded, sample.url);
        });
        this.#decodeQueue = decode.catch(() => {});
        return decode;
      })
      .then(buffer => {
        this.#sampleBuffers.set(sample.url, buffer);
        return buffer;
      })
      .catch(error => {
        throw new Error(`钢琴采样加载失败（${sample.url}）：${error.message ?? String(error)}`,
          { cause: error });
      })
      .finally(() => {
        if (this.#sampleLoads.get(sample.url) === pending) this.#sampleLoads.delete(sample.url);
      });
    this.#sampleLoads.set(sample.url, pending);
    return pending;
  }
  async #prepareNotes(notes) {
    const plan = new Map();
    const samples = new Map();
    for (const note of notes) {
      const sample = nearestSample(note);
      const rate = sampleRateFor(note, sample);
      plan.set(note, { sample, rate });
      samples.set(sample.url, sample);
    }
    await Promise.all([...samples.values()].map(sample => this.#loadSample(sample)));
    for (const entry of plan.values()) entry.buffer = this.#sampleBuffers.get(entry.sample.url);
    return plan;
  }
  async prepare({ low = 21, high = 108 } = {}) {
    const profile = requireTimbre(this.#timbre);
    if (!profile.sampled) return;
    if (!Number.isInteger(low) || !Number.isInteger(high)
      || low < 0 || high > 127 || low > high) {
      throw new RangeError('采样预加载键域必须是 0–127 内有效的 MIDI 范围。');
    }
    await this.init();
    const notes = Array.from({ length: high - low + 1 }, (_, index) => low + index);
    await this.#prepareNotes(notes);
  }
  stop() {
    this.generation++;
    for (const voice of this.voices) {
      try { voice.stop(); } catch { /* Voice may already have ended. */ }
    }
    this.voices = [];
  }
  async play(notes, {sequence = false} = {}) {
    const profile = requireTimbre(this.#timbre);
    const requestedNotes = requireNotes(notes);
    this.stop();
    const request = this.generation;
    try {
      await this.init();
      if (request !== this.generation) return false;
      const samplePlan = profile.sampled ? await this.#prepareNotes(requestedNotes) : null;
      if (request !== this.generation) return false;
      const context = this.context;
      // Loading can take time: schedule all notes from one fresh audio clock.
      const now = context.currentTime + 0.025;
      const groups = sequence
        ? [{notes: requestedNotes, at: 0}, ...requestedNotes.map((note, i) => ({notes: [note], at: 1.5 + i * 0.7})), {notes: requestedNotes, at: 2 + requestedNotes.length * 0.7}]
        : [{notes: requestedNotes, at: 0}];
      for (const group of groups) {
        const level = 0.16 * (profile.levelScale ?? 1) / Math.sqrt(Math.max(1, group.notes.length));
        for (const note of group.notes) {
          const start = now + group.at;
          if (profile.sampled) {
            const entry = samplePlan.get(note);
            const source = context.createBufferSource();
            const gain = context.createGain();
            const shelf = context.createBiquadFilter();
            source.buffer = entry.buffer;
            source.playbackRate.value = entry.rate;
            shelf.type = 'highshelf';
            shelf.frequency.value = Math.min(2000, context.sampleRate * 0.4);
            shelf.gain.value = 3;
            // The recording supplies its own attack. Leave headroom for the
            // shelf boost and any chord size, then fade only its last 120 ms.
            const sampleLevel = 0.6 / Math.max(1, group.notes.length);
            gain.gain.setValueAtTime(sampleLevel, start);
            gain.gain.setValueAtTime(sampleLevel, start + NOTE_SECONDS - SAMPLE_RELEASE_SECONDS);
            gain.gain.linearRampToValueAtTime(0, start + NOTE_SECONDS);
            source.connect(gain); gain.connect(shelf); shelf.connect(context.destination);
            this.voices.push(source);
            source.onended = () => { source.disconnect(); gain.disconnect(); shelf.disconnect(); };
            source.start(start, 0); source.stop(start + NOTE_SECONDS);
            continue;
          }
          const hz = frequency(note);
          for (let index = 0; index < profile.partials.length; index++) {
            const harmonic = index + 1;
            if (hz * harmonic >= context.sampleRate / 2) break;
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.type = 'sine';
            osc.frequency.value = hz * harmonic;
            const amplitude = level * profile.partials[index];
            profile.envelope(gain.gain, amplitude, start, harmonic);
            osc.connect(gain); gain.connect(context.destination);
            osc.start(start); osc.stop(start + NOTE_SECONDS);
            this.voices.push(osc);
            osc.onended = () => { osc.disconnect(); gain.disconnect(); };
          }
        }
      }
      return sequence ? (3.5 + requestedNotes.length * 0.7) * 1000 : NOTE_SECONDS * 1000;
    } catch (error) {
      if (request !== this.generation) return false;
      this.stop();
      throw error instanceof Error ? error : new Error(String(error));
    }
  }
}
