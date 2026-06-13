import { useState, useEffect } from "react";
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

const PRICE_PER_CAMP_PER_NIGHT = 500;

interface AddCampingSaleProps {
  campingSaleToEdit?: any;
  onClose?: () => void;
}

export default function AddCampingSale({ campingSaleToEdit, onClose }: AddCampingSaleProps) {
  const utils = trpc.useUtils();

  const [customerName, setCustomerName] = useState("");
  const [numberOfCamps, setNumberOfCamps] = useState(1);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [peopleCount, setPeopleCount] = useState(2);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "e_transaction">("cash");
  const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    if (campingSaleToEdit) {
      setCustomerName(campingSaleToEdit.customerName || "");
      setNumberOfCamps(campingSaleToEdit.numberOfCamps || 1);
      const checkInValue = campingSaleToEdit.checkIn 
        ? typeof campingSaleToEdit.checkIn === "string" 
          ? campingSaleToEdit.checkIn.split('T')[0]
          : new Date(campingSaleToEdit.checkIn).toISOString().split('T')[0]
        : "";
      const checkOutValue = campingSaleToEdit.checkOut 
        ? typeof campingSaleToEdit.checkOut === "string" 
          ? campingSaleToEdit.checkOut.split('T')[0]
          : new Date(campingSaleToEdit.checkOut).toISOString().split('T')[0]
        : "";
      setCheckIn(checkInValue);
      setCheckOut(checkOutValue);
      setPeopleCount(campingSaleToEdit.peopleCount || 2);
      setSelectedServices(campingSaleToEdit.services?.map((s: any) => s.name) || []);
      setPaymentMethod(campingSaleToEdit.paymentMethod || "cash");
      const dateTimeValue = campingSaleToEdit.dateTime 
        ? typeof campingSaleToEdit.dateTime === "string" 
          ? campingSaleToEdit.dateTime.slice(0, 16)
          : new Date(campingSaleToEdit.dateTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);
      setDateTime(dateTimeValue);
      setNote(campingSaleToEdit.note || "");
    }
  }, [campingSaleToEdit]);

  const nights = checkIn && checkOut ? Math.max(1, differenceInDays(new Date(checkOut), new Date(checkIn))) : 0;
  const spotTotal = PRICE_PER_CAMP_PER_NIGHT * numberOfCamps * nights;
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
      setReceiptData({
        id: Date.now(),
        customerName,
        numberOfCamps,
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
      resetForm();
      if (onClose) onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSale = trpc.camping.sales.update.useMutation({
    onSuccess: () => {
      toast.success("Camping sale updated successfully!");
      utils.camping.sales.list.invalidate();
      utils.reports.dashboardSummary.invalidate();
      if (onClose) onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const resetForm = () => {
    setCustomerName("");
    setNumberOfCamps(1);
    setCheckIn("");
    setCheckOut("");
    setPeopleCount(2);
    setSelectedServices([]);
    setPaymentMethod("cash");
    setDateTime(new Date().toISOString().slice(0, 16));
    setNote("");
  };

  const handleSubmit = () => {
    if (!customerName || !checkIn || !checkOut) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const payload = {
      customerName,
      checkIn,
      checkOut,
      peopleCount,
      numberOfCamps,
      services: selectedServices.map((sName) => ({ name: sName, price: CAMPING_SERVICES.find((s) => s.name === sName)?.price || 0 })),
      nights,
      spotTotal,
      servicesTotal,
      totalAmount,
      paymentMethod,
      dateTime,
      note: note || undefined,
    };

    if (campingSaleToEdit) {
      updateSale.mutate({ id: campingSaleToEdit.id, ...payload });
    } else {
      createSale.mutate(payload);
    }
  };

  const toggleService = (name: string) => {
    setSelectedServices((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  return (
    <div key={campingSaleToEdit?.id} className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">{campingSaleToEdit ? "Update Camping Sale" : "Add Camping Sale"}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {campingSaleToEdit ? "Update existing camping reservation" : "Record a new camping reservation"}
        </p>
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
              <Label>Number of Camps/Tents</Label>
              <Input 
                type="number" 
                min={1} 
                value={numberOfCamps} 
                onChange={(e) => setNumberOfCamps(Number(e.target.value))} 
                placeholder="Number of camps" 
              />
              <p className="text-xs text-muted-foreground mt-1">Price per camp per night: Rs. {PRICE_PER_CAMP_PER_NIGHT}</p>
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
              <p>Camps: <strong>{numberOfCamps}</strong></p>
              <p>Spot Total: <strong>Rs. {spotTotal.toLocaleString()}</strong> (Rs. {PRICE_PER_CAMP_PER_NIGHT} x {numberOfCamps} camps x {nights} nights)</p>
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
              <Select 
                key={`payment-${campingSaleToEdit?.id}`}
                value={paymentMethod} 
                onValueChange={(v) => setPaymentMethod(v as "cash" | "e_transaction")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment method" />
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
                <p>Camp Total: Rs. {spotTotal.toLocaleString()}</p>
                <p>Services Total: Rs. {servicesTotal.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[var(--muted-foreground)]">Grand Total</p>
                <p className="text-3xl font-bold text-[var(--primary)]">Rs. {totalAmount.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={handleSubmit} disabled={createSale.isPending || updateSale.isPending}>
              {(createSale.isPending || updateSale.isPending) ? "Saving..." : (campingSaleToEdit ? "Update Camping Sale" : "Record Camping Sale")}
            </Button>
            <Button variant="outline" onClick={resetForm}>Reset</Button>
            {onClose && (
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {!campingSaleToEdit && (
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
                  <p>Number of Camps: {receiptData.numberOfCamps}</p>
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
                      <td className="py-1">Camp ({receiptData.nights} nights x {receiptData.numberOfCamps} camps)</td>
                      <td className="text-right py-1">{receiptData.spotTotal.toLocaleString()}</td>
                    </tr>
                    {receiptData.services.map((s: any, i: number) => (
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
      )}
    </div>
  );
}