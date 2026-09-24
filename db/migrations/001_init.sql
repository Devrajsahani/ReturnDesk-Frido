CREATE TYPE request_status AS ENUM ('open', 'in_review', 'approved', 'rejected', 'completed');
CREATE TYPE return_reason AS ENUM ('damaged', 'wrong_item', 'size_issue', 'not_as_described', 'changed_mind');
CREATE TYPE request_resolution AS ENUM ('refund', 'replacement', 'store_credit');

CREATE SEQUENCE return_request_ref_seq;

-- lpad() truncates input longer than the target length, so pad to at least five digits
-- rather than exactly five. Otherwise reference 100000 would come out as RD-10000.
CREATE FUNCTION next_request_reference() RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  n bigint := nextval('return_request_ref_seq');
BEGIN
  RETURN 'RD-' || lpad(n::text, greatest(5, length(n::text)), '0');
END;
$$;

CREATE TABLE return_requests (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reference      text NOT NULL UNIQUE DEFAULT next_request_reference(),
  customer_name  text NOT NULL CHECK (length(trim(customer_name)) > 0),
  customer_email text NOT NULL CHECK (length(trim(customer_email)) > 0),
  customer_phone text CHECK (customer_phone IS NULL OR length(trim(customer_phone)) > 0),
  order_number   text NOT NULL CHECK (length(trim(order_number)) > 0),
  item_sku       text NOT NULL CHECK (length(trim(item_sku)) > 0),
  item_name      text NOT NULL CHECK (length(trim(item_name)) > 0),
  quantity       integer NOT NULL CHECK (quantity > 0),
  reason         return_reason NOT NULL,
  status         request_status NOT NULL DEFAULT 'open',
  resolution     request_resolution,
  refund_amount  numeric(10, 2),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  decided_at     timestamptz,
  deleted_at     timestamptz,

  -- Rule 2: an approved (and later completed) request always carries a resolution; nothing else does.
  CONSTRAINT resolution_matches_status CHECK (
    (status IN ('approved', 'completed')) = (resolution IS NOT NULL)
  ),
  -- Rule 2: written as CASE rather than OR because a CHECK passes on NULL, and an OR form
  -- evaluates to NULL when resolution is NULL but an amount is present.
  CONSTRAINT refund_amount_matches_resolution CHECK (
    CASE WHEN resolution = 'refund'
      THEN refund_amount IS NOT NULL AND refund_amount > 0
      ELSE refund_amount IS NULL
    END
  ),
  CONSTRAINT decided_at_matches_status CHECK (
    (status IN ('approved', 'rejected', 'completed')) = (decided_at IS NOT NULL)
  ),
  -- Rule 5
  CONSTRAINT only_open_or_rejected_removed CHECK (
    deleted_at IS NULL OR status IN ('open', 'rejected')
  )
);

-- Rule 3: at most one live request per order and item. Closed or removed requests fall outside
-- the index, so a new request is allowed once the earlier one is rejected, completed or removed.
CREATE UNIQUE INDEX one_live_request_per_order_item
  ON return_requests (lower(order_number), lower(item_sku))
  WHERE status IN ('open', 'in_review', 'approved') AND deleted_at IS NULL;

CREATE INDEX return_requests_created_idx ON return_requests (created_at DESC, id DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX return_requests_status_idx ON return_requests (status) WHERE deleted_at IS NULL;
CREATE INDEX return_requests_reason_idx ON return_requests (reason) WHERE deleted_at IS NULL;

CREATE TABLE request_notes (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id bigint NOT NULL REFERENCES return_requests (id) ON DELETE RESTRICT,
  author     text NOT NULL CHECK (length(trim(author)) > 0),
  body       text NOT NULL CHECK (length(trim(body)) > 0 AND length(body) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX request_notes_request_idx ON request_notes (request_id, created_at, id);

-- Notes are append-only. This holds even for someone with direct database access,
-- not just for callers of the API (which has no endpoint to change a note).
CREATE FUNCTION forbid_note_changes() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'request notes are append-only';
END;
$$;

CREATE TRIGGER request_notes_append_only
  BEFORE UPDATE OR DELETE ON request_notes
  FOR EACH ROW EXECUTE FUNCTION forbid_note_changes();
