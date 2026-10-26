import { createFileRoute } from "@tanstack/react-router";
import { EquipmentPage } from "./equipment";

export const Route = createFileRoute("/other/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment Catalog — Guest View" },
      { name: "description", content: "Browse sports equipment inventory and prices." },
    ],
  }),
  component: EquipmentPage,
});
