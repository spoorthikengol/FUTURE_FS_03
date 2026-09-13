-- ============================================================
-- SALORA — Decision Outcome Ledger
-- Migration: 003
--
-- Purpose:
--   Persist the difference between:
--     1. What SALORA recommended
--     2. What staff actually did
--     3. What actually happened afterward
--
-- This enables:
--   Observe → Predict → Recommend → Act → Learn
--
-- Important:
--   An abandoned simulation is NOT automatically a rejection.
--   Recommendation and real-world outcome remain separate.
-- ============================================================


BEGIN;


-- ============================================================
-- 1. Tenant-safe unique indexes
--
-- PostgreSQL foreign keys that include salon_id require a
-- matching UNIQUE/PRIMARY KEY constraint on the referenced
-- columns. These indexes make cross-tenant references impossible
-- at the database level when used with composite FKs below.
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    decision_simulations_salon_id_id_uidx
ON decision_simulations(salon_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS
    users_salon_id_id_uidx
ON users(salon_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS
    services_salon_id_id_uidx
ON services(salon_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS
    stylists_salon_id_id_uidx
ON stylists(salon_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS
    appointments_salon_id_id_uidx
ON appointments(salon_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS
    walk_ins_salon_id_id_uidx
ON walk_ins(salon_id, id);


-- ============================================================
-- 2. Decision Outcome Ledger
-- ============================================================

CREATE TABLE IF NOT EXISTS decision_outcomes(

    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    salon_id uuid NOT NULL
        REFERENCES salons(id)
        ON DELETE CASCADE,


    -- --------------------------------------------------------
    -- Source simulation
    -- --------------------------------------------------------

    simulation_id uuid NOT NULL,

    CONSTRAINT decision_outcomes_simulation_fk
        FOREIGN KEY(salon_id, simulation_id)
        REFERENCES decision_simulations(salon_id, id)
        ON DELETE RESTRICT,


    -- --------------------------------------------------------
    -- Actor who created/owns the decision record
    -- --------------------------------------------------------

    actor_id uuid,

    CONSTRAINT decision_outcomes_actor_fk
        FOREIGN KEY(salon_id, actor_id)
        REFERENCES users(salon_id, id)
        ON DELETE SET NULL,


    -- --------------------------------------------------------
    -- Requested service
    -- --------------------------------------------------------

    service_id uuid NOT NULL,

    CONSTRAINT decision_outcomes_service_fk
        FOREIGN KEY(salon_id, service_id)
        REFERENCES services(salon_id, id)
        ON DELETE RESTRICT,


    -- --------------------------------------------------------
    -- SALORA recommendation
    -- --------------------------------------------------------

    recommendation_state text NOT NULL CHECK(
        recommendation_state IN(
            'ACCEPT',
            'ACCEPT_WITH_WARNING',
            'WAIT',
            'RESCHEDULE'
        )
    ),

    recommended_stylist_id uuid,

    CONSTRAINT decision_outcomes_recommended_stylist_fk
        FOREIGN KEY(salon_id, recommended_stylist_id)
        REFERENCES stylists(salon_id, id)
        ON DELETE SET NULL,

    recommended_start timestamptz,

    recommended_end timestamptz,


    -- --------------------------------------------------------
    -- Predicted impact
    -- --------------------------------------------------------

    expected_revenue_inr integer
        CHECK(expected_revenue_inr IS NULL OR expected_revenue_inr >= 0),

    expected_total_delay_min integer NOT NULL DEFAULT 0
        CHECK(expected_total_delay_min >= 0),

    expected_max_delay_min integer NOT NULL DEFAULT 0
        CHECK(expected_max_delay_min >= 0),

    expected_wait_min integer NOT NULL DEFAULT 0
        CHECK(expected_wait_min >= 0),

    expected_affected_appointments integer NOT NULL DEFAULT 0
        CHECK(expected_affected_appointments >= 0),

    recommendation_reason text NOT NULL,


    -- --------------------------------------------------------
    -- What staff actually decided
    --
    -- This is deliberately separate from recommendation_state.
    -- SALORA can recommend ACCEPT while staff chooses WAIT.
    -- --------------------------------------------------------

    staff_action text CHECK(
        staff_action IS NULL
        OR staff_action IN(
            'ACCEPT',
            'REJECT',
            'RESCHEDULE',
            'WAIT',
            'EXPIRE',
            'CANCEL'
        )
    ),


    -- --------------------------------------------------------
    -- Actual outcome
    --
    -- ABANDONED is separate from REJECTED.
    --
    -- Example:
    --   Staff never acted
    --   Customer left
    --   Browser was closed
    --
    -- This must NOT be silently converted into REJECTED.
    -- --------------------------------------------------------

    outcome text CHECK(
        outcome IS NULL
        OR outcome IN(
            'ACCEPTED',
            'REJECTED',
            'RESCHEDULED',
            'WAITED',
            'EXPIRED',
            'ABANDONED',
            'CANCELLED',
            'COMPLETED',
            'NO_SHOW'
        )
    ),


    -- --------------------------------------------------------
    -- Resulting entities
    -- --------------------------------------------------------

    appointment_id uuid,

    CONSTRAINT decision_outcomes_appointment_fk
        FOREIGN KEY(salon_id, appointment_id)
        REFERENCES appointments(salon_id, id)
        ON DELETE SET NULL,

    walk_in_id uuid,

    CONSTRAINT decision_outcomes_walk_in_fk
        FOREIGN KEY(salon_id, walk_in_id)
        REFERENCES walk_ins(salon_id, id)
        ON DELETE SET NULL,


    -- --------------------------------------------------------
    -- Actual realized values
    -- --------------------------------------------------------

    actual_revenue_inr integer
        CHECK(actual_revenue_inr IS NULL OR actual_revenue_inr >= 0),

    schedule_changed boolean,

    recommendation_followed boolean,


    -- --------------------------------------------------------
    -- Action / outcome timestamps
    -- --------------------------------------------------------

    acted_by uuid,

    CONSTRAINT decision_outcomes_acted_by_fk
        FOREIGN KEY(salon_id, acted_by)
        REFERENCES users(salon_id, id)
        ON DELETE SET NULL,

    acted_at timestamptz,

    outcome_at timestamptz,


    -- --------------------------------------------------------
    -- Lifecycle timestamps
    -- --------------------------------------------------------

    created_at timestamptz NOT NULL DEFAULT now(),

    updated_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 3. Helpful indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS
    decision_outcomes_salon_created_idx
ON decision_outcomes(
    salon_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS
    decision_outcomes_salon_state_idx
ON decision_outcomes(
    salon_id,
    recommendation_state,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS
    decision_outcomes_salon_outcome_idx
ON decision_outcomes(
    salon_id,
    outcome,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS
    decision_outcomes_salon_staff_action_idx
ON decision_outcomes(
    salon_id,
    staff_action,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS
    decision_outcomes_simulation_idx
ON decision_outcomes(
    salon_id,
    simulation_id
);

CREATE INDEX IF NOT EXISTS
    decision_outcomes_appointment_idx
ON decision_outcomes(
    salon_id,
    appointment_id
);

CREATE INDEX IF NOT EXISTS
    decision_outcomes_walk_in_idx
ON decision_outcomes(
    salon_id,
    walk_in_id
);


-- ============================================================
-- 4. Decision Outcome Event History
--
-- One ledger row represents the decision lifecycle.
-- This table represents the individual transitions/events.
--
-- Example:
--
--   RECOMMENDED
--   ACCEPTED
--   APPOINTMENT_CREATED
--   COMPLETED
--
-- or:
--
--   RECOMMENDED
--   WAITED
--   ABANDONED
-- ============================================================

CREATE TABLE IF NOT EXISTS decision_outcome_events(

    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

    salon_id uuid NOT NULL
        REFERENCES salons(id)
        ON DELETE CASCADE,

    decision_outcome_id uuid NOT NULL
        REFERENCES decision_outcomes(id)
        ON DELETE CASCADE,

    event_type text NOT NULL CHECK(
        event_type IN(
            'RECOMMENDED',
            'ACCEPTED',
            'REJECTED',
            'RESCHEDULED',
            'WAITED',
            'EXPIRED',
            'ABANDONED',
            'CANCELLED',
            'APPOINTMENT_CREATED',
            'COMPLETED',
            'NO_SHOW',
            'UPDATED'
        )
    ),

    actor_id uuid,

    CONSTRAINT decision_outcome_events_actor_fk
        FOREIGN KEY(salon_id, actor_id)
        REFERENCES users(salon_id, id)
        ON DELETE SET NULL,

    metadata jsonb NOT NULL DEFAULT '{}',

    created_at timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 5. Event indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS
    decision_outcome_events_salon_created_idx
ON decision_outcome_events(
    salon_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS
    decision_outcome_events_outcome_created_idx
ON decision_outcome_events(
    decision_outcome_id,
    created_at ASC
);

CREATE INDEX IF NOT EXISTS
    decision_outcome_events_type_idx
ON decision_outcome_events(
    salon_id,
    event_type,
    created_at DESC
);


-- ============================================================
-- 6. updated_at trigger
-- ============================================================

CREATE OR REPLACE FUNCTION set_decision_outcome_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS
    decision_outcomes_updated_at_trigger
ON decision_outcomes;


CREATE TRIGGER
    decision_outcomes_updated_at_trigger
BEFORE UPDATE ON decision_outcomes
FOR EACH ROW
EXECUTE FUNCTION set_decision_outcome_updated_at();


-- ============================================================
-- 7. Protect historical decision events
--
-- Event history should be append-only.
-- Existing events cannot be modified or deleted.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_decision_outcome_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'decision_outcome_events are append-only and cannot be modified or deleted';
END;
$$;


DROP TRIGGER IF EXISTS
    decision_outcome_events_immutable_update
ON decision_outcome_events;


CREATE TRIGGER
    decision_outcome_events_immutable_update
BEFORE UPDATE OR DELETE ON decision_outcome_events
FOR EACH ROW
EXECUTE FUNCTION prevent_decision_outcome_event_mutation();


-- ============================================================
-- 8. Protect historical outcome rows from deletion
--
-- We intentionally do not make the whole ledger immutable
-- because the actual outcome is learned later.
--
-- UPDATE is allowed so:
--   recommendation -> action -> outcome
--
-- DELETE is prohibited.
-- ============================================================

CREATE OR REPLACE FUNCTION prevent_decision_outcome_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'decision_outcomes cannot be deleted because they form the decision history';
END;
$$;


DROP TRIGGER IF EXISTS
    decision_outcomes_prevent_delete
ON decision_outcomes;


CREATE TRIGGER
    decision_outcomes_prevent_delete
BEFORE DELETE ON decision_outcomes
FOR EACH ROW
EXECUTE FUNCTION prevent_decision_outcome_delete();


-- ============================================================
-- 9. Basic lifecycle consistency checks
-- ============================================================

ALTER TABLE decision_outcomes
DROP CONSTRAINT IF EXISTS decision_outcomes_action_timestamp_check;


ALTER TABLE decision_outcomes
ADD CONSTRAINT decision_outcomes_action_timestamp_check
CHECK(
    acted_at IS NULL
    OR staff_action IS NOT NULL
);


ALTER TABLE decision_outcomes
DROP CONSTRAINT IF EXISTS decision_outcomes_outcome_timestamp_check;


ALTER TABLE decision_outcomes
ADD CONSTRAINT decision_outcomes_outcome_timestamp_check
CHECK(
    outcome_at IS NULL
    OR outcome IS NOT NULL
);


ALTER TABLE decision_outcomes
DROP CONSTRAINT IF EXISTS decision_outcomes_followed_check;


ALTER TABLE decision_outcomes
ADD CONSTRAINT decision_outcomes_followed_check
CHECK(
    recommendation_followed IS NULL
    OR staff_action IS NOT NULL
);


-- ============================================================
-- 10. Prevent cross-tenant event references
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS
    decision_outcomes_salon_id_id_uidx
ON decision_outcomes(salon_id, id);

CREATE UNIQUE INDEX IF NOT EXISTS
    decision_outcome_events_salon_id_id_uidx
ON decision_outcome_events(salon_id, id);


-- ============================================================
-- Done
-- ============================================================

COMMIT;