import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Boxes,
  Crown,
  LayoutDashboard,
  LogIn,
  LogOut,
  MapPin,
  Search,
  Sparkles,
  Trophy,
  User,
  Users,
  Wrench,
  ChevronDown,
  Shield,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useStore } from "@/lib/store";

function AppSidebar() {
  const { role, isAuthenticated } = useStore();
  const path = useRouterState({ select: (r) => r.location.pathname });

  // Navigation items strictly governed by active role
  const items =
    role === "admin"
      ? [
          { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
          { title: "Member Directory", url: "/admin/members", icon: Users },
          { title: "Venues & Booking", url: "/admin/venues", icon: MapPin },
          { title: "Equipment", url: "/admin/equipment", icon: Boxes },
          { title: "Maintenance", url: "/admin/maintenance", icon: Wrench },
        ]
      : role === "member"
      ? [
          { title: "Dashboard", url: "/member", icon: LayoutDashboard },
          { title: "Venues & Booking", url: "/member/venues", icon: MapPin },
          { title: "Equipment", url: "/member/equipment", icon: Boxes },
          { title: "Maintenance", url: "/member/maintenance", icon: Wrench },
          { title: "Membership Tiers", url: "/member/plans", icon: Crown },
          { title: "My Profile", url: "/member/members", icon: User },
        ]
      : [
          { title: "Catalog Home", url: "/other", icon: LayoutDashboard },
          { title: "Venues & Schedule", url: "/other/venues", icon: MapPin },
          { title: "Equipment Catalog", url: "/other/equipment", icon: Boxes },
          { title: "Membership Plans", url: "/other/plans", icon: Crown },
        ];

  const active = (u: string) => {
    if (u === "/admin" || u === "/member" || u === "/other") {
      return path === u;
    }
    return path === u || path.startsWith(`${u}/`);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground shadow-xs">
            <Trophy className="size-4" />
          </div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">ArenaOne</p>
            <p className="text-xs text-sidebar-foreground/70">Club & Facilities</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {role === "admin" ? "Admin Operations" : role === "member" ? "Member Portal" : "Guest Catalog"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={active(i.url)} tooltip={i.title}>
                    <Link to={i.url}>
                      <i.icon className="size-4" />
                      <span>{i.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const {
    role,
    username,
    email,
    phone,
    isAuthenticated,
    logout,
    members,
    currentMemberId,
    setUpgradeModalOpen,
    searchQuery,
    setSearchQuery,
  } = useStore();

  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  // Route protection strictly governed by user's logged-in role
  useEffect(() => {
    if (path.startsWith("/admin") && path !== "/admin/login") {
      if (!isAuthenticated || role !== "admin") {
        toast.error("Admin authentication required.");
        void navigate({ to: "/admin/login", replace: true });
      }
    } else if (path.startsWith("/member") && path !== "/member/login") {
      if (!isAuthenticated || role !== "member") {
        toast.error("Member sign-in required.");
        void navigate({ to: "/member/login", replace: true });
      }
    }
  }, [path, isAuthenticated, role, navigate]);

  const me = members.find((m) => m.member_id === currentMemberId);

  // Prominently display captured username
  const displayName =
    username.trim() ||
    (role === "admin"
      ? "Dana Lopez"
      : role === "non_member"
      ? "Guest Visitor"
      : me?.member_name ?? "Member");

  const displayEmail =
    email.trim() ||
    (role === "admin"
      ? "dana.admin@arenaone.club"
      : role === "non_member"
      ? "guest@arenaone.com"
      : me?.email ?? "member@clubmail.com");

  const displayPhone = phone.trim() || me?.phone || "";

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    toast.info("Signed out successfully.", {
      description: "Session data cleared. Returned to portal selection.",
    });
    void navigate({ to: "/login" });
  };

  const isLoginPage = path === "/login" || path === "/member/login" || path === "/admin/login";

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-3 backdrop-blur md:px-5">
          <SidebarTrigger />

          {/* Dynamic Global Top Search Bar */}
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              placeholder="Search members, venues, assets…"
              className="pl-8 pr-7"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                title="Clear search"
              >
                ✕
              </button>
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            {/* Non-Member Upgrade Callout Button */}
            {role === "non_member" && (
              <Button
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold gap-1.5 shadow-xs text-xs"
                onClick={() => setUpgradeModalOpen(true)}
              >
                <Sparkles className="size-3.5 fill-current" />
                Upgrade to Member
              </Button>
            )}

            {/* If on a login page and not authenticated, offer Portal Home link */}
            {isLoginPage && !isAuthenticated ? (
              <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
                <Link to="/login">
                  <LogIn className="size-3.5" />
                  <span>Portal Home</span>
                </Link>
              </Button>
            ) : null}

            {/* User Profile Avatar Area with prominent Username and Active Role Badge */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-accent/60 transition-colors focus:outline-hidden"
                >
                  <Avatar className="size-8 ring-1 ring-border shrink-0">
                    <AvatarFallback className="bg-primary text-xs text-primary-foreground font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left leading-tight sm:block">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs text-foreground max-w-[120px] truncate">
                        {displayName}
                      </span>
                      {role === "admin" ? (
                        <Badge className="bg-indigo-600 text-white font-medium text-[10px] px-1.5 py-0">
                          Admin
                        </Badge>
                      ) : role === "non_member" ? (
                        <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10px] px-1.5 py-0">
                          Guest
                        </Badge>
                      ) : (
                        <Badge className="bg-primary text-primary-foreground font-medium text-[10px] px-1.5 py-0">
                          {me?.tier ?? "Gold"} Member
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                      {displayEmail}
                    </p>
                  </div>
                  <ChevronDown className="size-3.5 text-muted-foreground hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-semibold leading-none">{displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground">{displayEmail}</p>
                    {displayPhone ? (
                      <p className="text-xs leading-none text-muted-foreground">{displayPhone}</p>
                    ) : null}
                    <div className="pt-1.5">
                      {role === "admin" ? (
                        <Badge className="bg-indigo-600 text-white font-medium text-[10px]">
                          Facility Administrator
                        </Badge>
                      ) : role === "non_member" ? (
                        <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-900 text-[10px]">
                          Guest (Read-Only)
                        </Badge>
                      ) : (
                        <Badge className="bg-primary text-primary-foreground font-medium text-[10px]">
                          {me?.tier ?? "Gold"} Member ({currentMemberId})
                        </Badge>
                      )}
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {role === "member" && (
                  <DropdownMenuItem asChild>
                    <Link to="/member/members" className="cursor-pointer">
                      <User className="size-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                )}
                {role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link to="/admin/members" className="cursor-pointer">
                      <Shield className="size-4 mr-2" />
                      Member Directory
                    </Link>
                  </DropdownMenuItem>
                )}
                {role === "non_member" && (
                  <DropdownMenuItem asChild>
                    <Link to="/other/plans" className="cursor-pointer text-amber-800 font-medium">
                      <Sparkles className="size-4 mr-2 text-amber-600" />
                      Upgrade to Membership
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
                >
                  <LogOut className="size-4 mr-2" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
