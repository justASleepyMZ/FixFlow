import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import L, { type Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as any;
import { Loader2, MapPin } from "lucide-react";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const CITY_STORAGE_KEY = "fixadeal_priority_city";
const DEFAULT_ZOOM = 6;
const CITY_ZOOM = 7;

const CITY_COORDS: Record<string, [number, number]> = {
  astana: [51.1694, 71.4491],
  almaty: [43.222, 76.8512],
  shymkent: [42.3417, 69.5901],
  karaganda: [49.8047, 73.1094],
  aktobe: [50.2839, 57.167],
  taraz: [42.9, 71.3667],
  pavlodar: [52.2873, 76.9674],
  "ust-kamenogorsk": [49.948, 82.6272],
  semey: [50.4111, 80.2275],
  atyrau: [47.1167, 51.9],
  kostanay: [53.2144, 63.6246],
  kyzylorda: [44.8531, 65.5092],
  oral: [51.2333, 51.3667],
  petropavl: [54.8667, 69.15],
  aktau: [43.65, 51.15],
  temirtau: [50.0547, 72.9644],
  turkestan: [43.3017, 68.2481],
  taldykorgan: [45.0175, 78.3739],
  ekibastuz: [51.7231, 75.3231],
  rudny: [52.9667, 63.1167],
};

const defaultMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapRequest {
  id: string;
  title: string;
  city: string;
  budget: number | null;
  position: [number, number];
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildPopupContent = (request: MapRequest) => `
  <div class="min-w-[180px]">
    <p class="text-sm font-semibold text-foreground">${escapeHtml(request.title)}</p>
    <p class="mt-0.5 text-xs text-muted-foreground">${escapeHtml(request.city)}</p>
    ${request.budget != null ? `<p class="mt-1 text-sm font-bold text-foreground">₸ ${request.budget.toLocaleString()}</p>` : ""}
    <a href="/requests/${request.id}" class="mt-2 inline-block text-xs font-medium text-primary hover:underline">View details →</a>
  </div>
`;

const MapPage = () => {
  const [requests, setRequests] = useState<MapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    setSelectedCity(localStorage.getItem(CITY_STORAGE_KEY));
  }, []);

  const center = useMemo<[number, number]>(() => {
    const normalizedCity = selectedCity?.toLowerCase();
    if (normalizedCity && CITY_COORDS[normalizedCity]) {
      return CITY_COORDS[normalizedCity];
    }
    return CITY_COORDS.astana;
  }, [selectedCity]);

  const zoom = selectedCity ? CITY_ZOOM : DEFAULT_ZOOM;

  useEffect(() => {
    if (!mapElementRef.current || mapRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markerLayerRef.current = markerLayer;

    return () => {
      markerLayer.clearLayers();
      map.remove();
      markerLayerRef.current = null;
      mapRef.current = null;
    };
  }, [center, zoom]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("id, title, city, budget")
        .eq("status", "open")
        .not("city", "is", null);

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const cityMarkerCounts: Record<string, number> = {};

      const mappedRequests: MapRequest[] = (data ?? [])
        .map((request) => {
          if (!request.city) return null;

          const cityKey = request.city.toLowerCase();
          const baseCoords = CITY_COORDS[cityKey];
          if (!baseCoords) return null;

          const cityIndex = cityMarkerCounts[cityKey] ?? 0;
          cityMarkerCounts[cityKey] = cityIndex + 1;

          const angle = cityIndex * 0.9;
          const radius = 0.06 * Math.floor(cityIndex / 6 + 1);
          const latOffset = cityIndex === 0 ? 0 : Math.sin(angle) * radius;
          const lngOffset = cityIndex === 0 ? 0 : Math.cos(angle) * radius;

          return {
            id: request.id,
            title: request.title,
            city: request.city,
            budget: request.budget,
            position: [baseCoords[0] + latOffset, baseCoords[1] + lngOffset] as [number, number],
          };
        })
        .filter((request): request is MapRequest => Boolean(request));

      setRequests(mappedRequests);
      setLoading(false);
    };

    fetchRequests();
  }, []);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (!markerLayer) return;

    markerLayer.clearLayers();

    requests.forEach((request) => {
      L.marker(request.position, { icon: defaultMarkerIcon })
        .bindPopup(buildPopupContent(request))
        .addTo(markerLayer);
    });
  }, [requests]);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-surface">
      <Navbar />

      <div className="container flex-1 py-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Requests Map</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Open requests only, centered on {selectedCity ?? "Astana"}.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            {requests.length} marker{requests.length === 1 ? "" : "s"}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border shadow-card" style={{ height: "calc(100vh - 220px)" }}>
            <div ref={mapElementRef} className="h-full w-full" aria-label="Open requests map" />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};



export const Route = createFileRoute("/map")({ component: MapPage });
