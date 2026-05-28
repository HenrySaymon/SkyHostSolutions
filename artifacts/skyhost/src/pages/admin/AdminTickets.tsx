import { useState, useMemo } from "react";
import { useListAdminTickets, useUpdateAdminTicket, getListAdminTicketsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { toArray } from "@/lib/api-data";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpDown } from "lucide-react";

const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;
type TicketStatus = typeof TICKET_STATUSES[number];

const STATUS_STYLE: Record<string, string> = {
  open:        "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  resolved:    "bg-green-500/10 text-green-500 border-green-500/30",
};

export default function AdminTickets() {
  const { data: tickets, isLoading } = useListAdminTickets();
  const ticketList = toArray<NonNullable<typeof tickets>[number]>(tickets, ["tickets"]);
  const updateTicket = useUpdateAdminTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const handleStatusChange = (id: number, status: string) => {
    updateTicket.mutate({ id, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminTicketsQueryKey() });
        toast({ title: "Ticket status updated" });
      }
    });
  };

  const counts = useMemo(() => {
    const r = { all: ticketList.length, open: 0, in_progress: 0, resolved: 0 };
    for (const t of ticketList) { if (t.status in r) (r as Record<string, number>)[t.status]++; }
    return r;
  }, [ticketList]);

  const filtered = useMemo(() => {
    let list = statusFilter === "all" ? [...ticketList] : ticketList.filter((t) => t.status === statusFilter);
    list = list.sort((a, b) => {
      const dateA = new Date(a.updatedAt ?? a.createdAt).getTime();
      const dateB = new Date(b.updatedAt ?? b.createdAt).getTime();
      return sortDir === "desc" ? dateB - dateA : dateA - dateB;
    });
    return list;
  }, [ticketList, statusFilter, sortDir]);

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge variant="secondary" className="bg-orange-500/20 text-orange-500">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h1 className="text-3xl font-bold tracking-tight">Support Tickets</h1>
      </div>

      {/* Status Filter + Sort */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["all", ...TICKET_STATUSES] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              statusFilter === s
                ? s === "all" ? "bg-primary text-primary-foreground border-primary"
                  : `${STATUS_STYLE[s]} border-current`
                : "bg-transparent text-muted-foreground border-border hover:border-muted-foreground/50"
            }`}
          >
            {s === "all" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
            <span className="ml-2 text-xs opacity-70">{counts[s as keyof typeof counts]}</span>
          </button>
        ))}
        <Button
          variant="outline" size="sm"
          className="gap-2 ml-auto shrink-0"
          onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}
        >
          <ArrowUpDown className="h-4 w-4" />
          {sortDir === "desc" ? "Newest" : "Oldest"}
        </Button>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="px-6 py-4">Subject</TableHead>
                  <TableHead className="px-6 py-4">Client</TableHead>
                  <TableHead className="px-6 py-4">Service</TableHead>
                  <TableHead className="px-6 py-4">Priority</TableHead>
                  <TableHead className="px-6 py-4">Updated</TableHead>
                  <TableHead className="px-6 py-4">Status</TableHead>
                  <TableHead className="px-6 py-4 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(ticket => (
                  <TableRow key={ticket.id}>
                    <TableCell className="px-6 py-4 font-medium max-w-[250px] truncate">{ticket.subject}</TableCell>
                    <TableCell className="px-6 py-4">
                      <Button variant="link" className="h-auto p-0" asChild>
                        <Link href={`/admin/clients/${ticket.clientId}`}>{ticket.clientName}</Link>
                      </Button>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {(ticket as { serviceName?: string | null }).serviceName ?? "Unassigned"}
                    </TableCell>
                    <TableCell className="px-6 py-4">{getPriorityBadge(ticket.priority)}</TableCell>
                    <TableCell className="px-6 py-4 text-sm text-muted-foreground">
                      {format(new Date(ticket.updatedAt || ticket.createdAt), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell className="px-6 py-4">
                      <Select
                        defaultValue={ticket.status}
                        onValueChange={(val) => handleStatusChange(ticket.id, val)}
                      >
                        <SelectTrigger className={`w-[130px] h-8 text-xs font-semibold ${STATUS_STYLE[ticket.status] ?? ""}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/tickets/${ticket.id}`}>View Thread</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-10 text-center text-muted-foreground">
                      No tickets found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
