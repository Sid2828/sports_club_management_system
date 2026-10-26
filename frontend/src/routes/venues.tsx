import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CornerDownRight,
  Clock,
  Calendar,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Sparkles,
  Check,
  ChevronRight,
  Shield,
  CalendarDays,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore, money } from "@/lib/store";
import type { PaymentMethod, Venue, VenueStatus } from "@/data/mock";

export const Route = createFileRoute("/venues")({
  head: () => ({
    meta: [
      { title: "Venues & Booking — ArenaOne" },
      { name: "description", content: "Browse sports facilities, day-wise time slot schedules, and facility management." },
    ],
  }),
  component: Venues,
});

interface AddVenueForm {
  venue_name: string;
  venue_type: string;
  base_hourly_fee: number;
  sport_ids: string;
  parent_venue_id?: string;
}

export function Venues() {
  const s = useStore();
  const isAdmin = s.role === "admin";
  const isMember = s.role === "member";
  const isNonMember = s.role === "non_member";

  const [cat, setCat] = useState("All");
  const [type, setType] = useState("All");

  // Grid Modal State
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  // Admin Facility States
  const [addVenueOpen, setAddVenueOpen] = useState(false);
  const [editingPriceVenue, setEditingPriceVenue] = useState<Venue | null>(null);
  const [newVenuePrice, setNewVenuePrice] = useState("");

  const types = ["All", ...new Set(s.venues.map((v) => v.venue_type))];
  const q = s.searchQuery.trim().toLowerCase();
  const list = s.venues.filter((v) => {
    const resolveSport = (id: string) => s.sports.find((x) => x.sport_id === id || x.sport_name === id);
    const cats = v.sport_ids.map((id) => resolveSport(id)?.category ?? "Indoor");
    const matchesCat = cat === "All" || cats.includes(cat as "Indoor");
    const matchesType = type === "All" || v.venue_type === type;
    const sports = v.sport_ids.map((id) => resolveSport(id)?.sport_name ?? id);
    const matchesSearch =
      !q ||
      v.venue_name.toLowerCase().includes(q) ||
      v.venue_type.toLowerCase().includes(q) ||
      v.venue_id.toLowerCase().includes(q) ||
      sports.some((sp) => sp.toLowerCase().includes(q));
    return matchesCat && matchesType && matchesSearch;
  });

  const memberDiscounts = s.getMemberDiscounts();
  const venueDiscountPercent = memberDiscounts.venue;

  const { register: registerAdd, handleSubmit: handleAddSubmit, reset: resetAdd } = useForm<AddVenueForm>({
    defaultValues: { venue_name: "", venue_type: "Court", base_hourly_fee: 400, sport_ids: "S1" },
  });

  const onAddFacility = handleAddSubmit((f) => {
    if (!f.venue_name.trim()) return toast.error("Enter venue name");
    s.addVenue({
      venue_name: f.venue_name.trim(),
      venue_type: f.venue_type,
      base_hourly_fee: Number(f.base_hourly_fee),
      sport_ids: [f.sport_ids],
      parent_venue_id: f.parent_venue_id || undefined,
    });
    toast.success(`Facility ${f.venue_name} created successfully!`);
    resetAdd();
    setAddVenueOpen(false);
  });

  const handleSaveVenuePrice = () => {
    if (!editingPriceVenue) return;
    const p = Number(newVenuePrice);
    if (isNaN(p) || p <= 0) return toast.error("Enter a valid hourly rate");
    s.setVenuePrice(editingPriceVenue.venue_id, p);
    toast.success(`Updated hourly rate for ${editingPriceVenue.venue_name} to ${money(p)}/hr`);
    setEditingPriceVenue(null);
  };

  return (
    <div>
      <PageHeader
        title="Venues & Booking"
        subtitle={
          isAdmin
            ? `Admin facility controls · ${list.length} facilities active`
            : isNonMember
            ? `View venue schedules (Read-Only) · ${list.length} facilities`
            : `Book club courts & halls · Member tier discount: ${venueDiscountPercent}% off`
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect value={cat} onChange={(e) => setCat(e.target.value)} className="w-28 text-xs h-9" aria-label="Category">
            {["All", "Indoor", "Outdoor"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
          <NativeSelect value={type} onChange={(e) => setType(e.target.value)} className="w-28 text-xs h-9" aria-label="Venue type">
            {types.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </NativeSelect>
          {isAdmin && (
            <Button onClick={() => setAddVenueOpen(true)} className="gap-1.5 h-9 text-xs">
              <Plus className="size-3.5" />
              Add Facility
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Non-Member Banner */}
      {isNonMember && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <span>
              <strong>Read-Only Access:</strong> You can view detailed day-wise venue schedules. To reserve slots, an active Gold or Platinum membership is required.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-400 text-amber-950 hover:bg-amber-100"
            onClick={() => s.triggerUpgradeModal("Venue Booking")}
          >
            Upgrade Plan
          </Button>
        </div>
      )}

      {/* VENUE CARDS GRID */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((v) => {
          const parent = v.parent_venue_id && s.venueName(v.parent_venue_id);
          const discountedFee =
            venueDiscountPercent > 0
              ? Math.round(v.base_hourly_fee * (1 - venueDiscountPercent / 100))
              : v.base_hourly_fee;

          return (
            <Card key={v.venue_id} className="flex flex-col shadow-card">
              <CardContent className="flex-1 space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {v.venue_id} · {v.venue_type}
                    </p>
                    <h3 className="text-lg font-semibold">{v.venue_name}</h3>
                    {parent && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CornerDownRight className="size-3" />
                        Part of {parent}
                      </p>
                    )}
                  </div>
                  <StatusBadge value={v.status} />
                </div>

                <div className="flex flex-wrap gap-1">
                  {v.sport_ids.map((id) => {
                    const sp = s.sports.find((x) => x.sport_id === id || x.sport_name === id);
                    return (
                      <Badge key={id} variant="secondary" className="text-xs font-normal">
                        {sp?.sport_name ?? id} · {sp?.category ?? "Indoor"}
                      </Badge>
                    );
                  })}
                </div>

                <div className="pt-1">
                  {isMember && venueDiscountPercent > 0 ? (
                    <div className="flex items-baseline gap-2">
                      <p className="font-display text-xl font-bold text-emerald-700">
                        {money(discountedFee)}
                        <span className="text-xs font-normal text-muted-foreground"> / hour</span>
                      </p>
                      <span className="text-xs text-muted-foreground line-through">
                        {money(v.base_hourly_fee)}
                      </span>
                      <span className="text-[11px] font-semibold text-emerald-600">
                        ({venueDiscountPercent}% off)
                      </span>
                    </div>
                  ) : (
                    <p className="font-display text-xl font-semibold">
                      {money(v.base_hourly_fee)}
                      <span className="text-xs font-normal text-muted-foreground"> / hour</span>
                    </p>
                  )}
                </div>
              </CardContent>

              <CardFooter className="gap-2 p-5 pt-0 border-t bg-muted/20">
                {/* ADMIN TOOLS: Remove booking option completely & add status/pricing tools */}
                {isAdmin ? (
                  <div className="flex w-full items-center justify-between gap-2 pt-3">
                    <NativeSelect
                      className="w-36 text-xs h-8"
                      value={v.status}
                      aria-label="Venue status"
                      onChange={(e) => s.setVenueStatus(v.venue_id, e.target.value as VenueStatus)}
                    >
                      {["Available", "Booked", "Under Maintenance"].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </NativeSelect>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-foreground"
                        title="Set Hourly Fee"
                        onClick={() => {
                          setEditingPriceVenue(v);
                          setNewVenuePrice(String(v.base_hourly_fee));
                        }}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-destructive hover:bg-destructive/10"
                        title="Delete Facility"
                        onClick={() => {
                          s.removeVenue(v.venue_id);
                          toast.success(`Removed facility ${v.venue_name}`);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* MEMBERS & NON-MEMBERS: Opens Detailed Day-wise Time Slot Grid */
                  <Button
                    className="w-full mt-3 gap-1.5"
                    disabled={v.status === "Under Maintenance"}
                    onClick={() => setSelectedVenue(v)}
                  >
                    <CalendarDays className="size-4" />
                    {isNonMember ? "View Schedule Grid" : "Select Time Slot & Book"}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* DETAILED DAY-WISE TIME SLOT GRID MODAL */}
      {selectedVenue && (
        <DayWiseSlotGridModal
          venue={selectedVenue}
          onClose={() => setSelectedVenue(null)}
        />
      )}

      {/* ADMIN ADD FACILITY DIALOG */}
      <Dialog open={addVenueOpen} onOpenChange={setAddVenueOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Club Facility</DialogTitle>
            <DialogDescription>
              Create a new court, hall, pool, or field with pricing and sports association.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onAddFacility} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label>Facility Name</Label>
              <Input
                placeholder="e.g. Badminton Court C"
                {...registerAdd("venue_name", { required: true })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Venue Type</Label>
                <NativeSelect {...registerAdd("venue_type")}>
                  {["Court", "Hall", "Pool", "Field", "Nets", "Studio"].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label>Base Hourly Fee (₹)</Label>
                <Input
                  type="number"
                  min="50"
                  step="50"
                  {...registerAdd("base_hourly_fee", { valueAsNumber: true })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Primary Sport</Label>
              <NativeSelect {...registerAdd("sport_ids")}>
                {s.sports.map((sp) => (
                  <option key={sp.sport_id} value={sp.sport_id}>
                    {sp.sport_name} ({sp.category})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label>Parent Facility (Optional)</Label>
              <NativeSelect {...registerAdd("parent_venue_id")}>
                <option value="">None (Independent Facility)</option>
                {s.venues.map((p) => (
                  <option key={p.venue_id} value={p.venue_id}>
                    {p.venue_name} ({p.venue_id})
                  </option>
                ))}
              </NativeSelect>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddVenueOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Facility</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADMIN EDIT VENUE PRICE DIALOG */}
      <Dialog open={Boolean(editingPriceVenue)} onOpenChange={(o) => !o && setEditingPriceVenue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Facility Pricing</DialogTitle>
            <DialogDescription>
              Set base hourly rate for {editingPriceVenue?.venue_name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Base Hourly Rate (₹)</Label>
              <Input
                type="number"
                min="50"
                step="50"
                value={newVenuePrice}
                onChange={(e) => setNewVenuePrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPriceVenue(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVenuePrice}>Save Pricing</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =====================================================================
// DETAILED DAY-WISE TIME SLOT GRID MODAL COMPONENT
// =====================================================================
interface SlotModalProps {
  venue: Venue;
  onClose: () => void;
}

function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function DayWiseSlotGridModal({ venue, onClose }: SlotModalProps) {
  const s = useStore();
  const isNonMember = s.role === "non_member";
  const discounts = s.getMemberDiscounts();
  const discountPercent = discounts.venue;

  // Generate next 7 days dynamically starting from current date
  const now = new Date();
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const dateIso = getLocalDateString(d);
    const dayName = i === 0 ? "Today" : i === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", { weekday: "short" });
    const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return { dateIso, dayName, formatted, isToday: i === 0 };
  });

  const [selectedDate, setSelectedDate] = useState(days[0].dateIso);

  // Booking step states
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Wallet");

  // Hourly slots from 06:00 to 22:00
  const hours = Array.from({ length: 16 }).map((_, idx) => 6 + idx);

  // Check if slot is in the past based on real-time current date and time
  const isSlotInPast = (dateIso: string, hour: number) => {
    const current = new Date();
    const currentDateIso = getLocalDateString(current);
    if (dateIso < currentDateIso) return true;
    if (dateIso === currentDateIso) {
      const currentHour = current.getHours();
      const currentMinute = current.getMinutes();
      return hour < currentHour || (hour === currentHour && currentMinute > 0);
    }
    return false;
  };

  const calculateSlotCost = () => {
    const base = venue.base_hourly_fee;
    if (discountPercent > 0) {
      return Math.round(base * (1 - discountPercent / 100));
    }
    return base;
  };

  const slotCost = calculateSlotCost();
  const currentMember = s.members.find((m) => m.member_id === s.currentMemberId);
  const insufficientFunds = paymentMethod === "Wallet" && (currentMember?.wallet_balance ?? 0) < slotCost;

  // Check if slot is booked on selectedDate
  const isSlotBooked = (startIso: string, endIso: string) => {
    return s.bookings.some((b) => {
      if (b.venue_id !== venue.venue_id) return false;
      const bStart = b.start_time;
      const bEnd = b.end_time;
      return (startIso < bEnd && endIso > bStart);
    });
  };

  const handleSlotClick = (hour: number) => {
    if (isSlotInPast(selectedDate, hour)) {
      toast.error("Cannot book past time slots. Please select an upcoming slot.");
      return;
    }

    if (isNonMember) {
      s.triggerUpgradeModal("Venue Slot Booking");
      return;
    }

    const startH = String(hour).padStart(2, "0") + ":00";
    const endH = String(hour + 1).padStart(2, "0") + ":00";
    const startIso = `${selectedDate}T${startH}`;
    const endIso = `${selectedDate}T${endH}`;

    if (isSlotBooked(startIso, endIso)) {
      toast.error("This slot is already booked.");
      return;
    }

    setSelectedSlot({ start: startIso, end: endIso });
  };

  const handleConfirmBooking = async () => {
    if (!selectedSlot) return;

    if (insufficientFunds) {
      toast.error(`Insufficient wallet balance. Required: ${money(slotCost)}, Balance: ${money(currentMember?.wallet_balance ?? 0)}`);
      return;
    }

    const status = paymentMethod === "Cash" ? "Pending" : "Paid";

    const result = await s.addBooking(
      {
        venue_id: venue.venue_id,
        member_id: s.currentMemberId,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        total_cost: slotCost,
      },
      {
        payment_method: paymentMethod,
        payment_status: status,
        payment_date: selectedDate,
      }
    );

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(`Booked ${venue.venue_name}!`, {
      description: `${selectedSlot.start.slice(11, 16)} – ${selectedSlot.end.slice(11, 16)} · Total: ${money(slotCost)} (${status})`,
    });

    setSelectedSlot(null);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold font-display">
                {venue.venue_name} — Schedule & Time Slots
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {isNonMember
                  ? "Browsing venue availability in read-only mode."
                  : `Select any available 1-hour slot to complete your reservation. Tier discount: ${discountPercent}% off.`}
              </DialogDescription>
            </div>
            <StatusBadge value={venue.status} />
          </div>

          {/* DAY SELECTOR TABS */}
          <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {days.map((d) => {
              const active = d.dateIso === selectedDate;
              return (
                <button
                  key={d.dateIso}
                  type="button"
                  onClick={() => {
                    setSelectedDate(d.dateIso);
                    setSelectedSlot(null);
                  }}
                  className={`flex flex-col items-center rounded-lg px-3 py-2 text-xs font-medium transition-all shrink-0 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "bg-card border hover:bg-accent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-[10px] uppercase tracking-wide opacity-80">{d.dayName}</span>
                  <span className="text-sm font-bold">{d.formatted}</span>
                </button>
              );
            })}
          </div>
        </DialogHeader>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {/* Slot Grid Legend */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-emerald-500/20 border border-emerald-500" />
                Available ({money(slotCost)}/hr)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-muted border border-border" />
                Booked
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-3 rounded-full bg-muted/60 border border-muted-foreground/30" />
                Past Slot
              </span>
              {venue.status === "Under Maintenance" && (
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-full bg-amber-500/30 border border-amber-500" />
                  Maintenance
                </span>
              )}
            </div>
          </div>

          {/* 1-Hour Time Slots Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {hours.map((hour) => {
              const startH = String(hour).padStart(2, "0") + ":00";
              const endH = String(hour + 1).padStart(2, "0") + ":00";
              const startIso = `${selectedDate}T${startH}`;
              const endIso = `${selectedDate}T${endH}`;

              const booked = isSlotBooked(startIso, endIso);
              const maintenance = venue.status === "Under Maintenance";
              const past = isSlotInPast(selectedDate, hour);
              const isSelected = selectedSlot?.start === startIso;

              return (
                <button
                  key={hour}
                  type="button"
                  disabled={booked || maintenance || past}
                  onClick={() => handleSlotClick(hour)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary font-bold shadow-xs"
                      : past
                      ? "bg-muted/30 border-dashed text-muted-foreground/60 cursor-not-allowed opacity-50"
                      : booked
                      ? "bg-muted/40 border-dashed text-muted-foreground cursor-not-allowed opacity-60"
                      : maintenance
                      ? "bg-amber-500/10 border-amber-300 text-amber-800 cursor-not-allowed"
                      : "bg-card hover:border-emerald-500 hover:bg-emerald-50/50 cursor-pointer shadow-xs"
                  }`}
                >
                  <span className="text-xs font-semibold">
                    {startH} – {endH}
                  </span>
                  <span className="text-[11px] mt-1">
                    {past ? (
                      <span className="text-muted-foreground font-medium">Past Slot</span>
                    ) : booked ? (
                      <span className="text-muted-foreground">Booked</span>
                    ) : maintenance ? (
                      <span className="text-amber-700">Maintenance</span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">{money(slotCost)}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Booking Confirmation Section when slot is selected by a member */}
          {selectedSlot && (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Check className="size-4 text-emerald-600" />
                Confirm Booking for {selectedSlot.start.slice(11, 16)} – {selectedSlot.end.slice(11, 16)}
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-semibold">{selectedDate}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-semibold">1 Hour</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tier Discount</p>
                  <p className="font-semibold text-emerald-700">
                    {discountPercent > 0 ? `${discountPercent}% Off` : "Standard Rate"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Fee</p>
                  <p className="font-bold text-base font-display">{money(slotCost)}</p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[180px]">
                  <Label className="text-xs">Payment Method</Label>
                  <NativeSelect
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="text-xs h-8 mt-1"
                  >
                    {["Wallet", "Card", "UPI", "Cash"].map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                {paymentMethod === "Wallet" && (
                  <div className="text-xs text-muted-foreground pt-4">
                    Balance: <span className="font-semibold">{money(currentMember?.wallet_balance ?? 0)}</span>
                    {insufficientFunds && <span className="text-destructive block">Insufficient funds</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-muted/20">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {selectedSlot && (
            <Button onClick={handleConfirmBooking} disabled={insufficientFunds}>
              Confirm & Book Slot ({money(slotCost)})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
