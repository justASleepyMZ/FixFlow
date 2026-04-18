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
              <Button
                variant={location.pathname === link.to ? "default" : "ghost"}
                size="sm"
              >
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Badge className={`${currentRole?.color ?? "bg-muted text-muted-foreground"} gap-1.5 px-3 py-1`}>
                {currentRole && <currentRole.icon className="h-3.5 w-3.5" />}
                {currentRole?.label ?? "User"}
              </Badge>
              <Link to="/profile">
                <Button variant="ghost" size="sm" className="font-medium truncate max-w-[120px]">
                  {profile?.display_name ?? user.email}
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
              </Button>
            </>
          ) : role ? (
            <>
              <Badge className={`${currentRole?.color} gap-1.5 px-3 py-1`}>
                {currentRole && <currentRole.icon className="h-3.5 w-3.5" />}
                {currentRole?.label} Mode
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setRole(null)}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Exit
              </Button>
            </>
          ) : (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <User className="h-3.5 w-3.5" /> Quick Access
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Try without signing up
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleQuickRole("user")} className="gap-2 cursor-pointer">
                    <User className="h-4 w-4" /> Browse as Customer
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickRole("worker")} className="gap-2 cursor-pointer">
                    <HardHat className="h-4 w-4" /> Browse as Worker
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickRole("company")} className="gap-2 cursor-pointer">
                    <Building2 className="h-4 w-4" /> Browse as Company
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleQuickRole("admin")} className="gap-2 cursor-pointer">
                    <ShieldCheck className="h-4 w-4" /> Browse as Admin
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Link to="/login">
                <Button variant="ghost" size="sm">Log In</Button>
              </Link>
              <Link to="/register">
                <Button variant="hero" size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
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
                <Badge className={`${currentRole?.color ?? "bg-muted text-muted-foreground"} gap-1.5 px-3 py-1 w-full justify-center`}>
                  {currentRole && <currentRole.icon className="h-3.5 w-3.5" />}
                  {profile?.display_name ?? user.email}
                </Badge>
                <Button variant="outline" className="w-full" onClick={() => { signOut(); setMobileOpen(false); }}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sign Out
                </Button>
              </div>
            ) : role ? (
              <div className="mt-2 space-y-2">
                <Badge className={`${currentRole?.color} gap-1.5 px-3 py-1 w-full justify-center`}>
                  {currentRole && <currentRole.icon className="h-3.5 w-3.5" />}
                  {currentRole?.label} Mode
                </Badge>
                <Button variant="outline" className="w-full" onClick={() => handleQuickRole(null)}>
                  <LogOut className="mr-1.5 h-3.5 w-3.5" /> Exit Role
                </Button>
              </div>
            ) : (
              <>
                <div className="mt-2 border-t pt-3">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">Quick Access (no signup)</p>
                  <div className="grid grid-cols-4 gap-2">
                    <Button variant="outline" size="sm" className="flex-col gap-1 h-auto py-2" onClick={() => handleQuickRole("user")}>
                      <User className="h-4 w-4" />
                      <span className="text-[10px]">Customer</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-col gap-1 h-auto py-2" onClick={() => handleQuickRole("worker")}>
                      <HardHat className="h-4 w-4" />
                      <span className="text-[10px]">Worker</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-col gap-1 h-auto py-2" onClick={() => handleQuickRole("company")}>
                      <Building2 className="h-4 w-4" />
                      <span className="text-[10px]">Company</span>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-col gap-1 h-auto py-2" onClick={() => handleQuickRole("admin")}>
                      <ShieldCheck className="h-4 w-4" />
                      <span className="text-[10px]">Admin</span>
                    </Button>
                  </div>
                </div>
                <div className="mt-2 flex gap-2">
                  <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="outline" className="w-full">Log In</Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                    <Button variant="hero" className="w-full">Sign Up</Button>
                  </Link>
                </div>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
