"use client";

import React, { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RequestForm } from "@/components/forms/RequestForm";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatShortDate } from "@/lib/format";
import type { ReturnRequestDetail } from "@/lib/domain/types";

interface PageProps {
  params: Promise<{ reference: string }>;
}

export default function EditRequestPage({ params }: PageProps) {
  const { reference } = use(params);
  const router = useRouter();

  const [request, setRequest] = useState<ReturnRequestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/requests/${reference}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Request not found.");
          } else {
            setError("Failed to load request details.");
          }
          return;
        }

        const data = await res.json();
        if (!cancelled) {
          setRequest(data.data);
        }
      } catch {
        if (!cancelled) {
          setError("Network error. Could not connect to the server.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <div className="max-w-xl mx-auto space-y-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="box p-8 max-w-md mx-auto space-y-4">
          <p className="font-sans text-sm text-graphite">{error || "Request not found."}</p>
          <Link href="/">
            <Button variant="secondary" size="sm">
              Back to all requests
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isLocked = !request.allowedActions?.canEdit;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <div className="max-w-xl mx-auto mb-6">
        <Link
          href={`/requests/${reference}`}
          className="inline-flex items-center text-xs font-medium text-graphite hover:text-ink transition-colors mb-3"
        >
          ← Back to {reference}
        </Link>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink">
          Edit details for {reference}
        </h1>
        <p className="font-sans text-sm text-graphite mt-1">
          Update customer contact or item information.
        </p>
      </div>

      {isLocked ? (
        <div className="max-w-xl mx-auto">
          <Banner
            variant="warning"
            title="Request Locked"
            message={
              request.decidedAt
                ? `Details are locked because this request was ${request.status} on ${formatShortDate(request.decidedAt)}.`
                : `Details are locked because this request is ${request.status}.`
            }
            actionLabel="View request"
            onAction={() => router.push(`/requests/${reference}`)}
          />
        </div>
      ) : (
        <RequestForm
          mode="edit"
          reference={reference}
          initialValues={{
            customerName: request.customerName,
            customerEmail: request.customerEmail,
            customerPhone: request.customerPhone,
            orderNumber: request.orderNumber,
            itemSku: request.itemSku,
            itemName: request.itemName,
            quantity: request.quantity,
            reason: request.reason,
          }}
        />
      )}
    </div>
  );
}
