import React from "react";

export interface ReferenceTagProps {
  reference: string;
  size?: "default" | "lg";
  className?: string;
}

export function ReferenceTag({
  reference,
  size = "default",
  className = "",
}: ReferenceTagProps) {
  if (size === "lg") {
    return (
      <span
        className={`inline-flex items-center font-display font-semibold text-3xl tabular-nums bg-label text-ink border border-ink rounded-control px-3 py-1 select-all ${className}`}
      >
        {reference}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center font-sans font-semibold text-xs tabular-nums bg-label text-ink border border-ink rounded-control px-2 py-0.5 select-all ${className}`}
    >
      {reference}
    </span>
  );
}
