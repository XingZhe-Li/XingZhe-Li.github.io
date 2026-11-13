import { esc, pretty } from '../ui.js';
import { parseNote } from '../music/theory.js';

const EPS = 1e-7;
const DRUMS = { kick: '底鼓', snare: '军鼓', hat: '踩镲' };
const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
const near = (a, b) => Math.abs(a - b) < EPS;
const clean = value => Number(value.toFixed(7));

/** A note's written staff position, rather than its equal-tempered MIDI pitch. */
export function writtenNoteY(note, clef = 'treble') {
  const parsed = parseNote(note);
  const bottomLine = clef === 'bass' ? 2 * 7 + 4 : 4 * 7 + 2; // G2 / E4
  return 40 - (parsed.octave * 7 + parsed.index - bottomLine) * 5;
}

function durationText(value) {
  if (near(value, Math.round(value))) return String(Math.round(value));
  for (const denominator of [2, 3, 4, 6, 8, 12, 16, 24]) {
    const numerator = Math.round(value * denominator);
    if (near(value, numerator / denominator)) return `${numerator}/${denominator}`;
  }
  return String(Number(value.toFixed(4)));
}

function barRanges(excerpt) {
  const lengths = excerpt.barBeats || Array(excerpt.bars).fill(excerpt.beatsPerBar);
  let elapsed = 0;
  return lengths.map((duration, index) => {
    const start = clean(elapsed); elapsed += duration;
    return { index, start, end: clean(elapsed) };
  });
}

function positionAt(beat, excerpt, ending = false) {
  const ranges = barRanges(excerpt);
  const range = ranges.find(bar => ending ? beat <= bar.end + EPS : beat < bar.end - EPS) || ranges.at(-1);
  return { ...range, within: clean(beat - range.start) };
}

function positionText(beat, excerpt) {
  const { index: bar, within, start, end } = positionAt(beat, excerpt);
  if (!near(end - start, excerpt.beatsPerBar)) return `第${bar + 1}小节（短小节） · 起点后${durationText(within)}拍`;
  const whole = Math.floor(within + EPS), fraction = clean(within - whole);
  return `第${bar + 1}小节 · 第${whole + 1}拍${fraction > EPS ? `后${durationText(fraction)}拍` : ''}`;
}

function inspect(excerpt, variant) {
  if (!excerpt || !Number.isFinite(excerpt.beatsPerBar) || excerpt.beatsPerBar <= 0 || excerpt.beatsPerBar > 16 || !Number.isInteger(excerpt.bars) || excerpt.bars < 1 || excerpt.bars > 32) {
    throw new RangeError('谱例需要1至32小节，以及每小节明确的四分拍长度。');
  }
  if (excerpt.barBeats !== undefined && (!Array.isArray(excerpt.barBeats) || excerpt.barBeats.length !== excerpt.bars || excerpt.barBeats.some(beats => !Number.isFinite(beats) || beats <= 0 || beats > 16))) throw new RangeError('逐小节长度必须与小节数一致，并使用有效四分拍长度。');
  if (!variant || !Array.isArray(variant.parts) || !variant.parts.length) throw new TypeError('谱例需要至少一个声部。');
  const ids = new Set(), total = barRanges(excerpt).at(-1).end;
  for (const part of variant.parts) {
    if (!part || typeof part.id !== 'string' || !part.id || ids.has(part.id) || !Array.isArray(part.events)) throw new TypeError('谱例声部需要唯一标识与音符事件。');
    ids.add(part.id);
    if (!['treble', 'bass', 'percussion'].includes(part.clef || 'treble')) throw new RangeError('谱例暂支持高音、低音与打击谱号。');
    for (const event of part.events) {
      if (!event || !Number.isFinite(event.beat) || event.beat < 0 || event.beat >= total || !Number.isFinite(event.duration) || event.duration <= 0 || event.beat + event.duration > total + EPS || !Array.isArray(event.notes)) throw new RangeError('谱例事件的起点、时值和音名列表无效，或超出摘录范围。');
      for (const note of event.notes) parseNote(note);
      if (event.kind && !['tone', ...Object.keys(DRUMS)].includes(event.kind)) throw new RangeError('谱例含未知的打击类型。');
      if (DRUMS[event.kind] && event.notes.length) throw new TypeError('打击事件不同时声明有音高音符。');
    }
  }
}

/** Split notation at bar boundaries without inventing another sounding onset. */
export function scoreSegments(excerpt, variant) {
  inspect(excerpt, variant);
  return barRanges(excerpt).map(({ index, start, end }) => {
    return {
      index, start, end,
      label: excerpt.barLabels?.[index] || `第${index + 1}小节`,
      parts: variant.parts.map(part => ({
        id: part.id, name: part.name || part.id, clef: part.clef || 'treble',
        segments: part.events.flatMap((event, eventIndex) => {
          const segmentStart = clean(Math.max(start, event.beat));
          const segmentEnd = clean(Math.min(end, event.beat + event.duration));
          if (segmentEnd - segmentStart <= EPS) return [];
          return [{
            ...event, notes: [...event.notes], eventIndex,
            start: segmentStart, end: segmentEnd, segmentDuration: clean(segmentEnd - segmentStart),
            continuesIn: event.beat < start - EPS, continuesOut: event.beat + event.duration > end + EPS,
          }];
        }),
      })),
    };
  });
}

function conventionalDuration(duration) {
  for (const base of [4, 2, 1, .5, .25]) {
    for (const dots of [0, 1]) {
      if (near(duration, base * (dots ? 1.5 : 1))) return { base, dots, filled: base < 2, stem: base < 4, flags: base === .5 ? 1 : base === .25 ? 2 : 0 };
    }
  }
  return null;
}

function keyAlteration(letter, signature) {
  if (!Number.isInteger(signature) || Math.abs(signature) > 7) return 0;
  return signature > 0 && SHARP_ORDER.slice(0, signature).includes(letter) ? 1
    : signature < 0 && FLAT_ORDER.slice(0, -signature).includes(letter) ? -1 : 0;
}

function accidental(note, state, signature) {
  const parsed = parseNote(note), key = parsed.letter + parsed.octave;
  const previous = state.has(key) ? state.get(key) : keyAlteration(parsed.letter, signature);
  state.set(key, parsed.accidental);
  // Accidentals are repeated for each altered pitch in this analytical display.
  if (parsed.accidental > 0) return '♯'.repeat(parsed.accidental);
  if (parsed.accidental < 0) return '♭'.repeat(-parsed.accidental);
  return previous !== 0 ? '♮' : '';
}

function ledgerLines(x, relativeY, staffTop) {
  let lines = '';
  for (let y = -10; y >= relativeY - EPS; y -= 10) lines += `<line x1="${x - 11}" x2="${x + 11}" y1="${staffTop + y}" y2="${staffTop + y}"/>`;
  for (let y = 50; y <= relativeY + EPS; y += 10) lines += `<line x1="${x - 11}" x2="${x + 11}" y1="${staffTop + y}" y2="${staffTop + y}"/>`;
  return lines;
}

function stemAndFlags(x, ys, rhythm) {
  if (!rhythm?.stem || !ys.length) return '';
  const average = ys.reduce((sum, y) => sum + y, 0) / ys.length;
  const down = average < 20, stemX = x + (down ? -6 : 6);
  const from = down ? Math.min(...ys) : Math.max(...ys), to = down ? Math.max(...ys) + 30 : Math.min(...ys) - 30;
  let output = `<line class="score-stem" x1="${stemX}" x2="${stemX}" y1="${from}" y2="${to}" stroke="currentColor" stroke-width="1.3"/>`;
  for (let flag = 0; flag < rhythm.flags; flag++) {
    const y = to + (down ? -1 : 1) * flag * 7;
    output += down
      ? `<path d="M${stemX} ${y}q-13 -6 -7 -20q-3 11 7 14" fill="currentColor"/>`
      : `<path d="M${stemX} ${y}q14 6 8 21q3 -11 -8 -15" fill="currentColor"/>`;
  }
  return output;
}

function rest(x, staffTop, rhythm, duration, percussion = false) {
  const y = staffTop;
  if (!rhythm) return `<text x="${x}" y="${y + 24}" font-size="10" text-anchor="middle" fill="currentColor">休止 ${durationText(duration)}拍</text>`;
  let output;
  if (rhythm.base === 4) output = `<rect x="${x - 6}" y="${y + (percussion ? 20 : 10)}" width="12" height="5" fill="currentColor"/>`;
  else if (rhythm.base === 2) output = `<rect x="${x - 6}" y="${y + 15}" width="12" height="5" fill="currentColor"/>`;
  else if (rhythm.base === 1) output = `<path d="M${x + 2} ${y + 6}l-5 9 7 10 -6 6q-7 6 0 12q-2 -8 5 -8l-7 -8 7 -8Z" fill="currentColor"/>`;
  else {
    output = `<path d="M${x + 5} ${y + 10}l-7 28" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
    for (let flag = 0; flag < rhythm.flags; flag++) output += `<circle cx="${x - 1 + flag * 2}" cy="${y + 13 + flag * 8}" r="3" fill="currentColor"/><path d="M${x - 1 + flag * 2} ${y + 15 + flag * 8}q5 4 7 -5" fill="none" stroke="currentColor"/>`;
  }
  if (rhythm.dots) output += `<circle cx="${x + 12}" cy="${y + 18}" r="1.8" fill="currentColor"/>`;
  return output;
}

function eventDescription(segment, part, excerpt) {
  const notes = DRUMS[segment.kind] || (segment.notes.length ? segment.notes.map(pretty).join('、') : '休止');
  return `${part.name}，${positionText(segment.start, excerpt)}，${notes}，本段${durationText(segment.segmentDuration)}拍${segment.continuesIn ? '，承前续音' : ''}${segment.continuesOut ? '，延至下小节' : ''}${segment.label ? '；' + segment.label : ''}`;
}

function partMetrics(part) {
  const ys = part.segments.flatMap(segment => segment.notes.map(note => writtenNoteY(note, part.clef)));
  const min = Math.min(0, ...ys), max = Math.max(40, ...ys);
  return { topPadding: Math.max(40, 35 - min), height: Math.max(40, 35 - min) + max + 45 };
}

function drawEvent(segment, part, bar, x, staffTop, right, excerpt, accidentalState) {
  const rhythm = conventionalDuration(segment.segmentDuration), isDrum = Object.hasOwn(DRUMS, segment.kind);
  const description = eventDescription(segment, part, excerpt);
  const token = `${excerpt.id || 'excerpt'}-${part.id}-${segment.eventIndex}-${bar.index}`;
  let output = `<g class="case-score-note" data-case-note="${esc(token)}" data-start="${segment.start}" data-end="${segment.end}" data-part="${esc(part.id)}"><title>${esc(description)}</title>`;
  if (!isDrum && !segment.notes.length) output += rest(x, staffTop, rhythm, segment.segmentDuration, part.clef === 'percussion');
  else if (!rhythm) {
    // A written time value such as 1/3 is not silently shown as an eighth note.
    const label = isDrum ? DRUMS[segment.kind] : segment.notes.map(pretty).join('·');
    output += `<rect x="${x - 12}" y="${staffTop + 10}" width="24" height="20" rx="3" fill="none" stroke="currentColor"/><text x="${x}" y="${staffTop + 6}" font-size="9" text-anchor="middle" fill="currentColor">${esc(label)}</text><text x="${x}" y="${staffTop + 24}" font-size="8" text-anchor="middle" fill="currentColor">${durationText(segment.segmentDuration)}</text><text x="${x}" y="${staffTop + 43}" font-size="8" text-anchor="middle" fill="currentColor">拍 · 文本时值</text>`;
  } else {
    const pitches = isDrum ? [{ relativeY: ({ kick: 30, snare: 20, hat: 10 })[segment.kind], note: null }]
      : [...new Set(segment.notes)].map(note => ({ note, relativeY: writtenNoteY(note, part.clef) })).sort((a, b) => a.relativeY - b.relativeY);
    pitches.forEach((pitch, index) => {
      const shifted = index > 0 && near(pitch.relativeY - pitches[index - 1].relativeY, 5), headX = x + (shifted ? 8 : 0);
      if (!isDrum) output += `<g stroke="currentColor" stroke-width="1">${ledgerLines(headX, pitch.relativeY, staffTop)}</g>`;
      if (isDrum && segment.kind === 'hat') output += `<path d="M${headX - 5} ${staffTop + pitch.relativeY - 4}l10 8m-10 0 10 -8" fill="none" stroke="currentColor" stroke-width="1.8"/>`;
      else output += `<ellipse cx="${headX}" cy="${staffTop + pitch.relativeY}" rx="${rhythm.base === 4 ? 8 : 6.5}" ry="4.5" transform="rotate(-17 ${headX} ${staffTop + pitch.relativeY})" fill="${rhythm.filled ? 'currentColor' : 'white'}" stroke="currentColor" stroke-width="1.4"/>`;
      if (pitch.note) {
        const sign = accidental(pitch.note, accidentalState, excerpt.keySignature);
        if (sign) output += `<text x="${x - 12}" y="${staffTop + pitch.relativeY + 5}" text-anchor="end" font-size="17" fill="currentColor">${sign}</text>`;
      }
      if (rhythm.dots) {
        const dotY = near(pitch.relativeY % 10, 0) ? pitch.relativeY - 5 : pitch.relativeY;
        output += `<circle cx="${headX + 13}" cy="${staffTop + dotY}" r="1.8" fill="currentColor"/>`;
      }
    });
    // Stem choice uses written position relative to the staff's middle line.
    output += `<g transform="translate(0 ${staffTop})">${stemAndFlags(x, pitches.map(pitch => pitch.relativeY), rhythm)}</g>`;
  }
  if (!isDrum && segment.notes.length && (segment.continuesIn || segment.continuesOut)) {
    const tieY = rhythm ? staffTop + Math.max(...segment.notes.map(note => writtenNoteY(note, part.clef))) + 11 : staffTop + 50;
    if (segment.continuesIn) output += `<path d="M${x - 27} ${tieY}Q${x - 14} ${tieY + 8} ${x - 1} ${tieY}" fill="none" stroke="currentColor"/><text x="${x + 12}" y="${tieY + 14}" font-size="8" fill="currentColor">承前续音</text>`;
    if (segment.continuesOut) {
      const endX = Math.max(x + 16, right - 6);
      output += `<path d="M${x + 4} ${tieY}Q${(x + endX) / 2} ${tieY + 13} ${endX} ${tieY}" fill="none" stroke="currentColor"/><text x="${endX}" y="${tieY + 18}" text-anchor="end" font-size="8" fill="currentColor">延至下小节</text>`;
    }
  }
  if (segment.label) output += `<text class="case-score-note-label" x="${x}" y="${staffTop - 18}" text-anchor="middle" font-size="9" fill="currentColor">${esc(segment.label.length > 18 ? segment.label.slice(0, 16) + '…' : segment.label)}</text>`;
  return output + '</g>';
}

function barSvg(bar, excerpt, variant) {
  const positions = [...new Set(bar.parts.flatMap(part => part.segments.map(segment => segment.start)))];
  const width = Math.max(420, 110 + positions.length * 26), left = 90, right = width - 18;
  let cursor = 12;
  const body = bar.parts.map(part => {
    const metrics = partMetrics(part), staffTop = cursor + metrics.topPadding, percussion = part.clef === 'percussion';
    let output = `<g class="case-score-part" data-score-part="${esc(part.id)}"><text x="12" y="${cursor + 13}" font-size="12" fill="currentColor">${esc(part.name)}</text><g stroke="currentColor" opacity=".36">${(percussion ? [20] : [0, 10, 20, 30, 40]).map(y => `<line x1="20" x2="${right}" y1="${staffTop + y}" y2="${staffTop + y}"/>`).join('')}<line x1="${right}" x2="${right}" y1="${staffTop}" y2="${staffTop + 40}"/></g>`;
    if (percussion) output += `<path d="M30 ${staffTop + 9}v23m7 -23v23" stroke="currentColor" stroke-width="3"/>`;
    else output += `<text x="24" y="${staffTop + (part.clef === 'bass' ? 34 : 41)}" font-size="${part.clef === 'bass' ? 40 : 51}" font-family="Segoe UI Symbol,serif" fill="currentColor">${part.clef === 'bass' ? '𝄢' : '𝄞'}</text>`;
    const meter = /^(\d+)\/(\d+)$/.exec(excerpt.meter || '4/4');
    if (meter) output += `<text x="65" y="${staffTop + 17}" text-anchor="middle" font-family="serif" font-size="19" fill="currentColor">${meter[1]}</text><text x="65" y="${staffTop + 36}" text-anchor="middle" font-family="serif" font-size="19" fill="currentColor">${meter[2]}</text>`;
    const accidentalState = new Map();
    const chronological = [...part.segments].sort((a, b) => a.start - b.start || a.eventIndex - b.eventIndex);
    for (const segment of chronological) {
      const x = left + 12 + (segment.start - bar.start) / (bar.end - bar.start) * (right - left - 23);
      output += drawEvent(segment, part, bar, x, staffTop, right, excerpt, accidentalState);
    }
    if (!part.segments.length) output += `<text x="${(left + right) / 2}" y="${staffTop + 25}" font-size="11" text-anchor="middle" fill="currentColor" opacity=".65">${excerpt.originalModel?'此声部本小节休止':'本小节未列音符；见文字表与摘录说明'}</text>`;
    cursor += metrics.height;
    return output + '</g>';
  }).join('');
  const titleId = `score-${excerpt.id || 'excerpt'}-${variant.id || 'variant'}-${bar.index}`;
  return `<figure class="case-score-bar" data-case-bar="${bar.index}" data-start="${bar.start}" data-end="${bar.end}" style="margin:0;min-width:0"><figcaption>${esc(bar.label)}${!near(bar.end - bar.start, excerpt.beatsPerBar) ? ` · 实际${durationText(bar.end - bar.start)}拍` : ''}</figcaption><svg class="case-score-svg" viewBox="0 0 ${width} ${cursor}" width="100%" role="img" aria-labelledby="${esc(titleId)}" style="display:block;height:auto;overflow:visible"><title id="${esc(titleId)}">${esc(bar.label)}，实际${durationText(bar.end - bar.start)}四分拍，${esc(variant.label || excerpt.title || '分析谱例')}。${bar.parts.map(part => esc(part.name)).join('、')}；完整音名与时值见后面的文字表。</title>${body}</svg></figure>`;
}

function transcript(excerpt, variant) {
  const rows = variant.parts.flatMap((part, partIndex) => part.events.map((event, eventIndex) => ({ part, partIndex, event, eventIndex })))
    .sort((a, b) => a.event.beat - b.event.beat || a.partIndex - b.partIndex || a.eventIndex - b.eventIndex);
  return `<details class="case-score-transcript"><summary>查看完整音名、拍位与时值文字表</summary><p>四分音符记作1拍，C4为中央C。短小节从可见起点计时，不补齐休止；表中列原始事件，跨小节连线的后段是延续，不重新起音。</p><div class="case-score-table-wrap" style="max-width:100%;overflow-x:auto"><table class="case-score-table" style="width:100%;border-collapse:collapse;table-layout:fixed"><caption>${esc(variant.label || '当前版本')} · 全部声部事件</caption><thead><tr><th scope="col">声部</th><th scope="col">起点</th><th scope="col">音名 / 打击</th><th scope="col">时值与说明</th></tr></thead><tbody>${rows.map(({ part, event }) => {
    const sound = DRUMS[event.kind] || (event.notes.length ? event.notes.map(pretty).join('、') : '休止');
    const firstBar = positionAt(event.beat, excerpt).index, lastBar = positionAt(event.beat + event.duration, excerpt, true).index;
    return `<tr><th scope="row" style="overflow-wrap:anywhere">${esc(part.name || part.id)}</th><td style="overflow-wrap:anywhere">${esc(positionText(event.beat, excerpt))}</td><td style="overflow-wrap:anywhere">${esc(sound)}</td><td style="overflow-wrap:anywhere">${durationText(event.duration)}拍${lastBar > firstBar ? `；跨至第${lastBar + 1}小节` : ''}${event.label ? '；' + esc(event.label) : ''}</td></tr>`;
  }).join('')}</tbody></table></div></details>`;
}

/** A deterministic analytical score, with no fonts, libraries or remote runtime. */
export function scoreView(excerpt, variant) {
  const bars = scoreSegments(excerpt, variant);
  const hasTextValues = bars.some(bar => bar.parts.some(part => part.segments.some(segment => !conventionalDuration(segment.segmentDuration))));
  const hasTies = bars.some(bar => bar.parts.some(part => part.segments.some(segment => segment.notes.length && (segment.continuesIn || segment.continuesOut))));
  const scoreNote=excerpt.originalModel?'原创教学谱示：音名与时值来自当前实验草稿，未转写真实作品；逐音标记变音，简化连桁和演奏记号。':'分析简化谱示：逐音标记变音，必要时写还原号；省略原版调号、连桁和部分演奏记号，非原版排印。';
  return `<div class="case-score"><p class="case-score-reading-note">${scoreNote}四分音符=1拍。${hasTextValues ? '框内数字为精确拍数，属于文本时值标记；三连等分等时值请结合文字表阅读。' : ''}${hasTies ? '跨小节持续音分段显示并以连线、续音文字提示，不表示再次起音。' : ''}</p><div class="case-score-bars" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:20px;min-width:0">${bars.map(bar => barSvg(bar, excerpt, variant)).join('')}</div>${transcript(excerpt, variant)}</div>`;
}
