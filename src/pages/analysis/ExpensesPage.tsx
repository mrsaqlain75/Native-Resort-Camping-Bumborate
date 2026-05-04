import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Wallet, Filter } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

function exportToExcel(data: unknown[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}

export default function ExpensesPage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [submitted, setSubmitted] = useState(false);

  const { data: expenses } = trpc.expenses.listByDateRange.useQuery(
    { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    { enabled: submitted }
  );
  const { data: categoryBreakdown } = trpc.expenses.categoryBreakdown.useQuery(
    { from, to },
    { enabled: submitted }
  );

  const filteredExpenses = (expenses || []).filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (paymentFilter !== "all" && e.paymentMethod !== paymentFilter) return false;
    return true;
  });

  const total = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const handleExport = () => {
    exportToExcel(
      filteredExpenses.map((e) => ({
        name: e.name,
        amount: Number(e.amount),
        category: e.category,
        payment: e.paymentMethod,
        paidTo: e.paidTo,
        date: format(new Date(e.dateTime), "yyyy-MM-dd HH:mm"),
        note: e.note,
      })),
      `Expenses_Report_${from}_to_${to}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Wallet className="h-6 w-6 text-[var(--primary)]" />
            Total Expenses
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">All expense records with filters</p>
        </div>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export Excel</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="supplies">Supplies</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="rent">Rent</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="e_transaction">E-Transaction</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setSubmitted(true)}><Filter className="h-4 w-4 mr-1" /> Apply</Button>
          </div>
        </CardContent>
      </Card>

      {submitted && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Total Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-600">Rs. {total.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Transaction Count</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{filteredExpenses.length}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Average</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">Rs. {filteredExpenses.length > 0 ? (total / filteredExpenses.length).toFixed(0) : 0}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Categories</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{new Set(filteredExpenses.map((e) => e.category)).size}</p></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-lg font-serif">Expense Records</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium">{e.name}</TableCell>
                          <TableCell><span className="px-2 py-1 rounded-full text-xs bg-[var(--muted)]">{e.category}</span></TableCell>
                          <TableCell className="text-xs">{format(new Date(e.dateTime), "MMM dd, yyyy")}</TableCell>
                          <TableCell className="text-xs">{e.paymentMethod}</TableCell>
                          <TableCell className="text-right font-semibold text-red-600">Rs. {Number(e.amount).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                      {filteredExpenses.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted-foreground)]">No expense records found</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg font-serif">By Category</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(categoryBreakdown || []).map((c) => (
                    <div key={c.category} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{c.category}</span>
                      <span className="text-sm font-semibold">Rs. {Number(c.total).toLocaleString()}</span>
                    </div>
                  ))}
                  {(!categoryBreakdown || categoryBreakdown.length === 0) && (
                    <p className="text-sm text-[var(--muted-foreground)]">No data</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
