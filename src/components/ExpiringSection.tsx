import { motion } from "framer-motion";
import { AlertTriangle, Clock } from "lucide-react";
import { useFridgeItems, getUrgency, getDaysLeft } from "@/hooks/useFridgeItems";
import { useAuth } from "@/contexts/AuthContext";

// Product-specific emoji mapping (reused from Fridge)
const productImages: Record<string, string> = {
  "apple": "🍎", "banana": "🍌", "orange": "🍊", "lemon": "🍋",
  "grape": "🍇", "strawberry": "🍓", "blueberry": "🫐", "cherry": "🍒",
  "peach": "🍑", "pear": "🍐", "watermelon": "🍉", "pineapple": "🍍",
  "mango": "🥭", "avocado": "🥑", "kiwi": "🥝",
  "cucumber": "🥒", "tomato": "🍅", "lettuce": "🥬", "carrot": "🥕",
  "corn": "🌽", "pepper": "🌶️", "paprika": "🫑", "broccoli": "🥦",
  "garlic": "🧄", "onion": "🧅", "potato": "🥔", "mushroom": "🍄",
  "eggplant": "🍆", "cabbage": "🥬", "spinach": "🥬", "zucchini": "🥒",
  "milk": "🥛", "cheese": "🧀", "butter": "🧈", "yogurt": "🥛",
  "cream": "🥛", "bread": "🍞", "white bread": "🍞", "croissant": "🥐",
  "rice": "🍚", "pasta": "🍝", "flour": "🌾",
  "chicken": "🍗", "beef": "🥩", "pork": "🥩", "steak": "🥩",
  "ham": "🥓", "bacon": "🥓", "sausage": "🌭", "meat": "🥩",
  "fish": "🐟", "salmon": "🍣", "tuna": "🐟", "shrimp": "🦐",
  "egg": "🥚", "eggs": "🥚",
  "juice": "🧃", "coffee": "☕", "tea": "🍵",
  "ice cream": "🍦", "chocolate": "🍫", "honey": "🍯",
};

const getProductEmoji = (name: string): string => {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(productImages)) {
    if (key.includes(k)) return v;
  }
  return "🍽️";
};

const urgencyStyles = {
  urgent: "border-urgent/30 glow-urgent",
  warning: "border-warning/20 glow-warning",
  safe: "border-safe/20",
};

const urgencyBadgeStyles = {
  urgent: "bg-urgent/15 text-urgent",
  warning: "bg-warning/15 text-warning",
  safe: "bg-safe/15 text-safe",
};

const ExpiringSection = () => {
  const { user } = useAuth();
  const { data: items = [], isLoading } = useFridgeItems();

  // Show items expiring within 5 days
  const expiringItems = items
    .filter((item) => {
      const days = getDaysLeft(item.expiry_date);
      return days <= 5 && days >= 0;
    });

  if (!user || (expiringItems.length === 0 && !isLoading)) {
    return null;
  }

  return (
    <div className="px-5 mt-6 lg:px-0">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-urgent" />
          <h3 className="font-display text-sm font-semibold text-foreground">
            Expiring Soon
          </h3>
        </div>
        <span className="text-[10px] text-muted-foreground">{expiringItems.length} items</span>
      </div>

      {isLoading ? (
        <div className="flex gap-3 justify-center">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card rounded-2xl p-4 min-w-[130px] h-[100px] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3 pt-2 pl-5 pr-5 scrollbar-hide">
          {expiringItems.map((item, idx) => {
            const urgency = getUrgency(item.expiry_date);
            const days = getDaysLeft(item.expiry_date);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.08 }}
                whileHover={{ scale: 1.07 }}
                className={`glass-card rounded-2xl p-4 min-w-[130px] flex-shrink-0 cursor-pointer border transition-all duration-200 ${urgencyStyles[urgency]}`}
              >
                <span className="text-3xl block mb-2">{getProductEmoji(item.name)}</span>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <div className="flex items-center gap-1 mt-1.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${urgencyBadgeStyles[urgency]}`}>
                    {days <= 0 ? "Today!" : days === 1 ? "1 day" : `${days} days`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ExpiringSection;
