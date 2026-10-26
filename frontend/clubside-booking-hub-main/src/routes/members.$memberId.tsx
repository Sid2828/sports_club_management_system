import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Mail, Phone, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore, money } from "@/lib/store";

export const Route = createFileRoute("/members/$memberId")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Member Profile — ArenaOne" },
      { name: "description", content: "Membership plan, wallet and booking history for a club member." },
      { property: "og:title", content: "Member Profile — ArenaOne" },
      { property: "og:description", content: "Membership plan, wallet and booking history for a club member." },
    ],
  }),
  component: MemberDetail,
});

function MemberDetail() {
  const { memberId } = Route.useParams();
  const s = useStore();
  const [amt, setAmt] = useState("50");
  const m = s.members.find((x) => x.member_id === memberId);
  if (!m) return <p>Member not found.</p>;
  const plan = s.plans.find((p) => p.plan_id === m.plan_id)!;
  const bookings = s.bookings.filter((b) => b.member_id === m.member_id);
  const issues = s.issues.filter((i) => i.member_id === m.member_id);
  return (
    <div>
      {s.role === "admin" && <Link to="/members" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />All members</Link>}
      <PageHeader title={m.member_name} subtitle={`${m.member_id} · joined ${m.joined}`}>
        <StatusBadge value={m.tier} />{m.is_delinquent && <StatusBadge value="Delinquent" />}
      </PageHeader>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><Mail className="size-4 text-muted-foreground" />{m.email}</p>
            <p className="flex items-center gap-2"><Phone className="size-4 text-muted-foreground" />{m.phone}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="text-base">{plan.plan_name} plan</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><span className="font-display text-xl font-semibold">{money(plan.monthly_fee)}</span> / month · {plan.duration}</p>
            <ul className="space-y-1">{plan.benefits.map((b) => <li key={b} className="flex items-center gap-2"><Check className="size-4 text-success" />{b}</li>)}</ul>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Wallet className="size-4" />Wallet</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="font-display text-3xl font-semibold">{money(m.wallet_balance)}</p>
            <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); const n = Number(amt); if (!(n > 0)) { toast.error("Enter a positive amount"); return; } s.topUp(m.member_id, n); toast.success(`Added ${money(n)}`); }}>
              <Input type="number" min="1" step="0.01" value={amt} onChange={(e) => setAmt(e.target.value)} aria-label="Top-up amount" />
              <Button type="submit">Top up</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Tabs defaultValue="bookings" className="mt-6">
        <TabsList><TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger><TabsTrigger value="issues">Equipment ({issues.length})</TabsTrigger></TabsList>
        <TabsContent value="bookings">
          <Card className="divide-y p-0 shadow-card">
            {bookings.length === 0 && <p className="p-4 text-sm text-muted-foreground">No bookings yet.</p>}
            {bookings.map((b) => { const p = s.payments.find((x) => x.payment_id === b.payment_id); return (
              <div key={b.booking_id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="font-mono text-xs">{b.booking_id}</span><span className="flex-1 font-medium">{s.venueName(b.venue_id)}</span>
                <span className="text-muted-foreground">{b.start_time.replace("T", " ")} – {b.end_time.slice(11)}</span>
                <span className="tabular-nums">{money(b.total_cost)}</span>{p && <StatusBadge value={p.payment_status} />}
              </div>); })}
          </Card>
        </TabsContent>
        <TabsContent value="issues">
          <Card className="divide-y p-0 shadow-card">
            {issues.length === 0 && <p className="p-4 text-sm text-muted-foreground">No equipment history.</p>}
            {issues.map((i) => (
              <div key={i.issue_id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <span className="flex-1 font-medium">{s.equipment.find((e) => e.asset_id === i.asset_id)?.name}</span>
                <span className="text-muted-foreground">{i.issue_date} → due {i.due_date}</span>
                {i.late_fee > 0 && <span className="text-destructive">Late fee {money(i.late_fee)}</span>}
                <StatusBadge value={i.returned_date ? "Returned" : i.late_fee > 0 ? "Overdue" : "In Use"} />
              </div>
            ))}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
