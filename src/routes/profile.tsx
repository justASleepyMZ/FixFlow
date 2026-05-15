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
import { useTranslation } from "@/contexts/LanguageContext";

const roleIcons: Record<string, React.ElementType> = {
  user: User,
  worker: HardHat,
  company: Building2,
  admin: ShieldCheck,
};

const roleLabelKeys: Record<string, "role.user" | "role.worker" | "role.company" | "role.admin"> = {
  user: "role.user",
  worker: "role.worker",
  company: "role.company",
  admin: "role.admin",
};

const Profile = () => {
  const { user, profile, companyProfile, userRole, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
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
  const [faceVerified, setFaceVerified] = useState(false);
  const [faceScanOpen, setFaceScanOpen] = useState(false);
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
      setFaceVerified(profile.face_verified ?? false);
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
      toast({ title: t("prof.invalidFile"), description: t("prof.invalidFileDesc"), variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: t("prof.fileTooLarge"), description: t("prof.fileTooLargeDesc"), variant: "destructive" });
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
      toast({ title: t("prof.certUploadedToast"), description: t("prof.certUploadedDesc") });
    } catch (err: any) {
      toast({ title: t("prof.uploadFailed"), description: err.message, variant: "destructive" });
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
      toast({ title: t("prof.certRemoved") });
    } catch (err: any) {
      toast({ title: t("prof.error"), description: err.message, variant: "destructive" });
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

      toast({ title: t("prof.profileUpdated"), description: t("prof.profileUpdatedDesc") });
    } catch (err: any) {
      toast({ title: t("prof.error"), description: err.message, variant: "destructive" });
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
                {userRole ? t(roleLabelKeys[userRole]) : t("prof.user")}
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
                {t("prof.yourRating")}
              </CardTitle>
              <CardDescription>{t("prof.basedOnReviews")}</CardDescription>
            </CardHeader>
            <CardContent>
              {ratingCount > 0 ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold">{avgRating.toFixed(1)}</span>
                  <div>
                    <StarRating rating={avgRating} size="lg" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {ratingCount} {ratingCount === 1 ? t("prof.review") : t("prof.reviews")}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("prof.noReviews")}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Personal Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{t("prof.personalInfo")}</CardTitle>
            <CardDescription>{t("prof.personalInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("prof.email")}</Label>
              <Input id="email" value={user.email ?? ""} disabled className="bg-muted" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="displayName">{t("prof.displayName")}</Label>
              <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("prof.displayNamePlaceholder")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t("prof.phone")}</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (xxx) xxx-xx-xx" />
            </div>
          </CardContent>
        </Card>

        {/* Face Verification (workers & companies) */}
        {isWorkerRole && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanFace className="h-5 w-5" />
                {t("prof.faceVerification")}
              </CardTitle>
              <CardDescription>
                {t("prof.faceVerificationDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => setFaceScanOpen(true)}
                className="group relative flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/40 transition-all hover:border-primary hover:bg-primary/5"
              >
                {faceVerified ? (
                  <>
                    <ScanFace className="h-14 w-14 text-primary" />
                    <span className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                      <CheckCircle2 className="h-7 w-7 text-secondary" />
                    </span>
                  </>
                ) : (
                  <ScanFace className="h-14 w-14 text-muted-foreground transition-colors group-hover:text-primary" />
                )}
              </button>
              <p className="text-sm font-medium">
                {faceVerified ? t("prof.faceVerified") : t("prof.scanFace")}
              </p>
              {faceVerified && (
                <Button variant="outline" size="sm" onClick={() => setFaceScanOpen(true)}>
                  {t("prof.rescan")}
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <FaceScanDialog
          open={faceScanOpen}
          onOpenChange={setFaceScanOpen}
          onVerified={() => setFaceVerified(true)}
        />

        {/* Qualification Certificate (workers & companies) */}
        {isWorkerRole && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t("prof.certificate")}
              </CardTitle>
              <CardDescription>
                {t("prof.certificateDesc")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {certificateUrl ? (
                <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <span className="text-sm font-medium truncate">{t("prof.certUploaded")}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button asChild variant="outline" size="sm">
                      <a href={certificateUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-1" /> {t("prof.view")}
                      </a>
                    </Button>
                    <Button onClick={handleRemoveCert} variant="ghost" size="sm" className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("prof.noCert")}</p>
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
                {certificateUrl ? t("prof.replaceCert") : t("prof.uploadCert")}
              </Button>
              <p className="text-xs text-muted-foreground">{t("prof.pdfHint")}</p>
            </CardContent>
          </Card>
        )}

        {/* Company Info (only for company role) */}
        {userRole === "company" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{t("prof.companyInfo")}</CardTitle>
              <CardDescription>{t("prof.companyInfoDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t("prof.companyName")}</Label>
                <Input id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyDescription">{t("prof.description")}</Label>
                <Textarea id="companyDescription" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} placeholder={t("prof.descriptionPlaceholder")} rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">{t("prof.address")}</Label>
                <Input id="companyAddress" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">{t("prof.taxId")}</Label>
                  <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">{t("prof.website")}</Label>
                  <Input id="website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t("prof.save")}
        </Button>
      </div>
      <Footer />
    </div>
  );
};


import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/profile")({ component: Profile });
