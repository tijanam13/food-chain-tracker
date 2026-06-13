import { motion } from "framer-motion";
import { Award, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFamilyTokens, useFamilyStats } from "@/hooks/useFamilyData";

const RewardSection = () => {
  const navigate = useNavigate();
  const { data: tokenData } = useFamilyTokens();
  const { data: statsData } = useFamilyStats();

  const tokens = tokenData?.tokens ?? 0;
  const donationsCount = statsData?.donationsCount ?? 0;
  const usedRecipesCount = statsData?.usedRecipesCount ?? 0;
  const lessWaste = statsData?.lessWaste ?? "0g";

  const goal = 500;
  const progress = Math.min((tokens / goal) * 100, 100);

  return (
    <div className="px-5 mt-5 lg:px-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card rounded-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-token" />
            <h3 className="font-display text-sm font-semibold text-foreground">
              Rewards
            </h3>
          </div>
          <motion.button
            whileHover={{ x: 3 }}
            onClick={() => navigate('/store')}
            className="text-[11px] text-primary font-medium flex items-center gap-0.5"
          >
            Store <ArrowRight className="w-3 h-3" />
          </motion.button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-2xl font-bold font-display text-token">
            {tokens} 🪙
          </div>
          <div className="flex-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-token"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <div className="glass-card rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-lg font-bold font-display text-safe">{usedRecipesCount}</p>
            <p className="text-[9px] text-muted-foreground">Used Food</p>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-lg font-bold font-display text-primary">{donationsCount}</p>
            <p className="text-[9px] text-muted-foreground">Donated Food</p>
          </div>
          <div className="glass-card rounded-xl px-3 py-2 flex-1 text-center">
            <p className="text-lg font-bold font-display text-coral">{lessWaste}</p>
            <p className="text-[9px] text-muted-foreground">Less waste</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default RewardSection;
