import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDateTime, formatShortDate } from "@/lib/format";
import { REASON_LABELS, RESOLUTION_LABELS } from "@/lib/domain/constants";
import type { ReturnRequestDetail } from "@/lib/domain/types";

export interface RequestDetailsCardProps {
  request: ReturnRequestDetail;
  canEdit: boolean;
}

export function RequestDetailsCard({ request, canEdit }: RequestDetailsCardProps) {
  const reasonText = (REASON_LABELS as Record<string, string>)[request.reason] ?? request.reason;
  const resolutionText = request.resolution
    ? ((RESOLUTION_LABELS as Record<string, string>)[request.resolution] ?? request.resolution)
    : "—";

  return (
    <div className="box p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <h2 className="font-display font-semibold text-base text-ink">Request details</h2>
        {canEdit ? (
          <Link href={`/requests/${request.reference}/edit`}>
            <Button variant="secondary" size="sm">
              Edit details
            </Button>
          </Link>
        ) : (
          ["approved", "rejected", "completed"].includes(request.status) && (
            <p className="text-xs text-graphite">
              Details are locked because this request was {request.status} on{" "}
              {formatShortDate(request.decidedAt)}.
            </p>
          )
        )}
      </div>

      <dl className="divide-y divide-hairline text-sm">
        <div className="py-2.5 flex justify-between gap-4">
          <dt className="text-graphite font-medium">Customer</dt>
          <dd className="text-ink font-medium text-right">{request.customerName}</dd>
        </div>

        <div className="py-2.5 flex justify-between gap-4">
          <dt className="text-graphite font-medium">Email</dt>
          <dd className="text-ink text-right break-all">{request.customerEmail}</dd>
        </div>

        {request.customerPhone && (
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-graphite font-medium">Phone</dt>
            <dd className="text-ink text-right">{request.customerPhone}</dd>
          </div>
        )}

        <div className="py-2.5 flex justify-between gap-4">
          <dt className="text-graphite font-medium">Order</dt>
          <dd className="text-ink text-right">{request.orderNumber}</dd>
        </div>

        <div className="py-2.5 flex justify-between gap-4">
          <dt className="text-graphite font-medium">Item</dt>
          <dd className="text-ink text-right max-w-xs">
            {request.itemName} ({request.itemSku}) x{request.quantity}
          </dd>
        </div>

        <div className="py-2.5 flex justify-between gap-4">
          <dt className="text-graphite font-medium">Reason</dt>
          <dd className="text-ink text-right">{reasonText}</dd>
        </div>

        <div className="py-2.5 flex justify-between gap-4">
          <dt className="text-graphite font-medium">Resolution</dt>
          <dd className="text-ink text-right font-medium">{resolutionText}</dd>
        </div>

        {request.resolution === "refund" && request.refundAmount && (
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-graphite font-medium">Refund amount</dt>
            <dd className="text-ink font-medium text-right tabular-nums">
              {formatCurrency(request.refundAmount)}
            </dd>
          </div>
        )}

        <div className="py-2.5 flex justify-between gap-4">
          <dt className="text-graphite font-medium">Raised</dt>
          <dd className="text-graphite text-right tabular-nums">
            {formatDateTime(request.createdAt)}
          </dd>
        </div>

        {request.decidedAt && (
          <div className="py-2.5 flex justify-between gap-4">
            <dt className="text-graphite font-medium">Decided</dt>
            <dd className="text-graphite text-right tabular-nums">
              {formatDateTime(request.decidedAt)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
