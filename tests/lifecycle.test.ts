import { describe, it, expect } from "vitest";
import { allowedActions, canTransition, isLocked, isRemovable } from "@/lib/domain/lifecycle";
import type { RequestStatus } from "@/lib/domain/constants";

describe("allowedActions", () => {
  it("open: can start review, can edit, can remove", () => {
    expect(allowedActions("open")).toEqual({
      transitions: ["in_review"],
      canEdit: true,
      canRemove: true,
    });
  });

  it("in_review: can approve or reject, can edit, cannot remove", () => {
    expect(allowedActions("in_review")).toEqual({
      transitions: ["approved", "rejected"],
      canEdit: true,
      canRemove: false,
    });
  });

  it("approved: can complete, cannot edit, cannot remove", () => {
    expect(allowedActions("approved")).toEqual({
      transitions: ["completed"],
      canEdit: false,
      canRemove: false,
    });
  });

  it("rejected: no transitions, cannot edit, can remove", () => {
    expect(allowedActions("rejected")).toEqual({
      transitions: [],
      canEdit: false,
      canRemove: true,
    });
  });

  it("completed: no transitions, cannot edit, cannot remove", () => {
    expect(allowedActions("completed")).toEqual({
      transitions: [],
      canEdit: false,
      canRemove: false,
    });
  });
});

describe("canTransition", () => {
  it("open → in_review is allowed", () => {
    expect(canTransition("open", "in_review")).toBe(true);
  });

  it("open → rejected is not allowed", () => {
    expect(canTransition("open", "rejected")).toBe(false);
  });

  it("open → completed is not allowed", () => {
    expect(canTransition("open", "completed")).toBe(false);
  });

  it("in_review → approved is allowed", () => {
    expect(canTransition("in_review", "approved")).toBe(true);
  });

  it("in_review → rejected is allowed", () => {
    expect(canTransition("in_review", "rejected")).toBe(true);
  });

  it("approved → completed is allowed", () => {
    expect(canTransition("approved", "completed")).toBe(true);
  });

  it("rejected → anything is not allowed", () => {
    const targets: RequestStatus[] = ["open", "in_review", "approved", "completed"];
    for (const to of targets) {
      expect(canTransition("rejected", to)).toBe(false);
    }
  });

  it("completed → anything is not allowed", () => {
    const targets: RequestStatus[] = ["open", "in_review", "approved", "rejected"];
    for (const to of targets) {
      expect(canTransition("completed", to)).toBe(false);
    }
  });
});

describe("isLocked", () => {
  it("open and in_review are not locked", () => {
    expect(isLocked("open")).toBe(false);
    expect(isLocked("in_review")).toBe(false);
  });

  it("approved, rejected and completed are locked", () => {
    expect(isLocked("approved")).toBe(true);
    expect(isLocked("rejected")).toBe(true);
    expect(isLocked("completed")).toBe(true);
  });
});

describe("isRemovable", () => {
  it("open and rejected are removable", () => {
    expect(isRemovable("open")).toBe(true);
    expect(isRemovable("rejected")).toBe(true);
  });

  it("in_review, approved, completed are not removable", () => {
    expect(isRemovable("in_review")).toBe(false);
    expect(isRemovable("approved")).toBe(false);
    expect(isRemovable("completed")).toBe(false);
  });
});
