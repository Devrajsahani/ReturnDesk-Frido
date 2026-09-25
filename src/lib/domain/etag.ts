import { ApiError } from "../api/errors";

export function formatETag(updatedAt: Date | string | number): string {
  const time = typeof updatedAt === "number" ? updatedAt : new Date(updatedAt).getTime();
  return `"${time}"`;
}

export function assertNotStale(rowUpdatedAt: Date | string | number, ifMatch?: string): void {
  if (ifMatch === undefined) return;
  const match = ifMatch.replace(/^"|"$/g, "");
  const current = String(
    typeof rowUpdatedAt === "number" ? rowUpdatedAt : new Date(rowUpdatedAt).getTime(),
  );
  if (match !== current) {
    throw new ApiError(
      412,
      "STALE_REQUEST",
      "This request changed since you opened it. Reload to see the latest version.",
    );
  }
}
