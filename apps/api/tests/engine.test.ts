import {
  describe,
  it,
  expect
} from 'vitest';

import {
  simulate
} from '../src/engine.js';

const base = {
  now: new Date(
    '2026-09-04T09:00:00Z'
  ),

  duration: 45,

  price: 450,

  buffer: 10,

  maxDelay: 30,

  maxWait: 45,

  stylists: ['s1']
};

describe(
  'SALORA Decision Engine',
  () => {
    it(
      'accepts an immediate free slot',
      () => {
        const result =
          simulate({
            ...base,
            appointments: []
          });

        expect(
          result.length
        ).toBeGreaterThan(0);

        expect(
          result[0].state
        ).toBe('ACCEPT');

        expect(
          result[0].wait
        ).toBe(0);

        expect(
          result[0].maxDelay
        ).toBe(0);

        expect(
          result[0].affected
        ).toBe(0);
      }
    );

    it(
      'is deterministic',
      () => {
        const first =
          simulate({
            ...base,
            appointments: []
          })[0];

        const second =
          simulate({
            ...base,
            appointments: []
          })[0];

        expect(
          first.stylistId
        ).toBe(
          second.stylistId
        );

        expect(
          first.start
        ).toEqual(
          second.start
        );

        expect(
          first.end
        ).toEqual(
          second.end
        );

        expect(
          first.state
        ).toBe(
          second.state
        );

        expect(
          first.reason
        ).toBe(
          second.reason
        );
      }
    );

    it(
      'supports WAIT after respecting service buffer',
      () => {
        const result =
          simulate({
            ...base,

            maxWait: 60,

            appointments: [
              {
                id: 'a',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T09:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T09:45:00Z'
                  )
              }
            ]
          });

        const wait =
          result.find(
            candidate =>
              candidate.state ===
              'WAIT'
          );

        expect(
          wait
        ).toBeDefined();

        expect(
          wait!.start
        ).toEqual(
          new Date(
            '2026-09-04T09:55:00Z'
          )
        );

        expect(
          wait!.wait
        ).toBe(55);

        expect(
          wait!.maxDelay
        ).toBe(0);

        expect(
          wait!.affected
        ).toBe(0);
      }
    );

    it(
      'protects the required service buffer',
      () => {
        const result =
          simulate({
            ...base,

            appointments: [
              {
                id: 'a',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T08:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T09:00:00Z'
                  )
              }
            ]
          });

        expect(
          result.some(
            candidate =>
              candidate.start.getTime() ===
              new Date(
                '2026-09-04T09:00:00Z'
              ).getTime()
          )
        ).toBe(false);
      }
    );

    it(
      'allows a buffer-safe placement',
      () => {
        const result =
          simulate({
            ...base,

            appointments: [
              {
                id: 'a',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T08:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T09:00:00Z'
                  )
              }
            ]
          });

        expect(
          result.some(
            candidate =>
              candidate.start.getTime() ===
              new Date(
                '2026-09-04T09:10:00Z'
              ).getTime()
          )
        ).toBe(true);
      }
    );

    it(
      'detects downstream delay',
      () => {
        const result =
          simulate({
            ...base,

            maxDelay: 30,

            appointments: [
              {
                id: 'a',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T10:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T10:30:00Z'
                  )
              }
            ]
          });

        const candidate =
          result.find(
            item =>
              item.start.getTime() ===
              new Date(
                '2026-09-04T09:00:00Z'
              ).getTime()
          );

        expect(
          candidate
        ).toBeDefined();

        expect(
          candidate!.state
        ).toBe(
          'ACCEPT'
        );

        expect(
          candidate!.affected
        ).toBe(0);
      }
    );

    it(
      'returns RESCHEDULE when wait exceeds policy',
      () => {
        const result =
          simulate({
            ...base,

            maxWait: 30,

            appointments: [
              {
                id: 'a',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T09:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T09:45:00Z'
                  )
              }
            ]
          });

        expect(
          result.some(
            candidate =>
              candidate.state ===
              'RESCHEDULE'
          )
        ).toBe(true);

        expect(
          result.some(
            candidate =>
              candidate.state ===
              'WAIT'
          )
        ).toBe(false);
      }
    );

    it(
      'selects a free stylist when another stylist is occupied',
      () => {
        const result =
          simulate({
            ...base,

            stylists: [
              's1',
              's2'
            ],

            appointments: [
              {
                id: 'a',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T09:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T09:45:00Z'
                  )
              }
            ]
          });

        expect(
          result[0].stylistId
        ).toBe('s2');

        expect(
          result[0].state
        ).toBe('ACCEPT');
      }
    );

    it(
      'ignores completed appointments',
      () => {
        const result =
          simulate({
            ...base,

            appointments: [
              {
                id: 'completed',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T09:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T09:45:00Z'
                  ),

                status:
                  'COMPLETED'
              }
            ]
          });

        expect(
          result[0].state
        ).toBe(
          'ACCEPT'
        );
      }
    );

    it(
      'ignores cancelled appointments',
      () => {
        const result =
          simulate({
            ...base,

            appointments: [
              {
                id: 'cancelled',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T09:00:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T09:45:00Z'
                  ),

                status:
                  'CANCELLED'
              }
            ]
          });

        expect(
          result[0].state
        ).toBe(
          'ACCEPT'
        );
      }
    );

    it(
      'rejects invalid duration',
      () => {
        expect(
          () =>
            simulate({
              ...base,

              duration: 0,

              appointments: []
            })
        ).toThrow();
      }
    );

    it(
      'never creates an overlapping candidate',
      () => {
        const result =
          simulate({
            ...base,

            appointments: [
              {
                id: 'a',

                stylistId: 's1',

                start:
                  new Date(
                    '2026-09-04T09:30:00Z'
                  ),

                end:
                  new Date(
                    '2026-09-04T10:00:00Z'
                  )
              }
            ]
          });

        for (
          const candidate
          of result
        ) {
          const overlaps =
            candidate.start <
              new Date(
                '2026-09-04T10:00:00Z'
              ) &&
            candidate.end >
              new Date(
                '2026-09-04T09:30:00Z'
              );

          expect(
            overlaps
          ).toBe(false);
        }
      }
    );
  }
);