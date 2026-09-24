# ReturnDesk

> **Full-stack take-home assignment · 24 hours · Software Developer Intern (Frido)**  
> **Repository:** [https://github.com/Devrajsahani/ReturnDesk-Frido](https://github.com/Devrajsahani/ReturnDesk-Frido)  
> **Deployment Status:** Pre-deployment (Phase 4 in progress)

**ReturnDesk** is an internal web application designed for customer support agents at an online retail store to manage customer returns and replacements. When a customer reaches out regarding an order, a support agent uses this desk to raise a request, inspect its full history, transition it through a strict business lifecycle, select appropriate resolutions (Refund, Replacement, Store Credit), append immutable internal notes, and take settled or invalid requests off the desk without destroying historical records.

> **Clarification on Users & Authentication:**  
> An **"Agent"** refers exclusively to a human customer support employee using the website. There is no AI agent in the product, and there is no login or authentication system (anyone who opens the site acts as an agent, strictly per the assignment brief). The customer never accesses the site directly; the agent enters requests on the customer's behalf.

---

## 1. Technical Stack

- **Framework:** Next.js 16 (App Router with Turbopack)
- **Language:** TypeScript 5 (Strict mode enabled)
- **Database:** PostgreSQL (Neon Serverless with PgBouncer connection pooling)
- **Query Layer:** `pg` (node-postgres) with 100% hand-written parameterized SQL queries (zero ORM)
- **Validation:** Zod 3 (Strict schemas shared between API and frontend, zero duplicated validation logic)
- **Styling:** Tailwind CSS v4 with bespoke token system and zero third-party component kits
- **Typography:** `IBM Plex Sans` (Body, UI controls, tabular numerals) and `Outfit` (Headings, wordmark)
- **Deployment Platform:** Vercel (Production & Preview environments)

---

## 2. Running Locally from a Clean Clone

### Prerequisites
- **Node.js:** version 20.x or later installed
- **PostgreSQL:** version 14.x or later (local PostgreSQL instance, Docker container, or a cloud instance such as Neon)

### Step-by-Step Setup
```bash
# 1. Clone the repository and navigate into the project directory
git clone https://github.com/Devrajsahani/ReturnDesk-Frido.git
cd ReturnDesk-Frido

# 2. Install all dependencies
npm install

# 3. Configure environment variables
cp .env.example .env

# Edit .env and supply your PostgreSQL connection string:
# DATABASE_URL="postgresql://user:password@localhost:5432/returndesk"
# For Neon serverless databases, use the pooled connection string (-pooler).

# 4. Run database migrations (creates schema, check constraints, sequences, triggers)
npm run db:migrate

# 5. Seed sample data (populates 36 deterministic requests across all statuses and reasons)
npm run db:seed

# 6. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Verification Commands
```bash
# Run ESLint checks (0 errors, 0 warnings)
npm run lint

# Run TypeScript compilation checks (0 errors)
npm run typecheck

# Build optimized production bundle
npm run build
```

---

## 3. Architecture & Layering

The codebase enforces a strict unidirectional layered architecture:

```
HTTP Request
     │
     ▼
[Route Handlers] (`src/app/api/...`)
     │   - HTTP parsing, query params, method guards (JSON 405), response envelope
     ▼
[Service Layer] (`src/lib/services/...`)
     │   - Business rules, state machine, transactions (`withTransaction`), row locking (`FOR UPDATE`)
     ▼
[Query Layer] (`src/lib/queries/...`)
     │   - Pure parameterized SQL, dynamic WHERE clause builder, row-to-domain mapping
     ▼
[Database Connection] (`src/lib/db.ts`)
     │   - Connection pooling (`pg.Pool`), query helper, `server-only` boundary
     ▼
[PostgreSQL Database]
```

### Architectural Responsibilities:
1. **Route Handlers (`src/app/api/...`):**
   - Concerned purely with HTTP transport: parsing query parameters, extracting JSON bodies, validating parameter types, and invoking services.
   - Enforces uniform envelope formatting: `{ data, meta }` on success, `{ error: { code, message, details? } }` on failure.
   - Returns explicit JSON `405 METHOD_NOT_ALLOWED` for unhandled HTTP methods on API routes.
2. **Service Layer (`src/lib/services/...`):**
   - Owns business rules, lifecycle state validation, and transactional integrity.
   - Manages atomic transactions via `withTransaction(async (client) => ...)`.
   - Acquires row-level pessimistic locks (`SELECT ... FOR UPDATE`) before modifying or transitioning requests.
   - Computes `allowedActions` server-side so the UI never makes autonomous business legality decisions.
3. **Query Layer (`src/lib/queries/...`):**
   - Pure hand-written parameterized SQL. Never allows concatenated string queries.
   - Handles multi-criteria searching, status/reason array filtering, whitelisted sorting, and SQL pagination (`LIMIT`/`OFFSET`).
   - Maps raw database column names to strongly typed TypeScript domain models.
4. **Database Pool (`src/lib/db.ts`):**
   - Reusable `pg.Pool` with connection limits suited for serverless/pooled PostgreSQL.
   - Protected with `import 'server-only'` to guarantee zero database logic can ever leak into client bundles.

---

## 4. Database Schema & API Summary

### Database Schema Overview
The database uses two primary tables backed by rich PostgreSQL constraints:
- **`return_requests`**:
  - `id` (bigserial primary key), `reference` (text unique, e.g. `RD-00001` generated by sequence `return_requests_ref_seq`).
  - Customer information: `customer_name`, `customer_email`, `customer_phone`.
  - Item information: `order_number`, `item_sku`, `item_name`, `quantity` (CHECK `quantity > 0`).
  - Reason: `reason` (CHECK in `'damaged'`, `'wrong_item'`, `'size_issue'`, `'not_as_described'`, `'changed_mind'`).
  - Status: `status` (CHECK in `'open'`, `'in_review'`, `'approved'`, `'rejected'`, `'completed'`).
  - Resolution: `resolution` (CHECK in `'refund'`, `'replacement'`, `'store_credit'`, or NULL).
  - Financials: `refund_amount` (numeric(10,2)).
  - Soft-delete: `deleted_at` (timestamptz, NULL for active desk requests).
  - Business Constraints:
    - `resolution_matches_status`: `resolution` can only be non-NULL when `status = 'approved'`.
    - `refund_amount_matches_resolution`: `refund_amount` is required and positive if and only if `resolution = 'refund'`.
    - `only_open_or_rejected_removed`: `deleted_at` can only be non-NULL if `status IN ('open', 'rejected')`.
    - `one_live_request_per_order_item`: Partial unique index `ON (lower(order_number), lower(item_sku)) WHERE deleted_at IS NULL AND status IN ('open', 'in_review', 'approved')`.
- **`request_notes`**:
  - `id` (bigserial primary key), `request_id` (bigint foreign key `REFERENCES return_requests(id) ON DELETE RESTRICT`).
  - `author` (text), `body` (text), `created_at` (timestamptz).
  - Append-Only Trigger: `prevent_request_notes_mutation` raises PostgreSQL exception `P0001` if an `UPDATE` or `DELETE` statement is executed.

*For full column definitions, indexes, and constraint statements, see [docs/DATABASE.md](docs/DATABASE.md).*

### REST API Endpoints
All API endpoints live under `/api/requests` and adhere to strict HTTP semantics:

| Method | Endpoint | Description | Success | Error Codes |
|---|---|---|---|---|
| `GET` | `/api/requests` | List requests with search, multi-filters, sort, pagination | `200 OK` | `400 INVALID_QUERY` |
| `POST` | `/api/requests` | Raise a new return request (reference auto-generated) | `201 Created` (`Location` header) | `400 INVALID_JSON`, `409 DUPLICATE_LIVE_REQUEST`, `422 VALIDATION_FAILED` |
| `GET` | `/api/requests/:reference` | Fetch single request with notes and `allowedActions` | `200 OK` | `404 NOT_FOUND` |
| `PATCH` | `/api/requests/:reference` | Edit customer/item details (undecided only) | `200 OK` | `400 INVALID_JSON`, `404 NOT_FOUND`, `409 REQUEST_LOCKED`, `409 DUPLICATE_LIVE_REQUEST`, `422 VALIDATION_FAILED` |
| `POST` | `/api/requests/:reference/transitions` | Move lifecycle status (with resolution validation) | `200 OK` | `400 INVALID_JSON`, `404 NOT_FOUND`, `409 INVALID_TRANSITION`, `422 RESOLUTION_REQUIRED`, `422 RESOLUTION_NOT_ALLOWED` |
| `DELETE` | `/api/requests/:reference` | Soft-remove request from desk (`open` or `rejected` only) | `204 No Content` | `404 NOT_FOUND`, `409 REMOVAL_NOT_ALLOWED` |
| `GET` | `/api/requests/:reference/notes` | List chronological internal notes | `200 OK` | `404 NOT_FOUND` |
| `POST` | `/api/requests/:reference/notes` | Append an immutable internal note | `201 Created` | `400 INVALID_JSON`, `404 NOT_FOUND`, `422 VALIDATION_FAILED` |

*For complete request bodies, error envelopes, and curl examples, see [docs/API.md](docs/API.md).*

---

## 5. Business Rule Enforcement Matrix

Every business rule from the assignment brief is enforced on the server and backed by PostgreSQL constraints:

| Rule | Description | Database Layer (Last Line of Defense) | Service Layer (Authority & Friendly Errors) | UI Layer (Convenience Only) |
|---|---|---|---|---|
| **Rule 1: Status Flow** | `open` → `in_review` → (`approved` / `rejected`)<br>`approved` → `completed`<br>Terminal: `rejected`, `completed` | State machine ownership | `canTransition()` in `lifecycle.ts`; returns `409 INVALID_TRANSITION` | Action buttons rendered strictly from `allowedActions.transitions` |
| **Rule 2: Resolution Invariants** | Approved requests require a resolution (`refund`, `replacement`, `store_credit`). `refund` requires positive amount. `replacement`/`store_credit` forbid amount. | CHECK `resolution_matches_status`<br>CHECK `refund_amount_matches_resolution` | `transitionSchema` and `transitionRequest()` return `422 RESOLUTION_REQUIRED` or `422 RESOLUTION_NOT_ALLOWED` | Approve dialog prompts for resolution ChoiceTiles; refund amount input shown only for Refund |
| **Rule 3: One Live Request Per Item** | At most one active request (`open`, `in_review`, `approved`) per order number + item SKU. Re-request allowed once closed. | Partial unique index `one_live_request_per_order_item`<br>`ON (lower(order_number), lower(item_sku))` | Catches Postgres `23505` and returns `409 DUPLICATE_LIVE_REQUEST` with `existingReference` | Form displays alert banner with link to conflicting active request |
| **Rule 4: Locked Once Decided** | Request details can only be edited while undecided (`open`, `in_review`). Once approved, rejected, or completed, details are permanently immutable. | Enforced via transaction row lock `SELECT ... FOR UPDATE` | `isLocked()` in `lifecycle.ts`; returns `409 REQUEST_LOCKED` | "Edit details" button hidden once decided; form renders lock banner |
| **Rule 5: Soft Removal** | Only `open` or `rejected` requests can be removed. Deleted requests are excluded from list/fetch, but database rows persist. | CHECK `only_open_or_rejected_removed`<br>FK `ON DELETE RESTRICT` | `isRemovable()` in `lifecycle.ts`; sets `deleted_at = now()`; returns `409 REMOVAL_NOT_ALLOWED` | "Remove from desk" button hidden on active/decided tickets; confirmation dialog |
| **Notes: Append-Only** | Notes can be appended at any status, but can never be modified or deleted. | Trigger `request_notes_append_only` raises exception `P0001` on UPDATE/DELETE | No PATCH/DELETE endpoints exist; append-only SQL insert | Notes list displays chronological history without edit or delete actions |

*For source code symbol traceability, see [docs/CODEMAP.md](docs/CODEMAP.md).*

---

## 6. Key Design Decisions & Alternatives Considered

### 1. Hand-Written Parameterized SQL over an ORM (Prisma / Drizzle)
- **Decision:** All database interactions use `pg` with raw parameterized SQL statements (`$1`, `$2`, ...).
- **Rationale:** The brief explicitly states: *"Loading every row into the browser and filtering it there is not acceptable, and we will look at your queries."* Raw SQL provides complete visibility into query execution plans, avoids accidental N+1 queries, and allows precise row-level locking (`SELECT ... FOR UPDATE`).
- **Alternatives Considered:** Prisma and Drizzle were evaluated. However, ORMs abstract away query mechanics, complicate custom PostgreSQL partial indexes and triggers, and can generate inefficient multi-join queries.

### 2. Dedicated `POST /transitions` Endpoint vs. Generic `PATCH status`
- **Decision:** State transitions are performed via a dedicated `POST /api/requests/:reference/transitions` endpoint.
- **Rationale:** A status change is an explicit business operation with side effects, pre-conditions, and invariant checks (e.g. approving requires a resolution and optional refund amount; records `decided_at`). Modifying customer contact details is an administrative edit. Separating them prevents an edit payload from inadvertently altering lifecycle state.
- **Alternatives Considered:** A generic `PATCH /api/requests/:reference` accepting `{ status }` was rejected because it entangles workflow logic with basic field mutations.

### 3. Partial Unique Index for Concurrency Protection
- **Decision:** Rule 3 is enforced via a PostgreSQL partial unique index:
  ```sql
  CREATE UNIQUE INDEX one_live_request_per_order_item
  ON return_requests (lower(order_number), lower(item_sku))
  WHERE deleted_at IS NULL AND status IN ('open', 'in_review', 'approved');
  ```
- **Rationale:** Application-level `SELECT` checks are vulnerable to concurrency race conditions when two agents raise requests simultaneously. The partial unique index guarantees database-level uniqueness across case-insensitive order/SKU pairs while allowing new requests once earlier requests reach `rejected` or `completed`.
- **Alternatives Considered:** Table-level locks or application mutexes, which would significantly degrade throughput.

### 4. Semantic HTTP Status Codes: 409 Conflict vs. 422 Unprocessable Entity
- **Decision:** 
  - `422 Unprocessable Entity`: Syntactically valid JSON with invalid field values (e.g., negative refund amount, missing required resolution, invalid email format).
  - `409 Conflict`: The action conflicts with the current business state of the resource (e.g., attempting an illegal transition, editing a decided request, or violating the live order+item uniqueness).
- **Rationale:** Provides clear, machine-readable semantics to API clients.

### 5. Monetary Values as Exact String Decimals
- **Decision:** Refund amounts are stored as PostgreSQL `numeric(10,2)` and transferred via JSON as exact 2-decimal strings (`"499.00"`).
- **Rationale:** Avoids binary floating-point rounding inaccuracies common in JavaScript `number` primitives.

### 6. Sequence-Generated Human References (`RD-XXXXX`) vs. UUIDs
- **Decision:** System generates references formatted as `RD-00001`, `RD-00002`, ... powered by a PostgreSQL sequence (`return_requests_ref_seq`).
- **Rationale:** Support agents frequently read references to customers over the phone or in chat. Sequences are short, memorable, and human-readable, while ensuring strict uniqueness without requiring the user to type them.
- **Alternatives Considered:** UUIDv4 was rejected because strings like `c9b5d2b1-5e8a-4934-8b6b-4e89f81a7b8e` are impractical for voice/chat support.

### 7. Server Authority (`allowedActions`)
- **Decision:** The API calculates `allowedActions` server-side and sends it with every detail payload.
- **Rationale:** The frontend never decides what is legal; it simply renders the buttons the server permits. This ensures zero risk of UI/API rule desynchronization.

### 8. URL-Driven Search and Filtering
- **Decision:** Search text (`q`), status, reason, sort order, and pagination are synchronized with the browser's URL search params.
- **Rationale:** Allows agents to bookmark filtered views, share links with teammates, and preserve table state across browser refreshes.

---

## 7. Assumptions & Scope Decisions

Per the assignment brief, ambiguities were resolved with clear, documented decisions:

| # | Topic | Decision | Rationale |
|---|---|---|---|
| **A1** | Direct rejection from Open | **Not allowed.** Only `in_review → rejected`. | The assignment lifecycle diagram branches Rejected from In Review. Support agents must review a ticket before rejecting it. |
| **A2** | Backward transitions | **Not allowed.** Lifecycle moves forward only. | The brief specifies only the listed transitions are legal. |
| **A3** | Removed requests & live uniqueness | Removed requests do not block new requests. | Once taken off the desk, a ticket is no longer active. |
| **A4** | Locked fields | All customer, item, and return reason fields lock permanently upon decision. | Modifying the reason or item after approval/rejection would rewrite history. |
| **A5** | Resolution timing | Resolution is recorded atomically during the transition to `approved`. | Resolutions cannot be modified after approval. |
| **A6** | Resolution on rejection | **Forbidden.** Rejected requests have `resolution = null` and `refund_amount = null`. | Resolutions only apply to approved returns. |
| **A7** | Authentication & Agent identity | **No login system.** Notes record a free-text `author` name. | The brief specifies no auth. Adding login would divert time from graded core requirements. |
| **A8** | Product & order catalog | Order numbers and item SKUs/names are stored as snapshot strings on the request. | No external order database exists in the brief. |
| **A9** | Reference format | Human-readable `RD-00001`, `RD-00002`, ... generated from a PostgreSQL sequence. | Short, readable over phone, unique by construction, never typed by user. |
| **A10** | Currency | Single store currency (INR ₹), stored as `numeric(10,2)`. | No multi-currency conversion needed. |
| **A11** | Customer uniqueness | Enforced on `(lower(order_number), lower(item_sku))`. | An order belongs to one customer; order + item identifies the item uniquely. |
| **A12** | Contact details | Customer email is required. Phone number is optional. | At least one reliable contact method is required. |
| **A13** | Search matching | Case-insensitive partial match (`ILIKE`) across reference, order number, customer name, and email. | Matches the brief requirement *"search by customer, order or reference"*. |
| **A14** | Restoring removed requests | **No restore feature.** Soft-deleted rows remain in the DB with `deleted_at` set. | The brief requires the record not be destroyed, but provides no un-delete flow. |
| **A15** | Notes on removed requests | **Forbidden.** Returns `404 NOT_FOUND`. | Removed requests are excluded from all API operations. |

---

## 8. Design System & Frontend Aesthetics (DESIGN.md v2)

ReturnDesk implements a tactile, bespoke interface with three interaction tiers:
- **Tier 1 (Quiet):** Table rows, notes, pagination links. Shifts background to hover state and reveals a 3px ink accent on the left edge (`hover:before:bg-ink`).
- **Tier 2 (Controls):** Buttons, filter chips, selects. Features a 1px physical press on click (`translateY(1px)` via `@utility pressable`).
- **Tier 3 (Tiles):** Mobile request cards, resolution choice tiles, return reason tiles. Lifts on hover onto a hard shadow (`translate(-1px, -1px)` with `shadow-lift`), and presses flat on tap (`translate(1px, 1px)` with zero shadow).
- **Brand Palette:** Warm neutral off-white canvas (`#F7F7F5`), crisp paper white (`#FFFFFF`), deep ink (`#101820`), and deliberate Frido yellow (`#FCD00B`) for references and active lifecycle indicators.
- **Zero Raw Hex in Components:** All styling is derived strictly from Tailwind semantic tokens.
- **Accessibility:** Full keyboard navigability (Tab, Enter, Space, Arrow keys for ChoiceTiles), visible `:focus-visible` rings on all interactive controls, and complete `prefers-reduced-motion` overrides.

---

## 9. "Try It in Two Minutes" Walkthrough

1. **The Returns Desk (`/`):**
   - View 34 active seeded requests with status and reason distribution.
   - Type `"Ritika"` into search: observe the 300ms debounce firing a single network request and filtering down to Ritika Bansal.
   - Toggle status filter chips (e.g. `In review`): URL query string updates automatically, and pagination resets to page 1.
   - Switch viewport to 375px mobile view: table smoothly transitions to stacked Tier 3 tactile cards with zero horizontal overflow.
2. **Request Detail (`/requests/RD-00010`):**
   - Click request `RD-00010` (`In review`).
   - Observe the visual `LifecycleTrack` indicating current state.
   - Click **Approve…**:
     - Pick **Refund** ChoiceTile.
     - Leave refund amount blank and submit **Approve**.
     - Observe the server validation refusal rendered inside the modal: *"A positive refund amount is required for refund resolutions."*
     - Enter `"499.00"` and submit: dialog closes, state transitions to `Approved`, and a success toast appears.
3. **Notes Timeline:**
   - Scroll down to the **Notes** panel on `RD-00010`.
   - Type an internal note, enter your name, and click **Add note**.
   - Note is appended chronologically; author name is remembered in `localStorage` for subsequent notes.
4. **Soft Removal (`RD-00005`):**
   - Open open request `RD-00005`.
   - Click **Remove from desk** and confirm in dialog.
   - Redirects to `/` with confirmation banner: *"RD-00005 was removed from the desk."*
   - Navigating directly to `/requests/RD-00005` displays the clean *"Request not found."* empty state.

---

## 10. Current Implementation Status

### Completed
- **Phase 1: Database Schema & Lifecycle State Machine**
  - PostgreSQL migration system with runner script (`db/migrate.ts`).
  - Deterministic seed script generating 36 sample requests covering 100% of status × reason combinations (`db/seed.ts`).
  - Domain constants, string unions, and state machine (`lifecycle.ts`).
- **Phase 2: Core REST API & Documentation**
  - `GET /api/requests` with server-side ILIKE search, multi-status & multi-reason filtering, whitelisted sorting, and pagination.
  - `POST /api/requests` with sequence-generated references (`RD-XXXXX`).
  - `GET /api/requests/:reference` with chronological notes and `allowedActions`.
  - `PATCH /api/requests/:reference` with transaction row locking (`SELECT ... FOR UPDATE`) and decision lock checks.
  - `POST /api/requests/:reference/transitions` with resolution and refund validation.
  - `DELETE /api/requests/:reference` with soft-removal restrictions.
  - `GET /api/requests/:reference/notes` & `POST /api/requests/:reference/notes`.
  - Comprehensive documentation in `docs/API.md`, `docs/DATABASE.md`, and `docs/CODEMAP.md`.
- **Phase 3: Frontend Complete (Steps 3.1–3.5)**
  - Token system and utilities in `src/app/globals.css`.
  - 15 base UI components in `src/components/ui/` with 3 interaction tiers.
  - The Desk page (`/`): debounced search, status/reason filter chips, sort select, responsive table & mobile cards, pagination.
  - Request Detail page (`/requests/[reference]`): dynamic actions from `allowedActions`, LifecycleTrack, details card, notes timeline, Approve/Reject/Remove dialogs.
  - Create & Edit forms (`/requests/new` and `/requests/[reference]/edit`): shared Zod validation, ChoiceTiles for return reasons, duplicate conflict banner with link, lock notices on decided requests.
  - UI quality pass: 375px responsive layout verified with 0 horizontal scroll, full keyboard navigation (Tab, Arrow keys, Escape dialog dismiss), decorative elements hidden from screen readers (`aria-hidden`), and reduced-motion support.

### In Progress / Upcoming
- **Phase 4:** Production deployment to Vercel with Neon connection pooling.
- **Phase 5:** Vitest integration test suite, GitHub Actions CI workflow, and query performance benchmarks.

---

## 11. Documentation Directory

- [docs/API.md](docs/API.md): Comprehensive REST API reference, request/response bodies, error envelopes, and curl examples.
- [docs/DATABASE.md](docs/DATABASE.md): PostgreSQL schema specification, table definitions, check constraints, indexes, and triggers.
- [docs/CODEMAP.md](docs/CODEMAP.md): Complete repository file map and business rule traceability table.
- [learnings/](learnings/): Step-by-step interview preparation guides and architectural notes.

---

## 12. Time Spent

- **Architecture, Schema & Lifecycle (Phase 1):** ~3 hours
- **Core API & Business Rule Verification (Phase 2):** ~4 hours
- **Design System, Desk, Detail, Forms & Quality Pass (Phase 3):** ~6 hours
- **Total Hours Spent So Far:** ~13 hours
