import { describe, expect, it } from "vitest";
import { roleLayout } from "@/lib/role-layout";
import { plans, equipment, venues } from "@/data/mock";

describe("Phase 1: Portal Features and Specifications", () => {
  it("enforces non-member role constraints correctly", () => {
    const guestLayout = roleLayout("non_member");
    expect(guestLayout.isNonMember).toBe(true);
    expect(guestLayout.canBook).toBe(false);
    expect(guestLayout.showActiveCheckouts).toBe(false);
    expect(guestLayout.canEditEquipmentDates).toBe(false);
    expect(guestLayout.canReportMaintenance).toBe(false);
    expect(guestLayout.canManageFacilities).toBe(false);
    expect(guestLayout.canManageMaintenance).toBe(false);
  });

  it("enforces admin management privileges while disabling booking", () => {
    const adminLayout = roleLayout("admin");
    expect(adminLayout.canBook).toBe(false);
    expect(adminLayout.canManageFacilities).toBe(true);
    expect(adminLayout.canManageMaintenance).toBe(true);
    expect(adminLayout.canEditEquipmentDates).toBe(true);
    expect(adminLayout.showActiveCheckouts).toBe(true);
  });

  it("features Gold and Platinum membership plans with exact required rates and discounts", () => {
    const gold = plans.find((p) => p.plan_name === "Gold");
    expect(gold).toBeDefined();
    expect(gold?.monthly_fee).toBe(2000);
    expect(gold?.yearly_fee).toBe(20000);
    expect(gold?.equipment_discount).toBe(30);
    expect(gold?.venue_discount).toBe(10);

    const platinum = plans.find((p) => p.plan_name === "Platinum");
    expect(platinum).toBeDefined();
    expect(platinum?.monthly_fee).toBe(3000);
    expect(platinum?.yearly_fee).toBe(30000);
    expect(platinum?.equipment_discount).toBe(50);
    expect(platinum?.venue_discount).toBe(20);
  });

  it("provides daily rental prices on all equipment items", () => {
    expect(equipment.length).toBeGreaterThan(0);
    for (const item of equipment) {
      expect(item.daily_price).toBeGreaterThan(0);
    }
  });

  it("provides base hourly fees on all venues", () => {
    expect(venues.length).toBeGreaterThan(0);
    for (const venue of venues) {
      expect(venue.base_hourly_fee).toBeGreaterThan(0);
    }
  });
});
