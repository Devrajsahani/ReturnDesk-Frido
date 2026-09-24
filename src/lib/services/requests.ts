import "server-only";
import {
  findRequests,
  type PaginationMeta,
  type ReturnRequestSummary,
} from "../queries/requests";
import type { ListQueryInput } from "../validation/schemas";

export async function listRequests(
  input: ListQueryInput
): Promise<{ data: ReturnRequestSummary[]; meta: PaginationMeta }> {
  return findRequests(input);
}
