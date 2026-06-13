import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const FALLBACK_TIPS = [
  "🌍 1 in 3 meals ends up in the trash worldwide — that's 1.3 billion tonnes wasted yearly. Your fridge can change that.",
  "💸 The average household throws away $1,500 of food every year. Use what you buy — save your plate and your wallet.",
  "🥦 Eat what you buy. Save what you earn. Protect what we share.",
  "🧠❄️ Your fridge has a memory problem. We fixed it. Food waste emits more CO₂ than aviation!",
  "🌱 If food waste were a country, it'd be the 3rd largest CO₂ emitter. Every item you save counts!",
  "🍎 An apple saved from the bin saves 70 liters of water it took to grow. Think before you toss!",
  "♻️ Composting food scraps cuts methane emissions by up to 50%. Small steps, big impact.",
  "🌊 It takes 1,000 liters of water to produce 1 liter of milk. Use every drop wisely.",
];

const getCacheKey = () => `eco-tip-${new Date().toISOString().split('T')[0]}`;

const DailyEcoTip = () => {
  const [tip, setTip] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTip = async (force = false) => {
    const cacheKey = getCacheKey();
    
    if (!force) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setTip(cached);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('eco-tip');
      
      if (error || !data?.tip) {
        throw new Error('Failed to fetch tip');
      }

      setTip(data.tip);
      localStorage.setItem(cacheKey, data.tip);
    } catch {
      // Use a random fallback
      const fallback = FALLBACK_TIPS[Math.floor(Math.random() * FALLBACK_TIPS.length)];
      setTip(fallback);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTip();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-5 mb-6 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      
      <div className="flex items-start gap-3 relative z-10">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5">
          <Leaf className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-primary/70 uppercase tracking-wider">Daily Eco Tip</p>
            <button 
              onClick={() => fetchTip(true)} 
              disabled={isLoading}
              className="text-muted-foreground hover:text-primary transition-colors p-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                <div className="h-3 bg-muted/50 rounded-full w-full animate-pulse" />
                <div className="h-3 bg-muted/50 rounded-full w-3/4 animate-pulse" />
              </motion.div>
            ) : (
              <motion.p
                key={tip}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-sm text-foreground/80 leading-relaxed"
              >
                {tip}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default DailyEcoTip;
