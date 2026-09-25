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

  it("no header means no check (curl/backwards compatibility)", () => {
    const updatedAt = 123;
    expect(() => assertNotStale(updatedAt, undefined)).not.toThrow();
  });

  it("accepts bare timestamp, quoted ETag, weak ETag (W/), and wildcard (*)", () => {
    const updatedAt = 123;

    // Bare "123"
    expect(() => assertNotStale(updatedAt, "123")).not.toThrow();

    // Quoted "\"123\""
    expect(() => assertNotStale(updatedAt, '"123"')).not.toThrow();

    // Weak ETag W/"123"
    expect(() => assertNotStale(updatedAt, 'W/"123"')).not.toThrow();

    // Wildcard "*"
    expect(() => assertNotStale(updatedAt, "*")).not.toThrow();
  });

  it("throws 412 STALE_REQUEST for mismatched strong and weak ETags", () => {
    const updatedAt = 123;

    // "124" fails
    expect(() => assertNotStale(updatedAt, "124")).toThrowError(
      expect.objectContaining({
        status: 412,
        code: "STALE_REQUEST",
      }),
    );

    // W/"124" fails
    expect(() => assertNotStale(updatedAt, 'W/"124"')).toThrowError(
      expect.objectContaining({
        status: 412,
        code: "STALE_REQUEST",
      }),
    );

    // Arbitrary invalid string fails
    expect(() => assertNotStale(updatedAt, "invalid-etag")).toThrowError(
      expect.objectContaining({
        status: 412,
        code: "STALE_REQUEST",
      }),
    );
  });
});
