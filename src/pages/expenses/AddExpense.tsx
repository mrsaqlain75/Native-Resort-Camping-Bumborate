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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DollarSign, Plus, Trash2, User, Package, ChevronsUpDown, Check, X } from "lucide-react";
import { toast } from "sonner";

const expenseItemSchema = z.object({
  name: z.string().min(1, "Expense name is required"),
  unitPrice: z.number().min(0, "Price must be 0 or greater"),
  quantity: z.number().int().min(0, "Quantity must be 0 or greater"),
  total: z.number(),
});

// Payment method / date / receipt are intentionally absent: expenses are
// recorded here and settled later on the Pay Expenses page.
const expenseFormSchema = z.object({
  vendorName: z.string().min(1, "Select a vendor"),
  category: z.enum(["food", "supplies", "utilities", "staff", "maintenance", "rent", "other"]),
  items: z.array(expenseItemSchema).min(1, "At least one expense item is required"),
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

interface AddExpenseProps {
  expenseToEdit?: any;
  onClose?: () => void;
}

export default function AddExpense({ expenseToEdit, onClose }: AddExpenseProps) {
  const isEditMode = !!expenseToEdit;
  const utils = trpc.useUtils();

  const {
    control,
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      vendorName: "",
      category: "other",
      items: [{ name: "", unitPrice: 0, quantity: 0, total: 0 }],
      note: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // ── Vendor picker (searchable list of vendors from the Vendors page) ──
  const [vendorOpen, setVendorOpen] = useState(false);
  const [vendorSearch, setVendorSearch] = useState("");
  const { data: vendors } = trpc.vendors.list.useQuery();
  const selectedVendorName = watch("vendorName");
  const filteredVendors = (vendors ?? []).filter((v) =>
    v.name.toLowerCase().includes(vendorSearch.trim().toLowerCase())
  );

  useEffect(() => {
    if (expenseToEdit) {
      setValue("vendorName", expenseToEdit.paidTo || "");
      setValue("category", expenseToEdit.category);
      setValue("items", [{
        name: expenseToEdit.name,
        unitPrice: expenseToEdit.amount,
        quantity: expenseToEdit.quantity || 0,
        total: expenseToEdit.total || (expenseToEdit.amount * (expenseToEdit.quantity || 1)),
      }]);
      // dateTime and paymentMethod are intentionally not set on the form:
      // editing preserves the expense's existing values on the server.
      setValue("note", expenseToEdit.note || "");
    }
  }, [expenseToEdit, setValue]);

  // Watch items array for changes to recalculate totals
  const watchedItems = watch("items");

  // Keep each line's `total` in sync with unitPrice * quantity
  useEffect(() => {
    watchedItems.forEach((item, index) => {
      const total = (item.unitPrice || 0) * (item.quantity || 0);
      if (item.total !== total) {
        setValue(`items.${index}.total`, total);
      }
    });
  }, [watchedItems, setValue]);

  const grandTotal = watchedItems.reduce(
    (sum, item) => sum + (item.unitPrice || 0) * (item.quantity || 0),
    0
  );

  const createMultipleExpenses = trpc.expenses.createMultiple.useMutation({
    onSuccess: () => {
      toast.success("Expenses recorded successfully!");
      utils.expenses.list.invalidate();
      utils.reports.dashboardSummary.invalidate();
      utils.reports.recentActivity.invalidate();
      reset();
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
    // Editing preserves the expense's existing receipt, date/time and payment
    // method; only the fields on this form are changed.
    const receiptUrlValue: string | undefined =
      isEditMode && expenseToEdit
        ? expenseToEdit.receiptUrl || undefined
        : undefined;
    const dateTimeValue = isEditMode && expenseToEdit
      ? new Date(expenseToEdit.dateTime).toISOString()
      : new Date().toISOString();

    if (isEditMode && expenseToEdit) {
      const item = data.items[0];
      updateExpense.mutate({
        id: expenseToEdit.id,
        name: item.name,
        amount: item.unitPrice,
        quantity: item.quantity || 0,
        total: item.total || item.unitPrice * (item.quantity || 0),
        category: data.category,
        paidTo: data.vendorName || null,
        receiptUrl: receiptUrlValue,
        dateTime: dateTimeValue,
        note: data.note,
      });
    } else {
      const expenses = data.items.map((item) => ({
        name: item.name,
        amount: item.unitPrice,
        quantity: item.quantity || 0,
        total: item.total || item.unitPrice * (item.quantity || 0),
        category: data.category,
        paidTo: data.vendorName || null,
        receiptUrl: receiptUrlValue,
        dateTime: dateTimeValue,
        note: data.note,
      }));
      createMultipleExpenses.mutate({ expenses });
    }
  };

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
            {/* Vendor Name and Category - Global fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Vendor
                </Label>
                <Popover open={vendorOpen} onOpenChange={setVendorOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={vendorOpen}
                      className="w-full justify-between font-normal"
                    >
                      <span className={cn("truncate", !selectedVendorName && "text-[var(--muted-foreground)]")}>
                        {selectedVendorName || "Select vendor..."}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search vendor..."
                        value={vendorSearch}
                        onValueChange={setVendorSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          No vendor found. Add vendors on the Vendors page.
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredVendors.map((vendor) => (
                            <CommandItem
                              key={vendor.id}
                              value={vendor.name}
                              onSelect={() => {
                                setValue("vendorName", vendor.name, { shouldValidate: true });
                                setVendorOpen(false);
                                setVendorSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 shrink-0",
                                  selectedVendorName === vendor.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="truncate">{vendor.name}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {selectedVendorName && (
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setValue("vendorName", "", { shouldValidate: true });
                                setVendorOpen(false);
                                setVendorSearch("");
                              }}
                            >
                              <X className="mr-2 h-4 w-4" />
                              Clear selection
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.vendorName && (
                  <p className="text-sm text-[var(--destructive)] mt-1">
                    {errors.vendorName.message}
                  </p>
                )}
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  This vendor will apply to all expenses
                </p>
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Category
                </Label>
                <Select
                  value={watch("category")}
                  onValueChange={(v) => setValue("category", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  This category will apply to all expenses
                </p>
              </div>
            </div>

            {/* Expense Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Expense Items</Label>
                {!isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ name: "", unitPrice: 0, quantity: 0, total: 0 })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Expense
                  </Button>
                )}
              </div>

              {fields.map((field, index) => {
                const watchedItem = watchedItems[index] || {};
                const itemTotal =
                  (Number(watchedItem.unitPrice) || 0) *
                  (Number(watchedItem.quantity) || 0);
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-3 items-end p-3 rounded-lg border border-[var(--border)] bg-[var(--muted)]/30"
                  >
                    <div className="col-span-4 sm:col-span-4">
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
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-3 sm:col-span-4">
                      <Label className="text-xs text-right block">Total</Label>
                      <div className="text-sm font-bold text-[var(--primary)] h-10 flex items-center">
                        Rs. {itemTotal.toLocaleString()}
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
                );
              })}

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

            <div>
              <Label htmlFor="note">Note / Remarks (Optional)</Label>
              <Textarea id="note" {...register("note")} rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  createMultipleExpenses.isPending ||
                  updateExpense.isPending
                }
              >
                {createMultipleExpenses.isPending || updateExpense.isPending
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