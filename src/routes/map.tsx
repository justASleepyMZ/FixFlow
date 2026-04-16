import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2 } from "lucide-react";

const MapContent = lazy(() => import("@/components/MapContent"));

const MapPage = () => {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-surface">
      <Navbar />

      <div className="container flex-1 py-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <MapContent />
        </Suspense>
      </div>

      <Footer />
    </div>
  );
};

export const Route = createFileRoute("/map")({ component: MapPage });
