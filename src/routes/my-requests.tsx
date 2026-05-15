import { useEffect, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, CalendarDays, Clock, ArrowRight } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

import { HardHat } from "lucide-react";

interface MyRequest {
  id: string;
  title: string;
  category: string;
  description: string;
  city: string;
  district: string;
  budget: number;
  status: string;
  created_at: string;
  desired_start_date?: string;
  desired_end_date?: string;
  photos?: string[];
  isWorkerJob?: boolean;
}

const statusColors: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  in_negotiation: "bg-secondary/20 text-secondary-foreground",
  assigned: "bg-accent text-accent-foreground",
  in_progress: "bg-secondary/30 text-secondary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const ACTIVE_STATUSES = ["open", "in_negotiation", "assigned", "in_progress"];
const ARCHIVE_STATUSES = ["completed", "cancelled"];

const MyRequests = () => {
  const { user, userRole, loading: authLoading } = useAuth();
  const { t, tStatus, tCategory } = useTranslation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<MyRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/login" } as any);
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      // Fetch requests created by the user
      const { data: ownRequests } = await supabase
        .from("service_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch requests where the user has an accepted offer (worker jobs)
      const { data: acceptedOffers } = await supabase
        .from("offers")
        .select("request_id")
        .eq("worker_id", user.id)
        .eq("status", "accepted");

      let workerRequests: MyRequest[] = [];
      if (acceptedOffers && acceptedOffers.length > 0) {
        const requestIds = acceptedOffers.map((o) => o.request_id);
        const { data: workerData } = await supabase
          .from("service_requests")
          .select("*")
          .in("id", requestIds)
          .order("created_at", { ascending: false });
        workerRequests = ((workerData as MyRequest[]) || []).map((r) => ({ ...r, isWorkerJob: true }));
      }

      // Merge and deduplicate
      const ownMapped = ((ownRequests as MyRequest[]) || []).map((r) => ({ ...r, isWorkerJob: false }));
      const allIds = new Set(ownMapped.map((r) => r.id));
      const merged = [...ownMapped, ...workerRequests.filter((r) => !allIds.has(r.id))];
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setRequests(merged);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const active = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const archived = requests.filter((r) => ARCHIVE_STATUSES.includes(r.status));
  const isWorkerOrCompany = userRole === "worker" || userRole === "company";

  const RequestCard = ({ req }: { req: MyRequest }) => {
    const color = statusColors[req.status] || statusColors.open;
    return (
      <Link to="/requests/$id" params={{ id: String(req.id) }}>
        <Card className="transition-all hover:shadow-md hover:-translate-y-0.5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${color}`}>
                    {tStatus(req.status)}
                  </span>
                  <Badge variant="accent" className="text-[11px]">{tCategory(req.category)}</Badge>
                  {req.isWorkerJob && (
                    <Badge variant="outline" className="text-[11px] gap-0.5">
                      <HardHat className="h-2.5 w-2.5" /> {t("my.myJob")}
                    </Badge>
                  )}
                </div>
                <h3 className="font-display text-sm font-semibold leading-snug truncate">{req.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{req.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.city}</span>
                  <span className="flex items-center gap-1">{Number(req.budget).toLocaleString()} ₸</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(req.created_at).toLocaleDateString()}</span>
                  {req.desired_start_date && (
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      {new Date(req.desired_start_date).toLocaleDateString()} – {req.desired_end_date ? new Date(req.desired_end_date).toLocaleDateString() : "…"}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
            </div>
          </CardContent>
        </Card>
      </Link>
    );
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

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />
      <div className="container max-w-3xl py-8">
        <h1 className="font-display text-2xl font-bold mb-6">{t("my.title")}</h1>

        <Tabs defaultValue="active">
          <TabsList className="mb-6">
            <TabsTrigger value="active">
              {t("my.active")} {active.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{active.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="archive">
              {t("my.archive")} {archived.length > 0 && <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">{archived.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : active.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <p className="font-medium">{isWorkerOrCompany ? t("my.noActiveJobs") : t("my.noActive")}</p>
                <Link to={isWorkerOrCompany ? "/requests" : "/requests/new"}>
                  <Button variant="hero" className="mt-4">{isWorkerOrCompany ? t("my.browseRequests") : t("my.postRequest")}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">{active.map((r) => <RequestCard key={r.id} req={r} />)}</div>
            )}
          </TabsContent>

          <TabsContent value="archive">
            {loading ? (
              <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : archived.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <p className="font-medium">{t("my.noArchived")}</p>
                <p className="text-sm mt-1">{t("my.archivedHint")}</p>
              </div>
            ) : (
              <div className="space-y-3">{archived.map((r) => <RequestCard key={r.id} req={r} />)}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
};


import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/my-requests")({ component: MyRequests });
