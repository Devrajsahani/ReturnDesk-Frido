"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { apiFetch, ApiClientError } from "@/lib/api/client";

export interface RemoveDialogProps {
  reference: string;
  open: boolean;
  onClose: () => void;
}

export function RemoveDialog({ reference, open, onClose }: RemoveDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await apiFetch(`/api/requests/${reference}`, {
        method: "DELETE",
      });

      // Redirect to desk with removed confirmation query param
      router.push(`/?removed=${reference}`);
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Failed to remove request. Please check your connection.");
      }
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={`Remove ${reference}`}>
      <div className="space-y-4">
        {error && <Banner variant="danger" message={error} />}

        <p className="text-sm text-graphite leading-relaxed">
          Remove request <strong className="text-ink">{reference}</strong> from the desk? It will no
          longer appear in desk searches or listings.
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
            Remove from desk
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
