import type { ErrorCode, ErrorDetails, ErrorEnvelope } from "./errors";

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: ErrorCode | "UNKNOWN_ERROR";
  readonly details?: ErrorDetails;

  constructor(
    status: number,
    code: ErrorCode | "UNKNOWN_ERROR",
    message: string,
    details?: ErrorDetails,
  ) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiFetchWithHeadersResult<T> {
  data: T;
  headers: Headers;
  etag: string | null;
}

export async function apiFetchWithHeaders<T>(
  url: string,
  options?: RequestInit,
): Promise<ApiFetchWithHeadersResult<T>> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    const etag = res.headers.get("etag");

    if (res.status === 204) {
      return { data: null as T, headers: res.headers, etag };
    }

    const contentType = res.headers.get("content-type");
    const isJson = contentType && contentType.includes("application/json");

    if (!res.ok) {
      if (isJson) {
        const payload = (await res.json()) as Partial<ErrorEnvelope>;
        if (payload?.error) {
          throw new ApiClientError(
            res.status,
            payload.error.code ?? "UNKNOWN_ERROR",
            payload.error.message || "An unexpected error occurred",
            payload.error.details,
          );
        }
      }
      throw new ApiClientError(
        res.status,
        "UNKNOWN_ERROR",
        res.statusText || `Request failed with status ${res.status}`,
      );
    }

    const data = isJson ? ((await res.json()) as T) : ((await res.text()) as unknown as T);
    return { data, headers: res.headers, etag };
  } catch (err: unknown) {
    if (
      (typeof DOMException !== "undefined" &&
        err instanceof DOMException &&
        err.name === "AbortError") ||
      (err instanceof Error && err.name === "AbortError")
    ) {
      throw err;
    }
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      0,
      "UNKNOWN_ERROR",
      "Couldn't reach the server. Check your connection and try again.",
    );
  }
}

export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const result = await apiFetchWithHeaders<T>(url, options);
  return result.data;
}
