import { useListClientTickets, type Ticket } from "@workspace/api-client-react";
import { Link } from "wouter";
import { toArray } from "@/lib/api-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, TicketIcon } from "lucide-react";

export default function ClientTickets() {
  const { data: tickets, isLoading } = useListClientTickets();
  const ticketList = toArray<Ticket>(tickets, ["tickets"]);

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Open</Badge>;
      case 'in_progress': return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">In Progress</Badge>;
      case 'resolved': return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Resolved</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <Badge variant="secondary" className="bg-red-500/10 text-red-500">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-orange-500/10 text-orange-500">Medium</Badge>;
      case 'low': return <Badge variant="secondary" className="bg-muted text-muted-foreground">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
          <p className="text-muted-foreground mt-1">Get help with your infrastructure and services.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/tickets/new"><Plus className="mr-2 h-4 w-4" /> New Ticket</Link>
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
          ) : ticketList.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6 py-4">Subject</TableHead>
                  <TableHead className="px-6 py-4">Priority</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4">Last Updated</TableHead>
                  <TableHead className="px-6 py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ticketList.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-4 font-medium max-w-[300px] truncate">{ticket.subject}</TableCell>
                    <TableCell className="px-6 py-4">{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="px-6 py-4">{getStatusBadge(ticket.status)}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(ticket.updatedAt || ticket.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/dashboard/tickets/${ticket.id}`}>View</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <TicketIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="mb-4">No support tickets found.</p>
              <Button asChild variant="outline">
                <Link href="/dashboard/tickets/new">Create your first ticket</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
