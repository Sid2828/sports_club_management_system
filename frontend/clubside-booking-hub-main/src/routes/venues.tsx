import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CornerDownRight, Clock } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore, money } from "@/lib/store";
import { bookingCost } from "@/lib/calc";
import type { PaymentMethod, Venue, VenueStatus } from "@/data/mock";

export const Route = createFileRoute("/venues")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Venues & Booking — ArenaOne" },
      { name: "description", content: "Browse courts, pools and fields and book them by the hour." },
      { property: "og:title", content: "Venues & Booking — ArenaOne" },
      { property: "og:description", content: "Browse courts, pools and fields and book them by the hour." },
    ],
  }),
  component: Venues,
});

function Venues() {
  const s = useStore();
  const [cat, setCat] = useState("All");
  const [type, setType] = useState("All");
  const [booking, setBooking] = useState<Venue | null>(null);
  const types = ["All", ...new Set(s.venues.map((v) => v.venue_type))];
  const list = s.venues.filter((v) => {
    const cats = v.sport_ids.map((id) => s.sports.find((x) => x.sport_id === id)!.category);
    return (cat === "All" || cats.includes(cat as "Indoor")) && (type === "All" || v.venue_type === type);
  });
  return (
    <div>
      <PageHeader title="Venues & Booking" subtitle={`${list.length} venues`}>
        <NativeSelect value={cat} onChange={(e) => setCat(e.target.value)} className="w-32" aria-label="Category">
          {["All", "Indoor", "Outdoor"].map((c) => <option key={c}>{c}</option>)}
        </NativeSelect>
        <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="w-32" aria-label="Venue type">
          {types.map((c) => <option key={c}>{c}</option>)}
        </NativeSelect>
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((v) => {
          const parent = v.parent_venue_id && s.venueName(v.parent_venue_id);
          return (
            <Card key={v.venue_id} className="flex flex-col shadow-card">
              <CardContent className="flex-1 space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{v.venue_id} · {v.venue_type}</p>
                    <h3 className="text-lg font-semibold">{v.venue_name}</h3>
                    {parent && <p className="flex items-center gap-1 text-xs text-muted-foreground"><CornerDownRight className="size-3" />Part of {parent}</p>}
                  </div>
                  <StatusBadge value={v.status} />
                </div>
                <div className="flex flex-wrap gap-1">
                  {v.sport_ids.map((id) => { const sp = s.sports.find((x) => x.sport_id === id)!; return <Badge key={id} variant="secondary">{sp.sport_name} · {sp.category}</Badge>; })}
                </div>
                <p className="font-display text-xl font-semibold">{money(v.base_hourly_fee)}<span className="text-sm font-normal text-muted-foreground"> / hour</span></p>
              </CardContent>
              <CardFooter className="gap-2 p-5 pt-0">
                <Button className="flex-1" disabled={v.status === "Under Maintenance"} onClick={() => setBooking(v)}>Book</Button>
                {s.role === "admin" && (
                  <NativeSelect className="w-40" value={v.status} aria-label="Status" onChange={(e) => s.setVenueStatus(v.venue_id, e.target.value as VenueStatus)}>
                    {["Available", "Booked", "Under Maintenance"].map((x) => <option key={x}>{x}</option>)}
                  </NativeSelect>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {booking && <BookingDialog venue={booking} onClose={() => setBooking(null)} />}
    </div>
  );
}

interface Form { member_id: string; start_time: string; end_time: string; payment_method: PaymentMethod }

function BookingDialog({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const s = useStore();
  const [step, setStep] = useState<1 | 2>(1);
  const today = new Date().toISOString().slice(0, 10);
  const { register, watch, handleSubmit } = useForm<Form>({
    defaultValues: { member_id: s.currentMemberId, start_time: `${today}T18:00`, end_time: `${today}T19:00`, payment_method: "Wallet" },
  });
  const v = watch();
  const cost = bookingCost(v.start_time, v.end_time, venue.base_hourly_fee);
  const member = s.members.find((m) => m.member_id === v.member_id)!;
  const insufficient = v.payment_method === "Wallet" && member.wallet_balance < cost;

  const submit = handleSubmit((f) => {
    if (step === 1) { if (cost <= 0) return toast.error("End time must be after start time"); return setStep(2); }
    const status = insufficient ? "Failed" : f.payment_method === "Cash" ? "Pending" : "Paid";
    if (status === "Failed") return toast.error("Insufficient wallet balance");
    s.addBooking({ venue_id: venue.venue_id, member_id: f.member_id, start_time: f.start_time, end_time: f.end_time, total_cost: cost },
      { payment_method: f.payment_method, payment_status: status, payment_date: today });
    toast.success(`Booked ${venue.venue_name}`, { description: `${money(cost)} · ${status}` });
    onClose();
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Book {venue.venue_name}</DialogTitle>
          <DialogDescription>Step {step} of 2 · {step === 1 ? "Time & member" : "Payment"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {step === 1 ? (
            <>
              <div className="space-y-1.5"><Label>Member</Label>
                <NativeSelect {...register("member_id")} disabled={s.role === "member"}>
                  {s.members.map((m) => <option key={m.member_id} value={m.member_id}>{m.member_name} ({m.member_id})</option>)}
                </NativeSelect>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Start time</Label><Input type="datetime-local" {...register("start_time")} /></div>
                <div className="space-y-1.5"><Label>End time</Label><Input type="datetime-local" {...register("end_time")} /></div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5"><Label>Payment method</Label>
                <NativeSelect {...register("payment_method")}>{["Wallet", "Card", "UPI", "Cash"].map((x) => <option key={x}>{x}</option>)}</NativeSelect>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground">Payment date</p><p>{today}</p></div>
                <div><p className="text-muted-foreground">Status</p><StatusBadge value={insufficient ? "Failed" : v.payment_method === "Cash" ? "Pending" : "Paid"} /></div>
              </div>
              {v.payment_method === "Wallet" && <p className="text-xs text-muted-foreground">Wallet balance: {money(member.wallet_balance)}</p>}
            </>
          )}
          <div className="flex items-center justify-between rounded-lg bg-secondary p-3">
            <span className="flex items-center gap-1 text-sm text-secondary-foreground"><Clock className="size-4" />{money(venue.base_hourly_fee)}/hr</span>
            <span className="font-display text-lg font-semibold">{money(cost)}</span>
          </div>
          <DialogFooter>
            {step === 2 && <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>}
            <Button type="submit">{step === 1 ? "Continue to payment" : "Confirm & pay"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
