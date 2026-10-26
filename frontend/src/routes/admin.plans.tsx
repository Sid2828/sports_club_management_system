import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({
    meta: [
      { title: "Admin Operations — ArenaOne" },
      { name: "description", content: "Membership tiers are not managed from the admin portal." },
    ],
  }),
  component: () => <Navigate to="/admin" replace />,
});
