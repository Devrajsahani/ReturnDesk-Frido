"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiClientError } from "@/lib/api/client";

export interface RejectDialogProps {
  reference: string;
  etag?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onStale?: (msg: string) => void;
}

export function RejectDialog({
  reference,
  etag,
  open,
  onClose,
  onSuccess,
  onStale,
}: RejectDialogProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/api/requests/${reference}/transitions`, {
        method: "POST",
        headers: etag ? { "If-Match": etag } : undefined,
        body: JSON.stringify({
          to: "rejected",
        }),
      });

      showToast(`Rejected ${reference}`, "success");
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        if (err.status === 412 && onStale) {
          onClose();
          onStale(err.message);
          return;
        }
        setError(err.message);
      } else {
        setError("Failed to reject request. Please check your connection.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={`Reject ${reference}`}>
      <div className="space-y-4">
        {error && <Banner variant="danger" message={error} />}

        <p className="text-sm text-graphite leading-relaxed">
          Are you sure you want to reject request <strong className="text-ink">{reference}</strong>?
          Once rejected, the decision is final and cannot be approved or edited.
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            Reject
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
