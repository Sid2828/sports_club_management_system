import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore } from "@/lib/store";
import type { RequestStatus } from "@/data/mock";
import { roleLayout } from "@/lib/role-layout";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Maintenance Board — ArenaOne" },
      { name: "description", content: "Report and track venue maintenance requests from pending to completed." },
      { property: "og:title", content: "Maintenance Board — ArenaOne" },
      { property: "og:description", content: "Report and track venue maintenance requests from pending to completed." },
    ],
  }),
  component: Maintenance,
});

const cols: RequestStatus[] = ["Pending", "In Progress", "Completed"];

function Maintenance() {
  const s = useStore();
  const layout = roleLayout(s.role);
  const [open, setOpen] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<{ venue_id: string; description: string }>({ defaultValues: { venue_id: "V1", description: "" } });
  const submit = handleSubmit((f) => { if (!layout.canReportMaintenance) return; s.reportIssue(f.venue_id, f.description.trim()); toast.success("Issue reported"); reset(); setOpen(false); });
  return (
    <div>
      <PageHeader title="Maintenance & Operations" subtitle={`${s.maintenance.filter((r) => r.request_status !== "Completed").length} open requests`}>
        {layout.canReportMaintenance && <Button onClick={() => setOpen(true)}><Plus className="size-4" />Report issue</Button>}
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c, ci) => {
          const items = s.maintenance.filter((r) => r.request_status === c);
          return (
            <div key={c} className="rounded-xl bg-secondary/60 p-3">
              <div className="mb-3 flex items-center justify-between px-1"><h2 className="text-sm font-semibold">{c}</h2><span className="text-xs text-muted-foreground">{items.length}</span></div>
              <div className="space-y-3">
                {items.map((r) => (
                  <Card key={r.request_id} className="shadow-card">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between"><span className="font-mono text-xs text-muted-foreground">{r.request_id}</span><StatusBadge value={r.request_status} /></div>
                      <p className="font-medium">{s.venueName(r.venue_id)} <span className="text-xs text-muted-foreground">({r.venue_id})</span></p>
                      <p className="text-sm text-muted-foreground">{r.description}</p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">Reported {r.reported_date}</span>
                        {s.role === "admin" && (
                          <div className="flex gap-1">
                            {ci > 0 && <Button size="icon" variant="ghost" className="size-7" aria-label="Move back" onClick={() => { const previous = cols[ci - 1]; if (previous) s.moveRequest(r.request_id, previous); }}><ArrowLeft className="size-4" /></Button>}
                            {ci < 2 && <Button size="icon" variant="ghost" className="size-7" aria-label="Move forward" onClick={() => { const next = cols[ci + 1]; if (next) s.moveRequest(r.request_id, next); }}><ArrowRight className="size-4" /></Button>}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {layout.canReportMaintenance && <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report a venue issue</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5"><Label>Venue</Label><NativeSelect {...register("venue_id")}>{s.venues.map((v) => <option key={v.venue_id} value={v.venue_id}>{v.venue_name}</option>)}</NativeSelect></div>
            <div className="space-y-1.5"><Label>Description</Label>
              <Textarea rows={4} placeholder="What's wrong?" {...register("description", { validate: (v) => v.trim().length >= 5 || "Please describe the issue (5+ characters)" })} />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <DialogFooter><Button type="submit">Submit request</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>}
    </div>
  );
}
