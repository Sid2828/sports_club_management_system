import { createContext, useContext, useState, type ReactNode } from "react";
import * as M from "@/data/mock";
import { lateFee } from "@/lib/calc";

export type Role = "member" | "admin";
export interface Activity { id: string; kind: "booking" | "issue" | "maintenance" | "wallet"; text: string; at: string }

const now = () => new Date().toISOString();
const uid = (p: string) => `${p}${Math.floor(Math.random() * 9000 + 1000)}`;

function useStoreState() {
  const [role, setRole] = useState<Role>("admin");
  const currentMemberId = "M101";
  const [members, setMembers] = useState(M.members);
  const [venues, setVenues] = useState(M.venues);
  const [bookings, setBookings] = useState(M.bookings);
  const [payments, setPayments] = useState(M.payments);
  const [equipment, setEquipment] = useState(M.equipment);
  const [issues, setIssues] = useState(M.issues.map((i) => (i.returned_date ? i : { ...i, late_fee: lateFee(i.due_date) })));
  const [maintenance, setMaintenance] = useState(M.maintenance);
  const [activity, setActivity] = useState<Activity[]>(() => {
    const nm = (id: string) => M.members.find((m) => m.member_id === id)?.member_name;
    const vn = (id: string) => M.venues.find((v) => v.venue_id === id)?.venue_name;
    return [
      ...M.bookings.map((b) => ({ id: b.booking_id, kind: "booking" as const, text: `${nm(b.member_id)} booked ${vn(b.venue_id)}`, at: b.start_time })),
      ...M.issues.map((i) => ({ id: i.issue_id, kind: "issue" as const, text: `${nm(i.member_id)} checked out ${M.equipment.find((e) => e.asset_id === i.asset_id)?.name}`, at: i.issue_date + "T08:00" })),
      ...M.maintenance.map((r) => ({ id: r.request_id, kind: "maintenance" as const, text: `Issue reported at ${vn(r.venue_id)}`, at: r.reported_date + "T09:00" })),
    ].sort((a, b) => b.at.localeCompare(a.at));
  });
  const log = (kind: Activity["kind"], text: string) => setActivity((a) => [{ id: uid("A"), kind, text, at: now() }, ...a]);
  const memberName = (id: string) => members.find((m) => m.member_id === id)?.member_name ?? id;
  const venueName = (id: string) => venues.find((v) => v.venue_id === id)?.venue_name ?? id;

  return {
    role, setRole, currentMemberId, members, venues, bookings, payments, equipment, issues, maintenance, activity,
    plans: M.plans, sports: M.sports, memberName, venueName,
    addBooking(b: Omit<M.VenueBooking, "booking_id" | "payment_id">, p: Pick<M.Payment, "payment_method" | "payment_status" | "payment_date">) {
      const booking_id = uid("B"), payment_id = uid("P");
      setBookings((x) => [{ ...b, booking_id, payment_id }, ...x]);
      setPayments((x) => [{ ...p, payment_id, booking_id, amount: b.total_cost }, ...x]);
      if (p.payment_method === "Wallet" && p.payment_status === "Paid")
        setMembers((ms) => ms.map((m) => (m.member_id === b.member_id ? { ...m, wallet_balance: m.wallet_balance - b.total_cost } : m)));
      log("booking", `${memberName(b.member_id)} booked ${venueName(b.venue_id)}`);
    },
    topUp(member_id: string, amount: number) {
      setMembers((ms) => ms.map((m) => (m.member_id === member_id ? { ...m, wallet_balance: m.wallet_balance + amount } : m)));
      log("wallet", `${memberName(member_id)} topped up $${amount.toFixed(2)}`);
    },
    checkout(i: Omit<M.EquipmentIssue, "issue_id" | "late_fee">) {
      setIssues((x) => [{ ...i, issue_id: uid("I-"), late_fee: lateFee(i.due_date) }, ...x]);
      setEquipment((eq) => eq.map((e) => {
        if (e.asset_id !== i.asset_id) return e;
        const a = e.available_quantity - 1;
        return { ...e, available_quantity: a, status: a <= 0 ? "In Use" : e.status };
      }));
      log("issue", `${memberName(i.member_id)} checked out ${equipment.find((e) => e.asset_id === i.asset_id)?.name}`);
    },
    returnItem(issue_id: string) {
      const it = issues.find((i) => i.issue_id === issue_id);
      if (!it) return;
      setIssues((x) => x.map((i) => (i.issue_id === issue_id ? { ...i, returned_date: now().slice(0, 10), late_fee: lateFee(i.due_date) } : i)));
      setEquipment((eq) => eq.map((e) => (e.asset_id === it.asset_id ? { ...e, available_quantity: e.available_quantity + 1, status: e.status === "In Use" ? "Available" : e.status } : e)));
      log("issue", `${memberName(it.member_id)} returned equipment`);
    },
    reportIssue(venue_id: string, description: string) {
      setMaintenance((x) => [{ request_id: uid("MR-"), venue_id, description, reported_date: now().slice(0, 10), request_status: "Pending" }, ...x]);
      log("maintenance", `Issue reported at ${venueName(venue_id)}`);
    },
    moveRequest(request_id: string, request_status: M.RequestStatus) {
      setMaintenance((x) => x.map((r) => (r.request_id === request_id ? { ...r, request_status } : r)));
    },
    setVenueStatus(venue_id: string, status: M.VenueStatus) {
      setVenues((v) => v.map((x) => (x.venue_id === venue_id ? { ...x, status } : x)));
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
export const money = (n: number) => `$${n.toFixed(2)}`;
