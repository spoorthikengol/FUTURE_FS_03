# SALORA Quality Gate

## Product bar
- Signature workflow: walk-in request → simulation → explainable recommendation → acceptance.
- Recommendation states: ACCEPT, ACCEPT_WITH_WARNING, WAIT, RESCHEDULE.
- No generic booking-first positioning.

## Engineering bar
- TypeScript strict compilation.
- PostgreSQL-backed persistence.
- Server-side sessions with httpOnly cookies.
- Tenant-scoped queries through `salon_id`.
- Idempotency on acceptance.
- Transactional acceptance with salon row lock.
- Audit event and notification outbox on acceptance.
- Zod validation and centralized API error responses.
- Rate limiting, Helmet and bounded request body.

## Validation status
This release includes source-level hardening and automated engine tests. Full PostgreSQL/browser/concurrency execution must still be performed in a local or CI environment with dependencies installed. It is intentionally not represented as a production certification.
