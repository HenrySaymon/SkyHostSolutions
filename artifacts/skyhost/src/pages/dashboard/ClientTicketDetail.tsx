import { useParams, Link } from "wouter";
import { useGetClientTicket, useReplyToTicket, getGetClientTicketQueryKey, type TicketReply } from "@workspace/api-client-react";
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
import { format } from "date-fns";
import { ArrowLeft, User, Shield, RefreshCw, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const replySchema = z.object({
  message: z.string().min(1, "Message is required"),
});

export default function ClientTicketDetail() {
  const { id } = useParams();
  const ticketId = Number(id);
  const { data, isLoading } = useGetClientTicket(ticketId);
  const replyToTicket = useReplyToTicket();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof replySchema>>({
    resolver: zodResolver(replySchema),
    defaultValues: { message: "" },
  });

  if (isLoading) return <div className="p-8"><Skeleton className="h-96 w-full max-w-4xl mx-auto" /></div>;
  if (!data) return <div>Ticket not found</div>;

  const { ticket } = data;
  const replies = toArray<TicketReply>(data.replies, ["replies"]);

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return <Badge className="bg-yellow-500/15 text-yellow-400 border-yellow-500/30">Open</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30">In Progress</Badge>;
      case 'resolved': return <Badge className="bg-green-500/15 text-green-400 border-green-500/30">Resolved</Badge>;
      case 'closed': return <Badge className="bg-muted text-muted-foreground">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <Badge variant="destructive">High</Badge>;
      case 'medium': return <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const onSubmit = (formData: z.infer<typeof replySchema>) => {
    replyToTicket.mutate({ id: ticketId, data: formData }, {
      onSuccess: () => {
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetClientTicketQueryKey(ticketId) });
        toast({ title: isResolved ? "Ticket reopened with your follow-up" : "Reply sent" });
      },
      onError: () => {
        toast({ title: "Failed to send reply", variant: "destructive" });
      }
    });
  };

  const handleReopen = () => {
    replyToTicket.mutate({ id: ticketId, data: { message: "Reopening this ticket for further assistance." } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClientTicketQueryKey(ticketId) });
        toast({ title: "Ticket reopened successfully" });
      },
      onError: () => {
        toast({ title: "Failed to reopen ticket", variant: "destructive" });
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
          <Link href="/dashboard/tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets</Link>
        </Button>
        {isResolved && (
          <Button variant="outline" size="sm" onClick={handleReopen} disabled={replyToTicket.isPending}>
            <RefreshCw className="mr-2 h-3.5 w-3.5" />
            Reopen Ticket
          </Button>
        )}
      </div>

      <Card className="bg-card">
        <CardHeader className="border-b pb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <CardTitle className="text-2xl font-bold">{ticket.subject}</CardTitle>
            <div className="flex gap-2 shrink-0">
              {getPriorityBadge(ticket.priority)}
              {getStatusBadge(ticket.status)}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            Ticket #{ticket.id} &bull; Opened on {format(new Date(ticket.createdAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="flex flex-col">
            {replies.map((reply) => (
              <div key={reply.id} className={`p-6 border-b last:border-b-0 ${reply.isAdmin ? 'bg-primary/5' : 'bg-background'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${reply.isAdmin ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {reply.isAdmin ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-semibold flex items-center gap-2">
                      {reply.authorName || (reply.isAdmin ? 'Support Engineer' : 'You')}
                      {reply.isAdmin && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1 rounded-sm bg-primary/20 text-primary">Staff</Badge>
                      )}
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

        <CardFooter className="p-6 bg-muted/20 border-t flex-col items-stretch gap-0">
          {isResolved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4 p-3 bg-muted/30 rounded-lg border border-border">
              <MessageSquarePlus className="h-4 w-4 shrink-0 text-primary" />
              <span>This ticket is resolved. Sending a reply will automatically reopen it.</span>
            </div>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder={isResolved ? "Describe your follow-up issue to reopen this ticket..." : "Type your reply here..."}
                        className="min-h-[120px] bg-background"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={replyToTicket.isPending}>
                  {replyToTicket.isPending
                    ? "Sending..."
                    : isResolved
                    ? "Send & Reopen Ticket"
                    : "Send Reply"}
                </Button>
              </div>
            </form>
          </Form>
        </CardFooter>
      </Card>
    </div>
  );
}
