import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface Profile {
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
}

interface CompanyProfile {
  company_name: string;
  company_description: string | null;
  company_address: string | null;
  tax_id: string | null;
  website: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  companyProfile: CompanyProfile | null;
  userRole: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string, phone: string, role: AppRole, companyData?: Partial<CompanyProfile>) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [profileRes, roleRes, companyRes] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, phone").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("company_profiles").select("company_name, company_description, company_address, tax_id, website").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile(profileRes.data);
    setUserRole(roleRes.data?.role ?? null);
    setCompanyProfile(companyRes.data);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => fetchUserData(sess.user.id), 0);
      } else {
        setProfile(null);
        setUserRole(null);
        setCompanyProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) fetchUserData(sess.user.id);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    phone: string,
    role: AppRole,
    companyData?: Partial<CompanyProfile>
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined,
      },
    });
    if (error) return { error };

    const userId = data.user?.id;
    if (!userId) return { error: new Error("Signup failed") };

    // Wait for session so RLS-protected inserts work (auto-confirm should give us one)
    let session = data.session;
    if (!session) {
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) return { error: signInErr };
      session = signInData.session;
    }

    if (phone) {
      await supabase.from("profiles").update({ phone }).eq("user_id", userId);
    }

    const { error: roleErr } = await supabase.from("user_roles").insert({ user_id: userId, role });
    if (roleErr) {
      console.error("role insert", roleErr);
      return { error: new Error(`Failed to set role: ${roleErr.message}`) };
    }

    if (role === "company" && companyData?.company_name) {
      const { error: compErr } = await supabase.from("company_profiles").insert({
        user_id: userId,
        company_name: companyData.company_name,
        company_description: companyData.company_description ?? null,
        company_address: companyData.company_address ?? null,
        tax_id: companyData.tax_id ?? null,
        website: companyData.website ?? null,
      });
      if (compErr) console.error("company insert", compErr);
    }

    await fetchUserData(userId);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, companyProfile, userRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
