import { Link, useLocation } from "wouter";
import { useGetAdminDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Users, Server, ShoppingCart, FileText, Ticket, LogOut, Settings, ShieldCheck, Palette, CreditCard } from "lucide-react";

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: dashboard } = useGetAdminDashboard();

  const counts = {
    clients: Number((dashboard as { todayClients?: number } | undefined)?.todayClients ?? 0),
    orders: Number((dashboard as { pendingOrders?: number } | undefined)?.pendingOrders ?? 0),
    invoices: Number((dashboard as { unpaidInvoicesCount?: number } | undefined)?.unpaidInvoicesCount ?? 0),
    tickets:
      Number((dashboard as { openTickets?: number } | undefined)?.openTickets ?? 0) +
      Number((dashboard as { inProgressTickets?: number } | undefined)?.inProgressTickets ?? 0),
  };

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Clients", href: "/admin/clients", icon: Users, count: counts.clients },
    { label: "Services", href: "/admin/services", icon: Server },
    { label: "Orders", href: "/admin/orders", icon: ShoppingCart, count: counts.orders },
    { label: "Invoices", href: "/admin/invoices", icon: FileText, count: counts.invoices },
    { label: "Tickets", href: "/admin/tickets", icon: Ticket, count: counts.tickets },
  ];

  const settingsItems = [
    { label: "Appearance", href: "/admin/appearance", icon: Palette },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Admin Users", href: "/admin/users", icon: ShieldCheck },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/30 hidden md:block">
        <div className="p-6 flex flex-col h-full">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-lg font-semibold text-foreground">Admin Area</h2>
              <Badge variant="secondary" className="bg-primary/20 text-primary border-none">Panel</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{user?.email || user?.username}</p>
          </div>
          
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              // Exact match for /admin, prefix match for others
              const isActive = item.href === "/admin" 
                ? location === "/admin" 
                : location === item.href || location.startsWith(item.href + "/");
                
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${isActive ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    <item.icon className="h-4 w-4" />
                    <span className="flex-1">{item.label}</span>
                    {"count" in item && item.count ? (
                      <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
                        {item.count}
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              );
            })}
            <div className="pt-4 mt-4 border-t">
              <div className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Settings</div>
              {settingsItems.map((item) => {
                const isActive = location === item.href || location.startsWith(item.href + "/");
                return (
                  <Link key={item.href} href={item.href}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${isActive ? 'bg-primary/20 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                      <item.icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </nav>
          
          <div className="mt-auto pt-4 border-t space-y-1">
            <Link href="/admin/appearance">
              <div className="flex items-center gap-3 px-3 py-2 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors">
                <Settings className="h-4 w-4" />
                Settings
              </div>
            </Link>
            <div 
              onClick={logout}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </div>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto bg-muted/5">
        {children}
      </main>
    </div>
  );
}
