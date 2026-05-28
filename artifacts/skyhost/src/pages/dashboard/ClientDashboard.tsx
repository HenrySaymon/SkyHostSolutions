import { useGetClientDashboard, useListClientInvoices, useListClientOrders, useListClientTickets, type Invoice, type Order, type Ticket as ApiTicket } from "@workspace/api-client-react";
import { toArray } from "@/lib/api-data";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Ticket, FileText, Activity } from "lucide-react";
import { format } from "date-fns";

export default function ClientDashboard() {
  const { data, isLoading } = useGetClientDashboard();
  const { data: orders, isLoading: ordersLoading } = useListClientOrders();
  const { data: invoices, isLoading: invoicesLoading } = useListClientInvoices();
  const { data: tickets, isLoading: ticketsLoading } = useListClientTickets();
  const orderList = toArray<Order>(orders, ["orders"]);
  const invoiceList = toArray<Invoice>(invoices, ["invoices"]);
  const ticketList = toArray<ApiTicket>(tickets, ["tickets"]);
  const showLoading = isLoading && ordersLoading && invoicesLoading && ticketsLoading;

  if (showLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  const recentOrders = data
    ? toArray<Order>(data.recentOrders, ["recentOrders", "orders"])
    : [...orderList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const recentTickets = data
    ? toArray<ApiTicket>(data.recentTickets, ["recentTickets", "tickets"])
    : [...ticketList].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const totalOrders = Number(data?.totalOrders ?? orderList.length);
  const activeOrders = Number(data?.activeOrders ?? orderList.filter((order) => order.status === "active").length);
  const openTickets = Number(data?.openTickets ?? ticketList.filter((ticket) => ticket.status === "open").length);
  const unpaidInvoices = Number(data?.unpaidInvoices ?? invoiceList.filter((invoice) => invoice.status === "unpaid" || invoice.status === "overdue").length);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
        <Button asChild>
          <Link href="/services">New Service</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeOrders}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openTickets}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
            <FileText className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{unpaidInvoices}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Orders</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/orders">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent orders</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Service</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.serviceName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          order.status === 'active' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                          order.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                          order.status === 'suspended' ? 'bg-red-600/15 text-red-500 border-red-500/30' :
                          order.status === 'cancelled' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''
                        }>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {format(new Date(order.createdAt), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Tickets</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/tickets">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No open tickets</div>
            ) : (
              <div className="space-y-4">
                {recentTickets.map(ticket => (
                  <Link key={ticket.id} href={`/dashboard/tickets/${ticket.id}`}>
                    <div className="flex items-start justify-between p-4 rounded-lg border bg-muted/30 hover:bg-muted transition-colors cursor-pointer">
                      <div>
                        <div className="font-medium mb-1 line-clamp-1">{ticket.subject}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        ticket.status === 'open' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                        ticket.status === 'in_progress' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                        ticket.status === 'resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''
                      }>
                        {ticket.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
