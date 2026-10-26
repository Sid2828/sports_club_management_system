import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore, money } from "@/lib/store";

export const Route = createFileRoute("/members/")({
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { title: "Member Directory — ArenaOne" },
      { name: "description", content: "Search club members, tiers, wallet balances and delinquent accounts." },
      { property: "og:title", content: "Member Directory — ArenaOne" },
      { property: "og:description", content: "Search club members, tiers, wallet balances and delinquent accounts." },
    ],
  }),
  component: Members,
});

export function Members() {
  const s = useStore();
  const [q, setQ] = useState("");
  if (s.role === "member") return <Navigate to="/members/$memberId" params={{ memberId: s.currentMemberId }} />;
  const query = (s.searchQuery || q).trim().toLowerCase();
  const list = s.members.filter((m) =>
    `${m.member_id} ${m.member_name} ${m.email} ${m.phone} ${m.tier}`.toLowerCase().includes(query)
  );
  return (
    <div>
      <PageHeader title="Member Directory" subtitle={`${s.members.length} members · ${s.members.filter((m) => m.is_delinquent).length} delinquent`}>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
      </PageHeader>
      <Card className="overflow-hidden p-0 shadow-card">
        <Table>
          <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Phone</TableHead><TableHead>Tier</TableHead><TableHead className="text-right">Wallet</TableHead><TableHead>Standing</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((m) => (
              <TableRow key={m.member_id} className={m.is_delinquent ? "bg-destructive/5" : ""}>
                <TableCell className="font-mono text-xs">{m.member_id}</TableCell>
                <TableCell><Link to="/members/$memberId" params={{ memberId: m.member_id }} className="font-medium text-primary hover:underline">{m.member_name}</Link></TableCell>
                <TableCell className="text-muted-foreground">{m.email}</TableCell>
                <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                <TableCell><StatusBadge value={m.tier} /></TableCell>
                <TableCell className="text-right tabular-nums">{money(m.wallet_balance)}</TableCell>
                <TableCell>{m.is_delinquent ? <StatusBadge value="Delinquent" /> : <span className="text-xs text-muted-foreground">Good</span>}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
