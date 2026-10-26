import { createFileRoute } from "@tanstack/react-router";
import { Venues } from "./venues";

export const Route = createFileRoute("/other/venues")({
  head: () => ({
    meta: [
      { title: "Venues & Schedules — Guest View" },
      { name: "description", content: "Browse ArenaOne sports facilities and time slot schedules." },
    ],
  }),
  component: Venues,
});
