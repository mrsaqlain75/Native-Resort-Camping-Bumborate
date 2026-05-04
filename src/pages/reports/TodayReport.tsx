import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, CalendarDays } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import * as XLSX from "xlsx";

const COLORS = ["#FF8080", "#FFCF96", "#F6FDC3", "#CDFAD5", "#88dd99", "#66bbdd", "#bb88dd"];

function exportToExcel(data: unknown[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}

export default function TodayReport() {
  const today = new Date();
  const from = startOfDay(today).toISOString();
  const to = endOfDay(today).toISOString();

  const { data: sales } = trpc.sales.listByDateRange.useQuery({ from, to });
  const { data: expenses } = trpc.expenses.listByDateRange.useQuery({ from, to });
  const { data: camping } = trpc.camping.sales.listByDateRange.useQuery({ from, to });
  const { data: salesSummary } = trpc.sales.summaryByDateRange.useQuery({ from, to });
  const { data: expenseSummary } = trpc.expenses.summaryByDateRange.useQuery({ from, to });
  const { data: campingSummary } = trpc.camping.sales.summaryByDateRange.useQuery({ from, to });

  const totalIncome = Number(salesSummary?.total ?? 0) + Number(campingSummary?.total ?? 0);
  const totalExpense = Number(expenseSummary?.total ?? 0);
  const netProfit = totalIncome - totalExpense;

  const pieData = [
    { name: "Restaurant Sales", value: Number(salesSummary?.total ?? 0) },
    { name: "Camping Sales", value: Number(campingSummary?.total ?? 0) },
    { name: "Expenses", value: Number(expenseSummary?.total ?? 0) },
  ].filter((d) => d.value > 0);

  const handleExport = () => {
    const data = [
      ...((sales || []).map((s) => ({ type: "Sale", date: format(new Date(s.dateTime), "yyyy-MM-dd HH:mm"), amount: Number(s.totalAmount), source: s.source, payment: s.paymentMethod }))),
      ...((expenses || []).map((e) => ({ type: "Expense", date: format(new Date(e.dateTime), "yyyy-MM-dd HH:mm"), amount: Number(e.amount), category: e.category, payment: e.paymentMethod }))),
      ...((camping || []).map((c) => ({ type: "Camping", date: format(new Date(c.dateTime), "yyyy-MM-dd HH:mm"), amount: Number(c.totalAmount), customer: c.customerName, payment: c.paymentMethod }))),
    ];
    exportToExcel(data, `Today_Report_${format(today, "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[var(--primary)]" />
            Today&apos;s Report
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">{format(today, "EEEE, MMMM do, yyyy")}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Restaurant Sales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">Rs. {Number(salesSummary?.total ?? 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Camping Sales</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">Rs. {Number(campingSummary?.total ?? 0).toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Total Expenses</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-[var(--destructive)]">Rs. {totalExpense.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Net Profit</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {netProfit.toLocaleString()}</p></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">Revenue Breakdown</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Payment</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {sales?.map((s) => (
                    <TableRow key={`s-${s.id}`}>
                      <TableCell className="text-xs">Sale</TableCell>
                      <TableCell className="text-xs text-green-600">+Rs. {Number(s.totalAmount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{s.paymentMethod}</TableCell>
                    </TableRow>
                  ))}
                  {expenses?.map((e) => (
                    <TableRow key={`e-${e.id}`}>
                      <TableCell className="text-xs">Expense</TableCell>
                      <TableCell className="text-xs text-red-600">-Rs. {Number(e.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{e.paymentMethod}</TableCell>
                    </TableRow>
                  ))}
                  {camping?.map((c) => (
                    <TableRow key={`c-${c.id}`}>
                      <TableCell className="text-xs">Camping</TableCell>
                      <TableCell className="text-xs text-green-600">+Rs. {Number(c.totalAmount).toLocaleString()}</TableCell>
                      <TableCell className="text-xs">{c.paymentMethod}</TableCell>
                    </TableRow>
                  ))}
                  {(!sales?.length && !expenses?.length && !camping?.length) && (
                    <TableRow><TableCell colSpan={3} className="text-center text-[var(--muted-foreground)]">No transactions today</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
