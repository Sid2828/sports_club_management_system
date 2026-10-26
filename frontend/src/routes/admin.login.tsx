import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ArrowLeft, Lock, Mail, User, Phone } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/admin/login")({
  head: () => ({
    meta: [
      { title: "Facility Admin Sign-In — ArenaOne Sports Club" },
      { name: "description", content: "Sign in with administrator credentials for club facility management and operations." },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const { login } = useStore();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim()) {
      toast.error("Please enter your admin username.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Please enter your admin phone number.");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your admin password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password.trim(),
        role: "admin",
      });

      setIsSubmitting(false);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Welcome, Facility Admin ${username.trim()}!`, {
        description: "Admin portal unlocked: facility operations, inventory controls, and maintenance board.",
      });

      void navigate({ to: "/admin" });
    } catch {
      setIsSubmitting(false);
      toast.error("Authentication failed. Please verify credentials.");
    }
  };

  return (
    <div className="mx-auto max-w-md py-10 px-4">
      <Link
        to="/login"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Portal Selection
      </Link>

      <Card className="border-2 border-sidebar-primary/40 shadow-card">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-700 mb-2">
            <ShieldCheck className="size-6" />
          </div>
          <CardTitle className="text-xl font-bold font-display">Facility Admin Sign-In</CardTitle>
          <CardDescription className="text-xs">
            Enter administrator credentials to access facility operations & inventory.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="admin-username">Admin Username</Label>
              <div className="relative">
                <User className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="admin-username"
                  placeholder="e.g. admin or Dana Lopez"
                  className="pl-8"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@clubmail.com"
                  className="pl-8"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="admin-phone"
                  type="tel"
                  placeholder="+91 9888877771"
                  className="pl-8"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-8"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-indigo-700 hover:bg-indigo-800 text-white"
            >
              Sign In as Admin
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
          <p>
            Visiting as a guest?{" "}
            <Link to="/other" className="text-primary font-semibold hover:underline">
              Continue to Guest View
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
