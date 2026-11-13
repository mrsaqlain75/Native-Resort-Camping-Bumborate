import { useState } from "react";
import { addMonths, format } from "date-fns";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Banknote, ChevronLeft, ChevronRight, HandCoins } from "lucide-react";
import PayVendorModal from "@/components/payments/PayVendorModal";

const formatAmount = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString()}`;

export default function PayExpenses() {
  // Month navigator — defaults to the current month.
  const [viewMonthDate, setViewMonthDate] = useState(() => new Date());
  const viewMonth = format(viewMonthDate, "yyyy-MM");
  const currentMonth = format(new Date(), "yyyy-MM");
  const canGoForward = viewMonth < currentMonth;

  const { data: payables, isLoading } = trpc.vendorPayments.monthlySummary.useQuery({
    month: viewMonth,
  });

  const [payVendor, setPayVendor] = useState<{
    vendor: string;
    monthRemaining: number;
    totalPayable: number;
  } | null>(null);
  // Increments each time the pay modal opens so the shared PayVendorModal
  // remounts with fresh state.
  const [payModalSeq, setPayModalSeq] = useState(0);

  const openPayModal = (payable: {
    vendor: string;
    monthRemaining: number;
    totalPayable: number;
  }) => {
    setPayVendor({
      vendor: payable.vendor,
      monthRemaining: Math.max(payable.monthRemaining, 0),
      totalPayable: Math.max(payable.totalPayable, 0),
    });
    setPayModalSeq((s) => s + 1);
  };

  const totalOutstanding = (payables || []).reduce(
    (sum, p) => sum + Math.max(p.totalPayable, 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
          Outstanding:{" "}
          <span className="ml-1 font-bold text-[var(--destructive)]">
            {formatAmount(totalOutstanding)}
          </span>
        </Badge>
      </div>

      {/* Month navigator */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => setViewMonthDate(addMonths(viewMonthDate, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[150px] text-center font-semibold font-serif">
          {format(viewMonthDate, "MMMM yyyy")}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          disabled={!canGoForward}
          onClick={() => setViewMonthDate(addMonths(viewMonthDate, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {viewMonth !== currentMonth && (
          <Button variant="ghost" size="sm" onClick={() => setViewMonthDate(new Date())}>
            Back to This Month
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Vendor Balances — {format(viewMonthDate, "MMMM yyyy")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">Loading balances...</p>
          ) : !payables || payables.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">
              No vendor expenses or payments recorded for this month.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Expenses (This Month)</TableHead>
                  <TableHead>Paid (This Month)</TableHead>
                  <TableHead>Remaining Payable</TableHead>
                  <TableHead>Total Payable</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((payable) => {
                  const monthRemaining = Math.max(payable.monthRemaining, 0);
                  const totalPayable = Math.max(payable.totalPayable, 0);
                  const monthActive =
                    payable.monthExpensesTotal > 0 || payable.monthPaidTotal > 0;
                  const monthSettled =
                    payable.monthExpensesTotal > 0 && monthRemaining < 0.005;
                  const canPay = totalPayable >= 0.005;
                  return (
                    <TableRow key={payable.vendor}>
                      <TableCell className="font-medium">{payable.vendor}</TableCell>
                      <TableCell>
                        {payable.monthExpensesTotal > 0 ? (
                          <>
                            {formatAmount(payable.monthExpensesTotal)}
                            <span className="text-xs text-[var(--muted-foreground)] ml-1">
                              ({payable.monthExpensesCount} expense
                              {payable.monthExpensesCount === 1 ? "" : "s"})
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-[var(--positive)]">
                        {payable.monthPaidTotal > 0
                          ? `-${formatAmount(payable.monthPaidTotal)}`
                          : "—"}
                      </TableCell>
                      <TableCell className="font-bold">
                        {!monthActive ? (
                          "—"
                        ) : monthSettled ? (
                          <Badge className="bg-[var(--positive)]/12 text-[var(--positive)] border-[var(--positive)]/30">
                            Settled
                          </Badge>
                        ) : (
                          <span className="text-[var(--destructive)]">
                            {formatAmount(monthRemaining)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {totalPayable >= 0.005 ? (
                          <span className="font-semibold text-[var(--destructive)]">
                            {formatAmount(totalPayable)}
                          </span>
                        ) : (
                          <Badge className="bg-[var(--positive)]/12 text-[var(--positive)] border-[var(--positive)]/30">
                            Cleared
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled={!canPay}
                          onClick={() => openPayModal(payable)}
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

      {/* Pay Modal (shared with the Add Expense "Record & Pay" flow) */}
      {payVendor && (
        <PayVendorModal
          key={`${payVendor.vendor}-${payModalSeq}`}
          onOpenChange={(open) => {
            if (!open) setPayVendor(null);
          }}
          vendor={payVendor.vendor}
          amounts={[
            { label: "Remaining Payable (This Month)", value: payVendor.monthRemaining },
            ...(payVendor.totalPayable > payVendor.monthRemaining + 0.005
              ? [
                  {
                    label: "Total Payable (incl. previous months)",
                    value: payVendor.totalPayable,
                  },
                ]
              : []),
          ]}
          maxAmount={payVendor.totalPayable}
          defaultAmount={
            payVendor.monthRemaining > 0.005 ? payVendor.monthRemaining : payVendor.totalPayable
          }
        />
      )}
    </div>
  );
}
