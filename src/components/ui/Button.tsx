import React from "react";
import { Spinner } from "./Spinner";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium font-sans pressable select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none rounded-control";

  const sizeClasses =
    size === "sm" ? "h-9 px-3 text-xs gap-1.5" : "h-10 px-4 text-sm gap-2";

  let variantClasses = "";
  switch (variant) {
    case "primary":
      variantClasses = "bg-ink text-paper hover:bg-ink-hover";
      break;
    case "secondary":
      variantClasses = "bg-paper text-ink border border-ink hover:bg-hover";
      break;
    case "danger":
      variantClasses =
        "bg-paper text-danger border border-danger hover:bg-danger-tint";
      break;
    case "ghost":
      variantClasses =
        "bg-transparent text-graphite hover:text-ink hover:bg-hover";
      break;
  }

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {loading && (
        <Spinner
          className={
            variant === "primary"
              ? "border-paper/25 border-t-paper"
              : variant === "danger"
              ? "border-danger/25 border-t-danger"
              : "border-ink/25 border-t-ink"
          }
        />
      )}
      <span>{children}</span>
    </button>
  );
}
