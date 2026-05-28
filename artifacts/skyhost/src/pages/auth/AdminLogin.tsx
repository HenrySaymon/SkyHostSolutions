import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLoginAdmin, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Shield } from "lucide-react";

const loginSchema = z.object({
  email: z.string(),
  password: z.string().min(1, "Password is required"),
});

export default function AdminLogin() {
  const loginAdmin = useLoginAdmin();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = (data: z.infer<typeof loginSchema>) => {
    loginAdmin.mutate({ data }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        toast({ title: "Admin Login successful" });
        setLocation("/admin");
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid admin credentials.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md shadow-2xl border-primary/20 bg-card relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
        <CardHeader className="space-y-4 text-center pt-10 pb-6">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center text-primary">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">Admin System Access</CardTitle>
            <CardDescription className="text-base mt-2">Restricted area. Authorized personnel only.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pb-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username / Email</FormLabel>
                    <FormControl>
                      <Input placeholder="admin" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="bg-background" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full text-base py-6" disabled={loginAdmin.isPending}>
                {loginAdmin.isPending ? "Authenticating..." : "Authenticate"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}