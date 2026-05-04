import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tent, Printer } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";

const CAMPING_SERVICES = [
  { name: "Firewood", price: 500 },
  { name: "BBQ Kit", price: 1200 },
  { name: "Extra Tent", price: 2000 },
  { name: "Bedding Set", price: 800 },
  { name: "Guided Tour", price: 1500 },
  { name: "Breakfast", price: 600 },
  { name: "Dinner", price: 1000 },
];

export default function AddCampingSale() {
  const utils = trpc.useUtils();
  const { data: spots } = trpc.camping.spots.list.useQuery();

  const [customerName, setCustomerName] = useState("");
  const [spotId, setSpotId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [peopleCount, setPeopleCount] = useState(2);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "e_transaction">("cash");
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [receiptData, setReceiptData] = useState<{
    id: number;
    customerName: string;
    spotName: string;
    checkIn: string;
    checkOut: string;
    peopleCount: number;
    nights: number;
    services: { name: string; price: number }[];
    spotTotal: number;
    servicesTotal: number;
    totalAmount: number;
    paymentMethod: string;
    dateTime: string;
  } | null>(null);

  const selectedSpot = spots?.find((s) => s.id === Number(spotId));
  const nights = checkIn && checkOut ? Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn))) : 0;
  const spotTotal = selectedSpot ? Number(selectedSpot.pricePerNight) * nights : 0;
  const servicesTotal = selectedServices.reduce((sum, sName) => {
    const svc = CAMPING_SERVICES.find((s) => s.name === sName);
    return sum + (svc?.price || 0);
  }, 0);
  const totalAmount = spotTotal + servicesTotal;

  const createSale = trpc.camping.sales.create.useMutation({
    onSuccess: () => {
      toast.success("Camping sale recorded!");
      utils.reports.dashboardSummary.invalidate();
      utils.camping.sales.list.invalidate();
      if (selectedSpot) {
        setReceiptData({
          id: Date.now(),
          customerName,
          spotName: selectedSpot.name,
          checkIn,
          checkOut,
          peopleCount,
          nights,
          services: selectedServices.map((sName) => ({ name: sName, price: CAMPING_SERVICES.find((s) => s.name === sName)?.price || 0 })),
          spotTotal,
          servicesTotal,
          totalAmount,
          paymentMethod,
          dateTime,
        });
      }
      resetForm();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setCustomerName("");
    setSpotId("");
    setCheckIn("");
    setCheckOut("");
    setPeopleCount(2);
    setSelectedServices([]);
    setPaymentMethod("cash");
    setDateTime(new Date().toISOString().slice(0, 16));
    setNote("");
  };

  const handleSubmit = () => {
    if (!customerName || !spotId || !checkIn || !checkOut) {
      toast.error("Please fill all required fields");
      return;
    }
    createSale.mutate({
      spotId: Number(spotId),
      customerName,
      checkIn,
      checkOut,
      peopleCount,
      services: selectedServices.map((sName) => ({ name: sName, price: CAMPING_SERVICES.find((s) => s.name === sName)?.price || 0 })),
      nights,
      spotTotal,
      servicesTotal,
      totalAmount,
      paymentMethod,
      dateTime,
      note: note || undefined,
    });
  };

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">Add Camping Sale</h1>
        <p className="text-sm text-[var(--muted-foreground)]">Record a new camping reservation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tent className="h-5 w-5 text-[var(--primary)]" />
            Reservation Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Label>Customer Name</Label>
              <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer full name" />
            </div>
            <div>
              <Label>Camping Spot</Label>
              <Select value={spotId} onValueChange={setSpotId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a spot" />
                </SelectTrigger>
                <SelectContent>
                  {spots?.map((spot) => (
                    <SelectItem key={spot.id} value={String(spot.id)}>
                      {spot.name} — Rs. {Number(spot.pricePerNight)}/night (Capacity: {spot.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <Label>Check-In Date</Label>
              <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
            </div>
            <div>
              <Label>Check-Out Date</Label>
              <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
            </div>
            <div>
              <Label>Number of People</Label>
              <Input type="number" min={1} value={peopleCount} onChange={(e) => setPeopleCount(Number(e.target.value))} />
            </div>
          </div>

          {nights > 0 && (
            <div className="p-3 rounded-lg bg-[var(--muted)]/30 text-sm">
              <p>Nights: <strong>{nights}</strong></p>
              <p>Spot Price: <strong>Rs. {spotTotal.toLocaleString()}</strong> (Rs. {selectedSpot ? Number(selectedSpot.pricePerNight).toLocaleString() : 0} x {nights})</p>
            </div>
          )}

          <div>
            <Label className="mb-2 block">Services Availed</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CAMPING_SERVICES.map((service) => (
                <div key={service.name} className="flex items-center gap-2">
                  <Checkbox
                    id={service.name}
                    checked={selectedServices.includes(service.name)}
                    onCheckedChange={() => toggleService(service.name)}
                  />
                  <Label htmlFor={service.name} className="text-sm cursor-pointer">
                    {service.name} <span className="text-xs text-[var(--muted-foreground)]">(Rs. {service.price})</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as "cash" | "e_transaction")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="e_transaction">E-Transaction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date & Time</Label>
              <Input type="datetime-local" value={dateTime} onChange={(e) => setDateTime(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Note (Optional)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <div className="border-t border-[var(--border)] pt-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1 text-sm">
                <p>Spot Total: Rs. {spotTotal.toLocaleString()}</p>
                <p>Services Total: Rs. {servicesTotal.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--muted-foreground)]">Grand Total</p>
                <p className="text-3xl font-bold text-[var(--primary)]">Rs. {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSubmit} disabled={createSale.isPending}>
              {createSale.isPending ? "Saving..." : "Record Camping Sale"}
            </Button>
            <Button variant="outline" onClick={resetForm}>Reset</Button>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Modal */}
      <Dialog open={!!receiptData} onOpenChange={() => setReceiptData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center font-serif">Camping Receipt</DialogTitle>
          </DialogHeader>
          {receiptData && (
            <div className="bg-white text-black p-6 rounded-lg space-y-4" id="camping-receipt">
              <div className="text-center border-b border-black pb-3">
                <h2 className="text-xl font-bold font-serif">Native Resort & Camping</h2>
                <p className="text-xs">Bumburate</p>
              </div>
              <div className="text-xs space-y-1">
                <p>Customer: {receiptData.customerName}</p>
                <p>Spot: {receiptData.spotName}</p>
                <p>Check-in: {format(new Date(receiptData.checkIn), "MMM dd, yyyy")}</p>
                <p>Check-out: {format(new Date(receiptData.checkOut), "MMM dd, yyyy")}</p>
                <p>Nights: {receiptData.nights} | People: {receiptData.peopleCount}</p>
                <p>Payment: {receiptData.paymentMethod === "cash" ? "Cash" : "E-Transaction"}</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-black">
                    <th className="text-left py-1">Item</th>
                    <th className="text-right py-1">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1">Spot ({receiptData.nights} nights)</td>
                    <td className="text-right py-1">{receiptData.spotTotal.toLocaleString()}</td>
                  </tr>
                  {receiptData.services.map((s, i) => (
                    <tr key={i}>
                      <td className="py-1">{s.name}</td>
                      <td className="text-right py-1">{s.price.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-black pt-2 flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>Rs. {receiptData.totalAmount.toLocaleString()}</span>
              </div>
              <p className="text-center text-[10px] pt-2">Thank you for camping with us!</p>
              <Button
                className="w-full mt-2"
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    printWindow.document.write(`
                      <html><head><title>Camping Receipt</title>
                      <style>
                        body { font-family: sans-serif; padding: 20px; width: 148mm; }
                        h2 { text-align: center; margin: 0; }
                        p { margin: 2px 0; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { text-align: left; padding: 4px; }
                        .total { font-weight: bold; border-top: 2px solid black; margin-top: 10px; padding-top: 5px; }
                      </style></head><body>
                      ${document.getElementById("camping-receipt")?.innerHTML || ""}
                      </body></html>
                    `);
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
              >
                <Printer className="h-4 w-4 mr-2" /> Print Receipt
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
