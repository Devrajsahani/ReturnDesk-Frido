"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReferenceTag } from "@/components/ui/ReferenceTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { LifecycleTrack } from "@/components/detail/LifecycleTrack";
import { RequestDetailsCard } from "@/components/detail/RequestDetailsCard";
import { NotesCard } from "@/components/detail/NotesCard";
import { ApproveDialog } from "@/components/detail/ApproveDialog";
import { RejectDialog } from "@/components/detail/RejectDialog";
import { RemoveDialog } from "@/components/detail/RemoveDialog";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import type { ReturnRequestDetail } from "@/lib/domain/types";

interface DetailApiResponse {
  data: ReturnRequestDetail;
}

export default function RequestDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);
  const { showToast } = useToast();

  const [request, setRequest] = useState<ReturnRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);

  // Dialog states
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);

  const fetchDetail = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const res = await apiFetch<DetailApiResponse>(
          `/api/requests/${encodeURIComponent(reference)}`
        );
        if (!ignore) {
          setRequest(res.data);
          setNotFound(false);
          setPageError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiClientError) {
          if (err.status === 404) {
            setNotFound(true);
            setLoading(false);
            return;
          }
          setPageError(err.message);
        } else {
          setPageError("Couldn't reach the server. Check your connection and try again.");
        }
        setLoading(false);
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, [reference, reloadKey]);

  // Transition handler for direct actions (start review, complete)
  const handleTransition = async (toStatus: "in_review" | "completed") => {
    setActionLoading(toStatus);
    setActionError(null);

    try {
      await apiFetch(`/api/requests/${reference}/transitions`, {
        method: "POST",
        body: JSON.stringify({ to: toStatus }),
      });

      if (toStatus === "in_review") {
        showToast(`Started review for ${reference}`, "success");
      } else {
        showToast(`Completed ${reference}`, "success");
      }

      await fetchDetail();
    } catch (err: unknown) {
      if (err instanceof ApiClientError) {
        setActionError(err.message);
      } else {
        setActionError("Action failed. Please check your connection and try again.");
      }
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <Skeleton className="h-4 w-24" />
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-44" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Skeleton className="h-28 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <Skeleton className="h-96 w-full" />
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <EmptyState
          message="Request not found."
          action={{
            label: "Back to desk",
            onClick: () => {
              router.push("/");
            },
          }}
        />
      </div>
    );
  }

  if (pageError || !request) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Banner
          variant="danger"
          title="Couldn't load request"
          message={pageError || "An error occurred while loading this return request."}
          actionLabel="Try again"
          onAction={fetchDetail}
        />
      </div>
    );
  }

  const { allowedActions } = request;

  // Render header buttons strictly from allowedActions
  const renderActionButtons = (isMobile: boolean = false) => {
    const buttons: React.ReactNode[] = [];

    if (allowedActions.transitions.includes("in_review")) {
      buttons.push(
        <Button
          key="in_review"
          variant="primary"
          onClick={() => handleTransition("in_review")}
          loading={actionLoading === "in_review"}
          disabled={Boolean(actionLoading)}
          className={isMobile ? "w-full" : ""}
        >
          Start review
        </Button>
      );
    }

    if (allowedActions.transitions.includes("approved")) {
      buttons.push(
        <Button
          key="approved"
          variant="primary"
          onClick={() => setApproveOpen(true)}
          disabled={Boolean(actionLoading)}
          className={isMobile ? "w-full" : ""}
        >
          Approve…
        </Button>
      );
    }

    if (allowedActions.transitions.includes("rejected")) {
      buttons.push(
        <Button
          key="rejected"
          variant="danger"
          onClick={() => setRejectOpen(true)}
          disabled={Boolean(actionLoading)}
          className={isMobile ? "w-full" : ""}
        >
          Reject
        </Button>
      );
    }

    if (allowedActions.transitions.includes("completed")) {
      buttons.push(
        <Button
          key="completed"
          variant="primary"
          onClick={() => handleTransition("completed")}
          loading={actionLoading === "completed"}
          disabled={Boolean(actionLoading)}
          className={isMobile ? "w-full" : ""}
        >
          Mark completed
        </Button>
      );
    }

    if (allowedActions.canRemove) {
      buttons.push(
        <Button
          key="remove"
          variant="danger"
          onClick={() => setRemoveOpen(true)}
          disabled={Boolean(actionLoading)}
          className={isMobile ? "w-full" : ""}
        >
          Remove from desk
        </Button>
      );
    }

    return buttons;
  };

  const actionButtons = renderActionButtons(false);
  const mobileActionButtons = renderActionButtons(true);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          href="/"
          className="text-xs text-graphite hover:text-ink focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-1 rounded-control"
        >
          ← All requests
        </Link>
      </div>

      {/* Action Error Banner */}
      {actionError && (
        <Banner
          variant="danger"
          title="Action failed"
          message={actionError}
        />
      )}

      {/* Header: ReferenceTag (lg), StatusBadge & Desktop Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <ReferenceTag reference={request.reference} size="lg" />
          <StatusBadge status={request.status} />
        </div>

        {/* Desktop actions: Right-aligned buttons */}
        <div className="hidden lg:flex items-center gap-3">
          {actionButtons}
        </div>
      </div>

      {/* Lifecycle Track */}
      <LifecycleTrack status={request.status} />

      {/* Mobile/Tablet Actions: Stacked full-width buttons below 1024px */}
      {mobileActionButtons.length > 0 && (
        <div className="lg:hidden flex flex-col gap-2.5">
          {mobileActionButtons}
        </div>
      )}

      {/* Two Columns (5 / 7) at >= 1024px; Stacked below */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5/12): Request Details */}
        <div className="lg:col-span-5">
          <RequestDetailsCard
            request={request}
            canEdit={allowedActions.canEdit}
          />
        </div>

        {/* Right Column (7/12): Notes & Add Note */}
        <div className="lg:col-span-7">
          <NotesCard
            reference={request.reference}
            notes={request.notes}
            onNoteAdded={fetchDetail}
          />
        </div>
      </div>

      {/* Dialog Modals */}
      <ApproveDialog
        reference={request.reference}
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        onSuccess={fetchDetail}
      />

      <RejectDialog
        reference={request.reference}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onSuccess={fetchDetail}
      />

      <RemoveDialog
        reference={request.reference}
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
      />
    </div>
  );
}
