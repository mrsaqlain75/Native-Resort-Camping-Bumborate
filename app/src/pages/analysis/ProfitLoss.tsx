import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { BarChart3, TrendingUp, TrendingDown, DollarSign } from "lucide-react";

const COLORS = ["#FF8080", "#FFCF96", "#F6FDC3", "#CDFAD5", "#88dd99", "#66bbdd"];

export default function ProfitLoss() {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "yearly">("monthly");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitted, setSubmitted] = useState(false);

  const { data: summary } = trpc.reports.profitLoss.useQuery(
    { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    { enabled: submitted }
  );

  const { data: dailyData } = trpc.reports.dailyProfitLoss.useQuery(
    { from, to },
    { enabled: submitted && period === "daily" }
  );

  const { data: monthlyData } = trpc.reports.monthlyProfitLoss.useQuery(
    { year: new Date(from).getFullYear() },
    { enabled: submitted && period === "monthly" }
  );

  const { data: yearlyData } = trpc.reports.yearlyProfitLoss.useQuery(undefined, {
    enabled: submitted && period === "yearly",
  });

  const pieData = summary ? [
    { name: "Restaurant Sales", value: summary.salesTotal },
    { name: "Camping Sales", value: summary.campingTotal },
    { name: "Expenses", value: summary.expenseTotal },
  ].filter((d) => d.value > 0) : [];

  const chartData = period === "daily"
    ? (dailyData || []).map((d) => ({ label: d.date.slice(5), sales: d.sales, camping: d.camping, expenses: d.expenses, profit: d.profit }))
    : period === "monthly"
    ? (monthlyData || []).map((d) => ({ label: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][d.month - 1], sales: d.sales, camping: d.camping, expenses: d.expenses, profit: d.profit }))
    : (yearlyData || []).map((d) => ({ label: String(d.year), sales: d.sales, camping: d.camping, expenses: d.expenses, profit: d.profit }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-[var(--primary)]" />
          Profit-Loss Analysis
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">Comprehensive financial performance analysis</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Period</Label>
              <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <Button onClick={() => setSubmitted(true)}>Analyze</Button>
          </div>
        </CardContent>
      </Card>

      {submitted && summary && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)] flex items-center gap-2"><DollarSign className="h-4 w-4" />Total Income</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">Rs. {summary.totalIncome.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)] flex items-center gap-2"><TrendingDown className="h-4 w-4" />Total Expenses</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-red-600">Rs. {summary.expenseTotal.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)] flex items-center gap-2"><TrendingUp className="h-4 w-4" />Net Profit</CardTitle></CardHeader>
              <CardContent><p className={`text-2xl font-bold ${summary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {summary.netProfit.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Profit Margin</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">{summary.profitMargin.toFixed(1)}%</p></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg font-serif">Income vs Expenses</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg font-serif">Trend Analysis</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
                    <Tooltip formatter={(v: number) => `Rs. ${v.toLocaleString()}`} contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }} />
                    <Bar dataKey="sales" fill="#FF8080" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="camping" fill="#FFCF96" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
