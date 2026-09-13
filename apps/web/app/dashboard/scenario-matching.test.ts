import { describe, expect, it } from 'vitest';
import {
  candidateKey,
  findRecommendedCandidate,
  isSameCandidate,
} from './scenario-matching.js';

type TestCandidate = {
  stylistId: string;
  start: string | Date;
  end: string | Date;
  label: string;
};

const candidate = (
  label: string,
  stylistId: string,
  start: string,
  end: string,
): TestCandidate => ({ label, stylistId, start, end });

describe('SALORA Phase E — recommendation matching', () => {
  it('identifies the recommended option when it is NOT the first array element', () => {
    const candidates = [
      candidate('alt', 'stylist-meera', '2026-09-12T11:15:00.000Z', '2026-09-12T12:00:00.000Z'),
      candidate('rec', 'stylist-ananya', '2026-09-12T10:30:00.000Z', '2026-09-12T11:15:00.000Z'),
    ];

    const recommendation = {
      stylistId: 'stylist-ananya',
      start: '2026-09-12T10:30:00.000Z',
      end: '2026-09-12T11:15:00.000Z',
    };

    const match = findRecommendedCandidate(candidates, recommendation);

    expect(match?.label).toBe('rec');
  });

  it('identifies the recommended option when it IS the first array element', () => {
    const candidates = [
      candidate('rec', 'stylist-ananya', '2026-09-12T10:30:00.000Z', '2026-09-12T11:15:00.000Z'),
      candidate('alt', 'stylist-meera', '2026-09-12T11:15:00.000Z', '2026-09-12T12:00:00.000Z'),
    ];

    const recommendation = {
      stylistId: 'stylist-ananya',
      start: '2026-09-12T10:30:00.000Z',
      end: '2026-09-12T11:15:00.000Z',
    };

    const match = findRecommendedCandidate(candidates, recommendation);

    expect(match?.label).toBe('rec');
  });

  it('never marks an alternative candidate as the recommendation', () => {
    const candidates = [
      candidate('rec', 'stylist-ananya', '2026-09-12T10:30:00.000Z', '2026-09-12T11:15:00.000Z'),
      candidate('alt', 'stylist-meera', '2026-09-12T11:15:00.000Z', '2026-09-12T12:00:00.000Z'),
    ];

    const recommendation = {
      stylistId: 'stylist-ananya',
      start: '2026-09-12T10:30:00.000Z',
      end: '2026-09-12T11:15:00.000Z',
    };

    const alt = candidates[1];

    expect(isSameCandidate(alt, recommendation)).toBe(false);
  });

  it('allows the selected candidate to differ from the recommended one (key comparison)', () => {
    const recommended = candidate(
      'rec',
      'stylist-ananya',
      '2026-09-12T10:30:00.000Z',
      '2026-09-12T11:15:00.000Z',
    );

    const selected = candidate(
      'alt',
      'stylist-meera',
      '2026-09-12T11:15:00.000Z',
      '2026-09-12T12:00:00.000Z',
    );

    // Selection is a separate concept from recommendation: the keys
    // differ, and nothing here forces them to converge.
    expect(candidateKey(recommended)).not.toBe(candidateKey(selected));
  });

  it('matches identical timestamps regardless of Date vs ISO-string representation', () => {
    const candidates = [
      candidate(
        'rec',
        'stylist-ananya',
        new Date('2026-09-12T10:30:00.000Z') as unknown as string,
        new Date('2026-09-12T11:15:00.000Z') as unknown as string,
      ),
    ];

    const recommendation = {
      stylistId: 'stylist-ananya',
      start: '2026-09-12T10:30:00.000Z',
      end: '2026-09-12T11:15:00.000Z',
    };

    const match = findRecommendedCandidate(candidates, recommendation);

    expect(match?.label).toBe('rec');
  });

  it('returns null — never an arbitrary first option — when no candidate matches', () => {
    const candidates = [
      candidate('a', 'stylist-a', '2026-09-12T10:00:00.000Z', '2026-09-12T10:30:00.000Z'),
      candidate('b', 'stylist-b', '2026-09-12T11:00:00.000Z', '2026-09-12T11:30:00.000Z'),
    ];

    const recommendation = {
      stylistId: 'stylist-c',
      start: '2026-09-12T12:00:00.000Z',
      end: '2026-09-12T12:30:00.000Z',
    };

    const match = findRecommendedCandidate(candidates, recommendation);

    expect(match).toBeNull();
  });

  it('returns null when there is no recommendation at all', () => {
    const candidates = [
      candidate('a', 'stylist-a', '2026-09-12T10:00:00.000Z', '2026-09-12T10:30:00.000Z'),
    ];

    expect(findRecommendedCandidate(candidates, null)).toBeNull();
  });
});