import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Landmark, Filter } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

function exportToExcel(data: unknown[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}

export default function IncomePage() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [submitted, setSubmitted] = useState(false);

  const { data: sales } = trpc.sales.listByDateRange.useQuery(
    { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    { enabled: submitted }
  );
  const { data: camping } = trpc.camping.sales.listByDateRange.useQuery(
    { from: new Date(from).toISOString(), to: new Date(to).toISOString() },
    { enabled: submitted }
  );

  const filteredSales = (sales || []).filter((s) => {
    if (paymentFilter !== "all" && s.paymentMethod !== paymentFilter) return false;
    if (sourceFilter !== "all" && s.source !== sourceFilter) return false;
    return true;
  });

  const totalSales = filteredSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
  const totalCamping = (camping || []).reduce((sum, c) => sum + Number(c.totalAmount), 0);
  const grandTotal = totalSales + totalCamping;

  const handleExport = () => {
    const data = [
      ...filteredSales.map((s) => ({
        type: "Restaurant Sale",
        date: format(new Date(s.dateTime), "yyyy-MM-dd HH:mm"),
        amount: Number(s.totalAmount),
        payment: s.paymentMethod,
        source: s.source,
        items: s.items.map((i) => `${i.name} x${i.quantity}`).join(", "),
      })),
      ...(camping || []).map((c) => ({
        type: "Camping Sale",
        date: format(new Date(c.dateTime), "yyyy-MM-dd HH:mm"),
        amount: Number(c.totalAmount),
        payment: c.paymentMethod,
        source: "camping",
        items: `${c.customerName} — ${c.nights} nights`,
      })),
    ];
    exportToExcel(data, `Income_Report_${from}_to_${to}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-serif flex items-center gap-2">
            <Landmark className="h-6 w-6 text-[var(--primary)]" />
            Total Income
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">All income sources with filters</p>
        </div>
        <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" /> Export Excel</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label>Payment</Label>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="e_transaction">E-Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="dine_in">Dine-In</SelectItem>
                  <SelectItem value="online_order">Online</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setSubmitted(true)}><Filter className="h-4 w-4 mr-1" /> Apply</Button>
          </div>
        </CardContent>
      </Card>

      {submitted && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Restaurant Sales</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">Rs. {totalSales.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Camping Sales</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold">Rs. {totalCamping.toLocaleString()}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-[var(--muted-foreground)]">Grand Total</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold text-green-600">Rs. {grandTotal.toLocaleString()}</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg font-serif">Income Records</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((s) => (
                      <TableRow key={`s-${s.id}`}>
                        <TableCell><span className="px-2 py-1 rounded-full text-xs bg-[#FF808020] text-[#FF8080]">Sale</span></TableCell>
                        <TableCell className="text-xs">{format(new Date(s.dateTime), "MMM dd, yyyy HH:mm")}</TableCell>
                        <TableCell className="text-xs">{s.items.map((i) => `${i.name} x${i.quantity}`).join(", ")}</TableCell>
                        <TableCell className="text-xs">{s.paymentMethod}</TableCell>
                        <TableCell className="text-right font-semibold">Rs. {Number(s.totalAmount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {(camping || []).map((c) => (
                      <TableRow key={`c-${c.id}`}>
                        <TableCell><span className="px-2 py-1 rounded-full text-xs bg-[#FFCF9620] text-[#FFCF96]">Camping</span></TableCell>
                        <TableCell className="text-xs">{format(new Date(c.dateTime), "MMM dd, yyyy HH:mm")}</TableCell>
                        <TableCell className="text-xs">{c.customerName} — {c.nights} nights</TableCell>
                        <TableCell className="text-xs">{c.paymentMethod}</TableCell>
                        <TableCell className="text-right font-semibold">Rs. {Number(c.totalAmount).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {filteredSales.length === 0 && (!camping || camping.length === 0) && (
                      <TableRow><TableCell colSpan={5} className="text-center text-[var(--muted-foreground)]">No income records found</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
