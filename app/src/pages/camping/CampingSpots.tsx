import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, MapPin, Users } from "lucide-react";
import { toast } from "sonner";

interface SpotFormData {
  id?: number;
  name: string;
  capacity: number;
  pricePerNight: string;
  amenities: string;
  description: string;
}

export default function CampingSpots() {
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<SpotFormData | null>(null);
  const [formData, setFormData] = useState<SpotFormData>({
    name: "",
    capacity: 4,
    pricePerNight: "",
    amenities: "",
    description: "",
  });

  const { data: spots, isLoading } = trpc.camping.spots.listAll.useQuery();

  const createMutation = trpc.camping.spots.create.useMutation({
    onSuccess: () => {
      toast.success("Camping spot added!");
      utils.camping.spots.listAll.invalidate();
      utils.camping.spots.list.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.camping.spots.update.useMutation({
    onSuccess: () => {
      toast.success("Camping spot updated!");
      utils.camping.spots.listAll.invalidate();
      utils.camping.spots.list.invalidate();
      closeDialog();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.camping.spots.delete.useMutation({
    onSuccess: () => {
      toast.success("Camping spot removed!");
      utils.camping.spots.listAll.invalidate();
      utils.camping.spots.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const openAdd = () => {
    setEditingSpot(null);
    setFormData({ name: "", capacity: 4, pricePerNight: "", amenities: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (spot: NonNullable<typeof spots>[number]) => {
    const amenities = Array.isArray(spot.amenities) ? spot.amenities.join(", ") : "";
    setEditingSpot({
      id: spot.id,
      name: spot.name,
      capacity: spot.capacity,
      pricePerNight: String(spot.pricePerNight),
      amenities,
      description: spot.description || "",
    });
    setFormData({ id: spot.id, name: spot.name, capacity: spot.capacity, pricePerNight: String(spot.pricePerNight), amenities, description: spot.description || "" });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSpot(null);
    setFormData({ name: "", capacity: 4, pricePerNight: "", amenities: "", description: "" });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.pricePerNight) {
      toast.error("Please fill required fields");
      return;
    }
    const payload = {
      name: formData.name,
      capacity: formData.capacity,
      pricePerNight: parseFloat(formData.pricePerNight),
      amenities: formData.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      description: formData.description,
    };
    if (editingSpot?.id) {
      updateMutation.mutate({ id: editingSpot.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif">Camping Points</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Manage your camping spots and pricing</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" /> Add Spot
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {spots?.map((spot) => (
            <Card key={spot.id} className="transition-all hover:-translate-y-1 hover:shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[var(--primary)]" />
                      {spot.name}
                    </CardTitle>
                    <div className="flex items-center gap-1 mt-1 text-xs text-[var(--muted-foreground)]">
                      <Users className="h-3 w-3" />
                      Capacity: {spot.capacity} people
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(spot)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        if (confirm("Delete this camping spot?")) deleteMutation.mutate({ id: spot.id });
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-[var(--destructive)]" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-[var(--primary)]">Rs. {Number(spot.pricePerNight).toLocaleString()}</span>
                  <span className="text-xs text-[var(--muted-foreground)]">/night</span>
                </div>
                {spot.description && (
                  <p className="text-sm text-[var(--muted-foreground)]">{spot.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(spot.amenities) && spot.amenities.map((amenity) => (
                    <Badge key={amenity} variant="secondary" className="text-xs">
                      {amenity}
                    </Badge>
                  ))}
                </div>
                <div>
                  <span className={`text-xs px-2 py-1 rounded-full ${spot.active === "yes" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {spot.active === "yes" ? "Active" : "Inactive"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!spots || spots.length === 0) && (
            <div className="col-span-full text-center py-12 text-[var(--muted-foreground)]">
              No camping spots yet. Add your first spot!
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSpot ? "Edit Camping Spot" : "Add Camping Spot"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>Spot Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Riverside Tent 1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Capacity</Label>
                <Input type="number" min={1} value={formData.capacity} onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Price/Night (PKR)</Label>
                <Input type="number" step="0.01" min={0} value={formData.pricePerNight} onChange={(e) => setFormData({ ...formData, pricePerNight: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Amenities (comma separated)</Label>
              <Input value={formData.amenities} onChange={(e) => setFormData({ ...formData, amenities: e.target.value })} placeholder="Firewood, BBQ Kit, Bedding" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
            </div>
            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                {editingSpot ? "Update" : "Add"} Spot
              </Button>
              <Button variant="outline" onClick={closeDialog}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
