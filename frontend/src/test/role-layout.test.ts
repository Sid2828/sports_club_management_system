import { describe, expect, it } from "vitest";
import { equipmentDates, roleLayout } from "@/lib/role-layout";

describe("Role-based portal rules", () => {
  it("excludes Recent Activity from the Member dashboard", () => {
    expect(roleLayout("member").showRecentActivity).toBe(false);
    expect(roleLayout("admin").showRecentActivity).toBe(true);
  });
  it("defaults Admin entry to the Dashboard", () => {
    expect(roleLayout("admin").entryRoute).toBe("/");
    expect(roleLayout("member").entryRoute).toBe("/");
  });
  it("excludes Active Check-outs from Member equipment", () => {
    expect(roleLayout("member").showActiveCheckouts).toBe(false);
    expect(roleLayout("admin").showActiveCheckouts).toBe(true);
  });
  it("allows only Admins to modify equipment dates", () => {
    const defaults = { issue_date: "2026-10-25", due_date: "2026-10-28" };
    const submitted = { issue_date: "2026-11-01", due_date: "2026-11-10" };
    expect(roleLayout("member").canEditEquipmentDates).toBe(false);
    expect(equipmentDates("member", submitted, defaults)).toEqual(defaults);
    expect(roleLayout("admin").canEditEquipmentDates).toBe(true);
    expect(equipmentDates("admin", submitted, defaults)).toEqual(submitted);
  });
  it("disallows reporting maintenance for Admins while allowing Members", () => {
    expect(roleLayout("admin").canReportMaintenance).toBe(false);
    expect(roleLayout("member").canReportMaintenance).toBe(true);
  });
});