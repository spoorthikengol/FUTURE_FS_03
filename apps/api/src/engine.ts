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
  'COMPLETED',
]);

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function minutesBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / 60_000;
}

function active(appointment: A): boolean {
  return !TERMINAL_STATUSES.has(
    (appointment.status ?? 'BOOKED').toUpperCase(),
  );
}

function assertValidInput(input: Input): void {
  if (!(input.now instanceof Date) || Number.isNaN(input.now.getTime())) {
    throw new Error('Engine now must be a valid Date.');
  }

  if (!Number.isFinite(input.duration) || input.duration <= 0) {
    throw new Error('Engine duration must be greater than zero.');
  }

  if (!Number.isFinite(input.price) || input.price < 0) {
    throw new Error('Engine price cannot be negative.');
  }

  if (!Number.isFinite(input.buffer) || input.buffer < 0) {
    throw new Error('Engine buffer cannot be negative.');
  }

  if (!Number.isFinite(input.maxDelay) || input.maxDelay < 0) {
    throw new Error('Engine maxDelay cannot be negative.');
  }

  if (!Number.isFinite(input.maxWait) || input.maxWait < 0) {
    throw new Error('Engine maxWait cannot be negative.');
  }

  if (!Array.isArray(input.stylists)) {
    throw new Error('Engine stylists must be an array.');
  }

  if (!Array.isArray(input.appointments)) {
    throw new Error('Engine appointments must be an array.');
  }

  for (const stylistId of input.stylists) {
    if (typeof stylistId !== 'string') {
      throw new Error('Engine stylist IDs must be strings.');
    }
  }

  for (const appointment of input.appointments) {
    if (!appointment || typeof appointment.id !== 'string') {
      throw new Error('Every appointment must have a valid ID.');
    }

    if (
      typeof appointment.stylistId !== 'string' ||
      appointment.stylistId.length === 0
    ) {
      throw new Error(
        `Appointment ${appointment.id} has an invalid stylist ID.`,
      );
    }

    if (
      !(appointment.start instanceof Date) ||
      Number.isNaN(appointment.start.getTime())
    ) {
      throw new Error(
        `Invalid start time for appointment ${appointment.id}.`,
      );
    }

    if (
      !(appointment.end instanceof Date) ||
      Number.isNaN(appointment.end.getTime())
    ) {
      throw new Error(
        `Invalid end time for appointment ${appointment.id}.`,
      );
    }

    if (appointment.end.getTime() <= appointment.start.getTime()) {
      throw new Error(
        `Appointment ${appointment.id} has an invalid time range.`,
      );
    }
  }
}

function uniqueSortedTimes(values: number[]): number[] {
  return [...new Set(values.filter(Number.isFinite))].sort(
    (a, b) => a - b,
  );
}

/**
 * Generate meaningful schedule boundaries.
 *
 * We intentionally avoid brute-forcing every minute.
 *
 * Candidate boundaries:
 * - now
 * - appointment end
 * - appointment end + required buffer
 *
 * The buffer-aware boundary is essential because a walk-in cannot
 * start immediately after a booked service when a cleanup/setup
 * buffer is required.
 */
function generateCandidateStarts(
  input: Input,
  appointments: A[],
): number[] {
  const candidates: number[] = [input.now.getTime()];

  for (const appointment of appointments) {
    if (!active(appointment)) {
      continue;
    }

    if (appointment.end.getTime() < input.now.getTime()) {
      continue;
    }

    candidates.push(appointment.end.getTime());

    candidates.push(
      addMinutes(
        appointment.end,
        input.buffer,
      ).getTime(),
    );
  }

  return uniqueSortedTimes(candidates);
}

function sortAppointments(appointments: A[]): A[] {
  return [...appointments]
    .filter(active)
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        a.end.getTime() - b.end.getTime() ||
        a.id.localeCompare(b.id),
    );
}

/**
 * Check whether the walk-in itself can be placed safely.
 *
 * Hard constraints:
 * - no overlap
 * - required buffer after the previous appointment
 */
function isDirectlyFeasible(
  start: Date,
  end: Date,
  buffer: number,
  appointments: A[],
): boolean {
  for (const appointment of appointments) {
    if (!active(appointment)) {
      continue;
    }

    const appointmentStart = appointment.start.getTime();
    const appointmentEnd = appointment.end.getTime();
    const candidateStart = start.getTime();
    const candidateEnd = end.getTime();

    /*
     * Previous appointment.
     *
     * The candidate can only start after:
     *
     * appointment end + buffer
     */
    if (appointmentEnd <= candidateStart) {
      const earliestSafeStart = addMinutes(
        appointment.end,
        buffer,
      ).getTime();

      if (candidateStart < earliestSafeStart) {
        return false;
      }

      continue;
    }

    /*
     * Candidate overlaps an existing appointment.
     */
    if (
      appointmentStart < candidateEnd &&
      appointmentEnd > candidateStart
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Simulate the downstream schedule after inserting the walk-in.
 *
 * This function is pure:
 * - no database access
 * - no mutations
 * - original appointments remain untouched
 */
function calculateCascade(
  start: Date,
  end: Date,
  appointments: A[],
): {
  totalDelay: number;
  maxDelay: number;
  affected: number;
} {
  let cursor = new Date(end);

  let totalDelay = 0;
  let maxDelay = 0;
  let affected = 0;

  const downstream = appointments
    .filter(
      appointment =>
        active(appointment) &&
        appointment.start.getTime() >= start.getTime(),
    )
    .sort(
      (a, b) =>
        a.start.getTime() - b.start.getTime() ||
        a.end.getTime() - b.end.getTime() ||
        a.id.localeCompare(b.id),
    );

  for (const appointment of downstream) {
    const originalStart = appointment.start;
    const originalEnd = appointment.end;

    /*
     * No conflict with the current cursor.
     */
    if (cursor.getTime() <= originalStart.getTime()) {
      cursor = new Date(originalEnd);
      continue;
    }

    /*
     * This appointment is pushed forward.
     */
    const delay = minutesBetween(
      originalStart,
      cursor,
    );

    totalDelay += delay;
    maxDelay = Math.max(maxDelay, delay);
    affected += 1;

    /*
     * Preserve the original appointment duration while
     * moving its end forward by the same delay.
     */
    cursor = addMinutes(
      originalEnd,
      delay,
    );
  }

  return {
    totalDelay,
    maxDelay,
    affected,
  };
}

function classify(
  wait: number,
  maxDelay: number,
  input: Input,
): State {
  /*
   * Best possible outcome:
   * immediate service with zero downstream impact.
   */
  if (wait === 0 && maxDelay === 0) {
    return 'ACCEPT';
  }

  /*
   * Safe outcome:
   * customer waits, but no booked customer is delayed.
   */
  if (
    wait > 0 &&
    wait <= input.maxWait &&
    maxDelay === 0
  ) {
    return 'WAIT';
  }

  /*
   * Controlled impact:
   * the walk-in can be accepted while staying
   * within the configured downstream-delay policy.
   */
  if (
    maxDelay > 0 &&
    maxDelay <= input.maxDelay
  ) {
    return 'ACCEPT_WITH_WARNING';
  }

  /*
   * Structurally possible but operationally unacceptable.
   */
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
  affected: number,
): string {
  switch (state) {
    case 'ACCEPT':
      return (
        'Immediate slot available with no scheduled customer delay.'
      );

    case 'WAIT':
      return (
        `A safe slot opens in ${Math.round(wait)} minutes ` +
        'with no downstream customer delay.'
      );

    case 'ACCEPT_WITH_WARNING':
      return (
        `Acceptable trade-off: up to ${Math.round(maxDelay)} ` +
        `minutes of downstream delay across ${affected} ` +
        `scheduled appointment${affected === 1 ? '' : 's'}.`
      );

    case 'RESCHEDULE':
      return (
        'No safe placement satisfies the current delay ' +
        'and customer-wait limits.'
      );
  }
}

/**
 * SALORA Decision Engine
 *
 * Predict → Simulate → Rank → Explain
 *
 * Guarantees:
 * - pure computation
 * - deterministic results
 * - no database access
 * - no mutation of input
 * - explicit hard feasibility checks
 * - buffer-aware candidate generation
 * - downstream cascade simulation
 * - deterministic ranking
 */
export function simulate(input: Input): Result[] {
  assertValidInput(input);

  /*
   * Normalize stylist IDs:
   * - remove empty IDs
   * - remove duplicates
   * - deterministic ordering
   */
  const stylists = [
    ...new Set(
      input.stylists.filter(
        stylistId =>
          typeof stylistId === 'string' &&
          stylistId.trim().length > 0,
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));

  if (stylists.length === 0) {
    return [];
  }

  const allAppointments = sortAppointments(
    input.appointments,
  );

  const candidateStarts = generateCandidateStarts(
    input,
    allAppointments,
  );

  const results: Result[] = [];

  for (const stylistId of stylists) {
    const stylistAppointments = allAppointments.filter(
      appointment =>
        appointment.stylistId === stylistId,
    );

    for (const candidateMs of candidateStarts) {
      const start = new Date(candidateMs);

      const end = addMinutes(
        start,
        input.duration,
      );

      /*
       * Hard feasibility check.
       */
      if (
        !isDirectlyFeasible(
          start,
          end,
          input.buffer,
          stylistAppointments,
        )
      ) {
        continue;
      }

      /*
       * Simulate downstream consequences.
       */
      const cascade = calculateCascade(
        start,
        end,
        stylistAppointments,
      );

      const wait = Math.max(
        0,
        minutesBetween(
          input.now,
          start,
        ),
      );

      const state = classify(
        wait,
        cascade.maxDelay,
        input,
      );

      /*
       * A WAIT recommendation must obey the configured
       * maximum customer wait.
       */
      if (
        state === 'WAIT' &&
        wait > input.maxWait
      ) {
        continue;
      }

      results.push({
        state,

        stylistId,

        start,

        end,

        revenue: input.price,

        totalDelay: cascade.totalDelay,

        maxDelay: cascade.maxDelay,

        wait,

        affected: cascade.affected,

        reason: buildReason(
          state,
          wait,
          cascade.maxDelay,
          cascade.affected,
        ),
      });
    }
  }

  /*
   * Deterministic recommendation ranking.
   *
   * Priority:
   * 1. Best decision state
   * 2. Lowest total delay
   * 3. Lowest maximum delay
   * 4. Lowest customer wait
   * 5. Fewest affected appointments
   * 6. Stable stylist ID
   * 7. Stable start time
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
        b.stylistId,
      ) ||

      a.start.getTime() -
        b.start.getTime(),
  );
}