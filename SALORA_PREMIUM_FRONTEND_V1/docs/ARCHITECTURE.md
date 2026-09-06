# Architecture
Browser → Next.js → Fastify → PostgreSQL.
The decision engine is deterministic and explainable for the MVP. Acceptance uses a transaction, salon row lock and idempotency key. Tenant identity is carried through salon_id on application queries.
