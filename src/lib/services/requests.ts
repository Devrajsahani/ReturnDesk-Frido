import "server-only";
import { withTransaction } from "../db";
import { allowedActions, isLocked, type AllowedActions } from "../domain/lifecycle";
import { ApiError } from "../api/errors";
import { findNotesByRequestId, type NoteSummary } from "../queries/notes";
import {
  createRequestQuery,
  findLiveRequestByOrderAndSku,
  findRequestByReference,
  findRequestForUpdate,
  findRequests,
  mapRowToSummary,
  updateRequestQuery,
  type PaginationMeta,
  type ReturnRequestSummary,
} from "../queries/requests";
import type { CreateRequestInput, ListQueryInput, UpdateRequestInput } from "../validation/schemas";

export interface ReturnRequestDetail extends ReturnRequestSummary {
  notes: NoteSummary[];
  allowedActions: AllowedActions;
}

async function handleUniqueConstraintError(
  err: unknown,
  orderNumber: string,
  itemSku: string
): Promise<never> {
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "23505"
  ) {
    const pgError = err as { code: string; constraint?: string };
    if (pgError.constraint === "one_live_request_per_order_item") {
      // Query from the pool so we do not issue queries on an aborted transaction client
      const existing = await findLiveRequestByOrderAndSku(orderNumber, itemSku);
      throw new ApiError(
        409,
        "DUPLICATE_LIVE_REQUEST",
        "An active return request already exists for this order item",
        existing ? { existingReference: existing.reference } : undefined
      );
    }
  }
  throw err;
}

export async function listRequests(
  input: ListQueryInput
): Promise<{ data: ReturnRequestSummary[]; meta: PaginationMeta }> {
  return findRequests(input);
}

export async function createRequest(
  input: CreateRequestInput
): Promise<ReturnRequestSummary> {
  try {
    return await createRequestQuery(input);
  } catch (err: unknown) {
    await handleUniqueConstraintError(err, input.orderNumber, input.itemSku);
    throw err;
  }
}

export async function getRequestDetail(
  reference: string
): Promise<ReturnRequestDetail> {
  const ref = reference.toUpperCase();
  const row = await findRequestByReference(ref);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", `Request '${ref}' not found`);
  }

  const notes = await findNotesByRequestId(row.id);
  const summary = mapRowToSummary(row);

  return {
    ...summary,
    notes,
    allowedActions: allowedActions(row.status),
  };
}

export async function updateRequest(
  reference: string,
  updates: UpdateRequestInput
): Promise<ReturnRequestSummary> {
  const ref = reference.toUpperCase();

  return await withTransaction(async (client) => {
    const row = await findRequestForUpdate(ref, client);
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", `Request '${ref}' not found`);
    }

    if (isLocked(row.status)) {
      throw new ApiError(
        409,
        "REQUEST_LOCKED",
        `Cannot edit details because request '${ref}' is ${row.status}`
      );
    }

    // Check if any fields actually change from current values
    let hasChanges = false;
    if (updates.customerName !== undefined && updates.customerName !== row.customer_name) {
      hasChanges = true;
    }
    if (updates.customerEmail !== undefined && updates.customerEmail !== row.customer_email) {
      hasChanges = true;
    }
    if (updates.customerPhone !== undefined && updates.customerPhone !== row.customer_phone) {
      hasChanges = true;
    }
    if (updates.orderNumber !== undefined && updates.orderNumber !== row.order_number) {
      hasChanges = true;
    }
    if (updates.itemSku !== undefined && updates.itemSku !== row.item_sku) {
      hasChanges = true;
    }
    if (updates.itemName !== undefined && updates.itemName !== row.item_name) {
      hasChanges = true;
    }
    if (updates.quantity !== undefined && updates.quantity !== row.quantity) {
      hasChanges = true;
    }
    if (updates.reason !== undefined && updates.reason !== row.reason) {
      hasChanges = true;
    }

    if (!hasChanges) {
      throw new ApiError(422, "VALIDATION_FAILED", "No fields were changed", {
        fields: { _root: "At least one field must change from its current value" },
      });
    }

    try {
      return await updateRequestQuery(row.id, updates, client);
    } catch (err: unknown) {
      const effectiveOrder = updates.orderNumber ?? row.order_number;
      const effectiveSku = updates.itemSku ?? row.item_sku;
      await handleUniqueConstraintError(err, effectiveOrder, effectiveSku);
      throw err;
    }
  });
}
