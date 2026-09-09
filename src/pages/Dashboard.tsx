import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  Tent,
  Activity,
} from "lucide-react";
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

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  color: string;
}) {
  return (
    <Card className="shadow-card transition-all duration-200 hover:-translate-y-0.5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-[var(--muted-foreground)]">
          {title}
        </CardTitle>
        <div
          className="grid h-9 w-9 place-items-center rounded-xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
          }}
        >
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-[1.7rem] font-bold tracking-tight">{value}</div>
        {trend && (
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  boxShadow: "0 10px 30px -12px rgb(0 0 0 / 0.2)",
  color: "var(--foreground)",
} as const;

export default function Dashboard() {
  const { user } = useAuth();
  const isOwner = user?.role === "admin";

  const { data: summary } = trpc.reports.dashboardSummary.useQuery();
  const { data: recent } = trpc.reports.recentActivity.useQuery();

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const { data: weeklyBreakdown } = trpc.reports.dailyProfitLoss.useQuery({
    from: startOfWeek.toISOString().split("T")[0],
    to: today.toISOString().split("T")[0],
  });

  const formatPKR = (val: number) =>
    `Rs. ${val.toLocaleString("en-PK", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const chartData =
    weeklyBreakdown?.map((d) => ({
      day: format(new Date(d.date), "EEE"),
      Sales: d.sales,
      Expenses: d.expenses,
      Camping: d.camping,
      Profit: d.profit,
    })) || [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Welcome back, {user?.name || "User"}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Today's Sales"
          value={formatPKR(summary?.today.sales ?? 0)}
          icon={Receipt}
          color="var(--chart-1)"
        />
        <StatCard
          title="Today's Expenses"
          value={formatPKR(summary?.today.expenses ?? 0)}
          icon={TrendingDown}
          color="var(--destructive)"
        />
        {isOwner && (
          <StatCard
            title="Today's Profit"
            value={formatPKR(summary?.today.profit ?? 0)}
            icon={TrendingUp}
            color="var(--chart-3)"
          />
        )}
        <StatCard
          title="Today's Camping"
          value={formatPKR(summary?.today.camping ?? 0)}
          icon={Tent}
          color="var(--chart-2)"
        />
      </div>

      {/* Weekly Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              This Week — Sales vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Rs.${v}`}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [
                    `Rs. ${value.toLocaleString()}`,
                    "",
                  ]}
                />
                <Bar dataKey="Sales" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar
                  dataKey="Expenses"
                  fill="var(--destructive)"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="Camping"
                  fill="var(--chart-2)"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Profit Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="day"
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `Rs.${v}`}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number) => [
                    `Rs. ${value.toLocaleString()}`,
                    "",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="Profit"
                  stroke="var(--chart-3)"
                  strokeWidth={2.5}
                  dot={{ fill: "var(--chart-3)", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif text-lg">
            <Activity className="h-5 w-5 text-[var(--primary)]" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {recent?.sales.slice(0, 3).map((sale) => (
              <div
                key={sale.id}
                className="flex items-center justify-between border-b border-[var(--border)] py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--primary)]/10">
                    <Receipt className="h-4 w-4 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Sale — {sale.items.map((i) => i.name).join(", ")}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {format(new Date(sale.dateTime), "MMM dd, yyyy hh:mm a")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[var(--positive)]">
                  +Rs. {Number(sale.totalAmount).toLocaleString()}
                </span>
              </div>
            ))}
            {recent?.expenses.slice(0, 2).map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between border-b border-[var(--border)] py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-full bg-[var(--destructive)]/10">
                    <DollarSign className="h-4 w-4 text-[var(--destructive)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      Expense — {expense.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {format(new Date(expense.dateTime), "MMM dd, yyyy hh:mm a")}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[var(--destructive)]">
                  -Rs. {Number(expense.total ?? expense.amount).toLocaleString()}
                </span>
              </div>
            ))}
            {!recent?.sales.length && !recent?.expenses.length && (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                No recent activity yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
