import { type NextRequest } from "next/server";
import {
  methodNotAllowed,
  ok,
  parseBody,
  parseJsonBody,
  withErrorHandling,
} from "@/lib/api/respond";
import { transitionRequest } from "@/lib/services/requests";
import { transitionSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ reference: string }>;
}

export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const { reference } = await params;
  const body = await parseJsonBody(req);
  const input = parseBody(transitionSchema, body);
  const data = await transitionRequest(reference, input);
  return ok(data);
});

export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
