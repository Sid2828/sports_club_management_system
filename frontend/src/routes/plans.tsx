import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Check, Crown, Sparkles, Trophy, ArrowRight, User, Mail, Lock, CreditCard, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { PageHeader } from "@/components/status-badge";
import { useStore, money } from "@/lib/store";

export const Route = createFileRoute("/plans")({
  head: () => ({
    meta: [
      { title: "Membership Tiers & Plans — ArenaOne Sports Club" },
      { name: "description", content: "Explore Gold and Platinum membership plans with exclusive equipment and venue discounts." },
    ],
  }),
  component: PlansPage,
});

export function PlansPage() {
  const s = useStore();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Non-member sign-up & payment dialog states
  const [purchaseTier, setPurchaseTier] = useState<"Gold" | "Platinum" | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const me = s.members.find((m) => m.member_id === s.currentMemberId);
  const currentTier = s.role === "non_member" ? "None" : me?.tier ?? "None";

  const handlePlanSelect = (tier: "Gold" | "Platinum") => {
    if (s.role === "non_member" || !s.isAuthenticated) {
      // Non-member flow: prompt sign-up details & simulated fee payment
      setPurchaseTier(tier);
      setUsername(s.username && s.username !== "Guest Visitor" ? s.username : "");
      setEmail(s.email || "");
      setPhone(s.phone || "");
      setPassword("");
    } else {
      // Already logged-in member: update their membership plan
      s.upgradeMembership(tier, billingCycle);
      toast.success(`Successfully Switched to ${tier} Membership!`, {
        description: `Plan activated under ${billingCycle} billing.`,
      });
      void navigate({ to: "/member/venues" });
    }
  };

  const handleSignUpAndPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseTier) return;

    if (!username.trim()) {
      toast.error("Please enter a username.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter a phone number.");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter a password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await s.registerAndSubscribe({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        tier: purchaseTier,
        billingCycle,
        paymentMethod,
      });

      setIsSubmitting(false);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setPurchaseTier(null);

      // Crucial Redirect & Toast per specification:
      // Redirect to Member Login screen (/member/login) and display success toast
      toast.success("Membership active. Please sign in.");
      void navigate({ to: "/member/login" });
    } catch (err: unknown) {
      setIsSubmitting(false);
      const msg = err instanceof Error ? err.message : "Failed to complete membership registration.";
      toast.error(msg);
    }
  };

  const selectedPlan = s.plans.find((p) => p.plan_name === purchaseTier);
  const planFee =
    selectedPlan
      ? billingCycle === "monthly"
        ? selectedPlan.monthly_fee
        : selectedPlan.yearly_fee
      : 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Club Membership Tiers"
        subtitle="Unlock venue bookings, equipment loans, and club privileges"
      >
        {/* Billing Switcher */}
        <div className="inline-flex rounded-lg bg-card p-1 border shadow-xs">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
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
            className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-semibold transition-all ${
              billingCycle === "yearly"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Annual Billing
            <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
              Save Up to ₹6,000
            </span>
          </button>
        </div>
      </PageHeader>

      {/* Non-Member Banner */}
      {s.role === "non_member" && (
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-amber-500 text-amber-950 font-bold shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div>
              <p className="font-semibold">You are currently browsing as a Non-Member</p>
              <p className="text-xs text-amber-800">
                Choose a plan below to create your account, complete fee payment, and access full member privileges.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tiers Grid */}
      {s.plans.length === 0 && (
        <p className="mb-6 text-sm text-muted-foreground">Membership plans will appear once the club database is connected.</p>
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {/* GOLD TIER */}
        <Card
          className={`relative flex flex-col justify-between border-2 shadow-card transition-all ${
            currentTier === "Gold"
              ? "border-amber-500 ring-2 ring-amber-500/30"
              : "border-amber-400/50 hover:border-amber-500"
          }`}
        >
          <div>
            <div className="bg-gradient-to-br from-amber-500/20 via-amber-500/5 to-transparent p-6 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-amber-500/20 text-amber-900 border-amber-300 font-semibold mb-2">
                    Most Popular
                  </Badge>
                  <h2 className="font-display text-2xl font-bold text-foreground">Gold Membership</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Ideal for dedicated amateur athletes & regular players
                  </p>
                </div>
                <div className="grid size-12 place-items-center rounded-xl bg-amber-500 text-amber-950 shadow-xs">
                  <Crown className="size-6" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-foreground">
                    {money(s.plans.find((p) => p.plan_name === "Gold")?.[billingCycle === "monthly" ? "monthly_fee" : "yearly_fee"] ?? 0)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {billingCycle === "monthly" ? " / month" : " / year"}
                  </span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="mt-1 text-xs font-semibold text-emerald-600">
                    Saves ₹4,000 compared to monthly billing
                  </p>
                )}
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-amber-50/80 p-2.5 border border-amber-200">
                  <p className="font-display text-xl font-bold text-amber-900">{s.plans.find((p) => p.plan_name === "Gold")?.equipment_discount ?? 0}% OFF</p>
                  <p className="text-[11px] text-amber-700 font-medium">Equipment Loans</p>
                </div>
                <div className="rounded-lg bg-amber-50/80 p-2.5 border border-amber-200">
                  <p className="font-display text-xl font-bold text-amber-900">{s.plans.find((p) => p.plan_name === "Gold")?.venue_discount ?? 0}% OFF</p>
                  <p className="text-[11px] text-amber-700 font-medium">Venue Bookings</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plan Inclusions
                </p>
                <ul className="space-y-2 text-sm text-foreground/90">
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>30% equipment discount on all sports gear</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>10% discount on all courts and fields</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Priority booking window (7 days in advance)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Standard locker room & shower access</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>2 guest day passes per month</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </div>

          <CardFooter className="p-6 pt-0">
            {currentTier === "Gold" ? (
              <Button disabled className="w-full bg-muted text-muted-foreground">
                Current Active Plan
              </Button>
            ) : (
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                onClick={() => handlePlanSelect("Gold")}
              >
                {s.role === "non_member" ? "Purchase Gold Plan" : "Switch to Gold"}
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            )}
          </CardFooter>
        </Card>

        {/* PLATINUM TIER */}
        <Card
          className={`relative flex flex-col justify-between border-2 shadow-card transition-all ${
            currentTier === "Platinum"
              ? "border-primary ring-2 ring-primary/30"
              : "border-primary/50 hover:border-primary"
          }`}
        >
          <div>
            <div className="bg-gradient-to-br from-primary/20 via-primary/5 to-transparent p-6 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-semibold mb-2">
                    VIP Elite
                  </Badge>
                  <h2 className="font-display text-2xl font-bold text-foreground">Platinum Membership</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    All-inclusive premium privileges for competitive athletes
                  </p>
                </div>
                <div className="grid size-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                  <Trophy className="size-6" />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-extrabold text-foreground">
                    {money(s.plans.find((p) => p.plan_name === "Platinum")?.[billingCycle === "monthly" ? "monthly_fee" : "yearly_fee"] ?? 0)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    {billingCycle === "monthly" ? " / month" : " / year"}
                  </span>
                </div>
                {billingCycle === "yearly" && (
                  <p className="mt-1 text-xs font-semibold text-emerald-600">
                    Saves ₹6,000 compared to monthly billing
                  </p>
                )}
              </div>
            </div>

            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="rounded-lg bg-primary/10 p-2.5 border border-primary/20">
                  <p className="font-display text-xl font-bold text-primary">{s.plans.find((p) => p.plan_name === "Platinum")?.equipment_discount ?? 0}% OFF</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Equipment Loans</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5 border border-primary/20">
                  <p className="font-display text-xl font-bold text-primary">{s.plans.find((p) => p.plan_name === "Platinum")?.venue_discount ?? 0}% OFF</p>
                  <p className="text-[11px] text-muted-foreground font-medium">Venue Bookings</p>
                </div>
              </div>

              <div className="space-y-2.5 text-sm pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Plan Inclusions
                </p>
                <ul className="space-y-2 text-sm text-foreground/90">
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>50% equipment discount on all sports gear</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>20% discount on all courts and fields</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>14-day priority booking window</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>4 free court hours included monthly</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="size-4 text-emerald-600 shrink-0" />
                    <span>Unlimited guest day passes & VIP sauna access</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </div>

          <CardFooter className="p-6 pt-0">
            {currentTier === "Platinum" ? (
              <Button disabled className="w-full bg-muted text-muted-foreground">
                Current Active Plan
              </Button>
            ) : (
              <Button
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                onClick={() => handlePlanSelect("Platinum")}
              >
                {s.role === "non_member" ? "Purchase Platinum Plan" : "Switch to Platinum"}
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* NON-MEMBER SIGN-UP & SIMULATED FEE PAYMENT DIALOG */}
      <Dialog open={Boolean(purchaseTier)} onOpenChange={(o) => !o && setPurchaseTier(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              Sign Up for {purchaseTier} Membership
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your member details and complete simulated fee payment to activate your account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSignUpAndPay} className="space-y-4 py-2">
            {/* Plan Summary Box */}
            <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected Plan:</span>
                <span className="font-semibold text-foreground">{purchaseTier} Tier ({billingCycle})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Equipment Discount:</span>
                <span className="text-emerald-700 font-semibold">{selectedPlan?.equipment_discount ?? 0}% Off</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venue Booking Discount:</span>
                <span className="text-emerald-700 font-semibold">{selectedPlan?.venue_discount ?? 0}% Off</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-foreground">
                <span>Total Fee Due:</span>
                <span className="text-primary font-display">{money(planFee)}</span>
              </div>
            </div>

            {/* Step 1: Sign-Up Details */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="signup-username">Username</Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="signup-username"
                    placeholder="e.g. John Doe"
                    className="pl-8"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="john.doe@example.com"
                    className="pl-8"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+91 9820011223"
                    className="pl-8"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-8"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Simulated Payment */}
            <div className="space-y-2 border-t pt-3">
              <Label htmlFor="payment-method">Payment Method (Simulated)</Label>
              <div className="relative">
                <CreditCard className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <NativeSelect
                  id="payment-method"
                  className="pl-8 text-xs"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="Card">Credit / Debit Card</option>
                  <option value="NetBanking">Net Banking</option>
                </NativeSelect>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setPurchaseTier(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-1.5">
                <Check className="size-4" />
                {isSubmitting ? "Processing Payment..." : `Pay ${money(planFee)} & Complete Sign Up`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
