import { useForm } from "react-hook-form";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getListClientTicketsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { fetchJson } from "@/lib/api-data";

type ClientOrder = {
  id: number;
  serviceId: number;
  serviceName: string | null;
  status: string;
};

const ticketSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  serviceId: z.string().min(1, "Select the related service"),
  priority: z.enum(["low", "medium", "high"]),
  message: z.string().min(10, "Please provide more details in your message"),
});

export default function NewTicket() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", serviceId: "", priority: "medium", message: "" },
  });

  useEffect(() => {
    fetchJson<ClientOrder[]>("/api/client/orders")
      .then(setOrders)
      .catch(() => setOrders([]));
  }, []);

  const relatedServices = useMemo(() => {
    const seen = new Set<number>();
    return orders.filter((order) => {
      if (seen.has(order.serviceId)) return false;
      seen.add(order.serviceId);
      return true;
    });
  }, [orders]);

  const onSubmit = async (data: z.infer<typeof ticketSchema>) => {
    setSubmitting(true);
    try {
      await fetchJson("/api/client/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, serviceId: Number(data.serviceId) }),
      });
      queryClient.invalidateQueries({ queryKey: getListClientTicketsQueryKey() });
      toast({ title: "Ticket created", description: "Support team has been notified." });
      setLocation("/dashboard/tickets");
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create ticket.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center mb-8">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent -ml-2">
          <Link href="/dashboard/tickets"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Tickets</Link>
        </Button>
      </div>

      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-2xl">Open a Support Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="E.g., Server is uncreachable" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Service</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {relatedServices.map((order) => (
                            <SelectItem key={order.serviceId} value={String(order.serviceId)}>
                              {order.serviceName ?? `Service #${order.serviceId}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low - General query</SelectItem>
                          <SelectItem value="medium">Medium - Issue impacting work</SelectItem>
                          <SelectItem value="high">High - Critical outage</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Message Details</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please provide as much detail as possible, including IP addresses, error codes, and steps to reproduce..." 
                        className="min-h-[200px]" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Our engineers will respond to high priority tickets within 15 minutes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
