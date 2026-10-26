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
  it("charges per day overdue with backwards-compatibility", () => {
    expect(lateFee("2026-10-20", new Date("2026-10-23T10:00:00"), 5)).toBe(15);
  });
  it("calculates overdue fine as Base Equipment Price * 0.05 * Days Overdue", () => {
    // 3 days overdue (from 2026-10-20 to 2026-10-23) with base price 400
    // Fine = 400 * 0.05 * 3 = 60
    expect(lateFee("2026-10-20", 400, new Date("2026-10-23T10:00:00"))).toBe(60);

    // 2 days overdue with base price 1000
    // Fine = 1000 * 0.05 * 2 = 100
    expect(lateFee("2026-10-21", 1000, new Date("2026-10-23T10:00:00"))).toBe(100);

    // 1 day overdue with base price 500
    // Fine = 500 * 0.05 * 1 = 25
    expect(lateFee("2026-10-22", 500, new Date("2026-10-23T10:00:00"))).toBe(25);
  });
});
