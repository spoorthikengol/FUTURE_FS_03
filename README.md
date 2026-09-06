# SALORA — Real-Time Walk-In Decision Intelligence

**Don't guess. Know what to accept.**

SALORA is a salon operations platform built around one high-value decision: **can the front desk safely accept a walk-in right now without damaging the booked schedule?**

Instead of being another generic booking app, SALORA simulates candidate placements, propagates downstream delay and returns an explainable recommendation:

- **ACCEPT** — immediate placement with no scheduled-customer delay
- **WAIT** — a safe later placement exists within the configured wait threshold
- **ACCEPT_WITH_WARNING** — feasible but causes bounded downstream delay
- **RESCHEDULE** — no placement satisfies the hard constraints

## What is inside

- Premium responsive public website
- Staff command center with live schedule and decision workspace
- PostgreSQL persistence with tenant-aware records
- Server-side sessions and Argon2id password verification
- RBAC-ready user roles
- Salon-scoped API queries
- Deterministic walk-in simulation engine
- Skill eligibility and buffer constraints
- Downstream cascade impact calculation
- Atomic walk-in acceptance with salon lock + idempotency
- Audit trail + notification outbox
- Customer creation/search API
- Appointment query API
- Zod request validation, rate limiting and Helmet
- Docker PostgreSQL 17 setup
- Engine unit tests
- Demo schedule seeded dynamically for every fresh database

## Stack

Next.js + React + TypeScript · Fastify · PostgreSQL · Argon2id · Zod · Tailwind-compatible CSS architecture · Docker

## Run locally

### Option A — Docker PostgreSQL (recommended)

```bash
docker compose up -d db
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

Open `http://localhost:3000` and use the seeded demo account:

`owner@salora.demo` / `Demo@12345`

API health: `http://localhost:4000/health`

### Option B — Existing PostgreSQL

Copy `.env.example` to `.env` and point `DATABASE_URL` to your PostgreSQL instance. Then run the migration and seed commands above.

## Quality gate

```bash
npm run typecheck
npm test
npm run build
```

A clean production deployment should also run browser tests, PostgreSQL integration tests, concurrency tests, accessibility checks and load tests in CI.

## Security notes

The application uses server-side sessions rather than JWTs, stores only a SHA-256 hash of the session token, validates requests with Zod, limits request body size and applies Helmet/rate limiting. Acceptance uses an idempotency key and a transaction-level salon lock.

For a real deployment: use a managed PostgreSQL database, rotate demo credentials, configure secure secrets, enable TLS, configure backups, add centralized logging/monitoring and run an independent security review.

## Demo story

1. Open the landing page.
2. Enter Staff Login.
3. Show the live schedule.
4. Choose a service in **Walk-In Decision Engine**.
5. Run the simulation.
6. Explain revenue, wait, maximum delay and affected appointments.
7. Accept a safe recommendation.
8. Refresh and show the appointment on the live schedule.

## Honest validation status

This release is engineered toward a production-grade 10/10 bar. Source-level hardening and project structure are included. The current build environment used for packaging did **not** have a completed dependency installation or a running PostgreSQL instance, so full runtime integration/browser/load validation is not claimed here. Run the quality gate in the provided Docker/PostgreSQL environment before calling the deployment production-certified.
