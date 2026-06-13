/**
 * src/pages/Profile.tsx
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Save, LogOut, Crown, Loader2, Wallet, CheckCircle, Copy, ShieldCheck, Unlink } from "lucide-react";
import PhoneInput from "@/components/PhoneInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/contexts/PremiumContext";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { useNavigate } from "react-router-dom";
import {
  connectMetaMask,
  isMetaMaskAvailable,
  isMobileDevice,
  getMetaMaskDeepLinkForCurrentPage,
} from "@/lib/blockchain";

const Profile = () => {
  const { user, signOut } = useAuth();
  const { isPremium, loading: premiumLoading } = usePremium();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [connectingWallet, setConnectingWallet] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    setEmail(user.email || "");
    setDisplayName(user.user_metadata?.display_name || user.email?.split("@")[0] || "");

    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();

      if (data) {
        setDisplayName(data.display_name || user.user_metadata?.display_name || "");
        setEmail(data.email || user.email || "");
        setPhone(data.phone || user.user_metadata?.phone || "");
        setWalletAddress((data as any).wallet_address || "");
      } else {
        setPhone(user.user_metadata?.phone || "");
      }
    };

    fetchProfile();
  }, [user, navigate]);

  // ─── CONNECT METAMASK ─────────────────────────────────────────────
  const handleConnectMetaMask = async () => {
    // Mobile without MetaMask browser → open MetaMask app
    if (!isMetaMaskAvailable() && isMobileDevice()) {
      window.location.href = getMetaMaskDeepLinkForCurrentPage();
      return;
    }

    if (!isMetaMaskAvailable()) {
      toast({
        title: "MetaMask Not Found",
        description: "Visit metamask.io to install the MetaMask extension.",
        variant: "destructive",
      });
      return;
    }

    setConnectingWallet(true);
    try {
      const address = await connectMetaMask();
      if (address) {
        setWalletAddress(address);
        // Save immediately to DB
        await supabase.rpc("update_own_profile", { _wallet_address: address });
        toast({
          title: "✅ MetaMask Connected!",
          description: `Address: ${address.slice(0, 8)}...${address.slice(-6)}`,
        });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setConnectingWallet(false);
    }
  };

  // ─── DISCONNECT WALLET ────────────────────────────────────────────
  const handleDisconnectWallet = async () => {
    setWalletAddress("");
    await supabase.rpc("update_own_profile", { _wallet_address: "" });
    toast({ title: "Wallet Disconnected", description: "You can reconnect anytime." });
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({ title: "Copied!", description: "Wallet address copied to clipboard." });
    }
  };

  // ─── SAVE PROFILE ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    setLoading(true);

    if (phone.trim()) {
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", phone.trim())
        .neq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Error",
          description: "This phone number is already registered to another account.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.rpc("update_own_profile", {
      _display_name: displayName.trim(),
      _phone: phone.trim() || null,
      _wallet_address: walletAddress.trim() || null,
    });

    setLoading(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Saved!", description: "Your profile has been updated." });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 pb-28 px-5 pt-12 lg:px-8 xl:px-16 2xl:px-24 flex flex-col items-center">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <h1 className="font-display text-2xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your account details</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-8 w-full max-w-lg"
        >
          <div className="glass-card rounded-2xl p-6 space-y-5">
            {/* Avatar + Name */}
            <div className="flex items-center gap-4 mb-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <span className="font-display text-2xl font-bold text-primary">
                  {displayName ? displayName[0].toUpperCase() : "U"}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-bold text-foreground">{displayName || "User"}</h2>
                  {isAdmin && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                      <ShieldCheck className="w-3 h-3" />
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">{email}</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="pl-10 bg-secondary/50 border-border/50"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={email} disabled className="pl-10 bg-secondary/50 border-border/50 opacity-60" />
                </div>
              </div>

              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Phone Number</label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>

              {/* ── METAMASK WALLET ── */}
              <div>
                <label className="text-sm text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5" />
                  MetaMask Wallet Address
                  <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-full ml-1">
                    for blockchain donations
                  </span>
                </label>

                {walletAddress ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 relative">
                        <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-safe" />
                        <Input
                          value={`${walletAddress.slice(0, 10)}...${walletAddress.slice(-8)}`}
                          disabled
                          className="pl-10 bg-safe/5 border-safe/30 text-safe font-mono text-sm"
                        />
                      </div>
                      <button
                        onClick={handleCopyAddress}
                        className="p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
                        title="Copy address"
                      >
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>
                    <button
                      onClick={handleDisconnectWallet}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Button
                      onClick={handleConnectMetaMask}
                      disabled={connectingWallet}
                      variant="outline"
                      className="w-full border-orange-500/40 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/60"
                    >
                      {connectingWallet ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Wallet className="w-4 h-4 mr-2" />
                      )}
                      {connectingWallet ? "Connecting..." : "Connect MetaMask"}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      Required so donation tokens can be sent to your wallet (Sepolia testnet)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Premium Section */}
            <div className="pt-2 border-t border-border/50">
              {isAdmin ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Admin Account</p>
                    <p className="text-xs text-muted-foreground">Full access — no subscription required</p>
                  </div>
                </div>
              ) : premiumLoading ? (
                <div className="h-12 rounded-xl bg-muted/40 animate-pulse" />
              ) : isPremium ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Premium Member</p>
                    <p className="text-xs text-muted-foreground">Enjoying ad-free experience</p>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={async () => {
                    setUpgrading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("create-checkout", {
                        body: { returnUrl: window.location.origin },
                      });
                      if (error) throw error;
                      if (data?.url) window.location.href = data.url;
                    } catch (e: any) {
                      toast({
                        title: "Error",
                        description: e.message || "Failed to start checkout",
                        variant: "destructive",
                      });
                    } finally {
                      setUpgrading(false);
                    }
                  }}
                  disabled={upgrading}
                  className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white"
                >
                  {upgrading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Crown className="w-4 h-4 mr-2" />}
                  {upgrading ? "Redirecting..." : "Upgrade to Premium — $4.99"}
                </Button>
              )}
            </div>

            {/* Save / Sign Out */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={loading} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                {loading ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
