-- Role enum
CREATE TYPE public.app_role AS ENUM ('user', 'worker', 'company', 'admin');

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Roles are viewable by everyone" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own role" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Company profiles
CREATE TABLE public.company_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  company_description TEXT,
  company_address TEXT,
  tax_id TEXT,
  website TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Company profiles are viewable by everyone" ON public.company_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own company profile" ON public.company_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own company profile" ON public.company_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_profiles_updated_at BEFORE UPDATE ON public.company_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('request-photos', 'request-photos', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can update their own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Request photos are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'request-photos');
CREATE POLICY "Authenticated users can upload request photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'request-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own request photos" ON storage.objects FOR DELETE USING (bucket_id = 'request-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Service Requests
CREATE TABLE public.service_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Other',
  city TEXT,
  district TEXT,
  address TEXT,
  budget NUMERIC,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','assigned','in_progress','completed','cancelled')),
  photos TEXT[] DEFAULT '{}',
  desired_start_date DATE,
  desired_end_date DATE,
  customer_confirmed_complete BOOLEAN NOT NULL DEFAULT false,
  worker_confirmed_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service requests are viewable by everyone" ON public.service_requests FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create requests" ON public.service_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own requests" ON public.service_requests FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own requests" ON public.service_requests FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON public.service_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Offers
CREATE TABLE public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL,
  price NUMERIC NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view offers on their requests or their own offers" ON public.offers FOR SELECT
USING (auth.uid() = worker_id OR auth.uid() IN (SELECT user_id FROM public.service_requests WHERE id = request_id));
CREATE POLICY "Authenticated users can create offers" ON public.offers FOR INSERT WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "Offer creator can update their offer" ON public.offers FOR UPDATE USING (auth.uid() = worker_id);
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Accepted worker can confirm completion" ON public.service_requests FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.offers WHERE offers.request_id = service_requests.id AND offers.worker_id = auth.uid() AND offers.status = 'accepted'))
WITH CHECK (EXISTS (SELECT 1 FROM public.offers WHERE offers.request_id = service_requests.id AND offers.worker_id = auth.uid() AND offers.status = 'accepted'));

-- Chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chat participants can view messages" ON public.chat_messages FOR SELECT
USING (auth.uid() IN (
  SELECT o.worker_id FROM public.offers o WHERE o.id = offer_id
  UNION
  SELECT sr.user_id FROM public.service_requests sr JOIN public.offers o ON o.request_id = sr.id WHERE o.id = offer_id
));
CREATE POLICY "Chat participants can send messages" ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = sender_id AND auth.uid() IN (
  SELECT o.worker_id FROM public.offers o WHERE o.id = offer_id
  UNION
  SELECT sr.user_id FROM public.service_requests sr JOIN public.offers o ON o.request_id = sr.id WHERE o.id = offer_id
));
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Ratings
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rated_user_id UUID NOT NULL,
  rated_by_user_id UUID NOT NULL,
  request_id UUID NOT NULL,
  rating SMALLINT NOT NULL,
  review TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (rated_user_id, rated_by_user_id, request_id)
);
CREATE OR REPLACE FUNCTION public.validate_rating()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN RAISE EXCEPTION 'Rating must be between 1 and 5'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER check_rating_range BEFORE INSERT OR UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.validate_rating();
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ratings are viewable by everyone" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can create ratings" ON public.ratings FOR INSERT WITH CHECK (auth.uid() = rated_by_user_id);
CREATE POLICY "Users can update their own ratings" ON public.ratings FOR UPDATE USING (auth.uid() = rated_by_user_id);