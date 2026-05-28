import { useState, useMemo } from "react";
import {
  useListAdminOrders,
  useUpdateAdminOrder,
  useListAdminClients,
  useListAdminServices,
  useListAdminInvoices,
  getListAdminOrdersQueryKey,
  getListAdminInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchJson, toArray } from "@/lib/api-data";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Plus, ArrowUpDown, Eye, FilePlus } from "lucide-react";

const SSL_CATEGORIES = ["SSL Services", "SSL Certificate"];

type SslDetails = {
  commonName?: string;
  organization?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
  orderFields?: OrderField[];
};

type OrderField = {
  name: string;
  value: string;
};

const emptySsl = (): SslDetails => ({
  commonName: "", organization: "", address: "", city: "", state: "", country: "", zipcode: "",
});

const ORDER_STATUSES = ["pending", "active", "suspended", "completed", "cancelled"] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

type OrderRow = {
  id: number;
  clientId: number;
  clientName: string;
  serviceId: number;
  serviceName: string;
  status: string;
  notes?: string | null;
  sslDetails?: SslDetails | null;
  amount: number;
  currency: string;
  createdAt: string;
};

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  orderId?: number | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
};

const STATUS_STYLE: Record<string, string> = {
  active:    "bg-green-500/10 text-green-500 border-green-500/30",
  pending:   "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  suspended: "bg-red-600/15 text-red-500 border-red-500/40",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/30",
};

export default function AdminOrders() {
  const { data: orders, isLoading } = useListAdminOrders();
  const { data: clients } = useListAdminClients();
  const { data: services } = useListAdminServices();
  const { data: invoices } = useListAdminInvoices();
  const orderList = toArray<OrderRow>(orders, ["orders"]);
  const clientList = toArray<NonNullable<typeof clients>[number]>(clients, ["clients"]);
  const serviceList = toArray<NonNullable<typeof services>[number]>(services, ["services"]);
  const invoiceList = toArray<InvoiceRow>(invoices, ["invoices"]);
  const updateOrder = useUpdateAdminOrder();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newServiceId, setNewServiceId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newNotes, setNewNotes] = useState("");
  const [generateInvoice, setGenerateInvoice] = useState(true);
  const [sslDetails, setSslDetails] = useState<SslDetails>(emptySsl());
  const [isCreating, setIsCreating] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [orderFields, setOrderFields] = useState<OrderField[]>([]);
  const [removeFieldIndex, setRemoveFieldIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const selectedService = serviceList.find((s) => String(s.id) === newServiceId);
  const isSSL = selectedService && (
    SSL_CATEGORIES.some((c) => (selectedService as { category?: string }).category?.includes("SSL")) ||
    String((selectedService as { name?: string }).name ?? "").toLowerCase().includes("ssl")
  );

  const counts = useMemo(() => {
    const r = { all: orderList.length, pending: 0, active: 0, suspended: 0, completed: 0, cancelled: 0 };
    for (const o of orderList) { if (o.status in r) (r as Record<string, number>)[o.status]++; }
    return r;
  }, [orderList]);

  const filtered = useMemo(() => {
    let list = statusFilter === "all" ? [...orderList] : orderList.filter((o) => o.status === statusFilter);
    list = list.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [orderList, statusFilter, sortDir]);

  const selectedOrderInvoices = useMemo(
    () => selectedOrder ? invoiceList.filter((invoice) => invoice.orderId === selectedOrder.id) : [],
    [invoiceList, selectedOrder],
  );

  const invoiceByOrderId = useMemo(() => {
    const map = new Map<number, InvoiceRow>();
    for (const invoice of invoiceList) {
      if (invoice.orderId && !map.has(invoice.orderId)) map.set(invoice.orderId, invoice);
    }
    return map;
  }, [invoiceList]);

  const getPublishedInvoice = (order: OrderRow) => invoiceByOrderId.get(order.id);
  const canPublishInvoice = (order: OrderRow) => !getPublishedInvoice(order) && order.status === "pending";
  const getOrderFields = (details?: SslDetails | null): OrderField[] =>
    Array.isArray(details?.orderFields)
      ? details.orderFields.filter((field) => field && typeof field.name === "string" && typeof field.value === "string")
      : [];

  const openOrder = (order: OrderRow) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditNotes(order.notes ?? "");
    setOrderFields(getOrderFields(order.sslDetails));
  };

  const updateOrderField = (index: number, key: keyof OrderField, value: string) => {
    setOrderFields((current) => current.map((field, i) => i === index ? { ...field, [key]: value } : field));
  };

  const addOrderField = (name = "", value = "") => {
    setOrderFields((current) => [...current, { name, value }]);
  };

  const removeOrderField = (index: number) => {
    setOrderFields((current) => current.filter((_, i) => i !== index));
  };

  const saveSelectedOrder = () => {
    if (!selectedOrder) return;
    const cleanFields = orderFields
      .map((field) => ({ name: field.name.trim(), value: field.value.trim() }))
      .filter((field) => field.name || field.value);
    const nextDetails = {
      ...(selectedOrder.sslDetails ?? {}),
      orderFields: cleanFields,
    };

    setIsSavingOrder(true);
    updateOrder.mutate(
      {
        id: selectedOrder.id,
        data: {
          status: editStatus,
          notes: editNotes || null,
          sslDetails: nextDetails,
        } as never,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
          setSelectedOrder((current) => current ? {
            ...current,
            status: editStatus,
            notes: editNotes || null,
            sslDetails: nextDetails,
          } : current);
          toast({ title: "Order details updated" });
        },
        onError: (error) => {
          toast({ title: error instanceof Error ? error.message : "Failed to update order", variant: "destructive" });
        },
        onSettled: () => setIsSavingOrder(false),
      },
    );
  };

  const handleStatusChange = (id: number, status: string) => {
    updateOrder.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
          toast({ title: "Order status updated" });
        },
      },
    );
  };

  const publishInvoice = async (order: OrderRow) => {
    const existing = getPublishedInvoice(order);
    if (existing) {
      toast({ title: `Invoice already published: ${existing.invoiceNumber}` });
      return;
    }
    if (!canPublishInvoice(order)) {
      toast({ title: "Invoices can only be published for pending orders", variant: "destructive" });
      return;
    }
    try {
      const data = await fetchJson<{ invoiceNumber?: string }>("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: order.clientId,
          orderId: order.id,
          amount: Number(order.amount),
          currency: order.currency,
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          notes: `Invoice for ${order.serviceName} order #${order.id}`,
        }),
      });
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      toast({ title: `Invoice ${data.invoiceNumber ?? ""} published` });
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to publish invoice", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newClientId || !newServiceId || !newAmount) {
      toast({ title: "Client, service, and amount are required", variant: "destructive" }); return;
    }
    setIsCreating(true);
    try {
      const order = await fetchJson<{ id: number }>("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: Number(newClientId),
          serviceId: Number(newServiceId),
          amount: Number(newAmount),
          currency: newCurrency,
          notes: newNotes || null,
          sslDetails: isSSL ? sslDetails : null,
        }),
      });
      if (generateInvoice) {
        await fetchJson("/api/admin/invoices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: Number(newClientId),
            orderId: order.id,
            amount: Number(newAmount),
            currency: newCurrency,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            notes: newNotes || `Invoice for order #${order.id}`,
          }),
        });
      }
      queryClient.invalidateQueries({ queryKey: getListAdminOrdersQueryKey() });
      toast({ title: generateInvoice ? "Order and invoice created successfully" : "Order created successfully" });
      setCreateOpen(false);
      setNewClientId(""); setNewServiceId(""); setNewAmount(""); setNewCurrency("USD"); setNewNotes("");
      setGenerateInvoice(true);
      setSslDetails(emptySsl());
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to create order", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Orders</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Order
        </Button>
      </div>

      {/* Status Filter + Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              statusFilter === s
                ? s === "all" ? "bg-primary text-primary-foreground border-primary"
                  : `${STATUS_STYLE[s]} border-current`
                : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-2 text-xs opacity-70">{counts[s]}</span>
          </button>
        ))}
        <Button
          variant="outline" size="sm"
          className="gap-2 ml-auto shrink-0"
          onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortDir === "desc" ? "Newest" : "Oldest"}
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6 py-4">ID</TableHead>
                  <TableHead className="px-6 py-4">Client</TableHead>
                  <TableHead className="px-6 py-4">Service</TableHead>
                  <TableHead className="px-6 py-4">Amount</TableHead>
                  <TableHead className="px-6 py-4">Invoice</TableHead>
                  <TableHead className="px-6 py-4">Date</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4 text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => openOrder(order)}>
                    <TableCell className="px-6 py-4 font-mono text-xs">#{order.id}</TableCell>
                    <TableCell className="px-6 py-4 font-medium">
                      <Link
                        href={`/admin/clients/${order.clientId}`}
                        className="text-primary hover:underline"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {order.clientName}
                      </Link>
                    </TableCell>
                    <TableCell className="px-6 py-4">{order.serviceName}</TableCell>
                    <TableCell className="px-6 py-4">{Number(order.amount).toFixed(2)} {order.currency}</TableCell>
                    <TableCell className="px-6 py-4">
                      {getPublishedInvoice(order) ? (
                        <span className="font-mono text-xs text-primary">{getPublishedInvoice(order)?.invoiceNumber}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not published</span>
                      )}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Select
                        defaultValue={order.status}
                        onValueChange={(val) => handleStatusChange(order.id, val)}
                      >
                        <SelectTrigger
                          onClick={(event) => event.stopPropagation()}
                          className={`w-[130px] h-8 text-xs font-semibold ${STATUS_STYLE[order.status] ?? ""}`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={getPublishedInvoice(order) ? `Already published: ${getPublishedInvoice(order)?.invoiceNumber}` : canPublishInvoice(order) ? "Publish invoice" : "Publish invoice is only available for pending orders"}
                        onClick={(event) => { event.stopPropagation(); publishInvoice(order); }}
                        disabled={!canPublishInvoice(order)}
                      >
                        <FilePlus className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="View order" onClick={(event) => { event.stopPropagation(); openOrder(order); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="px-6 py-10 text-center text-muted-foreground">
                      No orders found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Order Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client <span className="text-destructive">*</span></Label>
                <Select value={newClientId} onValueChange={setNewClientId}>
                  <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                  <SelectContent>
                    {clientList.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Service <span className="text-destructive">*</span></Label>
                <Select value={newServiceId} onValueChange={(val) => {
                  setNewServiceId(val);
                  const svc = serviceList.find((s) => String(s.id) === val);
                  if (svc) setNewAmount(String((svc as { priceUsd?: number }).priceUsd ?? ""));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select service..." /></SelectTrigger>
                  <SelectContent>
                    {serviceList.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount <span className="text-destructive">*</span></Label>
                <Input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} placeholder="99.00" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={newCurrency} onValueChange={setNewCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="INR">INR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Order notes..." className="min-h-[60px]" />
            </div>

            <label className="flex items-center gap-2 rounded-md border bg-muted/20 p-3 text-sm">
              <Checkbox checked={generateInvoice} onCheckedChange={(checked) => setGenerateInvoice(checked === true)} />
              Generate an unpaid invoice for this order
            </label>

            {isSSL && (
              <div className="border rounded-lg p-4 space-y-4 bg-muted/20">
                <p className="text-sm font-semibold text-primary">SSL Certificate Details (CSR Information)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-2">
                    <Label>Common Name (domain)</Label>
                    <Input value={sslDetails.commonName} onChange={(e) => setSslDetails((p) => ({ ...p, commonName: e.target.value }))} placeholder="example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Organization</Label>
                    <Input value={sslDetails.organization} onChange={(e) => setSslDetails((p) => ({ ...p, organization: e.target.value }))} placeholder="Acme Corp" />
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Input value={sslDetails.address} onChange={(e) => setSslDetails((p) => ({ ...p, address: e.target.value }))} placeholder="123 Main St" />
                  </div>
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input value={sslDetails.city} onChange={(e) => setSslDetails((p) => ({ ...p, city: e.target.value }))} placeholder="New York" />
                  </div>
                  <div className="space-y-2">
                    <Label>State / Province</Label>
                    <Input value={sslDetails.state} onChange={(e) => setSslDetails((p) => ({ ...p, state: e.target.value }))} placeholder="NY" />
                  </div>
                  <div className="space-y-2">
                    <Label>Country (2-letter)</Label>
                    <Input value={sslDetails.country} onChange={(e) => setSslDetails((p) => ({ ...p, country: e.target.value.toUpperCase().slice(0, 2) }))} placeholder="US" maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>ZIP / Postal Code</Label>
                    <Input value={sslDetails.zipcode} onChange={(e) => setSslDetails((p) => ({ ...p, zipcode: e.target.value }))} placeholder="10001" />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Client</div>
                  <Link href={`/admin/clients/${selectedOrder.clientId}`} className="font-medium text-primary hover:underline">
                    {selectedOrder.clientName}
                  </Link>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Service</div>
                  <div className="font-medium">{selectedOrder.serviceName}</div>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="font-medium">{Number(selectedOrder.amount).toFixed(2)} {selectedOrder.currency}</div>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="mt-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Invoice</div>
                  <div className="font-medium">
                    {getPublishedInvoice(selectedOrder)?.invoiceNumber ?? "Not published"}
                  </div>
                </div>
              </div>

              <div>
                <Label>Additional Notes</Label>
                <Textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  placeholder="Order notes..."
                  className="mt-2 min-h-[80px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-3">
                  <Label>Product Details</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => addOrderField("Domain Name", "")}>Domain</Button>
                    <Button variant="outline" size="sm" onClick={() => addOrderField("IP Address", "")}>IP</Button>
                    <Button variant="outline" size="sm" onClick={() => addOrderField("Password", "")}>Password</Button>
                    <Button variant="outline" size="sm" onClick={() => addOrderField()}>Add Field</Button>
                  </div>
                </div>
                <div className="mt-2 space-y-2">
                  {orderFields.map((field, index) => (
                    <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] gap-2">
                      <Input
                        value={field.name}
                        onChange={(event) => updateOrderField(index, "name", event.target.value)}
                        placeholder="Name"
                      />
                      <Input
                        value={field.value}
                        onChange={(event) => updateOrderField(index, "value", event.target.value)}
                        placeholder="Value"
                        type={field.name.toLowerCase().includes("password") ? "password" : "text"}
                      />
                      <Button variant="outline" size="sm" onClick={() => setRemoveFieldIndex(index)}>Remove</Button>
                    </div>
                  ))}
                  {orderFields.length === 0 && (
                    <div className="rounded-md border bg-muted/20 p-4 text-sm text-muted-foreground">
                      No product details added yet.
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.sslDetails && (
                <div>
                  <Label>SSL Details</Label>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Object.entries(selectedOrder.sslDetails).filter(([key]) => key !== "orderFields").map(([key, value]) => (
                      <div key={key} className="rounded-md border bg-muted/20 p-3">
                        <div className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</div>
                        <div className="font-medium">{String(value || "-")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <Label>Bound Invoices</Label>
                <div className="mt-2 mb-3">
                  <Button
                    size="sm"
                    className="gap-2"
                    onClick={() => publishInvoice(selectedOrder)}
                    disabled={!canPublishInvoice(selectedOrder)}
                  >
                    <FilePlus className="h-4 w-4" />
                    Publish Invoice
                  </Button>
                </div>
                <div className="mt-2 rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedOrderInvoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono text-xs">{invoice.invoiceNumber}</TableCell>
                          <TableCell className="capitalize">{invoice.status}</TableCell>
                          <TableCell>{format(new Date(invoice.dueDate), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-right">{invoice.amount.toFixed(2)} {invoice.currency}</TableCell>
                        </TableRow>
                      ))}
                      {selectedOrderInvoices.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                            No invoices are bound to this order.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={saveSelectedOrder} disabled={isSavingOrder}>
                  {isSavingOrder ? "Saving..." : "Save Order"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={removeFieldIndex !== null} onOpenChange={(open) => !open && setRemoveFieldIndex(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove product detail?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the selected name/value row from this order. Save the order afterward to keep the change.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeFieldIndex !== null) removeOrderField(removeFieldIndex);
                setRemoveFieldIndex(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
