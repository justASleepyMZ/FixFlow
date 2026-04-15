import { createFileRoute } from "@tanstack/react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/map")({
  component: MapPage,
  head: () => ({
    meta: [
      { title: "Requests Map — FixFlow" },
    ],
  }),
});

function MapPage() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Map requires leaflet which needs DOM - simplified placeholder for now
    setLoading(false);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-surface">
      <Navbar />
      <div className="container flex-1 py-6">
        <div className="mb-4">
          <h1 className="font-display text-2xl font-bold md:text-3xl">Requests Map</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            View open requests on a map. Full map functionality requires Leaflet setup with your database.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border shadow-card bg-card" style={{ height: "calc(100vh - 220px)" }}>
            <div className="text-center text-muted-foreground">
              <MapPin className="mx-auto h-12 w-12 mb-3 text-primary/40" />
              <p className="font-medium">Map View</p>
              <p className="text-sm mt-1">Connect your database to see requests on the map</p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
