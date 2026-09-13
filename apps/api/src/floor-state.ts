/**
 * SALORA — Phase G floor & capacity intelligence.
 *
 * This module contains ONLY pure computation. It does not query the
 * database and does not fabricate stylists, appointments, skills or
 * capacity numbers — every field returned here is derived directly
 * from the records the caller passes in (real rows from `stylists`,
 * `appointments`, and `stylist_skills`/`services`).
 *
 * Kept dependency-free (no Fastify, no pg) so it can be unit tested
 * in isolation, mirroring the existing engine.ts / scenario-matching.ts
 * pattern in this repo.
 */

export type FloorAppointment = {
  id: string;
  stylistId: string;
  start: Date;
  end: Date;
  status?: string;
  customerName?: string | null;
  serviceName?: string | null;
};

export type FloorStylist = {
  id: string;
  name: string;
  active: boolean;
};

export type FloorInput = {
  now: Date;
  timezone: string;
  openTime: string;
  closeTime: string;
  stylists: FloorStylist[];
  appointments: FloorAppointment[];
  /**
   * Real skill data: stylist id -> the service names that stylist's
   * `stylist_skills` rows actually qualify them for. A stylist with
   * no rows in `stylist_skills` gets an empty array here, never a
   * guessed one.
   */
  skillsByStylist: Record<string, string[]>;
};

export type FloorAppointmentSummary = {
  id: string;
  customerName: string | null;
  serviceName: string | null;
  start: Date;
  end: Date;
};

export type FloorState =
  | 'WITH_CUSTOMER'
  | 'AVAILABLE'
  | 'OFF_FLOOR';

export type FloorRow = {
  stylistId: string;
  name: string;
  state: FloorState;
  currentAppointment: FloorAppointmentSummary | null;
  nextAppointment: FloorAppointmentSummary | null;
  /** Minutes from `now` until the next appointment starts, or null if none. */
  minutesUntilNext: number | null;
  /**
   * Minutes the stylist is free for, starting once they're actually
   * free (now, or the end of their current appointment), bounded by
   * either the next appointment or salon close — whichever comes
   * first. Null only when close time cannot be determined.
   */
  availableForMinutes: number | null;
  skills: string[];
  /**
   * True when the stylist is free right now (or about to be) for
   * long enough that a walk-in is realistically placeable — not a
   * simulation result, just a floor-visibility signal.
   */
  walkInReady: boolean;
};

const ACTIVE_APPOINTMENT_STATUSES = new Set([
  'BOOKED',
  'CONFIRMED',
  'IN_PROGRESS',
]);

const WALK_IN_READY_THRESHOLD_MINUTES = 15;

function isActiveAppointment(
  appointment: FloorAppointment,
): boolean {
  return ACTIVE_APPOINTMENT_STATUSES.has(
    (appointment.status ?? 'BOOKED').toUpperCase(),
  );
}

function minutesBetween(from: Date, to: Date): number {
  return Math.round(
    (to.getTime() - from.getTime()) / 60_000,
  );
}

function toSummary(
  appointment: FloorAppointment,
): FloorAppointmentSummary {
  return {
    id: appointment.id,
    customerName: appointment.customerName ?? null,
    serviceName: appointment.serviceName ?? null,
    start: appointment.start,
    end: appointment.end,
  };
}

/** Minutes since local midnight for a "HH:MM..." clock string. */
function parseClockMinutes(value: string): number {
  const match = /^(\d{2}):(\d{2})/.exec(value);

  if (!match) {
    return Number.NaN;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since local midnight for `date`, in `timezone`. */
function localMinutesOfDay(
  date: Date,
  timezone: string,
): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const hour = Number(
    parts.find((part) => part.type === 'hour')?.value ?? '0',
  );

  const minute = Number(
    parts.find((part) => part.type === 'minute')?.value ?? '0',
  );

  // Some environments format midnight as "24:00" with hour12:false.
  return (hour % 24) * 60 + minute;
}

/**
 * Minutes remaining today until salon close, measured from `from`.
 * Returns 0 once at or past close, and null if `closeTime`/`timezone`
 * cannot be parsed (never a fabricated fallback number).
 */
function minutesUntilClose(
  from: Date,
  timezone: string,
  closeTime: string,
): number | null {
  const closeMinutes = parseClockMinutes(closeTime);

  if (Number.isNaN(closeMinutes)) {
    return null;
  }

  let nowMinutes: number;

  try {
    nowMinutes = localMinutesOfDay(from, timezone);
  } catch {
    return null;
  }

  return Math.max(0, closeMinutes - nowMinutes);
}

/**
 * Build the real-time floor state for every active stylist.
 *
 * Inactive stylists are omitted — they are not on the floor today,
 * so showing them would misrepresent current capacity.
 */
export function buildFloorState(
  input: FloorInput,
): FloorRow[] {
  const rows: FloorRow[] = [];

  for (const stylist of input.stylists) {
    if (!stylist.active) {
      continue;
    }

    const stylistAppointments = input.appointments
      .filter(
        (appointment) =>
          appointment.stylistId === stylist.id &&
          isActiveAppointment(appointment),
      )
      .sort(
        (a, b) => a.start.getTime() - b.start.getTime(),
      );

    const current =
      stylistAppointments.find(
        (appointment) =>
          appointment.start.getTime() <= input.now.getTime() &&
          appointment.end.getTime() > input.now.getTime(),
      ) ?? null;

    const next =
      stylistAppointments.find(
        (appointment) =>
          appointment.start.getTime() > input.now.getTime(),
      ) ?? null;

    const state: FloorState = current
      ? 'WITH_CUSTOMER'
      : 'AVAILABLE';

    const freeFrom = current ? current.end : input.now;

    const availableForMinutes = next
      ? Math.max(0, minutesBetween(freeFrom, next.start))
      : minutesUntilClose(
          freeFrom,
          input.timezone,
          input.closeTime,
        );

    const minutesUntilNext = next
      ? Math.max(0, minutesBetween(input.now, next.start))
      : null;

    const walkInReady =
      state === 'AVAILABLE' &&
      (availableForMinutes === null ||
        availableForMinutes >= WALK_IN_READY_THRESHOLD_MINUTES);

    rows.push({
      stylistId: stylist.id,
      name: stylist.name,
      state,
      currentAppointment: current ? toSummary(current) : null,
      nextAppointment: next ? toSummary(next) : null,
      minutesUntilNext,
      availableForMinutes,
      skills: input.skillsByStylist[stylist.id] ?? [],
      walkInReady,
    });
  }

  return rows.sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      a.stylistId.localeCompare(b.stylistId),
  );
}