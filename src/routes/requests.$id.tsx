import { createFileRoute } from "@tanstack/react-router";
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
const db = supabase as any;
import { Link, useNavigate } from "@tanstack/react-router";
import {
  MapPin, Clock, DollarSign, ArrowLeft, MessageSquare, User,
  HardHat, Send, CheckCircle2, Building2, Loader2, Star, CalendarIcon
} from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import OfferChat from "@/components/OfferChat";
import StarRating from "@/components/StarRating";

interface ServiceRequest {
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

interface Offer {
  id: string;
  worker_id: string;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
  worker_name?: string;
  worker_avg_rating?: number;
}

const RequestDetail = () => {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { effectiveRole } = useRole();
  const { user } = useAuth();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [offerMessage, setOfferMessage] = useState("");
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [chatOfferId, setChatOfferId] = useState<string | null>(null);
  const [chatOtherName, setChatOtherName] = useState("User");

  // Rating state: customer rates worker
  const [ratingWorkerMap, setRatingWorkerMap] = useState<Record<string, number>>({}); // workerId -> existing rating
  const [pendingRating, setPendingRating] = useState<Record<string, number>>({}); // workerId -> pending rating
  const [submittingRating, setSubmittingRating] = useState<string | null>(null);

  // Rating state: worker sees customer rating of request owner
  const [ownerAvgRating, setOwnerAvgRating] = useState<number>(0);

  useEffect(() => {
    if (!id) return;

    const fetchRequest = async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setLoading(false);
        return;
      }
      setRequest(data as ServiceRequest);

      // Fetch owner average rating
      const { data: ownerRatings } = await supabase
        .from("ratings")
        .select("rating")
        .eq("rated_user_id", data.user_id);

      if (ownerRatings && ownerRatings.length > 0) {
        const avg = ownerRatings.reduce((s, r) => s + r.rating, 0) / ownerRatings.length;
        setOwnerAvgRating(avg);
      }

      // Fetch offers
      if (user) {
        const { data: offersData } = await supabase
          .from("offers")
          .select("*")
          .eq("request_id", id)
          .order("created_at", { ascending: true });

        if (offersData && offersData.length > 0) {
          const workerIds = offersData.map((o) => o.worker_id);

          // Fetch profiles + avg ratings for workers in parallel
          const [profilesRes, ratingsRes, existingRatingsRes] = await Promise.all([
            supabase.from("profiles").select("user_id, display_name").in("user_id", workerIds),
            supabase.from("ratings").select("rated_user_id, rating").in("rated_user_id", workerIds),
            // Fetch ratings the current user already gave to workers on this request
            supabase.from("ratings").select("rated_user_id, rating").eq("rated_by_user_id", user.id).eq("request_id", id),
          ]);

          const profileMap: Record<string, string> = {};
          profilesRes.data?.forEach((p) => {
            profileMap[p.user_id] = p.display_name || "Worker";
          });

          // Compute avg rating per worker
          const ratingAcc: Record<string, { sum: number; count: number }> = {};
          ratingsRes.data?.forEach((r) => {
            if (!ratingAcc[r.rated_user_id]) ratingAcc[r.rated_user_id] = { sum: 0, count: 0 };
            ratingAcc[r.rated_user_id].sum += r.rating;
            ratingAcc[r.rated_user_id].count += 1;
          });

          // Existing ratings by current user
          const existingMap: Record<string, number> = {};
          existingRatingsRes.data?.forEach((r) => {
            existingMap[r.rated_user_id] = r.rating;
          });
          setRatingWorkerMap(existingMap);

          setOffers(
            offersData.map((o) => ({
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
    const { data, error } = await supabase
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

  const handleRateWorker = async (workerId: string) => {
    if (!user || !id) return;
    const rating = pendingRating[workerId];
    if (!rating) return;

    setSubmittingRating(workerId);

    const existing = ratingWorkerMap[workerId];
    let error;

    if (existing) {
      // Update
      const res = await supabase
        .from("ratings")
        .update({ rating })
        .eq("rated_user_id", workerId)
        .eq("rated_by_user_id", user.id)
        .eq("request_id", id);
      error = res.error;
    } else {
      // Insert
      const res = await supabase
        .from("ratings")
        .insert({
          rated_user_id: workerId,
          rated_by_user_id: user.id,
          request_id: id,
          rating,
        });
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

  const openChat = (offer: Offer) => {
    setChatOfferId(offer.id);
    const isOwner = request?.user_id === user?.id;
    setChatOtherName(isOwner ? (offer.worker_name || "Worker") : "Request Owner");
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!request) return;

    setAcceptingOfferId(offer.id);

    const { data, error } = await db.functions.invoke("accept-offer", {
      body: {
        offerId: offer.id,
        requestId: request.id,
      },
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

    setRequest({
      ...request,
      status: "assigned",
      customer_confirmed_complete: false,
      worker_confirmed_complete: false,
    });
    setOffers((prev) =>
      prev.map((item) => ({
        ...item,
        status: item.id === offer.id ? "accepted" : item.status === "accepted" ? "pending" : item.status,
      }))
    );

    toast.success("Offer accepted! Redirecting to My Requests.");
    navigate({ to: "/my-requests" });
    setAcceptingOfferId(null);
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
  const alreadyOffered = offers.some((o) => o.worker_id === user?.id);

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />

      <div className="container py-8">
        <Link to="/requests">
          <Button variant="ghost" size="sm" className="mb-4 gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Requests
          </Button>
        </Link>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {request.photos && request.photos.length > 0 && (
              <div className="overflow-hidden rounded-xl">
                <img src={request.photos[0]} alt={request.title} className="h-64 w-full object-cover md:h-80" />
              </div>
            )}
            {request.photos && request.photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {request.photos.slice(1).map((p, i) => (
                  <img key={i} src={p} alt="" className="h-20 w-20 rounded-lg object-cover border" />
                ))}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">{request.category}</Badge>
                <Badge variant="status">{request.status}</Badge>
              </div>
              <h1 className="mt-3 font-display text-2xl font-bold md:text-3xl">{request.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {(request.city || request.district) && (
                  <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{[request.city, request.district].filter(Boolean).join(", ")}</span>
                )}
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{new Date(request.created_at).toLocaleDateString()}</span>
              </div>
              <p className="mt-4 text-muted-foreground leading-relaxed">{request.description}</p>
              {request.address && (
                <p className="mt-2 text-sm text-muted-foreground"><MapPin className="inline h-3.5 w-3.5 mr-1" />Address: {request.address}</p>
              )}
              {(request.desired_start_date || request.desired_end_date) && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-primary/5 px-3 py-2 text-sm">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">Desired period:</span>
                  <span className="text-muted-foreground">
                    {request.desired_start_date ? new Date(request.desired_start_date).toLocaleDateString() : "—"}
                    {" → "}
                    {request.desired_end_date ? new Date(request.desired_end_date).toLocaleDateString() : "—"}
                  </span>
                </div>
              )}
            </div>

            {/* Offer form */}
            {canMakeOffer && !alreadyOffered && showOfferForm && (
              <Card className="border-secondary/50 shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <HardHat className="h-5 w-5" /> Submit Your Offer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="offer-price">Your Proposed Price (₸)</Label>
                    <Input id="offer-price" type="number" placeholder="e.g. 12000" value={offerPrice} onChange={(e) => setOfferPrice(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="offer-message">Message to Customer</Label>
                    <Textarea id="offer-message" placeholder="Describe your experience and availability..." value={offerMessage} onChange={(e) => setOfferMessage(e.target.value)} className="mt-1" rows={3} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="hero" className="gap-1.5" onClick={handleSubmitOffer} disabled={submittingOffer}>
                      {submittingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Offer
                    </Button>
                    <Button variant="ghost" onClick={() => setShowOfferForm(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Offers list */}
            {user && (isOwner || offers.length > 0) && (
              <div>
                <h2 className="font-display text-xl font-bold">Offers ({offers.length})</h2>
                <div className="mt-4 space-y-3">
                  {offers.map((offer) => (
                    <Card key={offer.id} className="shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-display font-bold text-primary-foreground">
                              {(offer.worker_name || "W")[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">{offer.worker_name}</span>
                                {(offer.worker_avg_rating ?? 0) > 0 && (
                                  <StarRating rating={offer.worker_avg_rating!} size="sm" showValue />
                                )}
                              </div>
                              {offer.message && <p className="mt-1 text-sm text-muted-foreground">{offer.message}</p>}

                              {/* Worker rates customer */}
                              {!isOwner && offer.worker_id === user?.id && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Rate customer:</span>
                                  <StarRating
                                    rating={pendingRating[request.user_id] ?? ratingWorkerMap[request.user_id] ?? 0}
                                    size="md"
                                    interactive
                                    onChange={(r) => setPendingRating((prev) => ({ ...prev, [request.user_id]: r }))}
                                  />
                                  {pendingRating[request.user_id] && pendingRating[request.user_id] !== ratingWorkerMap[request.user_id] && (
                                    <Button
                                      size="sm"
                                      variant="hero"
                                      className="h-7 px-2 text-xs"
                                      disabled={submittingRating === request.user_id}
                                      onClick={() => handleRateWorker(request.user_id)}
                                    >
                                      {submittingRating === request.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                    </Button>
                                  )}
                                  {ratingWorkerMap[request.user_id] && !pendingRating[request.user_id] && (
                                    <span className="text-xs text-primary font-medium">✓ Rated</span>
                                  )}
                                </div>
                              )}

                              {/* Customer rates worker */}
                              {isOwner && (
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Rate worker:</span>
                                  <StarRating
                                    rating={pendingRating[offer.worker_id] ?? ratingWorkerMap[offer.worker_id] ?? 0}
                                    size="md"
                                    interactive
                                    onChange={(r) => setPendingRating((prev) => ({ ...prev, [offer.worker_id]: r }))}
                                  />
                                  {pendingRating[offer.worker_id] && pendingRating[offer.worker_id] !== ratingWorkerMap[offer.worker_id] && (
                                    <Button
                                      size="sm"
                                      variant="hero"
                                      className="h-7 px-2 text-xs"
                                      disabled={submittingRating === offer.worker_id}
                                      onClick={() => handleRateWorker(offer.worker_id)}
                                    >
                                      {submittingRating === offer.worker_id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                                    </Button>
                                  )}
                                  {ratingWorkerMap[offer.worker_id] && !pendingRating[offer.worker_id] && (
                                    <span className="text-xs text-primary font-medium">✓ Rated</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-display text-lg font-bold">₸{offer.price.toLocaleString()}</div>
                            <div className="mt-1 flex gap-1.5">
                              {isOwner && offer.status === "pending" && (
                                <Button
                                  size="sm"
                                  variant="hero"
                                  className="gap-1"
                                  disabled={acceptingOfferId === offer.id}
                                  onClick={() => handleAcceptOffer(offer)}
                                >
                                  {acceptingOfferId === offer.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  )}
                                  Accept
                                </Button>
                              )}
                              {offer.status === "accepted" && (
                                <Badge variant="status" className="bg-primary/10 text-primary">Accepted</Badge>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => openChat(offer)}>
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Confirmation */}
            {request && ["assigned", "in_progress"].includes(request.status) && user && (() => {
              const acceptedOffer = offers.find((o) => o.status === "accepted");
              const isWorkerOnThis = acceptedOffer && acceptedOffer.worker_id === user.id;
              const showSection = isOwner || isWorkerOnThis;
              if (!showSection) return null;

              const customerDone = request.customer_confirmed_complete;
              const workerDone = request.worker_confirmed_complete;

              const handleConfirm = async (side: "customer" | "worker") => {
                const update = side === "customer"
                  ? { customer_confirmed_complete: true }
                  : { worker_confirmed_complete: true };

                const newCustomer = side === "customer" ? true : customerDone;
                const newWorker = side === "worker" ? true : workerDone;

                if (newCustomer && newWorker) {
                  await db.from("service_requests").update({ ...update, status: "completed" }).eq("id", request.id);
                  setRequest({ ...request, ...update, status: "completed" });
                  toast.success("Both confirmed! Request is now completed and archived.");
                } else {
                  await db.from("service_requests").update(update).eq("id", request.id);
                  setRequest({ ...request, ...update });
                  toast.success("Confirmed! Waiting for the other party.");
                }
              };

              return (
                <Card className="mt-6 border-primary/20 shadow-card">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" /> Work Completion
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Both the customer and worker must confirm the work is complete to archive this request.
                    </p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Customer</span>
                        {customerDone ? (
                          <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>
                        ) : isOwner ? (
                          <Button size="sm" variant="hero" className="gap-1" onClick={() => handleConfirm("customer")}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                        )}
                      </div>
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">Worker</span>
                        {workerDone ? (
                          <Badge className="bg-primary/10 text-primary gap-1"><CheckCircle2 className="h-3 w-3" /> Confirmed</Badge>
                        ) : isWorkerOnThis ? (
                          <Button size="sm" variant="hero" className="gap-1" onClick={() => handleConfirm("worker")}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Mark Complete
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">Pending</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-lg">Budget</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-1 font-display text-3xl font-bold">
                  <DollarSign className="h-6 w-6" />
                  {request.budget ? Number(request.budget).toLocaleString() : "Negotiable"}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Initial customer price</p>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader><CardTitle className="text-lg">Posted By</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{isOwner ? "You" : "Customer"}</p>
                    {ownerAvgRating > 0 && (
                      <StarRating rating={ownerAvgRating} size="sm" showValue />
                    )}
                    <p className="text-xs text-muted-foreground">Contact after assignment</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {canMakeOffer && !alreadyOffered && !showOfferForm && (
              <Button variant="hero" className="w-full gap-2" onClick={() => setShowOfferForm(true)}>
                <HardHat className="h-4 w-4" /> Make an Offer
              </Button>
            )}

            {canMakeOffer && alreadyOffered && (
              <Button variant="outline" className="w-full gap-2" disabled>
                <CheckCircle2 className="h-4 w-4" /> Offer Submitted
              </Button>
            )}

            {/* Worker sidebar completion button for assigned/in_progress requests */}
            {user && !isOwner && ["assigned", "in_progress"].includes(request.status) && (() => {
              const acceptedOffer = offers.find((o) => o.status === "accepted" && o.worker_id === user.id);
              if (!acceptedOffer) return null;
              return request.worker_confirmed_complete ? (
                <Button variant="outline" className="w-full gap-2" disabled>
                  <CheckCircle2 className="h-4 w-4" /> You Confirmed Complete
                </Button>
              ) : (
                <Button variant="hero" className="w-full gap-2" onClick={async () => {
                  const newCustomer = request.customer_confirmed_complete;
                  if (newCustomer) {
                    await db.from("service_requests").update({ worker_confirmed_complete: true, status: "completed" }).eq("id", request.id);
                    setRequest({ ...request, worker_confirmed_complete: true, status: "completed" });
                    toast.success("Both confirmed! Request is now completed and archived.");
                  } else {
                    await db.from("service_requests").update({ worker_confirmed_complete: true }).eq("id", request.id);
                    setRequest({ ...request, worker_confirmed_complete: true });
                    toast.success("Marked as complete. Waiting for customer confirmation.");
                  }
                }}>
                  <CheckCircle2 className="h-4 w-4" /> Mark Work Complete
                </Button>
              );
            })()}

            {!user && (
              <Link to="/login">
                <Button variant="hero" className="w-full gap-2">
                  <MessageSquare className="h-4 w-4" /> Log in to Make an Offer
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Chat Dialog */}
      <Dialog open={!!chatOfferId} onOpenChange={(open) => !open && setChatOfferId(null)}>
        <DialogContent className="p-0 max-w-md">
          <DialogHeader className="sr-only">
            <DialogTitle>Chat</DialogTitle>
          </DialogHeader>
          {chatOfferId && <OfferChat offerId={chatOfferId} otherUserName={chatOtherName} />}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};



export const Route = createFileRoute("/requests/$id")({ component: RequestDetail });
