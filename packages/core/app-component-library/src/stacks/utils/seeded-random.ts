/**
 * Deterministic pseudo-random number generator using a sine-based hash.
 * Returns a value in [0, 1) for a given seed.
 * Ensures stack layouts are stable across re-renders.
 */
export function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}
