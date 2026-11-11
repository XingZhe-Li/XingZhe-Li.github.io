const REFERENCE_LOG_RANGE = Math.log(48);

function requireCount(value, name, minimum) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} must be a safe integer >= ${minimum}.`);
  }
}

function midiSet(notes, name) {
  if (!Array.isArray(notes)) {
    throw new TypeError(`${name} must be an array of MIDI pitches.`);
  }
  for (const note of notes) {
    if (!Number.isInteger(note) || note < 0 || note > 127) {
      throw new RangeError(`${name} must contain integer MIDI pitches from 0 to 127.`);
    }
  }
  return new Set(notes);
}

function logChoose(total, count) {
  if (count < 0 || count > total) return -Infinity;
  const smallerCount = Math.min(count, total - count);
  let result = 0;
  for (let index = 1; index <= smallerCount; index += 1) {
    result += Math.log(total - smallerCount + index) - Math.log(index);
  }
  return result;
}

// Compute the right tail directly in log space: rare successes must stay finite.
function logSurvival(keyCount, targetCount, answerCount, correctCount) {
  const minimumHits = Math.max(0, targetCount + answerCount - keyCount);
  if (correctCount <= minimumHits) return 0;

  const denominator = logChoose(keyCount, answerCount);
  const upper = Math.min(targetCount, answerCount);
  const terms = [];
  let maximum = -Infinity;

  for (let hits = correctCount; hits <= upper; hits += 1) {
    const term = logChoose(targetCount, hits)
      + logChoose(keyCount - targetCount, answerCount - hits)
      - denominator;
    terms.push(term);
    maximum = Math.max(maximum, term);
  }

  let scaledSum = 0;
  for (const term of terms) scaledSum += Math.exp(term - maximum);
  return Math.min(0, maximum + Math.log(scaledSum));
}

function auditionDiagnostics(keyCount, targetCount, auditionCount) {
  const singleSearchBudget = Math.ceil(Math.log2(keyCount + 1));

  // Every key is a target: the answer score is zero and the inverse is undefined.
  if (targetCount === keyCount) {
    return {
      auditionFactor: 0,
      zeroBudget: keyCount,
      equivalentSearches: null,
    };
  }

  const zeroBudget = targetCount === 1
    ? singleSearchBudget
    : targetCount + (keyCount - targetCount) * -Math.expm1(
      targetCount * Math.log1p(-(singleSearchBudget - 1) / (keyCount - 1)),
    );

  // Only the amount of assistance enters this module, never correctCount.
  const effectiveCount = Math.min(keyCount, Math.max(targetCount, auditionCount));
  let equivalentSearches = 1;
  if (effectiveCount === keyCount) {
    equivalentSearches = keyCount;
  } else if (effectiveCount > targetCount) {
    const fraction = (effectiveCount - targetCount) / (keyCount - targetCount);
    equivalentSearches = 1 - (keyCount - 1) * Math.expm1(
      Math.log1p(-fraction) / targetCount,
    );
  }

  if (auditionCount <= targetCount) {
    return { auditionFactor: 1, zeroBudget, equivalentSearches };
  }

  const tolerance = 32 * Number.EPSILON * Math.max(1, zeroBudget);
  if (auditionCount >= zeroBudget - tolerance
    || equivalentSearches >= singleSearchBudget) {
    return { auditionFactor: 0, zeroBudget, equivalentSearches };
  }

  const lowerStep = Math.floor(equivalentSearches);
  const fraction = equivalentSearches - lowerStep;
  const lowerCoverage = Math.min(2 ** lowerStep - 1, keyCount) / keyCount;
  const upperCoverage = Math.min(2 ** (lowerStep + 1) - 1, keyCount) / keyCount;
  const coverage = lowerCoverage + fraction * (upperCoverage - lowerCoverage);
  const auditionFactor = Math.max(0, Math.min(1, -Math.log(coverage) / Math.log(keyCount)));

  return { auditionFactor, zeroBudget, equivalentSearches };
}

/**
 * Score one exact-pitch keyboard answer according to docs/design.md.
 * Arrays are treated as sets. The caller owns the actual keyboard range and
 * supplies its size plus a deduplicated count of single-note/combined sounds.
 * equivalentSearches is null only for the degenerate all-keys-are-targets case.
 */
export function scoreAnswer(options) {
  if (options === null || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('scoreAnswer requires an options object.');
  }
  const { keyCount, target, answer, auditionCount } = options;
  requireCount(keyCount, 'keyCount', 2);
  requireCount(auditionCount, 'auditionCount', 0);

  const targetSet = midiSet(target, 'target');
  const answerSet = midiSet(answer, 'answer');
  const targetCount = targetSet.size;
  const answerCount = answerSet.size;
  if (targetCount < 1 || targetCount > keyCount) {
    throw new RangeError('target must contain between 1 and keyCount distinct pitches.');
  }

  let correctCount = 0;
  for (const note of answerSet) {
    if (targetSet.has(note)) correctCount += 1;
  }
  const wrongCount = answerCount - correctCount;
  if (targetCount + wrongCount > keyCount) {
    throw new RangeError('target and answer exceed the available distinct keyCount.');
  }

  const logProbability = logSurvival(keyCount, targetCount, answerCount, correctCount);
  const probability = Math.exp(logProbability);
  const answerScore = Math.max(0, -100 * logProbability / REFERENCE_LOG_RANGE);
  const diagnostics = auditionDiagnostics(keyCount, targetCount, auditionCount);

  return {
    score: answerScore === 0 || diagnostics.auditionFactor === 0
      ? 0
      : answerScore * diagnostics.auditionFactor,
    answerScore,
    auditionFactor: diagnostics.auditionFactor,
    probability,
    correctCount,
    wrongCount,
    missedCount: targetCount - correctCount,
    targetCount,
    answerCount,
    auditionCount,
    zeroBudget: diagnostics.zeroBudget,
    equivalentSearches: diagnostics.equivalentSearches,
  };
}
