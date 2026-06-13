import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Leaf, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName, phone },
        emailRedirectTo: "https://smart-eat-smart-fridge.lovable.app/login",
      },
    });
    setLoading(false);

    if (error) {
      const msg = error.message?.toLowerCase() || "";
      if (
        msg.includes("already registered") ||
        msg.includes("already been registered") ||
        msg.includes("user already") ||
        msg.includes("duplicate") ||
        error.status === 422
      ) {
        toast({
          title: "Email already registered",
          description: "A user with this email already exists. Please sign in instead.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      return;
    }

    // Supabase returns success with empty identities array when email already exists
    // (privacy feature to prevent email enumeration). Detect this case manually.
    if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
      toast({
        title: "Email already registered",
        description: "A user with this email already exists. Please sign in instead.",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success!", description: "Check your email to confirm your account." });
    navigate("/login");
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
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Create Account</h2>
          <p className="text-muted-foreground text-sm mb-6">Join smart shopping 🌿</p>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="pl-10 bg-secondary/50 border-border/50"
                required
              />
            </div>
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
            <PhoneInput value={phone} onChange={setPhone} required />
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 bg-secondary/50 border-border/50"
                minLength={6}
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

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;
