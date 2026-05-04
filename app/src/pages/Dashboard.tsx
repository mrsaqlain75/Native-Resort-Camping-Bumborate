import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Receipt, Tent, Activity } from "lucide-react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

function StatCard({ title, value, icon: Icon, trend, color }: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  color: string;
}) {
  return (
    <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">{title}</CardTitle>
        <div className="p-2 rounded-lg" style={{ backgroundColor: color + "20" }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {trend && <p className="text-xs text-[var(--muted-foreground)] mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user?.role === "admin";

  const { data: summary } = trpc.reports.dashboardSummary.useQuery();

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const { data: weeklyBreakdown } = trpc.reports.dailyProfitLoss.useQuery({
    from: startOfWeek.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  });

  const formatPKR = (val: number) => `Rs. ${val.toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const chartData = weeklyBreakdown?.map((d) => ({
    day: format(new Date(d.date), "EEE"),
    Sales: d.sales,
    Expenses: d.expenses,
    Camping: d.camping,
    Profit: d.profit,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Welcome back, {user?.name || "User"}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatPKR(summary?.today.sales ?? 0)}
          icon={Receipt}
          color="#FF8080"
        />
        <StatCard
          title="Today's Expenses"
          value={formatPKR(summary?.today.expenses ?? 0)}
          icon={TrendingDown}
          color="#ef4444"
        />
        {isOwner && (
          <StatCard
            title="Today's Profit"
            value={formatPKR(summary?.today.profit ?? 0)}
            icon={TrendingUp}
            color="#22c55e"
          />
        )}
        <StatCard
          title="Today's Camping"
          value={formatPKR(summary?.today.camping ?? 0)}
          icon={Tent}
          color="#FFCF96"
        />
      </div>

      {/* Weekly Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">This Week — Sales vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, ""]}
                />
                <Bar dataKey="Sales" fill="#FF8080" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Camping" fill="#FFCF96" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `Rs.${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`Rs. ${value.toLocaleString()}`, ""]}
                />
                <Line type="monotone" dataKey="Profit" stroke="#22c55e" strokeWidth={2} dot={{ fill: "#22c55e" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-serif flex items-center gap-2">
            <Activity className="h-5 w-5 text-[var(--primary)]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trpc.reports.recentActivity.useQuery().data?.sales.slice(0, 3).map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#FF808020] flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-[#FF8080]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sale — {sale.items.map((i) => i.name).join(", ")}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{format(new Date(sale.dateTime), "MMM dd, yyyy hh:mm a")}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#22c55e]">+Rs. {Number(sale.totalAmount).toLocaleString()}</span>
              </div>
            ))}
            {trpc.reports.recentActivity.useQuery().data?.expenses.slice(0, 2).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#ef444420] flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-[#ef4444]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Expense — {expense.name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{format(new Date(expense.dateTime), "MMM dd, yyyy hh:mm a")}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[#ef4444]">-Rs. {Number(expense.amount).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
