import { motion, type Variants, type EasingDefinition } from "framer-motion";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ServiceRequestCard, { type ServiceRequestData } from "@/components/ServiceRequestCard";
import { categories } from "@/data/mockData";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Shield, MessageSquare, Star, CheckCircle2, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiRecommendations from "@/components/AiRecommendations";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as EasingDefinition },
  }),
};

const Index = () => {
  const { t } = useTranslation();
  const [recent, setRecent] = useState<ServiceRequestData[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) {
        console.error(error);
        setLoadingRecent(false);
        return;
      }
      const mapped: ServiceRequestData[] = (data || []).map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        description: r.description,
        city: r.city || "",
        district: r.district || "",
        price: Number(r.budget) || 0,
        status: r.status.charAt(0).toUpperCase() + r.status.slice(1).replace("_", " "),
        createdAt: new Date(r.created_at).toLocaleDateString(),
        offersCount: 0,
        imageUrl: r.photos && r.photos.length > 0 ? r.photos[0] : undefined,
        desiredStartDate: r.desired_start_date ?? undefined,
        desiredEndDate: r.desired_end_date ?? undefined,
      }));
      setRecent(mapped);
      setLoadingRecent(false);
    };
    fetchRecent();
  }, []);
  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-[0.03]" />
        <div className="container relative py-20 md:py-32">
          <motion.div
            className="mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={0}
          >
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
              {t("hero.title1")}{" "}
              <span className="text-gradient-primary">{t("hero.title2")}</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/requests">
                <Button variant="hero" size="lg" className="gap-2 text-base">
                  {t("hero.browse")} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="lg" className="text-base">
                  {t("hero.joinWorker")}
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Recommendations */}
      <AiRecommendations />

      {/* Categories */}
      <section className="container py-16">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
          <h2 className="font-display text-2xl font-bold md:text-3xl">{t("cats.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("cats.subtitle")}</p>
        </motion.div>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i * 0.5}
            >
              <Link
                to="/requests"
                search={{ category: cat.name } as any}
                className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-sm font-medium">{cat.name}</span>
                <span className="text-xs text-muted-foreground">{cat.count} {t("cats.jobs")}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Requests */}
      <section className="container py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">{t("recent.title")}</h2>
            <p className="mt-2 text-muted-foreground">{t("recent.subtitle")}</p>
          </div>
          <Link to="/requests">
            <Button variant="ghost" className="gap-1">
              {t("recent.viewAll")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {loadingRecent ? (
          <div className="mt-8 flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : recent.length === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">No requests yet.</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((req, i) => (
              <motion.div
                key={req.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i * 0.5}
              >
                <ServiceRequestCard request={req} />
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* How It Works */}
      <section className="bg-muted/50 py-20">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">{t("how.title")}</h2>
            <p className="mt-2 text-muted-foreground">{t("how.subtitle")}</p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              { step: "01", title: t("how.s1t"), desc: t("how.s1d") },
              { step: "02", title: t("how.s2t"), desc: t("how.s2d") },
              { step: "03", title: t("how.s3t"), desc: t("how.s3d") },
              { step: "04", title: t("how.s4t"), desc: t("how.s4d") },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="text-center"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-hero font-display text-lg font-bold text-primary-foreground">
                  {item.step}
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="container py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: Shield, title: t("trust.t1"), desc: t("trust.d1") },
            { icon: MessageSquare, title: t("trust.t2"), desc: t("trust.d2") },
            { icon: Star, title: t("trust.t3"), desc: t("trust.d3") },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="flex gap-4 rounded-xl border bg-card p-6 shadow-card"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent">
                <item.icon className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-display font-semibold">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-20">
        <div className="rounded-2xl bg-gradient-hero p-10 text-center md:p-16">
          <h2 className="font-display text-2xl font-bold text-primary-foreground md:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">
            {t("cta.subtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button variant="warm" size="lg" className="text-base">
                {t("cta.create")}
              </Button>
            </Link>
            <Link to="/requests">
              <Button variant="outline" size="lg" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 text-base">
                {t("hero.browse")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};


import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/")({ component: Index });
