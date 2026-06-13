import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PremiumContextType {
  isPremium: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType>({
  isPremium: false,
  loading: true,
  refresh: async () => {},
});

export const usePremium = () => useContext(PremiumContext);

export const PremiumProvider = ({ children }: { children: ReactNode }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPremium = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }

    const { data, error } = await (supabase.rpc as any)("get_my_premium");

    if (error) {
      console.error("get_my_premium error:", error);
      setIsPremium(false);
    } else {
      setIsPremium(data === true);
    }
    setLoading(false);
  };

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
        if (session?.user) {
          (supabase.rpc as any)("get_my_premium").then(({ data, error }: any) => {
            if (!error) setIsPremium(data === true);
            setLoading(false);
          });
        } else {
          setIsPremium(false);
          setLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        setIsPremium(false);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <PremiumContext.Provider value={{ isPremium, loading, refresh: fetchPremium }}>{children}</PremiumContext.Provider>
  );
};
