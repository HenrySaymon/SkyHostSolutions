import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 text-muted-foreground py-12 md:py-16">
      <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <Link href="/" className="flex items-center gap-2 mb-4">
            <span className="font-bold text-xl tracking-tight text-foreground">SkyHost<span className="text-primary">Solutions</span></span>
          </Link>
          <p className="text-sm">
            Premium technical services and infrastructure support for businesses worldwide. Zero compromise.
          </p>
        </div>
        
        <div>
          <h4 className="font-semibold text-foreground mb-4">Services</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/services" className="hover:text-primary transition-colors">Server Management</Link></li>
            <li><Link href="/services" className="hover:text-primary transition-colors">Infrastructure Support</Link></li>
            <li><Link href="/services" className="hover:text-primary transition-colors">DevOps Solutions</Link></li>
            <li><Link href="/services" className="hover:text-primary transition-colors">SSL Certificates</Link></li>
            <li><Link href="/services" className="hover:text-primary transition-colors">WordPress Maintenance</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-foreground mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
            <li><Link href="/testimonials" className="hover:text-primary transition-colors">Testimonials</Link></li>
            <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
          </ul>
        </div>
        
        <div>
          <h4 className="font-semibold text-foreground mb-4">Contact</h4>
          <ul className="space-y-2 text-sm">
            <li>support@skyhostsolutions.com</li>
            <li>1-800-SKY-HOST</li>
            <li>Global 24/7 Support</li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 mt-12 pt-8 border-t border-border text-sm flex flex-col md:flex-row items-center justify-between">
        <p>© {new Date().getFullYear()} SkyHostSolutions. All rights reserved.</p>
        <div className="flex gap-4 mt-4 md:mt-0">
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}