import type { Role } from "@/lib/store";

export function roleLayout(role: Role) {
  const isAdmin = role === "admin";
  return {
    entryRoute: isAdmin ? "/" as const : "/" as const,
    showRecentActivity: isAdmin,
    showActiveCheckouts: isAdmin,
    canEditEquipmentDates: isAdmin,
    canReportMaintenance: !isAdmin,
  };
}

export function equipmentDates(role: Role, submitted: { issue_date: string; due_date: string }, defaults: { issue_date: string; due_date: string }) {
  return roleLayout(role).canEditEquipmentDates ? submitted : defaults;
}