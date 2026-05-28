import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ArrowLeft, Building2, Phone, Mail, Calendar, ShoppingCart, FileText, Ticket, Pencil } from "lucide-react";
import { fetchJson, toArray } from "@/lib/api-data";
import { useToast } from "@/hooks/use-toast";

type SslDetails = {
  commonName?: string;
  organization?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipcode?: string;
};

type ClientData = {
  id: number;
  name: string;
  email: string;
  phone: string;
  company: string | null;
  status: string;
  createdAt: string;
};

type OrderRow = {
  id: number;
  serviceId?: number;
  serviceName: string | null;
  status: string;
  amount: number;
  currency: string;
  notes: string | null;
  sslDetails: SslDetails | null;
  createdAt: string;
};

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  orderId: number | null;
  serviceId?: number | null;
  orderName?: string | null;
  serviceName?: string | null;
  orderStatus?: string | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt: string | null;
  transactionId: string | null;
};

type TicketRow = {
  id: number;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
};

type ProfileData = {
  client: ClientData;
  orders: OrderRow[];
  invoices: InvoiceRow[];
  tickets: TicketRow[];
};

const statusColor = (s: string) => {
  switch (s) {
    case "active": case "paid": return "bg-green-500/10 text-green-500 border-green-500/20";
    case "pending": case "unpaid": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
    case "overdue": case "cancelled": case "suspended": return "bg-red-500/10 text-red-500 border-red-500/20";
    case "refunded": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "completed": case "resolved": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    default: return "bg-muted text-muted-foreground border-muted";
  }
};

export default function AdminClientProfile() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRow | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetchJson<ProfileData>(`/api/admin/clients/${params.id}/profile`)
      .then((d: ProfileData) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <p>{error ?? "Client not found"}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/clients")}>Back to Clients</Button>
      </div>
    );
  }

  const { client } = data;
  const orders = toArray<OrderRow>(data.orders, ["orders"]);
  const invoices = toArray<InvoiceRow>(data.invoices, ["invoices"]);
  const tickets = toArray<TicketRow>(data.tickets, ["tickets"]);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const getOrderName = (invoice: InvoiceRow) =>
    invoice.orderName ?? invoice.serviceName ?? (invoice.orderId ? orderById.get(invoice.orderId)?.serviceName : null) ?? "-";
  const getServiceId = (invoice: InvoiceRow) =>
    invoice.serviceId ?? (invoice.orderId ? orderById.get(invoice.orderId)?.serviceId : null) ?? null;
  const totalRevenue = invoices.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const unpaidTotal = invoices.filter((i) => i.status === "unpaid" || i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  const openEdit = () => {
    setEditName(client.name);
    setEditEmail(client.email);
    setEditPhone(client.phone);
    setEditCompany(client.company ?? "");
    setEditOpen(true);
  };

  const saveClient = async () => {
    setSaving(true);
    try {
      const updated = await fetchJson<ClientData>(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, email: editEmail, phone: editPhone, company: editCompany || null }),
      });
      setData((current) => current ? { ...current, client: { ...current.client, ...updated } } : current);
      setEditOpen(false);
      toast({ title: "Client details updated" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Failed to update client", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="outline" size="icon" onClick={() => navigate("/admin/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground mt-0.5">Client Profile</p>
        </div>
        <Button variant="outline" className="ml-auto gap-2" onClick={openEdit}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Badge
          variant="outline"
          className={client.status === "active" ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-red-500/10 text-red-500 border-red-500/20"}
        >
          {client.status}
        </Badge>
      </div>

      {/* Client Info Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2 bg-card">
          <CardHeader><CardTitle className="text-base">Account Information</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{client.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>{client.phone}</span>
            </div>
            {client.company && (
              <div className="flex items-center gap-3 text-sm">
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{client.company}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span>Joined {format(new Date(client.createdAt), "MMMM d, yyyy")}</span>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold text-green-500 mt-1">${totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Outstanding Balance</p>
              <p className="text-2xl font-bold text-orange-500 mt-1">${unpaidTotal.toFixed(2)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs for Orders, Invoices, Tickets */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <FileText className="h-4 w-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="tickets" className="gap-2">
            <Ticket className="h-4 w-4" />
            Tickets ({tickets.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card className="bg-card">
            <CardContent className="p-0">
              {orders.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">No orders</p>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="px-6 py-4">ID</TableHead>
                      <TableHead className="px-6 py-4">Service</TableHead>
                      <TableHead className="px-6 py-4">Amount</TableHead>
                      <TableHead className="px-6 py-4">Status</TableHead>
                      <TableHead className="px-6 py-4">Date</TableHead>
                      <TableHead className="px-6 py-4 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="px-6 py-4 font-mono text-xs">#{order.id}</TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="font-medium">{order.serviceName ?? "—"}</div>
                          {order.sslDetails?.commonName && (
                            <div className="text-xs text-muted-foreground font-mono mt-0.5">{order.sslDetails.commonName}</div>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">{order.amount} {order.currency}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={statusColor(order.status)}>{order.status}</Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {format(new Date(order.createdAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>Open</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          {orders.some((o) => o.sslDetails) && (
            <div className="mt-4 space-y-3">
              {orders.filter((o) => o.sslDetails).map((order) => (
                <Card key={order.id} className="bg-card border-primary/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-primary">SSL Details — Order #{order.id}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {Object.entries(order.sslDetails ?? {}).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <dt className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}:</dt>
                          <dd className="font-medium">{String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="bg-card">
            <CardContent className="p-0">
              {invoices.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">No invoices</p>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="px-6 py-4">Invoice #</TableHead>
                      <TableHead className="px-6 py-4">Service Name</TableHead>
                      <TableHead className="px-6 py-4">Amount</TableHead>
                      <TableHead className="px-6 py-4">Due Date</TableHead>
                      <TableHead className="px-6 py-4">Status</TableHead>
                      <TableHead className="px-6 py-4">Paid</TableHead>
                      <TableHead className="px-6 py-4 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="px-6 py-4 font-mono text-xs font-bold text-primary">{inv.invoiceNumber}</TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="font-medium">{getOrderName(inv)}</div>
                          <div className="text-xs text-muted-foreground">
                            {inv.orderId ? `Order #${inv.orderId}` : "No order"}{getServiceId(inv) ? ` - Service #${getServiceId(inv)}` : ""}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">{inv.amount} {inv.currency}</TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {format(new Date(inv.dueDate), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={statusColor(inv.status)}>{inv.status}</Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {inv.paidAt ? format(new Date(inv.paidAt), "MMM d, yyyy") : "—"}
                          {inv.transactionId && (
                            <div className="text-xs font-mono mt-0.5 truncate max-w-[120px]">{inv.transactionId}</div>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedInvoice(inv)}>Open</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets">
          <Card className="bg-card">
            <CardContent className="p-0">
              {tickets.length === 0 ? (
                <p className="text-center py-10 text-muted-foreground">No tickets</p>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="px-6 py-4">ID</TableHead>
                      <TableHead className="px-6 py-4">Subject</TableHead>
                      <TableHead className="px-6 py-4">Priority</TableHead>
                      <TableHead className="px-6 py-4">Status</TableHead>
                      <TableHead className="px-6 py-4">Last Updated</TableHead>
                      <TableHead className="px-6 py-4 text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="px-6 py-4 font-mono text-xs">#{ticket.id}</TableCell>
                        <TableCell className="px-6 py-4 font-medium">{ticket.subject}</TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={
                            ticket.priority === "urgent" ? "bg-red-500/10 text-red-500 border-red-500/20" :
                            ticket.priority === "high" ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                            ticket.priority === "medium" ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                            "bg-muted text-muted-foreground"
                          }>{ticket.priority}</Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge variant="outline" className={statusColor(ticket.status)}>{ticket.status}</Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                          {format(new Date(ticket.updatedAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/admin/tickets/${ticket.id}`}>Open</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id}</DialogTitle>
          </DialogHeader>
              {selectedOrder && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Service</div>
                  <div className="font-medium">{selectedOrder.serviceName ?? "—"}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-medium">{selectedOrder.amount} {selectedOrder.currency}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Status</div>
                  <Badge variant="outline" className={statusColor(selectedOrder.status)}>{selectedOrder.status}</Badge>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium">{format(new Date(selectedOrder.createdAt), "MMM d, yyyy h:mm a")}</div>
                </div>
              </div>
              {selectedOrder.notes && (
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground mb-1">Notes</div>
                  <div className="whitespace-pre-wrap">{selectedOrder.notes}</div>
                </div>
              )}
              <div className="rounded-md border p-3">
                <div className="font-medium mb-2">Related Invoices</div>
                {invoices.filter((invoice) => invoice.orderId === selectedOrder.id).length === 0 ? (
                  <div className="text-muted-foreground">No invoices are linked to this order.</div>
                ) : (
                  <div className="space-y-2">
                    {invoices.filter((invoice) => invoice.orderId === selectedOrder.id).map((invoice) => (
                      <button
                        key={invoice.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left hover:bg-muted"
                        onClick={() => {
                          setSelectedOrder(null);
                          setSelectedInvoice(invoice);
                        }}
                      >
                        <span className="font-mono text-xs font-bold text-primary">{invoice.invoiceNumber}</span>
                        <span className="text-muted-foreground">{invoice.amount} {invoice.currency}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedOrder.sslDetails && (
                <div className="rounded-md border p-3">
                  <div className="font-medium mb-2">SSL Details</div>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {Object.entries(selectedOrder.sslDetails).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</dt>
                        <dd className="font-medium">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Amount</div>
                  <div className="font-medium">{selectedInvoice.amount} {selectedInvoice.currency}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Status</div>
                  <Badge variant="outline" className={statusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Due Date</div>
                  <div className="font-medium">{format(new Date(selectedInvoice.dueDate), "MMM d, yyyy")}</div>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground">Paid</div>
                  <div className="font-medium">{selectedInvoice.paidAt ? format(new Date(selectedInvoice.paidAt), "MMM d, yyyy h:mm a") : "—"}</div>
                </div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-muted-foreground">Related Order</div>
                {selectedInvoice.orderId ? (
                  <button
                    type="button"
                    className="mt-1 text-left font-medium text-primary hover:underline"
                    onClick={() => {
                      const order = orders.find((item) => item.id === selectedInvoice.orderId);
                      if (order) {
                        setSelectedInvoice(null);
                        setSelectedOrder(order);
                      }
                    }}
                  >
                    Order #{selectedInvoice.orderId} - {getOrderName(selectedInvoice)}
                  </button>
                ) : (
                  <div className="font-medium">No order linked</div>
                )}
                {selectedInvoice.orderStatus && (
                  <div className="mt-2">
                    <Badge variant="outline" className={statusColor(selectedInvoice.orderStatus)}>{selectedInvoice.orderStatus}</Badge>
                  </div>
                )}
              </div>
              {selectedInvoice.transactionId && (
                <div className="rounded-md border p-3">
                  <div className="text-muted-foreground mb-1">Transaction</div>
                  <div className="font-mono break-all">{selectedInvoice.transactionId}</div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Client Details</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={(event) => setEditName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(event) => setEditPhone(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={editCompany} onChange={(event) => setEditCompany(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={saveClient} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
