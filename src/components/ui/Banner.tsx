import React from "react";
import { Button } from "./Button";

export interface BannerProps {
  variant?: "danger" | "warning" | "success";
  title?: string;
  message: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function Banner({
  variant = "danger",
  title,
  message,
  actionLabel,
  onAction,
  className = "",
}: BannerProps) {
  let variantClasses = "";
  if (variant === "danger") {
    variantClasses = "border-l-4 border-l-danger bg-danger-tint";
  } else if (variant === "warning") {
    variantClasses = "border-l-4 border-l-warning bg-warning-tint";
  } else {
    variantClasses = "border-l-4 border-l-success bg-success-tint";
  }

  const role = variant === "danger" ? "alert" : "status";

  return (
    <div
      role={role}
      className={`box p-3.5 flex items-start justify-between gap-3 text-left ${variantClasses} ${className}`}
    >
      <div className="flex-1">
        {title && <h4 className="font-sans font-medium text-sm text-ink">{title}</h4>}
        <div className={`font-sans text-xs text-ink/90 ${title ? "mt-0.5" : ""}`}>{message}</div>
      </div>
      {actionLabel && onAction && (
        <Button
          size="sm"
          variant="secondary"
          onClick={onAction}
          className="shrink-0 text-xs h-7 px-2.5"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
