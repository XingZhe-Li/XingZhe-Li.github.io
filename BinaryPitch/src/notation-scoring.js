const REFERENCE_LOG_RANGE = Math.log(48);
const WEIGHT_TOLERANCE = 1e-8;

function sum(values) {
  let total = 0;
  let correction = 0;
  for (const value of values) {
    const adjusted = value - correction;
    const next = total + adjusted;
    correction = (next - total) - adjusted;
    total = next;
  }
  return total;
}

function activeAnswer(value, fields, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be a notation answer object.`);
  }
  if (!Number.isInteger(value.root) || value.root < 0 || value.root > 11
    || typeof value.quality !== 'string' || !value.quality) {
    throw new RangeError(`${name} requires a root pitch class and chord quality.`);
  }
  if (fields.includes('bass') && (!Number.isInteger(value.bass)
    || value.bass < 0 || value.bass > 127)) {
    throw new RangeError(`${name} requires an exact MIDI bass pitch.`);
  }
  return Object.fromEntries(fields.map(field => [field, value[field]]));
}

function keyOf(value, fields) {
  return JSON.stringify(fields.map(field => value[field]));
}

function identityOf(candidate, answer) {
  const identity = candidate.identityKey
    ?? (typeof candidate.equivalenceKey === 'string'
      ? candidate.equivalenceKey.split('|bass:')[0]
      : `label:${keyOf(answer, ['root', 'quality'])}`);
  if (typeof identity !== 'string' || !identity) {
    throw new RangeError('Candidates require a nonempty sound identity.');
  }
  return identity;
}

function compareAliases(left, right) {
  return left.root - right.root
    || (left.quality < right.quality ? -1 : left.quality > right.quality ? 1 : 0);
}

function readSpace(space) {
  if (!space || typeof space !== 'object' || typeof space.assessBass !== 'boolean'
    || !Array.isArray(space.candidates) || !space.candidates.length) {
    throw new TypeError('space must contain a nonempty notation candidate distribution.');
  }
  const rawCount = space.candidates.length;
  if (!Number.isSafeInteger(space.candidateCount) || space.candidateCount !== rawCount
    || (space.rawCandidateCount !== undefined && space.rawCandidateCount !== rawCount)) {
    throw new RangeError('candidateCount must equal the number of legal candidates.');
  }
  const fields = space.assessBass ? ['root', 'quality', 'bass'] : ['root', 'quality'];
  const byLabel = new Map();
  const groups = new Map();
  const identities = new Map();
  const labelIdentities = new Map();
  const candidates = space.candidates.map(candidate => {
    const answer = activeAnswer(candidate, fields, 'candidate');
    const key = keyOf(answer, fields);
    if (byLabel.has(key)) throw new RangeError('Notation candidates must be distinct.');
    if (!Number.isFinite(candidate.weight) || candidate.weight <= 0) {
      throw new RangeError('Candidate weights must be positive finite probabilities.');
    }
    const identityKey = identityOf(candidate, answer);
    const labelKey = keyOf(answer, ['root', 'quality']);
    if (labelIdentities.has(labelKey) && labelIdentities.get(labelKey) !== identityKey) {
      throw new RangeError('A notation label cannot have conflicting sound identities.');
    }
    labelIdentities.set(labelKey, identityKey);
    if (!identities.has(identityKey)) identities.set(identityKey, new Map());
    identities.get(identityKey).set(labelKey, { root: answer.root, quality: answer.quality });
    const soundKey = JSON.stringify([identityKey, space.assessBass ? answer.bass : null]);
    if (!groups.has(soundKey)) {
      groups.set(soundKey, { identityKey, bass: answer.bass, weights: [] });
    }
    const group = groups.get(soundKey);
    group.weights.push(candidate.weight);
    byLabel.set(key, group);
    return { weight: candidate.weight };
  });
  const total = sum(candidates.map(candidate => candidate.weight));
  if (Math.abs(total - 1) > WEIGHT_TOLERANCE) {
    throw new RangeError('Candidate probabilities must sum to one.');
  }
  for (const [identityKey, aliases] of identities) {
    identities.set(identityKey, [...aliases.values()].sort(compareAliases));
  }
  const sounds = [...groups.values()].map(group => ({
    ...group,
    aliases: identities.get(group.identityKey),
    weight: sum(group.weights) / total,
  }));
  const soundsByOldGroup = new Map([...groups.values()].map((group, index) => [group, sounds[index]]));
  for (const [label, group] of byLabel) byLabel.set(label, soundsByOldGroup.get(group));
  if (space.effectiveCandidateCount !== undefined && space.effectiveCandidateCount !== sounds.length) {
    throw new RangeError('effectiveCandidateCount does not match distinct sounds.');
  }
  return { sounds, fields, byLabel, count: sounds.length, rawCount };
}

function matchMask(answer, target, fields) {
  let mask = 0;
  for (let index = 0; index < fields.length; index++) {
    if (answer[fields[index]] === target[fields[index]]) mask |= 1 << index;
  }
  return mask;
}

function equallyOrMoreRare(probability, threshold) {
  const tolerance = 64 * Number.EPSILON
    * Math.max(Math.abs(probability), Math.abs(threshold), Number.MIN_VALUE);
  return probability <= threshold || Math.abs(probability - threshold) <= tolerance;
}

function sameProbability(left, right) {
  return equallyOrMoreRare(left, right) && equallyOrMoreRare(right, left);
}

function possibleMasks(aliases, targetAliases, bassMatches, fields) {
  let flags = 0;
  for (const answer of aliases) {
    for (const target of targetAliases) {
      let mask = matchMask(answer, target, ['root', 'quality']);
      if (fields.length === 3 && bassMatches) mask |= 4;
      flags |= 1 << mask;
    }
  }
  return flags;
}

function supportsMask(flags, requiredMask, maskCount) {
  for (let mask = 0; mask < maskCount; mask++) {
    if ((flags & (1 << mask)) && (mask & requiredMask) === requiredMask) return true;
  }
  return false;
}

function feedbackPair(sound, targetSound, submitted, fields, containingMass) {
  let best;
  for (const answer of sound.aliases) {
    for (const target of targetSound.aliases) {
      const acceptedAnswer = { ...answer, ...(fields.length === 3 ? { bass: sound.bass } : {}) };
      const reference = { ...target, ...(fields.length === 3 ? { bass: targetSound.bass } : {}) };
      const mask = matchMask(acceptedAnswer, reference, fields);
      const probability = containingMass[mask];
      const original = answer.root === submitted.root && answer.quality === submitted.quality;
      const correctCount = fields.reduce((count, _, index) => count + Boolean(mask & (1 << index)), 0);
      const tied = best && sameProbability(probability, best.probability);
      if (!best || (!tied && probability < best.probability)
        || (tied && (Number(original) > Number(best.original)
          || (original === best.original && correctCount > best.correctCount)))) {
        best = { mask, probability, original, correctCount, acceptedAnswer, reference };
      }
    }
  }
  return best;
}

function auditionFactor(candidateCount, auditionCount) {
  const zeroBudget = Math.ceil(Math.log2(candidateCount + 1));
  if (candidateCount === 1) return { factor: 0, zeroBudget };
  if (auditionCount <= 1) return { factor: 1, zeroBudget };
  if (auditionCount >= zeroBudget) return { factor: 0, zeroBudget };
  const coverage = Math.min(2 ** auditionCount - 1, candidateCount) / candidateCount;
  return {
    factor: Math.max(0, Math.min(1, -Math.log(coverage) / Math.log(candidateCount))),
    zeroBudget,
  };
}

/**
 * Score active notation facts against a fixed legal-answer distribution.
 * Equivalent pitch-class identities share probability mass. A single pair of
 * enabled aliases must witness every matched fact; facts cannot be mixed across names.
 * No target voicing, inversion label, or random generator is consulted.
 * auditionCount is an externally deduplicated sound-token count, not wheel moves.
 */
export function scoreNotationAnswer(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('scoreNotationAnswer requires an options object.');
  }
  const { space, target, answer, auditionCount } = options;
  if (!Number.isSafeInteger(auditionCount) || auditionCount < 0) {
    throw new RangeError('auditionCount must be a nonnegative safe integer.');
  }
  const model = readSpace(space);
  const targetFacts = activeAnswer(target, model.fields, 'target');
  const answerFacts = activeAnswer(answer, model.fields, 'answer');
  const targetSound = model.byLabel.get(keyOf(targetFacts, model.fields));
  const answerSound = model.byLabel.get(keyOf(answerFacts, model.fields));
  if (!targetSound) {
    throw new RangeError('target is not a legal candidate in this notation space.');
  }
  if (!answerSound) {
    throw new RangeError('answer is not a legal candidate in this notation space.');
  }

  const maskCount = 1 << model.fields.length;
  const identities = new Map();
  const patterns = new Map();
  for (const sound of model.sounds) {
    const bassMatches = model.fields.length === 3 && sound.bass === targetSound.bass;
    const patternKey = JSON.stringify([sound.identityKey, bassMatches]);
    let flags = identities.get(patternKey);
    if (flags === undefined) {
      flags = possibleMasks(sound.aliases, targetSound.aliases, bassMatches, model.fields);
      identities.set(patternKey, flags);
    }
    if (!patterns.has(flags)) patterns.set(flags, { flags, weights: [] });
    const pattern = patterns.get(flags);
    pattern.weights.push(sound.weight);
    sound.pattern = pattern;
  }
  for (const pattern of patterns.values()) pattern.mass = sum(pattern.weights);
  const containingMass = Array.from({ length: maskCount }, (_, requiredMask) => {
    const matches = [];
    let includesAll = true;
    for (const pattern of patterns.values()) {
      if (supportsMask(pattern.flags, requiredMask, maskCount)) matches.push(pattern.mass);
      else includesAll = false;
    }
    return includesAll ? 1 : Math.min(1, sum(matches));
  });
  for (const pattern of patterns.values()) {
    pattern.rarity = Infinity;
    for (let mask = 0; mask < maskCount; mask++) {
      if (pattern.flags & (1 << mask)) pattern.rarity = Math.min(pattern.rarity, containingMass[mask]);
    }
  }
  const informationProbability = answerSound.pattern.rarity;
  const tailMass = [];
  let includesAll = true;
  for (const pattern of patterns.values()) {
    if (equallyOrMoreRare(pattern.rarity, informationProbability)) {
      tailMass.push(pattern.mass);
    } else includesAll = false;
  }
  const probability = includesAll ? 1 : Math.min(1, sum(tailMass));
  const informationBits = Math.max(0, -Math.log2(informationProbability));
  const answerScore = Math.max(0, -100 * Math.log(probability) / REFERENCE_LOG_RANGE);
  const assistance = auditionFactor(model.count, auditionCount);
  const feedback = feedbackPair(answerSound, targetSound, answerFacts, model.fields, containingMass);
  const matches = Object.fromEntries(model.fields.map((field, index) =>
    [field, Boolean(feedback.mask & (1 << index))]));
  const isEquivalentChord = answerSound.identityKey === targetSound.identityKey;

  return {
    score: answerScore === 0 || assistance.factor === 0 ? 0 : answerScore * assistance.factor,
    answerScore,
    auditionFactor: assistance.factor,
    probability,
    informationProbability,
    informationBits,
    candidateCount: model.count,
    rawCandidateCount: model.rawCount,
    zeroBudget: assistance.zeroBudget,
    auditionCount,
    matches,
    correctCount: Object.values(matches).filter(Boolean).length,
    fieldCount: model.fields.length,
    reference: feedback.reference,
    acceptedAnswer: feedback.acceptedAnswer,
    matchedAnswer: feedback.acceptedAnswer,
    equivalents: targetSound.aliases.map(alias => ({ ...alias })),
    isEquivalentChord,
    equivalentAnswer: isEquivalentChord
      && (model.fields.length === 2 || answerSound.bass === targetSound.bass),
  };
}
