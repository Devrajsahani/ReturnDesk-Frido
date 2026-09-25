import { type NextRequest } from "next/server";
import {
  created,
  methodNotAllowed,
  ok,
  parseBody,
  parseJsonBody,
  withErrorHandling,
} from "@/lib/api/respond";
import { addRequestNote, getRequestNotes } from "@/lib/services/requests";
import { noteSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ reference: string }>;
}

export const GET = withErrorHandling(async (_req: NextRequest, { params }: RouteParams) => {
  const { reference } = await params;
  const notes = await getRequestNotes(reference);
  return ok(notes);
});

export const POST = withErrorHandling(async (req: NextRequest, { params }: RouteParams) => {
  const { reference } = await params;
  const body = await parseJsonBody(req);
  const input = parseBody(noteSchema, body);
  const note = await addRequestNote(reference, input);
  return created(note, `/api/requests/${reference.toUpperCase()}/notes`);
});

export const PUT = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const DELETE = methodNotAllowed;
