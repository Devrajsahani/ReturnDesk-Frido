import { NextResponse } from "next/server";
import { type z } from "zod";
import { ApiError, type ErrorEnvelope } from "./errors";

export function ok<T, M = unknown>(
  data: T,
  meta?: M,
  headers?: HeadersInit,
): NextResponse<{ data: T; meta?: M }> {
  const payload = meta !== undefined ? { data, meta } : { data };
  return NextResponse.json(payload, { status: 200, headers });
}

export function created<T>(data: T, location: string): NextResponse<{ data: T }> {
  return NextResponse.json(
    { data },
    {
      status: 201,
      headers: {
        Location: location,
      },
    },
  );
}

export function noContent(): NextResponse<null> {
  return new NextResponse(null, { status: 204 });
}

export function methodNotAllowed(): NextResponse<ErrorEnvelope> {
  return NextResponse.json(
    {
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Method not allowed",
      },
    },
    { status: 405 },
  );
}

export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

function toFieldErrors(issues: z.ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path.join(".") || "_root";
    if (!fields[field]) {
      fields[field] = issue.message;
    }
  }
  return fields;
}

export function parseBody<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiError(422, "VALIDATION_FAILED", "The request body failed validation checks", {
      fields: toFieldErrors(result.error.issues),
    });
  }
  return result.data;
}

function searchParamsToObject(searchParams: URLSearchParams): Record<string, string | string[]> {
  const obj: Record<string, string | string[]> = {};
  for (const key of searchParams.keys()) {
    const values = searchParams.getAll(key);
    obj[key] = values.length > 1 ? values : values[0];
  }
  return obj;
}

export function parseQuery<T>(schema: z.ZodType<T>, searchParams: URLSearchParams | unknown): T {
  const raw =
    searchParams instanceof URLSearchParams ? searchParamsToObject(searchParams) : searchParams;

  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ApiError(400, "INVALID_QUERY", "The query parameters failed validation checks", {
      fields: toFieldErrors(result.error.issues),
    });
  }
  return result.data;
}

const DB_UNAVAILABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "57P01",
  "53300",
]);

function isDatabaseUnavailableError(err: unknown): boolean {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = String((err as { code?: unknown }).code);
    return DB_UNAVAILABLE_CODES.has(code);
  }
  return false;
}

export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response> | Response,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          {
            error: {
              code: err.code,
              message: err.message,
              ...(err.details !== undefined ? { details: err.details } : {}),
            },
          },
          { status: err.status },
        );
      }

      if (isDatabaseUnavailableError(err)) {
        console.error("Database connection error:", err);
        return NextResponse.json(
          {
            error: {
              code: "SERVICE_UNAVAILABLE",
              message: "The database is unreachable. Try again in a moment.",
            },
          },
          { status: 503 },
        );
      }

      console.error("Unhandled API error:", err);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "An internal server error occurred",
          },
        },
        { status: 500 },
      );
    }
  };
}
