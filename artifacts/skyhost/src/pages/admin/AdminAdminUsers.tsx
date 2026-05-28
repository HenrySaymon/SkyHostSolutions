import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { toArray } from "@/lib/api-data";
import { UserPlus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ALL_PERMISSIONS = ["services", "orders", "invoices", "clients", "tickets", "users"] as const;

type AdminUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
  createdAt: string;
};

export default function AdminAdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);

  const [formUsername, setFormUsername] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formRole, setFormRole] = useState("admin");
  const [formPermissions, setFormPermissions] = useState<string[]>([...ALL_PERMISSIONS]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load");
      setUsers(toArray<AdminUser>(await res.json(), ["users"]));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const togglePerm = (perm: string) =>
    setFormPermissions((p) => p.includes(perm) ? p.filter((x) => x !== perm) : [...p, perm]);

  const openCreate = () => {
    setFormUsername(""); setFormEmail(""); setFormPassword("");
    setFormRole("admin"); setFormPermissions([...ALL_PERMISSIONS]);
    setCreateOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditUser(user);
    setFormUsername(user.username); setFormEmail(user.email); setFormPassword("");
    setFormRole(user.role); setFormPermissions(user.permissions ?? [...ALL_PERMISSIONS]);
  };

  const handleCreate = async () => {
    if (!formUsername || !formEmail || !formPassword) {
      toast({ title: "Username, email and password are required", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formUsername, email: formEmail, password: formPassword, role: formRole, permissions: formPermissions }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to create"); }
      await load();
      toast({ title: "Admin user created" });
      setCreateOpen(false);
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to create user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { username: formUsername, email: formEmail, role: formRole, permissions: formPermissions };
      if (formPassword) body.password = formPassword;
      const res = await fetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to update"); }
      await load();
      toast({ title: "User updated" });
      setEditUser(null);
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to update user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Failed to delete"); }
      await load();
      toast({ title: "User deleted" });
    } catch (e: unknown) {
      toast({ title: e instanceof Error ? e.message : "Failed to delete user", variant: "destructive" });
    }
  };

  const PermissionsSection = () => (
    <div className="space-y-2">
      <Label>Permissions</Label>
      <div className="grid grid-cols-3 gap-2">
        {ALL_PERMISSIONS.map((perm) => (
          <div key={perm} className="flex items-center gap-2">
            <Checkbox
              id={`perm-${perm}`}
              checked={formPermissions.includes(perm)}
              onCheckedChange={() => togglePerm(perm)}
            />
            <label htmlFor={`perm-${perm}`} className="text-sm capitalize cursor-pointer">{perm}</label>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Users</h1>
          <p className="text-muted-foreground mt-1">Manage admin accounts and their panel permissions.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Add Admin User
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6 py-4">User</TableHead>
                  <TableHead className="px-6 py-4">Role</TableHead>
                  <TableHead className="px-6 py-4">Permissions</TableHead>
                  <TableHead className="px-6 py-4">Created</TableHead>
                  <TableHead className="px-6 py-4 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Badge variant="secondary" className="capitalize">{user.role}</Badge>
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(user.permissions ?? ALL_PERMISSIONS).length === ALL_PERMISSIONS.length ? (
                          <Badge className="bg-primary/10 text-primary border-primary/20">Full Access</Badge>
                        ) : (
                          (user.permissions ?? []).map((p) => (
                            <Badge key={p} variant="outline" className="capitalize text-xs">{p}</Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(user)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Admin User?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove {user.username} from the admin panel. At least one admin must remain.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(user.id)}
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
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Admin User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Username <span className="text-destructive">*</span></Label>
              <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} placeholder="johnadmin" />
            </div>
            <div className="space-y-2">
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <Label>Password <span className="text-destructive">*</span></Label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Strong password" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PermissionsSection />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit Admin User — {editUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={formUsername} onChange={(e) => setFormUsername(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
              <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formRole} onValueChange={setFormRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <PermissionsSection />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
