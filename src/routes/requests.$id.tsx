import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  MapPin, Clock, DollarSign, ArrowLeft, MessageSquare, User,
  HardHat, Send, Building2, Loader2, CalendarIcon
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import OfferChat from "@/components/OfferChat";
import StarRating from "@/components/StarRating";

const db = supabase as any;

interface RequestData {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  city: string | null;
  district: string | null;
  address: string | null;
  budget: number | null;
  status: string;
  photos: string[];
  created_at: string;
  desired_start_date: string | null;
  desired_end_date: string | null;
  customer_confirmed_complete: boolean;
  worker_confirmed_complete: boolean;
}

interface OfferData {
  id: string;
  worker_id: string;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
  worker_name?: string;
  worker_avg_rating?: number;
}

export const Route = createFileRoute("/requests/$id")({
  component: RequestDetailPage,
  head: () => ({
    meta: [
      { title: "Request Detail — FixFlow" },
    ],
  }),
});

function RequestDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { effectiveRole } = useRole();
  const { user } = useAuth();

  const [request, setRequest] = useState<RequestData | null>(null);
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [chatOfferId, setChatOfferId] = useState<string | null>(null);
  const [chatOtherName, setChatOtherName] = useState("User");
  const [ratingWorkerMap, setRatingWorkerMap] = useState<Record<string, number>>({});
  const [pendingRating, setPendingRating] = useState<Record<string, number>>({});
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);
  const [ownerAvgRating, setOwnerAvgRating] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const { data, error } = await db
        .from("service_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }
      setRequest(data as RequestData);

      const { data: ownerRatings } = await db
        .from("ratings")
        .select("rating")
        .eq("rated_user_id", data.user_id);

      if (ownerRatings && ownerRatings.length > 0) {
        const avg = ownerRatings.reduce((s: number, r: any) => s + r.rating, 0) / ownerRatings.length;
        setOwnerAvgRating(avg);
      }

      if (user) {
        const { data: offersData } = await db
          .from("offers")
          .select("*")
          .eq("request_id", id)
          .order("created_at", { ascending: true });

        if (offersData && offersData.length > 0) {
          const workerIds = offersData.map((o: any) => o.worker_id);

          const [profilesRes, ratingsRes, existingRatingsRes] = await Promise.all([
            db.from("profiles").select("user_id, display_name").in("user_id", workerIds),
            db.from("ratings").select("rated_user_id, rating").in("rated_user_id", workerIds),
            db.from("ratings").select("rated_user_id, rating").eq("rated_by_user_id", user.id).eq("request_id", id),
          ]);

          const profileMap: Record<string, string> = {};
          (profilesRes.data || []).forEach((p: any) => {
            profileMap[p.user_id] = p.display_name || "Worker";
          });

          const ratingAcc: Record<string, { sum: number; count: number }> = {};
          (ratingsRes.data || []).forEach((r: any) => {
            if (!ratingAcc[r.rated_user_id]) ratingAcc[r.rated_user_id] = { sum: 0, count: 0 };
            ratingAcc[r.rated_user_id].sum += r.rating;
            ratingAcc[r.rated_user_id].count += 1;
          });

          const existingMap: Record<string, number> = {};
          (existingRatingsRes.data || []).forEach((r: any) => {
            existingMap[r.rated_user_id] = r.rating;
          });
          setRatingWorkerMap(existingMap);

          setOffers(
            offersData.map((o: any) => ({
              ...o,
              price: Number(o.price),
              worker_name: profileMap[o.worker_id] || "Worker",
              worker_avg_rating: ratingAcc[o.worker_id]
                ? ratingAcc[o.worker_id].sum / ratingAcc[o.worker_id].count
                : 0,
            }))
          );
        }
      }

      setLoading(false);
    };

    fetchRequest();
  }, [id, user]);

  const handleSubmitOffer = async () => {
    if (!user || !id) return;
    if (!offerPrice) {
      toast.error("Please enter your proposed price");
      return;
    }

    setSubmittingOffer(true);
    const { data, error } = await db
      .from("offers")
      .insert({
        request_id: id,
        worker_id: user.id,
        price: parseFloat(offerPrice),
        message: offerMessage.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Offer submitted!");
      setOffers((prev) => [...prev, { ...data, price: Number(data.price), worker_name: "You", worker_avg_rating: 0 }]);
      setShowOfferForm(false);
      setOfferPrice("");
      setOfferMessage("");
      setChatOfferId(data.id);
      setChatOtherName("Request Owner");
    }
    setSubmittingOffer(false);
  };

  const handleAcceptOffer = async (offer: OfferData) => {
    if (!request) return;
    setAcceptingOfferId(offer.id);

    const { data, error } = await supabase.functions.invoke("accept-offer", {
      body: { offerId: offer.id, requestId: request.id },
    });

    const functionError =
      typeof data === "object" && data !== null && "error" in data
        ? String((data as { error?: unknown }).error ?? "")
        : "";

    if (error || functionError) {
      toast.error(error?.message || functionError || "Failed to accept offer");
      setAcceptingOfferId(null);
      return;
    }

    setRequest({ ...request, status: "assigned", customer_confirmed_complete: false, worker_confirmed_complete: false });
    setOffers((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.id === offer.id ? "accepted" : item.status === "accepted" ? "pending" : item.status,
      }))
    );

    toast.success("Offer accepted!");
    navigate({ to: "/my-requests" });
    setAcceptingOfferId(null);
  };

  const handleRateWorker = async (workerId: string) => {
    if (!user || !id) return;
    const rating = pendingRating[workerId];
    if (!rating) return;

    setSubmittingRating(workerId);

    const existing = ratingWorkerMap[workerId];
    let error;

    if (existing) {
      const res = await db
        .from("ratings")
        .update({ rating })
        .eq("rated_user_id", workerId)
        .eq("rated_by_user_id", user.id)
        .eq("request_id", id);
      error = res.error;
    } else {
      const res = await db
        .from("ratings")
        .insert({ rated_user_id: workerId, rated_by_user_id: user.id, request_id: id, rating });
      error = res.error;
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Rating submitted!");
      setRatingWorkerMap((prev) => ({ ...prev, [workerId]: rating }));
      setPendingRating((prev) => {
        const next = { ...prev };
        delete next[workerId];
        return next;
      });
    }
    setSubmittingRating(null);
  };

  const openChat = (offer: OfferData) => {
    setChatOfferId(offer.id);
    const isOwner = request?.user_id === user?.id;
    setChatOtherName(isOwner ? (offer.worker_name || "Worker") : "Request Owner");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <Navbar />
        <div className="container flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="text-2xl font-bold">Request not found</h1>
          <Link to="/requests"><Button variant="ghost" className="mt-4">Back to Requests</Button></Link>
        </div>
        <Footer />
      </div>
    );
  }

  const isOwner = user?.id === request.user_id;
  const canMakeOffer = user && (effectiveRole === "worker" || effectiveRole === "company") && !isOwner && request.status === "open";

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />
      <div className="container max-w-4xl py-8">
        <Link to="/requests">
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Requests
          </Button>
        </Link>

        {/* Photos */}
        {request.photos && request.photos.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {request.photos.map((photo, i) => (
              <div key={i} className="relative overflow-hidden rounded-xl aspect-video">
                <img src={photo} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="accent" className="mb-2">{request.category}</Badge>
                    <CardTitle className="text-2xl">{request.title}</CardTitle>
                  </div>
                  <Badge variant="status">{request.status}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">{request.description}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {request.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {request.city}{request.district ? `, ${request.district}` : ""}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" /> {new Date(request.created_at).toLocaleDateString()}
                  </span>
                  {request.desired_start_date && (
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {new Date(request.desired_start_date).toLocaleDateString()} – {request.desired_end_date ? new Date(request.desired_end_date).toLocaleDateString() : "…"}
                    </span>
                  )}
                </div>
                {ownerAvgRating > 0 && (
                  <div className="mt-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Customer rating:</span>
                    <StarRating rating={ownerAvgRating} showValue size="sm" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Offers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" /> Offers ({offers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {offers.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No offers yet</p>
                )}
                {offers.map((offer) => (
                  <div key={offer.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardHat className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{offer.worker_name}</span>
                        {offer.worker_avg_rating !== undefined && offer.worker_avg_rating > 0 && (
                          <StarRating rating={offer.worker_avg_rating} showValue size="sm" />
                        )}
                      </div>
                      <span className="font-display font-bold flex items-center gap-1">
                        <DollarSign className="h-4 w-4" /> {offer.price.toLocaleString()}
                      </span>
                    </div>
                    {offer.message && <p className="mt-2 text-sm text-muted-foreground">{offer.message}</p>}
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Badge variant="status">{offer.status}</Badge>
                      <Button variant="ghost" size="sm" onClick={() => openChat(offer)}>
                        <MessageSquare className="mr-1 h-3.5 w-3.5" /> Chat
                      </Button>
                      {isOwner && offer.status === "pending" && request.status === "open" && (
                        <Button size="sm" onClick={() => handleAcceptOffer(offer)} disabled={!!acceptingOfferId}>
                          {acceptingOfferId === offer.id && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                          Accept
                        </Button>
                      )}
                      {isOwner && (offer.status === "accepted" || request.status === "completed") && (
                        <div className="flex items-center gap-2">
                          <StarRating
                            rating={pendingRating[offer.worker_id] ?? ratingWorkerMap[offer.worker_id] ?? 0}
                            interactive
                            onChange={(r) => setPendingRating((prev) => ({ ...prev, [offer.worker_id]: r }))}
                            size="md"
                          />
                          {pendingRating[offer.worker_id] && (
                            <Button size="sm" variant="outline" onClick={() => handleRateWorker(offer.worker_id)} disabled={submittingRating === offer.worker_id}>
                              {submittingRating === offer.worker_id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Rate"}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Budget</p>
                  <p className="font-display text-3xl font-bold flex items-center justify-center gap-1">
                    <DollarSign className="h-6 w-6" /> {request.budget?.toLocaleString() ?? "N/A"}
                  </p>
                </div>
                {canMakeOffer && !showOfferForm && (
                  <Button variant="hero" className="mt-4 w-full" onClick={() => setShowOfferForm(true)}>
                    <Send className="mr-1.5 h-4 w-4" /> Make an Offer
                  </Button>
                )}
              </CardContent>
            </Card>

            {showOfferForm && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Offer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Price (₸)</Label>
                    <Input type="number" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} placeholder="Your price" className="mt-1" />
                  </div>
                  <div>
                    <Label>Message</Label>
                    <Textarea value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} placeholder="Describe your approach..." rows={3} className="mt-1" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="hero" className="flex-1" onClick={handleSubmitOffer} disabled={submittingOffer}>
                      {submittingOffer && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      Submit Offer
                    </Button>
                    <Button variant="ghost" onClick={() => setShowOfferForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={!!chatOfferId} onOpenChange={(open) => !open && setChatOfferId(null)}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Chat</DialogTitle>
          </DialogHeader>
          {chatOfferId && <OfferChat offerId={chatOfferId} otherUserName={chatOtherName} />}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
