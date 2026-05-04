import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, CalendarRange } from "lucide-react";
import { format, startOfWeek, endOfWeek, subWeeks } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import * as XLSX from "xlsx";

function exportToExcel(data: unknown[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}

export default function WeeklyReport() {
  const [weekOffset, setWeekOffset] = useState(0);
  const today = new Date();
  const weekStart = startOfWeek(subWeeks(today, weekOffset), { weekStartsOn: 0 });
  const weekEnd = endOfWeek(subWeeks(today, weekOffset), { weekStartsOn: 0 });

  const { data: dailySales } = trpc.sales.dailyBreakdown.useQuery({
    from: weekStart.toISOString().split("T")[0],
    to: weekEnd.toISOString().split("T")[0],
  });
  const { data: dailyExpenses } = trpc.expenses.dailyBreakdown.useQuery({
    from: weekStart.toISOString().split("T")[0],
    to: weekEnd.toISOString().split("T")[0],
  });
  const { data: dailyCamping } = trpc.camping.sales.dailyBreakdown.useQuery({
    from: weekStart.toISOString().split("T")[0],
    to: weekEnd.toISOString().split("T")[0],
  });

  const dateMap = new Map<string, { day: string; sales: number; expenses: number; camping: number; profit: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const key = format(d, "yyyy-MM-dd");
    dateMap.set(key, { day: format(d, "EEE"), sales: 0, expenses: 0, camping: 0, profit: 0 });
  }

  for (const row of dailySales || []) {
    const d = dateMap.get(row.date);
    if (d) d.sales = Number(row.total);
  }
  for (const row of dailyExpenses || []) {
    const d = dateMap.get(row.date);
    if (d) d.expenses = Number(row.total);
  }
  for (const row of dailyCamping || []) {
    const d = dateMap.get(row.date);
    if (d) d.camping = Number(row.total);
  }
  for (const d of dateMap.values()) {
    d.profit = d.sales + d.camping - d.expenses;
  }

  const chartData = Array.from(dateMap.values());

  const handleExport = () => {
    exportToExcel(
      chartData.map((d) => ({ day: d.day, sales: d.sales, camping: d.camping, expenses: d.expenses, profit: d.profit })),
      `Weekly_Report_${format(weekStart, "yyyy-MM-dd")}.xlsx`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <CalendarRange className="h-6 w-6 text-[var(--primary)]" />
            Weekly Report
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {format(weekStart, "MMM dd")} — {format(weekEnd, "MMM dd, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setWeekOffset((p) => p + 1)}>Previous Week</Button>
          {weekOffset > 0 && <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)}>This Week</Button>}
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg font-serif">Day-by-Day Analysis</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
              <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
              <Bar dataKey="sales" fill="#FF8080" radius={[4, 4, 0, 0]} />
              <Bar dataKey="camping" fill="#FFCF96" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg font-serif">Profit Trend</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
              <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg font-serif">Detailed Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Camping</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chartData.map((d) => (
                  <TableRow key={d.day}>
                    <TableCell className="font-medium">{d.day}</TableCell>
                    <TableCell className="text-right text-green-600">Rs. {d.sales.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-amber-600">Rs. {d.camping.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">Rs. {d.expenses.toLocaleString()}</TableCell>
                    <TableCell className={`text-right font-semibold ${d.profit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {d.profit.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
