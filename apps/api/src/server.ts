import './env.js';

import crypto from 'node:crypto';

import Fastify, {
  type FastifyReply,
  type FastifyRequest,
} from 'fastify';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rate from '@fastify/rate-limit';

import { z } from 'zod';

import { pool } from './db.js';

import {
  login,
  logout,
  user,
  setSessionCookie,
  type AuthenticatedUser,
} from './auth.js';

import {
  simulate,
  type Result as EngineResult,
} from './engine.js';

import {
  buildFloorState,
  type FloorAppointment,
  type FloorStylist,
} from './floor-state.js';

/* -------------------------------------------------------------------------- */
/* Application                                                                */
/* -------------------------------------------------------------------------- */

const APP_VERSION = '2.0.0';
const ENGINE_VERSION = '1.3';

const DEFAULT_MAX_DELAY = 30;
const DEFAULT_MAX_WAIT = 45;

const DEFAULT_API_PORT = 4000;
const MAX_BODY_SIZE = 64 * 1024;

const appOrigin =
  process.env.APP_ORIGIN?.trim() ||
  'http://localhost:3000';

const apiPort = Number(
  process.env.API_PORT ||
    DEFAULT_API_PORT,
);

if (
  !Number.isInteger(apiPort) ||
  apiPort < 1 ||
  apiPort > 65535
) {
  throw new Error(
    'API_PORT must be a valid TCP port.',
  );
}

const app = Fastify({
  logger: true,

  bodyLimit: MAX_BODY_SIZE,

  requestIdHeader: 'x-request-id',

  disableRequestLogging: false,
});

await app.register(cookie);

await app.register(cors, {
  origin: appOrigin,
  credentials: true,
});

await app.register(helmet, {
  /*
   * The frontend currently needs Next.js development behavior.
   * CSP can be introduced separately once the deployed asset
   * policy is finalized.
   */
  contentSecurityPolicy: false,
});

await app.register(rate, {
  max: 120,
  timeWindow: '1 minute',
});

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const SESSION_COOKIE = 'salora_session';

const ACTIVE_APPOINTMENT_STATUSES = [
  'BOOKED',
  'CONFIRMED',
  'IN_PROGRESS',
] as const;

const TERMINAL_APPOINTMENT_STATUSES = [
  'CANCELLED',
  'NO_SHOW',
  'COMPLETED',
] as const;

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

const uuid = z.string().uuid();

const decisionState = z.enum([
  'ACCEPT',
  'ACCEPT_WITH_WARNING',
  'WAIT',
  'RESCHEDULE',
]);

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(160),

  password: z
    .string()
    .min(8)
    .max(200),
});

const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(100),

  phone: z
    .string()
    .trim()
    .max(20)
    .optional(),
});

const simulationSchema = z.object({
  serviceId: uuid,

  now: z
    .string()
    .datetime()
    .optional(),

  customerName: z
    .string()
    .trim()
    .max(100)
    .optional(),

  customerPhone: z
    .string()
    .trim()
    .max(20)
    .optional(),
});

const acceptanceSchema = z.object({
  serviceId: uuid,

  stylistId: uuid,

  startAt: z
    .string()
    .datetime(),

  customerId:
    uuid.optional(),

  customerName: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .optional(),

  customerPhone: z
    .string()
    .trim()
    .max(20)
    .optional(),

  decisionState:
    decisionState.optional(),

  simulationId:
    uuid.optional(),
});

const appointmentQuerySchema =
  z.object({
    from: z
      .string()
      .datetime()
      .optional(),

    to: z
      .string()
      .datetime()
      .optional(),
  });

const customerQuerySchema =
  z.object({
    search: z
      .string()
      .trim()
      .max(80)
      .optional(),
  });

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type AuthenticatedRequest =
  FastifyRequest & {
    user?: AuthenticatedUser;
  };

type Queryable = {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<any>;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getAuthenticatedUser(
  req: FastifyRequest,
): AuthenticatedUser | null {
  return (
    (req as AuthenticatedRequest)
      .user ?? null
  );
}

function fail(
  reply: FastifyReply,
  statusCode: number,
  error: string,
) {
  return reply
    .code(statusCode)
    .send({
      error,
    });
}

function currentTime(): Date {
  return new Date();
}

function currentTimeIso(): string {
  return currentTime().toISOString();
}

function addMinutes(
  date: Date,
  minutes: number,
): Date {
  return new Date(
    date.getTime() +
      minutes * 60_000,
  );
}

function minutesBetween(
  from: Date,
  to: Date,
): number {
  return Math.max(
    0,
    Math.round(
      (
        to.getTime() -
        from.getTime()
      ) / 60_000,
    ),
  );
}

function normalizeEmail(
  email: string,
): string {
  return email
    .trim()
    .toLowerCase();
}

function normalizeIdempotencyKey(
  key: string,
): string {
  return key.trim();
}

function hashIdempotencyKey(
  value: string,
): string {
  return crypto
    .createHash('sha256')
    .update(value, 'utf8')
    .digest('hex');
}

function safeJson(
  value: unknown,
): string {
  return JSON.stringify(value);
}

/* -------------------------------------------------------------------------- */
/* Timezone                                                                   */
/* -------------------------------------------------------------------------- */

function getLocalTimeParts(
  date: Date,
  timezone: string,
): {
  hour: number;
  minute: number;
} {
  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      },
    );

  const parts =
    formatter.formatToParts(date);

  return {
    hour: Number(
      parts.find(
        part =>
          part.type === 'hour',
      )?.value ?? 0,
    ),

    minute: Number(
      parts.find(
        part =>
          part.type === 'minute',
      )?.value ?? 0,
    ),
  };
}

function localMinutes(
  date: Date,
  timezone: string,
): number {
  const parts =
    getLocalTimeParts(
      date,
      timezone,
    );

  return (
    parts.hour * 60 +
    parts.minute
  );
}

function parseTime(
  value: string,
): {
  hour: number;
  minute: number;
} {
  const match =
    /^(\d{2}):(\d{2})/.exec(
      value,
    );

  if (!match) {
    throw new Error(
      `Invalid database time value: ${value}`,
    );
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      `Invalid database time value: ${value}`,
    );
  }

  return {
    hour,
    minute,
  };
}

function isWithinSalonHours(
  start: Date,
  end: Date,
  timezone: string,
  openTime: string,
  closeTime: string,
): boolean {
  const open =
    parseTime(openTime);

  const close =
    parseTime(closeTime);

  const openMinutes =
    open.hour * 60 +
    open.minute;

  const closeMinutes =
    close.hour * 60 +
    close.minute;

  const startMinutes =
    localMinutes(
      start,
      timezone,
    );

  const endMinutes =
    localMinutes(
      end,
      timezone,
    );

  /*
   * Phase 1 supports same-day operating windows.
   */
  if (
    closeMinutes <=
    openMinutes
  ) {
    return false;
  }

  return (
    startMinutes >=
      openMinutes &&
    endMinutes <=
      closeMinutes &&
    start.toDateString() ===
      end.toDateString()
  );
}

/* -------------------------------------------------------------------------- */
/* Schedule intelligence                                                      */
/* -------------------------------------------------------------------------- */

function getSchedulePressure(
  appointmentCount: number,
  activeStylists: number,
  openTime: string,
  closeTime: string,
) {
  if (
    activeStylists <= 0
  ) {
    return {
      level:
        'CRITICAL' as const,

      score: 100,

      label:
        'No active stylists',
    };
  }

  const open =
    parseTime(openTime);

  const close =
    parseTime(closeTime);

  const operatingMinutes =
    Math.max(
      1,
      (
        close.hour * 60 +
        close.minute
      ) -
      (
        open.hour * 60 +
        open.minute
      ),
    );

  const capacity =
    activeStylists *
    (
      operatingMinutes / 60
    );

  const load =
    appointmentCount /
    Math.max(
      1,
      capacity,
    );

  const score =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(
          load * 100,
        ),
      ),
    );

  if (load >= 0.9) {
    return {
      level:
        'CRITICAL' as const,

      score,

      label:
        'Very high schedule pressure',
    };
  }

  if (load >= 0.7) {
    return {
      level:
        'HIGH' as const,

      score,

      label:
        'High schedule pressure',
    };
  }

  if (load >= 0.45) {
    return {
      level:
        'MODERATE' as const,

      score,

      label:
        'Moderate schedule pressure',
    };
  }

  return {
    level:
      'LOW' as const,

    score:
      Math.max(
        5,
        score,
      ),

    label:
      'Healthy available capacity',
  };
}

/* -------------------------------------------------------------------------- */
/* Decision messaging                                                         */
/* -------------------------------------------------------------------------- */

function getDecisionMessage(
  result: EngineResult | null,
) {
  if (!result) {
    return {
      title:
        'No safe placement',

      message:
        'SALORA could not find a placement within the current operating limits.',
    };
  }

  switch (result.state) {
    case 'ACCEPT':
      return {
        title:
          'Accept this walk-in',

        message:
          'A safe immediate placement is available without delaying scheduled customers.',
      };

    case 'ACCEPT_WITH_WARNING':
      return {
        title:
          'Accept with warning',

        message:
          `This placement is feasible but may create up to ${Math.round(
            result.maxDelay,
          )} minutes of downstream delay.`,
      };

    case 'WAIT':
      return {
        title:
          'Ask the customer to wait',

        message:
          `A safer placement becomes available in ${Math.round(
            result.wait,
          )} minutes.`,
      };

    case 'RESCHEDULE':
      return {
        title:
          'Reschedule or offer another service',

        message:
          'No placement satisfies the current wait and delay limits.',
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Engine snapshot                                                            */
/* -------------------------------------------------------------------------- */

async function loadEngineSnapshot(
  client: Queryable,
  salonId: string,
  serviceId: string,
  requestedAt: Date,
) {
  const salonResult =
    await client.query(
      `
        SELECT
          id,
          name,
          timezone,
          currency,
          open_time,
          close_time
        FROM salons
        WHERE id = $1
        LIMIT 1
      `,
      [salonId],
    );

  const salon =
    salonResult.rows[0];

  if (!salon) {
    return {
      error:
        'SALON_NOT_FOUND',
    } as const;
  }

  const serviceResult =
    await client.query(
      `
        SELECT
          id,
          name,
          duration_min,
          price_inr,
          buffer_min
        FROM services
        WHERE
          id = $1
          AND salon_id = $2
          AND active = true
        LIMIT 1
      `,
      [
        serviceId,
        salonId,
      ],
    );

  const service =
    serviceResult.rows[0];

  if (!service) {
    return {
      error:
        'SERVICE_NOT_FOUND',
    } as const;
  }

  const stylistResult =
    await client.query(
      `
        SELECT
          st.id,
          st.name
        FROM stylists st
        INNER JOIN stylist_skills ss
          ON ss.stylist_id = st.id
        WHERE
          st.salon_id = $1
          AND st.active = true
          AND ss.service_id = $2
        ORDER BY
          st.name,
          st.id
      `,
      [
        salonId,
        serviceId,
      ],
    );

  const stylists =
    stylistResult.rows;

  if (!stylists.length) {
    return {
      error:
        'NO_ELIGIBLE_STYLIST',
    } as const;
  }

  const appointmentResult =
    await client.query(
      `
        SELECT
          id,
          stylist_id,
          scheduled_start,
          scheduled_end,
          status
        FROM appointments
        WHERE
          salon_id = $1
          AND status = ANY($2::text[])
          AND scheduled_end >= $3
          AND scheduled_start <
              $3 + interval '1 day'
        ORDER BY
          stylist_id,
          scheduled_start,
          id
      `,
      [
        salonId,

        [
          ...ACTIVE_APPOINTMENT_STATUSES,
        ],

        requestedAt,
      ],
    );

  const appointments =
    appointmentResult.rows.map(
      (appointment: {
        id: string;
        stylist_id: string;
        scheduled_start:
          | string
          | Date;
        scheduled_end:
          | string
          | Date;
        status: string;
      }) => ({
        id:
          appointment.id,

        stylistId:
          appointment.stylist_id,

        start:
          new Date(
            appointment.scheduled_start,
          ),

        end:
          new Date(
            appointment.scheduled_end,
          ),

        status:
          appointment.status,
      }),
    );

  return {
    salon,
    service,
    stylists,
    appointments,
  } as const;
}

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

app.get(
  '/health',
  async (
    _req,
    reply,
  ) => {
    try {
      await pool.query(
        'SELECT 1',
      );

      return {
        ok: true,

        service:
          'salora-api',

        version:
          APP_VERSION,

        engineVersion:
          ENGINE_VERSION,

        database:
          'connected',

        time:
          currentTimeIso(),
      };
    } catch {
      return reply
        .code(503)
        .send({
          ok: false,

          service:
            'salora-api',

          version:
            APP_VERSION,

          engineVersion:
            ENGINE_VERSION,

          database:
            'unavailable',

          time:
            currentTimeIso(),
        });
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Authentication                                                             */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/auth/login',
  {
    config: {
      rateLimit: {
        max: 10,
        timeWindow:
          '5 minutes',
      },
    },
  },
  async (
    req,
    reply,
  ) => {
    const body =
      loginSchema.parse(
        req.body,
      );

    const result =
      await login(
        normalizeEmail(
          body.email,
        ),
        body.password,
      );

    if (!result) {
      return fail(
        reply,
        401,
        'Invalid email or password',
      );
    }

    setSessionCookie(
      reply,
      result.token,
    );

    return result.user;
  },
);

app.get(
  '/api/me',
  {
    preHandler: user,
  },
  async (
    req,
    reply,
  ) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    return authenticated;
  },
);

app.post(
  '/api/auth/logout',
  {
    preHandler: user,
  },
  async (
    req,
    reply,
  ) => {
    await logout(
      req,
      reply,
    );

    /*
     * auth.ts already clears the correctly configured cookie.
     * Do not issue a second conflicting clearCookie call.
     */
    return {
      ok: true,
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/dashboard',
  {
    preHandler: user,
  },
  async (
    req,
    reply,
  ) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (
      !authenticated?.salonId
    ) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    const salonId =
      authenticated.salonId;

    const salonResult =
      await pool.query(
        `
          SELECT
            id,
            name,
            timezone,
            currency,
            open_time,
            close_time
          FROM salons
          WHERE id = $1
          LIMIT 1
        `,
        [salonId],
      );

    const salon =
      salonResult.rows[0];

    if (!salon) {
      return fail(
        reply,
        404,
        'Salon not found.',
      );
    }

    const [
      stylistsResult,
      servicesResult,
      appointmentsResult,
      customerCountResult,
      noShowResult,
      cancelledResult,
      todayRevenueResult,
      walkInResult,
      stylistSkillsResult,
    ] = await Promise.all([
      pool.query(
        `
          SELECT
            id,
            name,
            active
          FROM stylists
          WHERE salon_id = $1
          ORDER BY
            name,
            id
        `,
        [salonId],
      ),

      pool.query(
        `
          SELECT
            id,
            name,
            duration_min,
            price_inr,
            buffer_min,
            active
          FROM services
          WHERE salon_id = $1
          ORDER BY
            name,
            id
        `,
        [salonId],
      ),

      pool.query(
        `
          SELECT
            a.id,
            a.customer_id,
            a.stylist_id,
            a.service_id,
            a.scheduled_start,
            a.scheduled_end,
            a.status,
            a.source,
            c.name AS customer,
            c.phone AS customer_phone,
            s.name AS service,
            s.duration_min,
            s.price_inr,
            s.buffer_min,
            st.name AS stylist
          FROM appointments a
          INNER JOIN services s
            ON s.id = a.service_id
          INNER JOIN stylists st
            ON st.id = a.stylist_id
          LEFT JOIN customers c
            ON c.id = a.customer_id
          WHERE
            a.salon_id = $1
            AND a.scheduled_start >=
                now() - interval '2 hours'
            AND a.scheduled_start <
                now() + interval '24 hours'
          ORDER BY
            a.scheduled_start,
            a.id
          LIMIT 100
        `,
        [salonId],
      ),

      pool.query(
        `
          SELECT
            count(*)::int AS total
          FROM customers
          WHERE salon_id = $1
        `,
        [salonId],
      ),

      pool.query(
        `
          SELECT
            count(*)::int AS total
          FROM appointments
          WHERE
            salon_id = $1
            AND status = 'NO_SHOW'
            AND created_at >=
                date_trunc('month', now())
        `,
        [salonId],
      ),

      pool.query(
        `
          SELECT
            count(*)::int AS total
          FROM appointments
          WHERE
            salon_id = $1
            AND status = 'CANCELLED'
            AND created_at >=
                date_trunc('month', now())
        `,
        [salonId],
      ),

      pool.query(
        `
          SELECT
            COALESCE(
              SUM(s.price_inr),
              0
            )::int AS total
          FROM appointments a
          INNER JOIN services s
            ON s.id = a.service_id
          WHERE
            a.salon_id = $1
            AND a.status IN (
              'BOOKED',
              'CONFIRMED',
              'IN_PROGRESS',
              'COMPLETED'
            )
            AND a.scheduled_start::date =
              (
                now() AT TIME ZONE
                (
                  SELECT timezone
                  FROM salons
                  WHERE id = $1
                )
              )::date
        `,
        [salonId],
      ),

      pool.query(
        `
          SELECT
            count(*)::int AS total
          FROM walk_ins
          WHERE
            salon_id = $1
            AND status = 'WAITING'
        `,
        [salonId],
      ),

      /*
       * Real skill data for the floor panel (Phase G): which
       * services each stylist is actually qualified for, per the
       * stylist_skills table. Never inferred or guessed.
       */
      pool.query(
        `
          SELECT
            ss.stylist_id,
            s.name AS service_name
          FROM stylist_skills ss
          INNER JOIN services s
            ON s.id = ss.service_id
          INNER JOIN stylists st
            ON st.id = ss.stylist_id
          WHERE
            st.salon_id = $1
          ORDER BY
            st.id,
            s.name
        `,
        [salonId],
      ),
    ]);

    const stylists =
      stylistsResult.rows;

    const services =
      servicesResult.rows;

    const appointments =
      appointmentsResult.rows;

    const activeStylists =
      stylists.filter(
        (stylist: {
          active: boolean;
        }) =>
          stylist.active,
      ).length;

    /*
     * Phase G — Floor & Capacity Intelligence.
     *
     * Built entirely from the real rows already queried above:
     * real stylists, real appointments, real stylist_skills. No
     * fabricated stylists, appointments, or capacity numbers.
     */
    const skillsByStylist: Record<string, string[]> = {};

    for (const row of stylistSkillsResult.rows as {
      stylist_id: string;
      service_name: string;
    }[]) {
      const existing =
        skillsByStylist[row.stylist_id] ?? [];

      existing.push(row.service_name);

      skillsByStylist[row.stylist_id] = existing;
    }

    const floorStylists: FloorStylist[] =
      stylists.map(
        (stylist: {
          id: string;
          name: string;
          active: boolean;
        }) => ({
          id: stylist.id,
          name: stylist.name,
          active: stylist.active,
        }),
      );

    const floorAppointments: FloorAppointment[] =
      appointments.map(
        (appointment: {
          id: string;
          stylist_id: string;
          scheduled_start: string | Date;
          scheduled_end: string | Date;
          status: string;
          customer: string | null;
          service: string | null;
        }) => ({
          id: appointment.id,
          stylistId: appointment.stylist_id,
          start: new Date(appointment.scheduled_start),
          end: new Date(appointment.scheduled_end),
          status: appointment.status,
          customerName: appointment.customer,
          serviceName: appointment.service,
        }),
      );

    const floor = buildFloorState({
      now: new Date(),
      timezone: salon.timezone,
      openTime: salon.open_time,
      closeTime: salon.close_time,
      stylists: floorStylists,
      appointments: floorAppointments,
      skillsByStylist,
    });

    const upcomingAppointments =
      appointments.filter(
        (appointment: {
          status: string;
        }) =>
          ACTIVE_APPOINTMENT_STATUSES.includes(
            appointment.status as
              typeof ACTIVE_APPOINTMENT_STATUSES[number],
          ),
      );

    const schedulePressure =
      getSchedulePressure(
        upcomingAppointments.length,
        activeStylists,
        salon.open_time,
        salon.close_time,
      );

    const bookedValue =
      upcomingAppointments.reduce(
        (
          total: number,
          appointment: {
            price_inr:
              | number
              | string;
          },
        ) =>
          total +
          Number(
            appointment.price_inr ||
              0,
          ),
        0,
      );

    const completedToday =
      appointments.filter(
        (appointment: {
          status: string;
        }) =>
          appointment.status ===
          'COMPLETED',
      ).length;

    return {
      salon,

      stylists,

      services,

      appointments,

      floor,

      customerCount:
        Number(
          customerCountResult
            .rows[0]?.total ?? 0,
        ),

      intelligence: {
        schedulePressure,

        activeStylists,

        upcomingAppointments:
          upcomingAppointments.length,

        completedToday,

        bookedValue,

        todayRevenuePotential:
          Number(
            todayRevenueResult
              .rows[0]?.total ?? 0,
          ),

        noShowsThisMonth:
          Number(
            noShowResult
              .rows[0]?.total ?? 0,
          ),

        cancellationsThisMonth:
          Number(
            cancelledResult
              .rows[0]?.total ?? 0,
          ),

        waitingWalkIns:
          Number(
            walkInResult
              .rows[0]?.total ?? 0,
          ),
      },
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/customers',
  {
    preHandler: user,
  },
  async (
    req,
  ) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated) {
      throw new Error(
        'Authentication context missing.',
      );
    }

    const query =
      customerQuerySchema.parse(
        req.query,
      );

    const search =
      query.search
        ? `%${query.search}%`
        : '%';

    const result =
      await pool.query(
        `
          SELECT
            id,
            name,
            phone,
            created_at
          FROM customers
          WHERE
            salon_id = $1
            AND (
              name ILIKE $2
              OR COALESCE(phone, '')
                 ILIKE $2
            )
          ORDER BY
            name,
            id
          LIMIT 50
        `,
        [
          authenticated.salonId,
          search,
        ],
      );

    return result.rows;
  },
);

app.post(
  '/api/customers',
  {
    preHandler: user,
  },
  async (
    req,
    reply,
  ) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    const body =
      customerSchema.parse(
        req.body,
      );

    const result =
      await pool.query(
        `
          INSERT INTO customers (
            salon_id,
            name,
            phone
          )
          VALUES (
            $1,
            $2,
            $3
          )
          RETURNING
            id,
            name,
            phone,
            created_at
        `,
        [
          authenticated.salonId,
          body.name,
          body.phone ||
            null,
        ],
      );

    return reply
      .code(201)
      .send(
        result.rows[0],
      );
  },
);

/* -------------------------------------------------------------------------- */
/* Appointments                                                               */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/appointments',
  {
    preHandler: user,
  },
  async (
    req,
  ) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated) {
      throw new Error(
        'Authentication context missing.',
      );
    }

    const query =
      appointmentQuerySchema.parse(
        req.query,
      );

    const from =
      query.from ||
      new Date(
        Date.now() -
          86_400_000,
      ).toISOString();

    const to =
      query.to ||
      new Date(
        Date.now() +
          7 * 86_400_000,
      ).toISOString();

    const fromDate =
      new Date(from);

    const toDate =
      new Date(to);

    if (
      fromDate.getTime() >=
      toDate.getTime()
    ) {
      throw new Error(
        'Appointment range must have from before to.',
      );
    }

    const result =
      await pool.query(
        `
          SELECT
            a.*,
            c.name AS customer,
            c.phone AS customer_phone,
            s.name AS service,
            s.duration_min,
            s.price_inr,
            s.buffer_min,
            st.name AS stylist
          FROM appointments a
          INNER JOIN services s
            ON s.id = a.service_id
          INNER JOIN stylists st
            ON st.id = a.stylist_id
          LEFT JOIN customers c
            ON c.id = a.customer_id
          WHERE
            a.salon_id = $1
            AND a.scheduled_start >= $2
            AND a.scheduled_start < $3
          ORDER BY
            a.scheduled_start,
            a.id
          LIMIT 500
        `,
        [
          authenticated.salonId,
          from,
          to,
        ],
      );

    return result.rows;
  },
);

/* -------------------------------------------------------------------------- */
/* Walk-in simulation                                                         */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/walk-ins/simulate',
  {
    preHandler: user,

    config: {
      rateLimit: {
        max: 60,
        timeWindow:
          '1 minute',
      },
    },
  },
  async (
    req,
    reply,
  ) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    const body =
      simulationSchema.parse(
        req.body,
      );

    const requestedAt =
      body.now
        ? new Date(body.now)
        : currentTime();

    if (
      Number.isNaN(
        requestedAt.getTime(),
      )
    ) {
      return fail(
        reply,
        400,
        'Invalid simulation time.',
      );
    }

    const snapshot =
      await loadEngineSnapshot(
        pool,
        authenticated.salonId,
        body.serviceId,
        requestedAt,
      );

    if (
      'error' in snapshot
    ) {
      switch (
        snapshot.error
      ) {
        case 'SALON_NOT_FOUND':
          return fail(
            reply,
            404,
            'Salon not found.',
          );

        case 'SERVICE_NOT_FOUND':
          return fail(
            reply,
            404,
            'Service not found.',
          );

        case 'NO_ELIGIBLE_STYLIST':
          return fail(
            reply,
            409,
            'No active stylist is qualified for this service.',
          );
      }
    }

    const {
      salon,
      service,
      stylists,
      appointments,
    } = snapshot;

    const candidates =
      simulate({
        now:
          requestedAt,

        duration:
          Number(
            service.duration_min,
          ),

        price:
          Number(
            service.price_inr,
          ),

        buffer:
          Number(
            service.buffer_min,
          ),

        maxDelay:
          DEFAULT_MAX_DELAY,

        maxWait:
          DEFAULT_MAX_WAIT,

        stylists:
          stylists.map(
            (stylist: {
              id: string;
            }) =>
              stylist.id,
          ),

        appointments,
      }).filter(
        candidate =>
          isWithinSalonHours(
            candidate.start,
            candidate.end,
            salon.timezone,
            salon.open_time,
            salon.close_time,
          ),
      );

    const recommendation =
      candidates[0] ??
      null;

    /*
     * Persist simulation history.
     *
     * Persistence is intentionally non-blocking for the
     * decision itself. A temporary analytics/history failure
     * must not prevent reception staff from receiving a result.
     */
    let simulationId: string | null = null;

    try {
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        const simulationInsert =
          await client.query<{ id: string }>(
            `
              INSERT INTO decision_simulations (
                salon_id,
                requested_at,
                engine_version,
                input,
                result
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5
              )
              RETURNING id
            `,
            [
              authenticated.salonId,
              requestedAt,
              ENGINE_VERSION,
              safeJson({
                serviceId: service.id,
                serviceName: service.name,
                customerName: body.customerName || null,
                customerPhone: body.customerPhone || null,
                requestedAt: requestedAt.toISOString(),
              }),
              safeJson({
                recommendation,
                candidates: candidates.slice(0, 8),
              }),
            ],
          );

        simulationId =
          simulationInsert.rows[0]?.id ?? null;

        if (!simulationId) {
          throw new Error(
            'Simulation was created without an id.',
          );
        }

        const ledgerRecommendation = recommendation
          ? {
              state: recommendation.state,
              stylistId: recommendation.stylistId,
              start: recommendation.start,
              end: recommendation.end,
              revenue: Number(recommendation.revenue ?? 0),
              totalDelay: Number(recommendation.totalDelay ?? 0),
              maxDelay: Number(recommendation.maxDelay ?? 0),
              wait: Number(recommendation.wait ?? 0),
              affected: Number(recommendation.affected ?? 0),
              reason: recommendation.reason ?? '',
            }
          : null;

        const ledgerInsert = await client.query<{ id: string }>(
          `
            INSERT INTO decision_outcomes (
              salon_id,
              simulation_id,
              actor_id,
              service_id,
              recommendation_state,
              recommended_stylist_id,
              recommended_start,
              recommended_end,
              expected_revenue_inr,
              expected_total_delay_min,
              expected_max_delay_min,
              expected_wait_min,
              expected_affected_appointments,
              recommendation_reason
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9,
              $10, $11, $12, $13, $14
            )
            RETURNING id
          `,
          [
            authenticated.salonId,
            simulationId,
            authenticated.id,
            service.id,
            ledgerRecommendation?.state ?? 'RESCHEDULE',
            ledgerRecommendation?.stylistId ?? null,
            ledgerRecommendation?.start ?? null,
            ledgerRecommendation?.end ?? null,
            ledgerRecommendation?.revenue ?? 0,
            ledgerRecommendation?.totalDelay ?? 0,
            ledgerRecommendation?.maxDelay ?? 0,
            ledgerRecommendation?.wait ?? 0,
            ledgerRecommendation?.affected ?? 0,
            ledgerRecommendation?.reason ||
              'No feasible recommendation was available.',
          ],
        );

        const ledgerId = ledgerInsert.rows[0]?.id;

        if (!ledgerId) {
          throw new Error(
            'Decision outcome was created without an id.',
          );
        }

        await client.query(
          `
            INSERT INTO decision_outcome_events (
              decision_outcome_id,
              salon_id,
              actor_id,
              event_type,
              metadata
            )
            VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          [
            ledgerId,
            authenticated.salonId,
            authenticated.id,
            'DECISION_RECORDED',
            safeJson({
              simulationId,
              recommendationState:
                ledgerRecommendation?.state ??
                'RESCHEDULE',
            }),
          ],
        );

        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      simulationId = null;
      req.log.warn(
        {
          error,
          salonId: authenticated.salonId,
        },
        'Decision simulation ledger persistence failed',
      );
    }

    return {
      simulationId,

      recommendation,

      candidates:
        candidates.slice(
          0,
          8,
        ),

      decision:
        getDecisionMessage(
          recommendation,
        ),

      meta: {
        service:
          service.name,

        duration:
          Number(
            service.duration_min,
          ),

        price:
          Number(
            service.price_inr,
          ),

        buffer:
          Number(
            service.buffer_min,
          ),

        timezone:
          salon.timezone,

        engineVersion:
          ENGINE_VERSION,

        generatedAt:
          currentTimeIso(),
      },
    };
  },
);

/* -------------------------------------------------------------------------- */
/* Walk-in acceptance                                                         */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/walk-ins/accept',
  {
    preHandler: user,

    config: {
      rateLimit: {
        max: 30,
        timeWindow:
          '1 minute',
      },
    },
  },
  async (
    req,
    reply,
  ) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (
      !authenticated?.salonId ||
      !authenticated.id
    ) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    const body =
      acceptanceSchema.parse(
        req.body,
      );

    const rawIdempotencyKey =
      req.headers[
        'idempotency-key'
      ];

    if (
      typeof rawIdempotencyKey !==
      'string'
    ) {
      return fail(
        reply,
        400,
        'A valid Idempotency-Key is required.',
      );
    }

    const idempotencyKey =
      normalizeIdempotencyKey(
        rawIdempotencyKey,
      );

    if (
      idempotencyKey.length <
        16 ||
      idempotencyKey.length >
        100
    ) {
      return fail(
        reply,
        400,
        'A valid Idempotency-Key is required.',
      );
    }

    const idempotencyFingerprint =
      hashIdempotencyKey(
        idempotencyKey,
      );

    const salonId =
      authenticated.salonId;

    const userId =
      authenticated.id;

    const client =
      await pool.connect();

    try {
      await client.query(
        'BEGIN',
      );

      /* -------------------------------------------------------------------- */
      /* Idempotency                                                           */
      /* -------------------------------------------------------------------- */

      const existing =
        await client.query(
          `
            SELECT
              response
            FROM idempotency_keys
            WHERE
              salon_id = $1
              AND user_id = $2
              AND key = $3
            FOR UPDATE
          `,
          [
            salonId,
            userId,
            idempotencyKey,
          ],
        );

      if (
        existing.rows[0]
      ) {
        await client.query(
          'COMMIT',
        );

        return existing
          .rows[0]
          .response;
      }

      /* -------------------------------------------------------------------- */
      /* Serialize schedule-changing operation                                */
      /* -------------------------------------------------------------------- */

      const salonResult =
        await client.query(
          `
            SELECT
              id,
              name,
              timezone,
              currency,
              open_time,
              close_time
            FROM salons
            WHERE id = $1
            FOR UPDATE
          `,
          [salonId],
        );

      const salon =
        salonResult.rows[0];

      if (!salon) {
        await client.query(
          'ROLLBACK',
        );

        return fail(
          reply,
          404,
          'Salon not found.',
        );
      }

      /* -------------------------------------------------------------------- */
      /* Service                                                               */
      /* -------------------------------------------------------------------- */

      const serviceResult =
        await client.query(
          `
            SELECT
              id,
              name,
              duration_min,
              price_inr,
              buffer_min
            FROM services
            WHERE
              id = $1
              AND salon_id = $2
              AND active = true
            LIMIT 1
          `,
          [
            body.serviceId,
            salonId,
          ],
        );

      const service =
        serviceResult.rows[0];

      if (!service) {
        await client.query(
          'ROLLBACK',
        );

        return fail(
          reply,
          404,
          'Service not found.',
        );
      }

      /* -------------------------------------------------------------------- */
      /* Stylist                                                               */
      /* -------------------------------------------------------------------- */

      const stylistResult =
        await client.query(
          `
            SELECT
              st.id,
              st.name
            FROM stylists st
            INNER JOIN stylist_skills ss
              ON ss.stylist_id = st.id
            WHERE
              st.id = $1
              AND st.salon_id = $2
              AND st.active = true
              AND ss.service_id = $3
            LIMIT 1
          `,
          [
            body.stylistId,
            salonId,
            body.serviceId,
          ],
        );

      const stylist =
        stylistResult.rows[0];

      if (!stylist) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            serviceId: body.serviceId,
          },
          'Walk-in acceptance rejected: stylist no longer eligible',
        );

        return fail(
          reply,
          409,
          'Stylist is not eligible for this service.',
        );
      }

      /* -------------------------------------------------------------------- */
      /* Placement time                                                        */
      /* -------------------------------------------------------------------- */

      const start =
        new Date(
          body.startAt,
        );

      if (
        Number.isNaN(
          start.getTime(),
        )
      ) {
        await client.query(
          'ROLLBACK',
        );

        return fail(
          reply,
          400,
          'Invalid start time.',
        );
      }

      const end =
        addMinutes(
          start,
          Number(
            service.duration_min,
          ),
        );

      if (
        !isWithinSalonHours(
          start,
          end,
          salon.timezone,
          salon.open_time,
          salon.close_time,
        )
      ) {
        await client.query(
          'ROLLBACK',
        );

        return fail(
          reply,
          409,
          'The selected placement is outside salon operating hours.',
        );
      }

      /*
       * Do not allow acceptance of a placement in the past.
       */
      const decisionNow =
        currentTime();

      if (
        start.getTime() <
        decisionNow.getTime()
      ) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            startAt: body.startAt,
          },
          'Walk-in acceptance rejected: selected placement is in the past',
        );

        return fail(
          reply,
          409,
          'The selected placement is already in the past. Simulate again.',
        );
      }

      /* -------------------------------------------------------------------- */
      /* Customer                                                              */
      /* -------------------------------------------------------------------- */

      let customerId =
        body.customerId;

      if (customerId) {
        const customer =
          await client.query(
            `
              SELECT
                id
              FROM customers
              WHERE
                id = $1
                AND salon_id = $2
              LIMIT 1
            `,
            [
              customerId,
              salonId,
            ],
          );

        if (
          !customer.rows[0]
        ) {
          await client.query(
            'ROLLBACK',
          );

          return fail(
            reply,
            400,
            'Customer does not belong to this salon.',
          );
        }
      }

      if (
        !customerId &&
        body.customerName
      ) {
        const customer =
          await client.query(
            `
              INSERT INTO customers (
                salon_id,
                name,
                phone
              )
              VALUES (
                $1,
                $2,
                $3
              )
              RETURNING id
            `,
            [
              salonId,
              body.customerName,
              body.customerPhone ||
                null,
            ],
          );

        customerId =
          customer.rows[0]
            .id;
      }

      /* -------------------------------------------------------------------- */
      /* Fresh schedule snapshot                                               */
      /* -------------------------------------------------------------------- */

      const appointmentResult =
        await client.query(
          `
            SELECT
              id,
              stylist_id,
              scheduled_start,
              scheduled_end,
              status
            FROM appointments
            WHERE
              salon_id = $1
              AND status = ANY($2::text[])
              AND scheduled_end >= $3
              AND scheduled_start <
                  $3 + interval '1 day'
            ORDER BY
              stylist_id,
              scheduled_start,
              id
          `,
          [
            salonId,

            [
              ...ACTIVE_APPOINTMENT_STATUSES,
            ],

            start,
          ],
        );

      const appointments =
        appointmentResult.rows.map(
          (appointment: {
            id: string;
            stylist_id: string;
            scheduled_start:
              | string
              | Date;
            scheduled_end:
              | string
              | Date;
            status: string;
          }) => ({
            id:
              appointment.id,

            stylistId:
              appointment.stylist_id,

            start:
              new Date(
                appointment.scheduled_start,
              ),

            end:
              new Date(
                appointment.scheduled_end,
              ),

            status:
              appointment.status,
          }),
        );

      /* -------------------------------------------------------------------- */
      /* Fresh hard conflict check                                             */
      /* -------------------------------------------------------------------- */

      const conflict =
        await client.query(
          `
            SELECT
              id
            FROM appointments
            WHERE
              salon_id = $1
              AND stylist_id = $2
              AND status = ANY($3::text[])
              AND scheduled_start < $4
              AND scheduled_end > $5
            LIMIT 1
          `,
          [
            salonId,

            body.stylistId,

            [
              ...ACTIVE_APPOINTMENT_STATUSES,
            ],

            end,

            start,
          ],
        );

      if (
        conflict.rows[0]
      ) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            conflictingAppointmentId: conflict.rows[0].id,
          },
          'Walk-in acceptance rejected: a conflicting appointment now exists',
        );

        return fail(
          reply,
          409,
          'The schedule changed. Simulate again before accepting.',
        );
      }

      /* -------------------------------------------------------------------- */
      /* Fresh engine verification                                             */
      /* -------------------------------------------------------------------- */

      const candidates =
        simulate({
          now:
            decisionNow,

          duration:
            Number(
              service.duration_min,
            ),

          price:
            Number(
              service.price_inr,
            ),

          buffer:
            Number(
              service.buffer_min,
            ),

          maxDelay:
            DEFAULT_MAX_DELAY,

          maxWait:
            DEFAULT_MAX_WAIT,

          stylists:
            [
              ...new Set(
                appointments
                  .map(
                    appointment =>
                      appointment.stylistId,
                  )
                  .concat(
                    body.stylistId,
                  ),
              ),
            ],

          appointments,
        }).filter(
          candidate =>
            isWithinSalonHours(
              candidate.start,
              candidate.end,
              salon.timezone,
              salon.open_time,
              salon.close_time,
            ),
        );

      const selected =
        candidates.find(
          candidate =>
            candidate.stylistId ===
              body.stylistId &&
            candidate.start.getTime() ===
              start.getTime(),
        );

      if (!selected) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            startAt: body.startAt,
          },
          'Walk-in acceptance rejected: selected candidate is no longer feasible against fresh state',
        );

        return fail(
          reply,
          409,
          'This placement is no longer approved by SALORA. Simulate again before accepting.',
        );
      }

      const actualDecisionState =
        selected.state;

      /*
       * Never trust the client-provided decision state.
       */
      if (
        body.decisionState &&
        body.decisionState !==
          actualDecisionState
      ) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            startAt: body.startAt,
            clientDecisionState: body.decisionState,
            freshDecisionState: actualDecisionState,
          },
          'Walk-in acceptance rejected: decision state changed since simulation',
        );

        return fail(
          reply,
          409,
          'The decision changed. Simulate again before accepting.',
        );
      }

      if (
        actualDecisionState ===
        'RESCHEDULE'
      ) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            startAt: body.startAt,
          },
          'Walk-in acceptance rejected: fresh revalidation now recommends RESCHEDULE',
        );

        return fail(
          reply,
          409,
          'SALORA recommends rescheduling this walk-in.',
        );
      }

      if (
        actualDecisionState ===
        'WAIT'
      ) {
        const wait =
          minutesBetween(
            decisionNow,
            start,
          );

        if (
          wait <= 0 ||
          wait >
            DEFAULT_MAX_WAIT
        ) {
          await client.query(
            'ROLLBACK',
          );

          req.log.warn(
            {
              salonId,
              userId,
              stylistId: body.stylistId,
              startAt: body.startAt,
              waitMinutes: wait,
            },
            'Walk-in acceptance rejected: WAIT placement outside allowed window',
          );

          return fail(
            reply,
            409,
            'The selected WAIT placement is outside the allowed waiting window.',
          );
        }
      }

      /* -------------------------------------------------------------------- */
      /* Fresh buffer verification                                             */
      /* -------------------------------------------------------------------- */

      const previous =
        appointments
          .filter(
            appointment =>
              appointment.stylistId ===
                body.stylistId &&
              appointment.end.getTime() <=
                start.getTime(),
          )
          .sort(
            (a, b) =>
              b.end.getTime() -
              a.end.getTime(),
          )[0];

      if (previous) {
        const earliest =
          addMinutes(
            previous.end,
            Number(
              service.buffer_min,
            ),
          );

        if (
          start.getTime() <
          earliest.getTime()
        ) {
          await client.query(
            'ROLLBACK',
          );

          req.log.warn(
            {
              salonId,
              userId,
              stylistId: body.stylistId,
              startAt: body.startAt,
              previousAppointmentId: previous.id,
              bufferMinutes: service.buffer_min,
            },
            'Walk-in acceptance rejected: placement violates required service buffer',
          );

          return fail(
            reply,
            409,
            `The placement violates the required ${service.buffer_min}-minute service buffer.`,
          );
        }
      }

      /* -------------------------------------------------------------------- */
      /* Fresh cascade verification                                            */
      /* -------------------------------------------------------------------- */

      let cursor =
        new Date(end);

      let totalDelay = 0;
      let maximumDelay = 0;
      let affectedAppointments = 0;

      const downstream =
        appointments
          .filter(
            appointment =>
              appointment.stylistId ===
                body.stylistId &&
              appointment.start.getTime() >=
                start.getTime(),
          )
          .sort(
            (a, b) =>
              a.start.getTime() -
                b.start.getTime() ||
              a.end.getTime() -
                b.end.getTime() ||
              a.id.localeCompare(
                b.id,
              ),
          );

      for (
        const appointment
        of downstream
      ) {
        if (
          cursor.getTime() <=
          appointment.start.getTime()
        ) {
          cursor =
            new Date(
              appointment.end,
            );

          continue;
        }

        const delay =
          minutesBetween(
            appointment.start,
            cursor,
          );

        totalDelay +=
          delay;

        maximumDelay =
          Math.max(
            maximumDelay,
            delay,
          );

        affectedAppointments +=
          1;

        cursor =
          addMinutes(
            appointment.end,
            delay,
          );
      }

      if (
        maximumDelay >
        DEFAULT_MAX_DELAY
      ) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            startAt: body.startAt,
            maximumDelay,
            affectedAppointments,
          },
          'Walk-in acceptance rejected: fresh cascade exceeds max downstream delay',
        );

        return fail(
          reply,
          409,
          `Current schedule would create ${maximumDelay} minutes of downstream delay. Simulate again.`,
        );
      }

      /*
       * The selected engine result and the fresh validation must
       * agree before the database is changed.
       */
      if (
        Math.round(
          selected.totalDelay,
        ) !==
        Math.round(
          totalDelay,
        ) ||
        Math.round(
          selected.maxDelay,
        ) !==
        Math.round(
          maximumDelay,
        ) ||
        selected.affected !==
        affectedAppointments
      ) {
        await client.query(
          'ROLLBACK',
        );

        req.log.warn(
          {
            salonId,
            userId,
            stylistId: body.stylistId,
            startAt: body.startAt,
            engineTotalDelay: selected.totalDelay,
            manualTotalDelay: totalDelay,
            engineMaxDelay: selected.maxDelay,
            manualMaxDelay: maximumDelay,
            engineAffected: selected.affected,
            manualAffected: affectedAppointments,
          },
          'Walk-in acceptance rejected: engine result and manual cascade re-check disagree',
        );

        return fail(
          reply,
          409,
          'Schedule impact changed during validation. Simulate again.',
        );
      }

      /* -------------------------------------------------------------------- */
      /* Appointment creation                                                  */
      /* -------------------------------------------------------------------- */

      const appointmentInsert =
        await client.query(
          `
            INSERT INTO appointments (
              salon_id,
              customer_id,
              stylist_id,
              service_id,
              scheduled_start,
              scheduled_end,
              status,
              source
            )
            VALUES (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              'CONFIRMED',
              'WALK_IN'
            )
            RETURNING
              id,
              scheduled_start,
              scheduled_end,
              status
          `,
          [
            salonId,

            customerId ||
              null,

            body.stylistId,

            body.serviceId,

            start,

            end,
          ],
        );

      const appointment =
        appointmentInsert
          .rows[0];

      /* -------------------------------------------------------------------- */
      /* Walk-in creation                                                      */
      /* -------------------------------------------------------------------- */

      const walkInInsert =
        await client.query(
          `
            INSERT INTO walk_ins (
              salon_id,
              customer_id,
              service_id,
              status,
              decision_state
            )
            VALUES (
              $1,
              $2,
              $3,
              'ACCEPTED',
              $4
            )
            RETURNING
              id,
              status,
              decision_state
          `,
          [
            salonId,

            customerId ||
              null,

            body.serviceId,

            actualDecisionState,
          ],
        );

      const walkIn =
        walkInInsert
          .rows[0];

      /* -------------------------------------------------------------------- */
      /* Decision Outcome Ledger                                               */
      /* -------------------------------------------------------------------- */

      let ledgerId: string | null = null;

      if (body.simulationId) {
        const ledgerResult =
          await client.query<{
            id: string;
            recommendation_state: string;
            staff_action: string;
          }>(
            `
              SELECT
                id,
                recommendation_state,
                staff_action
              FROM decision_outcomes
              WHERE
                salon_id = $1
                AND simulation_id = $2
              FOR UPDATE
            `,
            [
              salonId,
              body.simulationId,
            ],
          );

        const ledger = ledgerResult.rows[0];

        if (!ledger) {
          await client.query('ROLLBACK');
          req.log.warn(
            {
              salonId,
              userId,
              simulationId: body.simulationId,
            },
            'Walk-in acceptance rejected: decision history not found',
          );
          return fail(
            reply,
            409,
            'Decision history was not found. Simulate again before accepting.',
          );
        }

        /*
         * Stale-decision protection (Phase F):
         *
         * The Idempotency-Key check earlier in this handler only
         * catches a *repeat* of the exact same accept request. It
         * does not catch a second, materially different accept
         * request (a different Idempotency-Key) racing to act on
         * the same decision_outcomes row — for example a double
         * click that generated two keys, or two staff members
         * accepting the same walk-in concurrently.
         *
         * decision_outcomes.staff_action starts as 'NONE' and is
         * set exactly once per decision (see the sibling
         * /api/decision-outcomes/:id/action route, which already
         * enforces this same invariant). Locking this row with
         * FOR UPDATE above means only one concurrent transaction
         * can observe staff_action === 'NONE'; the loser must be
         * rejected here, before it creates a second real
         * appointment against a decision that was already acted
         * on.
         */
        if (ledger.staff_action !== 'NONE') {
          await client.query('ROLLBACK');
          req.log.warn(
            {
              salonId,
              userId,
              simulationId: body.simulationId,
              ledgerId: ledger.id,
              existingStaffAction: ledger.staff_action,
            },
            'Walk-in acceptance rejected: decision already actioned',
          );
          return fail(
            reply,
            409,
            'This decision has already been acted on. Simulate again before accepting.',
          );
        }

        ledgerId = ledger.id;

        await client.query(
          `
            UPDATE decision_outcomes
            SET
              staff_action = 'ACCEPT',
              outcome = 'ACCEPTED',
              appointment_id = $3,
              walk_in_id = $4,
              actual_revenue_inr = $5,
              schedule_changed = $6,
              recommendation_followed = (
                recommendation_state = $7
              ),
              acted_by = $8,
              acted_at = now(),
              outcome_at = now()
            WHERE
              salon_id = $1
              AND id = $2
              AND staff_action = 'NONE'
          `,
          [
            salonId,
            ledgerId,
            appointment.id,
            walkIn.id,
            Number(service.price_inr),
            totalDelay > 0,
            actualDecisionState,
            userId,
          ],
        );

        await client.query(
          `
            INSERT INTO decision_outcome_events (
              decision_outcome_id,
              salon_id,
              actor_id,
              event_type,
              metadata
            )
            VALUES ($1, $2, $3, $4, $5::jsonb)
          `,
          [
            ledgerId,
            salonId,
            userId,
            'STAFF_ACCEPTED',
            safeJson({
              appointmentId: appointment.id,
              walkInId: walkIn.id,
              recommendationState: actualDecisionState,
              totalDelay,
              maximumDelay,
              affectedAppointments,
            }),
          ],
        );
      }

      /* -------------------------------------------------------------------- */
      /* Response                                                              */
      /* -------------------------------------------------------------------- */

      const response = {
        ok: true,

        ledgerId,

        appointmentId:
          appointment.id,

        walkInId:
          walkIn.id,

        startAt:
          appointment.scheduled_start,

        endAt:
          appointment.scheduled_end,

        intelligence: {
          revenue:
            Number(
              service.price_inr,
            ),

          totalDelay,

          maximumDelay,

          affectedAppointments,

          decision:
            actualDecisionState,

          stylistId:
            body.stylistId,

          stylistName:
            stylist.name,

          service:
            service.name,
        },
      };

      /* -------------------------------------------------------------------- */
      /* Idempotency                                                           */
      /* -------------------------------------------------------------------- */

      await client.query(
        `
          INSERT INTO idempotency_keys (
            salon_id,
            user_id,
            key,
            response
          )
          VALUES (
            $1,
            $2,
            $3,
            $4
          )
        `,
        [
          salonId,

          userId,

          idempotencyKey,

          safeJson(
            response,
          ),
        ],
      );

      /* -------------------------------------------------------------------- */
      /* Audit                                                                 */
      /* -------------------------------------------------------------------- */

      await client.query(
        `
          INSERT INTO audit_events (
            salon_id,
            actor_id,
            event_type,
            entity_type,
            entity_id,
            metadata
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
        `,
        [
          salonId,

          userId,

          'WALK_IN_ACCEPTED',

          'APPOINTMENT',

          appointment.id,

          safeJson({
            walkInId:
              walkIn.id,

            serviceId:
              body.serviceId,

            stylistId:
              body.stylistId,

            decisionState:
              actualDecisionState,

            revenue:
              Number(
                service.price_inr,
              ),

            totalDelay,

            maximumDelay,

            affectedAppointments,

            engineVersion:
              ENGINE_VERSION,

            idempotencyFingerprint,
          }),
        ],
      );

      /* -------------------------------------------------------------------- */
      /* Notification outbox                                                  */
      /* -------------------------------------------------------------------- */

      await client.query(
        `
          INSERT INTO notifications (
            salon_id,
            channel,
            recipient,
            payload
          )
          VALUES (
            $1,
            $2,
            $3,
            $4
          )
        `,
        [
          salonId,

          'OUTBOX',

          'internal',

          safeJson({
            type:
              'WALK_IN_ACCEPTED',

            appointmentId:
              appointment.id,

            walkInId:
              walkIn.id,

            service:
              service.name,

            stylist:
              stylist.name,

            startAt:
              appointment.scheduled_start,

            decision:
              actualDecisionState,
          }),
        ],
      );

      /* -------------------------------------------------------------------- */
      /* Commit                                                                */
      /* -------------------------------------------------------------------- */

      await client.query(
        'COMMIT',
      );

      return response;
    } catch (error) {
      try {
        await client.query(
          'ROLLBACK',
        );
      } catch (rollbackError) {
        req.log.error(
          {
            rollbackError,
          },
          'Transaction rollback failed',
        );
      }

      throw error;
    } finally {
      client.release();
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Decision Outcome Ledger                                                    */
/* -------------------------------------------------------------------------- */

const decisionOutcomeIdSchema = z.object({
  id: uuid,
});

const decisionOutcomeActionSchema = z.object({
  staffAction: z.enum([
    'ACCEPT',
    'REJECT',
    'WAIT',
    'RESCHEDULE',
    'EXPIRE',
    'CANCEL',
  ]),

  outcome: z.enum([
    'ACCEPTED',
    'REJECTED',
    'WAITED',
    'RESCHEDULED',
    'EXPIRED',
    'ABANDONED',
    'CANCELLED',
    'COMPLETED',
  ]),

  appointmentId: uuid.optional(),
  actualRevenueInr: z.number().int().nonnegative().optional(),
  scheduleChanged: z.boolean().default(false),
  recommendationFollowed: z.boolean().optional(),
});

app.get(
  '/api/decision-outcomes',
  {
    preHandler: user,
  },
  async (req, reply) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated?.salonId) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    const result = await pool.query(
      `
        SELECT
          d.id,
          d.simulation_id AS "simulationId",
          d.recommendation_state AS "recommendationState",
          d.staff_action AS "staffAction",
          d.outcome,
          d.expected_revenue_inr AS "expectedRevenueInr",
          d.actual_revenue_inr AS "actualRevenueInr",
          d.recommended_start AS "recommendedStart",
          d.recommended_end AS "recommendedEnd",
          d.acted_at AS "actedAt",
          d.outcome_at AS "outcomeAt",
          d.created_at AS "createdAt",
          COALESCE(
            ds.input->>'customerName',
            ds.input->>'customer_name',
            'Walk-in customer'
          ) AS "customerName",
          s.name AS service,
          st.name AS stylist
        FROM decision_outcomes d
        INNER JOIN services s ON s.id = d.service_id
        LEFT JOIN stylists st ON st.id = d.recommended_stylist_id
        LEFT JOIN decision_simulations ds ON ds.id = d.simulation_id
        WHERE d.salon_id = $1
        ORDER BY d.created_at DESC
        LIMIT 100
      `,
      [authenticated.salonId],
    );

    return result.rows;
  },
);

app.get(
  '/api/decision-outcomes/:id',
  {
    preHandler: user,
  },
  async (req, reply) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated?.salonId) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    const params =
      decisionOutcomeIdSchema.parse(
        req.params,
      );

    const outcomeResult = await pool.query(
      `
        SELECT
          d.*,
          s.name AS service,
          st.name AS stylist
        FROM decision_outcomes d
        INNER JOIN services s ON s.id = d.service_id
        LEFT JOIN stylists st ON st.id = d.recommended_stylist_id
        WHERE d.salon_id = $1
          AND d.id = $2
        LIMIT 1
      `,
      [authenticated.salonId, params.id],
    );

    const outcome = outcomeResult.rows[0];

    if (!outcome) {
      return fail(
        reply,
        404,
        'Decision outcome not found.',
      );
    }

    const eventsResult = await pool.query(
      `
        SELECT
          id,
          actor_id AS "actorId",
          event_type AS "eventType",
          metadata,
          created_at AS "createdAt"
        FROM decision_outcome_events
        WHERE salon_id = $1
          AND decision_outcome_id = $2
        ORDER BY created_at ASC, id ASC
      `,
      [authenticated.salonId, params.id],
    );

    return {
      ...outcome,
      events: eventsResult.rows,
    };
  },
);

app.post(
  '/api/decision-outcomes/:id/action',
  {
    preHandler: user,
  },
  async (req, reply) => {
    const authenticated =
      getAuthenticatedUser(req);

    if (!authenticated?.salonId || !authenticated.id) {
      return fail(
        reply,
        401,
        'Authentication required.',
      );
    }

    const params =
      decisionOutcomeIdSchema.parse(
        req.params,
      );

    const body =
      decisionOutcomeActionSchema.parse(
        req.body,
      );

    if (
      body.outcome === 'COMPLETED'
    ) {
      return fail(
        reply,
        400,
        'COMPLETED is not a staff action outcome in this ledger transition.',
      );
    }

    const compatibleOutcomes: Record<string, string[]> = {
      ACCEPT: ['ACCEPTED'],
      REJECT: ['REJECTED'],
      RESCHEDULE: ['RESCHEDULED'],
      WAIT: ['WAITED'],
      EXPIRE: ['EXPIRED', 'ABANDONED'],
      CANCEL: ['CANCELLED'],
    };

    if (
      !compatibleOutcomes[body.staffAction]?.includes(
        body.outcome,
      )
    ) {
      return fail(
        reply,
        400,
        `Outcome ${body.outcome} is not compatible with action ${body.staffAction}.`,
      );
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const ledgerResult =
        await client.query(
          `
            SELECT
              id,
              staff_action AS "staffAction",
              outcome
            FROM decision_outcomes
            WHERE
              salon_id = $1
              AND id = $2
            FOR UPDATE
          `,
          [
            authenticated.salonId,
            params.id,
          ],
        );

      const ledger =
        ledgerResult.rows[0];

      if (!ledger) {
        await client.query('ROLLBACK');
        return fail(
          reply,
          404,
          'Decision outcome not found.',
        );
      }

      if (
        ledger.staffAction !== 'NONE'
      ) {
        await client.query('ROLLBACK');
        return fail(
          reply,
          409,
          'This decision outcome has already been acted on.',
        );
      }

      if (body.appointmentId) {
        const appointment =
          await client.query(
            `
              SELECT id
              FROM appointments
              WHERE
                salon_id = $1
                AND id = $2
              LIMIT 1
            `,
            [
              authenticated.salonId,
              body.appointmentId,
            ],
          );

        if (!appointment.rows[0]) {
          await client.query('ROLLBACK');
          return fail(
            reply,
            400,
            'Appointment does not belong to this salon.',
          );
        }
      }

      await client.query(
        `
          UPDATE decision_outcomes
          SET
            staff_action = $3,
            outcome = $4,
            appointment_id = COALESCE($5, appointment_id),
            actual_revenue_inr = COALESCE($6, actual_revenue_inr),
            schedule_changed = $7,
            recommendation_followed = COALESCE(
              $8,
              recommendation_followed
            ),
            acted_by = $9,
            acted_at = now(),
            outcome_at = now()
          WHERE
            salon_id = $1
            AND id = $2
        `,
        [
          authenticated.salonId,
          params.id,
          body.staffAction,
          body.outcome,
          body.appointmentId ?? null,
          body.actualRevenueInr ?? null,
          body.scheduleChanged,
          body.recommendationFollowed ?? null,
          authenticated.id,
        ],
      );

      await client.query(
        `
          INSERT INTO decision_outcome_events (
            decision_outcome_id,
            salon_id,
            actor_id,
            event_type,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5::jsonb)
        `,
        [
          params.id,
          authenticated.salonId,
          authenticated.id,
          'STAFF_ACTION_RECORDED',
          safeJson({
            staffAction: body.staffAction,
            outcome: body.outcome,
            appointmentId: body.appointmentId ?? null,
            actualRevenueInr:
              body.actualRevenueInr ?? null,
            scheduleChanged: body.scheduleChanged,
            recommendationFollowed:
              body.recommendationFollowed ?? null,
          }),
        ],
      );

      await client.query('COMMIT');

      return {
        ok: true,
        ledgerId: params.id,
        staffAction: body.staffAction,
        outcome: body.outcome,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },
);

/* -------------------------------------------------------------------------- */
/* Error handling                                                             */
/* -------------------------------------------------------------------------- */

app.setErrorHandler(
  (
    error,
    req,
    reply,
  ) => {
    if (
      error instanceof z.ZodError
    ) {
      req.log.warn(
        {
          issues:
            error.issues,
        },
        'Request validation failed',
      );

      return reply
        .code(400)
        .send({
          error:
            'Invalid request',

          details:
            error.issues.map(
              issue => ({
                path:
                  issue.path.join(
                    '.',
                  ),

                message:
                  issue.message,
              }),
            ),
        });
    }

    /*
     * PostgreSQL unique constraint violations.
     *
     * This is particularly useful for idempotency races.
     */
    if (
      typeof error ===
        'object' &&
      error !== null &&
      'code' in error &&
      (error as {
        code?: string;
      }).code === '23505'
    ) {
      req.log.warn(
        {
          error,
        },
        'Database uniqueness conflict',
      );

      return reply
        .code(409)
        .send({
          error:
            'The request conflicts with an existing record.',
        });
    }

    req.log.error(
      {
        error,
        requestId:
          req.id,
      },
      'Unhandled API error',
    );

    return reply
      .code(500)
      .send({
        error:
          'Internal server error',
      });
  },
);

/* -------------------------------------------------------------------------- */
/* Startup                                                                    */
/* -------------------------------------------------------------------------- */

await app.listen({
  host:
    '0.0.0.0',

  port:
    apiPort,
});