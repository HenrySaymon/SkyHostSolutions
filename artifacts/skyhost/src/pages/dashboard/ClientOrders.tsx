import { useListClientOrders, type Order } from "@workspace/api-client-react";
import { toArray } from "@/lib/api-data";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

export default function ClientOrders() {
  const { data: orders, isLoading } = useListClientOrders();
  const orderList = toArray<Order>(orders, ["orders"]);

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat(currency === "INR" ? "en-IN" : currency === "EUR" ? "en-IE" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'pending': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pending</Badge>;
      case 'suspended': return <Badge variant="outline" className="bg-red-600/15 text-red-500 border-red-500/30">Suspended</Badge>;
      case 'completed': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">Completed</Badge>;
      case 'cancelled': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
          <p className="text-muted-foreground mt-1">Manage your active services and past orders.</p>
        </div>
        <Button asChild>
          <Link href="/services">Browse Services</Link>
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orderList.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6 py-4">Service</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4">Amount</TableHead>
                  <TableHead className="px-6 py-4 text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderList.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="px-6 py-4 font-medium">{order.serviceName}</TableCell>
                    <TableCell className="px-6 py-4">{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="px-6 py-4">{formatAmount(order.amount, order.currency)}</TableCell>
                    <TableCell className="px-6 py-4 text-right text-sm text-muted-foreground">
                      {format(new Date(order.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>You haven't placed any orders yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { ShoppingCart } from "lucide-react";
