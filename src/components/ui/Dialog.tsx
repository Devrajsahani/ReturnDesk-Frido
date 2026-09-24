"use client";

import React, { useEffect, useId, useRef } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  triggerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  children,
  triggerRef,
  className = "",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Escape key listener & focus management
  useEffect(() => {
    if (!open) return;

    const previousActiveElement =
      triggerRef?.current || (document.activeElement as HTMLElement | null);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    // Initial focus on first focusable element or dialog container
    const timer = setTimeout(() => {
      if (dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          dialogRef.current.focus();
        }
      }
    }, 20);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
      if (previousActiveElement && typeof previousActiveElement.focus === "function") {
        previousActiveElement.focus();
      }
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 animate-in fade-in duration-150 ease-snap"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`box p-6 w-full max-w-[480px] shadow-dialog animate-in fade-in zoom-in-95 duration-180 ease-snap text-left relative focus:outline-none ${className}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3
            id={titleId}
            className="font-display font-semibold text-xl text-ink"
          >
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-graphite hover:text-ink cursor-pointer p-1 rounded-control focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1"
          >
            <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

export function DialogActions({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-hairline ${className}`}
    >
      {children}
    </div>
  );
}
