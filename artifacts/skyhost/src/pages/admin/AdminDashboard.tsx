import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, ShoppingCart, Ticket, DollarSign, Activity, Clock, AlertCircle, UserCheck } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { toArray } from "@/lib/api-data";

type DashboardData = {
  totalRevenue: number;
  totalClients: number;
  activeOrders: number;
  pendingOrders: number;
  totalOrders: number;
  openTickets: number;
  unpaidInvoicesCount: number;
  unpaidInvoicesAmount: number;
  todayClients: number;
  recentOrders: { id: number; clientName: string; serviceName: string; amount: number; currency: string; createdAt: string }[];
  recentTickets: { id: number; clientName: string; subject: string; status: string; createdAt: string }[];
  ordersByStatus: { status: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
};

export default function AdminDashboard() {
  const { data, isLoading, refetch } = useGetAdminDashboard();
  const { toast } = useToast();
  const d = data as DashboardData | undefined;

  // "Reset" today's client count by simulating a page note — actual data is always live from the server
  const handleResetTodayCount = async () => {
    await refetch();
    toast({ title: "Today's client count refreshed" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">System Overview</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array(8).fill(0).map((_, i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!d) return <div>Failed to load admin dashboard.</div>;

  const recentOrders = toArray<DashboardData["recentOrders"][number]>(d.recentOrders, ["recentOrders", "orders"]);
  const recentTickets = toArray<DashboardData["recentTickets"][number]>(d.recentTickets, ["recentTickets", "tickets"]);
  const ordersByStatus = toArray<DashboardData["ordersByStatus"][number]>(d.ordersByStatus, ["ordersByStatus"]);
  const revenueByMonth = toArray<DashboardData["revenueByMonth"][number]>(d.revenueByMonth, ["revenueByMonth"]);
  const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#ef4444'];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>

      {/* Primary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${d.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">From paid invoices</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.totalClients}</div>
            <p className="text-xs text-muted-foreground mt-1">All registered accounts</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Orders</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.activeOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Currently running</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tickets</CardTitle>
            <Ticket className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{d.openTickets}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting response</p>
          </CardContent>
        </Card>
      </div>

      {/* Action-Required Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's new clients */}
        <Card className="bg-card border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">New Clients Today</CardTitle>
            <UserCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{d.todayClients}</div>
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted-foreground">Registered {format(new Date(), "MMM d")}</p>
              <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground px-2" onClick={handleResetTodayCount}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending orders */}
        <Card className="bg-card border-yellow-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{d.pendingOrders}</div>
            <p className="text-xs text-muted-foreground mt-2">Awaiting approval / invoice</p>
          </CardContent>
        </Card>

        {/* Unpaid invoices */}
        <Card className="bg-card border-orange-500/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unpaid Invoices</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{d.unpaidInvoicesCount}</div>
            <p className="text-xs text-muted-foreground mt-2">
              ${d.unpaidInvoicesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} outstanding
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Revenue (Last 6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueByMonth}>
                  <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value}`}
                  />
                  <RechartsTooltip
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b'}}
                  />
                  <Bar dataKey="revenue" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Orders by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ordersByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="status"
                    label={({status, percent}) => `${status} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {ordersByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#1e293b'}} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Client</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right pr-6">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="pl-6 font-medium">{order.clientName}</TableCell>
                    <TableCell className="text-muted-foreground">{order.serviceName}</TableCell>
                    <TableCell className="text-right pr-6 font-medium">${order.amount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Recent Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Client</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead className="text-right pr-6">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTickets.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell className="pl-6 font-medium">{ticket.clientName}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                    <TableCell className="text-right pr-6">
                      <Badge variant="outline" className={
                        ticket.status === 'open' ? 'border-yellow-500/50 text-yellow-500' :
                        ticket.status === 'in_progress' ? 'border-blue-500/50 text-blue-500' :
                        'border-green-500/50 text-green-500'
                      }>{ticket.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Total Orders count shown at bottom */}
      <div className="flex justify-end">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShoppingCart className="h-4 w-4" />
          {d.totalOrders} total orders placed
        </div>
      </div>
    </div>
  );
}
