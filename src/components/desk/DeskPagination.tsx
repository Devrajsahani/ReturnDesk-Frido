import React from "react";
import { Button } from "@/components/ui/Button";

export interface DeskPaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function DeskPagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: DeskPaginationProps) {
  if (total === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3">
      {/* Showing X-Y of Z */}
      <div className="text-xs text-graphite font-sans tabular-nums">
        Showing <span className="font-medium text-ink">{from}</span>–
        <span className="font-medium text-ink">{to}</span> of{" "}
        <span className="font-medium text-ink">{total}</span>
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          Previous
        </Button>

        {/* Desktop Page X of Y */}
        <span className="hidden sm:inline text-xs text-graphite tabular-nums">
          Page {page} of {totalPages || 1}
        </span>

        {/* Mobile X / Y */}
        <span className="sm:hidden text-xs text-graphite tabular-nums">
          {page} / {totalPages || 1}
        </span>

        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
