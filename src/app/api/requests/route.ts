import { type NextRequest } from "next/server";
import { ok, parseQuery, withErrorHandling } from "@/lib/api/respond";
import { listRequests } from "@/lib/services/requests";
import { listQuerySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const query = parseQuery(listQuerySchema, req.nextUrl.searchParams);
  const { data, meta } = await listRequests(query);
  return ok(data, meta);
});
