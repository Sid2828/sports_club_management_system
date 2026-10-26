import { createFileRoute } from "@tanstack/react-router";
import { DashboardView } from "./index";

export const Route = createFileRoute("/member/")({
  head: () => ({
    meta: [
      { title: "Member Dashboard — ArenaOne" },
      { name: "description", content: "ArenaOne Member Portal dashboard." },
    ],
  }),
  component: DashboardView,
});
