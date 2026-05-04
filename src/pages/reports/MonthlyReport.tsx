import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import * as XLSX from "xlsx";

function exportToExcel(data: unknown[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MonthlyReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const { data } = trpc.reports.monthlyProfitLoss.useQuery({ year });

  const chartData = (data || []).map((d) => ({
    month: MONTHS[d.month - 1],
    sales: d.sales,
    camping: d.camping,
    expenses: d.expenses,
    profit: d.profit,
  }));

  const handleExport = () => {
    exportToExcel(chartData.map((d) => ({ month: d.month, sales: d.sales, camping: d.camping, expenses: d.expenses, profit: d.profit })), `Monthly_Report_${year}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-[var(--primary)]" />
            Monthly Report
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">Year: {year}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setYear((y) => y - 1)}>Previous Year</Button>
          <Button variant="outline" size="sm" onClick={() => setYear(new Date().getFullYear())}>Current Year</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg font-serif">Monthly Overview</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
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
              <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
              <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
              <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
