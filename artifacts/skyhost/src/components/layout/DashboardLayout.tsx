import { Link, useLocation } from "wouter";
import { useGetClientDashboard, useListClientInvoices, useListClientOrders, useListClientTickets } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { toArray } from "@/lib/api-data";
import { LayoutDashboard, ShoppingCart, FileText, Ticket, LogOut, Settings } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data } = useGetClientDashboard();
  const { data: orders } = useListClientOrders();
  const { data: invoices } = useListClientInvoices();
  const { data: tickets } = useListClientTickets();
  const pendingOrders = toArray<{ status: string }>(orders, ["orders"]).filter((order) => order.status === "pending").length;
  const pendingInvoices = toArray<{ status: string }>(invoices, ["invoices"]).filter((invoice) => invoice.status === "unpaid" || invoice.status === "overdue").length;
  const activeTickets = toArray<{ status: string }>(tickets, ["tickets"]).filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length;
  const counts = {
    orders: Math.max(Number((data as { pendingOrders?: number } | undefined)?.pendingOrders ?? 0), pendingOrders),
    invoices: Math.max(Number((data as { unpaidInvoices?: number } | undefined)?.unpaidInvoices ?? 0), pendingInvoices),
    tickets: Math.max(
      Number((data as { openTickets?: number } | undefined)?.openTickets ?? 0) +
      Number((data as { newTicketResponses?: number } | undefined)?.newTicketResponses ?? 0),
      activeTickets,
    ),
  };

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Orders", href: "/dashboard/orders", icon: ShoppingCart, count: counts.orders },
    { label: "Invoices", href: "/dashboard/invoices", icon: FileText, count: counts.invoices },
    { label: "Support Tickets", href: "/dashboard/tickets", icon: Ticket, count: counts.tickets },
  ];

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/20 hidden md:block">
        <div className="p-6 flex flex-col h-full">
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-foreground">Client Portal</h2>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
          </div>
          
          <nav className="flex-1 space-y-1">
            {navItems.map((item) => {
              const isActive = location === item.href || location.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}>
                  <div className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors cursor-pointer ${isActive ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
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
          </nav>
          
          <div className="mt-auto pt-4 border-t space-y-1">
            <Link href="/dashboard/settings">
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
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
