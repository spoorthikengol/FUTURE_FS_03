import { describe, expect, it } from 'vitest';
import { simulate } from './engine.js';

describe('SALORA real schedule ripple', () => {
  const now = new Date('2026-09-12T10:00:00.000Z');

  it('returns real appointment-level ripple details for affected appointments', () => {
    const results = simulate({
      now,
      duration: 45,
      price: 450,
      buffer: 10,
      maxDelay: 30,
      maxWait: 45,
      stylists: ['stylist-1'],
      appointments: [
        {
          id: 'appointment-1',
          stylistId: 'stylist-1',
          start: new Date('2026-09-12T10:50:00.000Z'),
          end: new Date('2026-09-12T11:20:00.000Z'),
          status: 'CONFIRMED',
        },
      ],
    });

    const result = results.find(
      (item) =>
        item.stylistId === 'stylist-1' &&
        item.start.getTime() === now.getTime(),
    );

    expect(result).toBeDefined();
    expect(result?.affected).toBe(1);
    expect(result?.totalDelay).toBe(5);
    expect(result?.maxDelay).toBe(5);
    expect(result?.ripple).toHaveLength(1);

    const impact = result?.ripple[0];

    expect(impact).toMatchObject({
      appointmentId: 'appointment-1',
      delay: 5,
      hardConstraintsSatisfied: true,
    });

    expect(impact?.originalStart.toISOString()).toBe(
      '2026-09-12T10:50:00.000Z',
    );
    expect(impact?.originalEnd.toISOString()).toBe(
      '2026-09-12T11:20:00.000Z',
    );
    expect(impact?.newStart.toISOString()).toBe(
      '2026-09-12T10:55:00.000Z',
    );
    expect(impact?.newEnd.toISOString()).toBe(
      '2026-09-12T11:25:00.000Z',
    );
  });

  it('returns an empty ripple when no scheduled appointment is affected', () => {
    const results = simulate({
      now,
      duration: 30,
      price: 350,
      buffer: 10,
      maxDelay: 30,
      maxWait: 45,
      stylists: ['stylist-1'],
      appointments: [
        {
          id: 'appointment-1',
          stylistId: 'stylist-1',
          start: new Date('2026-09-12T12:00:00.000Z'),
          end: new Date('2026-09-12T12:30:00.000Z'),
          status: 'CONFIRMED',
        },
      ],
    });

    const result = results.find(
      (item) =>
        item.stylistId === 'stylist-1' &&
        item.start.getTime() === now.getTime(),
    );

    expect(result).toBeDefined();
    expect(result?.affected).toBe(0);
    expect(result?.totalDelay).toBe(0);
    expect(result?.maxDelay).toBe(0);
    expect(result?.ripple).toEqual([]);
  });

  it('propagates the same real ripple through a downstream chain', () => {
    const results = simulate({
      now,
      duration: 45,
      price: 450,
      buffer: 10,
      maxDelay: 60,
      maxWait: 45,
      stylists: ['stylist-1'],
      appointments: [
        {
          id: 'appointment-1',
          stylistId: 'stylist-1',
          start: new Date('2026-09-12T10:50:00.000Z'),
          end: new Date('2026-09-12T11:20:00.000Z'),
          status: 'CONFIRMED',
        },
        {
          id: 'appointment-2',
          stylistId: 'stylist-1',
          start: new Date('2026-09-12T11:32:00.000Z'),
          end: new Date('2026-09-12T12:02:00.000Z'),
          status: 'CONFIRMED',
        },
      ],
    });

    const result = results.find(
      (item) =>
        item.stylistId === 'stylist-1' &&
        item.start.getTime() === now.getTime(),
    );

    expect(result).toBeDefined();
    expect(result?.ripple.map((item) => item.appointmentId)).toEqual([
      'appointment-1',
      'appointment-2',
    ]);
    expect(result?.ripple.map((item) => item.delay)).toEqual([5, 3]);
    expect(result?.totalDelay).toBe(8);
    expect(result?.maxDelay).toBe(5);
    expect(
      result?.ripple.every((item) => item.hardConstraintsSatisfied),
    ).toBe(true);
  });
});