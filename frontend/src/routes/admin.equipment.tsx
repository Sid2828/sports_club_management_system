import { createFileRoute } from "@tanstack/react-router";
import { EquipmentPage } from "./equipment";

export const Route = createFileRoute("/admin/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment Inventory & Checkouts — Admin Portal" },
      { name: "description", content: "Admin equipment inventory control, check-outs, and return processing." },
    ],
  }),
  component: EquipmentPage,
});
