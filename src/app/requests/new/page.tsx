import React from "react";
import Link from "next/link";
import { RequestForm } from "@/components/forms/RequestForm";

export const metadata = {
  title: "New Request · ReturnDesk",
};

export default function NewRequestPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      <div className="max-w-xl mx-auto mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-xs font-medium text-graphite hover:text-ink transition-colors mb-3"
        >
          ← All requests
        </Link>
        <h1 className="font-display font-semibold text-2xl sm:text-3xl text-ink">
          New return request
        </h1>
        <p className="font-sans text-sm text-graphite mt-1">
          Record customer return or replacement details against an order.
        </p>
      </div>

      <RequestForm mode="create" />
    </div>
  );
}
