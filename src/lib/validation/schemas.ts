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

export const refundAmountSchema = z
  .union([z.number(), z.string()])
  .transform((val, ctx) => {
    const str = typeof val === "number" ? val.toString() : val.trim();
    if (!str) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Refund amount is required",
      });
      return z.NEVER;
    }

    if (!/^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(str)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Refund amount must be a positive number with at most 2 decimal places",
      });
      return z.NEVER;
    }

    const num = Number(str);
    if (num <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Refund amount must be greater than 0",
      });
      return z.NEVER;
    }

    return num.toFixed(2);
  });

export const createRequestSchema = z
  .object({
    customerName: z.string().trim().min(1, "Customer name is required"),
    customerEmail: z.string().trim().email("Invalid email address").toLowerCase(),
    customerPhone: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    orderNumber: z.string().trim().min(1, "Order number is required"),
    itemSku: z.string().trim().min(1, "Item SKU is required"),
    itemName: z.string().trim().min(1, "Item name is required"),
    quantity: z.number().int().positive("Quantity must be greater than 0"),
    reason: z.enum(REASONS),
  })
  .strict();

export const updateRequestSchema = z
  .object({
    customerName: z.string().trim().min(1, "Customer name cannot be empty").optional(),
    customerEmail: z.string().trim().email("Invalid email address").toLowerCase().optional(),
    customerPhone: z
      .string()
      .trim()
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional(),
    orderNumber: z.string().trim().min(1, "Order number cannot be empty").optional(),
    itemSku: z.string().trim().min(1, "Item SKU cannot be empty").optional(),
    itemName: z.string().trim().min(1, "Item name cannot be empty").optional(),
    quantity: z.number().int().positive("Quantity must be greater than 0").optional(),
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
    refundAmount: refundAmountSchema.optional(),
  })
  .strict();

export const noteSchema = z
  .object({
    author: z.string().trim().min(1, "Author is required"),
    body: z
      .string()
      .trim()
      .min(1, "Note body is required")
      .max(2000, "Note body cannot exceed 2000 characters"),
  })
  .strict();

const statusFilterSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((val, ctx) => {
    const items = Array.isArray(val)
      ? val.flatMap((v) => v.split(","))
      : val.split(",");
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    for (const item of cleaned) {
      if (!STATUSES.includes(item as (typeof STATUSES)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid status: ${item}`,
        });
        return z.NEVER;
      }
    }
    return cleaned as (typeof STATUSES)[number][];
  });

const reasonFilterSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((val, ctx) => {
    const items = Array.isArray(val)
      ? val.flatMap((v) => v.split(","))
      : val.split(",");
    const cleaned = items.map((s) => s.trim()).filter(Boolean);
    for (const item of cleaned) {
      if (!REASONS.includes(item as (typeof REASONS)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid reason: ${item}`,
        });
        return z.NEVER;
      }
    }
    return cleaned as (typeof REASONS)[number][];
  });

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

// Aliases matching prompt naming
export const createRequest = createRequestSchema;
export const updateRequest = updateRequestSchema;
export const transition = transitionSchema;
export const note = noteSchema;
export const listQuery = listQuerySchema;

// Inferred TypeScript types
export type CreateRequestInput = z.infer<typeof createRequestSchema>;
export type UpdateRequestInput = z.infer<typeof updateRequestSchema>;
export type TransitionInput = z.infer<typeof transitionSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
