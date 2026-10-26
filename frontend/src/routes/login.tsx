import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ShieldCheck, UserCheck, Eye, Trophy, Check, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Select Portal — ArenaOne Sports Club" },
      { name: "description", content: "Select your portal to sign in as Member, Admin or Continue without Sign In as Guest." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { setRole, setCurrentMemberId, setIsAuthenticated, setUsername, setEmail } = useStore();
  const navigate = useNavigate();

  const handleGuestContinue = () => {
    setRole("non_member");
    setIsAuthenticated(false);
    setUsername("Guest Visitor");
    setEmail("");
    setCurrentMemberId("M000");
    void navigate({ to: "/other" });
  };

  return (
    <div className="mx-auto max-w-4xl py-6">
      <div className="mb-8 text-center">
        <div className="inline-grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md mb-3">
          <Trophy className="size-6" />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          Sign In to ArenaOne
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Select your portal to sign in or continue to facility browsing.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Role Option 1: Member */}
        <Card className="flex flex-col justify-between border-2 border-primary/40 shadow-card hover:border-primary transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <UserCheck className="size-5" />
              </div>
              <Badge className="bg-primary/15 text-primary border-primary/20">Full Access</Badge>
            </div>
            <CardTitle className="mt-3 text-lg">Member Sign-In</CardTitle>
            <CardDescription className="text-xs">
              For active Gold and Platinum club members.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-emerald-600 shrink-0" />
              <span>Book courts & venue slots</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-emerald-600 shrink-0" />
              <span>Check out sports equipment</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-emerald-600 shrink-0" />
              <span>Up to 50% gear & 20% venue discount</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              className="w-full"
              onClick={() => navigate({ to: "/member/login" })}
            >
              Sign In as Member
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>

        {/* Role Option 2: Admin */}
        <Card className="flex flex-col justify-between border-2 border-sidebar-primary/40 shadow-card hover:border-sidebar-primary transition-all">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-indigo-50 text-indigo-700">
                <ShieldCheck className="size-5" />
              </div>
              <Badge variant="secondary">Admin Portal</Badge>
            </div>
            <CardTitle className="mt-3 text-lg">Admin Sign-In</CardTitle>
            <CardDescription className="text-xs">
              For club managers & facility supervisors.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-indigo-600 shrink-0" />
              <span>Manage venue status & pricing</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-indigo-600 shrink-0" />
              <span>Inventory controls (Add/Remove Gear)</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-indigo-600 shrink-0" />
              <span>Maintenance schedule & operations</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              className="w-full border-indigo-200 hover:bg-indigo-50 hover:text-indigo-900"
              onClick={() => navigate({ to: "/admin/login" })}
            >
              Sign In as Admin
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>

        {/* Role Option 3: Non-Member Guest */}
        <Card className="flex flex-col justify-between border-2 border-amber-300 shadow-card hover:border-amber-500 transition-all bg-amber-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800">
                <Eye className="size-5" />
              </div>
              <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300">
                Read-Only
              </Badge>
            </div>
            <CardTitle className="mt-3 text-lg">Guest View</CardTitle>
            <CardDescription className="text-xs">
              For prospective members & visiting guests.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-amber-600 shrink-0" />
              <span>Browse equipment catalog & prices</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="size-4 text-amber-600 shrink-0" />
              <span>View venue day-wise schedules</span>
            </div>
            <div className="flex items-center gap-2 text-amber-800 font-medium">
              <Check className="size-4 shrink-0 text-amber-600" />
              <span>Explore Gold & Platinum plans</span>
            </div>
          </CardContent>
          <CardFooter className="pt-2">
            <Button
              variant="outline"
              className="w-full border-amber-400 bg-amber-100/60 hover:bg-amber-100 text-amber-950 font-semibold"
              onClick={handleGuestContinue}
            >
              Continue without Sign In
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
