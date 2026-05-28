import { useState, useMemo } from "react";
import {
  useListAdminInvoices,
  useUpdateAdminInvoice,
  useListAdminClients,
  useListAdminOrders,
  getListAdminInvoicesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { fetchJson, toArray } from "@/lib/api-data";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Merge, MailCheck, RefreshCw, Search, ArrowUpDown, X, Eye, Plus } from "lucide-react";

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName: string;
  clientEmail?: string;
  orderId?: number | null;
  serviceId?: number | null;
  serviceName?: string | null;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string | null;
  transactionId?: string | null;
  refundedAt?: string | null;
  mergedInto?: number | null;
  notes?: string | null;
  refundNote?: string | null;
  createdAt: string;
};

type ClientRow = { id: number; name: string; email?: string };
type OrderRow = {
  id: number;
  clientId: number;
  clientName: string;
  serviceName: string;
  amount: number;
  currency: string;
};

const STATUS_BADGE_CONFIG: Record<string, { label: string; cls: string; amountCls: string }> = {
  unpaid:   { label: "Unpaid",   cls: "bg-orange-500/10 text-orange-500 border-orange-500/30 cursor-pointer hover:bg-orange-500/20", amountCls: "text-orange-400" },
  paid:     { label: "Paid",     cls: "bg-green-500/10 text-green-500 border-green-500/30 cursor-pointer hover:bg-green-500/20",   amountCls: "text-green-400" },
  overdue:  { label: "Overdue",  cls: "bg-red-500/10 text-red-500 border-red-500/30 cursor-pointer hover:bg-red-500/20",           amountCls: "text-red-400" },
  refunded: { label: "Refunded", cls: "bg-purple-500/10 text-purple-500 border-purple-500/30 cursor-pointer hover:bg-purple-500/20", amountCls: "text-purple-400" },
};

function statusBadge(status: string) {
  const cfg = STATUS_BADGE_CONFIG[status];
  if (cfg) return <Badge className={`${cfg.cls} pointer-events-none`}>{cfg.label}</Badge>;
  if (status === "merged") return <Badge className="bg-muted text-muted-foreground border-muted pointer-events-none">Merged</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

export default function AdminInvoices() {
  const { data: invoices, isLoading } = useListAdminInvoices();
  const { data: clients } = useListAdminClients();
  const { data: orders } = useListAdminOrders();
  const invoiceList = toArray<InvoiceRow>(invoices, ["invoices"]);
  const clientList = toArray<ClientRow>(clients, ["clients"]);
  const orderList = toArray<OrderRow>(orders, ["orders"]);
  const updateInvoice = useUpdateAdminInvoice();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  // Edit modal
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editTransactionId, setEditTransactionId] = useState("");
  const [editPaidAt, setEditPaidAt] = useState("");

  // Merge
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [mergeDueDate, setMergeDueDate] = useState("");
  const [mergeNotes, setMergeNotes] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  // Email
  const [emailInvoice, setEmailInvoice] = useState<InvoiceRow | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailPreview, setEmailPreview] = useState<{ html: string; to: string } | null>(null);

  // Refund note dialog
  const [refundTarget, setRefundTarget] = useState<InvoiceRow | null>(null);
  const [refundNote, setRefundNote] = useState("");
  const [isRefunding, setIsRefunding] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<InvoiceRow | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [newClientId, setNewClientId] = useState("");
  const [newOrderId, setNewOrderId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newCurrency, setNewCurrency] = useState("USD");
  const [newDueDate, setNewDueDate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Summary badges: compute totals per status
  const summaryStats = useMemo(() => {
    const stats: Record<string, { count: number; total: number }> = {};
    for (const inv of invoiceList) {
      if (!stats[inv.status]) stats[inv.status] = { count: 0, total: 0 };
      stats[inv.status].count++;
      stats[inv.status].total += inv.amount;
    }
    return stats;
  }, [invoiceList]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = invoiceList.filter(
      (inv) =>
        (!q || inv.invoiceNumber?.toLowerCase().includes(q) || inv.clientName?.toLowerCase().includes(q) || inv.clientEmail?.toLowerCase().includes(q) || inv.serviceName?.toLowerCase().includes(q) || inv.status?.toLowerCase().includes(q)) &&
        (!statusFilter || inv.status === statusFilter),
    );
    list = [...list].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [invoiceList, search, statusFilter, sortDir]);

  const availableOrders = useMemo(
    () => newClientId ? orderList.filter((order) => String(order.clientId) === newClientId) : orderList,
    [newClientId, orderList],
  );

  const openEditModal = (inv: InvoiceRow) => {
    setEditingInvoice(inv);
    setEditStatus(inv.status);
    setEditAmount(String(inv.amount));
    setEditDueDate(inv.dueDate ? inv.dueDate.slice(0, 10) : "");
    setEditNotes(inv.notes ?? "");
    setEditTransactionId(inv.transactionId ?? "");
    setEditPaidAt(inv.paidAt ? inv.paidAt.slice(0, 16) : "");
  };

  const handleSave = () => {
    if (!editingInvoice) return;
    const paidAt =
      editStatus === "paid"
        ? editPaidAt ? new Date(editPaidAt).toISOString() : editingInvoice.paidAt ?? new Date().toISOString()
        : null;

    updateInvoice.mutate(
      {
        id: editingInvoice.id,
        data: {
          status: editStatus,
          amount: editAmount ? Number(editAmount) : undefined,
          dueDate: editDueDate || undefined,
          paidAt,
          refundedAt: editStatus === "refunded" ? editingInvoice.refundedAt ?? new Date().toISOString() : editingInvoice.refundedAt ?? null,
          transactionId: editTransactionId || null,
          notes: editNotes || null,
        } as Parameters<typeof updateInvoice.mutate>[0]["data"],
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
          toast({ title: "Invoice updated successfully" });
          setEditingInvoice(null);
        },
        onError: () => toast({ title: "Failed to update invoice", variant: "destructive" }),
      },
    );
  };

  const openRefundDialog = (inv: InvoiceRow) => {
    setRefundTarget(inv);
    setRefundNote("");
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    setIsRefunding(true);
    try {
      await fetchJson(`/api/admin/invoices/${refundTarget.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refundNote: refundNote.trim() || null,
        }),
      });
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      toast({ title: `Invoice ${refundTarget.invoiceNumber} marked as refunded` });
      setRefundTarget(null);
      if (viewingInvoice?.id === refundTarget.id) setViewingInvoice(null);
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Refund failed", variant: "destructive" });
    } finally {
      setIsRefunding(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleMerge = async () => {
    if (selectedIds.size < 2) { toast({ title: "Select at least 2 invoices to merge", variant: "destructive" }); return; }
    setIsMerging(true);
    try {
      const res = await fetch("/api/admin/invoices/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceIds: [...selectedIds], dueDate: mergeDueDate, notes: mergeNotes }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Merge failed"); }
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      toast({ title: "Invoices merged successfully" });
      setMergeDialogOpen(false);
      setSelectedIds(new Set());
      setMergeNotes("");
      setMergeDueDate("");
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Merge failed", variant: "destructive" });
    } finally {
      setIsMerging(false);
    }
  };

  const handleSendEmail = async (inv: InvoiceRow) => {
    setEmailInvoice(inv);
    setEmailSending(true);
    setEmailPreview(null);
    try {
      const res = await fetch(`/api/admin/invoices/${inv.id}/send-email`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      if (data.sent) {
        toast({ title: `Email sent to ${data.to}` });
        setEmailInvoice(null);
      } else {
        setEmailPreview({ html: data.html, to: data.to });
        toast({ title: "SMTP not configured — showing preview" });
      }
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to send email", variant: "destructive" });
      setEmailInvoice(null);
    } finally {
      setEmailSending(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!newClientId || !newAmount || !newDueDate) {
      toast({ title: "Client, amount, and due date are required", variant: "destructive" });
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: Number(newClientId),
          orderId: newOrderId ? Number(newOrderId) : null,
          amount: Number(newAmount),
          currency: newCurrency,
          dueDate: newDueDate,
          notes: newNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create invoice");
      queryClient.invalidateQueries({ queryKey: getListAdminInvoicesQueryKey() });
      toast({ title: `Invoice ${data.invoiceNumber ?? ""} created` });
      setCreateOpen(false);
      setNewClientId("");
      setNewOrderId("");
      setNewAmount("");
      setNewCurrency("USD");
      setNewDueDate("");
      setNewNotes("");
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to create invoice", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Invoices</h1>
          <p className="text-muted-foreground mt-1">Update invoices, send emails, merge, or process refunds.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
          {selectedIds.size >= 2 && (
            <Button variant="outline" onClick={() => setMergeDialogOpen(true)} className="gap-2">
              <Merge className="h-4 w-4" />
              Merge Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Status Summary Badges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["unpaid", "paid", "overdue", "refunded"] as const).map((s) => {
          const cfg = STATUS_BADGE_CONFIG[s];
          const stat = summaryStats[s] ?? { count: 0, total: 0 };
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(isActive ? null : s)}
              className={`rounded-xl border p-4 text-left transition-all ${isActive ? cfg.cls.replace("cursor-pointer", "") + " ring-2 ring-offset-2 ring-offset-background" : "bg-card border-border hover:border-muted-foreground/40"}`}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">{cfg.label}</div>
              <div className={`text-2xl font-bold tabular-nums ${isActive ? "" : cfg.amountCls}`}>
                ${stat.total.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.count} invoice{stat.count !== 1 ? "s" : ""}</div>
            </button>
          );
        })}
      </div>

      {/* Search + Sort + Filter Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search invoice #, client, status..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 shrink-0"
          onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortDir === "desc" ? "Newest first" : "Oldest first"}
        </Button>
        {statusFilter && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setStatusFilter(null)}>
            <X className="h-3 w-3" />
            Clear filter
          </Button>
        )}
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-4 py-4 w-10" />
                  <TableHead className="px-4 py-4">Invoice #</TableHead>
                  <TableHead className="px-4 py-4">Client</TableHead>
                  <TableHead className="px-4 py-4">Amount</TableHead>
                  <TableHead className="px-4 py-4">Due Date</TableHead>
                  <TableHead className="px-4 py-4">Status</TableHead>
                  <TableHead className="px-4 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((inv) => (
                  <TableRow key={inv.id} className={selectedIds.has(inv.id) ? "bg-primary/5" : undefined}>
                    <TableCell className="px-4 py-4">
                      <Checkbox
                        checked={selectedIds.has(inv.id)}
                        onCheckedChange={() => toggleSelect(inv.id)}
                        disabled={inv.status === "merged"}
                      />
                    </TableCell>
                    <TableCell className="px-4 py-4 font-mono text-xs font-bold text-primary">
                      <button className="hover:underline" onClick={() => setViewingInvoice(inv)}>
                        {inv.invoiceNumber}
                      </button>
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div className="font-medium">{inv.clientName}</div>
                      {inv.serviceName && (
                        <div className="text-xs text-muted-foreground mt-0.5">{inv.serviceName}</div>
                      )}
                      {inv.transactionId && (
                        <div className="text-xs text-muted-foreground mt-0.5 font-mono">TXN: {inv.transactionId}</div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 font-medium tabular-nums">
                      {inv.amount.toFixed(2)} {inv.currency}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-sm text-muted-foreground">
                      {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="px-4 py-4">
                      <div>{statusBadge(inv.status)}</div>
                      {inv.refundedAt && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Refunded {format(new Date(inv.refundedAt), "MMM d, yyyy 'at' h:mm a")}
                        </div>
                      )}
                      {inv.refundNote && (
                        <div className="text-xs text-purple-400 mt-0.5 max-w-[160px] truncate" title={inv.refundNote}>
                          Note: {inv.refundNote}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="View" onClick={() => setViewingInvoice(inv)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditModal(inv)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Send email"
                          onClick={() => handleSendEmail(inv)}
                          disabled={emailSending && emailInvoice?.id === inv.id}
                        >
                          <MailCheck className="h-4 w-4" />
                        </Button>
                        {/* Refund: only if status=paid AND was never previously refunded */}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={inv.refundedAt ? "Already refunded" : inv.status === "paid" ? "Process Refund" : "Refund requires paid status"}
                          className="text-purple-500 hover:bg-purple-500/10"
                          onClick={() => openRefundDialog(inv)}
                          disabled={inv.status !== "paid" || !!inv.refundedAt}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                      {statusFilter ? `No ${statusFilter} invoices found.` : "No invoices found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Invoice Modal */}
      <Dialog open={!!editingInvoice} onOpenChange={(open) => { if (!open) setEditingInvoice(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Invoice — {editingInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editStatus} onValueChange={setEditStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unpaid">Unpaid</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
              {editStatus === "paid" && (
                <div className="space-y-2">
                  <Label>Payment Date & Time</Label>
                  <Input type="datetime-local" value={editPaidAt} onChange={(e) => setEditPaidAt(e.target.value)} />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Transaction ID</Label>
              <Input
                value={editTransactionId}
                onChange={(e) => setEditTransactionId(e.target.value)}
                placeholder="e.g. pi_3NxzP2..."
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Internal notes..."
                className="min-h-[80px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingInvoice(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateInvoice.isPending}>
              {updateInvoice.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={newClientId} onValueChange={(value) => {
                  setNewClientId(value);
                  setNewOrderId("");
                }}>
                  <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {clientList.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Bind Order</Label>
                <Select value={newOrderId || "none"} onValueChange={(value) => {
                  setNewOrderId(value === "none" ? "" : value);
                  const order = orderList.find((item) => String(item.id) === value);
                  if (order) {
                    setNewClientId(String(order.clientId));
                    setNewAmount(String(order.amount));
                    setNewCurrency(order.currency);
                    setNewNotes(`Invoice for ${order.serviceName} order #${order.id}`);
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Optional order" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No order</SelectItem>
                    {availableOrders.map((order) => (
                      <SelectItem key={order.id} value={String(order.id)}>
                        #{order.id} - {order.serviceName} ({order.clientName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
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
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input type="date" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="min-h-[80px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Note Dialog */}
      <Dialog open={!!refundTarget} onOpenChange={(open) => { if (!open) setRefundTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Refund — {refundTarget?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              This will mark the invoice as <strong className="text-purple-400">Refunded</strong> with the current timestamp.
              Refund amount: <strong>{refundTarget?.amount.toFixed(2)} {refundTarget?.currency}</strong>.
            </p>
            <div className="space-y-2">
              <Label>Refund Note <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="Reason for refund, reference number..."
                className="min-h-[80px]"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundTarget(null)}>Cancel</Button>
            <Button
              className="bg-purple-600 hover:bg-purple-700 text-white"
              onClick={handleRefund}
              disabled={isRefunding}
            >
              {isRefunding ? "Processing..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingInvoice} onOpenChange={(open) => { if (!open) setViewingInvoice(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invoice {viewingInvoice?.invoiceNumber}</DialogTitle>
          </DialogHeader>
          {viewingInvoice && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Client</div>
                  <div className="font-medium">{viewingInvoice.clientName}</div>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Service</div>
                  <div className="font-medium">{viewingInvoice.serviceName || "Not bound"}</div>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Order</div>
                  <div className="font-medium">{viewingInvoice.orderId ? `#${viewingInvoice.orderId}` : "Not bound"}</div>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Status</div>
                  <div className="font-medium capitalize">{viewingInvoice.status}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Amount</div>
                  <div className="font-medium">{viewingInvoice.amount.toFixed(2)} {viewingInvoice.currency}</div>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Due Date</div>
                  <div className="font-medium">{format(new Date(viewingInvoice.dueDate), "MMM d, yyyy")}</div>
                </div>
                <div className="rounded-md border bg-muted/20 p-3">
                  <div className="text-xs text-muted-foreground">Transaction ID</div>
                  <div className="font-mono text-xs break-all">{viewingInvoice.transactionId || "—"}</div>
                </div>
              </div>

              {viewingInvoice.paidAt && (
                <div className="rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-400">
                  Paid on {format(new Date(viewingInvoice.paidAt), "MMMM d, yyyy 'at' h:mm a")}
                </div>
              )}
              {viewingInvoice.refundedAt && (
                <div className="rounded-md border border-purple-500/30 bg-purple-500/10 p-3 text-sm text-purple-300">
                  Refunded on {format(new Date(viewingInvoice.refundedAt), "MMMM d, yyyy 'at' h:mm a")}
                </div>
              )}
              {viewingInvoice.refundNote && (
                <div>
                  <Label>Refund Note</Label>
                  <div className="mt-2 rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">{viewingInvoice.refundNote}</div>
                </div>
              )}
              {viewingInvoice.notes && (
                <div>
                  <Label>Invoice Notes</Label>
                  <div className="mt-2 rounded-md border bg-muted/20 p-3 text-sm whitespace-pre-wrap">{viewingInvoice.notes}</div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => openEditModal(viewingInvoice)}>Edit</Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  onClick={() => openRefundDialog(viewingInvoice)}
                  disabled={viewingInvoice.status !== "paid" || !!viewingInvoice.refundedAt}
                >
                  Refund
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merge Invoices Modal */}
      <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Merge {selectedIds.size} Invoices</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Selected invoices will be marked as <strong>Merged</strong> and a new combined invoice will be created.
            </p>
            <div className="space-y-2">
              <Label>New Due Date</Label>
              <Input type="date" value={mergeDueDate} onChange={(e) => setMergeDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={mergeNotes}
                onChange={(e) => setMergeNotes(e.target.value)}
                placeholder="Reason for merging..."
                className="min-h-[60px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMerge} disabled={isMerging}>
              {isMerging ? "Merging..." : "Merge Invoices"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Preview Modal */}
      <Dialog open={!!emailPreview} onOpenChange={(open) => { if (!open) setEmailPreview(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview — would be sent to {emailPreview?.to}</DialogTitle>
          </DialogHeader>
          <div className="mt-2 border rounded-md p-4 bg-white text-slate-950">
            {emailPreview && (
              <div dangerouslySetInnerHTML={{ __html: emailPreview.html }} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS environment variables to enable actual email delivery.
          </p>
          <DialogFooter>
            <Button onClick={() => setEmailPreview(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
