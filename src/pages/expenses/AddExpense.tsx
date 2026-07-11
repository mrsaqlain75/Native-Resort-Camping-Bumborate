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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Plus, Trash2, User, Package } from "lucide-react";
import { toast } from "sonner";

const expenseItemSchema = z.object({
  name: z.string().min(1, "Expense name is required"),
  unitPrice: z.number().min(0, "Price must be 0 or greater"),
  quantity: z.number().int().min(0, "Quantity must be 0 or greater"),
  total: z.number(),
  category: z.enum(["food", "supplies", "utilities", "staff", "maintenance", "rent", "other"]),
});

const expenseFormSchema = z.object({
  vendorName: z.string().optional(),
  items: z.array(expenseItemSchema).min(1, "At least one expense item is required"),
  paymentMethod: z.enum(["cash", "e_transaction", "bank_transfer"]),
  dateTime: z.string(),
  note: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseFormSchema>;

const categories = [
  { value: "food", label: "Food" },
  { value: "supplies", label: "Supplies" },
  { value: "utilities", label: "Utilities" },
  { value: "staff", label: "Staff" },
  { value: "maintenance", label: "Maintenance" },
  { value: "rent", label: "Rent" },
  { value: "other", label: "Other" },
];

const paymentMethods = [
  { value: "cash", label: "Cash" },
  { value: "e_transaction", label: "E-Transaction" },
  { value: "bank_transfer", label: "Bank Transfer" },
];

interface AddExpenseProps {
  expenseToEdit?: any;
  onClose?: () => void;
}

export default function AddExpense({ expenseToEdit, onClose }: AddExpenseProps) {
  const isEditMode = !!expenseToEdit;
  const utils = trpc.useUtils();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      vendorName: "",
      items: [{ name: "", unitPrice: 0, quantity: 0, total: 0, category: "other" }],
      paymentMethod: "cash",
      dateTime: new Date().toISOString().slice(0, 16),
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  useEffect(() => {
    if (expenseToEdit) {
      setValue("vendorName", expenseToEdit.paidTo || "");
      setValue("items", [{
        name: expenseToEdit.name,
        unitPrice: expenseToEdit.amount,
        quantity: expenseToEdit.quantity || 0,
        total: expenseToEdit.amount * (expenseToEdit.quantity || 1),
        category: expenseToEdit.category,
      }]);
      setValue("paymentMethod", expenseToEdit.paymentMethod);
      const dateTimeValue = expenseToEdit.dateTime 
        ? typeof expenseToEdit.dateTime === "string" 
          ? expenseToEdit.dateTime.slice(0, 16) 
          : new Date(expenseToEdit.dateTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);
      setValue("dateTime", dateTimeValue);
      setValue("note", expenseToEdit.note || "");
    }
  }, [expenseToEdit, setValue]);

  // Calculate item total whenever unitPrice or quantity changes
  const updateItemTotal = (index: number) => {
    const unitPrice = watch(`items.${index}.unitPrice`) || 0;
    const quantity = watch(`items.${index}.quantity`) || 0;
    setValue(`items.${index}.total`, unitPrice * quantity);
  };

  const createMultipleExpenses = trpc.expenses.createMultiple.useMutation({
    onSuccess: () => {
      toast.success("Expenses recorded successfully!");
      utils.expenses.list.invalidate();
      utils.reports.dashboardSummary.invalidate();
      utils.reports.recentActivity.invalidate();
      reset();
      setReceiptFile(null);
      if (onClose) onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateExpense = trpc.expenses.update.useMutation({
    onSuccess: () => {
      toast.success("Expense updated successfully!");
      utils.expenses.list.invalidate();
      utils.reports.dashboardSummary.invalidate();
      if (onClose) onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (data: ExpenseForm) => {
    const receiptUrlValue = receiptFile ? `uploaded:${receiptFile.name}` : undefined;

    if (isEditMode && expenseToEdit) {
      const item = data.items[0];
      updateExpense.mutate({
        id: expenseToEdit.id,
        name: item.name,
        amount: item.unitPrice,
        quantity: item.quantity || 0,
        category: item.category,
        paymentMethod: data.paymentMethod,
        paidTo: data.vendorName || null,
        receiptUrl: receiptUrlValue,
        dateTime: data.dateTime,
        note: data.note,
      });
    } else {
      const expenses = data.items.map((item) => ({
        name: item.name,
        amount: item.unitPrice,
        quantity: item.quantity || 0,
        category: item.category,
        paymentMethod: data.paymentMethod,
        paidTo: data.vendorName || null,
        receiptUrl: receiptUrlValue,
        dateTime: data.dateTime,
        note: data.note,
      }));
      createMultipleExpenses.mutate({ expenses });
    }
  };

  const grandTotal = watch("items").reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">{isEditMode ? "Update Expense" : "Add Expenses"}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {isEditMode ? "Update existing expense" : "Add multiple expenses at once"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[var(--primary)]" />
            {isEditMode ? "Expense Details" : "Multiple Expenses"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="vendorName" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Vendor Name
              </Label>
              <Input
                id="vendorName"
                {...register("vendorName")}
                placeholder="Vendor name (optional)"
              />
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                This name will apply to all expenses
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Expense Items</Label>
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", unitPrice: 0, quantity: 0, total: 0, category: "other" })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Expense
                  </Button>
                )}
              </div>

              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-3 items-end p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30"
                >
                  <div className="col-span-4 sm:col-span-3">
                    <Label className="text-xs">Expense Name</Label>
                    <Input
                      {...register(`items.${index}.name`)}
                      placeholder="e.g., Coca Cola"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-2">
                    <Label className="text-xs">Unit Price (PKR)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                      onChange={() => updateItemTotal(index)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      Qty
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      onChange={() => updateItemTotal(index)}
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-3">
                    <Label className="text-xs">Category</Label>
                    <Select
                      value={watch(`items.${index}.category`)}
                      onValueChange={(v) => setValue(`items.${index}.category`, v as any)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>
                            {c.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-12 sm:col-span-3">
                    <Label className="text-xs text-right block">Total</Label>
                    <div className="text-sm font-medium text-[var(--primary)] h-10 flex items-center">
                      Rs. {(watch(`items.${index}.total`) || 0).toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-12 sm:col-span-1 flex justify-end items-end">
                    {!isEditMode && fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mb-0.5"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {errors.items?.message && (
                <p className="text-sm text-[var(--destructive)]">{errors.items.message}</p>
              )}
            </div>

            {/* Grand Total */}
            {!isEditMode && fields.length > 0 && (
              <div className="flex justify-end border-t border-[var(--border)] pt-4">
                <div className="text-right">
                  <p className="text-sm text-[var(--muted-foreground)]">Grand Total</p>
                  <p className="text-2xl font-bold text-[var(--primary)]">Rs. {grandTotal.toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={watch("paymentMethod")}
                  onValueChange={(v) => setValue("paymentMethod", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateTime">Date & Time</Label>
                <Input type="datetime-local" id="dateTime" {...register("dateTime")} />
              </div>
            </div>

            {!isEditMode && (
              <div>
                <Label htmlFor="receipt">Upload Receipt (Optional)</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                {receiptFile && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Selected: {receiptFile.name}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="note">Note / Remarks (Optional)</Label>
              <Textarea id="note" {...register("note")} rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={createMultipleExpenses.isPending || updateExpense.isPending}
              >
                {(createMultipleExpenses.isPending || updateExpense.isPending)
                  ? "Saving..."
                  : isEditMode
                  ? "Update Expense"
                  : `Record ${fields.length} Expense${fields.length > 1 ? "s" : ""}`}
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
    </div>
  );
}