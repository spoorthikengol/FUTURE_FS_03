/**
 * SALORA — Phase E scenario-comparison matching helpers.
 *
 * This module contains ONLY pure identity/matching logic. It does not
 * run the Decision Engine and does not decide what is "best" — the
 * Decision Engine (apps/api/src/engine.ts) remains the sole authority
 * for that. This module's only job is: given the recommendation the
 * engine already picked, find which candidate in the array *is* that
 * recommendation, using stylistId/start/end identity rather than
 * array position.
 *
 * Kept dependency-free (no React, no Next) so it can be unit tested
 * in isolation and imported from the dashboard page.
 */

export type CandidateIdentity = {
  stylistId: string;
  start: string | Date;
  end: string | Date;
};

/**
 * Normalize a Date-or-ISO-string into a millisecond timestamp.
 * Returns NaN for anything that isn't a valid point in time —
 * callers must treat NaN as "cannot be compared", never as 0.
 */
function toTimestamp(value: string | Date): number {
  if (value instanceof Date) {
    return value.getTime();
  }

  return new Date(value).getTime();
}

/**
 * A stable, order-independent identity string for a candidate.
 * Useful as a React key or as the value backing a "currently
 * selected candidate" piece of state — NOT used for ranking.
 */
export function candidateKey(candidate: CandidateIdentity): string {
  const start = toTimestamp(candidate.start);
  const end = toTimestamp(candidate.end);

  return `${candidate.stylistId}|${Number.isNaN(start) ? "invalid" : start}|${
    Number.isNaN(end) ? "invalid" : end
  }`;
}

/**
 * True when two candidate-shaped records refer to the same
 * stylist/start/end placement, comparing timestamps rather than
 * Date object identity or raw string equality (so a Date and its
 * equivalent ISO string always match).
 */
export function isSameCandidate(
  a: CandidateIdentity | null | undefined,
  b: CandidateIdentity | null | undefined,
): boolean {
  if (!a || !b) {
    return false;
  }

  if (!a.stylistId || !b.stylistId || a.stylistId !== b.stylistId) {
    return false;
  }

  const aStart = toTimestamp(a.start);
  const aEnd = toTimestamp(a.end);
  const bStart = toTimestamp(b.start);
  const bEnd = toTimestamp(b.end);

  if (
    Number.isNaN(aStart) ||
    Number.isNaN(aEnd) ||
    Number.isNaN(bStart) ||
    Number.isNaN(bEnd)
  ) {
    return false;
  }

  return aStart === bStart && aEnd === bEnd;
}

/**
 * Find the candidate in `candidates` that IS the engine's
 * authoritative recommendation.
 *
 * - Never assumes candidates[0] is the recommendation.
 * - Returns null (not a guess) when no candidate matches, so the
 *   caller can show a safe "recommendation unavailable" state
 *   instead of silently marking an arbitrary option as recommended.
 */
export function findRecommendedCandidate<T extends CandidateIdentity>(
  candidates: readonly T[] | null | undefined,
  recommendation: CandidateIdentity | null | undefined,
): T | null {
  if (!recommendation || !candidates || candidates.length === 0) {
    return null;
  }

  for (const candidate of candidates) {
    if (isSameCandidate(candidate, recommendation)) {
      return candidate;
    }
  }

  return null;
}