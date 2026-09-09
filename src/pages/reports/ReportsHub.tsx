import { useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CalendarRange, TrendingUp, CalendarDays, CalendarClock } from "lucide-react";
import WeeklyReport from "./WeeklyReport";
import MonthlyReport from "./MonthlyReport";
import YearlyReport from "./YearlyReport";
import DateRangeReport from "./DateRangeReport";

const TABS = [
  { value: "weekly", label: "Weekly", icon: CalendarRange, Component: WeeklyReport },
  { value: "monthly", label: "Monthly", icon: TrendingUp, Component: MonthlyReport },
  { value: "yearly", label: "Yearly", icon: BarChart3, Component: YearlyReport },
  { value: "range", label: "Custom Range", icon: CalendarClock, Component: DateRangeReport },
] as const;

export default function ReportsHub() {
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const active = TABS.some((t) => t.value === requested) ? (requested as string) : "weekly";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-[var(--primary)]" />
          Reports
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Weekly, monthly, yearly and custom date-range performance — all in one place.
        </p>
      </div>

      <Tabs
        value={active}
        onValueChange={(v) =>
          setParams(
            (prev) => {
              prev.set("tab", v);
              return prev;
            },
            { replace: true }
          )
        }
      >
        <TabsList className="h-auto flex-wrap gap-1 bg-[var(--muted)] p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 px-4 py-1.5">
                <Icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {TABS.map(({ value, Component }) => (
          <TabsContent key={value} value={value} className="mt-6">
            <Component />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
