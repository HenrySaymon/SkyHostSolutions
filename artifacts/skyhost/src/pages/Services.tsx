import { useState } from "react";
import { Link } from "wouter";
import { useListServices, type Service } from "@workspace/api-client-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toArray } from "@/lib/api-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";

export default function Services() {
  const { data: services, isLoading } = useListServices();
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState("all");
  const serviceList = toArray<Service>(services, ["services"]);

  const categories = ["all", ...Array.from(new Set(serviceList.map(s => s.category)))];

  const filteredServices = serviceList.filter(s => activeTab === "all" || s.category === activeTab);

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Our Services</h1>
          <p className="text-xl text-muted-foreground">
            Enterprise-grade infrastructure management and support tailored for your specific needs.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="p-6">
                  <Skeleton className="h-48 w-full mb-4 rounded-md" />
                  <Skeleton className="h-6 w-2/3 mb-2" />
                  <Skeleton className="h-4 w-full mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-8 flex flex-wrap justify-start h-auto gap-2 bg-transparent">
              <TabsTrigger 
                value="all" 
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border rounded-full px-6 py-2"
              >
                All Services
              </TabsTrigger>
              {categories.filter(c => c !== "all").map(category => (
                <TabsTrigger 
                  key={category} 
                  value={category}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border rounded-full px-6 py-2"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredServices.map(service => (
                <Card key={service.id} className="bg-card hover:border-primary/50 transition-colors flex flex-col">
                  <CardContent className="p-6 flex-1 flex flex-col">
                    <div className="h-48 mb-6 overflow-hidden rounded-md bg-muted">
                      {service.imageUrl ? (
                        <img src={service.imageUrl} alt={service.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Image</div>
                      )}
                    </div>
                    <Badge variant="secondary" className="w-fit mb-3">{service.category}</Badge>
                    <h3 className="text-xl font-bold mb-2">{service.name}</h3>
                    <p className="text-muted-foreground mb-6 flex-1">{service.shortDescription}</p>
                    
                    <div className="mt-auto pt-4 border-t flex items-center justify-between">
                      <div className="text-2xl font-bold text-foreground">
                        {formatPrice(service.priceUsd)}
                        <span className="text-sm text-muted-foreground font-normal">/mo</span>
                      </div>
                      <Button asChild variant="ghost" className="hover:bg-primary/10 hover:text-primary">
                        <Link href={`/services/${service.id}`}>View <ArrowRight className="ml-2 h-4 w-4" /></Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredServices.length === 0 && (
              <div className="text-center py-24 text-muted-foreground">
                No services found in this category.
              </div>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}
