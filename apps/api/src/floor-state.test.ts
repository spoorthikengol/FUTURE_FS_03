import { describe, expect, it } from 'vitest';
import { buildFloorState } from './floor-state.js';

const now = new Date('2026-09-12T10:00:00.000Z');

describe('SALORA Phase G — floor state', () => {
  it('marks a stylist with no appointments as AVAILABLE and walk-in ready', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [{ id: 's1', name: 'Ananya', active: true }],
      appointments: [],
      skillsByStylist: { s1: ['Haircut'] },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].state).toBe('AVAILABLE');
    expect(rows[0].currentAppointment).toBeNull();
    expect(rows[0].nextAppointment).toBeNull();
    expect(rows[0].walkInReady).toBe(true);
    expect(rows[0].skills).toEqual(['Haircut']);
    // Free until close: 19:00 - 10:00 = 540 minutes.
    expect(rows[0].availableForMinutes).toBe(540);
  });

  it('marks a stylist mid-appointment as WITH_CUSTOMER, never walk-in ready', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [{ id: 's1', name: 'Ananya', active: true }],
      appointments: [
        {
          id: 'a1',
          stylistId: 's1',
          start: new Date('2026-09-12T09:45:00.000Z'),
          end: new Date('2026-09-12T10:30:00.000Z'),
          status: 'IN_PROGRESS',
          customerName: 'Priya',
          serviceName: 'Blowout',
        },
      ],
      skillsByStylist: {},
    });

    expect(rows[0].state).toBe('WITH_CUSTOMER');
    expect(rows[0].currentAppointment).toMatchObject({
      id: 'a1',
      customerName: 'Priya',
      serviceName: 'Blowout',
    });
    expect(rows[0].walkInReady).toBe(false);
  });

  it('reports the next appointment and the real gap before it', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [{ id: 's1', name: 'Ananya', active: true }],
      appointments: [
        {
          id: 'a1',
          stylistId: 's1',
          start: new Date('2026-09-12T11:00:00.000Z'),
          end: new Date('2026-09-12T11:45:00.000Z'),
          status: 'CONFIRMED',
        },
      ],
      skillsByStylist: {},
    });

    expect(rows[0].state).toBe('AVAILABLE');
    expect(rows[0].nextAppointment?.id).toBe('a1');
    expect(rows[0].minutesUntilNext).toBe(60);
    expect(rows[0].availableForMinutes).toBe(60);
    expect(rows[0].walkInReady).toBe(true);
  });

  it('is not walk-in ready when the gap before the next appointment is too short', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [{ id: 's1', name: 'Ananya', active: true }],
      appointments: [
        {
          id: 'a1',
          stylistId: 's1',
          start: new Date('2026-09-12T10:10:00.000Z'),
          end: new Date('2026-09-12T10:40:00.000Z'),
          status: 'BOOKED',
        },
      ],
      skillsByStylist: {},
    });

    expect(rows[0].state).toBe('AVAILABLE');
    expect(rows[0].availableForMinutes).toBe(10);
    expect(rows[0].walkInReady).toBe(false);
  });

  it('never fabricates a row for an inactive stylist', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [
        { id: 's1', name: 'Ananya', active: true },
        { id: 's2', name: 'Meera', active: false },
      ],
      appointments: [],
      skillsByStylist: {},
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].stylistId).toBe('s1');
  });

  it('ignores cancelled and completed appointments when computing state', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [{ id: 's1', name: 'Ananya', active: true }],
      appointments: [
        {
          id: 'a1',
          stylistId: 's1',
          start: new Date('2026-09-12T09:45:00.000Z'),
          end: new Date('2026-09-12T10:30:00.000Z'),
          status: 'CANCELLED',
        },
      ],
      skillsByStylist: {},
    });

    expect(rows[0].state).toBe('AVAILABLE');
    expect(rows[0].currentAppointment).toBeNull();
  });

  it('returns an empty skills array for a stylist with no stylist_skills rows', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [{ id: 's1', name: 'Ananya', active: true }],
      appointments: [],
      skillsByStylist: {},
    });

    expect(rows[0].skills).toEqual([]);
  });

  it('sorts rows by stylist name for a stable, deterministic floor order', () => {
    const rows = buildFloorState({
      now,
      timezone: 'UTC',
      openTime: '09:00:00',
      closeTime: '19:00:00',
      stylists: [
        { id: 's2', name: 'Meera', active: true },
        { id: 's1', name: 'Ananya', active: true },
      ],
      appointments: [],
      skillsByStylist: {},
    });

    expect(rows.map((row) => row.name)).toEqual(['Ananya', 'Meera']);
  });
});