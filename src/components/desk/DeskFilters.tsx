"use client";

import React, { useState } from "react";
import { FilterChip } from "@/components/ui/FilterChip";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "completed", label: "Completed" },
] as const;

const REASON_OPTIONS = [
  { value: "damaged", label: "Damaged" },
  { value: "wrong_item", label: "Wrong item" },
  { value: "size_issue", label: "Size issue" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Changed mind" },
] as const;

const SORT_SELECT_OPTIONS = [
  { value: "createdAt_desc", label: "Newest first" },
  { value: "createdAt_asc", label: "Oldest first" },
  { value: "customerName_asc", label: "Customer (A–Z)" },
  { value: "customerName_desc", label: "Customer (Z–A)" },
  { value: "reference_desc", label: "Reference (newest)" },
  { value: "reference_asc", label: "Reference (oldest)" },
  { value: "status_asc", label: "Status" },
];

export interface DeskFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatuses: string[];
  onStatusChange: (statuses: string[]) => void;
  selectedReasons: string[];
  onReasonChange: (reasons: string[]) => void;
  sortValue: string;
  onSortChange: (sortVal: string) => void;
  onClearAll: () => void;
}

export function DeskFilters({
  searchQuery,
  onSearchChange,
  selectedStatuses,
  onStatusChange,
  selectedReasons,
  onReasonChange,
  sortValue,
  onSortChange,
  onClearAll,
}: DeskFiltersProps) {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Status toggle handler
  const handleToggleStatus = (val: string) => {
    if (selectedStatuses.includes(val)) {
      onStatusChange(selectedStatuses.filter((s) => s !== val));
    } else {
      onStatusChange([...selectedStatuses, val]);
    }
  };

  // Reason toggle handler
  const handleToggleReason = (val: string) => {
    if (selectedReasons.includes(val)) {
      onReasonChange(selectedReasons.filter((r) => r !== val));
    } else {
      onReasonChange([...selectedReasons, val]);
    }
  };

  const activeFiltersCount = selectedStatuses.length + selectedReasons.length;

  return (
    <div className="space-y-3">
      {/* Top Row: Search and Sort */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search input with relative search icon */}
        <div className="relative flex-1 max-w-md">
          <label htmlFor="desk-search" className="sr-only">
            Search by reference, order or customer
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-graphite">
            <svg
              className="size-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            id="desk-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by reference, order or customer"
            className="w-full h-10 pl-9 pr-3 text-sm font-sans text-ink bg-paper border border-rule rounded-control placeholder:text-graphite/60 transition-colors duration-120 ease-snap hover:border-graphite focus:border-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2"
          />
        </div>

        {/* Mobile controls row: Filters toggle button & Sort */}
        <div className="flex items-center gap-3 sm:hidden">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMobileFiltersOpen((prev) => !prev)}
            aria-expanded={mobileFiltersOpen}
            aria-controls="mobile-filter-panel"
            className="flex-1"
          >
            Filters {activeFiltersCount > 0 ? `(${activeFiltersCount})` : ""}
          </Button>

          <div className="w-44">
            <Select
              id="mobile-sort-select"
              options={SORT_SELECT_OPTIONS}
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort requests"
            />
          </div>
        </div>

        {/* Desktop Sort */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-xs text-graphite font-sans">Sort</span>
          <div className="w-48">
            <Select
              id="desktop-sort-select"
              options={SORT_SELECT_OPTIONS}
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
              aria-label="Sort requests"
            />
          </div>
        </div>
      </div>

      {/* Filter Rows: Always visible on desktop, collapsible on mobile */}
      <div
        id="mobile-filter-panel"
        className={`${
          mobileFiltersOpen ? "block" : "hidden sm:block"
        } space-y-2 pt-1`}
      >
        {/* Status Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-xs font-medium text-graphite shrink-0">
            Status
          </span>
          <FilterChip
            label="All"
            selected={selectedStatuses.length === 0}
            onClick={() => onStatusChange([])}
          />
          {STATUS_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              selected={selectedStatuses.includes(opt.value)}
              onClick={() => handleToggleStatus(opt.value)}
            />
          ))}
        </div>

        {/* Reason Filter Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-14 text-xs font-medium text-graphite shrink-0">
            Reason
          </span>
          <FilterChip
            label="All"
            selected={selectedReasons.length === 0}
            onClick={() => onReasonChange([])}
          />
          {REASON_OPTIONS.map((opt) => (
            <FilterChip
              key={opt.value}
              label={opt.label}
              selected={selectedReasons.includes(opt.value)}
              onClick={() => handleToggleReason(opt.value)}
            />
          ))}
          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="text-xs text-graphite hover:text-ink underline ml-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 rounded-control"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
