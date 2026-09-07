import './env.js';

import Fastify, {
  type FastifyReply,
  type FastifyRequest
} from 'fastify';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rate from '@fastify/rate-limit';

import { z } from 'zod';
import crypto from 'node:crypto';

import { pool } from './db.js';

import {
  login,
  logout,
  user,
  setSessionCookie
} from './auth.js';

import {
  simulate,
  type Result as EngineResult
} from './engine.js';

/* -------------------------------------------------------------------------- */
/* Application                                                                */
/* -------------------------------------------------------------------------- */

const app = Fastify({
  logger: true,

  bodyLimit: 64 * 1024,

  requestIdHeader: 'x-request-id'
});

await app.register(cookie);

await app.register(cors, {
  origin:
    process.env.APP_ORIGIN ||
    'http://localhost:3000',

  credentials: true
});

await app.register(helmet, {
  contentSecurityPolicy: false
});

await app.register(rate, {
  max: 120,

  timeWindow: '1 minute'
});

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const APP_VERSION = '2.0.0';

const ENGINE_VERSION = '1.2';

const DEFAULT_MAX_DELAY = 30;

const DEFAULT_MAX_WAIT = 45;

const ACTIVE_APPOINTMENT_STATUSES = [
  'BOOKED',
  'CONFIRMED',
  'IN_PROGRESS'
] as const;

const TERMINAL_APPOINTMENT_STATUSES = [
  'CANCELLED',
  'NO_SHOW',
  'COMPLETED'
] as const;

/* -------------------------------------------------------------------------- */
/* Schemas                                                                    */
/* -------------------------------------------------------------------------- */

const uuid = z.string().uuid();

const decisionState = z.enum([
  'ACCEPT',
  'ACCEPT_WITH_WARNING',
  'WAIT',
  'RESCHEDULE'
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
    .max(200)
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
    .optional()
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
    .optional()
});

const acceptanceSchema = z.object({
  serviceId: uuid,

  stylistId: uuid,

  startAt: z
    .string()
    .datetime(),

  customerId: uuid.optional(),

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
    decisionState.optional()
});

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fail(
  reply: FastifyReply,
  statusCode: number,
  error: string
) {
  return reply
    .code(statusCode)
    .send({
      error
    });
}

function now() {
  return new Date();
}

function nowIso() {
  return now().toISOString();
}

function safeJson(value: unknown) {
  return JSON.stringify(value);
}

function minutesBetween(
  from: Date,
  to: Date
) {
  return Math.max(
    0,
    Math.round(
      (
        to.getTime() -
        from.getTime()
      ) / 60000
    )
  );
}

function addMinutes(
  date: Date,
  minutes: number
) {
  return new Date(
    date.getTime() +
      minutes * 60000
  );
}

function normalizeEmail(
  email: string
) {
  return email
    .trim()
    .toLowerCase();
}

function normalizeIdempotencyKey(
  key: string
) {
  return key.trim();
}

function hashIdempotencyKey(
  value: string
) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex');
}

/* -------------------------------------------------------------------------- */
/* Timezone helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * PostgreSQL timestamptz values represent an absolute instant.
 *
 * Salon opening/closing hours however are local wall-clock values.
 *
 * Therefore operating-hour validation must explicitly use
 * the salon timezone rather than the machine's timezone.
 */
function getLocalTimeParts(
  date: Date,
  timezone: string
) {
  const formatter =
    new Intl.DateTimeFormat(
      'en-GB',
      {
        timeZone: timezone,

        hour: '2-digit',
        minute: '2-digit',

        hourCycle: 'h23'
      }
    );

  const parts =
    formatter.formatToParts(date);

  const hour = Number(
    parts.find(
      part =>
        part.type === 'hour'
    )?.value ?? 0
  );

  const minute = Number(
    parts.find(
      part =>
        part.type === 'minute'
    )?.value ?? 0
  );

  return {
    hour,
    minute
  };
}

function localMinutes(
  date: Date,
  timezone: string
) {
  const parts =
    getLocalTimeParts(
      date,
      timezone
    );

  return (
    parts.hour * 60 +
    parts.minute
  );
}

function parseTime(
  value: string
) {
  const match =
    /^(\d{2}):(\d{2})/.exec(
      value
    );

  if (!match) {
    throw new Error(
      `Invalid database time value: ${value}`
    );
  }

  return {
    hour: Number(match[1]),
    minute: Number(match[2])
  };
}

function isWithinSalonHours(
  start: Date,
  end: Date,
  timezone: string,
  openTime: string,
  closeTime: string
) {
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
      timezone
    );

  const endMinutes =
    localMinutes(
      end,
      timezone
    );

  return (
    startMinutes >=
      openMinutes &&
    endMinutes <=
      closeMinutes
  );
}

/* -------------------------------------------------------------------------- */
/* Schedule pressure                                                          */
/* -------------------------------------------------------------------------- */

function getSchedulePressure(
  appointmentCount: number,
  activeStylists: number,
  openTime: string,
  closeTime: string
) {
  if (
    activeStylists <= 0
  ) {
    return {
      level: 'CRITICAL' as const,
      score: 100,
      label:
        'No active stylists'
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
      )
    );

  const capacity =
    activeStylists *
    (operatingMinutes / 60);

  const load =
    appointmentCount /
    Math.max(
      1,
      capacity
    );

  const score = Math.min(
    100,
    Math.max(
      0,
      Math.round(
        load * 100
      )
    )
  );

  if (load >= 0.9) {
    return {
      level: 'CRITICAL' as const,
      score,
      label:
        'Very high schedule pressure'
    };
  }

  if (load >= 0.7) {
    return {
      level: 'HIGH' as const,
      score,
      label:
        'High schedule pressure'
    };
  }

  if (load >= 0.45) {
    return {
      level: 'MODERATE' as const,
      score,
      label:
        'Moderate schedule pressure'
    };
  }

  return {
    level: 'LOW' as const,
    score: Math.max(
      5,
      score
    ),
    label:
      'Healthy available capacity'
  };
}

/* -------------------------------------------------------------------------- */
/* Decision messaging                                                         */
/* -------------------------------------------------------------------------- */

function getDecisionMessage(
  result: EngineResult | null
) {
  if (!result) {
    return {
      title:
        'No safe placement',

      message:
        'SALORA could not find a placement within the current operating limits.'
    };
  }

  switch (result.state) {
    case 'ACCEPT':
      return {
        title:
          'Accept this walk-in',

        message:
          'A safe immediate placement is available without delaying scheduled customers.'
      };

    case 'ACCEPT_WITH_WARNING':
      return {
        title:
          'Accept with warning',

        message:
          `This placement is feasible but may create up to ${Math.round(
            result.maxDelay
          )} minutes of downstream delay.`
      };

    case 'WAIT':
      return {
        title:
          'Ask the customer to wait',

        message:
          `A safer placement becomes available in ${Math.round(
            result.wait
          )} minutes.`
      };

    case 'RESCHEDULE':
      return {
        title:
          'Reschedule or offer another service',

        message:
          'No placement satisfies the current wait and delay limits.'
      };
  }
}

/* -------------------------------------------------------------------------- */
/* Engine data loading                                                        */
/* -------------------------------------------------------------------------- */

async function loadEngineSnapshot(
  client: {
    query: (
      text: string,
      values?: unknown[]
    ) => Promise<any>;
  },
  salonId: string,
  serviceId: string,
  requestedAt: Date
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
      WHERE id=$1
      `,
      [salonId]
    );

  const salon =
    salonResult.rows[0];

  if (!salon) {
    return {
      error: 'SALON_NOT_FOUND'
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
        id=$1
        AND salon_id=$2
        AND active=true
      `,
      [
        serviceId,
        salonId
      ]
    );

  const service =
    serviceResult.rows[0];

  if (!service) {
    return {
      error: 'SERVICE_NOT_FOUND'
    } as const;
  }

  const stylistResult =
    await client.query(
      `
      SELECT
        st.id,
        st.name
      FROM stylists st
      JOIN stylist_skills ss
        ON ss.stylist_id=st.id
      WHERE
        st.salon_id=$1
        AND st.active=true
        AND ss.service_id=$2
      ORDER BY st.name, st.id
      `,
      [
        salonId,
        serviceId
      ]
    );

  const stylists =
    stylistResult.rows;

  if (!stylists.length) {
    return {
      error:
        'NO_ELIGIBLE_STYLIST'
    } as const;
  }

  /*
   * Include only appointments relevant to the requested
   * decision day while preserving all active appointments.
   */
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
        salon_id=$1
        AND status = ANY($2::text[])
        AND scheduled_end >= $3
        AND scheduled_start < $3 + interval '1 day'
      ORDER BY
        stylist_id,
        scheduled_start,
        id
      `,
      [
        salonId,
        [...ACTIVE_APPOINTMENT_STATUSES],
        requestedAt
      ]
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
            appointment.scheduled_start
          ),

        end:
          new Date(
            appointment.scheduled_end
          ),

        status:
          appointment.status
      })
    );

  return {
    salon,
    service,
    stylists,
    appointments
  } as const;
}

/* -------------------------------------------------------------------------- */
/* Health                                                                     */
/* -------------------------------------------------------------------------- */

app.get(
  '/health',
  async () => ({
    ok: true,

    service:
      'salora-api',

    version:
      APP_VERSION,

    engineVersion:
      ENGINE_VERSION,

    time:
      nowIso()
  })
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
        timeWindow: '5 minutes'
      }
    }
  },
  async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    const body =
      loginSchema.parse(
        req.body
      );

    const email =
      normalizeEmail(
        body.email
      );

    const result =
      await login(
        email,
        body.password
      );

    if (!result) {
      /*
       * Do not reveal whether the email exists.
       */
      return fail(
        reply,
        401,
        'Invalid email or password'
      );
    }

    setSessionCookie(
      reply,
      result.token
    );

    return result.user;
  }
);

app.get(
  '/api/me',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest
  ) => {
    return (req as any).user;
  }
);

app.post(
  '/api/auth/logout',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    await logout(req, reply);

    reply.clearCookie(
      'salora_session',
      {
        path: '/'
      }
    );

    return {
      ok: true
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/dashboard',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    const authenticated =
      (req as any).user;

    if (
      !authenticated?.salonId
    ) {
      return fail(
        reply,
        401,
        'Authentication required.'
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
        WHERE id=$1
        `,
        [salonId]
      );

    const salon =
      salonResult.rows[0];

    if (!salon) {
      return fail(
        reply,
        404,
        'Salon not found.'
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
      walkInResult
    ] = await Promise.all([
      pool.query(
        `
        SELECT
          id,
          name,
          active
        FROM stylists
        WHERE salon_id=$1
        ORDER BY name, id
        `,
        [salonId]
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
        WHERE salon_id=$1
        ORDER BY name, id
        `,
        [salonId]
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
        JOIN services s
          ON s.id=a.service_id
        JOIN stylists st
          ON st.id=a.stylist_id
        LEFT JOIN customers c
          ON c.id=a.customer_id
        WHERE
          a.salon_id=$1
          AND a.scheduled_start >= now()-interval '2 hours'
          AND a.scheduled_start < now()+interval '24 hours'
        ORDER BY
          a.scheduled_start,
          a.id
        LIMIT 100
        `,
        [salonId]
      ),

      pool.query(
        `
        SELECT
          count(*)::int AS total
        FROM customers
        WHERE salon_id=$1
        `,
        [salonId]
      ),

      pool.query(
        `
        SELECT
          count(*)::int AS total
        FROM appointments
        WHERE
          salon_id=$1
          AND status='NO_SHOW'
          AND created_at >= date_trunc('month', now())
        `,
        [salonId]
      ),

      pool.query(
        `
        SELECT
          count(*)::int AS total
        FROM appointments
        WHERE
          salon_id=$1
          AND status='CANCELLED'
          AND created_at >= date_trunc('month', now())
        `,
        [salonId]
      ),

      pool.query(
        `
        SELECT
          COALESCE(
            SUM(s.price_inr),
            0
          )::int AS total
        FROM appointments a
        JOIN services s
          ON s.id=a.service_id
        WHERE
          a.salon_id=$1
          AND a.status IN(
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
                WHERE id=$1
              )
            )::date
        `,
        [salonId]
      ),

      pool.query(
        `
        SELECT
          count(*)::int AS total
        FROM walk_ins
        WHERE
          salon_id=$1
          AND status='WAITING'
        `,
        [salonId]
      )
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
          stylist.active
      ).length;

    const upcomingAppointments =
      appointments.filter(
        (appointment: {
          status: string;
        }) =>
          ACTIVE_APPOINTMENT_STATUSES.includes(
            appointment.status as
              typeof ACTIVE_APPOINTMENT_STATUSES[number]
          )
      );

    const schedulePressure =
      getSchedulePressure(
        upcomingAppointments.length,
        activeStylists,
        salon.open_time,
        salon.close_time
      );

    const bookedValue =
      upcomingAppointments.reduce(
        (
          total: number,
          appointment: {
            price_inr: number;
          }
        ) =>
          total +
          Number(
            appointment.price_inr ||
              0
          ),
        0
      );

    const completedToday =
      appointments.filter(
        (appointment: {
          status: string;
        }) =>
          appointment.status ===
          'COMPLETED'
      ).length;

    return {
      salon,

      stylists,

      services,

      appointments,

      customerCount:
        Number(
          customerCountResult
            .rows[0]?.total ?? 0
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
              .rows[0]?.total ?? 0
          ),

        noShowsThisMonth:
          Number(
            noShowResult
              .rows[0]?.total ?? 0
          ),

        cancellationsThisMonth:
          Number(
            cancelledResult
              .rows[0]?.total ?? 0
          ),

        waitingWalkIns:
          Number(
            walkInResult
              .rows[0]?.total ?? 0
          )
      }
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/customers',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest
  ) => {
    const authenticated =
      (req as any).user;

    const query =
      z.object({
        search: z
          .string()
          .trim()
          .max(80)
          .optional()
      }).parse(
        req.query
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
          salon_id=$1
          AND (
            name ILIKE $2
            OR COALESCE(phone,'')
              ILIKE $2
          )
        ORDER BY
          name,
          id
        LIMIT 50
        `,
        [
          authenticated.salonId,
          search
        ]
      );

    return result.rows;
  }
);

app.post(
  '/api/customers',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    const authenticated =
      (req as any).user;

    const body =
      customerSchema.parse(
        req.body
      );

    const result =
      await pool.query(
        `
        INSERT INTO customers(
          salon_id,
          name,
          phone
        )
        VALUES($1,$2,$3)
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
            null
        ]
      );

    return reply
      .code(201)
      .send(
        result.rows[0]
      );
  }
);

/* -------------------------------------------------------------------------- */
/* Appointments                                                               */
/* -------------------------------------------------------------------------- */

app.get(
  '/api/appointments',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest
  ) => {
    const authenticated =
      (req as any).user;

    const query =
      z.object({
        from: z
          .string()
          .datetime()
          .optional(),

        to: z
          .string()
          .datetime()
          .optional()
      }).parse(
        req.query
      );

    const from =
      query.from ||
      new Date(
        Date.now() -
          86400000
      ).toISOString();

    const to =
      query.to ||
      new Date(
        Date.now() +
          7 * 86400000
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
        'Appointment range must have from before to.'
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
        JOIN services s
          ON s.id=a.service_id
        JOIN stylists st
          ON st.id=a.stylist_id
        LEFT JOIN customers c
          ON c.id=a.customer_id
        WHERE
          a.salon_id=$1
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
          to
        ]
      );

    return result.rows;
  }
);

/* -------------------------------------------------------------------------- */
/* Walk-in simulation                                                         */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/walk-ins/simulate',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    const authenticated =
      (req as any).user;

    const body =
      simulationSchema.parse(
        req.body
      );

    const salonId =
      authenticated.salonId;

    const requestedAt =
      body.now
        ? new Date(body.now)
        : now();

    if (
      Number.isNaN(
        requestedAt.getTime()
      )
    ) {
      return fail(
        reply,
        400,
        'Invalid simulation time.'
      );
    }

    const snapshot =
      await loadEngineSnapshot(
        pool,
        salonId,
        body.serviceId,
        requestedAt
      );

    if (
      'error' in snapshot
    ) {
      if (
        snapshot.error ===
        'SALON_NOT_FOUND'
      ) {
        return fail(
          reply,
          404,
          'Salon not found.'
        );
      }

      if (
        snapshot.error ===
        'SERVICE_NOT_FOUND'
      ) {
        return fail(
          reply,
          404,
          'Service not found.'
        );
      }

      return fail(
        reply,
        409,
        'No active stylist is qualified for this service.'
      );
    }

    const {
      salon,
      service,
      stylists,
      appointments
    } = snapshot;

    const candidates =
      simulate({
        now:
          requestedAt,

        duration:
          Number(
            service.duration_min
          ),

        price:
          Number(
            service.price_inr
          ),

        buffer:
          Number(
            service.buffer_min
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
              stylist.id
          ),

        appointments
      }).filter(
        candidate =>
          isWithinSalonHours(
            candidate.start,
            candidate.end,
            salon.timezone,
            salon.open_time,
            salon.close_time
          )
      );

    const recommendation =
      candidates[0] ||
      null;

    /*
     * Persist simulation history.
     *
     * This is the beginning of SALORA's defensible
     * Decision History Dataset.
     */
    try {
      await pool.query(
        `
        INSERT INTO decision_simulations(
          salon_id,
          requested_at,
          engine_version,
          input,
          result
        )
        VALUES(
          $1,
          $2,
          $3,
          $4,
          $5
        )
        `,
        [
          salonId,

          requestedAt,

          ENGINE_VERSION,

          safeJson({
            serviceId:
              service.id,

            serviceName:
              service.name,

            customerName:
              body.customerName ||
              null,

            customerPhone:
              body.customerPhone ||
              null,

            requestedAt:
              requestedAt.toISOString()
          }),

          safeJson({
            recommendation,

            candidates:
              candidates.slice(
                0,
                8
              )
          })
        ]
      );
    } catch (error) {
      /*
       * Simulation remains available even if history
       * persistence temporarily fails.
       */
      req.log.warn(
        {
          error
        },
        'Decision simulation history persistence failed'
      );
    }

    return {
      recommendation,

      candidates:
        candidates.slice(
          0,
          8
        ),

      decision:
        getDecisionMessage(
          recommendation
        ),

      meta: {
        service:
          service.name,

        duration:
          Number(
            service.duration_min
          ),

        price:
          Number(
            service.price_inr
          ),

        buffer:
          Number(
            service.buffer_min
          ),

        timezone:
          salon.timezone,

        engineVersion:
          ENGINE_VERSION,

        generatedAt:
          nowIso()
      }
    };
  }
);

/* -------------------------------------------------------------------------- */
/* Walk-in acceptance                                                         */
/* -------------------------------------------------------------------------- */

app.post(
  '/api/walk-ins/accept',
  {
    preHandler: user
  },
  async (
    req: FastifyRequest,
    reply: FastifyReply
  ) => {
    const authenticated =
      (req as any).user;

    if (
      !authenticated?.salonId ||
      !authenticated?.id
    ) {
      return fail(
        reply,
        401,
        'Authentication required.'
      );
    }

    const body =
      acceptanceSchema.parse(
        req.body
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
        'A valid Idempotency-Key is required.'
      );
    }

    const idempotencyKey =
      normalizeIdempotencyKey(
        rawIdempotencyKey
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
        'A valid Idempotency-Key is required.'
      );
    }

    const idempotencyFingerprint =
      hashIdempotencyKey(
        idempotencyKey
      );

    const salonId =
      authenticated.salonId;

    const userId =
      authenticated.id;

    const client =
      await pool.connect();

    try {
      await client.query(
        'BEGIN'
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
            salon_id=$1
            AND user_id=$2
            AND key=$3
          FOR UPDATE
          `,
          [
            salonId,
            userId,
            idempotencyKey
          ]
        );

      if (
        existing.rows[0]
      ) {
        await client.query(
          'COMMIT'
        );

        return existing.rows[0]
          .response;
      }

      /* -------------------------------------------------------------------- */
      /* Salon lock                                                            */
      /* -------------------------------------------------------------------- */

      /*
       * The salon row acts as the serialization point for
       * competing walk-in acceptance requests.
       *
       * This prevents two receptionists from simultaneously
       * accepting the same scarce schedule capacity.
       */
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
          WHERE id=$1
          FOR UPDATE
          `,
          [salonId]
        );

      const salon =
        salonResult.rows[0];

      if (!salon) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          404,
          'Salon not found.'
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
            id=$1
            AND salon_id=$2
            AND active=true
          `,
          [
            body.serviceId,
            salonId
          ]
        );

      const service =
        serviceResult.rows[0];

      if (!service) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          404,
          'Service not found.'
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
          JOIN stylist_skills ss
            ON ss.stylist_id=st.id
          WHERE
            st.id=$1
            AND st.salon_id=$2
            AND st.active=true
            AND ss.service_id=$3
          `,
          [
            body.stylistId,
            salonId,
            body.serviceId
          ]
        );

      const stylist =
        stylistResult.rows[0];

      if (!stylist) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          'Stylist is not eligible for this service.'
        );
      }

      /* -------------------------------------------------------------------- */
      /* Time                                                                  */
      /* -------------------------------------------------------------------- */

      const start =
        new Date(
          body.startAt
        );

      if (
        Number.isNaN(
          start.getTime()
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          400,
          'Invalid start time.'
        );
      }

      const end =
        addMinutes(
          start,
          Number(
            service.duration_min
          )
        );

      if (
        !isWithinSalonHours(
          start,
          end,
          salon.timezone,
          salon.open_time,
          salon.close_time
        )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          'The selected placement is outside salon operating hours.'
        );
      }

      /* -------------------------------------------------------------------- */
      /* Customer                                                              */
      /* -------------------------------------------------------------------- */

      let customerId =
        body.customerId;

      if (
        customerId
      ) {
        const customer =
          await client.query(
            `
            SELECT
              id
            FROM customers
            WHERE
              id=$1
              AND salon_id=$2
            `,
            [
              customerId,
              salonId
            ]
          );

        if (
          !customer.rows[0]
        ) {
          await client.query(
            'ROLLBACK'
          );

          return fail(
            reply,
            400,
            'Customer does not belong to this salon.'
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
            INSERT INTO customers(
              salon_id,
              name,
              phone
            )
            VALUES(
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
                null
            ]
          );

        customerId =
          customer.rows[0].id;
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
            salon_id=$1
            AND status = ANY($2::text[])
            AND scheduled_end >= $3
            AND scheduled_start < $3 + interval '1 day'
          ORDER BY
            stylist_id,
            scheduled_start,
            id
          `,
          [
            salonId,

            [
              ...ACTIVE_APPOINTMENT_STATUSES
            ],

            start
          ]
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
                appointment.scheduled_start
              ),

            end:
              new Date(
                appointment.scheduled_end
              ),

            status:
              appointment.status
          })
        );

      /* -------------------------------------------------------------------- */
      /* Direct conflict check                                                 */
      /* -------------------------------------------------------------------- */

      const conflict =
        await client.query(
          `
          SELECT
            id
          FROM appointments
          WHERE
            salon_id=$1
            AND stylist_id=$2
            AND status = ANY($3::text[])
            AND scheduled_start < $4
            AND scheduled_end > $5
          LIMIT 1
          `,
          [
            salonId,

            body.stylistId,

            [
              ...ACTIVE_APPOINTMENT_STATUSES
            ],

            end,

            start
          ]
        );

      if (
        conflict.rows[0]
      ) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          'The schedule changed. Simulate again before accepting.'
        );
      }

      /* -------------------------------------------------------------------- */
      /* Fresh Decision Engine verification                                    */
      /* -------------------------------------------------------------------- */

      const candidates =
        simulate({
          now:
            now(),

          duration:
            Number(
              service.duration_min
            ),

          price:
            Number(
              service.price_inr
            ),

          buffer:
            Number(
              service.buffer_min
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
                      appointment.stylistId
                  )
                  .concat(
                    body.stylistId
                  )
              )
            ],

          appointments
        }).filter(
          candidate =>
            isWithinSalonHours(
              candidate.start,
              candidate.end,
              salon.timezone,
              salon.open_time,
              salon.close_time
            )
        );

      const selected =
        candidates.find(
          candidate =>
            candidate.stylistId ===
              body.stylistId &&
            candidate.start.getTime() ===
              start.getTime()
        );

      if (!selected) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          'This placement is no longer approved by SALORA. Simulate again before accepting.'
        );
      }

      /*
       * Never trust a client-provided decision state.
       *
       * The server uses the freshly recomputed engine result.
       */
      const actualDecisionState =
        selected.state;

      if (
        actualDecisionState ===
        'RESCHEDULE'
      ) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          'SALORA recommends rescheduling this walk-in.'
        );
      }

      /*
       * A WAIT recommendation must actually represent
       * a future placement.
       */
      if (
        actualDecisionState ===
        'WAIT'
      ) {
        const wait =
          minutesBetween(
            now(),
            start
          );

        if (
          wait <= 0 ||
          wait >
            DEFAULT_MAX_WAIT
        ) {
          await client.query(
            'ROLLBACK'
          );

          return fail(
            reply,
            409,
            'The selected WAIT placement is outside the allowed waiting window.'
          );
        }
      }

      /*
       * Client cannot downgrade/upgrade the engine decision.
       */
      if (
        body.decisionState &&
        body.decisionState !==
          actualDecisionState
      ) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          'The decision changed. Simulate again before accepting.'
        );
      }

      /* -------------------------------------------------------------------- */
      /* Buffer verification                                                   */
      /* -------------------------------------------------------------------- */

      const previous =
        appointments
          .filter(
            appointment =>
              appointment.stylistId ===
                body.stylistId &&
              appointment.end.getTime() <=
                start.getTime()
          )
          .sort(
            (a, b) =>
              b.end.getTime() -
              a.end.getTime()
          )[0];

      if (
        previous
      ) {
        const earliest =
          addMinutes(
            previous.end,
            Number(
              service.buffer_min
            )
          );

        if (
          start.getTime() <
          earliest.getTime()
        ) {
          await client.query(
            'ROLLBACK'
          );

          return fail(
            reply,
            409,
            `The placement violates the required ${service.buffer_min}-minute service buffer.`
          );
        }
      }

      /* -------------------------------------------------------------------- */
      /* Fresh downstream impact                                               */
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
                start.getTime()
          )
          .sort(
            (a, b) =>
              a.start.getTime() -
                b.start.getTime() ||
              a.id.localeCompare(
                b.id
              )
          );

      for (
        const appointment
        of downstream
      ) {
        if (
          cursor.getTime() >
          appointment.start.getTime()
        ) {
          const delay =
            minutesBetween(
              appointment.start,
              cursor
            );

          totalDelay +=
            delay;

          maximumDelay =
            Math.max(
              maximumDelay,
              delay
            );

          affectedAppointments +=
            1;

          cursor =
            addMinutes(
              appointment.end,
              delay
            );
        } else {
          cursor =
            new Date(
              appointment.end
            );
        }
      }

      if (
        maximumDelay >
        DEFAULT_MAX_DELAY
      ) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          `Current schedule would create ${maximumDelay} minutes of downstream delay. Simulate again.`
        );
      }

      /*
       * Verify the database-level impact matches the engine result.
       */
      if (
        Math.round(
          selected.maxDelay
        ) !==
          Math.round(
            maximumDelay
          )
      ) {
        await client.query(
          'ROLLBACK'
        );

        return fail(
          reply,
          409,
          'Schedule impact changed during validation. Simulate again.'
        );
      }

      /* -------------------------------------------------------------------- */
      /* Appointment creation                                                  */
      /* -------------------------------------------------------------------- */

      const appointmentResultInsert =
        await client.query(
          `
          INSERT INTO appointments(
            salon_id,
            customer_id,
            stylist_id,
            service_id,
            scheduled_start,
            scheduled_end,
            status,
            source
          )
          VALUES(
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
            end
          ]
        );

      const appointment =
        appointmentResultInsert
          .rows[0];

      /* -------------------------------------------------------------------- */
      /* Walk-in creation                                                      */
      /* -------------------------------------------------------------------- */

      const walkInResult =
        await client.query(
          `
          INSERT INTO walk_ins(
            salon_id,
            customer_id,
            service_id,
            status,
            decision_state
          )
          VALUES(
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

            actualDecisionState
          ]
        );

      const walkIn =
        walkInResult.rows[0];

      /* -------------------------------------------------------------------- */
      /* Response                                                              */
      /* -------------------------------------------------------------------- */

      const response = {
        ok: true,

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
              service.price_inr
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
            service.name
        }
      };

      /* -------------------------------------------------------------------- */
      /* Idempotency persistence                                               */
      /* -------------------------------------------------------------------- */

      await client.query(
        `
        INSERT INTO idempotency_keys(
          salon_id,
          user_id,
          key,
          response
        )
        VALUES(
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
            response
          )
        ]
      );

      /* -------------------------------------------------------------------- */
      /* Audit                                                                 */
      /* -------------------------------------------------------------------- */

      await client.query(
        `
        INSERT INTO audit_events(
          salon_id,
          actor_id,
          event_type,
          entity_type,
          entity_id,
          metadata
        )
        VALUES(
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
                service.price_inr
              ),

            totalDelay,

            maximumDelay,

            affectedAppointments,

            engineVersion:
              ENGINE_VERSION,

            idempotencyFingerprint
          })
        ]
      );

      /* -------------------------------------------------------------------- */
      /* Notification outbox                                                  */
      /* -------------------------------------------------------------------- */

      await client.query(
        `
        INSERT INTO notifications(
          salon_id,
          channel,
          recipient,
          payload
        )
        VALUES(
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
              actualDecisionState
          })
        ]
      );

      /* -------------------------------------------------------------------- */
      /* Commit                                                                */
      /* -------------------------------------------------------------------- */

      await client.query(
        'COMMIT'
      );

      return response;
    } catch (error) {
      try {
        await client.query(
          'ROLLBACK'
        );
      } catch {
        // Rollback failure must not mask original error.
      }

      throw error;
    } finally {
      client.release();
    }
  }
);

/* -------------------------------------------------------------------------- */
/* Error handling                                                             */
/* -------------------------------------------------------------------------- */

app.setErrorHandler(
  (
    error,
    req,
    reply
  ) => {
    if (
      error instanceof z.ZodError
    ) {
      req.log.warn(
        {
          issues:
            error.issues
        },
        'Request validation failed'
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
                    '.'
                  ),

                message:
                  issue.message
              })
            )
        });
    }

    req.log.error(
      {
        error
      },
      'Unhandled API error'
    );

    return reply
      .code(500)
      .send({
        error:
          'Internal server error'
      });
  }
);

/* -------------------------------------------------------------------------- */
/* Startup                                                                    */
/* -------------------------------------------------------------------------- */

const port =
  Number(
    process.env.API_PORT ||
      4000
  );

if (
  !Number.isInteger(port) ||
  port < 1 ||
  port > 65535
) {
  throw new Error(
    'API_PORT must be a valid TCP port.'
  );
}

await app.listen({
  host:
    '0.0.0.0',

  port
});