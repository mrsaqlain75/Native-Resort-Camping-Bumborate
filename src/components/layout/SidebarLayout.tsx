import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useTheme } from "@/contexts/theme-context";
import { useAuth } from "@/hooks/useAuth";
// Change from @/lib/utils to relative path
import { cn } from "../../lib/utils";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Sun,
  Moon,
  LogOut,
  ChefHat,
  Receipt,
  DollarSign,
  Utensils,
  Tent,
  MapPin,
  BarChart3,
  CalendarDays,
  CalendarRange,
  TrendingUp,
  Award,
  ArrowLeftRight,
  LayoutDashboard,
  List,
  Landmark,
  Wallet,
  ChevronDown,
  ChevronRight,
  Menu,
} from "lucide-react";

interface SidebarLayoutProps {
  children: React.ReactNode;
  isOwner: boolean;
}

const restaurantItems = [
  { path: "/sales/add", label: "Add Sale", icon: Receipt },
  { path: "/expenses/add", label: "Add Expense", icon: DollarSign },
  { path: "/menu", label: "Menu Management", icon: Utensils },
];

const campingItems = [
  { path: "/camping/sales", label: "Add Camping Sale", icon: Tent },
];

const reportItems = [
  { path: "/reports/today", label: "Today Report", icon: CalendarDays },
  { path: "/reports/weekly", label: "Weekly Report", icon: CalendarRange },
  { path: "/reports/monthly", label: "Monthly Report", icon: TrendingUp },
  { path: "/reports/yearly", label: "Yearly Report", icon: BarChart3 },
  { path: "/reports/range", label: "Date Range Report", icon: CalendarRange },
];

const ownerReportItems = [
  { path: "/reports/rankings", label: "Selling Rankings", icon: Award },
  { path: "/reports/comparison", label: "Year by Year", icon: ArrowLeftRight },
];

const ownerAnalysisItems = [
  { path: "/analysis", label: "Profit-Loss Analysis", icon: BarChart3 },
  { path: "/income", label: "Total Income", icon: Landmark },
  { path: "/expenses/list", label: "Total Expenses", icon: Wallet },
];

export function SidebarLayout({ children, isOwner }: SidebarLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { logout, user, isLoading: isLoggingOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    restaurant: true,
    camping: true,
    reports: true,
    analysis: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNavigation = (path: string) => {
    setNavigatingTo(path);
    setMobileOpen(false);
    setTimeout(() => {
      navigate(path);
      setTimeout(() => setNavigatingTo(null), 300);
    }, 150);
  };

  const NavItem = ({ path, label, icon: Icon }: { path: string; label: string; icon: React.ElementType }) => {
    const active = location.pathname === path;
    const isNavigating = navigatingTo === path;
    
    return (
      <button
        onClick={() => handleNavigation(path)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          active
            ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
            : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]",
          isNavigating && "opacity-50"
        )}
        disabled={isNavigating}
      >
        {isNavigating ? (
          <LoadingSpinner size="sm" className="shrink-0" />
        ) : (
          <Icon className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{label}</span>
      </button>
    );
  };

  const Section = ({ title, icon: Icon, items, sectionKey }: { title: string; icon: React.ElementType; items: typeof restaurantItems; sectionKey: string }) => {
    const expanded = expandedSections[sectionKey] ?? true;
    return (
      <div className="mb-1">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center gap-2 px-3 py-2 w-full text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] hover:text-[var(--sidebar-foreground)] transition-colors"
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">{title}</span>
          {expanded ? (
            <ChevronDown className="h-3 w-3 transition-transform duration-200" />
          ) : (
            <ChevronRight className="h-3 w-3 transition-transform duration-200" />
          )}
        </button>
        <div
          className={cn(
            "mt-1 space-y-0.5 pl-2 overflow-hidden transition-all duration-300 ease-in-out",
            expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          {items.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </div>
      </div>
    );
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transition-transform duration-300 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="p-8 border-b border-[var(--sidebar-border)]">
          <Link 
            to="/" 
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 group"
          >
            <div className="h-16 w-16 rounded-lg bg-[var(--primary)] flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 duration-200">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 339 328" className="w-12 h-12">
                <g transform="translate(0,328) scale(0.1,-0.1)" fill="#141414" stroke="none" strokeWidth="25" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M1585 2968 c-88 -61 -205 -143 -260 -182 -55 -39 -295 -204 -533 -366 l-431 -295 -1 -382 0 -383 30 0 30 0 0 359 0 359 403 278 c221 153 521 360 665 460 l264 182 96 -67 c140 -98 1031 -714 1135 -785 l87 -60 0 -753 0 -753 35 0 35 0 0 769 0 770 -292 204 c-459 319 -1094 757 -1100 757 -2 0 -75 -50 -163 -112z M652 1492 l-454 -448 74 -72 73 -71 48 47 47 46 0 -382 0 -382 1385 0 c762 0 1385 3 1385 6 0 4 -169 253 -375 555 l-375 549 55 76 c31 41 58 81 61 88 2 6 -7 22 -21 34 l-25 22 -50 -75 c-28 -41 -54 -75 -58 -75 -4 1 -30 34 -57 74 l-50 74 -28 -24 -27 -23 60 -85 61 -85 -158 -229 c-87 -126 -221 -323 -298 -439 -77 -116 -142 -212 -145 -212 -3 -1 -4 117 -2 261 1 145 2 266 2 270 0 4 20 -14 44 -40 l44 -46 77 69 78 69 -454 448 c-250 246 -456 447 -459 447 -3 0 -209 -201 -458 -447z m868 -56 c379 -379 399 -401 383 -418 -9 -10 -20 -18 -26 -18 -5 0 -180 169 -388 376 l-378 376 -365 -362 c-201 -200 -375 -370 -387 -378 -19 -13 -23 -12 -42 7 l-22 22 405 399 c223 219 408 398 412 397 4 -1 188 -182 408 -401z m-253 62 c35 -34 63 -65 63 -68 0 -3 -99 -5 -220 -5 -121 0 -220 2 -220 5 0 3 26 31 58 62 l57 57 90 4 c50 1 94 4 100 5 5 1 38 -26 72 -60z m208 -208 l69 -70 -434 0 -434 0 69 70 69 70 296 0 296 0 69 -70z m1123 -272 c364 -532 482 -707 482 -712 0 -3 -82 -6 -182 -6 l-183 1 -74 167 c-41 92 -105 235 -143 319 l-68 152 0 155 c0 86 2 156 4 156 3 0 76 -105 164 -232z m-238 -127 c-12 -31 -69 -176 -128 -324 l-106 -267 -184 0 c-143 0 -183 3 -179 13 5 12 129 196 441 651 l171 250 3 -133 c2 -115 0 -141 -18 -190z m-688 202 c32 -32 58 -61 58 -65 0 -10 -1224 -11 -1234 -1 -3 4 20 34 53 67 l60 61 503 -3 503 -2 57 -57z m-244 -463 l-3 -331 -115 -2 c-104 -1 -115 0 -114 16 1 9 2 159 3 332 l1 315 115 0 115 0 -2 -330z m-728 265 l0 -55 -100 0 -100 0 0 55 0 55 100 0 100 0 0 -55z m1000 0 l0 -55 -105 0 -105 0 0 55 0 55 105 0 105 0 0 -55z m-570 -125 l0 -160 -85 0 -85 0 0 -30 0 -30 85 0 85 0 0 -127 0 -128 -175 0 -175 0 0 318 0 317 175 0 175 0 0 -160z m-430 -65 l0 -55 -100 0 -100 0 0 55 0 55 100 0 100 0 0 -55z m1000 0 l0 -55 -105 0 -105 0 0 55 0 55 105 0 105 0 0 -55z m-1000 -170 l0 -55 -100 0 -100 0 0 55 0 55 100 0 100 0 0 -55z m1000 0 l0 -55 -105 0 -105 0 0 55 0 55 105 0 105 0 0 -55z m-1000 -175 l0 -60 -100 0 -100 0 0 60 0 60 100 0 100 0 0 -60z m1000 18 c0 -67 -17 -78 -122 -78 l-88 0 0 60 0 60 105 0 105 0 0 -42z"/>
                </g>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-[var(--sidebar-foreground)] leading-tight truncate">
                Native Resort
              </h1>
              <p className="text-[10px] text-[var(--muted-foreground)] leading-tight truncate">
                Guides . Cuisines . Events
              </p>
            </div>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <NavItem path="/" label="Dashboard" icon={LayoutDashboard} />

          <div className="pt-2">
            <Section title="Restaurant" icon={ChefHat} items={restaurantItems} sectionKey="restaurant" />
          </div>

          <div className="pt-1">
            <Section title="Camping" icon={Tent} items={campingItems} sectionKey="camping" />
          </div>

          <div className="pt-1">
            <Section title="Reporting" icon={BarChart3} items={reportItems} sectionKey="reports" />
          </div>

          {isOwner && (
            <div className="pt-1">
              <Section title="Analysis" icon={List} items={[...ownerReportItems, ...ownerAnalysisItems]} sectionKey="analysis" />
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-[var(--sidebar-border)] space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-[var(--muted-foreground)] group">
            <div className="h-6 w-6 rounded-full bg-[var(--accent)] flex items-center justify-center transition-transform group-hover:scale-105 duration-200">
              <span className="text-[10px] font-bold text-[var(--accent-foreground)]">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <span className="truncate">{user?.name || "User"}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider bg-[var(--primary)]/10 px-2 py-0.5 rounded-full">
              {isOwner ? "Owner" : "Manager"}
            </span>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              "text-[var(--muted-foreground)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)]",
              isLoggingOut && "opacity-50 cursor-not-allowed"
            )}
          >
            {isLoggingOut ? (
              <>
                <LoadingSpinner size="sm" className="shrink-0" />
                <span>Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </>
            )}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col lg:ml-72 min-w-0">
        <header className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-md border-b border-[var(--border)] px-4 lg:px-6 py-3 flex items-center gap-4">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-[var(--muted)] transition-colors"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {navigatingTo && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] animate-in fade-in duration-200">
              <LoadingSpinner size="sm" />
              <span>Loading...</span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-[var(--muted)] transition-all duration-200 hover:scale-105"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              "p-2 rounded-lg transition-all duration-200",
              "text-[var(--muted-foreground)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] hover:scale-105",
              isLoggingOut && "opacity-50 cursor-not-allowed"
            )}
            aria-label="Logout"
          >
            {isLoggingOut ? (
              <LoadingSpinner size="sm" />
            ) : (
              <LogOut className="h-5 w-5" />
            )}
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          {navigatingTo ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 animate-in fade-in duration-300">
              <LoadingSpinner size="lg" />
              <p className="text-sm text-[var(--muted-foreground)] animate-pulse">
                Loading...
              </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}