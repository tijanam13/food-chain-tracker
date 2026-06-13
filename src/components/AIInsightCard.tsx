import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ChevronRight, Clock, RefreshCw } from "lucide-react";

interface Recipe {
  title: string;
  sub?: string;
  ingredients?: string[];
  instructions?: string[];
  time: string;
  difficulty?: string;
  tokens: number;
}

interface AIInsightCardProps {
  onRecipeClick?: (recipe: Recipe) => void;
}

const recipes: Recipe[] = [
  {
    title: "🥞 Milk Pancakes",
    sub: "Use Milk + Eggs + Butter",
    ingredients: ["1 cup Milk", "2 Eggs", "1 tbsp Butter (melted)", "1 cup Flour", "1 tbsp Sugar", "Pinch of salt"],
    instructions: ["Mix flour, sugar, and salt.", "Whisk eggs and milk, combine with dry ingredients.", "Add melted butter, stir until smooth.", "Heat pan, pour 1/4 cup batter per pancake.", "Cook until bubbles form, flip and cook 1-2 min.", "Serve with syrup or fruit."],
    time: "15 min",
    difficulty: "Easy",
    tokens: 10,
  },
  {
    title: "🍳 Veggie Omelette",
    sub: "Use Eggs + Vegetables + Cheese",
    ingredients: ["3 Eggs", "1/2 cup mixed Vegetables", "30g Cheese", "1 tbsp Butter", "Salt & Pepper"],
    instructions: ["Beat eggs with salt and pepper.", "Sauté vegetables in butter.", "Pour eggs over vegetables.", "Cook until set, add cheese.", "Fold and serve hot."],
    time: "10 min",
    difficulty: "Easy",
    tokens: 8,
  },
  {
    title: "🥗 Quick Garden Salad",
    sub: "Use Lettuce + Tomato + Cucumber",
    ingredients: ["1 head Lettuce", "2 Tomatoes", "1 Cucumber", "Olive oil", "Lemon juice", "Salt"],
    instructions: ["Wash and chop all vegetables.", "Combine in a large bowl.", "Drizzle with olive oil and lemon.", "Season with salt.", "Toss and serve fresh."],
    time: "5 min",
    difficulty: "Easy",
    tokens: 5,
  },
  {
    title: "🍝 Creamy Pasta",
    sub: "Use Pasta + Cream + Garlic",
    ingredients: ["200g Pasta", "100ml Cream", "2 cloves Garlic", "30g Parmesan", "Salt & Pepper", "1 tbsp Butter"],
    instructions: ["Cook pasta al dente.", "Sauté minced garlic in butter.", "Add cream and simmer.", "Toss pasta with sauce.", "Top with Parmesan and pepper."],
    time: "20 min",
    difficulty: "Medium",
    tokens: 12,
  },
  {
    title: "🥪 Grilled Cheese Sandwich",
    sub: "Use Bread + Cheese + Butter",
    ingredients: ["2 slices Bread", "2 slices Cheese", "1 tbsp Butter"],
    instructions: ["Butter one side of each bread slice.", "Place cheese between bread, butter side out.", "Grill on medium heat until golden.", "Flip and cook other side.", "Slice and serve."],
    time: "8 min",
    difficulty: "Easy",
    tokens: 6,
  },
  {
    title: "🍲 Tomato Soup",
    sub: "Use Tomatoes + Onion + Garlic",
    ingredients: ["4 Tomatoes", "1 Onion", "2 cloves Garlic", "500ml Broth", "1 tbsp Olive oil", "Salt & Pepper"],
    instructions: ["Sauté diced onion and garlic.", "Add chopped tomatoes, cook 5 min.", "Pour in broth, simmer 15 min.", "Blend until smooth.", "Season and serve with bread."],
    time: "25 min",
    difficulty: "Easy",
    tokens: 10,
  },
];

const AIInsightCard = ({ onRecipeClick }: AIInsightCardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);

  const suggestedRecipe = recipes[currentIndex];

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSpinning(true);
    setTimeout(() => setIsSpinning(false), 500);
    setCurrentIndex((prev) => (prev + 1) % recipes.length);
  };

  return (
    <div className="px-5 mt-5 lg:px-0">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.01 }}
        onClick={() => onRecipeClick?.(suggestedRecipe)}
        className="relative glass-card-strong rounded-2xl p-5 overflow-hidden cursor-pointer"
      >
        <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

        <div className="flex items-start gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-primary font-semibold uppercase tracking-wider">AI Suggestion</p>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
              >
                <p className="text-sm font-medium text-foreground mt-1">
                  {suggestedRecipe.title}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {suggestedRecipe.sub}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {suggestedRecipe.time}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0 mt-1">
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={handleRefresh}
              className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-primary ${isSpinning ? 'animate-spin' : ''}`} />
            </motion.button>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AIInsightCard;
