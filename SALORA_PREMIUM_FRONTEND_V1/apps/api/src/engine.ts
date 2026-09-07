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

const add = (d: Date, m: number) =>
  new Date(d.getTime() + m * 60000);

const minutes = (a: Date, b: Date) =>
  (a.getTime() - b.getTime()) / 60000;

const active = (a: A) =>
  !['CANCELLED', 'NO_SHOW', 'COMPLETED'].includes(
    a.status || 'BOOKED'
  );

export function simulate(x: Input): Result[] {
  const out: Result[] = [];

  for (const sid of x.stylists) {
    const ap = x.appointments
      .filter(a => a.stylistId === sid && active(a))
      .sort(
        (a, b) =>
          a.start.getTime() - b.start.getTime()
      );

    /*
     * Generate event-boundary candidates.
     *
     * Important:
     * A candidate immediately after an appointment must begin
     * after the required buffer.
     */
    const starts = new Set<number>();

    starts.add(x.now.getTime());

    for (const a of ap) {
      if (a.end.getTime() >= x.now.getTime()) {
        starts.add(a.end.getTime());
        starts.add(
          add(a.end, x.buffer).getTime()
        );
      }
    }

    /*
     * Also add buffer-aware boundaries created by
     * appointment chains.
     */
    let cursor = x.now;

    for (const a of ap) {
      if (a.end <= x.now) continue;

      if (a.start >= cursor) {
        const available = add(a.end, x.buffer);

        if (available >= x.now) {
          starts.add(available.getTime());
        }

        cursor = available;
      }
    }

    for (const ms of starts) {
      const start = new Date(ms);
      const end = add(start, x.duration);

      /*
       * Do not consider starts before "now".
       */
      if (start < x.now) continue;

      let valid = true;
      let total = 0;
      let max = 0;
      let affected = 0;

      /*
       * HARD CONSTRAINT CHECK
       *
       * The walk-in cannot:
       * - overlap an appointment
       * - start before the previous appointment's buffer ends
       */
      for (const a of ap) {
        if (a.end <= start) {
          const earliest = add(a.end, x.buffer);

          if (start < earliest) {
            valid = false;
            break;
          }

          continue;
        }

        if (a.start < end && a.end > start) {
          valid = false;
          break;
        }
      }

      if (!valid) continue;

      /*
       * DOWNSTREAM CASCADE
       *
       * Starting from the walk-in's completion, propagate
       * any resulting delay through later appointments.
       */
      let cursorEnd = end;

      for (const a of ap.filter(
        a => a.start >= start
      )) {
        if (cursorEnd > a.start) {
          const delay = minutes(
            cursorEnd,
            a.start
          );

          total += delay;
          max = Math.max(max, delay);
          affected++;

          /*
           * The delayed appointment now ends later
           * by the same amount.
           */
          cursorEnd = add(a.end, delay);
        } else {
          cursorEnd = new Date(a.end);
        }

        /*
         * Preserve the appointment's buffer when
         * propagating downstream capacity.
         */
        cursorEnd = add(
          cursorEnd,
          x.buffer
        );
      }

      /*
       * Wait is measured from the walk-in arrival.
       */
      const wait = Math.max(
        0,
        minutes(start, x.now)
      );

      /*
       * Classification
       */
      let state: State;

      if (
        max === 0 &&
        wait === 0
      ) {
        state = 'ACCEPT';
      } else if (
        max === 0 &&
        wait <= x.maxWait
      ) {
        state = 'WAIT';
      } else if (
        max > 0 &&
        max <= x.maxDelay
      ) {
        state = 'ACCEPT_WITH_WARNING';
      } else {
        state = 'RESCHEDULE';
      }

      out.push({
        state,
        stylistId: sid,
        start,
        end,
        revenue: x.price,
        totalDelay: total,
        maxDelay: max,
        wait,
        affected,
        reason:
          state === 'ACCEPT'
            ? 'Immediate slot with no scheduled customer delay.'
            : state === 'WAIT'
              ? `A safe slot opens in ${Math.round(
                  wait
                )} minutes.`
              : state ===
                  'ACCEPT_WITH_WARNING'
                ? `Acceptable trade-off: up to ${Math.round(
                    max
                  )} minutes of downstream delay.`
                : 'No safe placement satisfies the current delay and wait limits.'
      });
    }
  }

  return out.sort(
    (a, b) =>
      rank(a.state) - rank(b.state) ||
      a.totalDelay - b.totalDelay ||
      a.wait - b.wait ||
      a.stylistId.localeCompare(
        b.stylistId
      ) ||
      a.start.getTime() -
        b.start.getTime()
  );
}

function rank(s: State) {
  return {
    ACCEPT: 0,
    WAIT: 1,
    ACCEPT_WITH_WARNING: 2,
    RESCHEDULE: 3
  }[s];
}