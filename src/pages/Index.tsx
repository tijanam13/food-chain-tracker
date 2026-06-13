import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, X, ChevronLeft } from "lucide-react";
import Header from "@/components/Header";
import ExpiringSection from "@/components/ExpiringSection";
import QuickActions from "@/components/QuickActions";
import AIInsightCard from "@/components/AIInsightCard";
import RewardSection from "@/components/RewardSection";
import BottomNav from "@/components/BottomNav";
import AdBanner from "@/components/AdBanner";

interface Recipe {
  title: string;
  sub?: string;
  ingredients?: string[];
  instructions?: string[];
  time: string;
  difficulty?: string;
  tokens: number;
}

const Index = () => {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />
      <div className="absolute top-60 right-0 w-[300px] h-[300px] rounded-full bg-coral/4 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[250px] h-[250px] rounded-full bg-cream/3 blur-[100px] pointer-events-none" />

      <div className="relative z-10 pb-28">
        <Header />

        <AnimatePresence mode="wait">
          {selectedRecipe ? (
            <motion.div
              key="recipe-detail"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-5 lg:px-8 xl:px-16 2xl:px-24"
            >
              <button onClick={() => setSelectedRecipe(null)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <div className="glass-card-strong rounded-2xl p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-foreground">{selectedRecipe.title}</h2>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {selectedRecipe.time}
                      </span>
                      {selectedRecipe.difficulty && <span className="text-[11px] text-muted-foreground">· {selectedRecipe.difficulty}</span>}
                    </div>
                  </div>
                  <button onClick={() => setSelectedRecipe(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                  <div className="mb-5">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">🧾 Ingredients</h3>
                    <ul className="space-y-1.5">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                          <span className="text-primary mt-0.5">•</span>
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedRecipe.instructions && selectedRecipe.instructions.length > 0 && (
                  <div>
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">📋 Instructions</h3>
                    <ol className="space-y-3">
                      {selectedRecipe.instructions.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
                {(!selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0) && (!selectedRecipe.instructions || selectedRecipe.instructions.length === 0) && (
                  <p className="text-sm text-muted-foreground">{selectedRecipe.sub || "No detailed instructions available."}</p>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="main-content"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="lg:grid lg:grid-cols-2 lg:gap-6 lg:px-8 xl:px-16 2xl:px-24 lg:mt-4"
            >
              <div>
                <ExpiringSection />
                <div className="px-5 lg:px-0 mt-4">
                  <AdBanner variant="inline" />
                </div>
                <AIInsightCard onRecipeClick={setSelectedRecipe} />
              </div>
              <div>
                <QuickActions />
                <div className="px-5 lg:px-0 mt-4">
                  <AdBanner variant="inline" />
                </div>
                <RewardSection />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
