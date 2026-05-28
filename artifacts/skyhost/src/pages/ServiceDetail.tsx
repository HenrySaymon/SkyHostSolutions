import { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useGetService } from "@workspace/api-client-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchJson, toArray } from "@/lib/api-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CheckCircle, ArrowRight, ShieldCheck, Clock, Zap, PackageCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ServiceDetail() {
  const { id } = useParams();
  const { data, isLoading } = useGetService(Number(id));
  const { currency, formatPrice, setCurrency } = useCurrency();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [sslDetails, setSslDetails] = useState({
    commonName: "",
    organization: "",
    address: "",
    city: "",
    state: "",
    country: "",
    zipcode: "",
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-24">
        <Skeleton className="h-12 w-2/3 mb-4" />
        <Skeleton className="h-6 w-1/3 mb-12" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div className="md:col-span-2 space-y-6">
            <Skeleton className="h-96 w-full rounded-xl" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!data) {
    return <div className="container mx-auto px-4 py-24 text-center">Service not found.</div>;
  }

  const { service } = data;
  const features = toArray<string>(service.features, ["features"]);
  const relatedServices = toArray<typeof service>(data.relatedServices, ["relatedServices", "services"]);
  const isSslService = `${service.category ?? ""} ${service.name ?? ""}`.toLowerCase().includes("ssl");

  const displayPrice = () => {
    return formatPrice(service.priceUsd);
  };

  const handleOrderClick = () => {
    if (!user) {
      setLocation(`/login?redirect=/services/${service.id}`);
      return;
    }
    setConfirmOpen(true);
  };

  const handlePlaceOrder = async () => {
    if (isSslService) {
      const missing = Object.entries(sslDetails).find(([, value]) => !value.trim());
      if (missing) {
        toast({ title: "Please complete the SSL certificate details", variant: "destructive" });
        return;
      }
    }
    setIsPlacing(true);
    try {
      const data = await fetchJson<{ id: number }>("/api/client/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, currency, sslDetails: isSslService ? sslDetails : null }),
      });
      setOrderPlaced(true);
      setConfirmOpen(false);
      toast({
        title: "Order placed successfully",
        description: `Order #${data.id} is now pending. Our team will reach out with a payment link shortly.`,
      });
    } catch (e: unknown) {
      toast({
        title: e instanceof Error ? e.message : "Failed to place order",
        variant: "destructive",
      });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <div>
      {/* Hero */}
      <section className="bg-muted/30 border-b py-16">
        <div className="container mx-auto px-4">
          <Link href="/services" className="text-primary hover:underline text-sm font-medium flex items-center mb-6">
            &larr; Back to Services
          </Link>
          <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4">{service.category}</Badge>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{service.name}</h1>
              <p className="text-xl text-muted-foreground">{service.shortDescription}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

            {/* Main Content */}
            <div className="lg:col-span-2 space-y-12">
              {service.imageUrl && (
                <div className="rounded-xl overflow-hidden border bg-card">
                  <img src={service.imageUrl} alt={service.name} className="w-full h-auto object-cover aspect-[2/1]" />
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold mb-4">Overview</h2>
                <div className="prose prose-invert max-w-none text-muted-foreground">
                  <p>{service.description || service.shortDescription}</p>
                </div>
              </div>

              {features.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold mb-6">Features Included</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Pricing */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 border-primary/20 bg-card/50 backdrop-blur">
                <CardContent className="p-8">
                  <h3 className="text-lg font-semibold mb-6">Choose Currency</h3>
                  <div className="grid grid-cols-3 gap-2 mb-8">
                    {(["USD", "EUR", "INR"] as const).map((c) => (
                      <Button
                        key={c}
                        variant={currency === c ? "default" : "outline"}
                        onClick={() => setCurrency(c)}
                        className="w-full"
                      >
                        {c}
                      </Button>
                    ))}
                  </div>

                  <div className="mb-8">
                    <div className="text-sm text-muted-foreground mb-1">Monthly Price</div>
                    <div className="text-4xl font-bold text-foreground">{displayPrice()}</div>
                  </div>

                  {orderPlaced ? (
                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center space-y-3">
                      <PackageCheck className="h-8 w-8 text-green-400 mx-auto" />
                      <p className="text-sm font-semibold text-green-400">Order placed</p>
                      <p className="text-xs text-muted-foreground">
                        Pending admin approval. You will receive a payment link via invoice.
                      </p>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setLocation("/dashboard/orders")}>
                        View My Orders
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button size="lg" className="w-full text-lg h-14 mb-4" onClick={handleOrderClick}>
                        Place Order
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        No payment now — admin sends invoice after approval.
                      </p>
                    </>
                  )}

                  <div className="mt-8 space-y-4 border-t pt-6">
                    <div className="flex items-center gap-3 text-sm">
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                      <span>Enterprise SLA Included</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Clock className="h-5 w-5 text-blue-500" />
                      <span>24/7 Priority Support</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Zap className="h-5 w-5 text-yellow-500" />
                      <span>Instant Setup</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Order Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/40 border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Monthly price</span>
                <span className="font-bold text-primary">{displayPrice()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Currency</span>
                <span>{currency}</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your order will be placed as <strong>Pending</strong>. No payment is required now.
              Our team will review and send you a payment invoice via email.
            </p>
            {isSslService && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t pt-4">
                {[
                  ["Common name", "commonName", "example.com"],
                  ["Organization", "organization", "Acme Corp"],
                  ["Address", "address", "123 Main St"],
                  ["City", "city", "New York"],
                  ["State / Province", "state", "NY"],
                  ["Country", "country", "US"],
                  ["Zipcode", "zipcode", "10001"],
                ].map(([label, key, placeholder]) => (
                  <div key={key} className={key === "address" ? "space-y-2 sm:col-span-2" : "space-y-2"}>
                    <Label>{label}</Label>
                    <Input
                      value={sslDetails[key as keyof typeof sslDetails]}
                      onChange={(event) => setSslDetails((prev) => ({ ...prev, [key]: event.target.value }))}
                      placeholder={placeholder}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={isPlacing}>
              {isPlacing ? "Placing..." : "Confirm Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <section className="py-24 bg-muted/20 border-t">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold mb-12 text-center">Related Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedServices.slice(0, 3).map(related => (
                <Card key={related.id} className="bg-card hover:border-primary/50 transition-colors group">
                  <CardContent className="p-6">
                    <Badge variant="secondary" className="mb-4">{related.category}</Badge>
                    <h3 className="text-xl font-bold mb-2">{related.name}</h3>
                    <p className="text-muted-foreground mb-6 line-clamp-2">{related.shortDescription}</p>
                    <div className="flex items-center justify-between">
                      <div className="font-bold">
                        {formatPrice(related.priceUsd)}
                      </div>
                      <Button variant="ghost" asChild className="group-hover:text-primary">
                        <Link href={`/services/${related.id}`}>View <ArrowRight className="ml-2 h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
