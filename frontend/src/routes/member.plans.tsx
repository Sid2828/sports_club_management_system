import { createFileRoute } from "@tanstack/react-router";
import { PlansPage } from "./plans";

export const Route = createFileRoute("/member/plans")({
  head: () => ({
    meta: [
      { title: "Membership Tiers — Member Portal" },
      { name: "description", content: "View and upgrade your club membership tier." },
    ],
  }),
  component: PlansPage,
});
