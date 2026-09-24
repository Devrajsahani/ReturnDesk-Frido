export const STATUSES = [
  "open",
  "in_review",
  "approved",
  "rejected",
  "completed",
] as const;

export type RequestStatus = (typeof STATUSES)[number];

export const REASONS = [
  "damaged",
  "wrong_item",
  "size_issue",
  "not_as_described",
  "changed_mind",
] as const;

export type ReturnReason = (typeof REASONS)[number];

export const RESOLUTIONS = [
  "refund",
  "replacement",
  "store_credit",
] as const;

export type RequestResolution = (typeof RESOLUTIONS)[number];

export const STATUS_LABELS: Record<RequestStatus, string> = {
  open: "Open",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
  completed: "Completed",
};

export const REASON_LABELS: Record<ReturnReason, string> = {
  damaged: "Damaged",
  wrong_item: "Wrong item",
  size_issue: "Size issue",
  not_as_described: "Not as described",
  changed_mind: "Changed mind",
};

export const RESOLUTION_LABELS: Record<RequestResolution, string> = {
  refund: "Refund",
  replacement: "Replacement",
  store_credit: "Store credit",
};
