import "server-only";
import { type PoolClient } from "pg";
import { query } from "../db";
import type { RequestResolution, RequestStatus, ReturnReason } from "../domain/constants";
import type {
  CreateRequestInput,
  ListQueryInput,
  SortField,
  UpdateRequestInput,
} from "../validation/schemas";

export interface RequestRow {
  id: number | string;
  reference: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  order_number: string;
  item_sku: string;
  item_name: string;
  quantity: number;
  reason: ReturnReason;
  status: RequestStatus;
  resolution: RequestResolution | null;
  refund_amount: string | null;
  created_at: Date;
  updated_at: Date;
  decided_at: Date | null;
}

export interface ReturnRequestSummary {
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  orderNumber: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  reason: ReturnReason;
  status: RequestStatus;
  resolution: RequestResolution | null;
  refundAmount: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const SORT_COLUMN_MAP: Record<SortField, string> = {
  createdAt: "created_at",
  updatedAt: "updated_at",
  reference: "reference",
  customerName: "customer_name",
  status: "status",
};

export function escapeIlike(str: string): string {
  return str.replace(/([%_\\])/g, "\\$1");
}

export interface RequestFilterParams {
  q?: string;
  status?: RequestStatus[];
  reason?: ReturnReason[];
}

export function buildWhereClause(filters: RequestFilterParams): {
  whereSql: string;
  params: unknown[];
} {
  const conditions: string[] = ["deleted_at IS NULL"];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (filters.q) {
    const escaped = `%${escapeIlike(filters.q)}%`;
    conditions.push(
      `(reference ILIKE $${paramIndex} ESCAPE '\\' OR order_number ILIKE $${paramIndex} ESCAPE '\\' OR customer_name ILIKE $${paramIndex} ESCAPE '\\' OR customer_email ILIKE $${paramIndex} ESCAPE '\\')`,
    );
    params.push(escaped);
    paramIndex++;
  }

  if (filters.status && filters.status.length > 0) {
    conditions.push(`status = ANY($${paramIndex}::request_status[])`);
    params.push(filters.status);
    paramIndex++;
  }

  if (filters.reason && filters.reason.length > 0) {
    conditions.push(`reason = ANY($${paramIndex}::return_reason[])`);
    params.push(filters.reason);
    paramIndex++;
  }

  return {
    whereSql: `WHERE ${conditions.join(" AND ")}`,
    params,
  };
}

export function mapRowToSummary(row: RequestRow): ReturnRequestSummary {
  return {
    reference: row.reference,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    orderNumber: row.order_number,
    itemSku: row.item_sku,
    itemName: row.item_name,
    quantity: row.quantity,
    reason: row.reason,
    status: row.status,
    resolution: row.resolution,
    refundAmount: row.refund_amount !== null ? String(row.refund_amount) : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    decidedAt: row.decided_at ? row.decided_at.toISOString() : null,
  };
}

export async function findRequests(
  input: ListQueryInput,
): Promise<{ data: ReturnRequestSummary[]; meta: PaginationMeta }> {
  const { whereSql, params } = buildWhereClause({
    q: input.q,
    status: input.status,
    reason: input.reason,
  });

  const countSql = `SELECT count(*)::int as total FROM return_requests ${whereSql}`;
  const countRows = await query<{ total: number }>(countSql, params);
  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.ceil(total / input.pageSize);

  const sortCol = SORT_COLUMN_MAP[input.sort] ?? "created_at";
  const sortOrder = input.order === "asc" ? "ASC" : "DESC";

  const limit = input.pageSize;
  const offset = (input.page - 1) * input.pageSize;

  const pageParams = [...params, limit, offset];
  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const pageSql = `
    SELECT
      id,
      reference,
      customer_name,
      customer_email,
      customer_phone,
      order_number,
      item_sku,
      item_name,
      quantity,
      reason,
      status,
      resolution,
      refund_amount,
      created_at,
      updated_at,
      decided_at
    FROM return_requests
    ${whereSql}
    ORDER BY ${sortCol} ${sortOrder}, id ${sortOrder}
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const rows = await query<RequestRow>(pageSql, pageParams);
  const data = rows.map(mapRowToSummary);

  return {
    data,
    meta: {
      page: input.page,
      pageSize: input.pageSize,
      total,
      totalPages,
    },
  };
}

export async function createRequestQuery(
  input: CreateRequestInput,
  client?: PoolClient,
): Promise<ReturnRequestSummary> {
  const sql = `
    INSERT INTO return_requests (
      customer_name,
      customer_email,
      customer_phone,
      order_number,
      item_sku,
      item_name,
      quantity,
      reason,
      status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'open')
    RETURNING
      id,
      reference,
      customer_name,
      customer_email,
      customer_phone,
      order_number,
      item_sku,
      item_name,
      quantity,
      reason,
      status,
      resolution,
      refund_amount,
      created_at,
      updated_at,
      decided_at
  `;

  const params = [
    input.customerName,
    input.customerEmail,
    input.customerPhone ?? null,
    input.orderNumber,
    input.itemSku,
    input.itemName,
    input.quantity,
    input.reason,
  ];

  const rows = client
    ? (await client.query<RequestRow>(sql, params)).rows
    : await query<RequestRow>(sql, params);

  return mapRowToSummary(rows[0]);
}

export async function findRequestByReference(
  reference: string,
  client?: PoolClient,
): Promise<RequestRow | null> {
  const sql = `
    SELECT
      id,
      reference,
      customer_name,
      customer_email,
      customer_phone,
      order_number,
      item_sku,
      item_name,
      quantity,
      reason,
      status,
      resolution,
      refund_amount,
      created_at,
      updated_at,
      decided_at
    FROM return_requests
    WHERE reference = $1 AND deleted_at IS NULL
  `;

  const rows = client
    ? (await client.query<RequestRow>(sql, [reference])).rows
    : await query<RequestRow>(sql, [reference]);

  return rows[0] ?? null;
}

export async function findRequestForUpdate(
  reference: string,
  client: PoolClient,
): Promise<RequestRow | null> {
  const sql = `
    SELECT
      id,
      reference,
      customer_name,
      customer_email,
      customer_phone,
      order_number,
      item_sku,
      item_name,
      quantity,
      reason,
      status,
      resolution,
      refund_amount,
      created_at,
      updated_at,
      decided_at
    FROM return_requests
    WHERE reference = $1 AND deleted_at IS NULL
    FOR UPDATE
  `;

  const rows = await client.query<RequestRow>(sql, [reference]);
  return rows.rows[0] ?? null;
}

export async function findLiveRequestByOrderAndSku(
  orderNumber: string,
  itemSku: string,
  client?: PoolClient,
): Promise<{ reference: string } | null> {
  const sql = `
    SELECT reference
    FROM return_requests
    WHERE lower(order_number) = lower($1)
      AND lower(item_sku) = lower($2)
      AND status IN ('open', 'in_review', 'approved')
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const rows = client
    ? (await client.query<{ reference: string }>(sql, [orderNumber, itemSku])).rows
    : await query<{ reference: string }>(sql, [orderNumber, itemSku]);

  return rows[0] ?? null;
}

export async function updateRequestQuery(
  id: number | string,
  updates: UpdateRequestInput,
  client: PoolClient,
): Promise<ReturnRequestSummary> {
  const sets: string[] = ["updated_at = now()"];
  const params: unknown[] = [id];
  let idx = 2;

  if (updates.customerName !== undefined) {
    sets.push(`customer_name = $${idx++}`);
    params.push(updates.customerName);
  }
  if (updates.customerEmail !== undefined) {
    sets.push(`customer_email = $${idx++}`);
    params.push(updates.customerEmail);
  }
  if (updates.customerPhone !== undefined) {
    sets.push(`customer_phone = $${idx++}`);
    params.push(updates.customerPhone);
  }
  if (updates.orderNumber !== undefined) {
    sets.push(`order_number = $${idx++}`);
    params.push(updates.orderNumber);
  }
  if (updates.itemSku !== undefined) {
    sets.push(`item_sku = $${idx++}`);
    params.push(updates.itemSku);
  }
  if (updates.itemName !== undefined) {
    sets.push(`item_name = $${idx++}`);
    params.push(updates.itemName);
  }
  if (updates.quantity !== undefined) {
    sets.push(`quantity = $${idx++}`);
    params.push(updates.quantity);
  }
  if (updates.reason !== undefined) {
    sets.push(`reason = $${idx++}`);
    params.push(updates.reason);
  }

  const sql = `
    UPDATE return_requests
    SET ${sets.join(", ")}
    WHERE id = $1
    RETURNING
      id,
      reference,
      customer_name,
      customer_email,
      customer_phone,
      order_number,
      item_sku,
      item_name,
      quantity,
      reason,
      status,
      resolution,
      refund_amount,
      created_at,
      updated_at,
      decided_at
  `;

  const res = await client.query<RequestRow>(sql, params);
  return mapRowToSummary(res.rows[0]);
}

export async function transitionRequestQuery(
  id: number | string,
  input: {
    to: RequestStatus;
    resolution?: RequestResolution;
    refundAmount?: string;
  },
  client: PoolClient,
): Promise<ReturnRequestSummary> {
  let sql: string;
  let params: unknown[];

  if (input.to === "approved") {
    sql = `
      UPDATE return_requests
      SET
        status = 'approved',
        resolution = $2,
        refund_amount = $3,
        decided_at = now(),
        updated_at = now()
      WHERE id = $1
      RETURNING
        id, reference, customer_name, customer_email, customer_phone,
        order_number, item_sku, item_name, quantity, reason, status,
        resolution, refund_amount, created_at, updated_at, decided_at
    `;
    params = [id, input.resolution, input.refundAmount ?? null];
  } else if (input.to === "rejected") {
    sql = `
      UPDATE return_requests
      SET
        status = 'rejected',
        resolution = NULL,
        refund_amount = NULL,
        decided_at = now(),
        updated_at = now()
      WHERE id = $1
      RETURNING
        id, reference, customer_name, customer_email, customer_phone,
        order_number, item_sku, item_name, quantity, reason, status,
        resolution, refund_amount, created_at, updated_at, decided_at
    `;
    params = [id];
  } else if (input.to === "in_review") {
    sql = `
      UPDATE return_requests
      SET
        status = 'in_review',
        resolution = NULL,
        refund_amount = NULL,
        decided_at = NULL,
        updated_at = now()
      WHERE id = $1
      RETURNING
        id, reference, customer_name, customer_email, customer_phone,
        order_number, item_sku, item_name, quantity, reason, status,
        resolution, refund_amount, created_at, updated_at, decided_at
    `;
    params = [id];
  } else {
    // completed
    sql = `
      UPDATE return_requests
      SET
        status = 'completed',
        updated_at = now()
      WHERE id = $1
      RETURNING
        id, reference, customer_name, customer_email, customer_phone,
        order_number, item_sku, item_name, quantity, reason, status,
        resolution, refund_amount, created_at, updated_at, decided_at
    `;
    params = [id];
  }

  const res = await client.query<RequestRow>(sql, params);
  return mapRowToSummary(res.rows[0]);
}

export async function softDeleteRequestQuery(
  id: number | string,
  client: PoolClient,
): Promise<void> {
  const sql = `
    UPDATE return_requests
    SET
      deleted_at = now(),
      updated_at = now()
    WHERE id = $1
  `;
  await client.query(sql, [id]);
}
