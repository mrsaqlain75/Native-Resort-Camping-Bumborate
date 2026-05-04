import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Utensils } from "lucide-react";
import { toast } from "sonner";

interface MenuFormData {
  id?: number;
  name: string;
  category: string;
  price: string;
  stockCount: number;
}

export default function MenuPage() {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuFormData | null>(null);
  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    category: "",
    price: "",
    stockCount: 0,
  });

  const { data: menuItems, isLoading } = trpc.menu.listAll.useQuery();
  const { data: categories } = trpc.menu.categories.useQuery();

  const createMutation = trpc.menu.create.useMutation({
    onSuccess: () => {
      toast.success("Menu item added!");
      utils.menu.listAll.invalidate();
      utils.menu.list.invalidate();
      utils.menu.categories.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.menu.update.useMutation({
    onSuccess: () => {
      toast.success("Menu item updated!");
      utils.menu.listAll.invalidate();
      utils.menu.list.invalidate();
      utils.menu.categories.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.menu.delete.useMutation({
    onSuccess: () => {
      toast.success("Menu item removed!");
      utils.menu.listAll.invalidate();
      utils.menu.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ name: "", category: "", price: "", stockCount: 0 });
    setDialogOpen(true);
  };

  const openEdit = (item: NonNullable<typeof menuItems>[number]) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      category: item.category,
      price: String(item.price),
      stockCount: item.stockCount ?? 0,
    });
    setFormData({
      id: item.id,
      name: item.name,
      category: item.category,
      price: String(item.price),
      stockCount: item.stockCount ?? 0,
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingItem(null);
    setFormData({ name: "", category: "", price: "", stockCount: 0 });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.price) {
      toast.error("Please fill all required fields");
      return;
    }
    if (editingItem?.id) {
      updateMutation.mutate({
        id: editingItem.id,
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stockCount: formData.stockCount,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        category: formData.category,
        price: parseFloat(formData.price),
        stockCount: formData.stockCount,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif">Menu Management</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage your restaurant products and pricing</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Product
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Utensils className="h-5 w-5 text-[var(--primary)]" />
            All Products
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-[var(--muted-foreground)]">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price (PKR)</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {menuItems?.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-full text-xs bg-[var(--secondary)] text-[var(--secondary-foreground)]">
                          {item.category}
                        </span>
                      </TableCell>
                      <TableCell>Rs. {Number(item.price).toLocaleString()}</TableCell>
                      <TableCell>{item.stockCount ?? "-"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${item.active === "yes" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {item.active === "yes" ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm("Delete this item?")) deleteMutation.mutate({ id: item.id });
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-[var(--destructive)]" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!menuItems || menuItems.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-[var(--muted-foreground)]">
                        No menu items yet. Add your first product!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Product Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Chicken Karahi"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Main Course"
                list="categories"
              />
              <datalist id="categories">
                {categories?.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price (PKR)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Stock Count (Optional)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.stockCount}
                  onChange={(e) => setFormData({ ...formData, stockCount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingItem ? "Update" : "Add"} Product
              </Button>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
