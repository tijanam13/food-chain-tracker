import { useEffect } from 'react';
import { motion } from 'framer-motion';
import BottomNav from '@/components/BottomNav';
import PlanetProgress from '@/components/PlanetProgress';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useFamilyTokens } from '@/hooks/useFamilyData';
import DailyEcoTip from '@/components/DailyEcoTip';

const Planet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useFamilyTokens();
  const points = data?.points ?? 0;

  useEffect(() => {
    if (!user) navigate('/login');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-green-500/5 blur-[140px] pointer-events-none" />
      <div className="absolute top-60 right-0 w-[300px] h-[300px] rounded-full bg-green-400/4 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[250px] h-[250px] rounded-full bg-green-300/3 blur-[100px] pointer-events-none" />

      <div className="relative z-10 pb-28 px-5 lg:px-8 xl:px-16 2xl:px-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8 pb-6"
        >
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Your Planet</h1>
          <p className="text-sm text-muted-foreground">Track your planet's growth through points</p>
        </motion.div>

        <DailyEcoTip />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center min-h-[60vh] py-12"
        >
          {isLoading ? (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <PlanetProgress tokens={points} showLabel={true} className="mb-8" />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card-strong rounded-2xl p-8 max-w-md w-full text-center mt-8"
              >
                <div className="mb-6">
                  <p className="text-5xl font-bold text-primary mb-2">⭐ {points}</p>
                  <p className="text-sm text-muted-foreground">Total Points</p>
                </div>

                <div className="space-y-3 border-t border-border/50 pt-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Seedling (🌱)</span>
                    <span className="font-semibold">0-25 pts</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Sprouting (🌿)</span>
                    <span className="font-semibold">26-75 pts</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Growing (🌳)</span>
                    <span className="font-semibold">76-200 pts</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Blooming (🌸)</span>
                    <span className="font-semibold">201-500 pts</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Lush (🌺)</span>
                    <span className="font-semibold">501-999 pts</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Cosmic (✨)</span>
                    <span className="font-semibold">1000+ pts</span>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-6">
                  Points grow permanently with every donation and recipe used by your family.
                </p>
              </motion.div>
            </>
          )}
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Planet;
