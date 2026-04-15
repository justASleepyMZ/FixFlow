// App-specific database types that extend the auto-generated Supabase types
// These types describe the tables that exist in the original fix-a-deals database

export type AppRole = "user" | "worker" | "company" | "admin";

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

export interface CompanyProfile {
  company_name: string;
  company_description: string | null;
  company_address: string | null;
  tax_id: string | null;
  website: string | null;
}

export interface ServiceRequest {
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
  photos: string[] | null;
  created_at: string;
  updated_at: string;
  desired_start_date: string | null;
  desired_end_date: string | null;
  customer_confirmed_complete: boolean;
  worker_confirmed_complete: boolean;
}

export interface Offer {
  id: string;
  request_id: string;
  worker_id: string;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  offer_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface Rating {
  id: string;
  rated_user_id: string;
  rated_by_user_id: string;
  request_id: string;
  rating: number;
  review: string | null;
  created_at: string;
  updated_at: string;
}
