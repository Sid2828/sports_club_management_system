export const LATE_FEE_PER_DAY = 5;

/** Total cost = hours booked x hourly fee (rounded to cents). Returns 0 for invalid ranges. */
export function bookingCost(start: string, end: string, hourlyFee: number): number {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return Math.round((ms / 3_600_000) * hourlyFee * 100) / 100;
}

/** Late fee = full days past due x daily rate. */
export function lateFee(dueDate: string, asOf: Date = new Date(), perDay = LATE_FEE_PER_DAY): number {
  const days = Math.floor((asOf.getTime() - new Date(dueDate + "T23:59:59").getTime()) / 86_400_000) + 1;
  return days > 0 ? days * perDay : 0;
}
