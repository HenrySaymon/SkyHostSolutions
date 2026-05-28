import { useParams, Link } from "wouter";
import { useGetAdminTicket, useAdminReplyToTicket, useUpdateAdminTicket, getGetAdminTicketQueryKey, type TicketReply } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toArray } from "@/lib/api-data";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ArrowLeft, User, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchJson } from "@/lib/api-data";

type ClientService = {
  serviceId: number;
  serviceName: string | null;
  orderId: number;
  status: string;
  amount: number;
  currency: string;
};

const replySchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export default function AdminTicketDetail() {
  const { id } = useParams();
  const ticketId = Number(id);
  const { data, isLoading } = useGetAdminTicket(ticketId);
  const replyToTicket = useAdminReplyToTicket();
  const updateTicket = useUpdateAdminTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: { message: "" },
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full" /></div>;
  if (!data) return <div>Ticket not found</div>;

  const { ticket } = data;
  const replies = toArray<TicketReply>(data.replies, ["replies"]);
  const clientServices = toArray<ClientService>((data as { clientServices?: ClientService[] }).clientServices, ["clientServices"]);

  const handleStatusChange = (status: string) => {
    updateTicket.mutate({ id: ticketId, data: { status } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminTicketQueryKey(ticketId) });
        toast({ title: "Status updated" });
      }
    });
  };

  const handlePriorityChange = (priority: string) => {
    updateTicket.mutate({ id: ticketId, data: { priority } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAdminTicketQueryKey(ticketId) });
        toast({ title: "Priority updated" });
      }
    });
  };

  const handleServiceChange = async (serviceId: string) => {
    try {
      await fetchJson(`/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: Number(serviceId) }),
      });
      queryClient.invalidateQueries({ queryKey: getGetAdminTicketQueryKey(ticketId) });
      toast({ title: "Related service updated" });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : "Failed to update service", variant: "destructive" });
    }
  };

  const onSubmit = (formData: z.infer<typeof replySchema>) => {
    replyToTicket.mutate({ id: ticketId, data: formData }, {
      onSuccess: () => {
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetAdminTicketQueryKey(ticketId) });
        toast({ title: "Reply sent" });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
          <Link href="/admin/tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets</Link>
        </Button>
        <div className="flex gap-4">
          <Select defaultValue={ticket.priority} onValueChange={handlePriorityChange}>
            <SelectTrigger className="w-[120px] bg-background">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="medium">Med Priority</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={String((ticket as { serviceId?: number | null }).serviceId ?? "")}
            onValueChange={handleServiceChange}
          >
            <SelectTrigger className="w-[220px] bg-background">
              <SelectValue placeholder="Related service" />
            </SelectTrigger>
            <SelectContent>
              {clientServices.map((service) => (
                <SelectItem key={`${service.serviceId}-${service.orderId}`} value={String(service.serviceId)}>
                  {service.serviceName ?? `Service #${service.serviceId}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select defaultValue={ticket.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[130px] bg-background font-semibold">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b pb-6 bg-muted/20">
          <div className="flex items-center gap-3 mb-2 text-sm text-muted-foreground">
            <Button variant="link" className="h-auto p-0 font-semibold" asChild>
              <Link href={`/admin/clients/${ticket.clientId}`}>{ticket.clientName}</Link>
            </Button>
            <span>•</span>
            <span>{(ticket as { serviceName?: string | null }).serviceName ?? "No service selected"}</span>
            <span>•</span>
            <span>Opened {format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
          </div>
          <CardTitle className="text-2xl font-bold">{ticket.subject}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="flex flex-col">
            {replies.map((reply) => (
              <div key={reply.id} className={`p-6 border-b ${reply.isAdmin ? 'bg-primary/5' : 'bg-background'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${reply.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {reply.isAdmin ? <ShieldAlert className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {reply.authorName || (reply.isAdmin ? 'You (Staff)' : ticket.clientName)}
                      {reply.isAdmin && <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm bg-primary/20 text-primary">Staff</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(reply.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                </div>
                <div className="pl-11 whitespace-pre-wrap leading-relaxed text-sm">
                  {reply.message}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="p-6 border-t bg-muted/10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea 
                        placeholder="Type admin response..." 
                        className="min-h-[150px] bg-background font-mono text-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={replyToTicket.isPending}>
                  {replyToTicket.isPending ? "Sending..." : "Send Official Reply"}
                </Button>
              </div>
            </form>
          </Form>
        </CardFooter>
      </Card>
    </div>
  );
}
