import React from "react";

export interface FilterChipProps {
  label: string;
  selected?: boolean;
  count?: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function FilterChip({
  label,
  selected = false,
  count,
  onClick,
  disabled = false,
  className = "",
}: FilterChipProps) {
  const baseClasses =
    "inline-flex items-center justify-center h-8 px-3 text-xs font-medium font-sans pressable select-none cursor-pointer border rounded-control transition-colors duration-120 ease-snap disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const stateClasses = selected
    ? "bg-ink text-paper border-ink"
    : "bg-paper text-ink border-rule hover:border-ink";

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClasses} ${stateClasses} ${className}`}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={`ml-1.5 tabular-nums ${
            selected ? "text-paper/80" : "text-graphite"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}
