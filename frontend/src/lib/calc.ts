export const LATE_FEE_RATE = 0.05; // 5% per day overdue
export const LATE_FEE_PER_DAY = 5;

/** Total cost = hours booked x hourly fee (rounded to cents). Returns 0 for invalid ranges. */
export function bookingCost(start: string, end: string, hourlyFee: number): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round((ms / 3_600_000) * hourlyFee * 100) / 100;
}

/**
 * Calculate overdue fine:
 * Late Fine = Base Equipment Price * 0.05 * Number of Days Overdue
 *
 * Supports:
 * - lateFee(dueDate, basePrice, asOf)
 * - lateFee(dueDate, asOf, perDay) for backwards compatibility
 */
export function lateFee(
  dueDate: string,
  basePriceOrAsOf: number | Date = 100,
  asOfOrRate?: Date | number
): number {
  let basePrice = 100;
  let asOf = new Date();

  if (basePriceOrAsOf instanceof Date) {
    asOf = basePriceOrAsOf;
    if (typeof asOfOrRate === "number") {
      // Legacy signature: lateFee(dueDate, asOf, perDay)
      const dueMs = new Date(dueDate + "T23:59:59").getTime();
      const diff = asOf.getTime() - dueMs;
      const days = Math.floor(diff / 86_400_000) + 1;
      return days > 0 ? days * asOfOrRate : 0;
    }
  } else if (typeof basePriceOrAsOf === "number") {
    basePrice = basePriceOrAsOf;
    if (asOfOrRate instanceof Date) {
      asOf = asOfOrRate;
    }
  }

  const dueMs = new Date(dueDate + "T23:59:59").getTime();
  const diff = asOf.getTime() - dueMs;
  if (diff <= 0) return 0;

  const daysOverdue = Math.floor(diff / 86_400_000) + 1;
  return daysOverdue > 0 ? Math.round(basePrice * LATE_FEE_RATE * daysOverdue * 100) / 100 : 0;
}
