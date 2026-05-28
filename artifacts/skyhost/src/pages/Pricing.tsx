import { useState } from "react";
import { Link } from "wouter";
import { useListServices, type Service } from "@workspace/api-client-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toArray } from "@/lib/api-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2 } from "lucide-react";

export default function Pricing() {
  const { data: services, isLoading } = useListServices();
  const { currency, formatPrice, setCurrency } = useCurrency();
  const serviceList = toArray<Service>(services, ["services"]);

  const categories = Array.from(new Set(serviceList.map(s => s.category)));

  return (
    <div className="py-16 md:py-24">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Simple, transparent pricing</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            No hidden fees. No surprise charges. Just robust infrastructure support priced fairly.
          </p>
          
          <div className="inline-flex items-center justify-center p-1 bg-muted rounded-lg">
            <Button 
              variant={currency === "USD" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setCurrency("USD")}
              className="w-24"
            >
              USD ($)
            </Button>
            <Button 
              variant={currency === "EUR" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setCurrency("EUR")}
              className="w-24"
            >
              EUR (€)
            </Button>
            <Button 
              variant={currency === "INR" ? "default" : "ghost"} 
              size="sm"
              onClick={() => setCurrency("INR")}
              className="w-24"
            >
              INR (₹)
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-12 w-48" />
            <Skeleton className="h-64 w-full rounded-xl" />
            <Skeleton className="h-12 w-48 mt-12" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
        ) : (
          <div className="space-y-16">
            {categories.map(category => {
              const categoryServices = serviceList.filter(s => s.category === category);
              
              return (
                <div key={category}>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    {category}
                    <Badge variant="outline" className="text-xs font-normal">{categoryServices.length} plans</Badge>
                  </h2>
                  <div className="rounded-xl border overflow-hidden bg-card">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead className="w-1/3 py-4">Service Plan</TableHead>
                          <TableHead className="py-4 hidden md:table-cell">Features</TableHead>
                          <TableHead className="text-right py-4">Monthly Price</TableHead>
                          <TableHead className="w-[120px] py-4"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryServices.map(service => {
                          const features = toArray<string>(service.features, ["features"]);
                          return (
                          <TableRow key={service.id}>
                            <TableCell className="py-6 align-top">
                              <div className="font-bold text-lg mb-1">{service.name}</div>
                              <p className="text-sm text-muted-foreground line-clamp-2">{service.shortDescription}</p>
                            </TableCell>
                            <TableCell className="py-6 hidden md:table-cell align-top">
                              <ul className="space-y-2 text-sm text-muted-foreground">
                                {features.slice(0, 3).map((f, i) => (
                                  <li key={i} className="flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                    <span>{f}</span>
                                  </li>
                                ))}
                                {features.length > 3 && (
                                  <li className="text-xs italic">+ {features.length - 3} more</li>
                                )}
                              </ul>
                            </TableCell>
                            <TableCell className="text-right py-6 align-top">
                              <div className="text-2xl font-bold">
                                {formatPrice(service.priceUsd)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">per month</div>
                            </TableCell>
                            <TableCell className="py-6 align-top text-right">
                              <Button asChild variant="outline" size="sm">
                                <Link href={`/services/${service.id}`}>Details</Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
