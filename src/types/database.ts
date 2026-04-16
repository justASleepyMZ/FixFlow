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
