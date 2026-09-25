# Database

PostgreSQL (hosted on Neon). The whole schema is in [`db/migrations/001_init.sql`](../db/migrations/001_init.sql). `npm run db:migrate` applies it, recording each applied file in a `schema_migrations` table.

The rules are checked in the service layer, which returns clear error messages. Wherever the database can express a rule, it enforces it as well. So even a bug in the application, or someone running SQL by hand, can't put the data into an invalid state.

```
return_requests  1 ──── *  request_notes
     (id)                     (request_id, ON DELETE RESTRICT)
```

## Types

```sql
CREATE TYPE request_status     AS ENUM ('open', 'in_review', 'approved', 'rejected', 'completed');
CREATE TYPE return_reason      AS ENUM ('damaged', 'wrong_item', 'size_issue', 'not_as_described', 'changed_mind');
CREATE TYPE request_resolution AS ENUM ('refund', 'replacement', 'store_credit');
```

I used enums instead of `text` with a CHECK, so the allowed values are part of the column type and are visible when you inspect the schema. The trade-off is that adding a value later needs an `ALTER TYPE`.

## References

```sql
CREATE SEQUENCE return_request_ref_seq;

CREATE FUNCTION next_request_reference() RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  n bigint := nextval('return_request_ref_seq');
BEGIN
  RETURN 'RD-' || lpad(n::text, greatest(5, length(n::text)), '0');
END;
$$;
```

This produces `RD-00001`, `RD-00002` and so on. The `greatest(5, …)` is there because `lpad` truncates longer strings. Without it, number 100000 would come out as `RD-10000` and collide with an existing reference.

A request that fails to insert still uses up a sequence number, so there can be gaps. That's fine: references only need to be unique, not continuous.

## `return_requests`

| Column                     | Type                 | Rules                                                 |
| -------------------------- | -------------------- | ----------------------------------------------------- |
| `id`                       | `bigint` identity    | Primary key. Internal only; the API never returns it. |
| `reference`                | `text`               | `NOT NULL UNIQUE`, default `next_request_reference()` |
| `customer_name`            | `text`               | Required, not blank                                   |
| `customer_email`           | `text`               | Required, not blank                                   |
| `customer_phone`           | `text`               | Optional, but not blank if present                    |
| `order_number`             | `text`               | Required, not blank                                   |
| `item_sku`                 | `text`               | Required, not blank                                   |
| `item_name`                | `text`               | Required, not blank                                   |
| `quantity`                 | `integer`            | Must be above 0 (the API also caps it at 1000)        |
| `reason`                   | `return_reason`      | Required                                              |
| `status`                   | `request_status`     | Required, default `open`                              |
| `resolution`               | `request_resolution` | Set on approval                                       |
| `refund_amount`            | `numeric(10,2)`      | Only for refunds. Exact decimal, never a float.       |
| `created_at`, `updated_at` | `timestamptz`        | `updated_at` is set on every change                   |
| `decided_at`               | `timestamptz`        | When the request was approved or rejected             |
| `deleted_at`               | `timestamptz`        | Set when the request is taken off the desk            |

"Not blank" means a CHECK like `length(trim(customer_name)) > 0`, so whitespace alone is refused too.

### Constraints

**A resolution exists exactly when the request is approved or completed** (rule 2):

```sql
CHECK ((status IN ('approved', 'completed')) = (resolution IS NOT NULL))
```

**A refund amount exists exactly when the resolution is a refund, and it's positive** (rule 2):

```sql
CHECK (CASE WHEN resolution = 'refund'
            THEN refund_amount IS NOT NULL AND refund_amount > 0
            ELSE refund_amount IS NULL END)
```

This is written with `CASE` on purpose. A CHECK passes when its expression is `NULL`. The more obvious `(resolution = 'refund' AND …) OR (…)` evaluates to `NULL` when `resolution` is null but an amount is set, and would let that row in. With `CASE`, a null resolution goes to the `ELSE` branch, which is always true or false.

**`decided_at` is set exactly when the request has been decided:**

```sql
CHECK ((status IN ('approved', 'rejected', 'completed')) = (decided_at IS NOT NULL))
```

**Only open or rejected requests can be removed** (rule 5):

```sql
CHECK (deleted_at IS NULL OR status IN ('open', 'rejected'))
```

### Indexes

**One live request per order and item** (rule 3):

```sql
CREATE UNIQUE INDEX one_live_request_per_order_item
  ON return_requests (lower(order_number), lower(item_sku))
  WHERE status IN ('open', 'in_review', 'approved') AND deleted_at IS NULL;
```

It's a partial index, so only live requests count. Rejected, completed and removed requests don't block a new one. Because it's an index rather than a lookup in code, two requests saved at the same moment can't both get through. `lower()` makes it ignore letter case.

**For the desk list:** every index below leaves out removed rows, because every list query does too.

```sql
CREATE INDEX return_requests_created_idx ON return_requests (created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX return_requests_status_idx  ON return_requests (status) WHERE deleted_at IS NULL;
CREATE INDEX return_requests_reason_idx  ON return_requests (reason) WHERE deleted_at IS NULL;
```

The first one matches the default sort (newest first, with `id` as a tiebreaker so paging is stable).

Search uses `ILIKE '%…%'`, which these indexes can't help with. At this data size that doesn't matter. With much more data, I'd add `pg_trgm` GIN indexes.

## `request_notes`

| Column       | Type              | Rules                                               |
| ------------ | ----------------- | --------------------------------------------------- |
| `id`         | `bigint` identity | Primary key                                         |
| `request_id` | `bigint`          | `REFERENCES return_requests(id) ON DELETE RESTRICT` |
| `author`     | `text`            | Required, not blank                                 |
| `body`       | `text`            | Required, not blank, at most 2000 characters        |
| `created_at` | `timestamptz`     | Default `now()`                                     |

The index `(request_id, created_at, id)` returns a request's notes in order.

`ON DELETE RESTRICT` means a request with notes can't be hard-deleted, even directly in SQL (error `23001`). That's a second guarantee on top of soft delete.

Notes can't be changed once written. A trigger rejects every `UPDATE` and `DELETE`:

```sql
CREATE FUNCTION forbid_note_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'request notes are append-only';
END;
$$;

CREATE TRIGGER request_notes_append_only
  BEFORE UPDATE OR DELETE ON request_notes
  FOR EACH ROW EXECUTE FUNCTION forbid_note_changes();
```

The seed script clears the table with `TRUNCATE`, which doesn't fire row triggers, so re-seeding still works.

## Things I considered

- **Separate `customers` and `orders` tables.** There's no order system to link to. A request records what the customer told us at the time, so a single table fits.
- **Enforcing the lifecycle with a trigger.** It's possible, but the rule would then live in two places, and the database can't return a friendly 409. The service owns the lifecycle; the database guards the data itself.
- **UUIDs.** They're fine as keys, but too long to read out on a support call. The internal id stays an integer, and the public identifier is the reference.
