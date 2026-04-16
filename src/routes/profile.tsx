import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Building2, HardHat, ShieldCheck, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const roleIcons: Record<string, React.ElementType> = {
  user: User,
  worker: HardHat,
  company: Building2,
  admin: ShieldCheck,
};

const roleLabels: Record<string, string> = {
  user: "Customer",
  worker: "Worker",
  company: "Company",
  admin: "Admin",
};

const Profile = () => {
  const { user, profile, companyProfile, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" } as any);
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
    }
    if (companyProfile) {
      setCompanyName(companyProfile.company_name ?? "");
      setCompanyDescription(companyProfile.company_description ?? "");
      setCompanyAddress(companyProfile.company_address ?? "");
      setTaxId(companyProfile.tax_id ?? "");
      setWebsite(companyProfile.website ?? "");
    }
  }, [profile, companyProfile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ display_name: displayName, phone })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      if (userRole === "company" && companyProfile) {
        const { error: companyError } = await supabase
          .from("company_profiles")
          .update({
            company_name: companyName,
            company_description: companyDescription || null,
            company_address: companyAddress || null,
            tax_id: taxId || null,
            website: website || null,
          })
          .eq("user_id", user.id);

        if (companyError) throw companyError;
      }

      toast({ title: "Profile updated", description: "Your changes have been saved." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <Navbar />
        <div className="container flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const RoleIcon = userRole ? roleIcons[userRole] : User;
  const initials = (displayName || user.email || "U").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />
      <div className="container max-w-2xl py-10">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="font-display text-2xl font-bold">{displayName || user.email}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <RoleIcon className="h-3.5 w-3.5" />
                {userRole ? roleLabels[userRole] : "User"}
              </Badge>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={user.email ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (xxx) xxx-xx-xx" />
            </div>
          </CardContent>
        </Card>

        {/* Company Info (only for company role) */}
        {userRole === "company" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Manage your company details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyDescription">Description</Label>
                <Textarea id="companyDescription" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder="Describe your company..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Address</Label>
                <Input id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / BIN</Label>
                  <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
      <Footer />
    </div>
  );
};


import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/profile")({ component: Profile });
