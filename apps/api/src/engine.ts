export type State =
  | 'ACCEPT'
  | 'ACCEPT_WITH_WARNING'
  | 'WAIT'
  | 'RESCHEDULE';

export type A = {
  id: string;
  stylistId: string;
  start: Date;
  end: Date;
  status?: string;
};

export type Input = {
  now: Date;
  duration: number;
  price: number;
  buffer: number;
  maxDelay: number;
  maxWait: number;
  stylists: string[];
  appointments: A[];
};

export type Result = {
  state: State;
  stylistId: string;
  start: Date;
  end: Date;
  revenue: number;
  totalDelay: number;
  maxDelay: number;
  wait: number;
  affected: number;
  reason: string;
};

const TERMINAL_STATUSES = new Set([
  'CANCELLED',
  'NO_SHOW',
  'COMPLETED'
]);

function addMinutes(date: Date, minutes: number): Date {
  return new Date(
    date.getTime() + minutes * 60_000
  );
}

function minutesBetween(
  from: Date,
  to: Date
): number {
  return (
    (to.getTime() - from.getTime()) /
    60_000
  );
}

function active(appointment: A): boolean {
  return !TERMINAL_STATUSES.has(
    appointment.status ?? 'BOOKED'
  );
}

function assertValidInput(input: Input): void {
  if (!(input.now instanceof Date) ||
      Number.isNaN(input.now.getTime())) {
    throw new Error('Engine now must be a valid Date.');
  }

  if (
    !Number.isFinite(input.duration) ||
    input.duration <= 0
  ) {
    throw new Error(
      'Engine duration must be greater than zero.'
    );
  }

  if (
    !Number.isFinite(input.price) ||
    input.price < 0
  ) {
    throw new Error(
      'Engine price cannot be negative.'
    );
  }

  if (
    !Number.isFinite(input.buffer) ||
    input.buffer < 0
  ) {
    throw new Error(
      'Engine buffer cannot be negative.'
    );
  }

  if (
    !Number.isFinite(input.maxDelay) ||
    input.maxDelay < 0
  ) {
    throw new Error(
      'Engine maxDelay cannot be negative.'
    );
  }

  if (
    !Number.isFinite(input.maxWait) ||
    input.maxWait < 0
  ) {
    throw new Error(
      'Engine maxWait cannot be negative.'
    );
  }

  if (!Array.isArray(input.stylists)) {
    throw new Error(
      'Engine stylists must be an array.'
    );
  }

  for (const appointment of input.appointments) {
    if (
      !(appointment.start instanceof Date) ||
      Number.isNaN(appointment.start.getTime())
    ) {
      throw new Error(
        `Invalid start time for appointment ${appointment.id}.`
      );
    }

    if (
      !(appointment.end instanceof Date) ||
      Number.isNaN(appointment.end.getTime())
    ) {
      throw new Error(
        `Invalid end time for appointment ${appointment.id}.`
      );
    }

    if (
      appointment.end.getTime() <=
      appointment.start.getTime()
    ) {
      throw new Error(
        `Appointment ${appointment.id} has an invalid time range.`
      );
    }
  }
}

function uniqueSortedTimes(
  values: number[]
): number[] {
  return [
    ...new Set(
      values.filter(
        value => Number.isFinite(value)
      )
    )
  ].sort((a, b) => a - b);
}

/**
 * Candidate generation deliberately uses event boundaries
 * instead of brute-forcing every minute.
 *
 * Important:
 * A walk-in cannot start immediately when the previous
 * appointment has just ended if the service buffer has not
 * elapsed.
 *
 * Therefore both:
 *
 *   appointment.end
 *   appointment.end + buffer
 *
 * are considered.
 */
function generateCandidateStarts(
  input: Input,
  appointments: A[]
): number[] {
  const candidates: number[] = [
    input.now.getTime()
  ];

  for (const appointment of appointments) {
    if (!active(appointment)) {
      continue;
    }

    /*
     * Only future/relevant appointment boundaries matter.
     */
    if (
      appointment.end.getTime() >=
      input.now.getTime()
    ) {
      candidates.push(
        appointment.end.getTime()
      );

      candidates.push(
        addMinutes(
          appointment.end,
          input.buffer
        ).getTime()
      );
    }
  }

  return uniqueSortedTimes(candidates);
}

function sortAppointments(
  appointments: A[]
): A[] {
  return [...appointments]
    .filter(active)
    .sort(
      (a, b) =>
        a.start.getTime() -
          b.start.getTime() ||
        a.end.getTime() -
          b.end.getTime() ||
        a.id.localeCompare(b.id)
    );
}

/**
 * Checks whether the candidate walk-in itself can be placed
 * without overlapping an existing appointment and without
 * violating the required service buffer after the previous
 * appointment.
 */
function isDirectlyFeasible(
  start: Date,
  end: Date,
  buffer: number,
  appointments: A[]
): boolean {
  for (const appointment of appointments) {
    if (!active(appointment)) {
      continue;
    }

    /*
     * Existing appointment ends before/equal to candidate.
     * Enforce the walk-in's required buffer.
     */
    if (
      appointment.end.getTime() <=
      start.getTime()
    ) {
      const earliestSafeStart =
        addMinutes(
          appointment.end,
          buffer
        );

      if (
        earliestSafeStart.getTime() >
        start.getTime()
      ) {
        return false;
      }

      continue;
    }

    /*
     * Candidate overlaps an existing appointment.
     */
    if (
      appointment.start.getTime() <
        end.getTime() &&
      appointment.end.getTime() >
        start.getTime()
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Simulates the downstream schedule after inserting
 * the walk-in.
 *
 * This does NOT mutate the database or original appointments.
 */
function calculateCascade(
  start: Date,
  end: Date,
  appointments: A[]
): {
  totalDelay: number;
  maxDelay: number;
  affected: number;
} {
  let cursor = new Date(end);

  let totalDelay = 0;
  let maxDelay = 0;
  let affected = 0;

  /*
   * Only appointments beginning at/after the walk-in
   * can be affected.
   */
  const downstream = appointments
    .filter(
      appointment =>
        active(appointment) &&
        appointment.start.getTime() >=
          start.getTime()
    )
    .sort(
      (a, b) =>
        a.start.getTime() -
          b.start.getTime() ||
        a.id.localeCompare(b.id)
    );

  for (const appointment of downstream) {
    const appointmentStart =
      appointment.start;

    const appointmentEnd =
      appointment.end;

    /*
     * Walk-in pushes this appointment forward.
     */
    if (
      cursor.getTime() >
      appointmentStart.getTime()
    ) {
      const delay = minutesBetween(
        appointmentStart,
        cursor
      );

      totalDelay += delay;

      maxDelay = Math.max(
        maxDelay,
        delay
      );

      affected += 1;

      /*
       * Once an appointment moves, everything
       * downstream is evaluated against its new end.
       */
      cursor = addMinutes(
        appointmentEnd,
        delay
      );
    } else {
      cursor = new Date(
        appointmentEnd
      );
    }
  }

  return {
    totalDelay,
    maxDelay,
    affected
  };
}

function classify(
  wait: number,
  maxDelay: number,
  input: Input
): State {
  /*
   * Immediate and zero impact.
   */
  if (
    wait === 0 &&
    maxDelay === 0
  ) {
    return 'ACCEPT';
  }

  /*
   * No downstream delay but customer needs
   * to wait for a safe slot.
   */
  if (
    maxDelay === 0 &&
    wait <= input.maxWait
  ) {
    return 'WAIT';
  }

  /*
   * A small amount of downstream delay is
   * acceptable only when within the hard limit.
   */
  if (
    maxDelay > 0 &&
    maxDelay <= input.maxDelay
  ) {
    return 'ACCEPT_WITH_WARNING';
  }

  return 'RESCHEDULE';
}

function rank(state: State): number {
  switch (state) {
    case 'ACCEPT':
      return 0;

    case 'WAIT':
      return 1;

    case 'ACCEPT_WITH_WARNING':
      return 2;

    case 'RESCHEDULE':
      return 3;
  }
}

function buildReason(
  state: State,
  wait: number,
  maxDelay: number,
  affected: number
): string {
  switch (state) {
    case 'ACCEPT':
      return (
        'Immediate slot available with no ' +
        'scheduled customer delay.'
      );

    case 'WAIT':
      return (
        `A safe slot opens in ${Math.round(
          wait
        )} minutes with no downstream customer delay.`
      );

    case 'ACCEPT_WITH_WARNING':
      return (
        `Acceptable trade-off: up to ${Math.round(
          maxDelay
        )} minutes of downstream delay across ` +
        `${affected} scheduled appointment${
          affected === 1 ? '' : 's'
        }.`
      );

    case 'RESCHEDULE':
      return (
        'No safe placement satisfies the current ' +
        'delay and customer-wait limits.'
      );
  }
}

/**
 * SALORA Decision Engine
 *
 * Predict → Simulate → Rank → Explain
 *
 * Pure function:
 * - no database access
 * - no mutations
 * - deterministic output
 * - same input => same result
 */
export function simulate(
  input: Input
): Result[] {
  assertValidInput(input);

  /*
   * Remove duplicate stylist IDs while preserving
   * deterministic ordering.
   */
  const stylists = [
    ...new Set(
      input.stylists.filter(
        stylistId =>
          typeof stylistId === 'string' &&
          stylistId.length > 0
      )
    )
  ].sort((a, b) =>
    a.localeCompare(b)
  );

  if (!stylists.length) {
    return [];
  }

  const allAppointments =
    sortAppointments(
      input.appointments
    );

  const results: Result[] = [];

  /*
   * Candidate generation is global because
   * appointment boundaries are the meaningful
   * schedule events.
   */
  const candidateStarts =
    generateCandidateStarts(
      input,
      allAppointments
    );

  for (const stylistId of stylists) {
    const stylistAppointments =
      allAppointments.filter(
        appointment =>
          appointment.stylistId ===
          stylistId
      );

    for (
      const candidateMs
      of candidateStarts
    ) {
      const start =
        new Date(candidateMs);

      const end =
        addMinutes(
          start,
          input.duration
        );

      /*
       * Candidate must be feasible for the
       * selected stylist.
       */
      if (
        !isDirectlyFeasible(
          start,
          end,
          input.buffer,
          stylistAppointments
        )
      ) {
        continue;
      }

      /*
       * Calculate downstream schedule impact.
       */
      const cascade =
        calculateCascade(
          start,
          end,
          stylistAppointments
        );

      const wait = Math.max(
        0,
        minutesBetween(
          input.now,
          start
        )
      );

      const state =
        classify(
          wait,
          cascade.maxDelay,
          input
        );

      /*
       * A WAIT candidate must actually be
       * within the configured wait limit.
       *
       * Otherwise it should not appear as WAIT.
       */
      if (
        state === 'WAIT' &&
        wait > input.maxWait
      ) {
        continue;
      }

      /*
       * RESCHEDULE is a valid engine outcome,
       * but only include it when the placement
       * itself is structurally possible.
       *
       * This allows the UI to understand that
       * the schedule is possible but unacceptable
       * under current policy.
       */
      results.push({
        state,

        stylistId,

        start,

        end,

        revenue:
          input.price,

        totalDelay:
          cascade.totalDelay,

        maxDelay:
          cascade.maxDelay,

        wait,

        affected:
          cascade.affected,

        reason:
          buildReason(
            state,
            wait,
            cascade.maxDelay,
            cascade.affected
          )
      });
    }
  }

  /*
   * Deterministic ranking:
   *
   * 1. Decision quality
   * 2. Total downstream delay
   * 3. Maximum downstream delay
   * 4. Customer wait
   * 5. Number of affected appointments
   * 6. Stylist ID
   * 7. Start time
   *
   * This prevents unstable UI recommendations.
   */
  return results.sort(
    (a, b) =>
      rank(a.state) -
        rank(b.state) ||

      a.totalDelay -
        b.totalDelay ||

      a.maxDelay -
        b.maxDelay ||

      a.wait -
        b.wait ||

      a.affected -
        b.affected ||

      a.stylistId.localeCompare(
        b.stylistId
      ) ||

      a.start.getTime() -
        b.start.getTime()
  );
}