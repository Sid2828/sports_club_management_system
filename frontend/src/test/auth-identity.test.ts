import { describe, expect, it } from "vitest";
import { resolveUniqueIdentity } from "@/lib/auth-identity";
import { members, admins } from "@/data/mock";

const memberRecords = members.map((m) => ({
  id: m.member_id,
  username: m.username || m.member_name,
  email: m.email,
}));

const adminRecords = admins.map((a) => ({
  id: a.admin_id,
  username: a.username,
  email: a.email,
}));

describe("Unique identity and roster checks", () => {
  it("authenticates a member only when username and email match the same roster record", () => {
    const result = resolveUniqueIdentity(memberRecords, "Aarav Mehta", "aarav.mehta@clubmail.com");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.record.id).toBe("M101");
  });

  it("blocks member sign-in when no pre-existing roster record exists", () => {
    const result = resolveUniqueIdentity(memberRecords, "Unknown User", "unknown@example.com");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(400);
      expect(result.message.toLowerCase()).toContain("pre-existing");
    }
  });

  it("returns 409 when username and email belong to different members", () => {
    const result = resolveUniqueIdentity(memberRecords, "Aarav Mehta", "priya.sharma@clubmail.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("authenticates admin only against the unique admin roster record", () => {
    const result = resolveUniqueIdentity(adminRecords, "Dana Lopez", "dana.admin@arenaone.club");
    expect(result.ok).toBe(true);
  });

  it("blocks unknown admin credentials", () => {
    const result = resolveUniqueIdentity(adminRecords, "Other Admin", "other.admin@arenaone.club");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("keeps newly created member wallet default at 0 in the member model", () => {
    expect(members.find((m) => m.member_id === "M000")?.wallet_balance).toBe(0);
  });
});
