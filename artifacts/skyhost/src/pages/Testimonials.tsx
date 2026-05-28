import { useListTestimonials, type Testimonial } from "@workspace/api-client-react";
import { toArray } from "@/lib/api-data";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Star } from "lucide-react";

export default function Testimonials() {
  const { data: testimonials, isLoading } = useListTestimonials();
  const testimonialList = toArray<Testimonial>(testimonials, ["testimonials"]);

  return (
    <div className="py-16 md:py-24 bg-muted/10 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Client Success Stories</h1>
          <p className="text-xl text-muted-foreground">
            Don't just take our word for it. Here's what engineering leaders have to say about working with SkyHostSolutions.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array(6).fill(0).map((_, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-4">
                    {Array(5).fill(0).map((_, j) => <Skeleton key={j} className="h-5 w-5 rounded-full" />)}
                  </div>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3 mb-8" />
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-24 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonialList.map(testimonial => (
              <Card key={testimonial.id} className="bg-card border-border/50 hover:border-primary/30 transition-colors shadow-sm">
                <CardContent className="p-8">
                  <div className="flex gap-1 mb-6 text-yellow-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-5 w-5 ${i < testimonial.rating ? "fill-current" : "text-muted opacity-30"}`} />
                    ))}
                  </div>
                  <p className="text-lg mb-8 leading-relaxed">"{testimonial.review}"</p>
                  <div className="flex items-center gap-4 mt-auto">
                    <Avatar className="h-12 w-12 border">
                      <AvatarImage src={testimonial.avatarUrl} alt={testimonial.name} />
                      <AvatarFallback className="bg-primary/10 text-primary font-bold">
                        {testimonial.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-bold">{testimonial.name}</div>
                      <div className="text-sm text-primary">{testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
