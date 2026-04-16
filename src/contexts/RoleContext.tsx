import React, { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type GuestRole = "user" | "worker" | "admin" | "company" | null;

interface RoleContextType {
  role: GuestRole;
  setRole: (role: GuestRole) => void;
  isGuest: boolean;
  effectiveRole: GuestRole;
}

const RoleContext = createContext<RoleContextType>({
  role: null,
  setRole: () => {},
  isGuest: false,
  effectiveRole: null,
});

export const useRole = () => useContext(RoleContext);

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRole] = useState<GuestRole>(null);
  const { user, userRole } = useAuth();

  // When user is authenticated, sync guest role with their actual role
  useEffect(() => {
    if (user && userRole) {
      setRole(userRole);
    } else if (!user) {
      setRole(null);
    }
  }, [user, userRole]);

  const effectiveRole = user ? userRole : role;

  return (
    <RoleContext.Provider value={{ role, setRole, isGuest: !user && role !== null, effectiveRole }}>
      {children}
    </RoleContext.Provider>
  );
};
