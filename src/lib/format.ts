/**
 * Formatting utilities for ReturnDesk UI.
 */

/**
 * Format an ISO timestamp to a short human date, e.g. "12 Sep"
 */
export function formatShortDate(isoString?: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  return `${day} ${month}`;
}

/**
 * Format currency amount in Indian Rupees (₹), e.g. "499.00" -> "₹499.00"
 */
export function formatCurrency(amount?: string | number | null): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "number" ? amount : parseFloat(amount);
  if (isNaN(num)) return "—";
  return `₹${num.toFixed(2)}`;
}
