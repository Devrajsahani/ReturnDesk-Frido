import React, { useId } from "react";

export interface ChoiceTileProps {
  name: string;
  value: string;
  title: string;
  description?: string;
  checked?: boolean;
  onChange?: (value: string) => void;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function ChoiceTile({
  name,
  value,
  title,
  description,
  checked = false,
  onChange,
  disabled = false,
  id,
  className = "",
}: ChoiceTileProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const baseContainer =
    "box relative flex flex-col p-3 sm:p-3.5 text-left select-none transition-colors duration-120 ease-snap";

  const stateClass = disabled
    ? "opacity-50 cursor-not-allowed"
    : checked
    ? "border-2 border-ink bg-label-tint cursor-pointer"
    : "box-interactive";

  return (
    <label
      htmlFor={inputId}
      className={`${baseContainer} ${stateClass} ${className} has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ink has-[:focus-visible]:outline-offset-2`}
    >
      <input
        type="radio"
        id={inputId}
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange?.(value)}
        className="sr-only"
      />
      <span className="font-sans font-medium text-sm text-ink">{title}</span>
      {description && (
        <span className="font-sans text-xs text-graphite mt-0.5">
          {description}
        </span>
      )}
    </label>
  );
}

export interface ChoiceTileGroupProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
  label?: string;
  error?: string;
}

export function ChoiceTileGroup({
  children,
  columns = 2,
  className = "",
  label,
  error,
}: ChoiceTileGroupProps) {
  const colClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 3
      ? "grid-cols-1 sm:grid-cols-3"
      : "grid-cols-1 sm:grid-cols-2";

  return (
    <fieldset className="w-full border-none p-0 m-0">
      {label && (
        <legend className="block text-sm font-medium text-ink mb-2">
          {label}
        </legend>
      )}
      <div className={`grid gap-2.5 ${colClass} ${className}`}>{children}</div>
      {error && (
        <p role="alert" className="text-xs text-danger mt-1.5">
          {error}
        </p>
      )}
    </fieldset>
  );
}
