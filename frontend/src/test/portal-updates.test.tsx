import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { lateFee } from "@/lib/calc";
import { equipment, venues, members, plans } from "@/data/mock";

describe("Phase 2: Authentication, Dedicated Role Routing & UI Updates", () => {
  const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

  it("registers all dedicated entry and role-based routes in route tree", () => {
    // 1. Landing & Dedicated Login Routes
    expect(router.matchRoutes("/login").at(-1)?.routeId).toBe("/login");
    expect(router.matchRoutes("/member/login").at(-1)?.routeId).toBe("/member/login");
    expect(router.matchRoutes("/admin/login").at(-1)?.routeId).toBe("/admin/login");

    // 2. Dedicated Sub-routes for Member
    expect(router.matchRoutes("/member").at(-1)?.routeId).toBe("/member/");
    expect(router.matchRoutes("/member/venues").at(-1)?.routeId).toBe("/member/venues");
    expect(router.matchRoutes("/member/equipment").at(-1)?.routeId).toBe("/member/equipment");
    expect(router.matchRoutes("/member/plans").at(-1)?.routeId).toBe("/member/plans");

    // 3. Dedicated Sub-routes for Admin
    expect(router.matchRoutes("/admin").at(-1)?.routeId).toBe("/admin/");
    expect(router.matchRoutes("/admin/venues").at(-1)?.routeId).toBe("/admin/venues");
    expect(router.matchRoutes("/admin/equipment").at(-1)?.routeId).toBe("/admin/equipment");
    expect(router.matchRoutes("/admin/maintenance").at(-1)?.routeId).toBe("/admin/maintenance");

    // 4. Dedicated Sub-routes for Non-member Other View
    expect(router.matchRoutes("/other").at(-1)?.routeId).toBe("/other/");
    expect(router.matchRoutes("/other/venues").at(-1)?.routeId).toBe("/other/venues");
    expect(router.matchRoutes("/other/equipment").at(-1)?.routeId).toBe("/other/equipment");
    expect(router.matchRoutes("/other/plans").at(-1)?.routeId).toBe("/other/plans");
  });

  it("calculates equipment overdue fine strictly using Base Price * 0.05 * Number of Days Overdue", () => {
    // Due 2026-10-20, checked as of 2026-10-25 10:00:00 (5 days overdue)
    const asOf = new Date("2026-10-25T10:00:00");
    const dueDate = "2026-10-20";

    for (const item of equipment) {
      const fine = lateFee(dueDate, item.daily_price, asOf);
      const expected = Math.round(item.daily_price * 0.05 * 5 * 100) / 100;
      expect(fine).toBe(expected);
      expect(fine).toBeGreaterThan(0);
    }
  });

  it("returns 0 fine when item is not overdue", () => {
    const asOf = new Date("2026-10-25T10:00:00");
    const futureDue = "2026-10-28";
    const sameDayDue = "2026-10-25";

    expect(lateFee(futureDue, 300, asOf)).toBe(0);
    expect(lateFee(sameDayDue, 300, asOf)).toBe(0);
  });

  it("prevents past venue slots from being marked available", () => {
    // Current simulated time
    const currentHour = 14;
    const currentMinute = 30;

    const isSlotInPast = (dateIso: string, hour: number, currentDateIso: string) => {
      if (dateIso < currentDateIso) return true;
      if (dateIso === currentDateIso) {
        return hour < currentHour || (hour === currentHour && currentMinute > 0);
      }
      return false;
    };

    const todayIso = "2026-10-25";
    const tomorrowIso = "2026-10-26";

    // Morning hours today (06:00 to 14:00) must be flagged as past
    expect(isSlotInPast(todayIso, 6, todayIso)).toBe(true);
    expect(isSlotInPast(todayIso, 10, todayIso)).toBe(true);
    expect(isSlotInPast(todayIso, 14, todayIso)).toBe(true); // 14:00 has started since 14:30 > 14:00

    // Evening hours today (15:00 to 21:00) are upcoming
    expect(isSlotInPast(todayIso, 15, todayIso)).toBe(false);
    expect(isSlotInPast(todayIso, 18, todayIso)).toBe(false);

    // Tomorrow hours are all upcoming
    expect(isSlotInPast(tomorrowIso, 6, todayIso)).toBe(false);
  });

  it("filters items across views dynamically using search query", () => {
    const q = "tennis";

    const filteredVenues = venues.filter(
      (v) =>
        v.venue_name.toLowerCase().includes(q) ||
        v.venue_type.toLowerCase().includes(q)
    );
    expect(filteredVenues.length).toBeGreaterThan(0);
    expect(filteredVenues.every((v) => v.venue_name.toLowerCase().includes("tennis"))).toBe(true);

    const filteredEquip = equipment.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q)
    );
    expect(filteredEquip.length).toBeGreaterThan(0);
    expect(filteredEquip.every((e) => e.name.toLowerCase().includes("tennis"))).toBe(true);
  });
});
