import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";

interface VendorForm {
  name: string;
  phone: string;
  note: string;
}

const emptyForm: VendorForm = { name: "", phone: "", note: "" };

export default function VendorsPage() {
  const utils = trpc.useUtils();
  const [form, setForm] = useState<VendorForm>(emptyForm);
  const [nameError, setNameError] = useState("");

  const { data: vendors, isLoading } = trpc.vendors.list.useQuery();

  const createMutation = trpc.vendors.create.useMutation({
    onSuccess: () => {
      toast.success("Vendor added!");
      utils.vendors.list.invalidate();
      setForm(emptyForm);
      setNameError("");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.vendors.delete.useMutation({
    onSuccess: () => {
      toast.success("Vendor removed!");
      utils.vendors.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setNameError("Vendor name is required");
      return;
    }
    setNameError("");
    createMutation.mutate({
      name,
      phone: form.phone.trim() || undefined,
      note: form.note.trim() || undefined,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-serif">Vendors</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Vendors saved here can be selected when recording expenses
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-[var(--primary)]" />
            Add Vendor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <Label htmlFor="vendor-name">Vendor Name *</Label>
                <Input
                  id="vendor-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g., Bumburet Traders"
                  maxLength={255}
                />
                {nameError && (
                  <p className="text-sm text-[var(--destructive)] mt-1">{nameError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="vendor-phone">Phone Number (optional)</Label>
                <Input
                  id="vendor-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g., 0300 1234567"
                  maxLength={32}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="vendor-note">Note (optional)</Label>
              <Textarea
                id="vendor-note"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                rows={2}
                placeholder="Any other detail"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending} className="w-full sm:w-auto">
              {createMutation.isPending ? (
                "Saving..."
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" /> Add Vendor
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved Vendors</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">Loading vendors...</p>
          ) : !vendors || vendors.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4">
              No vendors yet. Add your first vendor above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Note</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.name}</TableCell>
                    <TableCell>{vendor.phone || "—"}</TableCell>
                    <TableCell className="max-w-[240px] truncate">
                      {vendor.note || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate({ id: vendor.id })}
                        disabled={deleteMutation.isPending}
                        aria-label={`Delete ${vendor.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
