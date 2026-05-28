import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useListServices, useListTestimonials, type Service } from "@workspace/api-client-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toArray } from "@/lib/api-data";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, CheckCircle, Shield, Server, Zap, Clock } from "lucide-react";

export default function Home() {
  const { data: services, isLoading: servicesLoading } = useListServices();
  const { data: testimonials, isLoading: testimonialsLoading } = useListTestimonials();
  const { formatPrice } = useCurrency();
  const serviceList = toArray<Service>(services, ["services"]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background pt-24 pb-32">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
        <div className="container relative mx-auto px-4 text-center">
          <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">Trusted by 500+ Businesses</Badge>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-foreground">
            Expert Technical Services.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">Zero Compromise.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Enterprise-grade server management, DevOps, and infrastructure support. We handle the complexity so you can focus on growth.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" asChild className="text-lg px-8">
              <Link href="/services">Explore Services</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="text-lg px-8">
              <Link href="/contact">Talk to an Expert</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border/50 bg-muted/20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Servers Managed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Uptime SLA</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">24/7</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Expert Support</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">150+</div>
              <div className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Enterprise Clients</div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Infrastructure Solutions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Comprehensive technical services tailored for modern business requirements.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {servicesLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="bg-card">
                  <CardContent className="p-6">
                    <Skeleton className="h-48 w-full mb-4 rounded-md" />
                    <Skeleton className="h-6 w-2/3 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : (
              serviceList.slice(0, 3).map((service) => (
                <Card key={service.id} className="bg-card hover:border-primary/50 transition-colors group">
                  <CardContent className="p-6">
                    <div className="h-48 mb-6 overflow-hidden rounded-md bg-muted">
                      {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                      )}
                    </div>
                    <div className="mb-4">
                      <Badge variant="secondary" className="mb-2">{service.category}</Badge>
                      <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                      <p className="text-muted-foreground line-clamp-2 mb-4">{service.shortDescription}</p>
                      <div className="text-2xl font-bold text-foreground">
                        {formatPrice(service.priceUsd)}
                        <span className="text-sm text-muted-foreground font-normal">/mo</span>
                      </div>
                    </div>
                    <Button className="w-full group-hover:bg-primary" asChild>
                      <Link href={`/services/${service.id}`}>View Details <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
          <div className="mt-12 text-center">
            <Button variant="outline" size="lg" asChild>
              <Link href="/services">View All Services</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-24 bg-muted/10 border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Built for scale, secured by design.</h2>
              <p className="text-muted-foreground mb-8 text-lg">We don't just maintain your infrastructure; we optimize it. Our proactive approach ensures your systems run faster, safer, and without interruption.</p>
              
              <div className="space-y-6">
                {[
                  { icon: Shield, title: "Enterprise Security", desc: "Military-grade encryption, regular audits, and proactive threat mitigation." },
                  { icon: Zap, title: "Performance Tuning", desc: "Optimized stacks tailored specifically to your application's unique requirements." },
                  { icon: Clock, title: "24/7/365 Monitoring", desc: "Always-on surveillance catches and resolves issues before they impact users." }
                ].map((feature, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="mt-1 bg-primary/10 p-3 rounded-lg text-primary h-fit">
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{feature.title}</h4>
                      <p className="text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/20 to-background border border-primary/20 p-8 flex items-center justify-center shadow-2xl">
                <div className="grid grid-cols-2 gap-4 w-full h-full">
                  <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col justify-between">
                    <Server className="h-8 w-8 text-primary mb-4" />
                    <div>
                      <div className="text-2xl font-bold">99.99%</div>
                      <div className="text-xs text-muted-foreground">Uptime</div>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col justify-between mt-8">
                    <Shield className="h-8 w-8 text-green-500 mb-4" />
                    <div>
                      <div className="text-2xl font-bold">0</div>
                      <div className="text-xs text-muted-foreground">Breaches</div>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col justify-between -mt-8">
                    <Zap className="h-8 w-8 text-yellow-500 mb-4" />
                    <div>
                      <div className="text-2xl font-bold">&lt;50ms</div>
                      <div className="text-xs text-muted-foreground">Latency</div>
                    </div>
                  </div>
                  <div className="bg-card rounded-lg border shadow-sm p-4 flex flex-col justify-between">
                    <CheckCircle className="h-8 w-8 text-primary mb-4" />
                    <div>
                      <div className="text-2xl font-bold">24/7</div>
                      <div className="text-xs text-muted-foreground">Support</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container relative mx-auto px-4 text-center max-w-3xl">
          <h2 className="text-4xl font-bold mb-6">Ready to upgrade your infrastructure?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join hundreds of businesses that trust SkyHostSolutions with their critical systems.
          </p>
          <Button size="lg" className="text-lg px-8 py-6" asChild>
            <Link href="/register">Get Started Today</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
