# ReturnDesk Database Architecture

ReturnDesk uses a relational PostgreSQL database (hosted on Neon) with strict data integrity guarantees. All business rules are enforced both at the application service layer and backed by native PostgreSQL constraints, triggers, and partial indexes.

---

## 1. Entity Relationship Sketch

```
┌─────────────────────────────────┐
│         return_requests         │
├─────────────────────────────────┤
│ id (PK, Identity)               │
│ reference (Unique, Generated)   │◄─────────┐
│ customer_name, customer_email   │          │
│ customer_phone                  │          │ (1 to many)
│ order_number, item_sku          │          │
│ item_name, quantity, reason     │          │
│ status, resolution              │          │
│ refund_amount                   │          │
│ created_at, updated_at          │          │
│ decided_at, deleted_at          │          │
└─────────────────────────────────┘          │
                 │ 1                         │
                 │                           │ ON DELETE RESTRICT
                 │ *                         │
┌─────────────────────────────────┐          │
│          request_notes          │          │
├─────────────────────────────────┤          │
│ id (PK, Identity)               │          │
│ request_id (FK) ────────────────┴──────────┘
│ author                          │
│ body (max 2000 chars)           │
│ created_at                      │
└─────────────────────────────────┘
```

---

## 2. PostgreSQL Custom Types & Sequences

### 2.1 Enums

```sql
CREATE TYPE request_status AS ENUM ('open', 'in_review', 'approved', 'rejected', 'completed');
CREATE TYPE return_reason AS ENUM ('damaged', 'wrong_item', 'size_issue', 'not_as_described', 'changed_mind');
CREATE TYPE request_resolution AS ENUM ('refund', 'replacement', 'store_credit');
```

- **Why Enums:** Enums guarantee type safety in SQL, reject invalid entries at insertion time, and eliminate storage overhead compared to raw text checks.

### 2.2 Reference Generator Sequence & Function

```sql
CREATE SEQUENCE return_request_ref_seq;

CREATE FUNCTION next_request_reference() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  n bigint := nextval('return_request_ref_seq');
BEGIN
  RETURN 'RD-' || lpad(n::text, greatest(5, length(n::text)), '0');
END;
$$;
```

- **Guarantees:** Generates deterministic, human-readable IDs formatted as `RD-00001`, `RD-00002`, ..., `RD-100000`. Using `greatest(5, length(n::text))` ensures that sequence values exceeding 5 digits are never truncated by `lpad()`.

---

## 3. Tables & Schema Specification

### 3.1 `return_requests`

Primary entity table storing customer return tickets and lifecycle state.

| Column           | Type                                  | Constraints                                                          | Description & Rule                                                                              |
| ---------------- | ------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `id`             | `bigint GENERATED ALWAYS AS IDENTITY` | `PRIMARY KEY`                                                        | Internal surrogate key. Never exposed over the public API.                                      |
| `reference`      | `text`                                | `NOT NULL UNIQUE DEFAULT next_request_reference()`                   | Public identifier (`RD-xxxxx`). Case-insensitive in lookups.                                    |
| `customer_name`  | `text`                                | `NOT NULL CHECK (length(trim(customer_name)) > 0)`                   | Customer's full name. Cannot be empty or whitespace.                                            |
| `customer_email` | `text`                                | `NOT NULL CHECK (length(trim(customer_email)) > 0)`                  | Customer contact email address.                                                                 |
| `customer_phone` | `text`                                | `CHECK (customer_phone IS NULL OR length(trim(customer_phone)) > 0)` | Optional phone contact.                                                                         |
| `order_number`   | `text`                                | `NOT NULL CHECK (length(trim(order_number)) > 0)`                    | Order identifier (e.g. `ORD-10401`). Part of Rule 3.                                            |
| `item_sku`       | `text`                                | `NOT NULL CHECK (length(trim(item_sku)) > 0)`                        | SKU of returned item (e.g. `SKU-CUSH-BLK-M`). Part of Rule 3.                                   |
| `item_name`      | `text`                                | `NOT NULL CHECK (length(trim(item_name)) > 0)`                       | Human-readable product name.                                                                    |
| `quantity`       | `integer`                             | `NOT NULL CHECK (quantity > 0)`                                      | Quantity of returned items. Must be positive.                                                   |
| `reason`         | `return_reason`                       | `NOT NULL`                                                           | One of the 5 allowed reasons.                                                                   |
| `status`         | `request_status`                      | `NOT NULL DEFAULT 'open'`                                            | Current lifecycle stage.                                                                        |
| `resolution`     | `request_resolution`                  | `NULL`                                                               | Resolution chosen at approval (`refund`, `replacement`, `store_credit`).                        |
| `refund_amount`  | `numeric(10, 2)`                      | `NULL`                                                               | Monetary refund amount in INR. Preserves exact decimal precision without floating-point errors. |
| `created_at`     | `timestamptz`                         | `NOT NULL DEFAULT now()`                                             | Timestamp when ticket was created.                                                              |
| `updated_at`     | `timestamptz`                         | `NOT NULL DEFAULT now()`                                             | Refreshed on every modification or transition.                                                  |
| `decided_at`     | `timestamptz`                         | `NULL`                                                               | Timestamp when decided (`approved` or `rejected`).                                              |
| `deleted_at`     | `timestamptz`                         | `NULL`                                                               | Soft deletion timestamp (Rule 5).                                                               |

#### Constraints on `return_requests`

1. **Resolution Matching Status (Rule 2):**

   ```sql
   CONSTRAINT resolution_matches_status CHECK (
     (status IN ('approved', 'completed')) = (resolution IS NOT NULL)
   )
   ```

   _Rule Backed:_ A ticket carries a resolution if and only if it is `approved` or `completed`. Undecided or rejected tickets can never store a resolution.

2. **Refund Amount Matching Resolution (Rule 2):**

   ```sql
   CONSTRAINT refund_amount_matches_resolution CHECK (
     CASE WHEN resolution = 'refund'
       THEN refund_amount IS NOT NULL AND refund_amount > 0
       ELSE refund_amount IS NULL
     END
   )
   ```

   _The SQL NULL Trap:_ In PostgreSQL, `CHECK` constraints pass if an expression evaluates to `NULL`. An `OR` expression like `(resolution = 'refund' AND amount > 0) OR (resolution != 'refund' AND amount IS NULL)` evaluates to `NULL` if `resolution` is NULL and `amount` is set, allowing illegal rows. The `CASE` construct avoids this because `NULL = 'refund'` falls into the `ELSE` branch, which strictly evaluates `refund_amount IS NULL`.

3. **Decision Timestamp Matching Status:**

   ```sql
   CONSTRAINT decided_at_matches_status CHECK (
     (status IN ('approved', 'rejected', 'completed')) = (decided_at IS NOT NULL)
   )
   ```

   _Rule Backed:_ Once a ticket moves out of `open` or `in_review`, a decision timestamp is mandatory and permanent.

4. **Soft Removal State Invariant (Rule 5):**
   ```sql
   CONSTRAINT only_open_or_rejected_removed CHECK (
     deleted_at IS NULL OR status IN ('open', 'rejected')
   )
   ```
   _Rule Backed:_ Only tickets in `open` or `rejected` can ever be soft-deleted. Tickets in `in_review`, `approved`, or `completed` cannot have `deleted_at` set.

#### Indexes on `return_requests`

1. **Rule 3 Partial Unique Index:**

   ```sql
   CREATE UNIQUE INDEX one_live_request_per_order_item
     ON return_requests (lower(order_number), lower(item_sku))
     WHERE status IN ('open', 'in_review', 'approved') AND deleted_at IS NULL;
   ```

   _Serves:_ Enforces Rule 3 at the database engine level across concurrent transactions. Uses `lower()` for case-insensitivity. Excludes `rejected`, `completed`, and soft-deleted tickets, allowing customers to raise a new return once an earlier ticket is resolved.

2. **Listing Sort Index:**

   ```sql
   CREATE INDEX return_requests_created_idx
     ON return_requests (created_at DESC, id DESC)
     WHERE deleted_at IS NULL;
   ```

   _Serves:_ Accelerates the default desk view sorted by creation date with stable tiebreaking on `id`.

3. **Status Filter Index:**

   ```sql
   CREATE INDEX return_requests_status_idx
     ON return_requests (status)
     WHERE deleted_at IS NULL;
   ```

   _Serves:_ Speeds up status filtering (`open`, `in_review`, etc.).

4. **Reason Filter Index:**
   ```sql
   CREATE INDEX return_requests_reason_idx
     ON return_requests (reason)
     WHERE deleted_at IS NULL;
   ```
   _Serves:_ Speeds up reason filtering (`damaged`, `wrong_item`, etc.).

---

### 3.2 `request_notes`

Stores append-only internal support notes associated with a return request.

| Column       | Type                                  | Constraints                                                        | Description                                    |
| ------------ | ------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| `id`         | `bigint GENERATED ALWAYS AS IDENTITY` | `PRIMARY KEY`                                                      | Unique note identifier.                        |
| `request_id` | `bigint`                              | `NOT NULL REFERENCES return_requests(id) ON DELETE RESTRICT`       | Foreign key referencing parent return request. |
| `author`     | `text`                                | `NOT NULL CHECK (length(trim(author)) > 0)`                        | Name or handle of agent authoring the note.    |
| `body`       | `text`                                | `NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000)` | Note content (1 to 2000 characters).           |
| `created_at` | `timestamptz`                         | `NOT NULL DEFAULT now()`                                           | Creation timestamp.                            |

#### Constraints & Triggers on `request_notes`

1. **Foreign Key `ON DELETE RESTRICT` (Defense in Depth for Rule 5):**
   A parent return request cannot be hard-deleted from SQL if any notes reference it. Attempting to delete a return request with notes raises PostgreSQL error `23001`.

2. **Timeline Index:**

   ```sql
   CREATE INDEX request_notes_request_idx ON request_notes (request_id, created_at, id);
   ```

   _Serves:_ Fast chronological retrieval of a ticket's notes (oldest first).

3. **Append-Only Trigger:**
   ```sql
   CREATE FUNCTION forbid_note_changes() RETURNS trigger
   LANGUAGE plpgsql AS $$
   BEGIN
     RAISE EXCEPTION 'request notes are append-only';
   END;
   $$;

   CREATE TRIGGER request_notes_append_only
     BEFORE UPDATE OR DELETE ON request_notes
     FOR EACH ROW EXECUTE FUNCTION forbid_note_changes();
   ```
   _Serves:_ Prevents any `UPDATE` or `DELETE` statement from mutating existing notes, even for users or scripts connecting directly to the database. Violations raise PostgreSQL error code `P0001`.

---

## 4. Alternatives Considered

1. **Normalized `orders` & `customers` tables:**
   _Decision:_ Rejected in favor of a single `return_requests` snapshot table. ReturnDesk is an intake and management tool for return claims, not an inventory or customer master system. Storing customer details and order item details directly on the ticket accurately reflects what the customer claimed at the moment of request creation.
2. **Text checks vs PostgreSQL Native Enums:**
   _Decision:_ Native PostgreSQL enums (`request_status`, `return_reason`, `request_resolution`) were chosen for strict database-level typing, cleaner schema inspection, and compact 4-byte internal representation.
3. **Database Trigger for Lifecycle Transitions:**
   _Decision:_ Rejected in favor of service-layer transition orchestration. While state transitions could be checked in a `BEFORE UPDATE` trigger, business logic belongs in `src/lib/services/requests.ts` where friendly domain error envelopes (`INVALID_TRANSITION`, `RESOLUTION_REQUIRED`) can be returned. The database owns invariant defense (`CHECK` constraints and partial unique indexes).
4. **UUID vs Bigint Identity PK:**
   _Decision:_ Identity primary keys (`bigint`) were chosen for optimal index tree depth, sequential insert performance, and deterministic tiebreaking (`id DESC`). The public identifier is the generated sequence reference (`RD-xxxxx`), keeping internal database keys hidden from callers.
