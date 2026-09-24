import type { RequestResolution, RequestStatus, ReturnReason } from "./constants";
import type { AllowedActions } from "./lifecycle";

export interface NoteSummary {
  id: string;
  author: string;
  body: string;
  createdAt: string;
}

export interface ReturnRequestSummary {
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  orderNumber: string;
  itemSku: string;
  itemName: string;
  quantity: number;
  reason: ReturnReason;
  status: RequestStatus;
  resolution: RequestResolution | null;
  refundAmount: string | null;
  createdAt: string;
  updatedAt: string;
  decidedAt: string | null;
}

export interface ReturnRequestDetail extends ReturnRequestSummary {
  notes: NoteSummary[];
  allowedActions: AllowedActions;
}
