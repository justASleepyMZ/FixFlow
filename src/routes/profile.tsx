import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StarRating from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Building2, HardHat, ShieldCheck, Save, Loader2, FileText, Upload, Trash2, ExternalLink, Award, ScanFace, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FaceScanDialog } from "@/components/FaceScanDialog";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState("");
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [saving, setSaving] = useState(false);

  const [avgRating, setAvgRating] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  const isWorkerRole = userRole === "worker" || userRole === "company";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate({ to: "/login" } as any);
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setPhone(profile.phone ?? "");
      setCertificateUrl(profile.certificate_url ?? null);
    }
    if (companyProfile) {
      setCompanyName(companyProfile.company_name ?? "");
      setCompanyDescription(companyProfile.company_description ?? "");
      setCompanyAddress(companyProfile.company_address ?? "");
      setTaxId(companyProfile.tax_id ?? "");
      setWebsite(companyProfile.website ?? "");
    }
  }, [profile, companyProfile]);

  // Fetch worker rating
  useEffect(() => {
    if (!user || !isWorkerRole) return;
    (async () => {
      const { data } = await supabase
        .from("ratings")
        .select("rating")
        .eq("rated_user_id", user.id);
      if (data && data.length > 0) {
        const sum = data.reduce((acc, r) => acc + r.rating, 0);
        setAvgRating(sum / data.length);
        setRatingCount(data.length);
      } else {
        setAvgRating(0);
        setRatingCount(0);
      }
    })();
  }, [user, isWorkerRole]);

  const handleCertUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== "application/pdf") {
      toast({ title: "Invalid file", description: "Only PDF files are allowed.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max size is 10MB.", variant: "destructive" });
      return;
    }

    setUploadingCert(true);
    try {
      const path = `${user.id}/certificate-${Date.now()}.pdf`;
      const { error: uploadErr } = await supabase.storage
        .from("certificates")
        .upload(path, file, { contentType: "application/pdf", upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: pub } = supabase.storage.from("certificates").getPublicUrl(path);
      const newUrl = pub.publicUrl;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ certificate_url: newUrl })
        .eq("user_id", user.id);
      if (updateErr) throw updateErr;

      setCertificateUrl(newUrl);
      toast({ title: "Certificate uploaded", description: "Your qualification certificate is now visible." });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCert(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveCert = async () => {
    if (!user) return;
    try {
      await supabase.from("profiles").update({ certificate_url: null }).eq("user_id", user.id);
      setCertificateUrl(null);
      toast({ title: "Certificate removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

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
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <RoleIcon className="h-3.5 w-3.5" />
                {userRole ? roleLabels[userRole] : "User"}
              </Badge>
              <span className="text-sm text-muted-foreground">{user.email}</span>
            </div>
          </div>
        </div>

        {/* Worker Rating */}
        {isWorkerRole && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-secondary" />
                Your Rating
              </CardTitle>
              <CardDescription>Based on customer reviews</CardDescription>
            </CardHeader>
            <CardContent>
              {ratingCount > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
                  <div>
                    <StarRating rating={avgRating} size="lg" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {ratingCount} review{ratingCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No reviews yet. Complete jobs to start earning ratings.</p>
              )}
            </CardContent>
          </Card>
        )}

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

        {/* Qualification Certificate (workers & companies) */}
        {isWorkerRole && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Qualification Certificate
              </CardTitle>
              <CardDescription>
                Upload a PDF proving you are a qualified professional. Visible to customers reviewing your offers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {certificateUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">Certificate uploaded</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm">
                      <a href={certificateUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" /> View
                      </a>
                    </Button>
                    <Button onClick={handleRemoveCert} variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No certificate uploaded yet.</p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleCertUpload}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCert}
                variant="outline"
                className="w-full gap-2"
              >
                {uploadingCert ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {certificateUrl ? "Replace Certificate" : "Upload PDF Certificate"}
              </Button>
              <p className="text-xs text-muted-foreground">PDF only, max 10MB.</p>
            </CardContent>
          </Card>
        )}

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
