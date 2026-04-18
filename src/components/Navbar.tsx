import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wrench, Menu, X, User, HardHat, ShieldCheck, LogOut, Building2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const roleConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  user: { label: "Customer", icon: User, color: "bg-primary text-primary-foreground" },
  worker: { label: "Worker", icon: HardHat, color: "bg-secondary text-secondary-foreground" },
  company: { label: "Company", icon: Building2, color: "bg-accent text-accent-foreground" },
  admin: { label: "Admin", icon: ShieldCheck, color: "bg-destructive text-destructive-foreground" },
};

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { user, profile, userRole, signOut } = useAuth();

  const links = [
    { to: "/", label: "Home" },
    { to: "/requests", label: "Browse Requests" },
    ...(user ? [{ to: "/my-requests", label: "My Requests" }] : []),
    ...(userRole === "admin" ? [{ to: "/admin", label: "Admin" }] : []),
    { to: "/map", label: "Map" },
  ];

  const currentRole = userRole ? roleConfig[userRole] : null;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
            <Wrench className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight">FixFlow</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button variant={location.pathname === link.to ? "default" : "ghost"} size="sm">
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {currentRole && (
                <Badge className={`${currentRole.color} gap-1.5 px-3 py-1`}>
                  <currentRole.icon className="h-3.5 w-3.5" />
                  {currentRole.label}
                </Badge>
              )}
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="font-medium truncate max-w-[140px]">
                  {profile?.display_name ?? user.email}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
              </Button>
            </>
          ) : (
            <>
              <Link to="/login"><Button variant="ghost" size="sm">Log In</Button></Link>
              <Link to="/register"><Button variant="hero" size="sm">Sign Up</Button></Link>
            </>
          )}
        </div>

        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t bg-background p-4 md:hidden">
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setMobileOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">{link.label}</Button>
              </Link>
            ))}

            {user ? (
              <div className="mt-2 space-y-2">
                {currentRole && (
                  <Badge className={`${currentRole.color} gap-1.5 px-3 py-1 w-full justify-center`}>
                    <currentRole.icon className="h-3.5 w-3.5" />
                    {profile?.display_name ?? user.email}
                  </Badge>
                )}
                <Button variant="outline" className="w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            ) : (
              <div className="mt-2 flex gap-2">
                <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full">Log In</Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="hero" className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
