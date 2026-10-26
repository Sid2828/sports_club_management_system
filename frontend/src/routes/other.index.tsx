import { createFileRoute, Link } from "@tanstack/react-router";
import { Boxes, MapPin, Crown, ArrowRight, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/status-badge";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/other/")({
  head: () => ({
    meta: [
      { title: "ArenaOne Sports Club — Guest Catalog" },
      { name: "description", content: "Explore ArenaOne sports club facilities, equipment, and membership options." },
    ],
  }),
  component: OtherIndex,
});

function OtherIndex() {
  const s = useStore();
  const q = s.searchQuery.trim().toLowerCase();

  const filteredVenues = s.venues.filter((v) => {
    if (!q) return true;
    return v.venue_name.toLowerCase().includes(q) || v.venue_type.toLowerCase().includes(q);
  });

  const filteredGear = s.equipment.filter((e) => {
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Guest Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-600 via-primary to-emerald-700 p-6 md:p-8 text-white shadow-card">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-xs mb-3">
            <Sparkles className="size-3.5" />
            Guest Catalog View (Read-Only)
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Welcome to ArenaOne Sports Club
          </h1>
          <p className="mt-2 text-sm text-white/90 leading-relaxed">
            Browse our world-class venues, day-wise schedules, and sports equipment catalog. Ready to play?
            Subscribe to a membership plan for court reservations and equipment loans.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              asChild
              className="bg-white text-slate-900 hover:bg-white/90 font-semibold shadow-xs"
            >
              <Link to="/other/plans">
                Explore Membership Plans
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-white/40 text-white hover:bg-white/10"
            >
              <Link to="/other/venues">
                Browse Venues
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <PageHeader
        title="Guest Catalog"
        subtitle="Explore active club facilities and available equipment"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Venues Card */}
        <Card className="shadow-card border hover:border-primary/50 transition-all flex flex-col justify-between">
          <CardHeader>
            <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary mb-2">
              <MapPin className="size-5" />
            </div>
            <CardTitle className="text-lg">Facilities & Time Slots</CardTitle>
            <CardDescription className="text-xs">
              View day-wise schedules, court availability, and hourly rates across {filteredVenues.length} club venues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• Tennis, Badminton, Squash, Swimming, Football, and Cricket nets.</p>
            <p>• Day-wise 06:00 to 22:00 scheduling slot grid.</p>
            <p>• Real-time availability indicator.</p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button asChild className="w-full">
              <Link to="/other/venues">
                View Venue Schedules
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Equipment Card */}
        <Card className="shadow-card border hover:border-primary/50 transition-all flex flex-col justify-between">
          <CardHeader>
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 mb-2">
              <Boxes className="size-5" />
            </div>
            <CardTitle className="text-lg">Equipment Catalog</CardTitle>
            <CardDescription className="text-xs">
              Browse {filteredGear.length} sports gear items with daily rental rates and stock availability.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>• Pro racquets, balls, kits, machines, and fitness gear.</p>
            <p>• Daily rates and tier discount comparisons (30% Gold, 50% Platinum).</p>
            <p>• Clean Borrow action buttons for instant checkout or upgrade.</p>
          </CardContent>
          <div className="p-6 pt-0">
            <Button asChild variant="outline" className="w-full border-amber-300 hover:bg-amber-50">
              <Link to="/other/equipment">
                Browse Equipment Catalog
                <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
