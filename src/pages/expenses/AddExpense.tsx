import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

const expenseSchema = z.object({
  name: z.string().min(1, "Expense name is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  category: z.enum(["food", "supplies", "utilities", "staff", "maintenance", "rent", "other"]),
  paymentMethod: z.enum(["cash", "e_transaction", "bank_transfer"]),
  paidTo: z.string().optional(),
  dateTime: z.string(),
  note: z.string().optional(),
});

type ExpenseForm = z.infer<typeof expenseSchema>;

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
  expenseToEdit?: {
    id: number;
    name: string;
    amount: number;
    category: string;
    paymentMethod: string;
    paidTo?: string | null;
    receiptUrl?: string | null;
    dateTime: string;
    note?: string | null;
  };
  onClose?: () => void;
}

export default function AddExpense({ expenseToEdit, onClose }: AddExpenseProps) {
  const isEditMode = !!expenseToEdit;
  const utils = trpc.useUtils();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseForm>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      name: "",
      amount: 0,
      category: "other",
      paymentMethod: "cash",
      paidTo: "",
      dateTime: new Date().toISOString().slice(0, 16),
      note: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (expenseToEdit) {
      setValue("name", expenseToEdit.name);
      setValue("amount", expenseToEdit.amount);
      setValue("category", expenseToEdit.category as any);
      setValue("paymentMethod", expenseToEdit.paymentMethod as any);
      setValue("paidTo", expenseToEdit.paidTo || "");
      const dateTimeValue = expenseToEdit.dateTime 
        ? typeof expenseToEdit.dateTime === "string" 
          ? expenseToEdit.dateTime.slice(0, 16) 
          : new Date(expenseToEdit.dateTime).toISOString().slice(0, 16)
        : new Date().toISOString().slice(0, 16);
      setValue("dateTime", dateTimeValue);
      setValue("note", expenseToEdit.note || "");
    }
  }, [expenseToEdit, setValue]);

  const createExpense = trpc.expenses.create.useMutation({
    onSuccess: () => {
      toast.success("Expense recorded successfully!");
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
    
    const payload = {
      ...data,
      receiptUrl: receiptUrlValue,
    };

    if (isEditMode && expenseToEdit) {
      updateExpense.mutate({ 
        id: expenseToEdit.id, 
        ...payload,
      });
    } else {
      createExpense.mutate(payload);
    }
  };

  // Get the current display value for category
  const currentCategory = watch("category");
  const currentPaymentMethod = watch("paymentMethod");

  return (
    <div key={expenseToEdit?.id} className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">{isEditMode ? "Update Expense" : "Add Expense"}</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          {isEditMode ? "Update existing business expense" : "Record a new business expense"}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-[var(--primary)]" />
            Expense Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="name">Expense Name</Label>
                <Input id="name" {...register("name")} placeholder="e.g., Vegetable Purchase" />
                {errors.name && <p className="text-xs text-[var(--destructive)] mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="amount">Amount (PKR)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={0}
                  {...register("amount", { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.amount && <p className="text-xs text-[var(--destructive)] mt-1">{errors.amount.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label>Category</Label>
                <Select
                  value={currentCategory}
                  onValueChange={(v) => setValue("category", v as ExpenseForm["category"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Payment Method</Label>
                <Select
                  value={currentPaymentMethod}
                  onValueChange={(v) => setValue("paymentMethod", v as ExpenseForm["paymentMethod"])}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="paidTo">Paid To</Label>
                <Input id="paidTo" {...register("paidTo")} placeholder="Vendor name or person" />
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
                {receiptFile && <p className="text-xs text-[var(--muted-foreground)] mt-1">Selected: {receiptFile.name}</p>}
              </div>
            )}

            <div>
              <Label htmlFor="note">Note / Remarks (Optional)</Label>
              <Textarea id="note" {...register("note")} rows={3} />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" className="flex-1" disabled={createExpense.isPending || updateExpense.isPending}>
                {(createExpense.isPending || updateExpense.isPending) ? "Saving..." : (isEditMode ? "Update Expense" : "Record Expense")}
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