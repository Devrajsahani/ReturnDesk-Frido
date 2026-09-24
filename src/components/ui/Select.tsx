import React, { forwardRef, useId } from "react";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;
    const errorId = `${selectId}-error`;
    const hintId = `${selectId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-ink mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={Boolean(error)}
            aria-describedby={
              error ? errorId : hint ? hintId : undefined
            }
            className={`w-full h-10 px-3 pr-8 text-sm font-sans text-ink bg-paper border rounded-control transition-colors duration-120 ease-snap appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              error
                ? "border-danger focus:border-danger"
                : "border-rule hover:border-graphite focus:border-ink"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-graphite"
          >
            <svg
              className="size-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        {hint && !error && (
          <p id={hintId} className="text-xs text-graphite mt-1.5">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs text-danger mt-1.5">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";
