import type { Role } from "@/lib/store";

export function roleLayout(role: Role) {
  const isAdmin = role === "admin";
  const isMember = role === "member";
  const isNonMember = role === "non_member";

  return {
    entryRoute: "/" as const,
    showRecentActivity: isAdmin,
    showActiveCheckouts: isAdmin,
    canEditEquipmentDates: isAdmin,
    canReportMaintenance: isMember,
    isNonMember,
    canBook: isMember,
    canManageFacilities: isAdmin,
    canManageMaintenance: isAdmin,
  };
}

export function equipmentDates(
  role: Role,
  submitted: { issue_date: string; due_date: string },
  defaults: { issue_date: string; due_date: string }
) {
  return roleLayout(role).canEditEquipmentDates ? submitted : defaults;
}
