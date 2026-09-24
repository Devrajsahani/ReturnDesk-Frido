import "server-only";
import { query } from "../db";
import type { RequestResolution, RequestStatus, ReturnReason } from "../domain/constants";
import type { ListQueryInput, SortField } from "../validation/schemas";

export interface RequestRow {
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
      `(reference ILIKE $${paramIndex} ESCAPE '\\' OR order_number ILIKE $${paramIndex} ESCAPE '\\' OR customer_name ILIKE $${paramIndex} ESCAPE '\\' OR customer_email ILIKE $${paramIndex} ESCAPE '\\')`
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

function mapRowToSummary(row: RequestRow): ReturnRequestSummary {
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
  input: ListQueryInput
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
