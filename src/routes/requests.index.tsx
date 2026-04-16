import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceRequestCard from "@/components/ServiceRequestCard";
import { categories } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import StarRating from "@/components/StarRating";
import { Search, Plus, HardHat, ShieldCheck, SlidersHorizontal, Loader2, X, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { useRole } from "@/contexts/RoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import type { ServiceRequestData } from "@/components/ServiceRequestCard";

const KAZAKHSTAN_CITIES = [
  "Astana", "Almaty", "Shymkent", "Karaganda", "Aktobe",
  "Taraz", "Pavlodar", "Ust-Kamenogorsk", "Semey", "Atyrau",
  "Kostanay", "Kyzylorda", "Oral", "Petropavl", "Aktau",
  "Temirtau", "Turkestan", "Taldykorgan", "Ekibastuz", "Rudny",
];

const CITY_STORAGE_KEY = "fixadeal_priority_city";
const CITY_CHOSEN_KEY = "fixadeal_city_chosen";

const Requests = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [priorityCity, setPriorityCity] = useState<string | null>(() => localStorage.getItem(CITY_STORAGE_KEY));
  const [cityChosen, setCityChosen] = useState(() => localStorage.getItem(CITY_CHOSEN_KEY) === "true");
  const [minRating, setMinRating] = useState(0);
  const { effectiveRole } = useRole();
  const { user } = useAuth();
  const [requests, setRequests] = useState<ServiceRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [cities, setCities] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    const fetchRequests = async () => {
      const { data, error } = await supabase
        .from("service_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      // Extract unique cities
      const uniqueCities = [...new Set((data || []).map((r) => r.city).filter(Boolean))] as string[];
      setCities(uniqueCities);

      // Fetch poster average ratings
      const userIds = [...new Set((data || []).map((r) => r.user_id))];
      const { data: ratingsData } = await supabase
        .from("ratings")
        .select("rated_user_id, rating")
        .in("rated_user_id", userIds);

      const ratingMap: Record<string, { sum: number; count: number }> = {};
      ratingsData?.forEach((r) => {
        if (!ratingMap[r.rated_user_id]) ratingMap[r.rated_user_id] = { sum: 0, count: 0 };
        ratingMap[r.rated_user_id].sum += r.rating;
        ratingMap[r.rated_user_id].count += 1;
      });

      const mapped: ServiceRequestData[] = (data || []).map((r) => {
        const avg = ratingMap[r.user_id]
          ? ratingMap[r.user_id].sum / ratingMap[r.user_id].count
          : 0;
        return {
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
          posterRating: avg,
          desiredStartDate: r.desired_start_date ?? undefined,
          desiredEndDate: r.desired_end_date ?? undefined,
        };
      }).filter((r) => r.status.toLowerCase() === "open");
      setRequests(mapped);
      setLoading(false);
    };
    fetchRequests();
  }, []);

  const activeFilterCount = [selectedCategory, selectedCity, minRating > 0].filter(Boolean).length;

  const filtered = requests.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || r.category === selectedCategory;
    const matchesCity = !selectedCity || r.city === selectedCity;
    const matchesRating = minRating === 0 || (r.posterRating ?? 0) >= minRating;
    return matchesSearch && matchesCategory && matchesCity && matchesRating;
  });

  // Sort by priority city: matching city first, then the rest
  const sorted = priorityCity
    ? [...filtered].sort((a, b) => {
        const aMatch = a.city.toLowerCase() === priorityCity.toLowerCase() ? 0 : 1;
        const bMatch = b.city.toLowerCase() === priorityCity.toLowerCase() ? 0 : 1;
        return aMatch - bMatch;
      })
    : filtered;

  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedCity(null);
    setMinRating(0);
  };

  const handleCitySelect = (city: string) => {
    setPriorityCity(city);
    setCityChosen(true);
    localStorage.setItem(CITY_STORAGE_KEY, city);
    localStorage.setItem(CITY_CHOSEN_KEY, "true");
  };

  const handleSkipCity = () => {
    setPriorityCity(null);
    setCityChosen(true);
    localStorage.removeItem(CITY_STORAGE_KEY);
    localStorage.setItem(CITY_CHOSEN_KEY, "true");
  };

  const handleChangeCity = () => {
    setCityChosen(false);
    localStorage.removeItem(CITY_CHOSEN_KEY);
    localStorage.removeItem(CITY_STORAGE_KEY);
  };

  // City picker overlay
  if (!cityChosen && !loading) {
    return (
      <div className="min-h-screen bg-gradient-surface">
        <Navbar />
        <div className="container py-12">
          <div className="mx-auto max-w-2xl rounded-2xl border bg-card p-8 shadow-lg">
            <div className="mb-6 flex flex-col items-center gap-3 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <MapPin className="h-7 w-7 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold">Select your city</h2>
              <p className="text-muted-foreground">
                Choose a city to see nearby requests first
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {KAZAKHSTAN_CITIES.map((city) => (
                <Button
                  key={city}
                  variant={priorityCity === city ? "default" : "outline"}
                  className="h-auto py-2.5 text-sm"
                  onClick={() => handleCitySelect(city)}
                >
                  {city}
                </Button>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <Button variant="ghost" onClick={handleSkipCity} className="text-muted-foreground">
                Skip — show all requests
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-surface">
      <Navbar />

      <div className="container py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold md:text-3xl">Service Requests</h1>
            <p className="mt-1 text-muted-foreground">
              {sorted.length} active requests
              {priorityCity && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  <MapPin className="h-3 w-3" /> {priorityCity}
                   <button onClick={handleChangeCity} className="ml-1 hover:text-primary/70">
                     <X className="h-3 w-3" />
                   </button>
                </span>
              )}
              {!priorityCity && (
                <button onClick={handleChangeCity} className="ml-2 text-xs text-primary hover:underline">
                  <MapPin className="mr-0.5 inline h-3 w-3" />Select city
                </button>
              )}
            </p>
          </div>

          <div className="flex gap-2">
            {(effectiveRole === "user" || effectiveRole === "company") && user && (
              <Link to="/requests/new">
                <Button variant="hero">
                  <Plus className="mr-1.5 h-4 w-4" /> Post a Request
                </Button>
              </Link>
            )}

            {effectiveRole === "worker" && (
              <Button variant="outline" className="pointer-events-none gap-1.5">
                <HardHat className="h-4 w-4" /> Browse &amp; submit offers below
              </Button>
            )}

            {effectiveRole === "admin" && (
              <Button variant="outline" className="pointer-events-none gap-1.5">
                <ShieldCheck className="h-4 w-4" /> Moderation mode active
              </Button>
            )}

            {!effectiveRole && (
              <Link to="/login">
                <Button variant="hero">
                  <Plus className="mr-1.5 h-4 w-4" /> Post a Request
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Search & Filter Button */}
        <div className="mt-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search requests..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 space-y-4" align="end">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">Filters</h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto gap-1 px-2 py-1 text-xs" onClick={clearFilters}>
                    <X className="h-3 w-3" /> Clear all
                  </Button>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Category</Label>
                <Select value={selectedCategory || "__all__"} onValueChange={(v) => setSelectedCategory(v === "__all__" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.name} value={cat.name}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">City</Label>
                <Select value={selectedCity || "__all__"} onValueChange={(v) => setSelectedCity(v === "__all__" ? null : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="All cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">All cities</SelectItem>
                    {cities.map((city) => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Min Rating */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Minimum Poster Rating</Label>
                <StarRating
                  rating={minRating}
                  size="md"
                  interactive
                  onChange={(r) => setMinRating(r === minRating ? 0 : r)}
                  showValue
                />
              </div>

              <Button variant="hero" className="w-full" onClick={() => setFiltersOpen(false)}>
                Apply Filters
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {/* Listing grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((req) => (
              <ServiceRequestCard key={req.id} request={req} />
            ))}
          </div>
        )}

        {!loading && sorted.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-lg font-medium">No requests found</p>
            <p className="mt-1 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};


import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/requests")({ component: Requests });
