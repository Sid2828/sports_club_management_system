import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, type ReactNode } from "react";
import { Bell, Boxes, LayoutDashboard, MapPin, Search, Trophy, Users, Wrench } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, SidebarInset,
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useStore, type Role } from "@/lib/store";
import { roleLayout } from "@/lib/role-layout";

const nav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Venues & Booking", url: "/venues", icon: MapPin },
  { title: "Members", url: "/members", icon: Users },
  { title: "Equipment", url: "/equipment", icon: Boxes },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
] as const;

function AppSidebar() {
  const { role } = useStore();
  const items = role === "admin" ? [nav[0], nav[2], nav[1], nav[3], nav[4]] : nav;
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = (u: string) => (u === "/" ? path === "/" : path.startsWith(u));
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-1 py-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground"><Trophy className="size-4" /></div>
          <div className="leading-tight group-data-[collapsible=icon]:hidden">
            <p className="font-display text-sm font-semibold text-sidebar-accent-foreground">ArenaOne</p>
            <p className="text-xs text-sidebar-foreground/70">Club & Facilities</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={active(i.url)} tooltip={i.title}>
                    <Link to={i.url}><i.icon /><span>{i.url === "/members" ? role === "admin" ? "Member Directory" : "My Profile" : i.title}</span></Link>
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
  const { role, setRole, members, currentMemberId, activity } = useStore();
  const navigate = useNavigate();
  const initialPath = useRouterState({ select: (r) => r.location.pathname });
  const enteredPortal = useRef(false);
  useEffect(() => {
    if (enteredPortal.current) return;
    enteredPortal.current = true;
    if (initialPath === "/" && role === "admin") {
      void navigate({ to: roleLayout(role).entryRoute, replace: true });
    }
  }, [initialPath, role, navigate]);
  const me = members.find((m) => m.member_id === currentMemberId);
  const name = role === "admin" ? "Dana Lopez" : me?.member_name ?? "Member";
  const changeRole = (value: string) => {
    if (value !== "member" && value !== "admin") return;
    const next: Role = value;
    setRole(next);
    void navigate({ to: roleLayout(next).entryRoute });
  };
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card/90 px-3 backdrop-blur md:px-5">
          <SidebarTrigger />
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input placeholder="Search members, venues, assets…" className="pl-8" />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ToggleGroup type="single" variant="outline" size="sm" value={role} onValueChange={changeRole}>
              <ToggleGroupItem value="member">Member</ToggleGroupItem>
              <ToggleGroupItem value="admin">Admin</ToggleGroupItem>
            </ToggleGroup>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="size-4" /><span className="absolute right-2 top-2 size-2 rounded-full bg-destructive" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {activity.slice(0, 5).map((a) => <DropdownMenuItem key={a.id} className="text-xs">{a.text}</DropdownMenuItem>)}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="flex items-center gap-2">
              <Avatar className="size-8"><AvatarFallback className="bg-primary text-xs text-primary-foreground">{name.split(" ").map((p) => p[0]).join("")}</AvatarFallback></Avatar>
              <div className="hidden text-xs leading-tight lg:block"><p className="font-medium">{name}</p><p className="text-muted-foreground">{role === "admin" ? "Facility Admin" : `${me?.tier ?? "Club"} Member`}</p></div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
