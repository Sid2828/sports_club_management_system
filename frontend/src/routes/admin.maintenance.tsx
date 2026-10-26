import { createFileRoute } from "@tanstack/react-router";
import { Maintenance } from "./maintenance";

export const Route = createFileRoute("/admin/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance Operations — Admin Portal" },
      { name: "description", content: "Facility maintenance requests, work orders, and repairs." },
    ],
  }),
  component: Maintenance,
});
