import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, Crown, Sparkles, X, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore, money } from "@/lib/store";

export function UpgradeModal() {
  const { upgradeModalOpen, setUpgradeModalOpen, upgradeModalAction, upgradeMembership } = useStore();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const handleUpgrade = (tier: "Gold" | "Platinum") => {
    upgradeMembership(tier, billingCycle);
    setUpgradeModalOpen(false);
    toast.success(`Welcome to ${tier} Membership!`, {
      description: `Your account is now upgraded. You can now book venues and check out equipment with exclusive discounts.`,
    });
  };

  return (
    <Dialog open={upgradeModalOpen} onOpenChange={setUpgradeModalOpen}>
      <DialogContent className="max-w-2xl overflow-hidden p-0 sm:rounded-2xl">
        <div className="bg-gradient-to-r from-amber-500/15 via-primary/10 to-emerald-500/15 p-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-amber-500 text-amber-950 shadow-md">
              <Crown className="size-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
                Membership Required
                <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                  Guest / Non-Member
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-sm mt-0.5 text-muted-foreground">
                {upgradeModalAction 
                  ? `${upgradeModalAction} is exclusive to club members.`
                  : "Non-members can browse the catalog and venue schedules in read-only mode."}
                {" "}Unlock full club privileges by choosing a plan below.
              </DialogDescription>
            </div>
          </div>

          {/* Billing Cycle Switcher */}
          <div className="mt-4 flex items-center justify-center">
            <div className="inline-flex rounded-lg bg-card p-1 border shadow-xs">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  billingCycle === "monthly"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  billingCycle === "yearly"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Annual Billing
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-700">
                  Save ~17%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 p-6 sm:grid-cols-2">
          {/* Gold Plan Card */}
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-amber-500/40 bg-card p-5 shadow-xs hover:border-amber-500 transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">Gold Tier</h3>
                  <p className="text-xs text-muted-foreground">Active sports enthusiasts</p>
                </div>
                <Badge className="bg-amber-500/20 text-amber-900 border-amber-300">Popular</Badge>
              </div>

              <div>
                <p className="font-display text-2xl font-bold">
                  {billingCycle === "monthly" ? "₹2,000" : "₹20,000"}
                  <span className="text-xs font-normal text-muted-foreground">
                    {billingCycle === "monthly" ? " / month" : " / year"}
                  </span>
                </p>
                {billingCycle === "yearly" && (
                  <p className="text-xs font-medium text-emerald-600">Save ₹4,000 / year</p>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 rounded-md bg-amber-50/70 p-2 text-amber-900 font-medium">
                  <Sparkles className="size-4 shrink-0 text-amber-600" />
                  <span>30% Equipment & 10% Venue Discount</span>
                </div>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    Priority booking window (7 days ahead)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    Standard locker room access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    2 guest day passes per month
                  </li>
                </ul>
              </div>
            </div>

            <Button
              className="mt-5 w-full bg-amber-600 hover:bg-amber-700 text-white font-medium"
              onClick={() => handleUpgrade("Gold")}
            >
              Select Gold Plan
            </Button>
          </div>

          {/* Platinum Plan Card */}
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-primary/50 bg-card p-5 shadow-xs hover:border-primary transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">Platinum Tier</h3>
                  <p className="text-xs text-muted-foreground">VIP all-inclusive access</p>
                </div>
                <Badge className="bg-primary/20 text-primary border-primary/30">VIP</Badge>
              </div>

              <div>
                <p className="font-display text-2xl font-bold">
                  {billingCycle === "monthly" ? "₹3,000" : "₹30,000"}
                  <span className="text-xs font-normal text-muted-foreground">
                    {billingCycle === "monthly" ? " / month" : " / year"}
                  </span>
                </p>
                {billingCycle === "yearly" && (
                  <p className="text-xs font-medium text-emerald-600">Save ₹6,000 / year</p>
                )}
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 rounded-md bg-primary/10 p-2 text-primary font-medium">
                  <Sparkles className="size-4 shrink-0 text-primary" />
                  <span>50% Equipment & 20% Venue Discount</span>
                </div>
                <ul className="space-y-1.5 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    Priority booking window (14 days ahead)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    4 free court hours included monthly
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    Full sauna, wellness & lounge access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-emerald-600" />
                    Unlimited guest day passes
                  </li>
                </ul>
              </div>
            </div>

            <Button
              className="mt-5 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
              onClick={() => handleUpgrade("Platinum")}
            >
              Select Platinum Plan
            </Button>
          </div>
        </div>

        <div className="border-t bg-muted/40 p-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>Cancel or switch tiers anytime. Instant activation.</span>
          <Link
            to="/plans"
            onClick={() => setUpgradeModalOpen(false)}
            className="text-primary font-medium hover:underline"
          >
            Compare detailed benefits →
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
