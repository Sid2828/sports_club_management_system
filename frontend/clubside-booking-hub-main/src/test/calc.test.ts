import { describe, expect, it } from "vitest";
import { bookingCost, lateFee } from "@/lib/calc";

describe("bookingCost", () => {
  it("charges hours times hourly fee", () => {
    expect(bookingCost("2026-10-24T10:00", "2026-10-24T12:30", 40)).toBe(100);
  });
  it("is zero when end is before start", () => {
    expect(bookingCost("2026-10-24T12:00", "2026-10-24T10:00", 40)).toBe(0);
  });
});

describe("lateFee", () => {
  it("is zero on the due date", () => {
    expect(lateFee("2026-10-24", new Date("2026-10-24T18:00:00"))).toBe(0);
  });
  it("charges per day overdue", () => {
    expect(lateFee("2026-10-20", new Date("2026-10-23T10:00:00"), 5)).toBe(15);
  });
});
