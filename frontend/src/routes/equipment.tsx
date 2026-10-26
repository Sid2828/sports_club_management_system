import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Boxes, Plus, Trash2, Edit2, Sparkles, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NativeSelect } from "@/components/native-select";
import { PageHeader, StatusBadge } from "@/components/status-badge";
import { useStore, money } from "@/lib/store";
import { lateFee } from "@/lib/calc";
import { equipmentDates, roleLayout } from "@/lib/role-layout";
import type { Equipment } from "@/data/mock";

export const Route = createFileRoute("/equipment")({
  head: () => ({
    meta: [
      { title: "Equipment & Inventory — ArenaOne" },
      {
        name: "description",
        content:
          "Track club equipment stock, member loans, due dates and inventory controls.",
      },
    ],
  }),
  component: EquipmentPage,
});

interface CheckoutForm {
  member_id: string;
  asset_id: string;
  issue_date: string;
  due_date: string;
}

interface NewEquipmentForm {
  name: string;
  category: string;
  total_quantity: number;
  daily_price: number;
}

export function EquipmentPage() {
  const s = useStore();
  const isAdmin = s.role === "admin";
  const isMember = s.role === "member";
  const isNonMember = s.role === "non_member";
  const layout = roleLayout(s.role);

  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingPriceItem, setEditingPriceItem] =
    useState<Equipment | null>(null);
  const [newPrice, setNewPrice] = useState("");

  // Member borrow dialog
  const [borrowItem, setBorrowItem] = useState<Equipment | null>(null);
  const [borrowIssueDate, setBorrowIssueDate] = useState(today);
  const [borrowDueDate, setBorrowDueDate] = useState(defaultDue);

  // Member discounts
  const memberDiscounts = s.getMemberDiscounts();
  const discountPercent = memberDiscounts.equipment;

  // Checkout form for admin
  const { register, handleSubmit, reset } = useForm<CheckoutForm>({
    defaultValues: {
      member_id: s.currentMemberId,
      asset_id: s.equipment[0]?.asset_id ?? "",
      issue_date: today,
      due_date: defaultDue,
    },
  });

  // New equipment form for admin
  const {
    register: registerNew,
    handleSubmit: handleNewSubmit,
    reset: resetNew,
  } = useForm<NewEquipmentForm>({
    defaultValues: {
      name: "",
      category: "Racquets",
      total_quantity: 10,
      daily_price: 100,
    },
  });

  // Active checkouts
  const myActiveGear = s.issues.filter(
    (i) => !i.returned_date && i.member_id === s.currentMemberId
  );

  const allActiveGear = s.issues.filter((i) => !i.returned_date);

  // Search filtering
  const q = s.searchQuery.trim().toLowerCase();

  const filteredEquipment = s.equipment.filter((e) => {
    if (!q) return true;

    return (
      e.name.toLowerCase().includes(q) ||
      e.asset_id.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.status.toLowerCase().includes(q)
    );
  });

  const filteredMyActiveGear = myActiveGear.filter((i) => {
    if (!q) return true;

    const item = s.equipment.find((e) => e.asset_id === i.asset_id);

    return (
      i.issue_id.toLowerCase().includes(q) ||
      i.asset_id.toLowerCase().includes(q) ||
      (item?.name.toLowerCase().includes(q) ?? false)
    );
  });

  const filteredAllActiveGear = allActiveGear.filter((i) => {
    if (!q) return true;

    const item = s.equipment.find((e) => e.asset_id === i.asset_id);
    const mName = s.memberName(i.member_id).toLowerCase();

    return (
      i.issue_id.toLowerCase().includes(q) ||
      i.asset_id.toLowerCase().includes(q) ||
      mName.includes(q) ||
      (item?.name.toLowerCase().includes(q) ?? false)
    );
  });

  // Admin checkout
  const onCheckoutSubmit = handleSubmit((f) => {
    if (isNonMember) {
      s.triggerUpgradeModal("Equipment Checkout");
      return;
    }

    const targetMemberId = isAdmin ? f.member_id : s.currentMemberId;
    const eq = s.equipment.find((e) => e.asset_id === f.asset_id);

    if (!eq) {
      toast.error("Select an available asset");
      return;
    }

    const dates = equipmentDates(
      s.role,
      {
        issue_date: f.issue_date,
        due_date: f.due_date,
      },
      {
        issue_date: today,
        due_date: defaultDue,
      }
    );

    if (
      eq.available_quantity <= 0 ||
      eq.status === "Under Maintenance"
    ) {
      toast.error(`${eq.name} is not available for checkout.`);
      return;
    }

    if (dates.due_date < dates.issue_date) {
      toast.error("Due date must be after issue date");
      return;
    }

    void s
      .checkout({
        ...f,
        ...dates,
        member_id: targetMemberId,
      })
      .then((result) => {
        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success(`${eq.name} checked out successfully`);
      });

    reset({ ...f, ...dates });
  });

  // Add new equipment
  const onAddEquipmentSubmit = handleNewSubmit((f) => {
    if (!f.name.trim()) {
      toast.error("Enter equipment name");
      return;
    }

    s.addEquipment({
      name: f.name.trim(),
      category: f.category,
      total_quantity: Number(f.total_quantity),
      daily_price: Number(f.daily_price),
    });

    toast.success(`Added ${f.name} to inventory!`);
    resetNew();
    setAddDialogOpen(false);
  });

  // Update equipment price
  const handleUpdatePrice = () => {
    if (!editingPriceItem) return;

    const priceNum = Number(newPrice);

    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Please enter a valid price");
      return;
    }

    s.setEquipmentPrice(editingPriceItem.asset_id, priceNum);

    toast.success(
      `Updated daily rate for ${editingPriceItem.name} to ${money(priceNum)}`
    );

    setEditingPriceItem(null);
  };

  // Member borrow confirmation
  const handleMemberBorrowConfirm = () => {
    if (!borrowItem) return;

    if (borrowDueDate < borrowIssueDate) {
      toast.error("Due date cannot be earlier than issue date.");
      return;
    }

    if (
      borrowItem.available_quantity <= 0 ||
      borrowItem.status === "Under Maintenance"
    ) {
      toast.error(`${borrowItem.name} is currently out of stock.`);
      return;
    }

    void s
      .checkout({
        asset_id: borrowItem.asset_id,
        member_id: s.currentMemberId,
        issue_date: borrowIssueDate,
        due_date: borrowDueDate,
      })
      .then((result) => {
        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success(`Successfully borrowed ${borrowItem.name}!`, {
          description: `Due on ${borrowDueDate}. Added to your active gear.`,
        });
      });

    // FIX: Removed the extra }); that caused the syntax error.
    setBorrowItem(null);
  };

  return (
    <div>
      <PageHeader
        title="Equipment & Inventory"
        subtitle={
          isAdmin
            ? "Admin inventory controls · Overdue fine: 5% of equipment base price per day overdue"
            : isNonMember
              ? "Catalog browsing (Read-Only) · Upgrade to checkout equipment"
              : `Member gear catalog · Your tier discount: ${discountPercent}% off`
        }
      >
        {isAdmin && (
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add Equipment
          </Button>
        )}

        {isNonMember && (
          <Button
            onClick={() => s.triggerUpgradeModal("Equipment Checkout")}
            className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-semibold gap-1.5"
          >
            <Sparkles className="size-4" />
            Unlock Equipment Loans
          </Button>
        )}
      </PageHeader>

      {/* MEMBER SECTION: My Active Gear */}
      {isMember && (
        <Card className="mb-6 shadow-card border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Boxes className="size-4 text-primary" />
                  My Active Gear ({filteredMyActiveGear.length})
                </CardTitle>

                <CardDescription className="text-xs">
                  Read-only view of sports equipment currently checked out to
                  your account. Overdue fine: 5% per day.
                </CardDescription>
              </div>

              <Badge variant="outline" className="text-xs">
                Member ID: {s.currentMemberId}
              </Badge>
            </div>
          </CardHeader>

          <CardContent>
            {filteredMyActiveGear.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                {q
                  ? "No active gear matches your search."
                  : "You have no active gear checked out currently."}
              </p>
            ) : (
              <div className="divide-y text-sm">
                {filteredMyActiveGear.map((i) => {
                  const item = s.equipment.find(
                    (e) => e.asset_id === i.asset_id
                  );

                  const basePrice = item?.daily_price ?? 100;

                  const computedFine = i.returned_date
                    ? i.late_fee
                    : lateFee(i.due_date, basePrice);

                  const isOverdue =
                    computedFine > 0 || today > i.due_date;

                  return (
                    <div
                      key={i.issue_id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-semibold">
                          {item?.name ?? i.asset_id}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          Asset:{" "}
                          <span className="font-mono">{i.asset_id}</span>
                          {" · "}
                          Issue ID:{" "}
                          <span className="font-mono">{i.issue_id}</span>
                          {" · Base: "}
                          {money(basePrice)}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <p className="text-muted-foreground">Issue Date</p>
                          <p className="font-medium">{i.issue_date}</p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Due Date</p>
                          <p
                            className={`font-semibold ${
                              isOverdue ? "text-destructive" : ""
                            }`}
                          >
                            {i.due_date}
                          </p>
                        </div>

                        <div>
                          <p className="text-muted-foreground">Status</p>
                          {isOverdue ? (
                            <StatusBadge value="Overdue" />
                          ) : (
                            <StatusBadge value="In Use" />
                          )}
                        </div>

                        {computedFine > 0 && (
                          <div>
                            <p className="text-muted-foreground">
                              Late Fine (5%/day)
                            </p>
                            <p className="font-semibold text-destructive">
                              {money(computedFine)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* EQUIPMENT CATALOG & ADMIN CONTROLS GRID */}
      <div
        className={`grid gap-6 ${
          isAdmin ? "xl:grid-cols-3" : "grid-cols-1"
        }`}
      >
        {/* CATALOG TABLE */}
        <Card
          className={`overflow-hidden p-0 shadow-card ${
            isAdmin ? "xl:col-span-2" : ""
          }`}
        >
          <div className="p-4 border-b bg-card">
            <h3 className="font-semibold text-base">Equipment Catalog</h3>

            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "Full inventory list with pricing and management controls."
                : "Available gear catalog showing daily rates and member discounts."}
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset ID</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Daily Rate</TableHead>
                <TableHead className="text-right">
                  Available / Total
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">
                  {isAdmin ? "Actions" : "Action"}
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {filteredEquipment.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-6 text-muted-foreground"
                  >
                    No equipment found matching "{q}".
                  </TableCell>
                </TableRow>
              ) : (
                filteredEquipment.map((e) => {
                  const discountedPrice =
                    discountPercent > 0
                      ? Math.round(
                          e.daily_price * (1 - discountPercent / 100)
                        )
                      : e.daily_price;

                  return (
                    <TableRow key={e.asset_id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {e.asset_id}
                      </TableCell>

                      <TableCell className="font-medium">
                        {e.name}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {e.category}
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {isMember && discountPercent > 0 ? (
                          <div>
                            <span className="font-semibold text-emerald-700">
                              {money(discountedPrice)}
                            </span>
                            <span className="block text-[10px] text-muted-foreground line-through">
                              {money(e.daily_price)}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold">
                            {money(e.daily_price)}
                          </span>
                        )}

                        <span className="text-[10px] text-muted-foreground block">
                          / day
                        </span>
                      </TableCell>

                      <TableCell className="text-right tabular-nums">
                        {e.available_quantity} / {e.total_quantity}
                      </TableCell>

                      <TableCell>
                        <StatusBadge value={e.status} />
                      </TableCell>

                      {isAdmin ? (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-muted-foreground hover:text-foreground"
                              title="Set Price"
                              onClick={() => {
                                setEditingPriceItem(e);
                                setNewPrice(String(e.daily_price));
                              }}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-7 text-destructive hover:bg-destructive/10"
                              title="Remove Equipment"
                              onClick={() => {
                                s.removeEquipment(e.asset_id);
                                toast.success(
                                  `Removed ${e.name} from inventory`
                                );
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      ) : (
                        <TableCell className="text-right">
                          {isNonMember ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7 border-amber-300 hover:bg-amber-100"
                              onClick={() =>
                                s.triggerUpgradeModal("Equipment Checkout")
                              }
                            >
                              Borrow
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              className="text-xs h-7"
                              disabled={
                                e.available_quantity <= 0 ||
                                e.status === "Under Maintenance"
                              }
                              onClick={() => {
                                setBorrowItem(e);
                                setBorrowIssueDate(today);
                                setBorrowDueDate(defaultDue);
                              }}
                            >
                              Borrow
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>

        {/* ADMIN CHECKOUT TOOL */}
        {isAdmin && (
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Check Out Equipment (Admin)
              </CardTitle>

              <CardDescription className="text-xs">
                Assign equipment to members with custom issue and due dates.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={onCheckoutSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <Label>Member</Label>

                  <NativeSelect {...register("member_id")}>
                    {s.members
                      .filter((m) => m.tier !== "None")
                      .map((m) => (
                        <option key={m.member_id} value={m.member_id}>
                          {m.member_name} ({m.tier})
                        </option>
                      ))}
                  </NativeSelect>
                </div>

                <div className="space-y-1.5">
                  <Label>Asset</Label>

                  <NativeSelect {...register("asset_id")}>
                    {s.equipment.map((e) => (
                      <option key={e.asset_id} value={e.asset_id}>
                        {e.asset_id} · {e.name} ({e.available_quantity}{" "}
                        available)
                      </option>
                    ))}
                  </NativeSelect>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="issue-date">Issue date</Label>
                    <Input
                      id="issue-date"
                      type="date"
                      {...register("issue_date")}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="due-date">Due date</Label>
                    <Input
                      id="due-date"
                      type="date"
                      {...register("due_date")}
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full">
                  Issue Equipment
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ADMIN ACTIVE CHECKOUTS MANAGEMENT */}
      {isAdmin && (
        <Card className="mt-6 shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              All Active Equipment Check-Outs (
              {filteredAllActiveGear.length})
            </CardTitle>

            <CardDescription className="text-xs">
              Manage member returns, overdue fines (5% cumulative of base price
              per day), and gear inventory restoration.
            </CardDescription>
          </CardHeader>

          <CardContent className="divide-y">
            {filteredAllActiveGear.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {q
                  ? "No active check-outs match your search."
                  : "No equipment currently checked out."}
              </p>
            ) : (
              filteredAllActiveGear.map((i) => {
                const item = s.equipment.find(
                  (e) => e.asset_id === i.asset_id
                );

                const basePrice = item?.daily_price ?? 100;

                const computedFine = i.returned_date
                  ? i.late_fee
                  : lateFee(i.due_date, basePrice);

                const isOverdue =
                  computedFine > 0 || today > i.due_date;

                return (
                  <div
                    key={i.issue_id}
                    className="flex flex-wrap items-center gap-3 py-3 text-sm"
                  >
                    <span className="font-mono text-xs font-semibold">
                      {i.issue_id}
                    </span>

                    <span className="flex-1">
                      <span className="font-medium">{item?.name}</span>
                      {" · "}
                      {s.memberName(i.member_id)}

                      <span className="text-muted-foreground text-xs block">
                        Base Price: {money(basePrice)}
                      </span>
                    </span>

                    <span className="text-muted-foreground text-xs">
                      Issued: {i.issue_date} → Due: {i.due_date}
                    </span>

                    {isOverdue ? (
                      <StatusBadge value="Overdue" />
                    ) : (
                      <StatusBadge value="In Use" />
                    )}

                    <span className="w-24 text-right tabular-nums text-xs font-semibold">
                      Fine: {money(computedFine)}
                    </span>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        s.returnItem(i.issue_id);
                        toast.success(
                          `Marked ${item?.name} as returned`
                        );
                      }}
                    >
                      Return
                    </Button>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* MEMBER BORROW CHECKOUT DIALOG */}
      <Dialog
        open={Boolean(borrowItem)}
        onOpenChange={(o) => !o && setBorrowItem(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Borrow Equipment</DialogTitle>
            <DialogDescription>
              Check out sports gear for club use with your member privileges.
            </DialogDescription>
          </DialogHeader>

          {borrowItem && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Asset:</span>
                  <span className="font-semibold text-foreground">
                    {borrowItem.name} ({borrowItem.asset_id})
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span>{borrowItem.category}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Base Daily Price:
                  </span>
                  <span>{money(borrowItem.daily_price)}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Member Discount ({discountPercent}%):</span>
                    <span>
                      -
                      {money(
                        Math.round(
                          borrowItem.daily_price * (discountPercent / 100)
                        )
                      )}
                      /day
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t pt-1.5 font-bold text-sm text-foreground">
                  <span>Effective Daily Rate:</span>

                  <span className="text-emerald-700">
                    {money(
                      discountPercent > 0
                        ? Math.round(
                            borrowItem.daily_price *
                              (1 - discountPercent / 100)
                          )
                        : borrowItem.daily_price
                    )}
                    /day
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="borrow-issue-date">Issue Date</Label>
                  <Input
                    id="borrow-issue-date"
                    type="date"
                    value={borrowIssueDate}
                    onChange={(e) => setBorrowIssueDate(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="borrow-due-date">Due Date</Label>
                  <Input
                    id="borrow-due-date"
                    type="date"
                    value={borrowDueDate}
                    onChange={(e) => setBorrowDueDate(e.target.value)}
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground">
                <strong>Late Fine Policy:</strong> 5% of base equipment price (
                {money(Math.round(borrowItem.daily_price * 0.05))}) per day
                delayed after due date.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBorrowItem(null)}
            >
              Cancel
            </Button>

            <Button onClick={handleMemberBorrowConfirm}>
              Confirm & Borrow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ADMIN ADD EQUIPMENT DIALOG */}
      <Dialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Equipment Inventory</DialogTitle>
            <DialogDescription>
              Create a new sports gear inventory record with stock quantity
              and daily rental rate.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={onAddEquipmentSubmit}
            className="space-y-3.5"
          >
            <div className="space-y-1.5">
              <Label>Equipment Name</Label>
              <Input
                placeholder="e.g. Wilson Pro Staff Tennis Racquet"
                {...registerNew("name", { required: true })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>

                <NativeSelect {...registerNew("category")}>
                  {[
                    "Racquets",
                    "Balls",
                    "Kits",
                    "Machines",
                    "Aquatics",
                    "Fitness",
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </NativeSelect>
              </div>

              <div className="space-y-1.5">
                <Label>Total Quantity</Label>
                <Input
                  type="number"
                  min="1"
                  {...registerNew("total_quantity", {
                    valueAsNumber: true,
                  })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Daily Price (₹)</Label>
              <Input
                type="number"
                min="0"
                step="10"
                {...registerNew("daily_price", {
                  valueAsNumber: true,
                })}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                Cancel
              </Button>

              <Button type="submit">Add to Inventory</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ADMIN SET PRICE DIALOG */}
      <Dialog
        open={Boolean(editingPriceItem)}
        onOpenChange={(o) => !o && setEditingPriceItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Equipment Price</DialogTitle>
            <DialogDescription>
              Update daily rental fee for {editingPriceItem?.name} (
              {editingPriceItem?.asset_id}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Daily Price (₹)</Label>
              <Input
                type="number"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingPriceItem(null)}
            >
              Cancel
            </Button>

            <Button onClick={handleUpdatePrice}>
              Save Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}