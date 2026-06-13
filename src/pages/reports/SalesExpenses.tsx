import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Loader2, Edit, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type ViewType = "restaurant" | "camping" | "expenses";

type CombinedRecord = {
  id: number;
  type: ViewType;
  dateTime: string;
  totalAmount?: number;
  amount?: number;
  [key: string]: any;
};

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
  const ITEMS_PER_PAGE = 20;

  const { data: restaurantSales, isLoading: salesLoading, refetch: refetchSales } = trpc.sales.list.useQuery(undefined, {
    enabled: view === "restaurant",
  });

  const { data: campingSales, isLoading: campingLoading, refetch: refetchCamping } = trpc.camping.sales.list.useQuery(undefined, {
    enabled: view === "camping",
  });

  const { data: expenses, isLoading: expensesLoading, refetch: refetchExpenses } = trpc.expenses.list.useQuery(undefined, {
    enabled: view === "expenses",
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

  const getRecords = (): CombinedRecord[] => {
    let records: CombinedRecord[] = [];

    if (view === "restaurant" && restaurantSales) {
      records = restaurantSales.map((sale: any) => ({ ...sale, type: "restaurant" as const }));
    } else if (view === "camping" && campingSales) {
      records = campingSales.map((sale: any) => ({ ...sale, type: "camping" as const }));
    } else if (view === "expenses" && expenses) {
      records = expenses.map((expense: any) => ({ ...expense, type: "expenses" as const }));
    }

    if (searchTerm) {
      records = records.filter((record) => {
        if (record.type === "restaurant") {
          const items = record.items || [];
          const itemNames = items.map((i: any) => i.name).join(" ");
          return itemNames.toLowerCase().includes(searchTerm.toLowerCase());
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
  };

  const getPaginatedRecords = () => {
    const records = getRecords();
    const start = (page - 1) * ITEMS_PER_PAGE;
    return records.slice(start, start + ITEMS_PER_PAGE);
  };

  const getTotalPages = () => {
    return Math.ceil(getRecords().length / ITEMS_PER_PAGE);
  };

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
    if (type === "restaurant") return "border-l-4 border-l-green-500";
    if (type === "camping") return "border-l-4 border-l-blue-500";
    return "border-l-4 border-l-red-500";
  };

  const formatAmount = (amount: number) => `Rs. ${amount?.toLocaleString() || 0}`;

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
      }}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
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
                  placeholder="Search by item, customer, or expense name..."
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      {view === "restaurant" && (
                        <>
                          <TableHead>Items</TableHead>
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
                          <TableHead>Payment</TableHead>
                          <TableHead>Amount</TableHead>
                        </>
                      )}
                      {view === "expenses" && (
                        <>
                          <TableHead>Expense Name</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Paid To</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Amount</TableHead>
                        </>
                      )}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getPaginatedRecords().map((record: any) => (
                      <TableRow key={`${record.type}-${record.id}`} className={getRowColor(record.type)}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(record.dateTime), "MMM dd, yyyy hh:mm a")}
                        </TableCell>

                        {record.type === "restaurant" && (
                          <>
                            <TableCell>
                              {record.items?.map((item: any, i: number) => (
                                <div key={i} className="text-sm">
                                  {item.name} x{item.quantity}
                                </div>
                              ))}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.source === "dine_in" ? "Dine-In" : record.source === "online_order" ? "Online" : "Other"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.paymentMethod === "cash" ? "Cash" : "E-Transaction"}</Badge>
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold">
                              +{formatAmount(record.totalAmount)}
                            </TableCell>
                          </>
                        )}

                        {record.type === "camping" && (
                          <>
                            <TableCell className="font-medium">{record.customerName}</TableCell>
                            <TableCell>{record.numberOfCamps}</TableCell>
                            <TableCell>{record.nights}</TableCell>
                            <TableCell>
                              {record.services?.length > 0 ? record.services.map((s: any) => s.name).join(", ") : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{record.paymentMethod === "cash" ? "Cash" : "E-Transaction"}</Badge>
                            </TableCell>
                            <TableCell className="text-green-600 font-semibold">
                              +{formatAmount(record.totalAmount)}
                            </TableCell>
                          </>
                        )}

                        {record.type === "expenses" && (
                          <>
                            <TableCell>{record.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{record.category}</Badge>
                            </TableCell>
                            <TableCell>{record.paidTo || "-"}</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {record.paymentMethod === "cash" ? "Cash" : record.paymentMethod === "e_transaction" ? "E-Transaction" : "Bank Transfer"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-red-600 font-semibold">
                              -{formatAmount(record.amount)}
                            </TableCell>
                          </>
                        )}

                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toast.info("Update feature coming soon")}
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
                    ))}
                  </TableBody>
                </Table>
              </div>

              {getTotalPages() > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <Button
                    variant="outline"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {getTotalPages()}
                  </span>
                  <Button
                    variant="outline"
                    disabled={page === getTotalPages()}
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
    </div>
  );
}
