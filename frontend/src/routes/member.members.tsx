import { createFileRoute } from "@tanstack/react-router";
import { Members } from "./members.index";

export const Route = createFileRoute("/member/members")({
  head: () => ({
    meta: [
      { title: "My Profile — Member Portal" },
      { name: "description", content: "View member details, wallet, and past reservations." },
    ],
  }),
  component: Members,
});
