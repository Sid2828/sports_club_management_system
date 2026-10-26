import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NativeSelect } from "@/components/native-select";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore, money } from "@/lib/store";
import { LATE_FEE_PER_DAY } from "@/lib/calc";
import { equipmentDates, roleLayout } from "@/lib/role-layout";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Equipment & Inventory — ArenaOne" },
      { name: "description", content: "Track club equipment stock, check-outs, due dates and late fees." },
      { property: "og:title", content: "Equipment & Inventory — ArenaOne" },
      { property: "og:description", content: "Track club equipment stock, check-outs, due dates and late fees." },
    ],
  }),
  component: EquipmentPage,
});

interface Form { member_id: string; asset_id: string; issue_date: string; due_date: string }

function EquipmentPage() {
  const s = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  const { register, handleSubmit, reset } = useForm<Form>({ defaultValues: { member_id: s.currentMemberId, asset_id: "EQ-201", issue_date: today, due_date: due } });
  const isAdmin = s.role === "admin";
  const layout = roleLayout(s.role);
  const active = s.issues.filter((i) => !i.returned_date && (isAdmin || i.member_id === s.currentMemberId));

  const submit = handleSubmit((f) => {
    const member_id = isAdmin ? f.member_id : s.currentMemberId;
    const eq = s.equipment.find((e) => e.asset_id === f.asset_id);
    if (!eq) { toast.error("Select an available asset"); return; }
    const dates = equipmentDates(s.role, { issue_date: f.issue_date, due_date: f.due_date }, { issue_date: today, due_date: due });
    if (eq.available_quantity <= 0 || eq.status === "Under Maintenance") { toast.error(`${eq.name} is not available`); return; }
    if (dates.due_date < dates.issue_date) { toast.error("Due date must be after issue date"); return; }
    s.checkout({ ...f, ...dates, member_id });
    toast.success(`${eq.name} checked out`);
    reset({ ...f, ...dates });
  });

  return (
    <div>
      <PageHeader title="Equipment & Inventory" subtitle={`Late fee: ${money(LATE_FEE_PER_DAY)} per day overdue`} />
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden p-0 shadow-card xl:col-span-2">
          <Table>
            <TableHeader><TableRow><TableHead>Asset ID</TableHead><TableHead>Item</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Available / Total</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {s.equipment.map((e) => (
                <TableRow key={e.asset_id}>
                  <TableCell className="font-mono text-xs">{e.asset_id}</TableCell><TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.category}</TableCell>
                  <TableCell className="text-right tabular-nums">{e.available_quantity} / {e.total_quantity}</TableCell>
                  <TableCell><StatusBadge value={e.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Check out equipment</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-3">
              {isAdmin && <div className="space-y-1.5"><Label>Member</Label><NativeSelect {...register("member_id")}>{s.members.map((m) => <option key={m.member_id} value={m.member_id}>{m.member_name} ({m.member_id})</option>)}</NativeSelect></div>}
              <div className="space-y-1.5"><Label>Asset</Label><NativeSelect {...register("asset_id")}>{s.equipment.map((e) => <option key={e.asset_id} value={e.asset_id}>{e.asset_id} · {e.name} ({e.available_quantity} left)</option>)}</NativeSelect></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label htmlFor="issue-date">Issue date</Label><Input id="issue-date" type="date" readOnly={!layout.canEditEquipmentDates} {...register("issue_date")} /></div>
                <div className="space-y-1.5"><Label htmlFor="due-date">Due date</Label><Input id="due-date" type="date" readOnly={!layout.canEditEquipmentDates} {...register("due_date")} /></div>
              </div>
              <Button type="submit" className="w-full">Check out</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      {layout.showActiveCheckouts && <Card className="mt-6 shadow-card">
        <CardHeader><CardTitle className="text-base">Active check-outs ({active.length})</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {active.map((i) => (
            <div key={i.issue_id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <span className="font-mono text-xs">{i.issue_id}</span>
              <span className="flex-1"><span className="font-medium">{s.equipment.find((e) => e.asset_id === i.asset_id)?.name}</span> · {s.memberName(i.member_id)}</span>
              <span className="text-muted-foreground">due {i.due_date}</span>
              {i.late_fee > 0 ? <StatusBadge value="Overdue" /> : <StatusBadge value="In Use" />}
              <span className="w-20 text-right tabular-nums">{money(i.late_fee)}</span>
              {isAdmin && <Button size="sm" variant="outline" onClick={() => { s.returnItem(i.issue_id); toast.success("Marked returned"); }}>Return</Button>}
            </div>
          ))}
          {active.length === 0 && <p className="py-3 text-sm text-muted-foreground">Nothing checked out.</p>}
        </CardContent>
      </Card>}
    </div>
  );
}
