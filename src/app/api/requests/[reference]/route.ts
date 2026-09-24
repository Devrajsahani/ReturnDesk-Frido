import { type NextRequest } from "next/server";
import { ok, parseBody, parseJsonBody, withErrorHandling } from "@/lib/api/respond";
import { getRequestDetail, updateRequest } from "@/lib/services/requests";
import { updateRequestSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ reference: string }>;
}

export const GET = withErrorHandling(
  async (_req: NextRequest, { params }: RouteParams) => {
    const { reference } = await params;
    const data = await getRequestDetail(reference);
    return ok(data);
  }
);

export const PATCH = withErrorHandling(
  async (req: NextRequest, { params }: RouteParams) => {
    const { reference } = await params;
    const body = await parseJsonBody(req);
    const input = parseBody(updateRequestSchema, body);
    const data = await updateRequest(reference, input);
    return ok(data);
  }
);
