import { frequency, validateModel } from '../music/models.js';

const LOOKAHEAD_SECONDS = 0.12;
const TICK_MS = 25;
const FADE_SECONDS = 0.018;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Browser-local synthesis. Nothing is loaded or played before an explicit call. */
export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.compressor = null;
    this.isPlaying = false;
    this.lastError = null;
    this._volume = 0.65;
    this._generation = 0;
    this._session = null;
    this._sources = new Set();
    this._noise = null;
    this._destroyed = false;
  }

  async _ensureContext() {
    if (this._destroyed) throw new Error('声音引擎已关闭，请重新打开页面。');
    if (!this.context) {
      const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AudioContextClass) throw new Error('当前浏览器不支持 Web Audio，请使用较新的浏览器。');
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = this._volume;
      this.compressor = this.context.createDynamicsCompressor();
      this.compressor.threshold.value = -12;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.15;
      this.master.connect(this.compressor).connect(this.context.destination);
    }
    if (this.context.state === 'closed') throw new Error('浏览器音频已关闭，请刷新页面后重试。');
    if (this.context.state !== 'running') await this.context.resume();
    if (this.context.state !== 'running') throw new Error('声音尚未开启，请再次点击播放。');
    return this.context;
  }

  async play(model, options = {}) {
    validateModel(model);
    const bpm = options.bpm ?? 90;
    if (!Number.isFinite(bpm) || bpm < 20 || bpm > 300) throw new RangeError('速度需要在每分钟 20—300 拍之间。');
    this.stop();
    const generation = this._generation;
    const context = await this._ensureContext();
    if (generation !== this._generation || this._destroyed) return false;

    const route = context.createGain();
    route.gain.value = 0.95;
    route.connect(this.master);
    const effectNodes=[];
    let effectInput=null;
    const space=options.space||model.meta?.space||'dry';
    if(space==='room'&&typeof context.createConvolver==='function') {
      const room=context.createConvolver(),wet=context.createGain();
      const length=Math.ceil(context.sampleRate*1.2),impulse=context.createBuffer(2,length,context.sampleRate);
      let seed=1973;for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);for(let i=0;i<length;i++){seed=(1664525*seed+1013904223)>>>0;data[i]=(seed/2147483648-1)*(1-i/length)**3*.55;}}
      room.buffer=impulse;wet.gain.value=.26;room.connect(wet).connect(route);effectInput=room;effectNodes.push(room,wet);
    } else if(space==='echo'&&typeof context.createDelay==='function') {
      const delay=context.createDelay(2),wet=context.createGain(),feedback=context.createGain();delay.delayTime.value=30/bpm;wet.gain.value=.3;feedback.gain.value=.22;delay.connect(feedback).connect(delay);delay.connect(wet).connect(route);effectInput=delay;effectNodes.push(delay,wet,feedback);
    }
    const gains = {};
    const enabled = { melody: true, bass: true, rhythm: true, ...(options.layers || {}) };
    for (const layer of ['melody', 'bass', 'rhythm']) {
      const gain = context.createGain();
      gain.gain.value = enabled[layer] ? 1 : 0;
      gain.connect(route);
      if(effectInput)gain.connect(effectInput);
      gains[layer] = gain;
    }
    const session = {
        generation, route, gains, enabled, effectNodes, displaySubdivision:Number.isInteger(model.meta?.stepsPerBeat)&&model.meta.stepsPerBeat>=1&&model.meta.stepsPerBeat<=12?model.meta.stepsPerBeat:2,
      model: { beats: model.beats, events: model.events.map(event => ({ ...event })).sort((a, b) => a.beat - b.beat) },
      beatSeconds: 60 / bpm,
      startAt: context.currentTime + 0.045,
      cycle: 0, eventIndex: 0, nextDisplayStep: 0,
      loop: model.meta?.loop !== false,
      finishAt: context.currentTime + .045 + model.beats * 60 / bpm + Math.max(.14,...model.events.map(event=>Number.isFinite(event.release)?event.release:0)) + (space==='dry'?.03:1.8),
      onStep: typeof options.onStep === 'function' ? options.onStep : () => {},
      onState: typeof options.onState === 'function' ? options.onState : () => {},
      onError: typeof options.onError === 'function' ? options.onError : null,
      displayTimers: new Set(), interval: null,
      activeNodes: 0, stopped: false,
    };
    this._session = session;
    this.isPlaying = true;
    this.lastError = null;
    try {
      session.onState(true);
      this._schedule(session);
      if (!this.isPlaying && this.lastError) throw this.lastError;
      if (this._session === session) session.interval = setInterval(() => this._schedule(session), TICK_MS);
      return this.isPlaying;
    } catch (error) {
      this.lastError = error;
      this.stop();
      throw error;
    }
  }

  _schedule(session) {
    if (session.stopped || this._session !== session || !this.isPlaying) return;
    try {
      const now = this.context.currentTime;
      const horizon = now + LOOKAHEAD_SECONDS;
      const loopSeconds = session.model.beats * session.beatSeconds;
      if(!session.loop&&now>=session.finishAt){this.stop();return;}
      // After a suspended/background tab resumes, skip missed loops rather than flood the audio graph.
      const currentCycle = Math.max(0, Math.floor((now - session.startAt) / loopSeconds));
      if (session.loop && currentCycle > session.cycle) {
        session.cycle = currentCycle;
        session.eventIndex = 0;
      }
      let scheduled = 0;
      while (session.model.events.length && scheduled < 512) {
        if (session.eventIndex >= session.model.events.length) {
          if(!session.loop)break;
          session.eventIndex = 0;
          session.cycle += 1;
        }
        const event = session.model.events[session.eventIndex];
        const when = session.startAt + (session.cycle * session.model.beats + event.beat) * session.beatSeconds;
        if (when >= horizon) break;
        session.eventIndex += 1;
        if (when < now - 0.02) continue;
        this._sound(event, Math.max(when, now + 0.002), session);
        scheduled += 1;
      }
      const halfBeatSeconds = session.beatSeconds / session.displaySubdivision;
      const currentStep = Math.max(0, Math.floor((now - session.startAt) / halfBeatSeconds));
      if (session.nextDisplayStep < currentStep - 1) session.nextDisplayStep = currentStep;
      while (session.startAt + session.nextDisplayStep * halfBeatSeconds < horizon) {
        if(!session.loop&&session.nextDisplayStep>=Math.ceil(session.model.beats*session.displaySubdivision))break;
        const absoluteStep = session.nextDisplayStep++;
        const time = session.startAt + absoluteStep * halfBeatSeconds;
        const timer = setTimeout(() => {
          session.displayTimers.delete(timer);
          if (this._session !== session || session.stopped) return;
          try {
            const step = absoluteStep % Math.round(session.model.beats * session.displaySubdivision);
            session.onStep({ beat: step / session.displaySubdivision, step, totalBeats: session.model.beats });
          } catch (error) { this._fail(session, error); }
        }, Math.max(0, (time - now) * 1000));
        session.displayTimers.add(timer);
      }
    } catch (error) { this._fail(session, error); }
  }

  _fail(session, error) {
    if (this._session !== session) return;
    this.lastError = error instanceof Error ? error : new Error(String(error));
    this.stop();
    if (session.onError) {
      try { session.onError(this.lastError); } catch { /* A UI error must not leave sound playing. */ }
    }
  }

  _track(source, nodes, session = null) {
    const record = { source, nodes, session };
    this._sources.add(record);
    if (session) session.activeNodes += 1;
    source.onended = () => {
      this._sources.delete(record);
      for (const node of [source, ...nodes]) {
        try { node.disconnect(); } catch { /* already disconnected */ }
      }
      if (session) {
        session.activeNodes -= 1;
        if (session.stopped && session.activeNodes === 0) this._disconnectSession(session);
      }
    };
    return record;
  }

  _disconnectSession(session) {
    for (const gain of Object.values(session.gains)) {
      try { gain.disconnect(); } catch { /* already disconnected */ }
    }
    try { session.route.disconnect(); } catch { /* already disconnected */ }
    for(const node of session.effectNodes||[]){try{node.disconnect();}catch{}}
  }

  _noiseBuffer() {
    if (this._noise) return this._noise;
    const size = Math.ceil(this.context.sampleRate * 0.5);
    const buffer = this.context.createBuffer(1, size, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 241;
    for (let i = 0; i < size; i += 1) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    this._noise = buffer;
    return buffer;
  }

  _sound(event, when, session) {
    if (event.kind === 'tone') {
      this._tone(event.note, when, event.duration * session.beatSeconds, event.velocity, session.gains[event.layer], event.layer, session, event);
      return;
    }
    const context = this.context;
    const envelope = context.createGain();
    envelope.connect(session.gains[event.layer]);
    envelope.gain.setValueAtTime(0.0001, when);
    if (event.kind === 'kick') {
      const source = context.createOscillator();
      source.type = 'sine';
      source.frequency.setValueAtTime(112, when);
      source.frequency.exponentialRampToValueAtTime(46, when + 0.09);
      envelope.gain.exponentialRampToValueAtTime(0.28 * event.velocity + 0.0001, when + 0.005);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
      source.connect(envelope);
      this._track(source, [envelope], session);
      source.start(when);
      source.stop(when + 0.24);
    } else {
      const source = context.createBufferSource();
      source.buffer = this._noiseBuffer();
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = event.kind === 'hat' ? 6500 : 1200;
      filter.Q.value = 0.55;
      source.connect(filter).connect(envelope);
      const duration = event.kind === 'hat' ? 0.065 : 0.14;
      const peak = event.kind === 'hat' ? 0.075 : 0.15;
      envelope.gain.exponentialRampToValueAtTime(peak * event.velocity + 0.0001, when + 0.003);
      envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration);
      this._track(source, [filter, envelope], session);
      source.start(when);
      source.stop(when + duration + 0.015);
    }
  }

  _tone(note, when, duration, velocity, destination, layer = 'melody', session = null, toneOptions = {}) {
    const context = this.context;
    const source = context.createOscillator();
    source.type = ['sine','triangle','sawtooth','square'].includes(toneOptions.waveform)?toneOptions.waveform:(layer === 'bass' ? 'sine' : 'triangle');
    source.frequency.setValueAtTime(frequency(note), when);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = layer === 'bass' ? 800 : 2300;
    filter.Q.value = 0.45;
    const envelope = context.createGain();
    const peak = (layer === 'bass' ? 0.23 : 0.17) * velocity + 0.0001;
    const release=Number.isFinite(toneOptions.release)?clamp(toneOptions.release,.03,1.2):Math.min(.14,duration*.25);
    const requestedAttack=Number.isFinite(toneOptions.attack)?Math.max(.005,toneOptions.attack):.015;
    const attack=Math.min(requestedAttack,duration*.75);
    const decayEnd=Math.min(duration,Math.max(attack,Math.min(attack+.08,duration*.85)));
    envelope.gain.setValueAtTime(0.0001, when);
    envelope.gain.exponentialRampToValueAtTime(peak, when + attack);
    envelope.gain.exponentialRampToValueAtTime(peak * 0.62, when + decayEnd);
    envelope.gain.setValueAtTime(peak * 0.62, when + duration);
    envelope.gain.exponentialRampToValueAtTime(0.0001, when + duration + release);
    source.connect(filter).connect(envelope).connect(destination);
    this._track(source, [filter, envelope], session);
    source.start(when);
    source.stop(when + duration + release + 0.02);
  }

  setLayers(layers = {}) {
    const session = this._session;
    if (!session || !this.context) return;
    const now = this.context.currentTime;
    for (const layer of ['melody', 'bass', 'rhythm']) {
      if (!(layer in layers)) continue;
      session.enabled[layer] = Boolean(layers[layer]);
      session.gains[layer].gain.cancelScheduledValues(now);
      session.gains[layer].gain.setTargetAtTime(session.enabled[layer] ? 1 : 0, now, 0.012);
    }
  }

  setVolume(value) {
    if (!Number.isFinite(value)) return;
    this._volume = clamp(value, 0, 1);
    if (this.master && this.context && this.context.state !== 'closed') {
      this.master.gain.setTargetAtTime(this._volume, this.context.currentTime, 0.018);
    }
  }

  async preview(noteOrMidi) {
    frequency(noteOrMidi); // Validate before resuming a context.
    const generation = this._generation;
    const context = await this._ensureContext();
    if (generation !== this._generation || this._destroyed) return false;
    this._tone(noteOrMidi, context.currentTime + 0.008, 0.45, 0.8, this.master);
    return true;
  }

  stop() {
    this._generation += 1;
    const session = this._session;
    this._session = null;
    this.isPlaying = false;
    if (session) {
      session.stopped = true;
      clearInterval(session.interval);
      for (const timer of session.displayTimers) clearTimeout(timer);
      session.displayTimers.clear();
      if (this.context && this.context.state !== 'closed') {
        const now = this.context.currentTime;
        session.route.gain.cancelScheduledValues(now);
        session.route.gain.setTargetAtTime(0, now, 0.005);
      }
    }
    if (this.context && this.context.state !== 'closed') {
      const now = this.context.currentTime;
      const stopAt = now + FADE_SECONDS;
      for (const record of this._sources) {
        const envelope = record.nodes.at(-1)?.gain;
        if (envelope) {
          try {
            if (typeof envelope.cancelAndHoldAtTime === 'function') envelope.cancelAndHoldAtTime(now);
            else {
              const value = Math.max(0.0001, envelope.value);
              envelope.cancelScheduledValues(now);
              envelope.setValueAtTime(value, now);
            }
            envelope.setTargetAtTime(0.0001, now, 0.004);
          } catch { /* The context may have been closed externally. */ }
        }
        try { record.source.stop(stopAt); } catch { /* source may already be finished */ }
      }
    }
    if (session) {
      if (session.activeNodes === 0) this._disconnectSession(session);
      try { session.onState(false); } catch (error) { this.lastError = error; }
    }
  }

  async destroy() {
    this.stop();
    this._destroyed = true;
    if (this.context && this.context.state !== 'closed') await this.context.close();
    this._sources.clear();
    this._noise = null;
  }
}
