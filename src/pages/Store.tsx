import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowLeft, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import BottomNav from "@/components/BottomNav";

interface StoreCoupon {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string;
  category: string;
}

interface PurchasedCoupon {
  id: string;
  coupon_id: string;
  coupon_name: string;
  coupon_description: string;
  coupon_icon: string;
  coupon_cost: number;
  coupon_category: string;
  qr_code: string;
  status: string;
  purchased_at: string;
  used_at: string | null;
}

// Generate weekly coupons based on the current week number
function getWeekNumber(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
}

const allCoupons: StoreCoupon[] = [
  { id: "w1", name: "10% Off Fresh Produce", description: "Save on fruits & vegetables at partner stores", cost: 50, icon: "🥬", category: "Groceries" },
  { id: "w2", name: "15% Off Dairy Products", description: "Milk, cheese, yogurt and more at reduced prices", cost: 75, icon: "🥛", category: "Groceries" },
  { id: "w3", name: "20% Off Bakery Items", description: "Fresh bread, pastries and baked goods", cost: 100, icon: "🍞", category: "Groceries" },
  { id: "w4", name: "Free Reusable Bag", description: "Eco-friendly shopping bag from partner stores", cost: 30, icon: "🛍️", category: "Eco" },
  { id: "w5", name: "Plant a Tree", description: "We plant a tree in your name through our partners", cost: 150, icon: "🌳", category: "Planet" },
  { id: "w6", name: "Free Meal Box", description: "One free healthy meal box delivered to you", cost: 200, icon: "📦", category: "Special" },
  { id: "w7", name: "5% Off Entire Cart", description: "Discount on your full grocery purchase", cost: 120, icon: "🛒", category: "Groceries" },
  { id: "w8", name: "Compost Starter Kit", description: "Everything to start composting at home", cost: 80, icon: "🌱", category: "Eco" },
  { id: "w9", name: "10% Off Meat & Fish", description: "Fresh meat and seafood discounts", cost: 90, icon: "🥩", category: "Groceries" },
  { id: "w10", name: "Free Smoothie", description: "One free smoothie at partner juice bars", cost: 40, icon: "🥤", category: "Special" },
  { id: "w11", name: "25% Off Organic", description: "Save big on all organic labeled products", cost: 130, icon: "🌿", category: "Eco" },
  { id: "w12", name: "15% Off Frozen Foods", description: "Frozen veggies, meals and desserts", cost: 60, icon: "🧊", category: "Groceries" },
  { id: "w13", name: "Free Coffee", description: "One free coffee at partner cafes", cost: 25, icon: "☕", category: "Special" },
  { id: "w14", name: "10% Off Snacks", description: "Healthy snack bars, nuts and dried fruits", cost: 45, icon: "🥜", category: "Groceries" },
  { id: "w15", name: "Eco Water Bottle", description: "Stainless steel reusable water bottle", cost: 110, icon: "💧", category: "Eco" },
  { id: "w16", name: "20% Off Beverages", description: "Juices, sodas, and sparkling water", cost: 70, icon: "🧃", category: "Groceries" },
  { id: "w17", name: "Free Dessert", description: "One free dessert at partner bakeries", cost: 55, icon: "🍰", category: "Special" },
  { id: "w18", name: "Seed Planting Kit", description: "Grow herbs at home with this starter kit", cost: 95, icon: "🌻", category: "Planet" },
  { id: "w19", name: "10% Off Pasta & Rice", description: "Staple foods at discounted prices", cost: 35, icon: "🍝", category: "Groceries" },
  { id: "w20", name: "Donate a Meal", description: "Fund a meal for someone in need", cost: 100, icon: "❤️", category: "Planet" },
  { id: "w21", name: "15% Off Cleaning", description: "Eco-friendly cleaning supplies", cost: 65, icon: "🧹", category: "Eco" },
  { id: "w22", name: "Free Salad Bowl", description: "Fresh salad bowl at partner restaurants", cost: 85, icon: "🥗", category: "Special" },
  { id: "w23", name: "10% Off Baby Food", description: "Organic baby food and snacks", cost: 50, icon: "🍼", category: "Groceries" },
  { id: "w24", name: "Bamboo Cutlery Set", description: "Eco-friendly reusable cutlery set", cost: 70, icon: "🥢", category: "Eco" },
];

function getWeeklyCoupons(): StoreCoupon[] {
  const week = getWeekNumber();
  const start = (week * 12) % allCoupons.length;
  const result: StoreCoupon[] = [];
  for (let i = 0; i < 12; i++) {
    result.push(allCoupons[(start + i) % allCoupons.length]);
  }
  return result;
}

type Tab = "store" | "active" | "used";

const Store = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tokens, setTokens] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("store");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [purchasedCoupons, setPurchasedCoupons] = useState<PurchasedCoupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<PurchasedCoupon | null>(null);
  const [redeeming, setRedeeming] = useState(false);

  const weeklyCoupons = useMemo(() => getWeeklyCoupons(), []);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    if (!user) return;
    const { getFamilyUserIds } = await import('@/hooks/useFamilyData');
    const userIds = await getFamilyUserIds(user.id);

    const [tokensRes, couponsRes] = await Promise.all([
      supabase.from('user_tokens').select('total_tokens').in('user_id', userIds),
      supabase.from('purchased_coupons').select('*').in('user_id', userIds).order('purchased_at', { ascending: false }),
    ]);

    setTokens((tokensRes.data || []).reduce((sum, r) => sum + ((r as any).total_tokens || 0), 0));
    setPurchasedCoupons((couponsRes.data as any) || []);
  };

  const categories = ["All", "Groceries", "Eco", "Planet", "Special"];
  const filtered = selectedCategory === "All" ? weeklyCoupons : weeklyCoupons.filter(i => i.category === selectedCategory);

  const handleRedeem = async (item: StoreCoupon) => {
    if (!user || tokens < item.cost || redeeming) return;
    setRedeeming(true);

    const { error: insertErr } = await supabase.from('purchased_coupons').insert({
      user_id: user.id,
      coupon_id: item.id,
      coupon_name: item.name,
      coupon_description: item.description,
      coupon_icon: item.icon,
      coupon_cost: item.cost,
      coupon_category: item.category,
    } as any);

    if (insertErr) { toast.error("Failed to activate coupon"); setRedeeming(false); return; }

    await supabase.rpc('adjust_user_tokens', {
      _user_id: user.id,
      _token_delta: -item.cost,
      _point_delta: 0,
    });

    setTokens(prev => prev - item.cost);
    queryClient.invalidateQueries({ queryKey: ["family_tokens"] });
    toast.success(`Activated "${item.name}"!`);
    await fetchData();
    setRedeeming(false);
  };

  const handleMarkUsed = async (coupon: PurchasedCoupon) => {
    if (!user) return;
    await supabase
      .from('purchased_coupons')
      .update({ status: 'used', used_at: new Date().toISOString() } as any)
      .eq('id', coupon.id);
    toast.success("Coupon marked as used!");
    setSelectedCoupon(null);
    await fetchData();
  };

  const activeCoupons = purchasedCoupons.filter(c => c.status === 'active');
  const usedCoupons = purchasedCoupons.filter(c => c.status === 'used');

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "store", label: "🛒 Store" },
    { key: "active", label: "✅ Active", count: activeCoupons.length },
    { key: "used", label: "📋 Used", count: usedCoupons.length },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />

      <div className="relative z-10 pb-28 px-5 pt-8 lg:px-8 xl:px-16 2xl:px-24">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-primary" /> Store
              </h1>
              <p className="text-muted-foreground text-sm mt-1">Activate coupons with your tokens</p>
            </div>
            <div className="glass-card rounded-xl px-4 py-2 text-center">
              <p className="text-lg font-bold text-token">{tokens} 🪙</p>
              <p className="text-[9px] text-muted-foreground">Your tokens</p>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-5">
          {tabs.map(tab => (
            <motion.button
              key={tab.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ""}
            </motion.button>
          ))}
        </div>

        {/* Store Tab */}
        {activeTab === "store" && (
          <>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map(cat => (
                <motion.button
                  key={cat}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat ? "bg-primary/20 text-primary" : "glass-card text-muted-foreground"
                  }`}
                >
                  {cat}
                </motion.button>
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground mb-3 flex items-center gap-1">
              📅 Weekly coupons — refreshed every Monday
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filtered.map((item, idx) => {
                const canAfford = tokens >= item.cost;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="glass-card rounded-2xl p-4"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{item.description}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xs font-bold text-token">{item.cost} 🪙</span>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleRedeem(item)}
                            disabled={!canAfford || redeeming}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                              canAfford
                                ? "bg-primary/20 text-primary hover:bg-primary/30"
                                : "bg-muted/30 text-muted-foreground cursor-not-allowed"
                            }`}
                          >
                            {canAfford ? "Activate" : "Not enough"}
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}

        {/* Active Tab */}
        {activeTab === "active" && (
          <div>
            {activeCoupons.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">🎫</p>
                <p className="text-muted-foreground text-sm">No active coupons yet</p>
                <p className="text-muted-foreground text-xs mt-1">Activate coupons in the Store tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeCoupons.map((coupon, idx) => (
                  <motion.div
                    key={coupon.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => setSelectedCoupon(coupon)}
                    className="glass-card rounded-2xl p-4 cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{coupon.coupon_icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{coupon.coupon_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{coupon.coupon_description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-safe font-semibold">✅ Active</span>
                          <span className="text-[10px] text-muted-foreground">Tap to view QR</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Used Tab */}
        {activeTab === "used" && (
          <div>
            {usedCoupons.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-muted-foreground text-sm">No used coupons yet</p>
                <p className="text-muted-foreground text-xs mt-1">Use your active coupons at partner stores</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {usedCoupons.map((coupon, idx) => (
                  <motion.div
                    key={coupon.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="glass-card rounded-2xl p-4 opacity-60"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{coupon.coupon_icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{coupon.coupon_name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{coupon.coupon_description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Used
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {coupon.used_at ? new Date(coupon.used_at).toLocaleDateString() : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* QR Code Modal for Active Coupons */}
      <AnimatePresence>
        {selectedCoupon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedCoupon(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="glass-card-strong rounded-2xl p-6 w-full max-w-sm relative"
            >
              <button onClick={() => setSelectedCoupon(null)} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center hover:bg-muted/50 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="text-center mb-4">
                <span className="text-4xl">{selectedCoupon.coupon_icon}</span>
                <h3 className="font-display text-lg font-bold text-foreground mt-2">{selectedCoupon.coupon_name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{selectedCoupon.coupon_description}</p>
              </div>

              <div className="flex justify-center mb-4">
                <div className="bg-white rounded-xl p-4">
                  <QRCodeSVG
                    value={`smartshelf:coupon:${selectedCoupon.qr_code}:${selectedCoupon.coupon_id}`}
                    size={180}
                    level="H"
                  />
                </div>
              </div>

              <p className="text-center text-[10px] text-muted-foreground mb-1">
                Scan this QR code at a partner store
              </p>
              <p className="text-center text-[10px] text-muted-foreground/60 font-mono mb-4">
                {selectedCoupon.qr_code}
              </p>

              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleMarkUsed(selectedCoupon)}
                className="w-full py-3 rounded-xl bg-safe/20 text-safe font-bold text-sm hover:bg-safe/30 transition-colors"
              >
                ✅ Mark as Used
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default Store;
