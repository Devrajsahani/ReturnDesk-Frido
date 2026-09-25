import { ApiError } from "../api/errors";

export function formatETag(updatedAt: Date | string | number): string {
  const time = typeof updatedAt === "number" ? updatedAt : new Date(updatedAt).getTime();
  return `"${time}"`;
}

export function assertNotStale(rowUpdatedAt: Date | string | number, ifMatch?: string): void {
  if (ifMatch === undefined) return;
  const trimmed = ifMatch.trim();
  if (trimmed === "*") return;

  const cleaned = trimmed.replace(/^W\//i, "").replace(/^"|"$/g, "");
  const current = String(
    typeof rowUpdatedAt === "number" ? rowUpdatedAt : new Date(rowUpdatedAt).getTime(),
  );
  if (cleaned !== current) {
    throw new ApiError(
      412,
      "STALE_REQUEST",
      "This request changed since you opened it. Reload to see the latest version.",
    );
  }
}
