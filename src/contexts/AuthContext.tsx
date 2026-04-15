import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import type { AppRole, Profile, CompanyProfile } from "@/types/database";

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

const SESSION_DURATION_MS = 60 * 60 * 1000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    const [profileRes, roleRes, companyRes] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, phone").eq("user_id", userId).single(),
      supabase.from("user_roles").select("role").eq("user_id", userId).single(),
      supabase.from("company_profiles").select("company_name, company_description, company_address, tax_id, website").eq("user_id", userId).maybeSingle(),
    ]);
    setProfile(profileRes.data as Profile | null);
    setUserRole((roleRes.data as { role: AppRole } | null)?.role ?? null);
    setCompanyProfile(companyRes.data as CompanyProfile | null);
  };

  const checkSessionExpiry = (sess: Session | null) => {
    if (!sess) return false;
    if (typeof window === "undefined") return false;
    const loginTime = localStorage.getItem("fixflow_login_time");
    if (loginTime && Date.now() - parseInt(loginTime) > SESSION_DURATION_MS) {
      supabase.auth.signOut();
      localStorage.removeItem("fixflow_login_time");
      return true;
    }
    return false;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      if (sess && checkSessionExpiry(sess)) return;
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
      if (sess && checkSessionExpiry(sess)) {
        setLoading(false);
        return;
      }
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) fetchUserData(sess.user.id);
      setLoading(false);
    });

    const interval = setInterval(() => {
      checkSessionExpiry(session);
    }, 60_000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
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
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    if (error) return { error };

    const userId = data.user?.id;
    if (!userId) return { error: new Error("Signup failed") };

    await supabase.from("profiles").update({ phone } as Record<string, unknown>).eq("user_id", userId);
    await supabase.from("user_roles").insert({ user_id: userId, role } as Record<string, unknown>);

    if (role === "company" && companyData?.company_name) {
      await supabase.from("company_profiles").insert({
        user_id: userId,
        company_name: companyData.company_name,
        company_description: companyData.company_description ?? null,
        company_address: companyData.company_address ?? null,
        tax_id: companyData.tax_id ?? null,
        website: companyData.website ?? null,
      } as Record<string, unknown>);
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("fixflow_login_time", Date.now().toString());
    }
    await fetchUserData(userId);
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && typeof window !== "undefined") {
      localStorage.setItem("fixflow_login_time", Date.now().toString());
    }
    return { error };
  };

  const signOut = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("fixflow_login_time");
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, profile, companyProfile, userRole, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
