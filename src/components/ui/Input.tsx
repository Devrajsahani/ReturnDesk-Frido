import React, { forwardRef, useId } from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? errorId : hint ? hintId : undefined
          }
          className={`w-full h-10 px-3 text-sm font-sans text-ink bg-paper border rounded-control transition-colors duration-120 ease-snap placeholder:text-graphite/60 disabled:opacity-50 disabled:cursor-not-allowed ${
            error
              ? "border-danger focus:border-danger"
              : "border-rule hover:border-graphite focus:border-ink"
          } ${className}`}
          {...props}
        />
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

Input.displayName = "Input";
