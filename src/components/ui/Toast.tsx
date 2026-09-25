"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ToastVariant = "success" | "danger" | "warning";

export interface ToastData {
  id: number;
  message: string;
  variant?: ToastVariant;
}

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastSeq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [activeToast, setActiveToast] = useState<ToastData | null>(null);

  const showToast = useCallback((message: string, variant: ToastVariant = "success") => {
    toastSeq += 1;
    setActiveToast({ id: toastSeq, message, variant });
  }, []);

  const hideToast = useCallback(() => {
    setActiveToast(null);
  }, []);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {activeToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 sm:left-auto sm:right-6 sm:translate-x-0 z-50 animate-in fade-in slide-in-from-bottom-2 duration-180 ease-snap pointer-events-auto"
        >
          <div
            className={`box p-3.5 pr-8 shadow-dialog relative min-w-[280px] max-w-sm border-l-4 text-left ${
              activeToast.variant === "danger"
                ? "border-l-danger bg-paper"
                : activeToast.variant === "warning"
                  ? "border-l-warning bg-paper"
                  : "border-l-success bg-paper"
            }`}
          >
            <p className="font-sans text-sm font-medium text-ink">{activeToast.message}</p>
            <button
              type="button"
              onClick={hideToast}
              aria-label="Close notification"
              className="absolute top-2.5 right-2 text-graphite hover:text-ink cursor-pointer p-1 rounded-control focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1"
            >
              <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
