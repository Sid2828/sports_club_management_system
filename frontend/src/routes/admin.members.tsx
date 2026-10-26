import { createFileRoute } from "@tanstack/react-router";
import { Members } from "./members.index";

export const Route = createFileRoute("/admin/members")({
  head: () => ({
    meta: [
      { title: "Member Directory — Admin Portal" },
      { name: "description", content: "Club membership directory, accounts, and standing." },
    ],
  }),
  component: Members,
});
