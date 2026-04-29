import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, DollarSign, CalendarDays } from "lucide-react";
import { Link } from "@tanstack/react-router";
import StarRating from "@/components/StarRating";

export interface ServiceRequestData {
  id: string;
  title: string;
  category: string;
  description: string;
  city: string;
  district: string;
  price: number;
  status: string;
  createdAt: string;
  offersCount: number;
  imageUrl?: string;
  posterRating?: number;
  desiredStartDate?: string;
  desiredEndDate?: string;
}

const statusColors: Record<string, string> = {
  open: "bg-primary/10 text-primary",
  "in negotiation": "bg-secondary/20 text-secondary-foreground",
  assigned: "bg-accent text-accent-foreground",
  "in progress": "bg-secondary/30 text-secondary-foreground",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/10 text-destructive",
};

const ServiceRequestCard = ({ request }: { request: ServiceRequestData }) => {
  return (
    <Link
      to={`/requests/${request.id}`}
      className="group block rounded-xl border bg-card shadow-card transition-all duration-300 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      {request.imageUrl && (
        <div className="relative h-44 overflow-hidden rounded-t-xl">
          <img
            src={request.imageUrl}
            alt={request.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-3 left-3">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusColors[request.status.toLowerCase()] || "bg-muted text-muted-foreground"}`}>
              {request.status}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Badge variant="accent" className="mb-2 text-[11px]">{request.category}</Badge>
            <h3 className="font-display text-base font-semibold leading-snug group-hover:text-primary transition-colors">
              {request.title}
            </h3>
          </div>
        </div>

        <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{request.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {request.city}, {request.district}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {request.createdAt}
          </span>
          {request.desiredStartDate && (
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date(request.desiredStartDate).toLocaleDateString()} – {request.desiredEndDate ? new Date(request.desiredEndDate).toLocaleDateString() : "…"}
            </span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="flex items-center gap-1 font-display text-lg font-bold text-foreground">
            {request.price.toLocaleString()} ₸
          </span>
          <div className="flex items-center gap-2">
            {request.posterRating !== undefined && request.posterRating > 0 && (
              <StarRating rating={request.posterRating} size="sm" showValue />
            )}
            <span className="text-xs text-muted-foreground">
              {request.offersCount} offer{request.offersCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ServiceRequestCard;
