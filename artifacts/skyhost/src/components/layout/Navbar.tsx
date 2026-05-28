import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useAppearance } from "@/contexts/AppearanceContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, Globe, Moon, Sun } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navbar() {
  const { user, isAdmin } = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { settings, setThemeMode } = useAppearance();

  const navLinks = [
    { label: "Home", href: "/" },
    { label: "Services", href: "/services" },
    { label: "Pricing", href: "/pricing" },
    { label: "Testimonials", href: "/testimonials" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight">
            <span style={{ color: settings.brandSkyColor ?? settings.brandColor }}>Sky</span>
            <span style={{ color: settings.brandHostColor ?? settings.brandColor }}>Host</span>
            <span style={{ color: settings.brandSolutionsColor ?? settings.brandColor }}>Solutions</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setThemeMode(settings.themeMode === "dark" ? "light" : "dark")}
            title={settings.themeMode === "dark" ? "Switch to normal mode" : "Switch to dark mode"}
          >
            {settings.themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Globe className="h-4 w-4" />
                <span className="ml-2 font-medium">{currency}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setCurrency("USD")}>USD ($)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrency("EUR")}>EUR (€)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrency("INR")}>INR (₹)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden sm:flex items-center gap-4">
            {user ? (
              <Button asChild variant="default">
                <Link href={isAdmin ? "/admin" : "/dashboard"}>Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex flex-col gap-6">
              <nav className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="text-lg font-medium">
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="flex flex-col gap-4 mt-auto">
                {user ? (
                  <Button asChild className="w-full">
                    <Link href={isAdmin ? "/admin" : "/dashboard"}>Dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/register">Get Started</Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
