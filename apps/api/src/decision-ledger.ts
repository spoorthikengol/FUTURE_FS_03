import type { PoolClient } from "pg";

/**
 * SALORA Decision Outcome Ledger
 *
 * Purpose:
 * Persist the complete lifecycle of a SALORA decision:
 *
 *   OBSERVE
 *      ↓
 *   PREDICT
 *      ↓
 *   RECOMMEND
 *      ↓
 *   ACT
 *      ↓
 *   LEARN
 *
 * Important:
 * - recommendation_state is what SALORA recommended
 * - staff_action is what staff actually did
 * - outcome is what actually happened
 *
 * These values must remain separate.
 *
 * In particular:
 * an abandoned simulation must NOT automatically become REJECTED.
 */


/* ============================================================
   Types
   ============================================================ */

export const STAFF_ACTIONS = [
  "ACCEPT",
  "REJECT",
  "RESCHEDULE",
  "WAIT",
  "EXPIRE",
  "CANCEL",
] as const;

export type StaffAction = (typeof STAFF_ACTIONS)[number];


export const OUTCOMES = [
  "ACCEPTED",
  "REJECTED",
  "RESCHEDULED",
  "WAITED",
  "EXPIRED",
  "ABANDONED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
] as const;

export type DecisionOutcome = (typeof OUTCOMES)[number];


export type RecommendationState =
  | "ACCEPT"
  | "ACCEPT_WITH_WARNING"
  | "WAIT"
  | "RESCHEDULE";


export type LedgerEventType =
  | "RECOMMENDED"
  | "ACCEPTED"
  | "REJECTED"
  | "RESCHEDULED"
  | "WAITED"
  | "EXPIRED"
  | "ABANDONED"
  | "CANCELLED"
  | "APPOINTMENT_CREATED"
  | "COMPLETED"
  | "NO_SHOW"
  | "UPDATED";


export interface CreateDecisionOutcomeInput {
  salonId: string;

  simulationId: string;

  actorId?: string | null;

  serviceId: string;

  recommendationState: RecommendationState;

  recommendedStylistId?: string | null;

  recommendedStart?: string | Date | null;

  recommendedEnd?: string | Date | null;

  expectedRevenueInr?: number | null;

  expectedTotalDelayMin?: number;

  expectedMaxDelayMin?: number;

  expectedWaitMin?: number;

  expectedAffectedAppointments?: number;

  recommendationReason: string;

  staffAction?: StaffAction | null;

  outcome?: DecisionOutcome | null;

  appointmentId?: string | null;

  walkInId?: string | null;

  actualRevenueInr?: number | null;

  scheduleChanged?: boolean | null;

  recommendationFollowed?: boolean | null;

  actedBy?: string | null;

  actedAt?: string | Date | null;

  outcomeAt?: string | Date | null;
}


export interface DecisionOutcomeRow {
  id: string;

  salon_id: string;

  simulation_id: string;

  actor_id: string | null;

  service_id: string;

  recommendation_state: RecommendationState;

  recommended_stylist_id: string | null;

  recommended_start: string | Date | null;

  recommended_end: string | Date | null;

  expected_revenue_inr: number | null;

  expected_total_delay_min: number;

  expected_max_delay_min: number;

  expected_wait_min: number;

  expected_affected_appointments: number;

  recommendation_reason: string;

  staff_action: StaffAction | null;

  outcome: DecisionOutcome | null;

  appointment_id: string | null;

  walk_in_id: string | null;

  actual_revenue_inr: number | null;

  schedule_changed: boolean | null;

  recommendation_followed: boolean | null;

  acted_by: string | null;

  acted_at: string | Date | null;

  outcome_at: string | Date | null;

  created_at: string | Date;

  updated_at: string | Date;
}


export interface DecisionOutcomeEventRow {
  id: string;

  salon_id: string;

  decision_outcome_id: string;

  event_type: LedgerEventType;

  actor_id: string | null;

  metadata: Record<string, unknown>;

  created_at: string | Date;
}


/* ============================================================
   Compatibility mappings
   ============================================================ */

const ACTION_TO_OUTCOME: Record<
  StaffAction,
  DecisionOutcome
> = {
  ACCEPT: "ACCEPTED",
  REJECT: "REJECTED",
  RESCHEDULE: "RESCHEDULED",
  WAIT: "WAITED",
  EXPIRE: "EXPIRED",
  CANCEL: "CANCELLED",
};


const ACTION_TO_EVENT: Record<
  StaffAction,
  LedgerEventType
> = {
  ACCEPT: "ACCEPTED",
  REJECT: "REJECTED",
  RESCHEDULE: "RESCHEDULED",
  WAIT: "WAITED",
  EXPIRE: "EXPIRED",
  CANCEL: "CANCELLED",
};


const OUTCOME_TO_EVENT: Partial<
  Record<DecisionOutcome, LedgerEventType>
> = {
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  RESCHEDULED: "RESCHEDULED",
  WAITED: "WAITED",
  EXPIRED: "EXPIRED",
  ABANDONED: "ABANDONED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
};


/* ============================================================
   Utility helpers
   ============================================================ */

function nullableValue<T>(
  value: T | null | undefined,
): T | null {
  return value === undefined ? null : value;
}


function defaultNumber(
  value: number | undefined,
): number {
  return value ?? 0;
}


/* ============================================================
   Type guards
   ============================================================ */

export function isStaffAction(
  value: unknown,
): value is StaffAction {
  return (
    typeof value === "string" &&
    (STAFF_ACTIONS as readonly string[]).includes(value)
  );
}


export function isDecisionOutcome(
  value: unknown,
): value is DecisionOutcome {
  return (
    typeof value === "string" &&
    (OUTCOMES as readonly string[]).includes(value)
  );
}


/* ============================================================
   Mapping helpers
   ============================================================ */

export function outcomeForStaffAction(
  action: StaffAction,
): DecisionOutcome {
  return ACTION_TO_OUTCOME[action];
}


export function eventForStaffAction(
  action: StaffAction,
): LedgerEventType {
  return ACTION_TO_EVENT[action];
}


export function eventForOutcome(
  outcome: DecisionOutcome,
): LedgerEventType | null {
  return OUTCOME_TO_EVENT[outcome] ?? null;
}


/* ============================================================
   Terminal outcome
   ============================================================ */

export function isTerminalOutcome(
  outcome: DecisionOutcome | null | undefined,
): boolean {
  if (!outcome) {
    return false;
  }

  return [
    "ACCEPTED",
    "REJECTED",
    "RESCHEDULED",
    "EXPIRED",
    "ABANDONED",
    "CANCELLED",
    "COMPLETED",
    "NO_SHOW",
  ].includes(outcome);
}


/* ============================================================
   Action/outcome compatibility
   ============================================================ */

export function isCompatibleActionOutcome(
  action: StaffAction,
  outcome: DecisionOutcome,
): boolean {
  return ACTION_TO_OUTCOME[action] === outcome;
}


export function validateStaffActionOutcome(
  action: StaffAction,
  outcome: DecisionOutcome,
): void {
  if (!isCompatibleActionOutcome(action, outcome)) {
    throw new Error(
      `Staff action ${action} is not compatible with outcome ${outcome}`,
    );
  }
}


/* ============================================================
   Create Decision Outcome
   ============================================================ */

export async function createDecisionOutcome(
  client: PoolClient,
  input: CreateDecisionOutcomeInput,
): Promise<DecisionOutcomeRow> {
  if (!input.salonId) {
    throw new Error("salonId is required");
  }

  if (!input.simulationId) {
    throw new Error("simulationId is required");
  }

  if (!input.serviceId) {
    throw new Error("serviceId is required");
  }

  if (!input.recommendationState) {
    throw new Error(
      "recommendationState is required",
    );
  }

  if (!input.recommendationReason) {
    throw new Error(
      "recommendationReason is required",
    );
  }

  const result =
    await client.query<DecisionOutcomeRow>(
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

          recommendation_reason,

          staff_action,
          outcome,

          appointment_id,
          walk_in_id,

          actual_revenue_inr,
          schedule_changed,
          recommendation_followed,

          acted_by,
          acted_at,
          outcome_at
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,

          $5,

          $6,
          $7,
          $8,

          $9,
          $10,
          $11,
          $12,
          $13,

          $14,

          $15,
          $16,

          $17,
          $18,

          $19,
          $20,
          $21,

          $22,
          $23,
          $24
        )
        RETURNING *
      `,
      [
        input.salonId,

        input.simulationId,

        nullableValue(input.actorId),

        input.serviceId,

        input.recommendationState,

        nullableValue(
          input.recommendedStylistId,
        ),

        nullableValue(
          input.recommendedStart,
        ),

        nullableValue(
          input.recommendedEnd,
        ),

        nullableValue(
          input.expectedRevenueInr,
        ),

        defaultNumber(
          input.expectedTotalDelayMin,
        ),

        defaultNumber(
          input.expectedMaxDelayMin,
        ),

        defaultNumber(
          input.expectedWaitMin,
        ),

        defaultNumber(
          input.expectedAffectedAppointments,
        ),

        input.recommendationReason,

        nullableValue(input.staffAction),

        nullableValue(input.outcome),

        nullableValue(input.appointmentId),

        nullableValue(input.walkInId),

        nullableValue(input.actualRevenueInr),

        nullableValue(input.scheduleChanged),

        nullableValue(
          input.recommendationFollowed,
        ),

        nullableValue(input.actedBy),

        nullableValue(input.actedAt),

        nullableValue(input.outcomeAt),
      ],
    );

  const row = result.rows[0];

  if (!row) {
    throw new Error(
      "Failed to create decision outcome",
    );
  }

  return row;
}


/* ============================================================
   Record Ledger Event
   ============================================================ */

export async function recordLedgerEvent(
  client: PoolClient,
  params: {
    salonId: string;

    decisionOutcomeId: string;

    eventType: LedgerEventType;

    actorId?: string | null;

    metadata?: Record<string, unknown>;
  },
): Promise<DecisionOutcomeEventRow> {
  if (!params.salonId) {
    throw new Error("salonId is required");
  }

  if (!params.decisionOutcomeId) {
    throw new Error(
      "decisionOutcomeId is required",
    );
  }

  if (!params.eventType) {
    throw new Error("eventType is required");
  }

  const result =
    await client.query<DecisionOutcomeEventRow>(
      `
        INSERT INTO decision_outcome_events (
          salon_id,
          decision_outcome_id,
          event_type,
          actor_id,
          metadata
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          $5::jsonb
        )
        RETURNING *
      `,
      [
        params.salonId,

        params.decisionOutcomeId,

        params.eventType,

        nullableValue(params.actorId),

        JSON.stringify(
          params.metadata ?? {},
        ),
      ],
    );

  const row = result.rows[0];

  if (!row) {
    throw new Error(
      "Failed to record decision outcome event",
    );
  }

  return row;
}


/* ============================================================
   Create Outcome + Recommendation Event
   ============================================================ */

export async function createDecisionOutcomeWithEvent(
  client: PoolClient,
  input: CreateDecisionOutcomeInput,
): Promise<{
  outcome: DecisionOutcomeRow;

  event: DecisionOutcomeEventRow;
}> {
  const outcome =
    await createDecisionOutcome(
      client,
      input,
    );

  const event =
    await recordLedgerEvent(
      client,
      {
        salonId: input.salonId,

        decisionOutcomeId:
          outcome.id,

        eventType: "RECOMMENDED",

        actorId:
          input.actorId ?? null,

        metadata: {
          recommendationState:
            input.recommendationState,

          recommendedStylistId:
            input.recommendedStylistId ??
            null,

          recommendedStart:
            input.recommendedStart ??
            null,

          recommendedEnd:
            input.recommendedEnd ??
            null,

          expectedRevenueInr:
            input.expectedRevenueInr ??
            null,

          expectedTotalDelayMin:
            input.expectedTotalDelayMin ??
            0,

          expectedMaxDelayMin:
            input.expectedMaxDelayMin ??
            0,

          expectedWaitMin:
            input.expectedWaitMin ??
            0,

          expectedAffectedAppointments:
            input.expectedAffectedAppointments ??
            0,
        },
      },
    );

  return {
    outcome,
    event,
  };
}


/* ============================================================
   Get Outcome
   ============================================================ */

export async function getDecisionOutcome(
  client: PoolClient,
  salonId: string,
  decisionOutcomeId: string,
): Promise<DecisionOutcomeRow | null> {
  const result =
    await client.query<DecisionOutcomeRow>(
      `
        SELECT *
        FROM decision_outcomes
        WHERE salon_id = $1
          AND id = $2
        LIMIT 1
      `,
      [
        salonId,
        decisionOutcomeId,
      ],
    );

  return result.rows[0] ?? null;
}


/* ============================================================
   Get Outcome by Simulation
   ============================================================ */

export async function getDecisionOutcomeBySimulation(
  client: PoolClient,
  salonId: string,
  simulationId: string,
): Promise<DecisionOutcomeRow | null> {
  const result =
    await client.query<DecisionOutcomeRow>(
      `
        SELECT *
        FROM decision_outcomes
        WHERE salon_id = $1
          AND simulation_id = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [
        salonId,
        simulationId,
      ],
    );

  return result.rows[0] ?? null;
}


/* ============================================================
   List Outcomes
   ============================================================ */

export async function listDecisionOutcomes(
  client: PoolClient,
  params: {
    salonId: string;

    limit?: number;

    offset?: number;

    outcome?: DecisionOutcome | null;

    recommendationState?:
      | RecommendationState
      | null;

    staffAction?: StaffAction | null;
  },
): Promise<DecisionOutcomeRow[]> {
  const values: unknown[] = [
    params.salonId,
  ];

  const conditions: string[] = [
    "salon_id = $1",
  ];

  let parameterIndex = 2;


  if (params.outcome) {
    conditions.push(
      `outcome = $${parameterIndex}`,
    );

    values.push(params.outcome);

    parameterIndex += 1;
  }


  if (params.recommendationState) {
    conditions.push(
      `recommendation_state = $${parameterIndex}`,
    );

    values.push(
      params.recommendationState,
    );

    parameterIndex += 1;
  }


  if (params.staffAction) {
    conditions.push(
      `staff_action = $${parameterIndex}`,
    );

    values.push(params.staffAction);

    parameterIndex += 1;
  }


  const limit = Math.min(
    Math.max(
      params.limit ?? 50,
      1,
    ),
    200,
  );


  const offset = Math.max(
    params.offset ?? 0,
    0,
  );


  const limitParameter =
    parameterIndex;

  values.push(limit);

  parameterIndex += 1;


  const offsetParameter =
    parameterIndex;

  values.push(offset);


  const result =
    await client.query<DecisionOutcomeRow>(
      `
        SELECT *
        FROM decision_outcomes
        WHERE ${conditions.join(" AND ")}
        ORDER BY created_at DESC
        LIMIT $${limitParameter}
        OFFSET $${offsetParameter}
      `,
      values,
    );

  return result.rows;
}


/* ============================================================
   List Outcome Events
   ============================================================ */

export async function listDecisionOutcomeEvents(
  client: PoolClient,
  salonId: string,
  decisionOutcomeId: string,
): Promise<DecisionOutcomeEventRow[]> {
  const result =
    await client.query<DecisionOutcomeEventRow>(
      `
        SELECT *
        FROM decision_outcome_events
        WHERE salon_id = $1
          AND decision_outcome_id = $2
        ORDER BY created_at ASC
      `,
      [
        salonId,
        decisionOutcomeId,
      ],
    );

  return result.rows;
}


/* ============================================================
   Apply Staff Action
   ============================================================ */

export async function applyStaffAction(
  client: PoolClient,
  params: {
    salonId: string;

    decisionOutcomeId: string;

    actorId: string;

    action: StaffAction;

    outcome?: DecisionOutcome;

    appointmentId?: string | null;

    walkInId?: string | null;

    actualRevenueInr?: number | null;

    scheduleChanged?: boolean | null;

    recommendationFollowed?: boolean | null;

    metadata?: Record<string, unknown>;
  },
): Promise<{
  outcome: DecisionOutcomeRow;

  event: DecisionOutcomeEventRow;
}> {
  const current =
    await getDecisionOutcome(
      client,
      params.salonId,
      params.decisionOutcomeId,
    );


  if (!current) {
    throw new Error(
      "Decision outcome not found",
    );
  }


  if (isTerminalOutcome(current.outcome)) {
    throw new Error(
      `Decision outcome is already terminal: ${current.outcome}`,
    );
  }


  const outcome =
    params.outcome ??
    outcomeForStaffAction(
      params.action,
    );


  validateStaffActionOutcome(
    params.action,
    outcome,
  );


  const recommendationFollowed =
    params.recommendationFollowed ??
    (
      params.action ===
        "ACCEPT" &&
      (
        current.recommendation_state ===
          "ACCEPT" ||
        current.recommendation_state ===
          "ACCEPT_WITH_WARNING"
      )
    );


  const updateResult =
    await client.query<DecisionOutcomeRow>(
      `
        UPDATE decision_outcomes
        SET
          staff_action = $1,

          outcome = $2,

          appointment_id =
            COALESCE($3, appointment_id),

          walk_in_id =
            COALESCE($4, walk_in_id),

          actual_revenue_inr =
            COALESCE(
              $5,
              actual_revenue_inr
            ),

          schedule_changed =
            COALESCE(
              $6,
              schedule_changed
            ),

          recommendation_followed =
            $7,

          acted_by = $8,

          acted_at = now(),

          outcome_at = now()

        WHERE salon_id = $9
          AND id = $10

        RETURNING *
      `,
      [
        params.action,

        outcome,

        nullableValue(
          params.appointmentId,
        ),

        nullableValue(
          params.walkInId,
        ),

        nullableValue(
          params.actualRevenueInr,
        ),

        nullableValue(
          params.scheduleChanged,
        ),

        recommendationFollowed,

        params.actorId,

        params.salonId,

        params.decisionOutcomeId,
      ],
    );


  const updated =
    updateResult.rows[0];


  if (!updated) {
    throw new Error(
      "Failed to update decision outcome",
    );
  }


  const event =
    await recordLedgerEvent(
      client,
      {
        salonId:
          params.salonId,

        decisionOutcomeId:
          params.decisionOutcomeId,

        eventType:
          eventForStaffAction(
            params.action,
          ),

        actorId:
          params.actorId,

        metadata: {
          action:
            params.action,

          outcome,

          appointmentId:
            params.appointmentId ??
            null,

          walkInId:
            params.walkInId ??
            null,

          actualRevenueInr:
            params.actualRevenueInr ??
            null,

          scheduleChanged:
            params.scheduleChanged ??
            null,

          recommendationFollowed,

          ...(params.metadata ?? {}),
        },
      },
    );


  return {
    outcome: updated,

    event,
  };
}


/* ============================================================
   Record Actual Outcome
   ============================================================ */

export async function recordActualOutcome(
  client: PoolClient,
  params: {
    salonId: string;

    decisionOutcomeId: string;

    actorId?: string | null;

    outcome: DecisionOutcome;

    actualRevenueInr?: number | null;

    scheduleChanged?: boolean | null;

    appointmentId?: string | null;

    walkInId?: string | null;

    metadata?: Record<string, unknown>;
  },
): Promise<{
  outcome: DecisionOutcomeRow;

  event: DecisionOutcomeEventRow;
}> {
  const current =
    await getDecisionOutcome(
      client,
      params.salonId,
      params.decisionOutcomeId,
    );


  if (!current) {
    throw new Error(
      "Decision outcome not found",
    );
  }


  if (
    current.outcome &&
    current.outcome !==
      params.outcome
  ) {
    throw new Error(
      `Decision outcome already recorded as ${current.outcome}`,
    );
  }


  const updateResult =
    await client.query<DecisionOutcomeRow>(
      `
        UPDATE decision_outcomes
        SET

          outcome = $1,

          actual_revenue_inr =
            COALESCE(
              $2,
              actual_revenue_inr
            ),

          schedule_changed =
            COALESCE(
              $3,
              schedule_changed
            ),

          appointment_id =
            COALESCE(
              $4,
              appointment_id
            ),

          walk_in_id =
            COALESCE(
              $5,
              walk_in_id
            ),

          outcome_at = now()

        WHERE salon_id = $6
          AND id = $7

        RETURNING *
      `,
      [
        params.outcome,

        nullableValue(
          params.actualRevenueInr,
        ),

        nullableValue(
          params.scheduleChanged,
        ),

        nullableValue(
          params.appointmentId,
        ),

        nullableValue(
          params.walkInId,
        ),

        params.salonId,

        params.decisionOutcomeId,
      ],
    );


  const updated =
    updateResult.rows[0];


  if (!updated) {
    throw new Error(
      "Failed to record actual outcome",
    );
  }


  const eventType =
    eventForOutcome(
      params.outcome,
    );


  if (!eventType) {
    throw new Error(
      `No event mapping exists for outcome ${params.outcome}`,
    );
  }


  const event =
    await recordLedgerEvent(
      client,
      {
        salonId:
          params.salonId,

        decisionOutcomeId:
          params.decisionOutcomeId,

        eventType,

        actorId:
          params.actorId ??
          null,

        metadata: {
          outcome:
            params.outcome,

          actualRevenueInr:
            params.actualRevenueInr ??
            null,

          scheduleChanged:
            params.scheduleChanged ??
            null,

          appointmentId:
            params.appointmentId ??
            null,

          walkInId:
            params.walkInId ??
            null,

          ...(params.metadata ?? {}),
        },
      },
    );


  return {
    outcome: updated,

    event,
  };
}


/* ============================================================
   Set Recommendation Followed
   ============================================================ */

export async function setRecommendationFollowed(
  client: PoolClient,
  params: {
    salonId: string;

    decisionOutcomeId: string;

    actorId?: string | null;

    followed: boolean;

    metadata?: Record<string, unknown>;
  },
): Promise<DecisionOutcomeRow> {
  const result =
    await client.query<DecisionOutcomeRow>(
      `
        UPDATE decision_outcomes

        SET
          recommendation_followed = $1

        WHERE salon_id = $2
          AND id = $3

        RETURNING *
      `,
      [
        params.followed,

        params.salonId,

        params.decisionOutcomeId,
      ],
    );


  const row =
    result.rows[0];


  if (!row) {
    throw new Error(
      "Decision outcome not found",
    );
  }


  await recordLedgerEvent(
    client,
    {
      salonId:
        params.salonId,

      decisionOutcomeId:
        params.decisionOutcomeId,

      eventType: "UPDATED",

      actorId:
        params.actorId ??
        null,

      metadata: {
        recommendationFollowed:
          params.followed,

        ...(params.metadata ?? {}),
      },
    },
  );


  return row;
}


/* ============================================================
   Mark Decision Accepted
   ============================================================ */

export async function markDecisionAccepted(
  client: PoolClient,
  params: {
    salonId: string;

    decisionOutcomeId: string;

    actorId: string;

    appointmentId: string;

    walkInId?: string | null;

    actualRevenueInr?: number | null;

    scheduleChanged?: boolean;
  },
): Promise<{
  outcome: DecisionOutcomeRow;

  actionEvent: DecisionOutcomeEventRow;

  appointmentEvent: DecisionOutcomeEventRow;
}> {
  const current =
    await getDecisionOutcome(
      client,
      params.salonId,
      params.decisionOutcomeId,
    );


  if (!current) {
    throw new Error(
      "Decision outcome not found",
    );
  }


  if (isTerminalOutcome(current.outcome)) {
    throw new Error(
      `Decision outcome is already terminal: ${current.outcome}`,
    );
  }


  const recommendationFollowed =
    current.recommendation_state ===
      "ACCEPT" ||
    current.recommendation_state ===
      "ACCEPT_WITH_WARNING";


  const updatedResult =
    await client.query<DecisionOutcomeRow>(
      `
        UPDATE decision_outcomes

        SET

          staff_action = 'ACCEPT',

          outcome = 'ACCEPTED',

          appointment_id = $1,

          walk_in_id =
            COALESCE(
              $2,
              walk_in_id
            ),

          actual_revenue_inr =
            COALESCE(
              $3,
              actual_revenue_inr
            ),

          schedule_changed =
            COALESCE(
              $4,
              schedule_changed
            ),

          recommendation_followed =
            $5,

          acted_by = $6,

          acted_at = now(),

          outcome_at = now()

        WHERE salon_id = $7
          AND id = $8

        RETURNING *
      `,
      [
        params.appointmentId,

        nullableValue(
          params.walkInId,
        ),

        nullableValue(
          params.actualRevenueInr,
        ),

        nullableValue(
          params.scheduleChanged,
        ),

        recommendationFollowed,

        params.actorId,

        params.salonId,

        params.decisionOutcomeId,
      ],
    );


  const updated =
    updatedResult.rows[0];


  if (!updated) {
    throw new Error(
      "Failed to mark decision as accepted",
    );
  }


  const actionEvent =
    await recordLedgerEvent(
      client,
      {
        salonId:
          params.salonId,

        decisionOutcomeId:
          params.decisionOutcomeId,

        eventType: "ACCEPTED",

        actorId:
          params.actorId,

        metadata: {
          appointmentId:
            params.appointmentId,

          walkInId:
            params.walkInId ??
            null,

          actualRevenueInr:
            params.actualRevenueInr ??
            null,

          scheduleChanged:
            params.scheduleChanged ??
            null,

          recommendationState:
            current.recommendation_state,

          recommendationFollowed:
            updated.recommendation_followed,
        },
      },
    );


  const appointmentEvent =
    await recordLedgerEvent(
      client,
      {
        salonId:
          params.salonId,

        decisionOutcomeId:
          params.decisionOutcomeId,

        eventType:
          "APPOINTMENT_CREATED",

        actorId:
          params.actorId,

        metadata: {
          appointmentId:
            params.appointmentId,

          walkInId:
            params.walkInId ??
            null,
        },
      },
    );


  return {
    outcome: updated,

    actionEvent,

    appointmentEvent,
  };
}