import React from "react";
import Link from "next/link";
import { ReferenceTag } from "@/components/ui/ReferenceTag";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatShortDate } from "@/lib/format";
import type { ReturnRequestSummary } from "@/lib/queries/requests";

export interface DeskTableProps {
  requests: ReturnRequestSummary[];
}

export function DeskTable({ requests }: DeskTableProps) {
  return (
    <div className="box overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="h-10 bg-canvas border-b border-hairline text-xs font-medium text-graphite">
              <th scope="col" className="px-4 py-2 font-medium">
                Reference
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Customer
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Order
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Item
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-2 font-medium text-right">
                Raised
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline bg-paper text-sm">
            {requests.map((req) => (
              <tr
                key={req.reference}
                className="group relative h-12 hover:bg-hover transition-colors duration-120 ease-snap before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-transparent hover:before:bg-ink focus-within:before:bg-ink focus-within:outline-2 focus-within:outline-ink focus-within:outline-offset-[-2px]"
              >
                <td className="px-4 py-2 whitespace-nowrap">
                  <Link
                    href={`/requests/${req.reference}`}
                    className="focus:outline-none after:absolute after:inset-0 after:z-10"
                    aria-label={`View return request ${req.reference} for ${req.customerName}`}
                  >
                    <ReferenceTag reference={req.reference} />
                  </Link>
                </td>
                <td className="px-4 py-2 font-medium text-ink whitespace-nowrap">
                  {req.customerName}
                </td>
                <td className="px-4 py-2 text-graphite whitespace-nowrap">{req.orderNumber}</td>
                <td className="px-4 py-2 text-ink max-w-xs truncate">
                  {req.itemName}
                  {req.quantity > 1 ? ` x${req.quantity}` : " x1"}
                </td>
                <td className="px-4 py-2 whitespace-nowrap">
                  <StatusBadge status={req.status} />
                </td>
                <td className="px-4 py-2 text-graphite whitespace-nowrap text-right tabular-nums">
                  {formatShortDate(req.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
