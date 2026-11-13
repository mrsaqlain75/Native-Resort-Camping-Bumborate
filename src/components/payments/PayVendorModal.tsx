import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Banknote, CreditCard } from "lucide-react";
import { toast } from "sonner";

const formatAmount = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString()}`;

/**
 * Shared "record a vendor payment" modal.
 *
 * Used by the Pay Expenses page and the Add Expense form's Record & Pay
 * flow. `amounts` renders the payable lines shown under the vendor name;
 * `maxAmount` is the largest amount the user may enter (Pay Full fills it).
 *
 * Render this conditionally with a changing `key` — the component assumes
 * it is mounted fresh each time it opens, so state initializers below run
 * once per open.
 */
export default function PayVendorModal({
  onOpenChange,
  vendor,
  amounts,
  maxAmount,
  defaultAmount,
}: {
  onOpenChange: (open: boolean) => void;
  vendor: string;
  amounts: { label: string; value: number }[];
  maxAmount: number;
  defaultAmount?: number;
}) {
  const utils = trpc.useUtils();
  const initial = defaultAmount ?? maxAmount;
  const [amount, setAmount] = useState(() => (initial > 0.005 ? initial.toFixed(2) : ""));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "online">("cash");
  const [dateTime, setDateTime] = useState(() => new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [amountError, setAmountError] = useState("");

  const createPayment = trpc.vendorPayments.create.useMutation({
    onSuccess: () => {
      toast.success("Payment recorded successfully!");
      utils.vendorPayments.summary.invalidate();
      utils.vendorPayments.monthlySummary.invalidate();
      utils.vendorPayments.list.invalidate();
      utils.reports.dashboardSummary.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const handlePay = () => {
    const value = Number(amount);
    if (!amount || isNaN(value) || value <= 0) {
      setAmountError("Enter a valid amount greater than 0");
      return;
    }
    if (value > maxAmount + 0.001) {
      setAmountError(`Amount cannot exceed ${formatAmount(maxAmount)}`);
      return;
    }
    setAmountError("");
    createPayment.mutate({
      vendorName: vendor,
      amount: value,
      paymentMethod,
      dateTime: dateTime ? new Date(dateTime).toISOString() : undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {vendor}</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1">
              {amounts.map((line) => (
                <p key={line.label}>
                  {line.label}:{" "}
                  <span className="font-bold text-[var(--destructive)]">
                    {formatAmount(line.value)}
                  </span>
                </p>
              ))}
            </div>
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
                onClick={() => setAmount(maxAmount > 0 ? maxAmount.toFixed(2) : "")}
              >
                Pay Full
              </Button>
            </div>
            {amountError && (
              <p className="text-sm text-[var(--destructive)] mt-1">{amountError}</p>
            )}
          </div>
          <div>
            <Label>Payment Method</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentMethod === "cash" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("cash")}
              >
                <Banknote className="h-4 w-4 mr-1" /> Cash
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "online" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setPaymentMethod("online")}
              >
                <CreditCard className="h-4 w-4 mr-1" /> Online
              </Button>
            </div>
          </div>
          <div>
            <Label htmlFor="payment-date">Date &amp; Time</Label>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handlePay} disabled={createPayment.isPending}>
            {createPayment.isPending ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
