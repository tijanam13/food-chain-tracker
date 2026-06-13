/**
 * src/components/BottomNav.tsx
 *
 * IZMENE:
 * - Admin tabs: dodat "Supply Chain" tab (/admin-supply-chain)
 * - Regular tabs: dodat "Proizvodi" tab (/products)
 */

import { Home, Refrigerator, Camera, Users, User, Globe, ShoppingCart, ShieldCheck, Package, Link } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAdmin } from "@/contexts/AdminContext";

const regularTabs = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Refrigerator, label: "Fridge", path: "/fridge" },
  { icon: ShoppingCart, label: "Shopping", path: "/shopping-list" },
  { icon: Camera, label: "Scan", path: "/scan" },
  { icon: Globe, label: "Planet", path: "/planet" },
  { icon: Package, label: "Products", path: "/products" },   // ← NOVO
  { icon: Users, label: "Family", path: "/family" },
  { icon: User, label: "Profile", path: "/profile" },
];

const adminTabs = [
  { icon: ShieldCheck, label: "Donations", path: "/admin-scan" },
  { icon: Link, label: "Supply Chain", path: "/admin-supply-chain" },  // ← NOVO
  { icon: User, label: "Profile", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();

  const tabs = isAdmin ? adminTabs : regularTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      <div className="w-full glass-card-strong border-t border-border/50 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;

            return (
              <motion.button
                key={tab.path}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(tab.path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors ${isActive ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                <tab.icon className={`w-5 h-5 ${isActive ? "text-primary" : ""}`} />
                <span className="text-[9px] font-medium">{tab.label}</span>
                {isActive && (
                  <motion.div layoutId="nav-indicator" className="w-1 h-1 rounded-full bg-primary" />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default BottomNav;
