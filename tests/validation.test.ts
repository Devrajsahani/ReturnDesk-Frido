import { describe, it, expect } from "vitest";
import {
  refundAmountSchema,
  createRequestSchema,
  updateRequestSchema,
  transitionSchema,
  listQuerySchema,
} from "@/lib/validation/schemas";

describe("refundAmountSchema", () => {
  it('parses "499" to "499.00"', () => {
    expect(refundAmountSchema.parse("499")).toBe("499.00");
  });

  it('parses "12.5" to "12.50"', () => {
    expect(refundAmountSchema.parse("12.5")).toBe("12.50");
  });

  it("parses number 100 to '100.00'", () => {
    expect(refundAmountSchema.parse(100)).toBe("100.00");
  });

  it("rejects 0", () => {
    expect(refundAmountSchema.safeParse(0).success).toBe(false);
  });

  it('rejects ""', () => {
    expect(refundAmountSchema.safeParse("").success).toBe(false);
  });

  it("rejects undefined", () => {
    expect(refundAmountSchema.safeParse(undefined).success).toBe(false);
  });

  it('rejects "12.345" (too many decimals)', () => {
    expect(refundAmountSchema.safeParse("12.345").success).toBe(false);
  });

  it('rejects "100000000" (exceeds max)', () => {
    expect(refundAmountSchema.safeParse("100000000").success).toBe(false);
  });
});

const validBody = {
  customerName: "Priya Sharma",
  customerEmail: "priya@example.com",
  orderNumber: "ORD-1001",
  itemSku: "SKU-001",
  itemName: "Cotton Cushion Cover",
  quantity: 2,
  reason: "damaged" as const,
};

describe("createRequestSchema", () => {
  it("accepts a valid body", () => {
    const result = createRequestSchema.safeParse(validBody);
    expect(result.success).toBe(true);
  });

  it("rejects an extra 'status' field (strict mode)", () => {
    const result = createRequestSchema.safeParse({
      ...validBody,
      status: "approved",
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity 0", () => {
    const result = createRequestSchema.safeParse({
      ...validBody,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects quantity 1001", () => {
    const result = createRequestSchema.safeParse({
      ...validBody,
      quantity: 1001,
    });
    expect(result.success).toBe(false);
  });

  it("rejects a bad email", () => {
    const result = createRequestSchema.safeParse({
      ...validBody,
      customerEmail: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a name of only spaces", () => {
    const result = createRequestSchema.safeParse({
      ...validBody,
      customerName: "   ",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateRequestSchema", () => {
  it("rejects empty object (no fields to update)", () => {
    const result = updateRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects {status: 'approved'} (strict mode, unknown field)", () => {
    const result = updateRequestSchema.safeParse({ status: "approved" });
    expect(result.success).toBe(false);
  });

  it("accepts a single valid field", () => {
    const result = updateRequestSchema.safeParse({
      customerName: "Updated Name",
    });
    expect(result.success).toBe(true);
  });
});

describe("transitionSchema", () => {
  it("rejects an unknown 'to' value", () => {
    const result = transitionSchema.safeParse({ to: "deleted" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid transition", () => {
    const result = transitionSchema.safeParse({ to: "in_review" });
    expect(result.success).toBe(true);
  });
});

describe("listQuerySchema", () => {
  it("rejects pageSize 101", () => {
    const result = listQuerySchema.safeParse({ pageSize: "101" });
    expect(result.success).toBe(false);
  });

  it('rejects sort "id;DROP"', () => {
    const result = listQuerySchema.safeParse({ sort: "id;DROP" });
    expect(result.success).toBe(false);
  });

  it('rejects status "banana"', () => {
    const result = listQuerySchema.safeParse({ status: "banana" });
    expect(result.success).toBe(false);
  });

  it('parses status "open,in_review" to an array of 2', () => {
    const result = listQuerySchema.safeParse({ status: "open,in_review" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toEqual(["open", "in_review"]);
      expect(result.data.status).toHaveLength(2);
    }
  });

  it("applies defaults for sort, order, page, pageSize", () => {
    const result = listQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sort).toBe("createdAt");
      expect(result.data.order).toBe("desc");
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });
});
