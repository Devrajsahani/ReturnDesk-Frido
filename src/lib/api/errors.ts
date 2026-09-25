export const ERROR_CODES = [
  "INVALID_JSON",
  "INVALID_QUERY",
  "NOT_FOUND",
  "METHOD_NOT_ALLOWED",
  "INVALID_TRANSITION",
  "DUPLICATE_LIVE_REQUEST",
  "REQUEST_LOCKED",
  "REMOVAL_NOT_ALLOWED",
  "VALIDATION_FAILED",
  "RESOLUTION_REQUIRED",
  "RESOLUTION_NOT_ALLOWED",
  "STALE_REQUEST",
  "SERVICE_UNAVAILABLE",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export interface ErrorDetails {
  fields?: Record<string, string>;
  [key: string]: unknown;
}

export interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    details?: ErrorDetails;
  };
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details?: ErrorDetails;

  constructor(status: number, code: ErrorCode, message: string, details?: ErrorDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
