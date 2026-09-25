import { z } from "zod";
import { REASONS, RESOLUTIONS, STATUSES } from "../domain/constants";

export const SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "reference",
  "customerName",
  "status",
] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortOrder = "asc" | "desc";

export const refundAmountSchema = z.unknown().transform((val, ctx) => {
  if (val === undefined || val === null || val === "") {
    ctx.addIssue({
      code: "custom",
      message: "Refund amount is required",
    });
    return z.NEVER;
  }
  if (typeof val !== "number" && typeof val !== "string") {
    ctx.addIssue({
      code: "custom",
      message: "Refund amount must be a number or string",
    });
    return z.NEVER;
  }
  const str = typeof val === "number" ? val.toString() : val.trim();
  if (!str) {
    ctx.addIssue({
      code: "custom",
      message: "Refund amount is required",
    });
    return z.NEVER;
  }

  if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(str)) {
    ctx.addIssue({
      code: "custom",
      message: "Refund amount must be a positive number with at most 2 decimal places",
    });
    return z.NEVER;
  }

  const num = Number(str);
  if (num <= 0) {
    ctx.addIssue({
      code: "custom",
      message: "Refund amount must be greater than 0",
    });
    return z.NEVER;
  }

  if (num > 99999999.99) {
    ctx.addIssue({
      code: "custom",
      message: "Refund amount cannot exceed 99,999,999.99",
    });
    return z.NEVER;
  }

  return num.toFixed(2);
});

export const createRequestSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(1, "Customer name is required")
      .max(120, "Customer name cannot exceed 120 characters"),
    customerEmail: z
      .email("Invalid email address")
      .max(254, "Customer email cannot exceed 254 characters")
      .toLowerCase(),
    customerPhone: z
      .string()
      .trim()
      .max(30, "Customer phone cannot exceed 30 characters")
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    orderNumber: z
      .string()
      .trim()
      .min(1, "Order number is required")
      .max(64, "Order number cannot exceed 64 characters"),
    itemSku: z
      .string()
      .trim()
      .min(1, "Item SKU is required")
      .max(64, "Item SKU cannot exceed 64 characters"),
    itemName: z
      .string()
      .trim()
      .min(1, "Item name is required")
      .max(200, "Item name cannot exceed 200 characters"),
    quantity: z
      .number()
      .int()
      .positive("Quantity must be greater than 0")
      .max(1000, "Quantity cannot exceed 1000"),
    reason: z.enum(REASONS),
  })
  .strict();

export const updateRequestSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(1, "Customer name cannot be empty")
      .max(120, "Customer name cannot exceed 120 characters")
      .optional(),
    customerEmail: z
      .email("Invalid email address")
      .max(254, "Customer email cannot exceed 254 characters")
      .toLowerCase()
      .optional(),
    customerPhone: z
      .string()
      .trim()
      .max(30, "Customer phone cannot exceed 30 characters")
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    orderNumber: z
      .string()
      .trim()
      .min(1, "Order number cannot be empty")
      .max(64, "Order number cannot exceed 64 characters")
      .optional(),
    itemSku: z
      .string()
      .trim()
      .min(1, "Item SKU cannot be empty")
      .max(64, "Item SKU cannot exceed 64 characters")
      .optional(),
    itemName: z
      .string()
      .trim()
      .min(1, "Item name cannot be empty")
      .max(200, "Item name cannot exceed 200 characters")
      .optional(),
    quantity: z
      .number()
      .int()
      .positive("Quantity must be greater than 0")
      .max(1000, "Quantity cannot exceed 1000")
      .optional(),
    reason: z.enum(REASONS).optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export const transitionSchema = z
  .object({
    to: z.enum(STATUSES),
    resolution: z.enum(RESOLUTIONS).optional(),
    refundAmount: z.union([z.number(), z.string()]).optional(),
  })
  .strict();

export const noteSchema = z
  .object({
    author: z
      .string()
      .trim()
      .min(1, "Author is required")
      .max(80, "Author cannot exceed 80 characters"),
    body: z
      .string()
      .trim()
      .min(1, "Note body is required")
      .max(2000, "Note body cannot exceed 2000 characters"),
  })
  .strict();

function csvEnumList<T extends string>(allowed: readonly T[], label: string) {
  return z.union([z.string(), z.array(z.string())]).transform((val, ctx) => {
    const items = Array.isArray(val) ? val.flatMap((v) => v.split(",")) : val.split(",");
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    for (const item of cleaned) {
      if (!allowed.includes(item as T)) {
        ctx.addIssue({
          code: "custom",
          message: `Invalid ${label}: ${item}`,
        });
        return z.NEVER;
      }
    }
    return cleaned as T[];
  });
}

const statusFilterSchema = csvEnumList(STATUSES, "status");
const reasonFilterSchema = csvEnumList(REASONS, "reason");

export const listQuerySchema = z
  .object({
    q: z
      .string()
      .trim()
      .max(100, "Search query cannot exceed 100 characters")
      .optional()
      .transform((v) => (v ? v : undefined)),
    status: statusFilterSchema.optional(),
    reason: reasonFilterSchema.optional(),
    sort: z.enum(SORT_FIELDS).default("createdAt"),
    order: z.enum(["asc", "desc"]).default("desc"),
    page: z.coerce.number().int().min(1, "Page must be at least 1").default(1),
    pageSize: z.coerce
      .number()
      .int()
      .min(1, "Page size must be at least 1")
      .max(100, "Page size cannot exceed 100")
      .default(20),
  })
  .strict();

// Inferred TypeScript types
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
