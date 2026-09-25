# API

All endpoints live under `/api`, take and return JSON, and identify requests by their reference (`RD-00012`), never by an internal id.

## Conventions

- **Field names** are camelCase in JSON (the database uses snake_case).
- **References** are matched case-insensitively: `/api/requests/rd-00012` finds `RD-00012`.
- **Money** is a string with two decimals, like `"499.00"`. Input can be a number or a string.
- **Timestamps** are ISO 8601 in UTC.
- **Removed requests** (soft-deleted) don't appear in lists, and return 404 from every endpoint.
- **Unknown fields** in a body, or unknown query parameters, are rejected rather than ignored.

## Responses

A success looks like `{ "data": … }`. Lists add a `meta` object:

```json
{ "data": [ … ], "meta": { "page": 1, "pageSize": 20, "total": 34, "totalPages": 2 } }
```

Every error has the same shape. `details` is included when there's something useful to add; for validation errors, it holds a message per field:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request body failed validation checks",
    "details": { "fields": { "quantity": "Quantity must be greater than 0" } }
  }
}
```

| Status | Code                     | When                                                                                                                       |
| ------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 400    | `INVALID_JSON`           | The body isn't valid JSON                                                                                                  |
| 400    | `INVALID_QUERY`          | A query parameter is invalid (unknown value, page size over 100, unknown parameter)                                        |
| 404    | `NOT_FOUND`              | The reference doesn't exist or was removed, or the API path doesn't exist                                                  |
| 405    | `METHOD_NOT_ALLOWED`     | The path exists but doesn't support that method                                                                            |
| 409    | `INVALID_TRANSITION`     | That status change isn't allowed from the current status                                                                   |
| 409    | `DUPLICATE_LIVE_REQUEST` | A live request already exists for this order and item; `details.existingReference` names it                                |
| 409    | `REQUEST_LOCKED`         | The request has been decided, so its details can't be edited                                                               |
| 409    | `REMOVAL_NOT_ALLOWED`    | Only open or rejected requests can be removed                                                                              |
| 422    | `VALIDATION_FAILED`      | The body is JSON but a field is missing, invalid or unknown, or an edit changes nothing                                    |
| 422    | `RESOLUTION_REQUIRED`    | Approving without a resolution, or approving a refund without a valid amount                                               |
| 422    | `RESOLUTION_NOT_ALLOWED` | Sending an amount with a replacement or store credit, or a resolution or amount with any status change other than approval |
| 412    | `STALE_REQUEST`          | The request changed since you opened it (`If-Match` did not match `updated_at`); reload and retry                          |
| 503    | `SERVICE_UNAVAILABLE`    | The database can't be reached; retrying later should work                                                                  |
| 500    | `INTERNAL_ERROR`         | Anything unexpected. The details are logged on the server, not returned.                                                   |

How to read 409 vs 422: a **422** means the data you sent is wrong. A **409** means the data is fine, but the request's current state doesn't allow the action.

---

## Endpoints

| Method | Path                                   | What it does                                    | Success          |
| ------ | -------------------------------------- | ----------------------------------------------- | ---------------- |
| GET    | `/api/requests`                        | List, search, filter, sort and page             | 200              |
| POST   | `/api/requests`                        | Raise a request                                 | 201 + `Location` |
| GET    | `/api/requests/:reference`             | One request, with its notes and allowed actions | 200              |
| PATCH  | `/api/requests/:reference`             | Correct details (open or in review only)        | 200              |
| DELETE | `/api/requests/:reference`             | Take it off the desk (soft delete)              | 204              |
| POST   | `/api/requests/:reference/transitions` | Change status                                   | 200              |
| GET    | `/api/requests/:reference/notes`       | Notes, oldest first                             | 200              |
| POST   | `/api/requests/:reference/notes`       | Add a note                                      | 201              |

### `GET /api/requests`

| Parameter  | Default     | Notes                                                                                                                                                  |
| ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `q`        | —           | Case-insensitive "contains" match on reference, order number, customer name and customer email. `%` and `_` are matched literally. Max 100 characters. |
| `status`   | all         | One or more of `open`, `in_review`, `approved`, `rejected`, `completed`, comma-separated                                                               |
| `reason`   | all         | One or more of `damaged`, `wrong_item`, `size_issue`, `not_as_described`, `changed_mind`, comma-separated                                              |
| `sort`     | `createdAt` | `createdAt`, `updatedAt`, `reference`, `customerName`, `status`                                                                                        |
| `order`    | `desc`      | `asc` or `desc`                                                                                                                                        |
| `page`     | `1`         | 1 or more. A page past the end returns an empty list, not an error.                                                                                    |
| `pageSize` | `20`        | 1 to 100                                                                                                                                               |

Search, filters, sorting and paging are combined into one SQL query. Every value is a bound parameter, and the sort column comes from a fixed list.

```bash
curl "https://return-desk-frido.vercel.app/api/requests?q=ord-104&status=open,in_review&sort=customerName&order=asc&pageSize=5"
```

Each item in `data` looks like this:

```json
{
  "reference": "RD-00001",
  "customerName": "Aarav Sharma",
  "customerEmail": "aarav.sharma@example.in",
  "customerPhone": "+91 98201 12345",
  "orderNumber": "ORD-10401",
  "itemSku": "SKU-CUSH-BLK-M",
  "itemName": "Memory Foam Ergonomic Cushion (Black, M)",
  "quantity": 1,
  "reason": "damaged",
  "status": "open",
  "resolution": null,
  "refundAmount": null,
  "createdAt": "2026-09-19T18:04:29.660Z",
  "updatedAt": "2026-09-19T18:04:29.660Z",
  "decidedAt": null
}
```

The response includes `meta` with pagination and faceted counts:

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 34,
  "totalPages": 2,
  "facets": {
    "status": {
      "open": 8,
      "in_review": 7,
      "approved": 8,
      "rejected": 6,
      "completed": 5
    },
    "reason": {
      "damaged": 9,
      "wrong_item": 7,
      "size_issue": 8,
      "not_as_described": 6,
      "changed_mind": 4
    }
  }
}
```

Each dimension's counts ignore its own filter but respect search and the other filter (so you can see what selecting a chip would give).

### `POST /api/requests`

```json
{
  "customerName": "Rohan Verma",
  "customerEmail": "rohan.verma@example.com",
  "customerPhone": "+91 98765 43210",
  "orderNumber": "ORD-55001",
  "itemSku": "SKU-LUMBAR-01",
  "itemName": "Lumbar Support Cushion",
  "quantity": 1,
  "reason": "damaged"
}
```

`customerPhone` is optional. The limits:

| Field        | Limit                       |
| ------------ | --------------------------- |
| Name         | 120 characters              |
| Email        | 254 characters              |
| Phone        | 30 characters               |
| Order number | 64 characters               |
| SKU          | 64 characters               |
| Item name    | 200 characters              |
| Quantity     | whole number from 1 to 1000 |

The new request is always `open`, and the database generates its reference. Sending `reference`, `status` or any other extra field gets a 422.

The response is **201** with `Location: /api/requests/RD-00037` and the new request in `data`. If the order and item already have a live request, you get **409 `DUPLICATE_LIVE_REQUEST`**.

### `GET /api/requests/:reference`

This returns the request fields shown above, plus:

```json
{
  "notes": [
    {
      "id": "1",
      "author": "Pooja Sharma",
      "body": "Seam was ripped on arrival.",
      "createdAt": "2026-09-19T20:04:29.660Z"
    }
  ],
  "allowedActions": { "transitions": ["in_review"], "canEdit": true, "canRemove": true }
}
```

`allowedActions` comes from the same rules the server enforces. The UI shows exactly these actions and nothing else.

### `PATCH /api/requests/:reference`

Send any of the fields from `POST` that you want to change. At least one of them has to actually change, or you get a 422. `status`, `resolution` and `reference` can't be changed here.

Possible refusals:

- **409 `REQUEST_LOCKED`** once the request has been approved, rejected or completed
- **409 `DUPLICATE_LIVE_REQUEST`** if the new order and item would clash with another live request

### `POST /api/requests/:reference/transitions`

| From                    | Allowed `to`             |
| ----------------------- | ------------------------ |
| `open`                  | `in_review`              |
| `in_review`             | `approved`, `rejected`   |
| `approved`              | `completed`              |
| `rejected`, `completed` | nothing: these are final |

```json
{ "to": "in_review" }
{ "to": "approved", "resolution": "refund", "refundAmount": "499.00" }
{ "to": "approved", "resolution": "replacement" }
{ "to": "rejected" }
{ "to": "completed" }
```

- A refund needs an amount greater than 0 with at most two decimals (up to 99,999,999.99).
- A replacement or store credit must not have an amount.
- Only a move to `approved` may carry a resolution or amount.

Approving or rejecting sets `decidedAt`. The response is the updated request.

The checks run in this order:

1. The body is validated (400 or 422).
2. The request must exist (404).
3. The move must be legal from the current status (409).
4. The resolution rules apply (422).

So a move to `approved` from `open` gets a 409, even when the resolution is valid.

### `DELETE /api/requests/:reference`

This works for `open` or `rejected` requests and returns **204** with no body. The row stays in the database with `deleted_at` set. From then on, every endpoint returns 404 for that reference, and deleting it again also returns 404.

### Notes

`GET /api/requests/:reference/notes` returns the notes, oldest first.

`POST /api/requests/:reference/notes` with `{ "author": "Karan Verma", "body": "Called the customer." }` returns **201** and the note. The author can be up to 80 characters and the body up to 2000.

Notes can be added in any status, but not to a removed request. There's no way to edit or delete a note: no endpoint for it, and a database trigger blocks it too.

---

## Trying the rules with curl

Every example below gets refused, so it changes nothing, and you can safely run it against the live app. The references are from the seed data. If one has been moved on since, use another request with the same status.

```bash
BASE=https://return-desk-frido.vercel.app/api   # or http://localhost:3000/api
```

On Windows, run these in Git Bash, or use `curl.exe` in PowerShell with the JSON body in a file (`--data-binary "@body.json"`).

**Rule 1: a move that skips a step** (409)

```bash
curl -i -X POST "$BASE/requests/RD-00001/transitions" -H "Content-Type: application/json" \
  -d '{"to":"completed"}'
```

```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Cannot transition request from 'open' to 'completed'",
    "details": { "from": "open", "to": "completed", "allowed": ["in_review"] }
  }
}
```

**Rule 2: approving without a resolution** (422)

```bash
curl -i -X POST "$BASE/requests/RD-00006/transitions" -H "Content-Type: application/json" \
  -d '{"to":"approved"}'
```

```json
{
  "error": {
    "code": "RESOLUTION_REQUIRED",
    "message": "A resolution is required when approving a return request",
    "details": { "fields": { "resolution": "Resolution is required" } }
  }
}
```

**Rule 2: a refund of 0** (422)

```bash
curl -i -X POST "$BASE/requests/RD-00006/transitions" -H "Content-Type: application/json" \
  -d '{"to":"approved","resolution":"refund","refundAmount":0}'
```

```json
{
  "error": {
    "code": "RESOLUTION_REQUIRED",
    "message": "Refund amount must be greater than 0",
    "details": { "fields": { "refundAmount": "Refund amount must be greater than 0" } }
  }
}
```

**Rule 2: an amount on a replacement** (422)

```bash
curl -i -X POST "$BASE/requests/RD-00006/transitions" -H "Content-Type: application/json" \
  -d '{"to":"approved","resolution":"replacement","refundAmount":"499.00"}'
```

```json
{
  "error": {
    "code": "RESOLUTION_NOT_ALLOWED",
    "message": "Refund amount cannot be recorded for resolution 'replacement'",
    "details": { "fields": { "refundAmount": "Refund amount not allowed" } }
  }
}
```

**Rule 3: a second live request for the same item** (409). `RD-00001` is open for this order and SKU.

```bash
curl -i -X POST "$BASE/requests" -H "Content-Type: application/json" \
  -d '{"customerName":"Rohan Verma","customerEmail":"rohan@example.com","orderNumber":"ord-10401","itemSku":"sku-cush-blk-m","itemName":"Cushion","quantity":1,"reason":"damaged"}'
```

```json
{
  "error": {
    "code": "DUPLICATE_LIVE_REQUEST",
    "message": "An active return request already exists for this order item",
    "details": { "existingReference": "RD-00001" }
  }
}
```

The lowercase order number and SKU are deliberate. The check ignores letter case.

**Rule 4: editing a decided request** (409)

```bash
curl -i -X PATCH "$BASE/requests/RD-00011" -H "Content-Type: application/json" \
  -d '{"customerName":"New Name"}'
```

```json
{
  "error": {
    "code": "REQUEST_LOCKED",
    "message": "Cannot edit details because request 'RD-00011' is approved"
  }
}
```

**Rule 5: removing an approved request** (409)

```bash
curl -i -X DELETE "$BASE/requests/RD-00011"
```

```json
{
  "error": {
    "code": "REMOVAL_NOT_ALLOWED",
    "message": "Cannot remove request 'RD-00011' because its status is approved"
  }
}
```

**Trying to set the status while creating a request** (422)

```bash
curl -i -X POST "$BASE/requests" -H "Content-Type: application/json" \
  -d '{"customerName":"A","customerEmail":"a@b.in","orderNumber":"O-1","itemSku":"S-1","itemName":"Item","quantity":1,"reason":"damaged","status":"approved"}'
```

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request body failed validation checks",
    "details": { "fields": { "_root": "Unrecognized key: \"status\"" } }
  }
}
```

---

## Concurrent edits and optimistic locking

Every `GET /api/requests/:reference` response sets an `ETag` HTTP response header containing the record's `updatedAt` timestamp as epoch milliseconds in quotes:

```http
ETag: "1727280000000"
```

Clients performing mutations (`PATCH /api/requests/:reference`, `POST /api/requests/:reference/transitions`, and `DELETE /api/requests/:reference`) can send an `If-Match` header with this value:

```bash
curl -i -X PATCH "$BASE/requests/RD-00001" \
  -H "Content-Type: application/json" \
  -H 'If-Match: "1727280000000"' \
  -d '{"customerName":"Updated Name"}'
```

If another agent modified the request in the meantime, the server rejects the write with **`412 Precondition Failed`**:

```json
{
  "error": {
    "code": "STALE_REQUEST",
    "message": "This request changed since you opened it. Reload to see the latest version."
  }
}
```

The `If-Match` header is optional so quick curl exploration and scripts continue to work without having to pass ETags. Successful `PATCH` and status transition responses return the updated `ETag` header.
