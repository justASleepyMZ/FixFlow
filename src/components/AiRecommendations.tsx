import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { categories } from "@/data/mockData";

interface Rec {
  category: string;
  reason: string;
}

const AiRecommendations = () => {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const fetchRecs = async (userQuery?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("recommend-categories", {
        body: { query: userQuery, categories: categories.map((c) => c.name) },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setRecs(data?.recommendations ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecs();
  }, []);

  const getIcon = (name: string) => categories.find((c) => c.name === name)?.icon ?? "✨";

  return (
    <section className="container py-16">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold md:text-3xl">For You</h2>
          </div>
          <p className="mt-2 text-muted-foreground">AI-picked services based on your season and interests</p>
        </div>
      </div>

      <form
        className="mt-6 flex gap-2 max-w-md"
        onSubmit={(e) => {
          e.preventDefault();
          fetchRecs(query.trim() || undefined);
        }}
      >
        <Input
          placeholder='Describe your task, e.g. "leaking faucet"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        <Button type="submit" variant="hero" disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Recommend
        </Button>
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading && recs.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl border bg-card animate-pulse" />
          ))
        ) : (
          recs.map((rec, i) => (
            <motion.div
              key={rec.category + i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              <Link
                to={`/requests?category=${rec.category}`}
                className="group flex h-full flex-col gap-2 rounded-xl border bg-card p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{getIcon(rec.category)}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <span className="font-semibold">{rec.category}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{rec.reason}</span>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </section>
  );
};

export default AiRecommendations;
