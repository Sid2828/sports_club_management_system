import { createFileRoute } from "@tanstack/react-router";
import { Venues } from "./venues";

export const Route = createFileRoute("/admin/venues")({
  head: () => ({
    meta: [
      { title: "Facility & Venue Management — Admin Portal" },
      { name: "description", content: "Manage facility availability, pricing, and court schedules." },
    ],
  }),
  component: Venues,
});
