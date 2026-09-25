import React from "react";
import type { RequestStatus } from "@/lib/domain/constants";

export interface LifecycleTrackProps {
  status: RequestStatus;
}

export function LifecycleTrack({ status }: LifecycleTrackProps) {
  const isRejected = status === "rejected";

  const getStepState = (step: "open" | "in_review" | "approved" | "completed") => {
    if (isRejected) {
      if (step === "open") return "past";
      if (step === "in_review") return "past";
      return "dimmed";
    }

    const order = ["open", "in_review", "approved", "completed"];
    const currentIndex = order.indexOf(status);
    const stepIndex = order.indexOf(step);

    if (stepIndex < currentIndex) return "past";
    if (stepIndex === currentIndex) return "current";
    return "future";
  };

  const renderStepBox = (label: string, state: "past" | "current" | "future" | "dimmed") => {
    let classes = "";
    if (state === "current") {
      classes = "bg-label border border-ink text-ink font-semibold";
    } else if (state === "past") {
      classes = "bg-paper border border-rule text-ink font-medium";
    } else if (state === "dimmed") {
      classes = "bg-canvas border border-rule text-graphite/40 opacity-40";
    } else {
      classes = "bg-canvas border border-rule text-graphite";
    }

    return (
      <div
        className={`flex items-center justify-center gap-2 px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-control select-none transition-colors duration-180 ease-snap ${classes}`}
      >
        {state === "past" && <span aria-hidden="true" className="size-2 bg-ink shrink-0" />}
        <span>{label}</span>
      </div>
    );
  };

  return (
    <div className="box p-4 sm:p-5">
      <span className="text-xs font-medium text-graphite block mb-3">Lifecycle</span>

      {/* Desktop Track (>= 640px) */}
      <div className="hidden sm:block">
        <div className="relative">
          <div className="flex items-center justify-between">
            {/* Step 1: Open */}
            <div className="flex-1 max-w-[130px]">
              {renderStepBox("Open", getStepState("open"))}
            </div>

            {/* Line 1 */}
            <div className="flex-1 h-px bg-rule mx-2" aria-hidden="true" />

            {/* Step 2: In review */}
            <div className="flex-1 max-w-[130px] relative">
              {renderStepBox("In review", getStepState("in_review"))}

              {/* Hanging Rejected Branch */}
              {isRejected && (
                <div className="absolute left-1/2 -translate-x-1/2 top-full flex flex-col items-center pt-2">
                  <div className="w-px h-3 bg-rule" aria-hidden="true" />
                  <div className="bg-danger-tint border border-danger text-danger text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-control whitespace-nowrap mt-1 flex items-center gap-1.5">
                    <span aria-hidden="true" className="size-2 bg-danger shrink-0" />
                    <span>Rejected</span>
                  </div>
                </div>
              )}
            </div>

            {/* Line 2 */}
            <div
              className={`flex-1 h-px mx-2 ${isRejected ? "bg-rule/40" : "bg-rule"}`}
              aria-hidden="true"
            />

            {/* Step 3: Approved */}
            <div className="flex-1 max-w-[130px]">
              {renderStepBox("Approved", getStepState("approved"))}
            </div>

            {/* Line 3 */}
            <div
              className={`flex-1 h-px mx-2 ${isRejected ? "bg-rule/40" : "bg-rule"}`}
              aria-hidden="true"
            />

            {/* Step 4: Completed */}
            <div className="flex-1 max-w-[130px]">
              {renderStepBox("Completed", getStepState("completed"))}
            </div>
          </div>
        </div>

        {/* Reserve spacing if rejected branch is hanging below */}
        {isRejected && <div className="h-10" aria-hidden="true" />}
      </div>

      {/* Mobile Track (< 640px) */}
      <div className="sm:hidden flex flex-col space-y-2">
        {renderStepBox("Open", getStepState("open"))}
        <div className="w-px h-3 bg-rule mx-auto" aria-hidden="true" />

        <div className="space-y-2">
          {renderStepBox("In review", getStepState("in_review"))}
          {isRejected && (
            <div className="flex flex-col items-center pt-1 pb-1">
              <div className="w-px h-2 bg-rule" aria-hidden="true" />
              <div className="w-full bg-danger-tint border border-danger text-danger text-xs font-semibold px-3 py-2 rounded-control flex items-center justify-center gap-1.5 mt-1">
                <span aria-hidden="true" className="size-2 bg-danger shrink-0" />
                <span>Rejected</span>
              </div>
            </div>
          )}
        </div>

        <div
          className={`w-px h-3 mx-auto ${isRejected ? "bg-rule/40" : "bg-rule"}`}
          aria-hidden="true"
        />
        {renderStepBox("Approved", getStepState("approved"))}

        <div
          className={`w-px h-3 mx-auto ${isRejected ? "bg-rule/40" : "bg-rule"}`}
          aria-hidden="true"
        />
        {renderStepBox("Completed", getStepState("completed"))}
      </div>
    </div>
  );
}
