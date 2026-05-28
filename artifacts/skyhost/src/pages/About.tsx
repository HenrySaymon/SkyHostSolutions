import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Shield, Server, Users, Zap, CheckCircle2 } from "lucide-react";

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section className="py-20 md:py-32 border-b bg-muted/20 relative overflow-hidden">
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-1/3 h-full bg-primary/5 blur-3xl rounded-full pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Engineering Excellence, <span className="text-primary">Delivered.</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-balance">
              SkyHostSolutions was founded with a singular mission: to provide uncompromising, enterprise-grade technical infrastructure support for businesses that cannot afford downtime.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground text-lg leading-relaxed">
                <p>
                  Started in 2018 by a team of ex-enterprise DevOps engineers, we saw a gap in the market. Businesses were migrating to complex cloud infrastructures but lacked the specialized in-house talent to maintain, secure, and optimize them.
                </p>
                <p>
                  We built SkyHostSolutions to be that missing puzzle piece. We operate as an extension of your engineering team, taking ownership of the infrastructure layer so your developers can focus on building features, not fighting fires.
                </p>
                <p>
                  Today, we manage over 500 critical servers for 150+ clients globally, maintaining a rigorous 99.99% uptime SLA across our portfolio.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border rounded-2xl p-6 shadow-sm aspect-square flex flex-col justify-center text-center">
                <div className="text-4xl font-black text-primary mb-2">2018</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Year Founded</div>
              </div>
              <div className="bg-card border rounded-2xl p-6 shadow-sm aspect-square flex flex-col justify-center text-center mt-8">
                <div className="text-4xl font-black text-primary mb-2">150+</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Enterprise Clients</div>
              </div>
              <div className="bg-card border rounded-2xl p-6 shadow-sm aspect-square flex flex-col justify-center text-center -mt-8">
                <div className="text-4xl font-black text-primary mb-2">24/7</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Global Support</div>
              </div>
              <div className="bg-card border rounded-2xl p-6 shadow-sm aspect-square flex flex-col justify-center text-center">
                <div className="text-4xl font-black text-primary mb-2">500+</div>
                <div className="text-sm text-muted-foreground uppercase tracking-wider font-semibold">Servers Managed</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-card border-y">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Core Values</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">The principles that guide every decision, every deployment, and every support ticket.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: Shield, 
                title: "Security First", 
                desc: "We operate on a zero-trust model. Security isn't a feature; it's the foundation of every architecture we build." 
              },
              { 
                icon: Zap, 
                title: "Proactive, Not Reactive", 
                desc: "We fix problems before you even know they exist. Our monitoring catches anomalies before they become outages." 
              },
              { 
                icon: Users, 
                title: "Radical Transparency", 
                desc: "No black boxes. You get full visibility into what we're doing, why we're doing it, and how your systems are performing." 
              }
            ].map((value, i) => (
              <div key={i} className="bg-background border p-8 rounded-2xl hover:border-primary/50 transition-colors">
                <div className="bg-primary/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 text-primary">
                  <value.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Partner with the Experts</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let's discuss how we can secure, scale, and optimize your infrastructure.
          </p>
          <Button size="lg" className="px-8" asChild>
            <Link href="/contact">Contact Our Team</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}