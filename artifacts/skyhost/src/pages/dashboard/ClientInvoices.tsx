import { useListClientInvoices, useListClientOrders, type Invoice, type Order } from "@workspace/api-client-react";
import { toArray } from "@/lib/api-data";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { FileText, Eye } from "lucide-react";

type InvoiceWithOrder = Invoice & {
  serviceId?: number | null;
  orderName?: string | null;
  serviceName?: string | null;
};

export default function ClientInvoices() {
  const { data: invoices, isLoading } = useListClientInvoices();
  const { data: orders } = useListClientOrders();
  const invoiceList = toArray<InvoiceWithOrder>(invoices, ["invoices"]);
  const orderList = toArray<Order>(orders, ["orders"]);
  const orderById = new Map(orderList.map((order) => [order.id, order]));

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat(currency === "INR" ? "en-IN" : currency === "EUR" ? "en-IE" : "en-US", {
      style: "currency",
      currency,
    }).format(amount);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Paid</Badge>;
      case 'unpaid': return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20">Unpaid</Badge>;
      case 'overdue': return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">Overdue</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Billing & Invoices</h1>
        <p className="text-muted-foreground mt-1">View your billing history and open invoices.</p>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : invoiceList.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6 py-4">Invoice</TableHead>
                  <TableHead className="px-6 py-4">Service Name</TableHead>
                  <TableHead className="px-6 py-4">Service ID</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4">Amount</TableHead>
                  <TableHead className="px-6 py-4">Due Date</TableHead>
                  <TableHead className="px-6 py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceList.map(invoice => {
                  const order = invoice.orderId ? orderById.get(invoice.orderId) : undefined;
                  const serviceName = invoice.orderName ?? invoice.serviceName ?? order?.serviceName ?? "-";
                  const serviceId = invoice.serviceId ?? order?.serviceId ?? null;
                  return (
                  <TableRow key={invoice.id}>
                    <TableCell className="px-6 py-4 font-medium">{invoice.invoiceNumber || `#INV-${invoice.id.toString().padStart(4, '0')}`}</TableCell>
                    <TableCell className="px-6 py-4">{serviceName}</TableCell>
                    <TableCell className="px-6 py-4 font-mono text-xs">{serviceId ? `#${serviceId}` : "-"}</TableCell>
                    <TableCell className="px-6 py-4">{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="px-6 py-4">{formatAmount(invoice.amount, invoice.currency)}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/invoices/${invoice.id}`}>
                          <Eye className="h-4 w-4 mr-2" /> View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No invoices found.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
