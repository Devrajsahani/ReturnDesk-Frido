"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { useToast } from "@/components/ui/Toast";
import { ChoiceTile, ChoiceTileGroup } from "@/components/ui/ChoiceTile";
import { createRequestSchema, updateRequestSchema } from "@/lib/validation/schemas";
import type { ReturnReason } from "@/lib/domain/constants";

const REASON_OPTIONS: {
  value: ReturnReason;
  title: string;
  description: string;
}[] = [
  {
    value: "damaged",
    title: "Damaged",
    description: "Item arrived broken, scratched or defective",
  },
  {
    value: "wrong_item",
    title: "Wrong item",
    description: "Received different product than ordered",
  },
  {
    value: "size_issue",
    title: "Size issue",
    description: "Does not fit or dimensions differ",
  },
  {
    value: "not_as_described",
    title: "Not as described",
    description: "Product differs from online listing",
  },
  {
    value: "changed_mind",
    title: "Changed mind",
    description: "No longer needed or wanted by customer",
  },
];

export interface RequestFormData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  orderNumber: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  reason: ReturnReason;
}

export interface RequestFormProps {
  mode: "create" | "edit";
  reference?: string;
  initialValues?: Partial<RequestFormData>;
}

export function RequestForm({
  mode,
  reference,
  initialValues,
}: RequestFormProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [customerName, setCustomerName] = useState(
    initialValues?.customerName ?? ""
  );
  const [customerEmail, setCustomerEmail] = useState(
    initialValues?.customerEmail ?? ""
  );
  const [customerPhone, setCustomerPhone] = useState(
    initialValues?.customerPhone ?? ""
  );
  const [orderNumber, setOrderNumber] = useState(
    initialValues?.orderNumber ?? ""
  );
  const [itemSku, setItemSku] = useState(initialValues?.itemSku ?? "");
  const [itemName, setItemName] = useState(initialValues?.itemName ?? "");
  const [quantity, setQuantity] = useState<number | string>(
    initialValues?.quantity ?? 1
  );
  const [reason, setReason] = useState<ReturnReason>(
    initialValues?.reason ?? "damaged"
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [duplicateRef, setDuplicateRef] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setDuplicateRef(null);
    setFieldErrors({});

    const rawData = {
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone ? customerPhone.trim() : null,
      orderNumber: orderNumber.trim(),
      itemSku: itemSku.trim(),
      itemName: itemName.trim(),
      quantity: Number(quantity),
      reason,
    };

    // Client-side validation using shared Zod schemas (zero duplicated rules)
    if (mode === "create") {
      const parsed = createRequestSchema.safeParse(rawData);
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0]?.toString();
          if (path && !errors[path]) {
            errors[path] = issue.message;
          }
        }
        setFieldErrors(errors);
        return;
      }
    } else {
      const parsed = updateRequestSchema.safeParse(rawData);
      if (!parsed.success) {
        const errors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const path = issue.path[0]?.toString();
          if (path && !errors[path]) {
            errors[path] = issue.message;
          }
        }
        setFieldErrors(errors);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const endpoint =
        mode === "create" ? "/api/requests" : `/api/requests/${reference}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rawData),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.error?.details?.fields) {
          setFieldErrors(data.error.details.fields);
          setServerError(data.error.message || "Please correct the errors below.");
        } else if (
          res.status === 409 &&
          data.error?.code === "DUPLICATE_LIVE_REQUEST"
        ) {
          setDuplicateRef(data.error.details?.existingReference ?? null);
          setServerError(data.error.message);
        } else {
          setServerError(
            data.error?.message || "An unexpected error occurred. Please try again."
          );
        }
        return;
      }

      // Success
      if (mode === "create") {
        const newRef = data.data?.reference;
        router.push(`/requests/${newRef}`);
      } else {
        showToast("Changes saved", "success");
        router.push(`/requests/${reference}`);
      }
    } catch {
      setServerError("Network error. Could not connect to the server.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const cancelHref =
    mode === "create" ? "/" : `/requests/${reference ?? ""}`;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="box p-6 sm:p-8 space-y-6 max-w-xl mx-auto text-left"
    >
      {/* Duplicate Live Request Banner */}
      {duplicateRef && (
        <Banner
          variant="danger"
          title="Duplicate Request Refused"
          message={
            <span>
              A live request (
              <Link
                href={`/requests/${duplicateRef}`}
                className="font-semibold underline hover:text-ink"
              >
                {duplicateRef}
              </Link>
              ) already exists for this order number and item SKU.
            </span>
          }
        />
      )}

      {/* General Server Error Banner */}
      {!duplicateRef && serverError && (
        <Banner variant="danger" message={serverError} />
      )}

      {/* Customer Section */}
      <div className="space-y-4">
        <div className="border-b border-hairline pb-2">
          <h2 className="font-display font-semibold text-base text-ink">
            Customer
          </h2>
          <p className="font-sans text-xs text-graphite">
            Contact information for the customer requesting return
          </p>
        </div>

        <Input
          label="Customer name"
          required
          placeholder="e.g. Ritika Bansal"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          error={fieldErrors.customerName}
        />

        <Input
          label="Customer email"
          type="email"
          required
          placeholder="e.g. ritika@example.in"
          value={customerEmail}
          onChange={(e) => setCustomerEmail(e.target.value)}
          error={fieldErrors.customerEmail}
        />

        <Input
          label="Customer phone (optional)"
          type="tel"
          placeholder="e.g. +91 98765 43210"
          value={customerPhone ?? ""}
          onChange={(e) => setCustomerPhone(e.target.value)}
          error={fieldErrors.customerPhone}
        />
      </div>

      {/* Item Section */}
      <div className="space-y-4 pt-2">
        <div className="border-b border-hairline pb-2">
          <h2 className="font-display font-semibold text-base text-ink">
            Item
          </h2>
          <p className="font-sans text-xs text-graphite">
            Order details and return reason
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Order number"
            required
            placeholder="e.g. ORD-10421"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            error={fieldErrors.orderNumber}
          />

          <Input
            label="Item SKU"
            required
            placeholder="e.g. SKU-101"
            value={itemSku}
            onChange={(e) => setItemSku(e.target.value)}
            error={fieldErrors.itemSku}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Item name"
              required
              placeholder="e.g. Ergonomic Seat Cushion"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              error={fieldErrors.itemName}
            />
          </div>

          <div>
            <Input
              label="Quantity"
              type="number"
              min={1}
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={fieldErrors.quantity}
            />
          </div>
        </div>

        {/* Reason Choice Tiles */}
        <div className="pt-1">
          <ChoiceTileGroup
            label="Return reason"
            columns={2}
            error={fieldErrors.reason}
          >
            {REASON_OPTIONS.map((opt) => (
              <ChoiceTile
                key={opt.value}
                name="return-reason"
                value={opt.value}
                title={opt.title}
                description={opt.description}
                checked={reason === opt.value}
                onChange={() => setReason(opt.value)}
              />
            ))}
          </ChoiceTileGroup>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline">
        <Link href={cancelHref}>
          <Button type="button" variant="ghost" disabled={isSubmitting}>
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {mode === "create" ? "Create request" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
