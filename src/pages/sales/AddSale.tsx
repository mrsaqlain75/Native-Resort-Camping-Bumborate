import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Printer, Receipt } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const saleItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().min(1, "At least 1"),
  unitPrice: z.number().min(0, "Price must be positive"),
  total: z.number(),
});

const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "At least one item required"),
  paymentMethod: z.enum(["cash", "e_transaction"]),
  source: z.enum(["dine_in", "online_order", "other"]),
  dateTime: z.string(),
  note: z.string().optional(),
});

type SaleForm = z.infer<typeof saleSchema>;

interface AddSaleProps {
  saleToEdit?: {
    id: number;
    items: { name: string; quantity: number; unitPrice: number; total: number }[];
    totalAmount: number;
    paymentMethod: string;
    source: string;
    dateTime: string;
    note?: string | null;
  };
  onClose?: () => void;
}

export default function AddSale({ saleToEdit, onClose }: AddSaleProps) {
  const isEditMode = !!saleToEdit;
  const [receiptSale, setReceiptSale] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: menuItems } = trpc.menu.list.useQuery();

  const {
    control,
    register,
    watch,
    setValue,
    handleSubmit,
    reset,
    trigger,
    formState: { errors },
  } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      items: [{ name: "", quantity: 1, unitPrice: 0, total: 0 }],
      paymentMethod: "cash",
      source: "dine_in",
      dateTime: new Date().toISOString().slice(0, 16),
      note: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (saleToEdit) {
      setValue("items", saleToEdit.items);
      setValue("paymentMethod", saleToEdit.paymentMethod as "cash" | "e_transaction");
      setValue("source", saleToEdit.source as "dine_in" | "online_order" | "other");
      const dateTimeValue = saleToEdit.dateTime 
        ? typeof saleToEdit.dateTime === "string" 
          ? saleToEdit.dateTime.slice(0, 16) 
          : new Date(saleToEdit.dateTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);
      setValue("dateTime", dateTimeValue);
      setValue("note", saleToEdit.note || "");
      trigger();
    }
  }, [saleToEdit, setValue, trigger]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const createSale = trpc.sales.create.useMutation({
    onSuccess: (data) => {
      toast.success("Sale recorded successfully!");
      utils.reports.dashboardSummary.invalidate();
      utils.reports.recentActivity.invalidate();
      utils.sales.todaySummary.invalidate();
      setReceiptSale({
        id: data.id,
        items: watch("items"),
        totalAmount: watch("items").reduce((sum, item) => sum + item.total, 0),
        paymentMethod: watch("paymentMethod"),
        source: watch("source"),
        dateTime: watch("dateTime"),
        note: watch("note"),
      });
      reset();
      if (onClose) onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSale = trpc.sales.update.useMutation({
    onSuccess: () => {
      toast.success("Sale updated successfully!");
      utils.sales.list.invalidate();
      utils.reports.dashboardSummary.invalidate();
      utils.reports.recentActivity.invalidate();
      if (onClose) onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateItemTotal = (index: number, quantity: number, unitPrice: number) => {
    const total = quantity * unitPrice;
    setValue(`items.${index}.total`, total);
  };

  const grandTotal = watch("items").reduce((sum, item) => sum + (item.total || 0), 0);

  const onSubmit = (data: SaleForm) => {
    const payload = {
      ...data,
      totalAmount: data.items.reduce((sum, item) => sum + item.total, 0),
    };

    if (isEditMode && saleToEdit) {
      updateSale.mutate({ id: saleToEdit.id, ...payload });
    } else {
      createSale.mutate(payload);
    }
  };

  const handleMenuSelect = (index: number, menuItemId: string) => {
    const item = menuItems?.find((m) => m.id === Number(menuItemId));
    if (item) {
      setValue(`items.${index}.name`, item.name);
      setValue(`items.${index}.unitPrice`, Number(item.price));
      const qty = watch(`items.${index}.quantity`) || 1;
      updateItemTotal(index, qty, Number(item.price));
    }
  };

  // Helper to get selected menu item value for each row
  const getSelectedMenuItemValue = (itemName: string) => {
    const menuItem = menuItems?.find(m => m.name === itemName);
    return menuItem ? String(menuItem.id) : undefined;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">{isEditMode ? "Update Sale" : "Add Sale"}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {isEditMode ? "Update existing sale transaction" : "Record a new restaurant sale transaction"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[var(--primary)]" />
            Sale Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", quantity: 1, unitPrice: 0, total: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-end p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30">
                  <div className="col-span-12 sm:col-span-4">
                    <Label className="text-xs">Menu Item</Label>
                    <Select 
                      key={`menu-select-${index}-${saleToEdit?.id}`}
                      defaultValue={getSelectedMenuItemValue(watch(`items.${index}.name`))}
                      onValueChange={(val) => handleMenuSelect(index, val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select from menu" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuItems?.map((item) => (
                          <SelectItem key={item.id} value={String(item.id)}>
                            {item.name} — Rs. {Number(item.price)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 sm:col-span-3">
                    <Label className="text-xs">Item Name</Label>
                    <Input {...register(`items.${index}.name`)} placeholder="Item name" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs">Qty</Label>
                    <Input
                      type="number"
                      min={1}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      onChange={(e) => {
                        const qty = Number(e.target.value);
                        setValue(`items.${index}.quantity`, qty);
                        updateItemTotal(index, qty, watch(`items.${index}.unitPrice`) || 0);
                      }}
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      onChange={(e) => {
                        const price = Number(e.target.value);
                        setValue(`items.${index}.unitPrice`, price);
                        updateItemTotal(index, watch(`items.${index}.quantity`) || 1, price);
                      }}
                    />
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex justify-end">
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                      </Button>
                    )}
                  </div>
                  <div className="col-span-12 text-right text-sm font-medium">
                    Line Total: Rs. {(watch(`items.${index}.total`) || 0).toLocaleString()}
                  </div>
                </div>
              ))}

              {errors.items?.message && (
                <p className="text-sm text-[var(--destructive)]">{errors.items.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-[var(--muted-foreground)]">Grand Total</p>
                <p className="text-3xl font-bold text-[var(--primary)]">Rs. {grandTotal.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label>Payment Method</Label>
                <RadioGroup
                  value={watch("paymentMethod")}
                  onValueChange={(v) => setValue("paymentMethod", v as "cash" | "e_transaction")}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cash" id="cash" />
                    <Label htmlFor="cash" className="cursor-pointer">Cash</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="e_transaction" id="e_transaction" />
                    <Label htmlFor="e_transaction" className="cursor-pointer">E-Transaction</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Source</Label>
                <RadioGroup
                  value={watch("source")}
                  onValueChange={(v) => setValue("source", v as "dine_in" | "online_order" | "other")}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dine_in" id="dine_in" />
                    <Label htmlFor="dine_in" className="cursor-pointer">Dine-In</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="online_order" id="online_order" />
                    <Label htmlFor="online_order" className="cursor-pointer">Online</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="other" id="other" />
                    <Label htmlFor="other" className="cursor-pointer">Other</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="dateTime">Date & Time</Label>
                <Input type="datetime-local" id="dateTime" {...register("dateTime")} />
              </div>
              <div>
                <Label htmlFor="note">Note / Remarks (Optional)</Label>
                <Textarea id="note" {...register("note")} rows={2} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="flex-1" disabled={createSale.isPending || updateSale.isPending}>
                {(createSale.isPending || updateSale.isPending) ? "Saving..." : (isEditMode ? "Update Sale" : "Record Sale")}
              </Button>
              {onClose && (
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
              )}
              {!onClose && (
                <Button type="button" variant="outline" onClick={() => reset()}>
                  Reset
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {!isEditMode && (
        <Dialog open={!!receiptSale} onOpenChange={() => setReceiptSale(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center font-serif">Receipt</DialogTitle>
            </DialogHeader>
            {receiptSale && (
              <div className="bg-white text-black p-6 rounded-lg space-y-4" id="receipt">
                <div className="text-center border-b border-black pb-3">
                  <h2 className="text-xl font-bold font-serif">Native Resort & Camping</h2>
                  <p className="text-xs">Bumburate</p>
                  <p className="text-xs">Guides . Cuisines . Events</p>
                </div>
                <div className="text-xs space-y-1">
                  <p>Receipt #: {String(receiptSale.id).padStart(6, "0")}</p>
                  <p>Date: {format(new Date(receiptSale.dateTime), "MMM dd, yyyy hh:mm a")}</p>
                  <p>Payment: {receiptSale.paymentMethod === "cash" ? "Cash" : "E-Transaction"}</p>
                  <p>Source: {receiptSale.source.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-black">
                      <th className="text-left py-1">Item</th>
                      <th className="text-center py-1">Qty</th>
                      <th className="text-right py-1">Price</th>
                      <th className="text-right py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptSale.items.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="py-1">{item.name}</td>
                        <td className="text-center py-1">{item.quantity}</td>
                        <td className="text-right py-1">{item.unitPrice.toLocaleString()}</td>
                        <td className="text-right py-1">{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-black pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span>Rs. {receiptSale.totalAmount.toLocaleString()}</span>
                </div>
                {receiptSale.note && <p className="text-xs text-gray-500">Note: {receiptSale.note}</p>}
                <p className="text-center text-[10px] pt-2">Thank you for visiting Native Resort!</p>
                <Button
                  className="w-full mt-2"
                  onClick={() => {
                    const printWindow = window.open("", "_blank");
                    if (printWindow) {
                      printWindow.document.write(`
                        <html><head><title>Receipt</title>
                        <style>
                          body { font-family: sans-serif; padding: 20px; width: 148mm; }
                          h2 { text-align: center; margin: 0; }
                          p { margin: 2px 0; }
                          table { width: 100%; border-collapse: collapse; }
                          th, td { text-align: left; padding: 4px; }
                          .total { font-weight: bold; border-top: 2px solid black; margin-top: 10px; padding-top: 5px; }
                        </style></head><body>
                        ${document.getElementById("receipt")?.innerHTML || ""}
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