import { createFileRoute } from "@tanstack/react-router";
import { PlansPage } from "./plans";

export const Route = createFileRoute("/other/plans")({
  head: () => ({
    meta: [
      { title: "Membership Plans — Guest View" },
      { name: "description", content: "Sign up and subscribe to Gold or Platinum club memberships." },
    ],
  }),
  component: PlansPage,
});
