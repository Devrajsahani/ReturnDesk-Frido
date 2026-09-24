import React from "react";
import {
  STATUS_LABELS,
  type RequestStatus,
} from "@/lib/domain/constants";

export interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

const STATUS_COLOR_CLASSES: Record<RequestStatus, string> = {
  open: "bg-status-open",
  in_review: "bg-status-review",
  approved: "bg-status-approved",
  rejected: "bg-status-rejected",
  completed: "bg-status-completed",
};

export function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const colorClass = STATUS_COLOR_CLASSES[status] ?? "bg-status-completed";
  const label = STATUS_LABELS[status] ?? status;

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-6 px-2.5 bg-paper border border-rule rounded-control select-none transition-opacity duration-180 ease-snap ${className}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 ${colorClass}`}
      />
      <span className="font-sans text-xs font-medium text-ink">
        {label}
      </span>
    </span>
  );
}
