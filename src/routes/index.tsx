import { motion, type Variants, type EasingDefinition } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import { mockRequests, categories } from "@/data/mockData";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Shield, MessageSquare, Star, CheckCircle2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AiRecommendations from "@/components/AiRecommendations";

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as EasingDefinition },
  }),
};

const Index = () => {
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
              Find Repair Pros.{" "}
              <span className="text-gradient-primary">Your Price.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              Post your repair or maintenance request, get competitive offers from verified workers, and negotiate the best price — all in one platform.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link to="/requests">
                <Button variant="hero" size="lg" className="gap-2 text-base">
                  Browse Requests <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="outline" size="lg" className="text-base">
                  Join as Worker
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
          <h2 className="font-display text-2xl font-bold md:text-3xl">Popular Categories</h2>
          <p className="mt-2 text-muted-foreground">Find the right specialist for any job</p>
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
                <span className="text-xs text-muted-foreground">{cat.count} jobs</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Recent Requests */}
      <section className="container py-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">Recent Requests</h2>
            <p className="mt-2 text-muted-foreground">Latest service requests from our community</p>
          </div>
          <Link to="/requests">
            <Button variant="ghost" className="gap-1">
              View All <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mockRequests.slice(0, 6).map((req, i) => (
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
      </section>

      {/* How It Works */}
      <section className="bg-muted/50 py-20">
        <div className="container">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold md:text-3xl">How It Works</h2>
            <p className="mt-2 text-muted-foreground">Simple 4-step process to get your job done</p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-4">
            {[
              { step: "01", title: "Post a Request", desc: "Describe the work, set a budget, and upload photos." },
              { step: "02", title: "Get Offers", desc: "Verified workers send their price proposals." },
              { step: "03", title: "Negotiate & Choose", desc: "Compare offers, chat with workers, pick the best fit." },
              { step: "04", title: "Job Done & Rate", desc: "Work gets completed. Pay and leave a review." },
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
            { icon: Shield, title: "Verified Workers", desc: "Every worker goes through identity and skill verification." },
            { icon: MessageSquare, title: "Secure Chat", desc: "Communicate safely through our built-in messaging system." },
            { icon: Star, title: "Honest Reviews", desc: "Transparent rating system based on real completed jobs." },
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
            Ready to Get Started?
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/80">
            Join thousands of customers and workers already using FixFlow.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register">
              <Button variant="warm" size="lg" className="text-base">
                Create Account
              </Button>
            </Link>
            <Link to="/requests">
              <Button variant="outline" size="lg" className="border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 text-base">
                Browse Requests
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
