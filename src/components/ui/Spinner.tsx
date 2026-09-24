import React from "react";

export interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = "", label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block size-3.5 shrink-0 rounded-full border-2 border-ink/25 border-t-ink animate-spin ${className}`}
    />
  );
}
