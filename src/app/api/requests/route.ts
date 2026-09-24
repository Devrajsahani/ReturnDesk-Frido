import { type NextRequest } from "next/server";
import { created, ok, parseBody, parseJsonBody, parseQuery, withErrorHandling } from "@/lib/api/respond";
import { createRequest, listRequests } from "@/lib/services/requests";
import { createRequestSchema, listQuerySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const query = parseQuery(listQuerySchema, req.nextUrl.searchParams);
  const { data, meta } = await listRequests(query);
  return ok(data, meta);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await parseJsonBody(req);
  const input = parseBody(createRequestSchema, body);
  const data = await createRequest(input);
  return created(data, `/api/requests/${data.reference}`);
});
