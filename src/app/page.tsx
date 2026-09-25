"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DeskFilters } from "@/components/desk/DeskFilters";
import { DeskTable } from "@/components/desk/DeskTable";
import { DeskCard } from "@/components/desk/DeskCard";
import { DeskPagination } from "@/components/desk/DeskPagination";
import { DeskSkeleton } from "@/components/desk/DeskSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Banner } from "@/components/ui/Banner";
import { useToast } from "@/components/ui/Toast";
import { apiFetch, ApiClientError } from "@/lib/api/client";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ReturnRequestSummary } from "@/lib/queries/requests";
import type { PaginationMeta } from "@/lib/queries/requests";

interface ApiResponse {
  data: ReturnRequestSummary[];
  meta: PaginationMeta;
}

function DeskContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const urlQ = searchParams.get("q") ?? "";
  const urlStatus = searchParams.get("status") ?? "";
  const urlReason = searchParams.get("reason") ?? "";
  const urlSort = searchParams.get("sort") ?? "createdAt";
  const urlOrder = searchParams.get("order") ?? "desc";
  const urlPage = parseInt(searchParams.get("page") ?? "1", 10) || 1;
  const removedParam = searchParams.get("removed");

  const [searchInput, setSearchInput] = useState(urlQ);
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);
  if (prevUrlQ !== urlQ) {
    setPrevUrlQ(urlQ);
    setSearchInput(urlQ);
  }

  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const [requests, setRequests] = useState<ReturnRequestSummary[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const removedHandledRef = useRef(false);
  useEffect(() => {
    if (removedParam && !removedHandledRef.current) {
      removedHandledRef.current = true;
      showToast(`${removedParam} was removed from the desk.`, "success");

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("removed");
      const nextUrl = nextParams.toString() ? `/?${nextParams.toString()}` : "/";
      router.replace(nextUrl, { scroll: false });
    }
  }, [removedParam, searchParams, showToast, router]);

  useEffect(() => {
    if (debouncedSearch !== urlQ) {
      const nextParams = new URLSearchParams(searchParams.toString());
      if (debouncedSearch.trim()) {
        nextParams.set("q", debouncedSearch.trim());
      } else {
        nextParams.delete("q");
      }
      nextParams.set("page", "1");
      const nextUrl = nextParams.toString() ? `/?${nextParams.toString()}` : "/";
      router.replace(nextUrl, { scroll: false });
    }
  }, [debouncedSearch, urlQ, searchParams, router]);

  const selectedStatuses = urlStatus ? urlStatus.split(",").filter(Boolean) : [];
  const selectedReasons = urlReason ? urlReason.split(",").filter(Boolean) : [];
  const currentSortValue = `${urlSort}_${urlOrder}`;

  const updateUrlParams = (updates: Record<string, string | null>) => {
    setLoading(true);
    const nextParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    });
    const nextUrl = nextParams.toString() ? `/?${nextParams.toString()}` : "/";
    router.replace(nextUrl, { scroll: false });
  };

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();

    const apiQuery = new URLSearchParams();
    if (urlQ) apiQuery.set("q", urlQ);
    if (urlStatus) apiQuery.set("status", urlStatus);
    if (urlReason) apiQuery.set("reason", urlReason);
    if (urlSort) apiQuery.set("sort", urlSort);
    if (urlOrder) apiQuery.set("order", urlOrder);
    apiQuery.set("page", String(urlPage));
    apiQuery.set("pageSize", "20");

    async function executeFetch() {
      try {
        const res = await apiFetch<ApiResponse>(`/api/requests?${apiQuery.toString()}`, {
          signal: controller.signal,
        });
        if (!ignore) {
          setRequests(res.data);
          setMeta(res.meta);
          setError(null);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (ignore) return;
        if (
          (err instanceof DOMException && err.name === "AbortError") ||
          (err instanceof Error && err.name === "AbortError")
        ) {
          return;
        }
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError("Couldn't reach the server. Check your connection and try again.");
        }
        setLoading(false);
      }
    }

    executeFetch();

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [urlQ, urlStatus, urlReason, urlSort, urlOrder, urlPage, retryCount]);

  const handleStatusChange = (newStatuses: string[]) => {
    updateUrlParams({
      status: newStatuses.length > 0 ? newStatuses.join(",") : null,
      page: "1",
    });
  };

  const handleReasonChange = (newReasons: string[]) => {
    updateUrlParams({
      reason: newReasons.length > 0 ? newReasons.join(",") : null,
      page: "1",
    });
  };

  const handleSortChange = (combinedSortVal: string) => {
    const parts = combinedSortVal.split("_");
    const sortField = parts[0] || "createdAt";
    const orderField = parts[1] || "desc";
    updateUrlParams({
      sort: sortField,
      order: orderField,
      page: "1",
    });
  };

  const handlePageChange = (newPage: number) => {
    updateUrlParams({
      page: String(newPage),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setLoading(true);
    router.replace("/", { scroll: false });
  };

  const handleRetry = () => {
    setLoading(true);
    setRetryCount((c) => c + 1);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="font-display font-semibold text-2xl text-ink">Requests</h1>
        {!loading && !error && (
          <span className="text-xs text-graphite font-sans tabular-nums">{meta.total} total</span>
        )}
      </div>

      <DeskFilters
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        selectedStatuses={selectedStatuses}
        onStatusChange={handleStatusChange}
        selectedReasons={selectedReasons}
        onReasonChange={handleReasonChange}
        sortValue={currentSortValue}
        onSortChange={handleSortChange}
        onClearAll={handleClearFilters}
        facets={meta.facets}
      />

      {error && (
        <Banner
          variant="danger"
          title="Couldn't load requests"
          message={error}
          actionLabel="Try again"
          onAction={handleRetry}
        />
      )}

      {loading && <DeskSkeleton />}

      {!loading && !error && requests.length === 0 && (
        <EmptyState
          message="No requests match these filters."
          action={{
            label: "Clear filters",
            onClick: handleClearFilters,
          }}
        />
      )}

      {!loading && !error && requests.length > 0 && (
        <>
          <div className="hidden sm:block">
            <DeskTable requests={requests} />
          </div>

          <div className="sm:hidden space-y-3">
            {requests.map((req) => (
              <DeskCard key={req.reference} request={req} />
            ))}
          </div>

          <DeskPagination
            page={meta.page}
            pageSize={meta.pageSize}
            total={meta.total}
            totalPages={meta.totalPages}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

function DeskSkeletonFallback() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="h-8 w-32 bg-hover rounded-control animate-pulse" />
      <DeskSkeleton />
    </div>
  );
}

export default function DeskPage() {
  return (
    <Suspense fallback={<DeskSkeletonFallback />}>
      <DeskContent />
    </Suspense>
  );
}
