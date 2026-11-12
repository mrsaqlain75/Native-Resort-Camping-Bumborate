import { useMemo, useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AddSale from "@/pages/sales/AddSale";
import AddCampingSale from "@/pages/camping/AddCampingSale";
import AddExpense from "@/pages/expenses/AddExpense";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Trash2, Search, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type ViewType = "all" | "restaurant" | "camping" | "expenses";

type CombinedRecord = {
  id: number;
  type: ViewType;
  dateTime: string;
  totalAmount?: number;
  amount?: number;
  [key: string]: any;
};

// Expense rows store money as numeric strings; fall back to amount × qty.
const expenseTotalOf = (record: any): number =>
  Number(record.total || (Number(record.amount) * (record.quantity || 1))) || 0;

const vendorOf = (record: any): string => record.paidTo || "No Vendor";

export default function SalesExpenses() {
  const utils = trpc.useUtils();
  const [view, setView] = useState<ViewType>("restaurant");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<{ id: number; type: string } | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<CombinedRecord | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 20;

  const { data: restaurantSales, isLoading: salesLoading, refetch: refetchSales } = trpc.sales.list.useQuery(undefined, {
    enabled: view === "restaurant" || view === "all",
  });

  const { data: campingSales, isLoading: campingLoading, refetch: refetchCamping } = trpc.camping.sales.list.useQuery(undefined, {
    enabled: view === "camping" || view === "all",
  });

  const { data: expenses, isLoading: expensesLoading, refetch: refetchExpenses } = trpc.expenses.list.useQuery(undefined, {
    enabled: view === "expenses" || view === "all",
  });

  const deleteSale = trpc.sales.delete.useMutation({
    onSuccess: () => {
      toast.success("Sale deleted successfully");
      refetchSales();
      utils.reports.dashboardSummary.invalidate();
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteCampingSale = trpc.camping.sales.delete.useMutation({
    onSuccess: () => {
      toast.success("Camping sale deleted successfully");
      refetchCamping();
      utils.reports.dashboardSummary.invalidate();
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteExpense = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      toast.success("Expense deleted successfully");
      refetchExpenses();
      utils.reports.dashboardSummary.invalidate();
      setIsDeleteDialogOpen(false);
      setRecordToDelete(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredRecords = useMemo((): CombinedRecord[] => {
    let records: CombinedRecord[] = [];

    if (view === "all") {
      records = [
        ...(restaurantSales || []).map((sale: any) => ({ ...sale, type: "restaurant" as const })),
        ...(campingSales || []).map((sale: any) => ({ ...sale, type: "camping" as const })),
        ...(expenses || []).map((expense: any) => ({ ...expense, type: "expenses" as const })),
      ];
    } else if (view === "restaurant" && restaurantSales) {
      records = restaurantSales.map((sale: any) => ({ ...sale, type: "restaurant" as const }));
    } else if (view === "camping" && campingSales) {
      records = campingSales.map((sale: any) => ({ ...sale, type: "camping" as const }));
    } else if (view === "expenses" && expenses) {
      records = expenses.map((expense: any) => ({ ...expense, type: "expenses" as const }));
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      records = records.filter((record) => {
        if (record.type === "restaurant") {
          const items = record.items || [];
          const itemNames = items.map((i: any) => i.name).join(" ");
          return (
            itemNames.toLowerCase().includes(q) ||
            record.customerName?.toLowerCase().includes(q)
          );
        } else if (record.type === "camping") {
          return record.customerName?.toLowerCase().includes(searchTerm.toLowerCase());
        } else {
          return record.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            record.paidTo?.toLowerCase().includes(searchTerm.toLowerCase());
        }
      });
    }

    if (dateFilter !== "all") {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date();

      if (dateFilter === "today") {
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
      } else if (dateFilter === "week") {
        const day = now.getDay();
        startDate = new Date(now);
        startDate.setDate(now.getDate() - day);
        startDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (dateFilter === "year") {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else if (dateFilter === "custom" && customStartDate && customEndDate) {
        startDate = new Date(customStartDate);
        endDate = new Date(customEndDate);
      } else {
        return records;
      }

      records = records.filter((record) => {
        const recordDate = new Date(record.dateTime);
        return recordDate >= startDate && recordDate <= endDate;
      });
    }

    records.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());

    return records;
  }, [view, restaurantSales, campingSales, expenses, searchTerm, dateFilter, customStartDate, customEndDate]);

  const totals = useMemo(() => {
    let restaurant = 0;
    let camping = 0;
    let expensesTotal = 0;
    let restaurantCount = 0;
    let campingCount = 0;
    let expensesCount = 0;
    for (const record of filteredRecords) {
      if (record.type === "restaurant") {
        restaurant += Number(record.totalAmount) || 0;
        restaurantCount++;
      } else if (record.type === "camping") {
        camping += Number(record.totalAmount) || 0;
        campingCount++;
      } else {
        expensesTotal += expenseTotalOf(record);
        expensesCount++;
      }
    }
    return { restaurant, camping, expensesTotal, restaurantCount, campingCount, expensesCount };
  }, [filteredRecords]);

  // Expenses grouped by vendor, for the grouped Expenses view
  const vendorGroups = useMemo(() => {
    const groups = new Map<string, { vendor: string; count: number; total: number }>();
    for (const record of filteredRecords) {
      if (record.type !== "expenses") continue;
      const vendor = vendorOf(record);
      const group = groups.get(vendor) || { vendor, count: 0, total: 0 };
      group.count++;
      group.total += expenseTotalOf(record);
      groups.set(vendor, group);
    }
    const list = [...groups.values()];
    list.sort((a, b) =>
      a.vendor === "No Vendor" ? 1 : b.vendor === "No Vendor" ? -1 : b.total - a.total
    );
    return list;
  }, [filteredRecords]);

  const isVendorListView = view === "expenses" && selectedVendor === null;

  const vendorExpenses = useMemo(() => {
    if (view !== "expenses" || selectedVendor === null) return [];
    return filteredRecords.filter(
      (record) => record.type === "expenses" && vendorOf(record) === selectedVendor
    );
  }, [filteredRecords, view, selectedVendor]);

  // Vendor list mode renders its own table; otherwise show filtered records
  // (vendor detail mode shows just that vendor's expenses).
  const displayedRecords =
    view === "expenses" && selectedVendor !== null ? vendorExpenses : filteredRecords;

  const start = (page - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = displayedRecords.slice(start, start + ITEMS_PER_PAGE);
  const totalPages = Math.ceil(displayedRecords.length / ITEMS_PER_PAGE);

  const handleDelete = () => {
    if (!recordToDelete) return;

    if (recordToDelete.type === "restaurant") {
      deleteSale.mutate({ id: recordToDelete.id });
    } else if (recordToDelete.type === "camping") {
      deleteCampingSale.mutate({ id: recordToDelete.id });
    } else {
      deleteExpense.mutate({ id: recordToDelete.id });
    }
  };

  const isLoading = salesLoading || campingLoading || expensesLoading;

  const getRowColor = (type: string) => {
    if (type === "restaurant") return "border-l-4 border-l-[var(--chart-1)]";
    if (type === "camping") return "border-l-4 border-l-[var(--chart-2)]";
    return "border-l-4 border-l-[var(--destructive)]";
  };

  const formatAmount = (amount: number) => `Rs. ${amount?.toLocaleString() || 0}`;

  const getDiscountAmount = (record: any) => {
    const value = Number(record.discountValue || 0);
    if (record.discountType !== "percentage") return value;
    const subtotal =
      record.type === "camping"
        ? Number(record.spotTotal || 0) + Number(record.servicesTotal || 0)
        : (record.items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0);
    return (subtotal * value) / 100;
  };

  const describeRecord = (record: CombinedRecord): string => {
    if (record.type === "restaurant") {
      const items = record.items || [];
      const names = items.map((i: any) => `${i.name} x${i.quantity}`);
      return names.length <= 2 ? names.join(", ") : `${names[0]} +${names.length - 1} more`;
    }
    if (record.type === "camping") {
      return `${record.numberOfCamps} camp${record.numberOfCamps === 1 ? "" : "s"}, ${record.nights} night${record.nights === 1 ? "" : "s"}`;
    }
    return record.name;
  };

  const formatPayment = (method: string) =>
    method === "cash" ? "Cash" : method === "e_transaction" ? "E-Transaction" : "Bank Transfer";

  const selectVendor = (vendor: string) => {
    setSelectedVendor(vendor);
    setPage(1);
  };

  // ── Totals shown below the table ──
  const renderTotals = () => {
    if (view === "all") {
      const net = totals.restaurant + totals.camping - totals.expensesTotal;
      return (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 border-t">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Restaurant Sales ({totals.restaurantCount})</p>
            <p className="text-base font-bold text-[var(--chart-1)]">+{formatAmount(totals.restaurant)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Camping Sales ({totals.campingCount})</p>
            <p className="text-base font-bold text-[var(--chart-2)]">+{formatAmount(totals.camping)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Total Income</p>
            <p className="text-base font-bold text-[var(--positive)]">+{formatAmount(totals.restaurant + totals.camping)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Expenses ({totals.expensesCount})</p>
            <p className="text-base font-bold text-[var(--destructive)]">-{formatAmount(totals.expensesTotal)}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">Net</p>
            <p className={`text-base font-bold ${net >= 0 ? "text-[var(--positive)]" : "text-[var(--destructive)]"}`}>
              {net >= 0 ? "+" : "-"}{formatAmount(Math.abs(net))}
            </p>
          </div>
        </div>
      );
    }

    // Single-type views (and vendor detail)
    const isExpenseView = view === "expenses";
    const totalValue = isExpenseView
      ? isVendorListView
        ? totals.expensesTotal
        : vendorExpenses.reduce((sum, r) => sum + expenseTotalOf(r), 0)
      : displayedRecords.reduce((sum, r) => sum + (Number(r.totalAmount) || 0), 0);
    const recordCount = isVendorListView ? totals.expensesCount : displayedRecords.length;

    return (
      <div className="flex justify-end items-center gap-6 p-4 border-t">
        <span className="text-sm text-[var(--muted-foreground)]">
          Total — {recordCount} record{recordCount === 1 ? "" : "s"}
        </span>
        <span className={`text-lg font-bold ${isExpenseView ? "text-[var(--destructive)]" : "text-[var(--positive)]"}`}>
          {isExpenseView ? "-" : "+"}{formatAmount(totalValue)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">Sales & Expenses</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Manage and track all restaurant sales, camping sales, and expenses
        </p>
      </div>

      <Tabs value={view} onValueChange={(v) => {
        setView(v as ViewType);
        setPage(1);
        setSelectedVendor(null);
      }}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="all">📋 All</TabsTrigger>
          <TabsTrigger value="restaurant">🍽️ Restaurant Sales</TabsTrigger>
          <TabsTrigger value="camping">🏕️ Camping Sales</TabsTrigger>
          <TabsTrigger value="expenses">💰 Expenses</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                <Input
                  placeholder="Search by item, customer, vendor, or expense name..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Date Range</Label>
              <Select
                value={dateFilter}
                onValueChange={(v) => {
                  setDateFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {dateFilter === "custom" && (
              <div className="flex gap-2">
                <div>
                  <Label>From</Label>
                  <Input type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} />
                </div>
                <div>
                  <Label>To</Label>
                  <Input type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : isVendorListView ? (
            /* ── Expenses grouped by vendor ── */
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Expenses</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorGroups.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-[var(--muted-foreground)]">
                        No expenses found for the selected filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    vendorGroups.map((group) => (
                      <TableRow
                        key={group.vendor}
                        className="cursor-pointer hover:bg-[var(--accent)]/50"
                        onClick={() => selectVendor(group.vendor)}
                      >
                        <TableCell className="font-medium">{group.vendor}</TableCell>
                        <TableCell>{group.count}</TableCell>
                        <TableCell className="font-bold text-[var(--destructive)]">
                          -{formatAmount(group.total)}
                        </TableCell>
                        <TableCell>
                          <ChevronRight className="h-4 w-4 text-[var(--muted-foreground)]" />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {renderTotals()}
            </div>
          ) : (
            <>
              {view === "expenses" && selectedVendor !== null && (
                <div className="p-4 border-b">
                  <Button variant="outline" size="sm" onClick={() => { setSelectedVendor(null); setPage(1); }}>
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Vendors
                  </Button>
                  <span className="ml-3 text-sm font-medium">{selectedVendor}</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      {view === "all" && (
                        <>
                          <TableHead>Type</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Amount</TableHead>
                        </>
                      )}
                      {view === "restaurant" && (
                        <>
                            <TableHead>Customer Name</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Tax</TableHead>
                            <TableHead>Source</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Amount</TableHead>
                        </>
                      )}
                      {view === "camping" && (
                          <>
                            <TableHead>Customer</TableHead>
                            <TableHead>Camps</TableHead>
                            <TableHead>Nights</TableHead>
                            <TableHead>Services</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Tax</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Amount</TableHead>
                          </>
                      )}
                      {view === "expenses" && (
                        <>
                          <TableHead>Expense Name</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Paid To</TableHead>
                          <TableHead>Payment</TableHead>
                        </>
                      )}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-[var(--muted-foreground)]">
                          No records found for the selected filters
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedRecords.map((record: any) => (
                        <TableRow key={`${record.type}-${record.id}`} className={getRowColor(record.type)}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(record.dateTime), "MMM dd, yyyy hh:mm a")}
                          </TableCell>

                          {view === "all" && (
                            <>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{record.type === "expenses" ? "expense" : record.type}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[280px] truncate" title={describeRecord(record)}>
                                {describeRecord(record)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{formatPayment(record.paymentMethod)}</Badge>
                              </TableCell>
                              <TableCell>
                                {record.type === "expenses" ? (
                                  <span className="font-bold text-[var(--destructive)]">
                                    -{formatAmount(expenseTotalOf(record))}
                                  </span>
                                ) : (
                                  <span className="font-semibold text-[var(--positive)]">
                                    +{formatAmount(Number(record.totalAmount))}
                                  </span>
                                )}
                              </TableCell>
                            </>
                          )}

                          {view !== "all" && record.type === "restaurant" && (
                            <>
                              <TableCell>{record.customerName || "Walk-in Customer"}</TableCell>
                              <TableCell>
                                {record.items?.map((item: any, i: number) => (
                                  <div key={i} className="text-sm">
                                    {item.name} x{item.quantity}
                                  </div>
                                ))}
                              </TableCell>
                              <TableCell>{getDiscountAmount(record) > 0 ? formatAmount(getDiscountAmount(record)) : "-"}</TableCell>
                              <TableCell>{record.taxPercent ? `${record.taxPercent}%` : "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {record.source === "dine_in" ? "Dine-In" : record.source === "online_order" ? "Online" : "Other"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{formatPayment(record.paymentMethod)}</Badge>
                              </TableCell>
                              <TableCell className="text-[var(--positive)] font-semibold">
                                +{formatAmount(record.totalAmount)}
                              </TableCell>
                            </>
                          )}

                          {view !== "all" && record.type === "camping" && (
                            <>
                              <TableCell className="font-medium">{record.customerName}</TableCell>
                              <TableCell>{record.numberOfCamps}</TableCell>
                              <TableCell>{record.nights}</TableCell>
                              <TableCell>
                                {record.services?.length > 0 ? record.services.map((s: any) => s.name).join(", ") : "-"}
                              </TableCell>
                              <TableCell>{getDiscountAmount(record) > 0 ? formatAmount(getDiscountAmount(record)) : "-"}</TableCell>
                              <TableCell>{record.taxPercent ? `${record.taxPercent}%` : "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{formatPayment(record.paymentMethod)}</Badge>
                              </TableCell>
                              <TableCell className="text-[var(--positive)] font-semibold">
                                +{formatAmount(record.totalAmount)}
                              </TableCell>
                            </>
                          )}

                          {view !== "all" && record.type === "expenses" && (
                            <>
                              <TableCell>{record.name}</TableCell>
                              <TableCell>Rs. {Number(record.amount).toLocaleString()}</TableCell>
                              <TableCell>{record.quantity || 0}</TableCell>
                              <TableCell className="font-bold text-[var(--primary)]">
                                Rs. {Number(record.total || (record.amount * (record.quantity || 1))).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">{record.category}</Badge>
                              </TableCell>
                              <TableCell>{record.paidTo || "-"}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{formatPayment(record.paymentMethod)}</Badge>
                              </TableCell>
                            </>
                          )}

                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setSelectedRecord(record);
                                  setIsUpdateModalOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setRecordToDelete({ id: record.id, type: record.type });
                                  setIsDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {renderTotals()}

              {totalPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

{/* Update Modal */}
<Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
  <DialogContent className="!max-w-none w-[95vw] max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>
        Update {selectedRecord?.type === "restaurant" ? "Sale" : selectedRecord?.type === "camping" ? "Camping Sale" : "Expense"}
      </DialogTitle>
    </DialogHeader>
    {selectedRecord?.type === "restaurant" && (
      <AddSale key={selectedRecord.id} saleToEdit={selectedRecord as any} onClose={() => setIsUpdateModalOpen(false)} />
    )}
    {selectedRecord?.type === "camping" && (
      <AddCampingSale key={selectedRecord.id} campingSaleToEdit={selectedRecord as any} onClose={() => setIsUpdateModalOpen(false)} />
    )}
    {selectedRecord?.type === "expenses" && (
      <AddExpense key={selectedRecord.id} expenseToEdit={selectedRecord as any} onClose={() => setIsUpdateModalOpen(false)} />
    )}
  </DialogContent>
</Dialog>

    </div>
  );
}
