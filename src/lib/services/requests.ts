import "server-only";
import { withTransaction } from "../db";
import { allowedActions, canTransition, isLocked, isRemovable, TRANSITIONS, type AllowedActions } from "../domain/lifecycle";
import { ApiError } from "../api/errors";
import { findNotesByRequestId, insertNote, type NoteSummary } from "../queries/notes";
import {
  createRequestQuery,
  findLiveRequestByOrderAndSku,
  findRequestByReference,
  findRequestForUpdate,
  findRequests,
  mapRowToSummary,
  softDeleteRequestQuery,
  transitionRequestQuery,
  updateRequestQuery,
  type PaginationMeta,
  type ReturnRequestSummary,
} from "../queries/requests";
import type { CreateRequestInput, ListQueryInput, NoteInput, TransitionInput, UpdateRequestInput } from "../validation/schemas";

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

function parseRefundAmount(val: unknown): string {
  if (val === undefined || val === null || val === "") {
    throw new ApiError(
      422,
      "RESOLUTION_REQUIRED",
      "Refund amount is required for refund resolution",
      { fields: { refundAmount: "Refund amount is required" } }
    );
  }

  const str = typeof val === "number" ? val.toString() : String(val).trim();
  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(str)) {
    throw new ApiError(
      422,
      "RESOLUTION_REQUIRED",
      "Refund amount must be a positive number with at most 2 decimal places",
      { fields: { refundAmount: "Invalid refund amount" } }
    );
  }

  const num = Number(str);
  if (num <= 0) {
    throw new ApiError(
      422,
      "RESOLUTION_REQUIRED",
      "Refund amount must be greater than 0",
      { fields: { refundAmount: "Refund amount must be greater than 0" } }
    );
  }

  return num.toFixed(2);
}

export async function transitionRequest(
  reference: string,
  input: TransitionInput
): Promise<ReturnRequestSummary> {
  const ref = reference.toUpperCase();

  return await withTransaction(async (client) => {
    // Step 1: 404 if not found or soft-deleted
    const row = await findRequestForUpdate(ref, client);
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", `Request '${ref}' not found`);
    }

    // Step 3: 409 if illegal transition from current status
    if (!canTransition(row.status, input.to)) {
      throw new ApiError(
        409,
        "INVALID_TRANSITION",
        `Cannot transition request from '${row.status}' to '${input.to}'`,
        {
          from: row.status,
          to: input.to,
          allowed: TRANSITIONS[row.status],
        }
      );
    }

    // Step 4: 422 for resolution or amount rules
    let formattedRefundAmount: string | undefined;

    if (input.to === "approved") {
      if (!input.resolution) {
        throw new ApiError(
          422,
          "RESOLUTION_REQUIRED",
          "A resolution is required when approving a return request",
          { fields: { resolution: "Resolution is required" } }
        );
      }

      if (input.resolution === "refund") {
        formattedRefundAmount = parseRefundAmount(input.refundAmount);
      } else {
        // replacement or store_credit
        if (input.refundAmount !== undefined && input.refundAmount !== null) {
          throw new ApiError(
            422,
            "RESOLUTION_NOT_ALLOWED",
            `Refund amount cannot be recorded for resolution '${input.resolution}'`,
            { fields: { refundAmount: "Refund amount not allowed" } }
          );
        }
      }
    } else {
      // not approved (in_review, rejected, completed)
      if (input.resolution !== undefined && input.resolution !== null) {
        throw new ApiError(
          422,
          "RESOLUTION_NOT_ALLOWED",
          `Resolution cannot be set when transitioning to '${input.to}'`,
          { fields: { resolution: "Resolution not allowed" } }
        );
      }
      if (input.refundAmount !== undefined && input.refundAmount !== null) {
        throw new ApiError(
          422,
          "RESOLUTION_NOT_ALLOWED",
          `Refund amount cannot be recorded when transitioning to '${input.to}'`,
          { fields: { refundAmount: "Refund amount not allowed" } }
        );
      }
    }

    return await transitionRequestQuery(
      row.id,
      {
        to: input.to,
        resolution: input.resolution,
        refundAmount: formattedRefundAmount,
      },
      client
    );
  });
}

export async function removeRequest(reference: string): Promise<void> {
  const ref = reference.toUpperCase();

  await withTransaction(async (client) => {
    const row = await findRequestForUpdate(ref, client);
    if (!row) {
      throw new ApiError(404, "NOT_FOUND", `Request '${ref}' not found`);
    }

    if (!isRemovable(row.status)) {
      throw new ApiError(
        409,
        "REMOVAL_NOT_ALLOWED",
        `Cannot remove request '${ref}' because its status is ${row.status}`
      );
    }

    await softDeleteRequestQuery(row.id, client);
  });
}

export async function getRequestNotes(reference: string): Promise<NoteSummary[]> {
  const ref = reference.toUpperCase();
  const row = await findRequestByReference(ref);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", `Request '${ref}' not found`);
  }
  return await findNotesByRequestId(row.id);
}

export async function addRequestNote(
  reference: string,
  input: NoteInput
): Promise<NoteSummary> {
  const ref = reference.toUpperCase();
  const row = await findRequestByReference(ref);
  if (!row) {
    throw new ApiError(404, "NOT_FOUND", `Request '${ref}' not found`);
  }
  return await insertNote(row.id, input.author, input.body);
}
