import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Plus, Trash2, Wrench, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore } from "@/lib/store";
import type { RequestStatus } from "@/data/mock";
import { roleLayout } from "@/lib/role-layout";

export const Route = createFileRoute("/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance & Operations — ArenaOne" },
      { name: "description", content: "Facility maintenance board, work orders, and operations controls." },
    ],
  }),
  component: Maintenance,
});

const cols: RequestStatus[] = ["Pending", "In Progress", "Completed"];

interface AdminMaintenanceForm {
  venue_id: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  technician_notes?: string;
}

export function Maintenance() {
  const s = useStore();
  const isAdmin = s.role === "admin";
  const isMember = s.role === "member";
  const layout = roleLayout(s.role);
  const q = s.searchQuery.trim().toLowerCase();

  const filteredMaintenance = s.maintenance.filter((r) => {
    if (!q) return true;
    const vName = s.venueName(r.venue_id).toLowerCase();
    return (
      r.request_id.toLowerCase().includes(q) ||
      r.venue_id.toLowerCase().includes(q) ||
      vName.includes(q) ||
      r.description.toLowerCase().includes(q) ||
      (r.priority && r.priority.toLowerCase().includes(q)) ||
      r.request_status.toLowerCase().includes(q)
    );
  });

  // Modal States
  const [reportOpen, setReportOpen] = useState(false);
  const [adminAddOpen, setAdminAddOpen] = useState(false);

  // Member report form
  const {
    register: registerReport,
    handleSubmit: handleReportSubmit,
    reset: resetReport,
    formState: { errors: reportErrors },
  } = useForm<{ venue_id: string; description: string }>({
    defaultValues: { venue_id: "", description: "" },
  });

  // Admin add maintenance form
  const {
    register: registerAdmin,
    handleSubmit: handleAdminSubmit,
    reset: resetAdmin,
    formState: { errors: adminErrors },
  } = useForm<AdminMaintenanceForm>({
    defaultValues: { venue_id: "", description: "", priority: "Medium", technician_notes: "" },
  });

  const onMemberReport = handleReportSubmit((f) => {
    s.reportIssue(f.venue_id, f.description.trim());
    toast.success("Issue reported to facility management");
    resetReport();
    setReportOpen(false);
  });

  const onAdminAdd = handleAdminSubmit((f) => {
    s.addMaintenance({
      venue_id: f.venue_id,
      description: f.description.trim(),
      priority: f.priority,
    });
    toast.success("Maintenance operation scheduled", {
      description: `Venue set to Under Maintenance status.`,
    });
    resetAdmin();
    setAdminAddOpen(false);
  });

  const handleRemove = (requestId: string) => {
    s.removeMaintenance(requestId);
    toast.success(`Removed maintenance operation ${requestId}`);
  };

  return (
    <div>
      <PageHeader
        title="Maintenance & Operations"
        subtitle={
          isAdmin
            ? `Admin Operations Board · ${s.maintenance.filter((r) => r.request_status !== "Completed").length} active work orders`
            : `${s.maintenance.filter((r) => r.request_status !== "Completed").length} active maintenance operations`
        }
      >
        {isAdmin && (
          <Button onClick={() => setAdminAddOpen(true)} className="gap-1.5">
            <Plus className="size-4" />
            Add Maintenance Operation
          </Button>
        )}
        {isMember && (
          <Button onClick={() => setReportOpen(true)} variant="outline" className="gap-1.5">
            <Wrench className="size-4" />
            Report Venue Issue
          </Button>
        )}
      </PageHeader>

      {/* KANBAN BOARD */}
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c, ci) => {
          const items = filteredMaintenance.filter((r) => r.request_status === c);
          return (
            <div key={c} className="rounded-xl bg-secondary/60 p-3.5">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold">{c}</h2>
                  <span className="rounded-full bg-background px-2 py-0.5 text-xs font-bold text-muted-foreground">
                    {items.length}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((r) => (
                  <Card key={r.request_id} className="shadow-card border">
                    <CardContent className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          {r.request_id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {r.priority && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${
                                r.priority === "High" || r.priority === "Critical"
                                  ? "border-destructive text-destructive bg-destructive/10"
                                  : "border-border text-muted-foreground"
                              }`}
                            >
                              {r.priority}
                            </Badge>
                          )}
                          <StatusBadge value={r.request_status} />
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-sm">
                          {s.venueName(r.venue_id)}{" "}
                          <span className="text-xs text-muted-foreground">({r.venue_id})</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                        <span>Reported {r.reported_date}</span>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            {/* Move backwards */}
                            {ci > 0 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                title="Move back"
                                onClick={() => {
                                  const prev = cols[ci - 1];
                                  if (prev) s.moveRequest(r.request_id, prev);
                                }}
                              >
                                <ArrowLeft className="size-3.5" />
                              </Button>
                            )}

                            {/* Move forwards */}
                            {ci < 2 && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7"
                                title="Move forward"
                                onClick={() => {
                                  const next = cols[ci + 1];
                                  if (next) s.moveRequest(r.request_id, next);
                                }}
                              >
                                <ArrowRight className="size-3.5" />
                              </Button>
                            )}

                            {/* ADMIN CONTROL: Remove specific maintenance operation */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:bg-destructive/10"
                              title="Remove Operation"
                              onClick={() => handleRemove(r.request_id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {items.length === 0 && (
                  <p className="py-6 text-center text-xs text-muted-foreground">
                    No operations in {c.toLowerCase()}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADMIN ADD MAINTENANCE OPERATION DIALOG */}
      <Dialog open={adminAddOpen} onOpenChange={setAdminAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Maintenance Operation</DialogTitle>
            <DialogDescription>
              Schedule a maintenance work order. Target facility will be placed in Under Maintenance status.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onAdminAdd} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Facility / Venue</Label>
              <NativeSelect {...registerAdmin("venue_id")}>
                {s.venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.venue_name} ({v.venue_id})
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label>Priority</Label>
              <NativeSelect {...registerAdmin("priority")}>
                {["Low", "Medium", "High", "Critical"].map((p) => (
                  <option key={p} value={p}>
                    {p} Priority
                  </option>
                ))}
              </NativeSelect>
            </div>

            <div className="space-y-1.5">
              <Label>Work Description</Label>
              <Textarea
                rows={3}
                placeholder="Describe the required maintenance or repair work..."
                {...registerAdmin("description", {
                  validate: (v) => v.trim().length >= 5 || "Description must be at least 5 characters",
                })}
              />
              {adminErrors.description && (
                <p className="text-xs text-destructive">{adminErrors.description.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAdminAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Schedule Maintenance</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MEMBER REPORT ISSUE DIALOG */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report a Venue Issue</DialogTitle>
            <DialogDescription>
              Notify club facility management of maintenance or equipment problems.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onMemberReport} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Venue</Label>
              <NativeSelect {...registerReport("venue_id")}>
                {s.venues.map((v) => (
                  <option key={v.venue_id} value={v.venue_id}>
                    {v.venue_name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                placeholder="What is wrong or needs attention?"
                {...registerReport("description", {
                  validate: (v) => v.trim().length >= 5 || "Please describe the issue (5+ characters)",
                })}
              />
              {reportErrors.description && (
                <p className="text-xs text-destructive">{reportErrors.description.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Submit Report</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
