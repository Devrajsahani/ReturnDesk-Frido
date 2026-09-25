"use client";

import React, { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { ChoiceTile, ChoiceTileGroup } from "@/components/ui/ChoiceTile";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiClientError } from "@/lib/api/client";

export interface ApproveDialogProps {
  reference: string;
  etag?: string | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onStale?: (msg: string) => void;
}

export function ApproveDialog({
  reference,
  etag,
  open,
  onClose,
  onSuccess,
  onStale,
}: ApproveDialogProps) {
  const { showToast } = useToast();
  const [resolution, setResolution] = useState<"refund" | "replacement" | "store_credit">("refund");
  const [refundAmount, setRefundAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const body: Record<string, unknown> = {
      to: "approved",
      resolution,
    };

    if (resolution === "refund") {
      // Send trimmed string or empty string to let server enforce validation rules
      body.refundAmount = refundAmount.trim() || undefined;
    }

    try {
      await apiFetch(`/api/requests/${reference}/transitions`, {
        method: "POST",
        headers: etag ? { "If-Match": etag } : undefined,
        body: JSON.stringify(body),
      });

      showToast(`Approved ${reference}`, "success");
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
        setError("Failed to approve request. Please check your connection.");
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
    <Dialog open={open} onClose={handleClose} title={`Approve ${reference}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Banner variant="danger" message={error} />}

        <div>
          <span className="block text-xs font-semibold text-graphite mb-2">Resolution</span>
          <ChoiceTileGroup columns={3} className="gap-2 sm:gap-3">
            <ChoiceTile
              name="resolution"
              value="refund"
              title="Refund"
              description="Money back"
              checked={resolution === "refund"}
              onChange={() => setResolution("refund")}
            />
            <ChoiceTile
              name="resolution"
              value="replacement"
              title="Replacement"
              description="Send new item"
              checked={resolution === "replacement"}
              onChange={() => setResolution("replacement")}
            />
            <ChoiceTile
              name="resolution"
              value="store_credit"
              title="Store credit"
              description="Future credit"
              checked={resolution === "store_credit"}
              onChange={() => setResolution("store_credit")}
            />
          </ChoiceTileGroup>
        </div>

        {resolution === "refund" && (
          <div>
            <Input
              label="Refund amount (₹)"
              placeholder="e.g. 499.00"
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              hint="Required for refund resolution."
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-hairline">
          <Button variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
            Approve
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
