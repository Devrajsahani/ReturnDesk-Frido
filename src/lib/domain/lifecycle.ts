import type { RequestStatus } from "./constants";

export const TRANSITIONS: Record<RequestStatus, readonly RequestStatus[]> = {
  open: ["in_review"],
  in_review: ["approved", "rejected"],
  approved: ["completed"],
  rejected: [],
  completed: [],
};

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isLocked(status: RequestStatus): boolean {
  return status === "approved" || status === "rejected" || status === "completed";
}

export function isRemovable(status: RequestStatus): boolean {
  return status === "open" || status === "rejected";
}

export interface AllowedActions {
  transitions: readonly RequestStatus[];
  canEdit: boolean;
  canRemove: boolean;
}

export function allowedActions(status: RequestStatus): AllowedActions {
  return {
    transitions: TRANSITIONS[status],
    canEdit: !isLocked(status),
    canRemove: isRemovable(status),
  };
}
