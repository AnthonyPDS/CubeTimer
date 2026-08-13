import type { Solve, StatsSummary } from '../types';

/**
 * Format milliseconds into human readable WCA time string (e.g. 12.34, 1:05.12, DNF)
 */
export function formatTime(ms: number | null, penalty: 'none' | '+2' | 'dnf' = 'none'): string {
  if (ms === null) return '-';
  if (penalty === 'dnf') return 'DNF';

  const isPlusTwo = penalty === '+2';
  const totalSeconds = ms / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const hundredths = Math.floor((ms % 1000) / 10);

  const hundredthsStr = hundredths.toString().padStart(2, '0');

  let result = '';
  if (minutes > 0) {
    const secondsStr = seconds.toString().padStart(2, '0');
    result = `${minutes}:${secondsStr}.${hundredthsStr}`;
  } else {
    result = `${seconds}.${hundredthsStr}`;
  }

  return isPlusTwo ? `${result}+` : result;
}

/**
 * Calculates Mean of N (mo3 for N=3)
 * Returns null if count < N. Returns Infinity if DNF.
 */
export function calculateMoN(solves: Solve[], N: number): number | null {
  if (solves.length < N) return null;
  const sample = solves.slice(-N);

  let sum = 0;
  for (const s of sample) {
    if (s.penalty === 'dnf') return Infinity; // DNF
    sum += s.time;
  }
  return Math.round(sum / N);
}

/**
 * Calculates WCA Average of N (e.g. Ao5, Ao12, Ao100)
 * Trims trimCount highest and trimCount lowest.
 * For N=5: trimCount = 1 (removes best and worst, averages 3)
 * For N=12: trimCount = 1 (removes best and worst, averages 10)
 * For N=100: trimCount = 5 (removes 5 best and 5 worst, averages 90)
 */
export function calculateAoN(solves: Solve[], N: number): number | null {
  if (solves.length < N) return null;
  const sample = solves.slice(-N);

  const trimCount = N === 100 ? 5 : 1;

  // Count DNFs
  const dnfCount = sample.filter((s) => s.penalty === 'dnf').length;

  if (dnfCount > trimCount) {
    return Infinity; // Too many DNFs to calculate average
  }

  // Map non-DNF times to numbers, DNFs to Infinity
  const times = sample.map((s) => (s.penalty === 'dnf' ? Infinity : s.time));

  // Sort ascending (Infinity goes to the end)
  times.sort((a, b) => a - b);

  // Trim lowest trimCount (best times) and highest trimCount (worst times / DNFs)
  const trimmed = times.slice(trimCount, N - trimCount);

  const sum = trimmed.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / trimmed.length);
}

/**
 * Find best AoN/MoN across all contiguous groups of size N in solves list
 */
export function getBestAverage(
  solves: Solve[],
  N: number,
  calcFunc: (slice: Solve[], size: number) => number | null
): number | null {
  if (solves.length < N) return null;

  let minAvg: number | null = null;

  for (let i = 0; i <= solves.length - N; i++) {
    const window = solves.slice(i, i + N);
    const avg = calcFunc(window, N);
    if (avg !== null && avg !== Infinity) {
      if (minAvg === null || avg < minAvg) {
        minAvg = avg;
      }
    }
  }

  return minAvg;
}

/**
 * Calculate complete session statistics
 */
export function calculateStats(solves: Solve[]): StatsSummary {
  const count = solves.length;
  if (count === 0) {
    return {
      count: 0,
      bestSingle: null,
      worstSingle: null,
      mean: null,
      currentMo3: null,
      bestMo3: null,
      currentAo5: null,
      bestAo5: null,
      currentAo12: null,
      bestAo12: null,
      currentAo100: null,
      bestAo100: null,
    };
  }

  // Single times (excluding DNF)
  const validSolves = solves.filter((s) => s.penalty !== 'dnf');
  const validTimes = validSolves.map((s) => s.time);

  const bestSingle = validTimes.length > 0 ? Math.min(...validTimes) : null;
  const worstSingle = validTimes.length > 0 ? Math.max(...validTimes) : null;
  const mean = validTimes.length > 0 ? Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length) : null;

  const currentMo3 = calculateMoN(solves, 3);
  const bestMo3 = getBestAverage(solves, 3, calculateMoN);

  const currentAo5 = calculateAoN(solves, 5);
  const bestAo5 = getBestAverage(solves, 5, calculateAoN);

  const currentAo12 = calculateAoN(solves, 12);
  const bestAo12 = getBestAverage(solves, 12, calculateAoN);

  const currentAo100 = calculateAoN(solves, 100);
  const bestAo100 = getBestAverage(solves, 100, calculateAoN);

  return {
    count,
    bestSingle,
    worstSingle,
    mean,
    currentMo3,
    bestMo3,
    currentAo5,
    bestAo5,
    currentAo12,
    bestAo12,
    currentAo100,
    bestAo100,
  };
}
