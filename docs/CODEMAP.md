# Code map

This page covers where things live, and where each business rule is enforced.

## Request path

```
src/app/api/**/route.ts      HTTP: parse and validate input, call a service, shape the response
        ↓
src/lib/services/requests.ts business rules, transactions, row locks
        ↓
src/lib/queries/*.ts         SQL, and mapping rows to API objects
        ↓
src/lib/db.ts                connection pool, query(), withTransaction()
```

## Server

| File                                                    | What's in it                                                                                                                                                                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/domain/constants.ts`                           | The statuses, reasons and resolutions, their TypeScript types and display labels. Everything else imports these.                                                                                                                                                           |
| `src/lib/domain/lifecycle.ts`                           | `TRANSITIONS` (the only copy of the status flow), `canTransition`, `isLocked`, `isRemovable`, `allowedActions`                                                                                                                                                             |
| `src/lib/domain/types.ts`                               | Types shared by server and browser: `ReturnRequestSummary`, `ReturnRequestDetail`, `NoteSummary`                                                                                                                                                                           |
| `src/lib/validation/schemas.ts`                         | zod schemas for every input: `createRequestSchema`, `updateRequestSchema`, `transitionSchema`, `refundAmountSchema`, `noteSchema`, `listQuerySchema`. The API and the forms both use them.                                                                                 |
| `src/lib/api/errors.ts`                                 | `ApiError` and the list of error codes                                                                                                                                                                                                                                     |
| `src/lib/api/respond.ts`                                | `ok`, `created`, `noContent`, `methodNotAllowed`, `parseJsonBody`, `parseBody` (→ 422), `parseQuery` (→ 400), `withErrorHandling` (maps `ApiError` to its status, database connection errors to 503, anything else to a logged 500)                                        |
| `src/lib/db.ts`                                         | The `pg` pool (created on first use), `query`, `withTransaction`                                                                                                                                                                                                           |
| `src/lib/env.ts`                                        | Reads `DATABASE_URL`, shared by the app and the db scripts                                                                                                                                                                                                                 |
| `src/lib/queries/requests.ts`                           | `buildWhereClause` (one WHERE builder, shared by the list and its count), `findRequests`, `findRequestByReference`, `findRequestForUpdate`, `findLiveRequestByOrderAndSku`, `createRequestQuery`, `updateRequestQuery`, `transitionRequestQuery`, `softDeleteRequestQuery` |
| `src/lib/queries/notes.ts`                              | `findNotesByRequestId`, `insertNote`                                                                                                                                                                                                                                       |
| `src/lib/services/requests.ts`                          | `listRequests`, `createRequest`, `getRequestDetail`, `updateRequest`, `transitionRequest`, `removeRequest`, `getRequestNotes`, `addRequestNote`                                                                                                                            |
| `src/app/api/requests/route.ts`                         | `GET` list and `POST` create (other methods: 405)                                                                                                                                                                                                                          |
| `src/app/api/requests/[reference]/route.ts`             | `GET` detail, `PATCH` edit, `DELETE` remove                                                                                                                                                                                                                                |
| `src/app/api/requests/[reference]/transitions/route.ts` | `POST` status change                                                                                                                                                                                                                                                       |
| `src/app/api/requests/[reference]/notes/route.ts`       | `GET` and `POST` notes                                                                                                                                                                                                                                                     |
| `src/app/api/[[...slug]]/route.ts`                      | JSON 404 for any other `/api` path                                                                                                                                                                                                                                         |
| `db/migrations/001_init.sql`                            | The schema (see [DATABASE.md](DATABASE.md))                                                                                                                                                                                                                                |
| `db/migrate.ts`                                         | Applies migration files in order, each in its own transaction                                                                                                                                                                                                              |
| `db/seed.ts`                                            | Resets and loads the 36 sample requests                                                                                                                                                                                                                                    |

## Browser

| File                                         | What's in it                                                                                                                                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`                         | Fonts, the top bar and the toast provider                                                                                                                                                       |
| `src/app/page.tsx`                           | The desk. The filters live in the URL; search is debounced and cancels old requests; loading, empty and error states.                                                                           |
| `src/app/requests/new/page.tsx`              | New request                                                                                                                                                                                     |
| `src/app/requests/[reference]/page.tsx`      | Request detail: the action buttons come from `allowedActions`                                                                                                                                   |
| `src/app/requests/[reference]/edit/page.tsx` | Edit details, or the locked message                                                                                                                                                             |
| `src/lib/api/client.ts`                      | `apiFetch`, the only place the UI calls the API. It turns error responses into an `ApiClientError`.                                                                                             |
| `src/lib/format.ts`                          | Date and money formatting                                                                                                                                                                       |
| `src/hooks/useDebouncedValue.ts`             | The 300 ms debounce used by search                                                                                                                                                              |
| `src/components/desk/`                       | `DeskTable` (640px and up), `DeskCard` (phones), `DeskFilters`, `DeskPagination`, `DeskSkeleton`                                                                                                |
| `src/components/detail/`                     | `LifecycleTrack`, `RequestDetailsCard`, `NotesCard`, `ApproveDialog`, `RejectDialog`, `RemoveDialog`                                                                                            |
| `src/components/forms/RequestForm.tsx`       | One form for create and edit, validated with the shared schemas                                                                                                                                 |
| `src/components/ui/`                         | Base components: `Button`, `Input`, `Textarea`, `Select`, `ChoiceTile`, `FilterChip`, `StatusBadge`, `ReferenceTag`, `Banner`, `Toast`, `Dialog`, `EmptyState`, `Skeleton`, `Spinner`, `TopBar` |
| `src/app/globals.css`                        | Design tokens (colours, radii, shadows) and the shared `box`, `box-interactive` and `pressable` styles                                                                                          |

## Where each rule is enforced

| Rule                                 | Service                                                                                                                        | Database                                                               | UI                                                             |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1. Status flow                       | `lifecycle.ts › canTransition`, used by `transitionRequest` → 409 `INVALID_TRANSITION`                                         | —                                                                      | Buttons come from `allowedActions.transitions`                 |
| 2. Resolution and refund amount      | `transitionRequest` checks the resolution and runs `refundAmountSchema` → 422 `RESOLUTION_REQUIRED` / `RESOLUTION_NOT_ALLOWED` | CHECKs `resolution_matches_status`, `refund_amount_matches_resolution` | The Approve dialog only shows the amount field for Refund      |
| 3. One live request per order + item | `createRequest` and `updateRequest` turn Postgres error `23505` into 409 `DUPLICATE_LIVE_REQUEST`                              | Partial unique index `one_live_request_per_order_item`                 | The form shows a banner linking to the existing request        |
| 4. Locked once decided               | `lifecycle.ts › isLocked`, used by `updateRequest` → 409 `REQUEST_LOCKED`                                                      | —                                                                      | Edit is only offered when `allowedActions.canEdit` is true     |
| 5. Removal                           | `lifecycle.ts › isRemovable`, used by `removeRequest` → 409 `REMOVAL_NOT_ALLOWED`; every read filters `deleted_at IS NULL`     | CHECK `only_open_or_rejected_removed`; FK `ON DELETE RESTRICT`         | Remove is only offered when `allowedActions.canRemove` is true |
| Notes are permanent                  | No update or delete endpoint exists                                                                                            | Trigger `request_notes_append_only`                                    | No edit or delete controls                                     |

Edits, status changes and removals all run inside `withTransaction`, and they lock the row with `findRequestForUpdate` (`SELECT … FOR UPDATE`) before checking any rule.
