# ReturnDesk Code Map & Rule Traceability

This document maps every source file in `ReturnDesk/` to its architectural responsibility, key exports, database interactions, and the specific business rules it enforces.

---

## 1. File Map

| File | Architectural Responsibility | Key Exports | Tables Touched | Rules Enforced |
|---|---|---|---|:---:|
| `src/lib/domain/constants.ts` | Domain vocabulary, string literal unions, and display labels. | `STATUSES`, `REASONS`, `RESOLUTIONS`, `STATUS_LABELS`, `REASON_LABELS`, `RESOLUTION_LABELS`, domain types | none | — |
| `src/lib/domain/lifecycle.ts` | Pure state-machine logic: allowable transitions, lock evaluation, and action permissions. | `TRANSITIONS`, `canTransition`, `isLocked`, `isRemovable`, `allowedActions` | none | 1, 4, 5 |
| `src/lib/validation/schemas.ts` | Strict Zod validation schemas for all incoming HTTP payloads and query parameters. | `createRequestSchema`, `updateRequestSchema`, `transitionSchema`, `noteSchema`, `listQuerySchema`, `SORT_FIELDS` | none | 1, 2, 4 |
| `src/lib/api/errors.ts` | Centralized domain error class and exhaustive error code constants. | `ApiError`, `ERROR_CODES`, `ErrorCode`, `ErrorEnvelope` | none | All |
| `src/lib/api/respond.ts` | Standard JSON response helpers, payload parsers, 405 handler, and top-level error wrapper. | `ok`, `created`, `noContent`, `methodNotAllowed`, `parseJsonBody`, `parseBody`, `parseQuery`, `withErrorHandling` | none | All |
| `src/lib/db.ts` | Neon PostgreSQL connection pooling, parameterized queries, and transaction management. | `query`, `withTransaction`, `getPool`, `closePool` | all | All |
| `src/lib/queries/requests.ts` | Raw SQL query definitions for return requests: where-clause builder, pagination, locking, and updates. | `buildWhereClause`, `findRequests`, `findRequestByReference`, `findRequestForUpdate`, `findLiveRequestByOrderAndSku`, `createRequestQuery`, `updateRequestQuery`, `transitionRequestQuery`, `softDeleteRequestQuery` | `return_requests` | 1, 2, 3, 4, 5 |
| `src/lib/queries/notes.ts` | Raw SQL query definitions for chronological note retrieval and insertion. | `findNotesByRequestId`, `insertNote` | `request_notes` | Notes append-only |
| `src/lib/services/requests.ts` | Service layer orchestrating domain operations, row locking (`FOR UPDATE`), duplicate checks, and transactions. | `listRequests`, `createRequest`, `getRequestDetail`, `updateRequest`, `transitionRequest`, `removeRequest`, `getRequestNotes`, `addRequestNote` | `return_requests`, `request_notes` | 1, 2, 3, 4, 5 |
| `src/app/api/requests/route.ts` | HTTP route handler for `GET` (list/filter/sort) and `POST` (create request), with 405 guards. | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `return_requests` | 3 |
| `src/app/api/requests/[reference]/route.ts` | HTTP route handler for `GET` (detail), `PATCH` (edit), and `DELETE` (soft remove), with 405 guards. | `GET`, `PATCH`, `DELETE`, `POST`, `PUT` | `return_requests`, `request_notes` | 3, 4, 5 |
| `src/app/api/requests/[reference]/transitions/route.ts` | HTTP route handler for `POST` (lifecycle status changes), with 405 guards. | `POST`, `GET`, `PUT`, `PATCH`, `DELETE` | `return_requests` | 1, 2 |
| `src/app/api/requests/[reference]/notes/route.ts` | HTTP route handler for `GET` (list notes) and `POST` (append note), with 405 guards. | `GET`, `POST`, `PUT`, `PATCH`, `DELETE` | `request_notes` | Notes timeline |
| `src/app/api/[...slug]/route.ts` | Catch-all route handler returning JSON 404 for unrecognized API endpoints. | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` | none | — |
| `db/migrate.ts` | Migration runner executing numbered `.sql` migration files in transactions. | Runner script | `schema_migrations` | Schema integrity |
| `db/seed.ts` | Deterministic database seeder generating 36 sample requests (100% status × reason combinations). | Seeder script | `return_requests`, `request_notes` | 1–5 |

---

## 2. Business Rule Traceability Matrix

Every business rule is enforced with a defense-in-depth model: the service layer acts as the authority returning structured, human-friendly API error envelopes, while PostgreSQL constraints provide absolute engine-level integrity.

| Rule | Description | Database Layer (Last Line of Defense) | Service Layer (Authority & Friendly Errors) | UI Layer (Convenience Only) | Verification Test |
|---|---|---|---|---|---|
| **Rule 1** | **Strict Status Flow**<br>`open` → `in_review` → (`approved` / `rejected`)<br>`approved` → `completed`<br>Terminal: `rejected`, `completed` | None (Service layer owns the state machine). | `lifecycle.ts › canTransition()`<br>`services/requests.ts › transitionRequest()`<br>Returns `409 INVALID_TRANSITION` | Buttons dynamically rendered from `allowedActions.transitions`. | `PROJECT_PLAN §19`<br>Rows 16–19, 25–26 |
| **Rule 2** | **Resolution & Refund Invariants**<br>Approved tickets require resolution.<br>`refund` requires positive amount.<br>`replacement` / `store_credit` forbid amount. | `return_requests` CHECK constraints:<br>`resolution_matches_status`<br>`refund_amount_matches_resolution` | `schemas.ts › transitionSchema`<br>`services/requests.ts › transitionRequest()`<br>Returns `422 RESOLUTION_REQUIRED`<br>or `422 RESOLUTION_NOT_ALLOWED` | Approve dialog prompts for resolution; amount input visible only when `refund` selected. | `PROJECT_PLAN §19`<br>Rows 20–24, 44 |
| **Rule 3** | **One Live Request Per Item**<br>At most one live request (`open`, `in_review`, `approved`) per order & SKU. Re-request allowed once closed. | `return_requests` partial unique index:<br>`one_live_request_per_order_item`<br>`ON (lower(order_number), lower(item_sku))` | `services/requests.ts › createRequest()`<br>`services/requests.ts › updateRequest()`<br>Catches Postgres error `23505` and returns `409 DUPLICATE_LIVE_REQUEST` with `existingReference` | Form displays banner linking to conflicting live reference. | `PROJECT_PLAN §19`<br>Rows 12–14, 32 |
| **Rule 4** | **Locked Once Decided**<br>Request details can only be edited while undecided (`open` or `in_review`). Once `approved`, `rejected`, or `completed`, fields are permanently locked. | None (Enforced via transaction and row lock). | `lifecycle.ts › isLocked()`<br>`services/requests.ts › updateRequest()`<br>Runs `SELECT ... FOR UPDATE` in transaction; returns `409 REQUEST_LOCKED` | Edit button hidden when `allowedActions.canEdit` is false. | `PROJECT_PLAN §19`<br>Row 29 |
| **Rule 5** | **Restricted Soft Removal**<br>Only `open` or `rejected` requests can be removed. Deleted tickets are excluded from list/fetch, but rows persist. | `return_requests` CHECK constraint:<br>`only_open_or_rejected_removed`<br>`request_notes` FK `ON DELETE RESTRICT` | `lifecycle.ts › isRemovable()`<br>`services/requests.ts › removeRequest()`<br>Sets `deleted_at = now()` inside transaction; returns `409 REMOVAL_NOT_ALLOWED` | Remove button hidden when `allowedActions.canRemove` is false. Confirmation dialog. | `PROJECT_PLAN §19`<br>Rows 33–36, 45 |
| **Notes** | **Append-Only Timeline**<br>Notes can be added at any status, but can never be modified or deleted. | `request_notes` trigger:<br>`request_notes_append_only`<br>Function `forbid_note_changes()` raises error `P0001` on UPDATE/DELETE | `services/requests.ts › addRequestNote()`<br>No PATCH or DELETE endpoints exist for notes. | Notes list displays author and timestamp; no edit or delete controls. | `PROJECT_PLAN §19`<br>Rows 37–39, 42 |
