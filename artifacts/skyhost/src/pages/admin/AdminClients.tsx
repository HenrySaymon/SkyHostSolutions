import { useState, useMemo } from "react";
import {
  useListAdminClients,
  useUpdateAdminClient,
  useDeleteAdminClient,
  useCreateAdminClient,
  getListAdminClientsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toArray } from "@/lib/api-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Trash2, UserPlus, Search, ExternalLink, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function AdminClients() {
  const { data: clients, isLoading } = useListAdminClients();
  const clientList = toArray<NonNullable<typeof clients>[number]>(clients, ["clients"]);
  const updateClient = useUpdateAdminClient();
  const deleteClient = useDeleteAdminClient();
  const createClient = useCreateAdminClient();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let list = clientList.filter(
      (c) =>
        (!q || c.name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q)) &&
        (statusFilter === "all" || c.status === statusFilter),
    );
    list = [...list].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === "desc" ? -diff : diff;
    });
    return list;
  }, [clientList, search, statusFilter, sortDir]);

  const counts = useMemo(() => {
    return {
      all: clientList.length,
      active: clientList.filter((c) => c.status === "active").length,
      suspended: clientList.filter((c) => c.status === "suspended").length,
    };
  }, [clientList]);

  const handleToggleStatus = (id: number, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "suspended" : "active";
    updateClient.mutate(
      { id, data: { status: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminClientsQueryKey() });
          toast({ title: `Client ${newStatus}` });
        },
      },
    );
  };

  const handleDelete = (id: number) => {
    deleteClient.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminClientsQueryKey() });
          toast({ title: "Client deleted" });
        },
      },
    );
  };

  const handleCreate = () => {
    if (!newName || !newEmail || !newPhone || !newPassword) {
      toast({ title: "Name, email, phone and password are required", variant: "destructive" });
      return;
    }
    createClient.mutate(
      { data: { name: newName, email: newEmail, phone: newPhone, company: newCompany || undefined, password: newPassword } as Parameters<typeof createClient.mutate>[0]["data"] },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAdminClientsQueryKey() });
          toast({ title: "Client created successfully" });
          setCreateOpen(false);
          setNewName(""); setNewEmail(""); setNewPhone(""); setNewCompany(""); setNewPassword("");
        },
        onError: () => toast({ title: "Failed to create client", variant: "destructive" }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Manage Clients</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Client
        </Button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "active", "suspended"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              statusFilter === s
                ? s === "all" ? "bg-primary text-primary-foreground border-primary"
                  : s === "active" ? "bg-green-500/20 text-green-400 border-green-500/50"
                  : "bg-red-500/20 text-red-400 border-red-500/50"
                : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-2 text-xs opacity-70">{counts[s]}</span>
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 w-[220px]"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}>
            <ArrowUpDown className="h-4 w-4" />
            {sortDir === "desc" ? "Newest" : "Oldest"}
          </Button>
        </div>
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
                  <TableHead className="px-6 py-4">Client Info</TableHead>
                  <TableHead className="px-6 py-4">Company</TableHead>
                  <TableHead className="px-6 py-4">Joined</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="px-6 py-4">
                      <div className="font-medium text-foreground">{client.name}</div>
                      <div className="text-sm text-muted-foreground">{client.email}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{client.phone}</div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      {client.company || <span className="text-muted-foreground italic">None</span>}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm">
                      {format(new Date(client.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={client.status === "active"}
                          onCheckedChange={() => handleToggleStatus(client.id, client.status)}
                          disabled={updateClient.isPending}
                        />
                        <Badge
                          variant="outline"
                          className={
                            client.status === "active"
                              ? "bg-green-500/10 text-green-500 border-green-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }
                        >
                          {client.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="View profile"
                          onClick={() => { window.location.href = `/admin/clients/${client.id}`; }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the client and all associated data.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(client.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                      No clients found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Client Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Jane Smith" />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Phone <span className="text-destructive">*</span></Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="+1 555 000 0000" />
            </div>
            <div className="space-y-2">
              <Label>Company</Label>
              <Input value={newCompany} onChange={(e) => setNewCompany(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Secure password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={createClient.isPending}>
              {createClient.isPending ? "Creating..." : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
