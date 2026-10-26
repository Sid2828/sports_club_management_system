import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type {
  Equipment,
  EquipmentIssue,
  Member,
  MembershipPlan,
  MaintenanceRequest,
  Payment,
  PaymentMethod,
  RequestStatus,
  Sport,
  Venue,
  VenueBooking,
  VenueStatus,
} from "@/lib/types";
import { api, setToken } from "@/lib/api";

export type Role = "non_member" | "member" | "admin";
export interface Activity {
  id: string;
  kind: "booking" | "issue" | "maintenance" | "wallet";
  text: string;
  at: string;
}

export const money = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export type AuthResult = { ok: true } | { ok: false; status: number; message: string };

function getInitialSession(): {
  role: Role;
  username: string;
  email: string;
  phone: string;
  isAuthenticated: boolean;
  currentMemberId: string;
} {
  if (typeof window !== "undefined") {
    try {
      const saved = localStorage.getItem("arenaone_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          role: parsed.role || "non_member",
          username: parsed.username || "",
          email: parsed.email || "",
          phone: parsed.phone || "",
          isAuthenticated: Boolean(parsed.isAuthenticated),
          currentMemberId: parsed.member_id || (parsed.role === "member" ? "M101" : "M000"),
        };
      }
    } catch {
      // ignore JSON errors
    }
  }
  return {
    role: "non_member",
    username: "",
    email: "",
    phone: "",
    isAuthenticated: false,
    currentMemberId: "M000",
  };
}

function useStoreState() {
  const initial = getInitialSession();

  const [role, setRole] = useState<Role>(initial.role);
  const [username, setUsername] = useState<string>(initial.username);
  const [email, setEmail] = useState<string>(initial.email);
  const [phone, setPhone] = useState<string>(initial.phone);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initial.isAuthenticated);
  const [currentMemberId, setCurrentMemberId] = useState(initial.currentMemberId);

  const [searchQuery, setSearchQuery] = useState("");

  const [members, setMembers] = useState<Member[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<VenueBooking[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [issues, setIssues] = useState<EquipmentIssue[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);

  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalAction, setUpgradeModalAction] = useState("");

  const triggerUpgradeModal = (actionName = "This action") => {
    setUpgradeModalAction(actionName);
    setUpgradeModalOpen(true);
  };

  const memberName = (id: string) => members.find((m) => m.member_id === id)?.member_name ?? id;
  const venueName = (id: string) => venues.find((v) => v.venue_id === id)?.venue_name ?? id;

  const getMemberDiscounts = (memberId = currentMemberId) => {
    if (role === "non_member") return { equipment: 0, venue: 0 };
    const m = members.find((x) => x.member_id === memberId);
    if (!m) return { equipment: 0, venue: 0 };
    const plan = plans.find((p) => p.plan_name === m.tier || p.plan_id === m.plan_id);
    if (plan) return { equipment: plan.equipment_discount, venue: plan.venue_discount };
    if (m.tier === "Platinum") return { equipment: 50, venue: 20 };
    if (m.tier === "Gold") return { equipment: 30, venue: 10 };
    return { equipment: 0, venue: 0 };
  };

  const persistSession = (session: {
    username: string;
    email: string;
    phone: string;
    role: Role;
    member_id: string;
  }) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        "arenaone_session",
        JSON.stringify({
          username: session.username,
          email: session.email,
          phone: session.phone,
          role: session.role,
          isAuthenticated: true,
          member_id: session.member_id,
        })
      );
    } catch {
      // ignore
    }
  };

  const refreshClubData = async () => {
    const [plansRes, sportsRes, venuesRes, equipmentRes, membersRes, bookingsRes, issuesRes, maintRes, activityRes, paymentsRes] =
      await Promise.all([
        api<{ plans: MembershipPlan[] }>("/api/plans"),
        api<{ sports: Sport[] }>("/api/sports"),
        api<{ venues: Venue[] }>("/api/venues"),
        api<{ equipment: Equipment[] }>("/api/equipment"),
        api<{ members: Member[] }>("/api/members"),
        api<{ bookings: VenueBooking[] }>("/api/bookings"),
        api<{ checkouts: EquipmentIssue[] }>("/api/equipment/checkouts"),
        api<{ maintenance: MaintenanceRequest[] }>("/api/maintenance"),
        api<{ activity: Activity[] }>("/api/activity"),
        api<{ payments: Payment[] }>("/api/payments"),
      ]);

    if (plansRes.ok) {
      setPlans(
        (plansRes.data.plans || []).map((p) => ({
          ...p,
          plan_id: String(p.plan_id),
          duration: p.duration || "1 Month / 1 Year",
          benefits: Array.isArray(p.benefits) ? p.benefits : [],
        }))
      );
    }
    if (sportsRes.ok) setSports(sportsRes.data.sports || []);
    if (venuesRes.ok) {
      setVenues(
        (venuesRes.data.venues || []).map((v) => ({
          ...v,
          sport_ids: v.sport_ids?.length ? v.sport_ids : ((v as Venue & { sports?: string[] }).sports || []),
          parent_venue_id: v.parent_venue_id || undefined,
        }))
      );
    }
    if (equipmentRes.ok) setEquipment(equipmentRes.data.equipment || []);
    if (membersRes.ok) setMembers(membersRes.data.members || []);
    if (bookingsRes.ok) setBookings(bookingsRes.data.bookings || []);
    if (issuesRes.ok) {
      setIssues(
        (issuesRes.data.checkouts || []).map((c) => ({
          issue_id: c.issue_id || String((c as EquipmentIssue & { checkout_id?: number }).checkout_id || ""),
          member_id: c.member_id,
          asset_id: c.asset_id,
          issue_date: String(c.issue_date || "").slice(0, 10),
          due_date: String(c.due_date || "").slice(0, 10),
          returned_date: c.returned_date ? String(c.returned_date).slice(0, 10) : undefined,
          late_fee: Number(c.late_fee || 0),
        }))
      );
    }
    if (maintRes.ok) setMaintenance(maintRes.data.maintenance || []);
    if (activityRes.ok) setActivity(activityRes.data.activity || []);
    if (paymentsRes.ok) setPayments(paymentsRes.data.payments || []);
  };

  useEffect(() => {
    void refreshClubData();
  }, []);

  const login = async (session: {
    username: string;
    email: string;
    role: Role;
    password?: string;
    phone?: string;
    member_id?: string;
  }): Promise<AuthResult> => {
    const phoneValue = (session.phone || "").trim();
    const res = await api<{ user?: { user_id: number; username: string; email: string; phone?: string; role: Role }; token?: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({
          username: session.username.trim(),
          email: session.email.trim(),
          password: session.password || "",
          role: session.role,
          phone: phoneValue,
        }),
      }
    );

    if (!res.ok || !res.data.user) {
      return {
        ok: false,
        status: res.status,
        message: res.data.message || "Invalid credentials or unauthorized.",
      };
    }

    const u = res.data.user;
    if (res.data.token) setToken(res.data.token);
    const assignedRole = u.role as Role;
    const mId = assignedRole === "member" ? session.member_id || `M${u.user_id}` : "M000";

    setUsername(u.username || session.username.trim());
    setEmail(u.email || session.email.trim());
    setPhone(phoneValue || u.phone || "");
    setRole(assignedRole);
    setIsAuthenticated(true);
    setCurrentMemberId(mId);

    persistSession({
      username: u.username || session.username.trim(),
      email: u.email || session.email.trim(),
      phone: phoneValue || u.phone || "",
      role: assignedRole,
      member_id: mId,
    });

    await refreshClubData();
    return { ok: true };
  };

  const logout = () => {
    setUsername("");
    setEmail("");
    setPhone("");
    setRole("non_member");
    setIsAuthenticated(false);
    setCurrentMemberId("M000");
    setToken(null);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("arenaone_session");
      } catch {
        // ignore
      }
    }
    void refreshClubData();
  };

  const registerAndSubscribe = async (userData: {
    username: string;
    email: string;
    phone: string;
    password?: string;
    tier: "Gold" | "Platinum";
    billingCycle?: "monthly" | "yearly";
    paymentMethod?: string;
  }): Promise<AuthResult & { member?: Member }> => {
    const res = await api<{ user?: Member & { user_id: number; name: string } }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: userData.username.trim(),
        email: userData.email.trim(),
        password: userData.password,
        phone: userData.phone.trim(),
        role: "member",
        tier: userData.tier,
        billingCycle: userData.billingCycle || "monthly",
        paymentMethod: userData.paymentMethod || "UPI",
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: res.data.message || "Registration failed. Please check your details.",
      };
    }

    await refreshClubData();
    const created = res.data.user;
    return {
      ok: true,
      member: created
        ? {
            member_id: `M${created.user_id}`,
            member_name: created.name || userData.username.trim(),
            username: userData.username.trim(),
            email: userData.email.trim(),
            phone: userData.phone.trim(),
            tier: userData.tier,
            wallet_balance: 0,
            is_delinquent: false,
            plan_id: "",
            joined: new Date().toISOString().slice(0, 10),
          }
        : undefined,
    };
  };

  const upgradeMembership = async (tier: "Gold" | "Platinum", billingCycle: "monthly" | "yearly" = "monthly") => {
    if (!isAuthenticated || role === "non_member") {
      triggerUpgradeModal("Membership Upgrade");
      return;
    }
    const res = await api("/api/subscriptions/subscribe", {
      method: "POST",
      body: JSON.stringify({ plan_name: tier, billing_cycle: billingCycle }),
    });
    if (!res.ok) return;
    setRole("member");
    await refreshClubData();
  };

  return {
    role,
    setRole,
    username,
    setUsername,
    email,
    setEmail,
    phone,
    setPhone,
    isAuthenticated,
    setIsAuthenticated,
    login,
    logout,
    registerAndSubscribe,
    refreshClubData,

    searchQuery,
    setSearchQuery,

    currentMemberId,
    setCurrentMemberId,
    members,
    venues,
    bookings,
    payments,
    equipment,
    issues,
    maintenance,
    activity,
    plans,
    sports,
    memberName,
    venueName,
    getMemberDiscounts,

    upgradeModalOpen,
    setUpgradeModalOpen,
    upgradeModalAction,
    triggerUpgradeModal,
    upgradeMembership,

    async addBooking(
      b: Omit<VenueBooking, "booking_id" | "payment_id">,
      p: Pick<Payment, "payment_method" | "payment_status" | "payment_date">
    ) {
      if (role === "non_member") {
        triggerUpgradeModal("Venue Booking");
        return { ok: false as const, message: "Membership required" };
      }
      const res = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          venue_id: b.venue_id,
          start_time: b.start_time,
          end_time: b.end_time,
          payment_method: p.payment_method,
        }),
      });
      if (!res.ok) {
        return { ok: false as const, message: res.data.message || "Booking failed" };
      }
      await refreshClubData();
      return { ok: true as const };
    },

    async topUp(member_id: string, amount: number) {
      const res = await api(`/api/members/${member_id}/wallet`, {
        method: "POST",
        body: JSON.stringify({ amount }),
      });
      if (res.ok) await refreshClubData();
      return res.ok;
    },

    async checkout(i: Omit<EquipmentIssue, "issue_id" | "late_fee">) {
      if (role === "non_member") {
        triggerUpgradeModal("Equipment Checkout");
        return { ok: false as const, message: "Membership required" };
      }
      const res = await api("/api/equipment/checkout", {
        method: "POST",
        body: JSON.stringify(i),
      });
      if (!res.ok) {
        return { ok: false as const, message: res.data.message || res.data.error || "Checkout failed" };
      }
      await refreshClubData();
      return { ok: true as const };
    },

    async returnItem(issue_id: string) {
      const res = await api(`/api/equipment/return/${issue_id}`, { method: "POST" });
      if (res.ok) await refreshClubData();
    },

    async addEquipment(e: { name: string; category: string; total_quantity: number; daily_price: number }) {
      const res = await api("/api/equipment", {
        method: "POST",
        body: JSON.stringify(e),
      });
      if (res.ok) await refreshClubData();
    },

    async removeEquipment(asset_id: string) {
      const res = await api(`/api/equipment/${asset_id}`, { method: "DELETE" });
      if (res.ok) await refreshClubData();
    },

    async setEquipmentPrice(asset_id: string, daily_price: number) {
      const res = await api(`/api/equipment/${asset_id}`, {
        method: "PUT",
        body: JSON.stringify({ daily_price }),
      });
      if (res.ok) await refreshClubData();
    },

    async addVenue(v: {
      venue_name: string;
      venue_type: string;
      base_hourly_fee: number;
      sport_ids: string[];
      parent_venue_id?: string;
    }) {
      const names = v.sport_ids.map((id) => sports.find((s) => s.sport_id === id || s.sport_name === id)?.sport_name || id);
      const res = await api("/api/venues", {
        method: "POST",
        body: JSON.stringify({
          venue_name: v.venue_name,
          venue_type: v.venue_type,
          base_hourly_fee: v.base_hourly_fee,
          sports: names,
          parent_venue_id: v.parent_venue_id || null,
        }),
      });
      if (res.ok) await refreshClubData();
    },

    async removeVenue(venue_id: string) {
      const res = await api(`/api/venues/${venue_id}`, { method: "DELETE" });
      if (res.ok) await refreshClubData();
    },

    async setVenuePrice(venue_id: string, base_hourly_fee: number) {
      const res = await api(`/api/venues/${venue_id}`, {
        method: "PUT",
        body: JSON.stringify({ base_hourly_fee }),
      });
      if (res.ok) await refreshClubData();
    },

    async setVenueStatus(venue_id: string, status: VenueStatus) {
      const res = await api(`/api/venues/${venue_id}`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      if (res.ok) await refreshClubData();
    },

    async reportIssue(venue_id: string, description: string) {
      const res = await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({ target_type: "venue", venue_id, description }),
      });
      if (res.ok) await refreshClubData();
    },

    async addMaintenance(m: { venue_id: string; description: string; priority?: "Low" | "Medium" | "High" | "Critical" }) {
      const res = await api("/api/maintenance", {
        method: "POST",
        body: JSON.stringify({
          target_type: "venue",
          venue_id: m.venue_id,
          description: m.description,
          priority: m.priority || "Medium",
        }),
      });
      if (res.ok) await refreshClubData();
    },

    async removeMaintenance(request_id: string) {
      const res = await api(`/api/maintenance/${request_id}`, { method: "DELETE" });
      if (res.ok) await refreshClubData();
    },

    async moveRequest(request_id: string, request_status: RequestStatus) {
      const res = await api(`/api/maintenance/${request_id}/status`, {
        method: "PUT",
        body: JSON.stringify({ request_status }),
      });
      if (res.ok) await refreshClubData();
    },
  };
}

const Ctx = createContext<ReturnType<typeof useStoreState> | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useStoreState()}>{children}</Ctx.Provider>;
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
