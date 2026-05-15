import { Link } from "@tanstack/react-router";
import { Wrench } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

const Footer = () => {
  const { t } = useTranslation();
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
            <p className="mt-3 text-sm text-muted-foreground">{t("footer.tagline")}</p>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">{t("footer.platform")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/requests" className="hover:text-foreground transition-colors">{t("footer.browse")}</Link></li>
              <li><Link to="/" hash="how-it-works" className="hover:text-foreground transition-colors">{t("footer.how")}</Link></li>
              <li><Link to="/register" className="hover:text-foreground transition-colors">{t("footer.becomeWorker")}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">{t("footer.support")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t("footer.help")}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t("footer.safety")}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t("footer.contact")}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 font-display text-sm font-semibold">{t("footer.legal")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t("footer.terms")}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t("footer.privacy")}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} FixFlow. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
