import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePremium } from "@/contexts/PremiumContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { refresh: refreshPremium } = usePremium();

  // Ako je admin već ulogovan, odmah ga preusmeri
  useEffect(() => {
    const checkExistingSession = async () => {
      if (searchParams.get("premium") === "success") return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).maybeSingle();
      if (profile?.is_admin === true) {
        navigate("/admin-scan", { replace: true });
      }
    };
    checkExistingSession();
  }, []);

  // Ako korisnik dolazi sa Stripe-a i već je ulogovan, aktiviraj premium odmah
  useEffect(() => {
    const handlePremiumReturn = async () => {
      if (searchParams.get("premium") !== "success") return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      try {
        await supabase.functions.invoke("verify-premium");
        await new Promise((r) => setTimeout(r, 1000)); // čekaj da DB upiše
        await refreshPremium();
        toast({ title: "🎉 Welcome to Premium!", description: "Ads have been removed from your account." });
      } catch (e) {
        console.error("Premium verification failed:", e);
      }
      navigate("/profile", { replace: true });
    };
    handlePremiumReturn();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (authData?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (profile?.is_admin === true) {
        setLoading(false);
        navigate("/admin-scan");
        return;
      }
    }

    if (searchParams.get("premium") === "success") {
      try {
        await supabase.functions.invoke("verify-premium");
        await new Promise((r) => setTimeout(r, 1000)); // čekaj da DB upiše
        await refreshPremium();
        toast({ title: "🎉 Welcome to Premium!", description: "Ads have been removed from your account." });
      } catch (e) {
        console.error("Premium verification failed:", e);
      }
      setLoading(false);
      navigate("/profile");
      return;
    }

    await refreshPremium();
    setLoading(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">EatSmart</h1>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Sign In</h2>
          <p className="text-muted-foreground text-sm mb-6">Welcome back! 👋</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-secondary/50 border-border/50"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
