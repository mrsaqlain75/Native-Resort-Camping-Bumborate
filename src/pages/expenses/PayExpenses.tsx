import { useState } from "react";
import { addMonths, format, startOfMonth } from "date-fns";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  HandCoins,
} from "lucide-react";
import PayVendorModal from "@/components/payments/PayVendorModal";

const formatAmount = (amount: number) => `Rs. ${Number(amount || 0).toLocaleString()}`;

export default function PayExpenses() {
  // View mode: a single calendar month, or a custom inclusive date range.
  const [mode, setMode] = useState<"month" | "range">("month");

  // Month navigator — defaults to the current month (YYYY-MM).
  const currentMonth = format(new Date(), "yyyy-MM");
  const [viewMonth, setViewMonth] = useState(currentMonth);
  const canGoForward = viewMonth < currentMonth;

  // Custom range — defaults to the current month start .. today (YYYY-MM-DD).
  const [rangeFrom, setRangeFrom] = useState(() => format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [rangeTo, setRangeTo] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const rangeValid = !!rangeFrom && !!rangeTo && rangeFrom <= rangeTo;

  const monthQuery = trpc.vendorPayments.monthlySummary.useQuery(
    { month: viewMonth },
    { enabled: mode === "month" }
  );
  const rangeQuery = trpc.vendorPayments.rangeSummary.useQuery(
    { from: rangeFrom, to: rangeTo },
    { enabled: mode === "range" && rangeValid }
  );

  const payables = mode === "month" ? monthQuery.data : rangeQuery.data;
  const isLoading = mode === "month" ? monthQuery.isLoading : rangeQuery.isLoading;
  const periodLabel = mode === "month" ? "This Month" : "Selected Period";

  const shiftMonth = (delta: number) => {
    const base = new Date(`${viewMonth}-01T00:00:00.000Z`);
    setViewMonth(format(addMonths(base, delta), "yyyy-MM"));
  };

  const heading =
    mode === "month"
      ? format(new Date(`${viewMonth}-01T00:00:00.000Z`), "MMMM yyyy")
      : rangeValid
        ? `${format(new Date(`${rangeFrom}T00:00:00.000Z`), "MMM d, yyyy")} – ${format(
            new Date(`${rangeTo}T00:00:00.000Z`),
            "MMM d, yyyy"
          )}`
        : "";

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

      {/* View mode toggle */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === "month" ? "default" : "outline"}
          onClick={() => setMode("month")}
        >
          Monthly
        </Button>
        <Button
          size="sm"
          variant={mode === "range" ? "default" : "outline"}
          onClick={() => setMode("range")}
        >
          <CalendarRange className="h-4 w-4 mr-1" /> Custom Range
        </Button>
      </div>

      {/* Period selectors */}
      {mode === "month" ? (
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous month"
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Input
            type="month"
            className="w-44"
            value={viewMonth}
            max={currentMonth}
            onChange={(e) => {
              if (e.target.value) setViewMonth(e.target.value);
            }}
          />
          <Button
            variant="outline"
            size="icon"
            aria-label="Next month"
            disabled={!canGoForward}
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setViewMonth(currentMonth)}>
            This Month
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMonth(format(addMonths(new Date(), -1), "yyyy-MM"))}
          >
            Last Month
          </Button>
        </div>
      ) : (
        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="w-44"
              value={rangeFrom}
              max={rangeTo}
              onChange={(e) => setRangeFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="w-44"
              value={rangeTo}
              min={rangeFrom}
              onChange={(e) => setRangeTo(e.target.value)}
            />
          </div>
          {!rangeValid && (
            <p className="text-sm text-[var(--destructive)] pb-2">
              From date must be on or before To date.
            </p>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vendor Balances — {heading}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">Loading balances...</p>
          ) : !payables || payables.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">
              No vendor expenses or payments recorded for this{" "}
              {mode === "month" ? "month" : "period"}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Expenses ({periodLabel})</TableHead>
                  <TableHead>Paid ({periodLabel})</TableHead>
                  <TableHead>Remaining Payable</TableHead>
                  <TableHead>Total Payable</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map((payable) => {
                  const monthRemaining = Math.max(payable.monthRemaining, 0);
                  const totalPayable = Math.max(payable.totalPayable, 0);
                  const periodActive =
                    payable.monthExpensesTotal > 0 || payable.monthPaidTotal > 0;
                  const periodSettled =
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
                        {!periodActive ? (
                          "—"
                        ) : periodSettled ? (
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
            {
              label: mode === "month" ? "Remaining Payable (This Month)" : "Remaining Payable (Selected Period)",
              value: payVendor.monthRemaining,
            },
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
