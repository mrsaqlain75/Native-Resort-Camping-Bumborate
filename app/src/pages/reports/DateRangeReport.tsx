import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, CalendarRange } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";

function exportToExcel(data: unknown[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}

export default function DateRangeReport() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitted, setSubmitted] = useState(false);

  const { data: dailyData } = trpc.reports.dailyProfitLoss.useQuery(
    { from, to },
    { enabled: submitted }
  );
  const { data: summary } = trpc.reports.profitLoss.useQuery(
    { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    { enabled: submitted }
  );

  const chartData = (dailyData || []).map((d) => ({
    date: format(parseISO(d.date), "MMM dd"),
    sales: d.sales,
    camping: d.camping,
    expenses: d.expenses,
    profit: d.profit,
  }));

  const handleGenerate = () => {
    setSubmitted(true);
  };

  const handleExport = () => {
    exportToExcel(chartData, `DateRange_Report_${from}_to_${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <CalendarRange className="h-6 w-6 text-[var(--primary)]" />
          Date Range Report
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">Generate report for any date range</p>
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
            <Button onClick={handleGenerate}>Generate Report</Button>
          </div>
        </CardContent>
      </Card>

      {submitted && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Total Income</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">Rs. {summary.totalIncome.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Total Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-600">Rs. {summary.expenseTotal.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Net Profit</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {summary.netProfit.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Profit Margin</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary.profitMargin.toFixed(1)}%</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-serif">Daily Breakdown</CardTitle>
              <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export</Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
                  <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
                  <Bar dataKey="sales" fill="#FF8080" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="camping" fill="#FFCF96" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <div className="overflow-x-auto mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Camping</TableHead>
                      <TableHead className="text-right">Expenses</TableHead>
                      <TableHead className="text-right">Profit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartData.map((d) => (
                      <TableRow key={d.date}>
                        <TableCell className="font-medium">{d.date}</TableCell>
                        <TableCell className="text-right text-green-600">Rs. {d.sales.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-amber-600">Rs. {d.camping.toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600">Rs. {d.expenses.toLocaleString()}</TableCell>
                        <TableCell className={`text-right font-semibold ${d.profit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {d.profit.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {chartData.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted-foreground)]">No data for selected range</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
