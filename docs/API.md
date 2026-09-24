# ReturnDesk API Reference

The ReturnDesk API is a RESTful JSON interface designed for human support agents managing e-commerce returns. All endpoints use JSON for requests and responses, return predictable HTTP status codes, and enforce strict domain business rules backed by database constraints.

---

## 1. General Conventions

- **Encoding:** `UTF-8`. Requests with bodies must supply `Content-Type: application/json`.
- **JSON Format:** Request and response properties use `camelCase`.
- **References:** Resource identifiers are uppercase strings formatted as `RD-xxxxx` (e.g. `RD-00012`). All lookup endpoints accept references case-insensitively (e.g. `rd-00012` resolves identically to `RD-00012`). Database internal numeric IDs (`id`) are never exposed in API payloads.
- **Monetary Values:** All currency/refund values are formatted and returned as strings with exactly 2 decimal places (e.g. `"499.00"`). Inputs accept numbers or numeric strings and are normalized by the API.
- **Timestamps:** ISO 8601 strings in UTC format (e.g. `"2026-09-24T18:30:25.303Z"`).
- **Soft Deletion:** Any request where `deleted_at IS NOT NULL` is completely omitted from list queries and returns `404 Not Found` across all single-resource endpoints.
- **Caching:** Dynamic route handlers set `dynamic = 'force-dynamic'` and `cache-control: no-store` to prevent stale reads.

---

## 2. Error Envelope & Status Codes

Every error response strictly follows a uniform envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of what went wrong",
    "details": {
      "fields": {
        "fieldName": "Specific validation failure message"
      }
    }
  }
}
```

### Complete Error Code Registry

| HTTP | Code | Meaning |
|---|---|---|
| `400` | `INVALID_JSON` | The request body could not be parsed as valid JSON. |
| `400` | `INVALID_QUERY` | One or more query string parameters failed validation. |
| `404` | `NOT_FOUND` | The specified reference does not exist, was soft-deleted, or the path does not exist. |
| `405` | `METHOD_NOT_ALLOWED` | An unsupported HTTP method was invoked on a recognized route. |
| `409` | `INVALID_TRANSITION` | The requested status transition is not permitted from the request's current state (Rule 1). |
| `409` | `DUPLICATE_LIVE_REQUEST` | An active return request already exists for this order number and SKU (Rule 3). |
| `409` | `REQUEST_LOCKED` | Cannot edit request details because the request has already been decided (Rule 4). |
| `409` | `REMOVAL_NOT_ALLOWED` | A request can only be removed from the desk while in `open` or `rejected` status (Rule 5). |
| `422` | `VALIDATION_FAILED` | Well-formed JSON body failed schema validation (e.g. missing required field, unknown field, empty PATCH). |
| `422` | `RESOLUTION_REQUIRED` | Moving to `approved` without a resolution, or with `refund` resolution without a positive refund amount (Rule 2). |
| `422` | `RESOLUTION_NOT_ALLOWED` | Supplying a refund amount for non-refund resolutions, or providing a resolution/amount when transitioning to non-approved statuses (Rule 2). |
| `500` | `INTERNAL_ERROR` | An unexpected server error occurred. Details are logged on the server and never leaked. |

---

## 3. Endpoints

### 3.1 List Return Requests

`GET /api/requests`

Returns a paginated list of active return requests matching search queries and filters.

#### Query Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `q` | `string` | — | Substring search across `reference`, `orderNumber`, `customerName`, `customerEmail`. Wildcards (`%`, `_`) are escaped. |
| `status` | `string` | — | Filter by status (`open`, `in_review`, `approved`, `rejected`, `completed`). Comma-separated or repeatable. |
| `reason` | `string` | — | Filter by return reason (`damaged`, `wrong_item`, `size_issue`, `not_as_described`, `changed_mind`). Comma-separated or repeatable. |
| `sort` | `string` | `createdAt` | Column whitelist: `createdAt`, `updatedAt`, `reference`, `customerName`, `status`. |
| `order` | `string` | `desc` | Sort direction: `asc` or `desc`. |
| `page` | `integer` | `1` | Page number (minimum 1). |
| `pageSize`| `integer` | `20` | Page size (1 to 100). |

#### Success Response (`200 OK`)

```json
{
  "data": [
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
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 34,
    "totalPages": 2
  }
}
```

---

### 3.2 Create Return Request

`POST /api/requests`

Creates a new return request. The initial status is always `open`, and the unique reference `RD-xxxxx` is generated sequentially by PostgreSQL.

#### Request Body

```json
{
  "customerName": "Rohan Verma",
  "customerEmail": "rohan.verma@example.com",
  "customerPhone": "+91 98765 43210",
  "orderNumber": "ORD-55001",
  "itemSku": "SKU-TEST-01",
  "itemName": "Ergonomic Lumbar Cushion",
  "quantity": 1,
  "reason": "damaged"
}
```

*Note:* `customerPhone` is optional (or null). Unrecognized keys (e.g. `reference` or `status`) are rejected with `422 VALIDATION_FAILED`.

#### Success Response (`201 Created`)

- **Header:** `Location: /api/requests/RD-00037`
- **Body:** Single request object with generated reference and timestamps.

---

### 3.3 Get Return Request Detail

`GET /api/requests/:reference`

Fetches a single return request by reference (case-insensitive), including associated notes ordered chronologically (oldest first) and server-computed `allowedActions`.

#### Success Response (`200 OK`)

```json
{
  "data": {
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
    "decidedAt": null,
    "notes": [
      {
        "id": "1",
        "author": "Pooja Sharma",
        "body": "Customer raised request stating bottom seam was ripped upon unboxing.",
        "createdAt": "2026-09-19T20:04:29.660Z"
      }
    ],
    "allowedActions": {
      "transitions": ["in_review"],
      "canEdit": true,
      "canRemove": true
    }
  }
}
```

---

### 3.4 Edit Return Request Details

`PATCH /api/requests/:reference`

Edits customer or item details while the ticket is undecided (`open` or `in_review`). Operates inside a transaction with row-level pessimistic locking (`SELECT ... FOR UPDATE`).

#### Request Body

Provide at least one field to update. Fields with unchanged values will return `422 VALIDATION_FAILED`.

```json
{
  "customerName": "Aarav K. Sharma",
  "customerPhone": "+91 98201 99999"
}
```

#### Success Response (`200 OK`)

Returns the updated request object with refreshed `updatedAt`.

---

### 3.5 Transition Status

`POST /api/requests/:reference/transitions`

Moves the request through its lifecycle state machine. Operates inside a transaction with row-level pessimistic locking (`SELECT ... FOR UPDATE`).

#### Allowed State Transitions (Rule 1)

- `open` → `in_review`
- `in_review` → `approved` or `rejected`
- `approved` → `completed`
- `rejected` → *none* (terminal state)
- `completed` → *none* (terminal state)

#### Request Body Examples

**Start Review:**
```json
{
  "to": "in_review"
}
```

**Approve with Refund (requires positive amount):**
```json
{
  "to": "approved",
  "resolution": "refund",
  "refundAmount": "499.00"
}
```

**Approve with Replacement or Store Credit (must NOT have refund amount):**
```json
{
  "to": "approved",
  "resolution": "replacement"
}
```

**Reject (must NOT have resolution or refund amount):**
```json
{
  "to": "rejected"
}
```

**Complete:**
```json
{
  "to": "completed"
}
```

#### Success Response (`200 OK`)

Returns the updated request object with updated `status`, `decidedAt` (if approved or rejected), and updated resolution details.

---

### 3.6 Soft-Delete Request

`DELETE /api/requests/:reference`

Removes a request from the desk. Only permissible if current status is `open` or `rejected` (Rule 5). The row remains in the database with `deleted_at = now()`.

#### Success Response (`204 No Content`)

Empty body. Subsequent API requests for this reference return `404 Not Found`.

---

### 3.7 List Notes

`GET /api/requests/:reference/notes`

Returns all notes for the specified request ordered chronologically (oldest first).

#### Success Response (`200 OK`)

```json
{
  "data": [
    {
      "id": "1",
      "author": "Karan Verma",
      "body": "Customer shared packaging photos showing defect.",
      "createdAt": "2026-09-20T10:00:00.000Z"
    }
  ]
}
```

---

### 3.8 Add Note

`POST /api/requests/:reference/notes`

Appends an immutable note to a request. Allowed at any lifecycle status (`open`, `in_review`, `approved`, `rejected`, `completed`), but prohibited on soft-deleted requests.

#### Request Body

```json
{
  "author": "Agent Priya",
  "body": "Customer called asking for replacement delivery tracking number."
}
```

#### Success Response (`201 Created`)

- **Header:** `Location: /api/requests/:reference/notes`
- **Body:** `{ "data": { "id": "34", "author": "Agent Priya", "body": "...", "createdAt": "..." } }`

---

## 4. Copy-Pasteable Curl Refusal Examples

These examples reproduce every business-rule refusal against a running instance (`http://localhost:3000`).

### Rule 1: Invalid Transition (`409 INVALID_TRANSITION`)

Attempting to jump from `open` directly to `completed`:

```powershell
curl.exe -i -X POST "http://localhost:3000/api/requests/RD-00001/transitions" `
  -H "Content-Type: application/json" `
  -d '{\"to\": \"completed\"}'
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"INVALID_TRANSITION","message":"Cannot transition request from 'open' to 'completed'","details":{"from":"open","to":"completed","allowed":["in_review"]}}}
```

---

### Rule 2: Resolution Required (`422 RESOLUTION_REQUIRED`)

Attempting to approve a request without choosing a resolution:

```powershell
curl.exe -i -X POST "http://localhost:3000/api/requests/RD-00006/transitions" `
  -H "Content-Type: application/json" `
  -d '{\"to\": \"approved\"}'
```

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{"error":{"code":"RESOLUTION_REQUIRED","message":"A resolution is required when approving a return request","details":{"fields":{"resolution":"Resolution is required"}}}}
```

---

### Rule 2: Refund Amount Required for Refund Resolution (`422 RESOLUTION_REQUIRED`)

Attempting to approve with resolution `refund` but amount is zero:

```powershell
curl.exe -i -X POST "http://localhost:3000/api/requests/RD-00006/transitions" `
  -H "Content-Type: application/json" `
  -d '{\"to\": \"approved\", \"resolution\": \"refund\", \"refundAmount\": 0}'
```

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{"error":{"code":"RESOLUTION_REQUIRED","message":"Refund amount must be greater than 0","details":{"fields":{"refundAmount":"Refund amount must be greater than 0"}}}}
```

---

### Rule 2: Resolution / Refund Amount Not Allowed (`422 RESOLUTION_NOT_ALLOWED`)

Attempting to record a refund amount for resolution `replacement`:

```powershell
curl.exe -i -X POST "http://localhost:3000/api/requests/RD-00006/transitions" `
  -H "Content-Type: application/json" `
  -d '{\"to\": \"approved\", \"resolution\": \"replacement\", \"refundAmount\": \"499.00\"}'
```

```http
HTTP/1.1 422 Unprocessable Entity
Content-Type: application/json

{"error":{"code":"RESOLUTION_NOT_ALLOWED","message":"Refund amount cannot be recorded for resolution 'replacement'","details":{"fields":{"refundAmount":"Refund amount not allowed"}}}}
```

---

### Rule 3: Duplicate Live Request Collision (`409 DUPLICATE_LIVE_REQUEST`)

Attempting to raise a return request for an order item with an existing live ticket:

```powershell
curl.exe -i -X POST "http://localhost:3000/api/requests" `
  -H "Content-Type: application/json" `
  -d '{\"customerName\":\"Rohan Verma\",\"customerEmail\":\"rohan@example.com\",\"orderNumber\":\"ORD-10401\",\"itemSku\":\"SKU-CUSH-BLK-M\",\"itemName\":\"Cushion\",\"quantity\":1,\"reason\":\"damaged\"}'
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"DUPLICATE_LIVE_REQUEST","message":"An active return request already exists for this order item","details":{"existingReference":"RD-00001"}}}
```

---

### Rule 4: Request Locked After Decision (`409 REQUEST_LOCKED`)

Attempting to PATCH details of an already-decided (`approved`, `rejected`, or `completed`) request:

```powershell
curl.exe -i -X PATCH "http://localhost:3000/api/requests/RD-00011" `
  -H "Content-Type: application/json" `
  -d '{\"customerName\": \"New Name\"}'
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"REQUEST_LOCKED","message":"Cannot edit details because request 'RD-00011' is approved"}}
```

---

### Rule 5: Removal Not Allowed (`409 REMOVAL_NOT_ALLOWED`)

Attempting to DELETE a request whose status is `in_review`, `approved`, or `completed`:

```powershell
curl.exe -i -X DELETE "http://localhost:3000/api/requests/RD-00011"
```

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{"error":{"code":"REMOVAL_NOT_ALLOWED","message":"Cannot remove request 'RD-00011' because its status is approved"}}
```
