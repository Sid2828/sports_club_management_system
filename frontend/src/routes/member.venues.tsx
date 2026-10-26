import { createFileRoute } from "@tanstack/react-router";
import { Venues } from "./venues";

export const Route = createFileRoute("/member/venues")({
  head: () => ({
    meta: [
      { title: "Venues & Booking — Member Portal" },
      { name: "description", content: "Book club courts and facilities with your member privileges." },
    ],
  }),
  component: Venues,
});
