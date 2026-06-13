import { motion } from "framer-motion";
import { Camera, Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const actions = [
  { icon: Camera, label: "Scan Receipt", color: "bg-primary/15 text-primary", path: "/scan" },
  { icon: Plus, label: "Add Manual", color: "bg-cream/15 text-cream", path: "/manual-entry" },
  { icon: ShoppingCart, label: "Shopping List", color: "bg-token/15 text-token", path: "/shopping-list" },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="px-5 mt-6 lg:px-0">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3">
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-2.5">
        {actions.map((action, idx) => (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + idx * 0.05 }}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => action.path && navigate(action.path)}
            className="glass-card rounded-2xl p-3 flex flex-col items-center gap-2 cursor-pointer"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.color}`}>
              <action.icon className="w-5 h-5" />
            </div>
            <span className="text-[10px] text-muted-foreground font-medium text-center leading-tight">
              {action.label}
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;
