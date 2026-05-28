import { useState } from "react";
import {
  useListAdminServices,
  useUpdateAdminService,
  useCreateAdminService,
  getListAdminServicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toArray } from "@/lib/api-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, X } from "lucide-react";

const SERVICE_CATEGORIES = [
  "Managed Servers", "Cloud Infrastructure", "DevOps & Automation",
  "Security & Compliance", "SSL Services", "Database Management",
  "Monitoring & Support", "Backup & Recovery",
];

type ServiceRow = {
  id: number;
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  features: string[];
  priceUsd: number;
  priceEur: number;
  priceInr: number;
  imageUrl?: string;
  enabled: boolean;
};

type ServiceForm = {
  name: string;
  slug: string;
  category: string;
  shortDescription: string;
  description: string;
  features: string[];
  priceUsd: string;
  priceEur: string;
  priceInr: string;
  imageUrl: string;
};

const emptyForm = (): ServiceForm => ({
  name: "", slug: "", category: SERVICE_CATEGORIES[0], shortDescription: "",
  description: "", features: [], priceUsd: "", priceEur: "", priceInr: "", imageUrl: "",
});

export default function AdminServices() {
  const { data: services, isLoading } = useListAdminServices();
  const serviceList = toArray<ServiceRow>(services, ["services"]);
  const updateService = useUpdateAdminService();
  const createService = useCreateAdminService();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editingService, setEditingService] = useState<ServiceRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm());
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState("");

  const openEditModal = (service: ServiceRow) => {
    const serviceFeatures = toArray<string>(service.features, ["features"]);
    setEditingService(service);
    setForm({
      name: service.name,
      slug: service.slug,
      category: service.category,
      shortDescription: service.shortDescription ?? "",
      description: service.description ?? "",
      features: serviceFeatures,
      priceUsd: String(service.priceUsd ?? ""),
      priceEur: String(service.priceEur ?? ""),
      priceInr: String(service.priceInr ?? ""),
      imageUrl: service.imageUrl ?? "",
    });
    setFeatures(serviceFeatures);
    setNewFeature("");
  };

  const openCreateModal = () => {
    setForm(emptyForm());
    setFeatures([]);
    setNewFeature("");
    setCreateOpen(true);
  };

  const addFeature = () => {
    const t = newFeature.trim();
    if (t) { setFeatures((p) => [...p, t]); setNewFeature(""); }
  };

  const removeFeature = (i: number) => setFeatures((p) => p.filter((_, j) => j !== i));

  const handleToggle = (id: number, currentEnabled: boolean) => {
    updateService.mutate({ id, data: { enabled: !currentEnabled } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminServicesQueryKey() });
        toast({ title: `Service ${!currentEnabled ? "enabled" : "disabled"}` });
      },
      onError: () => toast({ title: "Failed to update service", variant: "destructive" }),
    });
  };

  const handleEdit = () => {
    if (!editingService) return;
    updateService.mutate({
      id: editingService.id,
      data: {
        name: form.name,
        slug: form.slug,
        category: form.category,
        shortDescription: form.shortDescription,
        description: form.description,
        features,
        priceUsd: form.priceUsd ? Number(form.priceUsd) : undefined,
        priceEur: form.priceEur ? Number(form.priceEur) : undefined,
        priceInr: form.priceInr ? Number(form.priceInr) : undefined,
        imageUrl: form.imageUrl || undefined,
      } as Parameters<typeof updateService.mutate>[0]["data"],
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminServicesQueryKey() });
        toast({ title: "Service updated successfully" });
        setEditingService(null);
      },
      onError: () => toast({ title: "Failed to update service", variant: "destructive" }),
    });
  };

  const handleCreate = () => {
    if (!form.name || !form.slug || !form.category) {
      toast({ title: "Name, slug, and category are required", variant: "destructive" }); return;
    }
    createService.mutate({
      data: {
        name: form.name,
        slug: form.slug,
        category: form.category,
        shortDescription: form.shortDescription,
        description: form.description,
        features,
        priceUsd: form.priceUsd ? Number(form.priceUsd) : 0,
        priceEur: form.priceEur ? Number(form.priceEur) : 0,
        priceInr: form.priceInr ? Number(form.priceInr) : 0,
        imageUrl: form.imageUrl,
        enabled: true,
      } as Parameters<typeof createService.mutate>[0]["data"],
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminServicesQueryKey() });
        toast({ title: "Service created successfully" });
        setCreateOpen(false);
      },
      onError: () => toast({ title: "Failed to create service", variant: "destructive" }),
    });
  };

  const ServiceFormFields = () => (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Service Name <span className="text-destructive">*</span></Label>
          <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Service name" />
        </div>
        <div className="space-y-2">
          <Label>Slug <span className="text-destructive">*</span></Label>
          <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="service-slug" />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Category <span className="text-destructive">*</span></Label>
        <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SERVICE_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Short Description</Label>
        <Input value={form.shortDescription} onChange={(e) => setForm((p) => ({ ...p, shortDescription: e.target.value }))} placeholder="Brief one-line description" />
      </div>

      <div className="space-y-2">
        <Label>Full Description</Label>
        <Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detailed service description..." className="min-h-[80px]" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[["USD $", "priceUsd", "79"], ["EUR €", "priceEur", "72"], ["INR ₹", "priceInr", "6599"]].map(([label, key, ph]) => (
          <div key={key} className="space-y-2">
            <Label>Price ({label})</Label>
            <Input type="number" value={form[key as keyof ServiceForm] as string} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder={ph} />
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input value={form.imageUrl} onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))} placeholder="https://..." />
      </div>

      <div className="space-y-2">
        <Label>Features</Label>
        <div className="space-y-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded px-3 py-2 text-sm">
              <span className="flex-1">{f}</span>
              <button type="button" onClick={() => removeFeature(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Add a feature..." onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFeature(); } }} />
            <Button type="button" variant="outline" size="icon" onClick={addFeature}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Services</h1>
          <p className="text-muted-foreground mt-1">Edit pricing, descriptions, and toggle service availability.</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          New Service
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6 py-4">Service</TableHead>
                  <TableHead className="px-6 py-4">Category</TableHead>
                  <TableHead className="px-6 py-4 text-right">Price (USD)</TableHead>
                  <TableHead className="px-6 py-4">Active</TableHead>
                  <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {serviceList.map((svc) => {
                  return (
                    <TableRow key={svc.id}>
                      <TableCell className="px-6 py-4">
                        <div className="font-medium">{svc.name}</div>
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-[250px]">{svc.slug}</div>
                      </TableCell>
                      <TableCell className="px-6 py-4"><Badge variant="secondary">{svc.category}</Badge></TableCell>
                      <TableCell className="px-6 py-4 text-right font-medium tabular-nums">${svc.priceUsd}</TableCell>
                      <TableCell className="px-6 py-4">
                        <Switch checked={svc.enabled} onCheckedChange={() => handleToggle(svc.id, svc.enabled)} />
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(svc)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Service Modal */}
      <Dialog open={!!editingService} onOpenChange={(open) => { if (!open) setEditingService(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Service</DialogTitle></DialogHeader>
          <ServiceFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingService(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={updateService.isPending}>
              {updateService.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Service Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Service</DialogTitle></DialogHeader>
          <ServiceFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createService.isPending}>
              {createService.isPending ? "Creating..." : "Create Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
