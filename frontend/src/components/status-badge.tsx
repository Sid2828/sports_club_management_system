import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  Available: "bg-success/15 text-success", Paid: "bg-success/15 text-success", Completed: "bg-success/15 text-success",
  Booked: "bg-info/15 text-info", "In Use": "bg-info/15 text-info", "In Progress": "bg-info/15 text-info",
  "Under Maintenance": "bg-warning/25 text-warning-foreground", Pending: "bg-warning/25 text-warning-foreground",
  Failed: "bg-destructive/15 text-destructive", Delinquent: "bg-destructive/15 text-destructive", Overdue: "bg-destructive/15 text-destructive",
  Returned: "bg-muted text-muted-foreground",
  Bronze: "bg-warning/20 text-warning-foreground", Silver: "bg-secondary text-secondary-foreground", Gold: "bg-warning/40 text-warning-foreground", Platinum: "bg-primary/15 text-primary",
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tone[value] ?? "bg-muted text-muted-foreground", className)}>{value}</span>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">{title}</h1>{subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}</div>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  );
}
