CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS salons(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    timezone text NOT NULL DEFAULT 'Asia/Kolkata',
    currency text NOT NULL DEFAULT 'INR',
    open_time time NOT NULL DEFAULT '09:00',
    close_time time NOT NULL DEFAULT '21:00',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL CHECK(
        role IN (
            'SUPER_ADMIN',
            'SALON_OWNER',
            'RECEPTIONIST',
            'STYLIST'
        )
    ),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(salon_id,email)
);

CREATE TABLE IF NOT EXISTS stylists(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name text NOT NULL,
    duration_min int NOT NULL CHECK(
        duration_min > 0
        AND duration_min <= 600
    ),
    price_inr int NOT NULL CHECK(price_inr >= 0),
    buffer_min int NOT NULL DEFAULT 10 CHECK(
        buffer_min >= 0
        AND buffer_min <= 120
    ),
    active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(salon_id,name)
);

CREATE TABLE IF NOT EXISTS stylist_skills(
    stylist_id uuid REFERENCES stylists(id) ON DELETE CASCADE,
    service_id uuid REFERENCES services(id) ON DELETE CASCADE,
    PRIMARY KEY(stylist_id,service_id)
);

CREATE TABLE IF NOT EXISTS customers(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    name text NOT NULL,
    phone text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS appointments(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES customers(id),
    stylist_id uuid NOT NULL REFERENCES stylists(id),
    service_id uuid NOT NULL REFERENCES services(id),
    scheduled_start timestamptz NOT NULL,
    scheduled_end timestamptz NOT NULL,
    status text NOT NULL DEFAULT 'BOOKED' CHECK(
        status IN(
            'BOOKED',
            'CONFIRMED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED',
            'NO_SHOW'
        )
    ),
    source text NOT NULL DEFAULT 'BOOKING' CHECK(
        source IN(
            'BOOKING',
            'WALK_IN'
        )
    ),
    created_at timestamptz NOT NULL DEFAULT now(),
    CHECK(scheduled_end > scheduled_start)
);

CREATE INDEX IF NOT EXISTS appointments_salon_day_idx
    ON appointments(salon_id,scheduled_start);

CREATE INDEX IF NOT EXISTS appointments_stylist_time_idx
    ON appointments(stylist_id,scheduled_start);

CREATE TABLE IF NOT EXISTS walk_ins(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES customers(id),
    service_id uuid NOT NULL REFERENCES services(id),
    requested_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'WAITING' CHECK(
        status IN(
            'WAITING',
            'ACCEPTED',
            'COMPLETED',
            'DECLINED',
            'RESCHEDULED'
        )
    ),
    decision_state text CHECK(
        decision_state IN(
            'ACCEPT',
            'ACCEPT_WITH_WARNING',
            'WAIT',
            'RESCHEDULE'
        )
    )
);

CREATE TABLE IF NOT EXISTS decision_simulations(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    walk_in_id uuid REFERENCES walk_ins(id) ON DELETE CASCADE,
    requested_at timestamptz NOT NULL DEFAULT now(),
    engine_version text NOT NULL DEFAULT '1.0',
    input jsonb NOT NULL,
    result jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash text UNIQUE NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sessions_expiry_idx
    ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS audit_events(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES users(id),
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS idempotency_keys(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id),
    user_id uuid NOT NULL REFERENCES users(id),
    key text NOT NULL,
    response jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(salon_id,user_id,key)
);

CREATE TABLE IF NOT EXISTS notifications(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
    channel text NOT NULL,
    recipient text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'PENDING',
    attempts int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_salon_created_idx
    ON audit_events(salon_id,created_at DESC);