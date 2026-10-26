import { createFileRoute } from "@tanstack/react-router";
import { Maintenance } from "./maintenance";

export const Route = createFileRoute("/member/maintenance")({
  head: () => ({
    meta: [
      { title: "Report Maintenance — Member Portal" },
      { name: "description", content: "Report facility issues to club maintenance." },
    ],
  }),
  component: Maintenance,
});
