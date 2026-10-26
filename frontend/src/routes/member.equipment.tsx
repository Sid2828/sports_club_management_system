import { createFileRoute } from "@tanstack/react-router";
import { EquipmentPage } from "./equipment";

export const Route = createFileRoute("/member/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment Catalog & Loans — Member Portal" },
      { name: "description", content: "Check out sports gear and track your active equipment loans." },
    ],
  }),
  component: EquipmentPage,
});
