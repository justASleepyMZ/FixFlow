import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
                <Wrench className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-display text-lg font-bold">FixFlow</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">
              Connecting customers with trusted repair professionals. Fast, reliable, transparent.
            </p>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/requests" className="hover:text-foreground transition-colors">Browse Requests</Link></li>
              <li><Link to="/register" className="hover:text-foreground transition-colors">Become a Worker</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Safety</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact Us</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">Legal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} FixFlow. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
