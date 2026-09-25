import React from "react";
import { Button } from "./Button";

export interface EmptyStateProps {
  message: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({ message, action, className = "" }: EmptyStateProps) {
  return (
    <div
      className={`box p-8 text-center flex flex-col items-center justify-center gap-4 ${className}`}
    >
      <p className="text-sm text-graphite">{message}</p>
      {action && (
        <Button variant="secondary" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
