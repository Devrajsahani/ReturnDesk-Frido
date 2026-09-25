import { describe, expect, it } from "vitest";
import { assertNotStale, formatETag } from "@/lib/domain/etag";
import { ERROR_CODES } from "@/lib/api/errors";

describe("ETag and If-Match concurrency", () => {
  it("includes STALE_REQUEST in ERROR_CODES", () => {
    expect(ERROR_CODES).toContain("STALE_REQUEST");
  });

  it("formats quoted ETag from Date, ISO string, or timestamp number", () => {
    const d = new Date("2026-09-25T12:00:00.000Z");
    const ms = d.getTime();
    expect(formatETag(d)).toBe(`"${ms}"`);
    expect(formatETag("2026-09-25T12:00:00.000Z")).toBe(`"${ms}"`);
    expect(formatETag(ms)).toBe(`"${ms}"`);
  });

  it("does not throw when ifMatch is undefined (curl/backwards compatibility)", () => {
    const updatedAt = new Date("2026-09-25T12:00:00.000Z");
    expect(() => assertNotStale(updatedAt, undefined)).not.toThrow();
  });

  it("passes when ifMatch matches the epoch milliseconds", () => {
    const updatedAt = new Date("2026-09-25T12:00:00.000Z");
    const timestamp = String(updatedAt.getTime());

    // Matches bare timestamp
    expect(() => assertNotStale(updatedAt, timestamp)).not.toThrow();

    // Matches quoted HTTP ETag
    expect(() => assertNotStale(updatedAt, `"${timestamp}"`)).not.toThrow();
  });

  it("throws 412 STALE_REQUEST when ifMatch does not match", () => {
    const updatedAt = new Date("2026-09-25T12:00:00.000Z");
    const staleTimestamp = String(updatedAt.getTime() - 5000);

    expect(() => assertNotStale(updatedAt, staleTimestamp)).toThrowError(
      expect.objectContaining({
        status: 412,
        code: "STALE_REQUEST",
        message: "This request changed since you opened it. Reload to see the latest version.",
      }),
    );

    expect(() => assertNotStale(updatedAt, `"${staleTimestamp}"`)).toThrowError(
      expect.objectContaining({
        status: 412,
        code: "STALE_REQUEST",
      }),
    );

    expect(() => assertNotStale(updatedAt, "invalid-etag")).toThrowError(
      expect.objectContaining({
        status: 412,
        code: "STALE_REQUEST",
      }),
    );
  });
});
