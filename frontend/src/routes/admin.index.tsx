import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "./index";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Operations Dashboard — ArenaOne" },
      { name: "description", content: "ArenaOne Facility operations dashboard." },
    ],
  }),
  component: DashboardView,
});
