import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "@tanstack/react-router";
import { Wrench, Loader2, User, HardHat, Building2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const Register = () => {
  const [role, setRole] = useState<AppRole>("user");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyDesc, setCompanyDesc] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [website, setWebsite] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const { signUp } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const roles: { value: AppRole; icon: React.ElementType; descKey: "reg.roleCustomer" | "reg.roleWorker" | "reg.roleCompany" }[] = [
    { value: "user", icon: User, descKey: "reg.roleCustomer" },
    { value: "worker", icon: HardHat, descKey: "reg.roleWorker" },
    { value: "company", icon: Building2, descKey: "reg.roleCompany" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error(t("reg.fillRequired"));
      return;
    }
    if (role === "company" && !companyName) {
      toast.error(t("reg.companyNameRequired"));
      return;
    }
    setSubmitting(true);
    const { error, mode } = await signUp(email, password, name, phone, role, role === "company" ? {
      company_name: companyName,
      company_description: companyDesc || null,
      company_address: companyAddress || null,
      tax_id: taxId || null,
      website: website || null,
    } : undefined);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(mode === "signed_in" ? t("reg.alreadyExisted") : t("reg.createdToast"));
      navigate({ to: "/" } as any);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />
      <div className="container flex items-center justify-center py-20">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero">
              <Wrench className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold">{t("reg.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("reg.subtitle")}</p>
          </div>

          <div className="mb-6 flex rounded-lg border bg-muted p-1 gap-1">
            {roles.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`flex-1 flex flex-col items-center gap-1 rounded-md py-2 text-xs font-medium transition-all ${
                  role === r.value ? "bg-card shadow-sm" : "text-muted-foreground"
                }`}
                onClick={() => setRole(r.value)}
              >
                <r.icon className="h-4 w-4" />
                {t(r.descKey)}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="name">{t("reg.fullName")}</Label>
              <Input id="name" placeholder={t("reg.fullNamePlaceholder")} className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="email">{t("reg.emailReq")}</Label>
              <Input id="email" type="email" placeholder={t("auth.emailPlaceholder")} className="mt-1" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="phone">{t("reg.phone")}</Label>
              <Input id="phone" type="tel" placeholder={t("reg.phonePlaceholder")} className="mt-1" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">{t("reg.passwordReq")}</Label>
              <Input id="password" type="password" placeholder="••••••••" className="mt-1" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {role === "company" && (
              <div className="space-y-4 rounded-lg border bg-accent/50 p-4">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" /> {t("reg.companyDetails")}
                </p>
                <div>
                  <Label htmlFor="companyName">{t("reg.companyName")}</Label>
                  <Input id="companyName" placeholder={t("reg.companyNamePlaceholder")} className="mt-1" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="companyDesc">{t("reg.companyDesc")}</Label>
                  <Textarea id="companyDesc" placeholder={t("reg.companyDescPlaceholder")} className="mt-1" rows={2} value={companyDesc} onChange={(e) => setCompanyDesc(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="companyAddress">{t("reg.companyAddress")}</Label>
                  <Input id="companyAddress" placeholder={t("reg.companyAddressPlaceholder")} className="mt-1" value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="taxId">{t("reg.taxId")}</Label>
                    <Input id="taxId" placeholder="1234567890" className="mt-1" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="website">{t("reg.website")}</Label>
                    <Input id="website" placeholder="https://..." className="mt-1" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            <Button variant="hero" className="w-full" type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("reg.create")}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t("reg.haveAccount")}{" "}
            <Link to="/login" className="font-medium text-primary hover:underline">{t("nav.login")}</Link>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};


import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/register")({ component: Register });
