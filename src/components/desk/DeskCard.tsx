import React from "react";
import Link from "next/link";
import { ReferenceTag } from "@/components/ui/ReferenceTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatShortDate } from "@/lib/format";
import type { ReturnRequestSummary } from "@/lib/queries/requests";

export interface DeskCardProps {
  request: ReturnRequestSummary;
}

export function DeskCard({ request }: DeskCardProps) {
  return (
    <Link
      href={`/requests/${request.reference}`}
      className="box box-interactive p-4 block text-left space-y-1.5 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
    >
      <div className="flex items-center justify-between">
        <ReferenceTag reference={request.reference} />
        <StatusBadge status={request.status} />
      </div>
      <div className="font-medium text-ink text-sm pt-0.5">
        {request.customerName}
      </div>
      <div className="text-xs text-graphite">{request.orderNumber}</div>
      <div className="text-xs text-graphite truncate">
        {request.itemName}
        {request.quantity > 1 ? ` x${request.quantity}` : " x1"}
      </div>
      <div className="text-xs text-graphite pt-1 tabular-nums">
        {formatShortDate(request.createdAt)}
      </div>
    </Link>
  );
}
