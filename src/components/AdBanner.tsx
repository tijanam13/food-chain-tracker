import { usePremium } from '@/contexts/PremiumContext';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useState } from 'react';

const ads = [
  { title: '🛒 Fresh Groceries Delivered!', desc: 'Get 20% off your first order at FreshMart', color: 'from-orange-500/20 to-yellow-500/20', border: 'border-orange-500/30' },
  { title: '🥗 Try HelloFresh Today!', desc: 'Meal kits starting at $3.99 per serving', color: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30' },
  { title: '🍕 50% Off Pizza Tonight!', desc: 'Use code SAVE50 at checkout', color: 'from-red-500/20 to-pink-500/20', border: 'border-red-500/30' },
  { title: '☕ Free Coffee With Any Order', desc: 'Visit your nearest CaféBrew location', color: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/30' },
];

interface AdBannerProps {
  variant?: 'inline' | 'banner';
  className?: string;
}

const AdBanner = ({ variant = 'inline', className = '' }: AdBannerProps) => {
  const { isPremium, loading } = usePremium();
  const [dismissed, setDismissed] = useState(false);
  const [adIndex] = useState(() => Math.floor(Math.random() * ads.length));

  if (loading || isPremium || dismissed) return null;

  const ad = ads[adIndex];

  if (variant === 'banner') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative mx-5 mb-3 rounded-xl border ${ad.border} bg-gradient-to-r ${ad.color} p-3 backdrop-blur-sm ${className}`}
      >
        <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Sponsored</p>
        <p className="text-sm font-semibold text-foreground">{ad.title}</p>
        <p className="text-xs text-muted-foreground">{ad.desc}</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative rounded-xl border ${ad.border} bg-gradient-to-r ${ad.color} p-3 backdrop-blur-sm ${className}`}
    >
      <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
        <X className="w-3.5 h-3.5" />
      </button>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Ad</p>
      <p className="text-sm font-semibold text-foreground">{ad.title}</p>
      <p className="text-xs text-muted-foreground">{ad.desc}</p>
    </motion.div>
  );
};

export default AdBanner;
