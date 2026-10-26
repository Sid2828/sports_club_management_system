import { createFileRoute } from "@tanstack/react-router";
import { Boxes, CalendarCheck, MapPin, Users, Wrench, Wallet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/status-badge";
import { roleLayout } from "@/lib/role-layout";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Dashboard — ArenaOne Club Management" },
      { name: "description", content: "Live overview of members, venues, bookings, maintenance and equipment." },
      { property: "og:title", content: "Dashboard — ArenaOne Club Management" },
      { property: "og:description", content: "Live overview of members, venues, bookings, maintenance and equipment." },
    ],
  }),
  component: Dashboard,
});

const icons = { booking: CalendarCheck, issue: Boxes, maintenance: Wrench, wallet: Wallet };

function Dashboard() {
  const s = useStore();
  const layout = roleLayout(s.role);
  const today = new Date().toISOString().slice(0, 10);
  const total = s.equipment.reduce((a, e) => a + e.total_quantity, 0);
  const avail = s.equipment.reduce((a, e) => a + e.available_quantity, 0);
  const stats = [
    { label: "Active Members", value: s.members.filter((m) => !m.is_delinquent).length, icon: Users },
    { label: "Available Venues", value: `${s.venues.filter((v) => v.status === "Available").length}/${s.venues.length}`, icon: MapPin },
    { label: "Bookings Today", value: s.bookings.filter((b) => b.start_time.startsWith(today)).length, icon: CalendarCheck },
    { label: "Pending Maintenance", value: s.maintenance.filter((r) => r.request_status !== "Completed").length, icon: Wrench },
  ];
  return (
    <div>
      <div className="mb-6 rounded-2xl bg-hero p-6 text-primary-foreground shadow-card">
        <p className="text-sm opacity-80">{s.role === "admin" ? "Facility operations" : "Welcome back"}</p>
        <h1 className="text-2xl font-semibold md:text-3xl">{s.role === "admin" ? "Good to see you, Dana" : `Hi, ${s.memberName(s.currentMemberId).split(" ")[0]}`}</h1>
      </div>
      <PageHeader title="Overview" subtitle="Today across the club" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((x) => (
          <Card key={x.label} className="shadow-card">
            <CardContent className="flex items-center justify-between p-5">
              <div><p className="text-xs text-muted-foreground">{x.label}</p><p className="font-display text-2xl font-semibold">{x.value}</p></div>
              <div className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground"><x.icon className="size-5" /></div>
            </CardContent>
          </Card>
        ))}
        <Card className="shadow-card">
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground">Equipment Inventory</p>
            <p className="font-display text-2xl font-semibold">{Math.round((avail / total) * 100)}%</p>
            <Progress value={(avail / total) * 100} className="mt-2" />
            <p className="mt-1 text-xs text-muted-foreground">{avail} of {total} units on shelf</p>
          </CardContent>
        </Card>
      </div>
      {layout.showRecentActivity && <Card className="mt-6 shadow-card">
        <CardHeader><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {s.activity.slice(0, 10).map((a) => {
            const I = icons[a.kind];
            return (
              <div key={a.id} className="flex items-center gap-3 py-3">
                <div className="grid size-8 place-items-center rounded-lg bg-secondary text-secondary-foreground"><I className="size-4" /></div>
                <p className="flex-1 text-sm">{a.text}</p>
                <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.at), { addSuffix: true })}</span>
              </div>
            );
          })}
        </CardContent>
      </Card>}
    </div>
  );
}
