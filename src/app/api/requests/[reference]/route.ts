import { type NextRequest } from "next/server";
import {
  methodNotAllowed,
  noContent,
  ok,
  parseBody,
  parseJsonBody,
  withErrorHandling,
} from "@/lib/api/respond";
import { getRequestDetail, removeRequest, updateRequest } from "@/lib/services/requests";
import { updateRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ reference: string }>;
}

export const GET = withErrorHandling(async (_req: NextRequest, { params }: RouteParams) => {
  const { reference } = await params;
  const data = await getRequestDetail(reference);
  const etag = `"${new Date(data.updatedAt).getTime()}"`;
  return ok(data, undefined, { ETag: etag });
});

export const PATCH = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const { reference } = await params;
  const ifMatch = req.headers.get("if-match") ?? undefined;
  const body = await parseJsonBody(req);
  const input = parseBody(updateRequestSchema, body);
  const data = await updateRequest(reference, input, ifMatch);
  const etag = `"${new Date(data.updatedAt).getTime()}"`;
  return ok(data, undefined, { ETag: etag });
});

export const DELETE = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const { reference } = await params;
  const ifMatch = req.headers.get("if-match") ?? undefined;
  await removeRequest(reference, ifMatch);
  return noContent();
});

export const POST = methodNotAllowed;
export const PUT = methodNotAllowed;
