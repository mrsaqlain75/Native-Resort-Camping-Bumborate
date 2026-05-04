import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subWeeks, subMonths, subYears } from "date-fns";
import * as XLSX from "xlsx";

function exportToExcel(data: unknown[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}

export default function SellingRankings() {
  const [period, setPeriod] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [offset, setOffset] = useState(0);

  const today = new Date();
  let from = "";
  let to = "";

  if (period === "weekly") {
    const s = startOfWeek(subWeeks(today, offset), { weekStartsOn: 0 });
    const e = endOfWeek(subWeeks(today, offset), { weekStartsOn: 0 });
    from = s.toISOString().split("T")[0];
    to = e.toISOString().split("T")[0];
  } else if (period === "monthly") {
    const s = startOfMonth(subMonths(today, offset));
    const e = endOfMonth(subMonths(today, offset));
    from = s.toISOString().split("T")[0];
    to = e.toISOString().split("T")[0];
  } else {
    const s = startOfYear(subYears(today, offset));
    const e = endOfYear(subYears(today, offset));
    from = s.toISOString().split("T")[0];
    to = e.toISOString().split("T")[0];
  }

  const { data: rankings } = trpc.sales.sellingRankings.useQuery({ from, to, limit: 20 });

  const chartData = (rankings || []).slice(0, 10).map((r) => ({
    name: r.name.length > 20 ? r.name.slice(0, 20) + "..." : r.name,
    revenue: r.revenue,
    quantity: r.quantity,
  }));

  const handleExport = () => {
    exportToExcel(rankings || [], `Selling_Rankings_${period}_${offset}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Award className="h-6 w-6 text-[var(--primary)]" />
            Selling Rankings
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">Top selling items by revenue</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => { setPeriod(v as typeof period); setOffset(0); }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setOffset((p) => p + 1)}>Previous</Button>
          {offset > 0 && <Button variant="outline" size="sm" onClick={() => setOffset(0)}>Current</Button>}
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">Top 10 by Revenue</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
                <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={11} width={120} />
                <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
                <Bar dataKey="revenue" fill="#FF8080" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg font-serif">Rankings Table</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty Sold</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(rankings || []).map((r, i) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-bold text-[var(--primary)]">{i + 1}</TableCell>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right">{r.quantity}</TableCell>
                      <TableCell className="text-right font-semibold">Rs. {r.revenue.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {(!rankings || rankings.length === 0) && (
                    <TableRow><TableCell colSpan={4} className="text-center text-[var(--muted-foreground)]">No sales data for this period</TableCell></TableRow>
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
