/**
 * src/contexts/AdminContext.tsx
 *
 * Checks whether the currently logged-in user has admin privileges
 * (is_admin = true in the Supabase profiles table).
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface AdminContextType {
  isAdmin: boolean;
  loading: boolean;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  loading: true,
});

export const useAdmin = () => useContext(AdminContext);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Čekaj dok AuthContext ne završi učitavanje sesije
    if (authLoading) return;

    const checkAdmin = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();

      setIsAdmin(data?.is_admin === true);
      setLoading(false);
    };

    checkAdmin();
  }, [user, authLoading]);

  return <AdminContext.Provider value={{ isAdmin, loading }}>{children}</AdminContext.Provider>;
};
