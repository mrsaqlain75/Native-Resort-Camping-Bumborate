import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";

export default function YearComparison() {
  const [year1, setYear1] = useState(new Date().getFullYear() - 1);
  const [year2, setYear2] = useState(new Date().getFullYear());
  const [submitted, setSubmitted] = useState(false);

  const { data } = trpc.reports.yearByYearComparison.useQuery(
    { year1, year2 },
    { enabled: submitted }
  );

  const handleCompare = () => {
    setSubmitted(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <ArrowLeftRight className="h-6 w-6 text-[var(--primary)]" />
          Year by Year Comparison
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">Compare financial performance across years</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>Year 1</Label>
              <Input type="number" value={year1} onChange={(e) => setYear1(Number(e.target.value))} />
            </div>
            <div>
              <Label>Year 2</Label>
              <Input type="number" value={year2} onChange={(e) => setYear2(Number(e.target.value))} />
            </div>
            <Button onClick={handleCompare}>Compare</Button>
          </div>
        </CardContent>
      </Card>

      {submitted && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">{data.year1.year}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Restaurant Sales</span><span className="font-semibold">Rs. {data.year1.sales.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Camping Sales</span><span className="font-semibold">Rs. {data.year1.camping.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Total Income</span><span className="font-semibold text-green-600">Rs. {data.year1.income.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Expenses</span><span className="font-semibold text-red-600">Rs. {data.year1.expenses.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2"><span className="font-bold">Net Profit</span><span className={`font-bold ${data.year1.profit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {data.year1.profit.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Profit Margin</span><span className="font-semibold">{data.year1.margin.toFixed(1)}%</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-serif">{data.year2.year}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Restaurant Sales</span><span className="font-semibold">Rs. {data.year2.sales.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Camping Sales</span><span className="font-semibold">Rs. {data.year2.camping.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Total Income</span><span className="font-semibold text-green-600">Rs. {data.year2.income.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Expenses</span><span className="font-semibold text-red-600">Rs. {data.year2.expenses.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-[var(--border)] pt-2"><span className="font-bold">Net Profit</span><span className={`font-bold ${data.year2.profit >= 0 ? "text-green-600" : "text-red-600"}`}>Rs. {data.year2.profit.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-[var(--muted-foreground)]">Profit Margin</span><span className="font-semibold">{data.year2.margin.toFixed(1)}%</span></div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-serif">Changes</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ChangeCard title="Sales Change" value={data.comparison.salesChange} />
              <ChangeCard title="Expenses Change" value={data.comparison.expensesChange} isNegativeGood />
              <ChangeCard title="Income Change" value={data.comparison.incomeChange} />
              <ChangeCard title="Profit Change" value={data.comparison.profitChange} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function ChangeCard({ title, value, isNegativeGood }: { title: string; value: number; isNegativeGood?: boolean }) {
  const isPositive = value >= 0;
  const isGood = isNegativeGood ? !isPositive : isPositive;
  return (
    <div className="p-4 rounded-lg bg-[var(--muted)]/30 space-y-2">
      <p className="text-sm text-[var(--muted-foreground)]">{title}</p>
      <div className="flex items-center gap-2">
        {isGood ? <TrendingUp className="h-5 w-5 text-green-600" /> : <TrendingDown className="h-5 w-5 text-red-600" />}
        <span className={`text-xl font-bold ${isGood ? "text-green-600" : "text-red-600"}`}>{value > 0 ? "+" : ""}{value.toFixed(1)}%</span>
      </div>
    </div>
  );
}
