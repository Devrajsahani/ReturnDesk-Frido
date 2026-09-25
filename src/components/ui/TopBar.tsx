import React from "react";
import Link from "next/link";
import { Button } from "./Button";

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 h-14 bg-paper border-b border-hairline">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full h-full flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2.5 group cursor-pointer focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 rounded-control"
        >
          <span aria-hidden="true" className="size-2.5 bg-label shrink-0" />
          <span className="font-display font-semibold text-lg text-ink">ReturnDesk</span>
        </Link>
        <Link href="/requests/new" tabIndex={-1}>
          <Button size="sm" variant="primary">
            New request
          </Button>
        </Link>
      </div>
    </header>
  );
}
