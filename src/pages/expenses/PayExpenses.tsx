import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Banknote, HandCoins } from "lucide-react";
import { toast } from "sonner";

const formatAmount = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString()}`;

export default function PayExpenses() {
  const utils = trpc.useUtils();

  const { data: payables, isLoading } = trpc.vendorPayments.summary.useQuery();

  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payVendor, setPayVendor] = useState<{
    vendor: string;
    remaining: number;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState("");

  const openPayModal = (vendor: string, remaining: number) => {
    setPayVendor({ vendor, remaining });
    setAmount(remaining.toFixed(2));
    setDateTime(new Date().toISOString().slice(0, 16));
    setNote("");
    setAmountError("");
    setPayModalOpen(true);
  };

  const createPayment = trpc.vendorPayments.create.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      utils.vendorPayments.summary.invalidate();
      utils.vendorPayments.list.invalidate();
      utils.reports.dashboardSummary.invalidate();
      setPayModalOpen(false);
      setPayVendor(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePay = () => {
    if (!payVendor) return;
    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0) {
      setAmountError("Enter a valid amount greater than 0");
      return;
    }
    if (value > payVendor.remaining + 0.001) {
      setAmountError(`Amount cannot exceed the remaining ${formatAmount(payVendor.remaining)}`);
      return;
    }
    setAmountError("");
    createPayment.mutate({
      vendorName: payVendor.vendor,
      amount: value,
      dateTime: dateTime ? new Date(dateTime).toISOString() : undefined,
      note: note.trim() || undefined,
    });
  };

  const totalOutstanding = (payables || []).reduce(
    (sum, p) => sum + Math.max(p.remaining, 0),
    0
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <HandCoins className="h-6 w-6 text-[var(--primary)]" />
            Pay Expenses
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Settle amounts payable to vendors, one payment at a time
          </p>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1.5">
          Outstanding: <span className="ml-1 font-bold text-[var(--destructive)]">{formatAmount(totalOutstanding)}</span>
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendor Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">Loading balances...</p>
          ) : !payables || payables.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">
              No vendor expenses recorded yet. Record expenses first.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Expenses Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining Payable</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((payable) => {
                  const remaining = Math.max(payable.remaining, 0);
                  const settled = remaining < 0.005 && payable.expensesTotal > 0;
                  return (
                    <TableRow key={payable.vendor}>
                      <TableCell className="font-medium">{payable.vendor}</TableCell>
                      <TableCell>
                        {formatAmount(payable.expensesTotal)}
                        <span className="text-xs text-[var(--muted-foreground)] ml-1">
                          ({payable.expensesCount} expense{payable.expensesCount === 1 ? "" : "s"})
                        </span>
                      </TableCell>
                      <TableCell className="text-[var(--positive)]">
                        {payable.paidTotal > 0 ? `-${formatAmount(payable.paidTotal)}` : "—"}
                      </TableCell>
                      <TableCell className="font-bold">
                        {settled ? (
                          <Badge className="bg-[var(--positive)]/12 text-[var(--positive)] border-[var(--positive)]/30">
                            Settled
                          </Badge>
                        ) : (
                          <span className="text-[var(--destructive)]">{formatAmount(remaining)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={settled}
                          onClick={() => openPayModal(payable.vendor, remaining)}
                        >
                          <Banknote className="h-4 w-4 mr-1" /> Pay
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pay Modal */}
      <Dialog open={payModalOpen} onOpenChange={(open) => {
        setPayModalOpen(open);
        if (!open) setPayVendor(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay {payVendor?.vendor}</DialogTitle>
            <DialogDescription>
              Remaining payable:{" "}
              <span className="font-bold text-[var(--destructive)]">
                {formatAmount(payVendor?.remaining ?? 0)}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="payment-amount">Amount (PKR) *</Label>
              <div className="flex gap-2">
                <Input
                  id="payment-amount"
                  type="number"
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => payVendor && setAmount(payVendor.remaining.toFixed(2))}
                >
                  Pay Full
                </Button>
              </div>
              {amountError && (
                <p className="text-sm text-[var(--destructive)] mt-1">{amountError}</p>
              )}
            </div>
            <div>
              <Label htmlFor="payment-date">Date & Time</Label>
              <Input
                id="payment-date"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="payment-note">Remarks (Optional)</Label>
              <Textarea
                id="payment-note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g., paid via bank transfer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePay} disabled={createPayment.isPending}>
              {createPayment.isPending ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
