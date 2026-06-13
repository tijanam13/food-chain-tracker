import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Clock,
  Loader2,
  X,
  Trash2,
  Plus,
  Minus,
  Edit2,
  Check,
  Gift,
  Send,
  MessageCircle,
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import DonationModal from "@/components/DonationModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  useFridgeItems,
  getUrgency,
  getDaysLeft,
  getCategoryEmoji,
  formatQtyUnit,
  getConsumeStep,
} from "@/hooks/useFridgeItems";
import { useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface Recipe {
  title: string;
  sub?: string;
  ingredients?: string[];
  instructions?: string[];
  time: string;
  difficulty?: string;
  tokens: number;
  used?: boolean;
}

const defaultRecipes: Recipe[] = [
  {
    title: "🥞 Milk Pancakes",
    sub: "Use Milk + Eggs + Butter",
    ingredients: ["1 cup Milk", "2 Eggs", "1 tbsp Butter (melted)", "1 cup Flour", "1 tbsp Sugar", "Pinch of salt"],
    instructions: [
      "Mix flour, sugar, and salt.",
      "Whisk eggs and milk, combine with dry ingredients.",
      "Add melted butter, stir until smooth.",
      "Heat pan, pour 1/4 cup batter per pancake.",
      "Cook until bubbles form, flip and cook 1-2 min.",
      "Serve with syrup or fruit.",
    ],
    time: "15 min",
    difficulty: "Easy",
    tokens: 10,
  },
  {
    title: "🍲 Tomato Soup",
    sub: "Use Tomato + Carrot + Cabbage",
    ingredients: ["3 Tomatoes", "1 Carrot", "1/4 Cabbage", "1 Onion", "2 cloves Garlic", "2 cups Water"],
    instructions: [
      "Sauté onion and garlic.",
      "Add diced tomatoes, cook 5 min.",
      "Add carrot, cabbage, water.",
      "Simmer 15 min.",
      "Season and serve.",
    ],
    time: "25 min",
    difficulty: "Medium",
    tokens: 15,
  },
];

type Tab = "overview" | "list" | "recipes";

type Urgency = "safe" | "warning" | "urgent";

const urgencyColor: Record<Urgency, string> = { safe: "bg-safe", warning: "bg-warning", urgent: "bg-urgent" };
const urgencyText: Record<Urgency, string> = { safe: "text-safe", warning: "text-warning", urgent: "text-urgent" };
const urgencyBadge: Record<Urgency, string> = {
  safe: "bg-safe/15 text-safe",
  warning: "bg-warning/15 text-warning",
  urgent: "bg-urgent/15 text-urgent",
};
const urgencyGlow: Record<Urgency, string> = { safe: "", warning: "glow-warning", urgent: "glow-urgent" };
// Product images mapping - comprehensive food emoji map
const productImages: Record<string, string> = {
  // Fruits
  apple: "🍎",
  banana: "🍌",
  orange: "🍊",
  lemon: "🍋",
  lime: "🍋‍🟩",
  grape: "🍇",
  strawberry: "🍓",
  blueberry: "🫐",
  cherry: "🍒",
  peach: "🍑",
  pear: "🍐",
  watermelon: "🍉",
  melon: "🍈",
  pineapple: "🍍",
  mango: "🥭",
  coconut: "🥥",
  kiwi: "🥝",
  avocado: "🥑",
  plum: "🫐",
  fig: "🫐",
  // Vegetables
  cucumber: "🥒",
  tomato: "🍅",
  lettuce: "🥬",
  carrot: "🥕",
  corn: "🌽",
  pepper: "🌶️",
  paprika: "🫑",
  broccoli: "🥦",
  garlic: "🧄",
  onion: "🧅",
  potato: "🥔",
  "sweet potato": "🍠",
  mushroom: "🍄",
  eggplant: "🍆",
  cabbage: "🥬",
  spinach: "🥬",
  celery: "🥬",
  zucchini: "🥒",
  peas: "🫛",
  bean: "🫘",
  salad: "🥗",
  radish: "🥬",
  // Dairy
  milk: "🥛",
  cheese: "🧀",
  butter: "🧈",
  yogurt: "🥛",
  cream: "🥛",
  "sour cream": "🥛",
  kefir: "🥛",
  // Bakery & Grains
  bread: "🍞",
  "white bread": "🍞",
  toast: "🍞",
  bagel: "🥯",
  croissant: "🥐",
  pretzel: "🥨",
  pancake: "🥞",
  waffle: "🧇",
  rice: "🍚",
  pasta: "🍝",
  noodle: "🍜",
  flour: "🌾",
  cereal: "🥣",
  oat: "🌾",
  tortilla: "🫓",
  flatbread: "🫓",
  // Meat & Protein
  chicken: "🍗",
  beef: "🥩",
  pork: "🥩",
  steak: "🥩",
  ham: "🥓",
  bacon: "🥓",
  sausage: "🌭",
  turkey: "🍗",
  lamb: "🥩",
  meat: "🥩",
  salami: "🥩",
  prosciutto: "🥩",
  // Fish & Seafood
  fish: "🐟",
  salmon: "🍣",
  tuna: "🐟",
  shrimp: "🦐",
  crab: "🦀",
  lobster: "🦞",
  squid: "🦑",
  oyster: "🦪",
  // Eggs
  egg: "🥚",
  eggs: "🥚",
  // Beverages
  juice: "🧃",
  water: "💧",
  coffee: "☕",
  tea: "🍵",
  soda: "🥤",
  beer: "🍺",
  wine: "🍷",
  smoothie: "🥤",
  // Sweets & Snacks
  "ice cream": "🍦",
  chocolate: "🍫",
  cake: "🍰",
  cookie: "🍪",
  pie: "🥧",
  candy: "🍬",
  honey: "🍯",
  jam: "🍯",
  peanut: "🥜",
  nuts: "🥜",
  almond: "🥜",
  walnut: "🥜",
  popcorn: "🍿",
  chips: "🍿",
  // Condiments & Sauces
  ketchup: "🫙",
  mustard: "🫙",
  mayo: "🫙",
  sauce: "🫙",
  oil: "🫒",
  olive: "🫒",
  vinegar: "🫙",
  salt: "🧂",
  // Other
  soup: "🍲",
  stew: "🍲",
  pizza: "🍕",
  burger: "🍔",
  sandwich: "🥪",
  taco: "🌮",
  sushi: "🍣",
  dumpling: "🥟",
  tofu: "🧊",
  can: "🥫",
};

const getProductImage = (name: string): string => {
  const key = name.toLowerCase();
  for (const [k, v] of Object.entries(productImages)) {
    if (key.includes(k)) return v;
  }
  return "🍽️"; // default food icon
};

const FridgePage = () => {
  const [userWalletAddress, setUserWalletAddress] = useState("");
  const [fridgeOpen, setFridgeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [tooltip, setTooltip] = useState<{ name: string; detail: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<(typeof enrichedItems)[0] | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>(defaultRecipes);
  const [generatingRecipes, setGeneratingRecipes] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editLocation, setEditLocation] = useState("fridge");
  const [editExpiryDate, setEditExpiryDate] = useState<Date | undefined>();
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const [donationItem, setDonationItem] = useState<(typeof enrichedItems)[0] | null>(null);
  const [usedRecipeTitles, setUsedRecipeTitles] = useState<Set<string>>(new Set());
  const [usedRecipesFromDb, setUsedRecipesFromDb] = useState<Recipe[]>([]);
  const [fridgeExpanded, setFridgeExpanded] = useState(false);
  const [freezerExpanded, setFreezerExpanded] = useState(false);
  const [selectedExpiredItem, setSelectedExpiredItem] = useState<any | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: dbItems = [], isLoading } = useFridgeItems();

  // Load used recipes from DB
  useEffect(() => {
    if (!user) return;
    const loadUsedRecipes = async () => {
      const { data } = await supabase
        .from("used_recipes")
        .select("recipe_title, recipe_data, used_at")
        .eq("user_id", user.id)
        .order("used_at", { ascending: false });
      if (data) {
        setUsedRecipeTitles(new Set(data.map((r: any) => r.recipe_title)));
        const fullRecipes: Recipe[] = data.map((r: any) => {
          if (r.recipe_data && typeof r.recipe_data === "object") {
            return r.recipe_data as Recipe;
          }
          // Fallback for legacy rows without recipe_data: try to match by title in defaultRecipes
          const fromDefaults = defaultRecipes.find((dr) => dr.title === r.recipe_title);
          if (fromDefaults) return fromDefaults;
          return {
            title: r.recipe_title,
            sub: "Recipe details not saved (used before update). Use this recipe again to save full details.",
            time: "—",
            difficulty: "",
            tokens: 0,
            ingredients: [],
            instructions: [],
          } as Recipe;
        });
        setUsedRecipesFromDb(fullRecipes);
      }
    };
    loadUsedRecipes();
  }, [user]);

  // Realtime subscription for fridge_items
  useEffect(() => {
    const channel = supabase
      .channel("fridge-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fridge_items" }, () => {
        queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const allEnrichedItems = dbItems.map((item) => {
    const days = getDaysLeft(item.expiry_date);
    const urgency = getUrgency(item.expiry_date);
    const emoji = getProductImage(item.name);
    const freshness = Math.max(0, Math.min(100, Math.round((days / 30) * 100)));
    const daysLabel = item.expiry_date ? (days <= 0 ? "Today!" : `${days}d`) : "N/A";
    return { ...item, days, urgency, emoji, freshness, daysLabel };
  });

  // No merging needed — DB is deduplicated; each unique (name, status, expiry_date) has one row.

  // Expired items = expiry_date is yesterday or earlier (days < 0)
  const expiredItems = allEnrichedItems.filter((i) => i.expiry_date && i.days < 0 && !deletedIds.has(i.id));
  // Active items = not expired
  const enrichedItems = allEnrichedItems.filter((i) => (!i.expiry_date || i.days >= 0) && !deletedIds.has(i.id));

  const urgentItems = enrichedItems.filter((i) => i.urgency === "urgent");
  const warnItems = enrichedItems.filter((i) => i.urgency === "warning");
  const safeItems = enrichedItems.filter((i) => i.urgency === "safe");

  // Auto-move expired items to "expired" status in DB
  useEffect(() => {
    if (!user || expiredItems.length === 0) return;
    const moveToExpired = async () => {
      for (const item of expiredItems) {
        if (item.status !== "expired") {
          await supabase.from("fridge_items").update({ status: "expired" }).eq("id", item.id);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
    };
    moveToExpired();
  }, [dbItems, user]);

  // Fetch wallet address on mount and when modal closes (in case it was updated)
  const fetchWallet = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("wallet_address").eq("user_id", user.id).maybeSingle();
    setUserWalletAddress((data as any)?.wallet_address || "");
  };

  useEffect(() => {
    fetchWallet();
  }, [user]);

  const showTooltip = (item: (typeof enrichedItems)[0]) => {
    setSelectedItem(item);
  };

  const handleDelete = async (id: string, extraIds?: string[]) => {
    const allIds = extraIds ? [id, ...extraIds.filter((i) => i !== id)] : [id];
    // Optimistic: immediately hide all merged rows from UI
    setDeletedIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((i) => next.add(i));
      return next;
    });
    const { error } = await supabase.from("fridge_items").delete().in("id", allIds);
    if (error) {
      console.error("Delete error:", error);
      // Rollback optimistic update
      setDeletedIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      toast({ title: "Error", description: "Could not delete item: " + error.message, variant: "destructive" });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
    toast({ title: "Item removed" });
  };

  const handleQuantity = async (id: string, delta: number, current: number, unit: string) => {
    const newQty = +(current + delta * 1).toFixed(1);
    if (newQty <= 0) {
      await handleDelete(id);
      return;
    }
    const { error } = await supabase.from("fridge_items").update({ quantity: newQty }).eq("id", id);
    if (!error) queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
  };

  // Freezer shelf life in days by category (USDA FoodKeeper)
  const freezerDaysByCategory: Record<string, number> = {
    Meat: 365,
    Poultry: 270,
    Fish: 180,
    Seafood: 180,
    Dairy: 90,
    Bakery: 90,
    Fruit: 365,
    Vegetable: 365,
    Eggs: 365,
    Beverage: 180,
    Pantry: 365,
    Other: 90,
  };

  const getFreezerDays = (category: string): number => {
    return freezerDaysByCategory[category] ?? 120;
  };

  const handleUpdateItem = async () => {
    if (!selectedItem) return;

    const prevStatus = selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status;
    const locationChanged = prevStatus !== editLocation;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // --- Compute expiry and remaining days for the destination location ---
    let newExpiryDate = editExpiryDate ? format(editExpiryDate, "yyyy-MM-dd") : null;
    let newRemainingFridgeDays: number | null = selectedItem.remaining_fridge_days ?? null;

    // Fridge → Freezer: save remaining fridge days, set new expiry based on freezer shelf life
    if (prevStatus === "fridge" && editLocation === "freezer") {
      if (editExpiryDate) {
        // Compare dates as local date strings to avoid timezone offset issues
        const expiryDateOnly = new Date(format(editExpiryDate, "yyyy-MM-dd") + "T00:00:00");
        const msLeft = expiryDateOnly.getTime() - today.getTime();
        newRemainingFridgeDays = Math.max(1, Math.round(msLeft / (1000 * 60 * 60 * 24)));
      } else {
        newRemainingFridgeDays = 1;
      }
      const freezerDate = new Date(today);
      freezerDate.setDate(today.getDate() + getFreezerDays(selectedItem.category));
      newExpiryDate = format(freezerDate, "yyyy-MM-dd");
    }

    // Freezer → Fridge: restore saved remaining fridge days from today, clear remaining_fridge_days
    if (prevStatus === "freezer" && editLocation === "fridge") {
      const daysBack = selectedItem.remaining_fridge_days ?? 1;
      const fridgeDate = new Date(today);
      fridgeDate.setDate(today.getDate() + daysBack);
      newExpiryDate = format(fridgeDate, "yyyy-MM-dd");
      newRemainingFridgeDays = null;
    }

    const isPartial = locationChanged && editQuantity < selectedItem.quantity;

    if (isPartial) {
      // --- PARTIAL TRANSFER ---
      // Reduce source quantity in place (DB is deduplicated — one row per item).
      const remainingQty = +(selectedItem.quantity - editQuantity).toFixed(1);
      const { error: reduceError } = await supabase
        .from("fridge_items")
        .update({ quantity: remainingQty })
        .eq("id", selectedItem.id);

      if (reduceError) {
        toast({ title: "Error", description: reduceError.message, variant: "destructive" });
        return;
      }

      // Check if destination already has this item; merge if so, otherwise insert.
      const { data: destRow } = await supabase
        .from("fridge_items")
        .select("id, quantity")
        .eq("user_id", selectedItem.user_id)
        .eq("name", selectedItem.name)
        .eq("status", editLocation)
        .eq("expiry_date", newExpiryDate ?? "")
        .maybeSingle();

      if (destRow) {
        const mergedQty = +(destRow.quantity + editQuantity).toFixed(1);
        const { error: mergeError } = await supabase
          .from("fridge_items")
          .update({ quantity: mergedQty })
          .eq("id", destRow.id);
        if (mergeError) {
          toast({ title: "Error", description: mergeError.message, variant: "destructive" });
          return;
        }
      } else {
        const { error: insertError } = await supabase.from("fridge_items").insert({
          user_id: selectedItem.user_id,
          name: selectedItem.name,
          category: selectedItem.category,
          unit: selectedItem.unit,
          gtin_code: selectedItem.gtin_code,
          quantity: editQuantity,
          status: editLocation,
          expiry_date: newExpiryDate,
          remaining_fridge_days: newRemainingFridgeDays,
        });
        if (insertError) {
          toast({ title: "Error", description: insertError.message, variant: "destructive" });
          return;
        }
      }
    } else {
      // --- FULL UPDATE (same location or full quantity transfer) ---
      if (locationChanged) {
        // Moving full quantity: check destination for existing row to avoid new duplicates.
        const { data: destRow } = await supabase
          .from("fridge_items")
          .select("id, quantity")
          .eq("user_id", selectedItem.user_id)
          .eq("name", selectedItem.name)
          .eq("status", editLocation)
          .eq("expiry_date", newExpiryDate ?? "")
          .maybeSingle();

        if (destRow) {
          // Merge into existing destination row, then delete the source row.
          const mergedQty = +(destRow.quantity + editQuantity).toFixed(1);
          const { error: mergeError } = await supabase
            .from("fridge_items")
            .update({ quantity: mergedQty })
            .eq("id", destRow.id);
          if (mergeError) {
            toast({ title: "Error", description: mergeError.message, variant: "destructive" });
            return;
          }
          const { error: delError } = await supabase.from("fridge_items").delete().eq("id", selectedItem.id);
          if (delError) {
            toast({ title: "Error", description: delError.message, variant: "destructive" });
            return;
          }
        } else {
          // No duplicate at destination — just update in place.
          const { error } = await supabase
            .from("fridge_items")
            .update({
              status: editLocation,
              expiry_date: newExpiryDate,
              quantity: editQuantity,
              remaining_fridge_days: newRemainingFridgeDays,
            })
            .eq("id", selectedItem.id);
          if (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
            return;
          }
        }
      } else {
        // Same location — simple update.
        const { error } = await supabase
          .from("fridge_items")
          .update({
            expiry_date: newExpiryDate,
            quantity: editQuantity,
          })
          .eq("id", selectedItem.id);
        if (error) {
          toast({ title: "Error", description: error.message, variant: "destructive" });
          return;
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
    toast({
      title: "Updated!",
      description: isPartial
        ? `${editQuantity} ${selectedItem.unit} moved to ${editLocation === "freezer" ? "freezer" : "fridge"}. Remaining stays in place.`
        : "Item updated successfully.",
    });
    setEditingItem(null);
    setSelectedItem(null);
  };

  const handleUseRecipe = async (recipe: Recipe) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }

    if (usedRecipeTitles.has(recipe.title)) {
      toast({ title: "Already used", description: "You already used this recipe.", variant: "destructive" });
      return;
    }

    try {
      // Record used recipe (no tokens awarded)
      const { error: recipeError } = await supabase
        .from("used_recipes")
        .insert({ user_id: user.id, recipe_title: recipe.title, tokens_earned: 0, recipe_data: recipe as any });

      if (recipeError) throw recipeError;

      // Reduce fridge item quantities based on recipe ingredients
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        const usedItemIds = new Set<string>();
        for (const ingredient of recipe.ingredients) {
          const qtyMatch = ingredient.match(/^(\d+\.?\d*)\s*/);
          const ingQty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
          const ingName = ingredient
            .toLowerCase()
            .replace(/^\d+\.?\d*\s*/, "")
            .replace(/^(g|kg|ml|l|pcs|cups?|tbsp|tsp|pieces?|slices?|cloves?)\s+/i, "")
            .replace(/^of\s+/i, "")
            .trim();

          const matchingItem = enrichedItems.find((item) => {
            if (usedItemIds.has(item.id)) return false;
            const itemName = item.name.toLowerCase();
            const lastWord = ingName.split(/\s+/).pop() || "";
            if (itemName === ingName) return true;
            if (itemName.includes(ingName) || ingName.includes(itemName)) return true;
            if (
              lastWord.length > 2 &&
              (itemName.includes(lastWord) ||
                lastWord.includes(itemName.replace(/s$/, "")) ||
                itemName.replace(/s$/, "") === lastWord.replace(/s$/, ""))
            )
              return true;
            return false;
          });

          if (matchingItem) {
            usedItemIds.add(matchingItem.id);
            const newQty = Math.max(0, matchingItem.quantity - ingQty);
            if (newQty <= 0) {
              await supabase.from("fridge_items").delete().eq("id", matchingItem.id);
            } else {
              await supabase.from("fridge_items").update({ quantity: newQty }).eq("id", matchingItem.id);
            }
          }
        }
      }

      setUsedRecipeTitles((prev) => new Set([...prev, recipe.title]));
      setUsedRecipesFromDb((prev) => (prev.some((r) => r.title === recipe.title) ? prev : [recipe, ...prev]));

      toast({
        title: "Recipe Used! 🎉",
        description: "Ingredients have been deducted from your fridge.",
      });

      queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
      setSelectedRecipe(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to use recipe",
        variant: "destructive",
      });
    }
  };

  const handleGenerateRecipes = async () => {
    setGeneratingRecipes(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-recipes", {
        body: { fridgeItems: enrichedItems.map((i) => ({ name: i.name, days: i.days, frozen: false })) },
      });
      if (error) throw error;
      if (data?.recipes?.length > 0) {
        const formatted: Recipe[] = data.recipes.map((r: any) => ({
          title: r.title || "Untitled Recipe",
          ingredients: r.ingredients || [],
          instructions: r.instructions || [],
          time: r.time || "? min",
          difficulty: r.difficulty || "Medium",
          tokens: r.tokens || 10,
        }));
        setRecipes((prev) => [...prev, ...formatted]);
        toast({ title: "Recipes Generated!", description: `${formatted.length} new recipes added.` });
      } else {
        toast({ title: "No recipes", description: "AI couldn't generate recipes.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to generate recipes.", variant: "destructive" });
    } finally {
      setGeneratingRecipes(false);
    }
  };
  const handleSendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const newMessages = [...chatMessages, { role: "user" as const, content: userMsg }];
    setChatMessages(newMessages);
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("recipe-chat", {
        body: {
          recipe: selectedRecipe,
          userMessage: userMsg,
          fridgeItems: dbItems.map((i) => ({ name: i.name, category: i.category })),
          chatHistory: chatMessages,
        },
      });
      if (error) throw error;
      setChatMessages([...newMessages, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Chat failed", variant: "destructive" });
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Reset chat when recipe changes
  useEffect(() => {
    setChatMessages([]);
    setShowChat(false);
    setChatInput("");
  }, [selectedRecipe?.title]);

  const fridgeDisplayItems = enrichedItems.filter((i) => i.status === "fridge" || i.status === "in_fridge");
  const freezerDisplayItems = enrichedItems.filter((i) => i.status === "freezer");
  const maxFridgeVisible = 9;
  const maxFreezerVisible = 5;
  const visibleFridgeItems = fridgeExpanded ? fridgeDisplayItems : fridgeDisplayItems.slice(0, maxFridgeVisible);
  const visibleFreezerItems = freezerExpanded ? freezerDisplayItems : freezerDisplayItems.slice(0, maxFreezerVisible);
  const hasMoreFridge = fridgeDisplayItems.length > maxFridgeVisible;
  const hasMoreFreezer = freezerDisplayItems.length > maxFreezerVisible;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 pb-24 pt-10 px-4 lg:px-8 xl:px-16">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <h1 className="font-display text-2xl font-bold text-foreground">My Fridge</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isLoading ? "Loading..." : `${enrichedItems.length} items tracked`}
          </p>
        </motion.div>

        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
          {/* === FRIDGE 3D === */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="flex-shrink-0 w-[280px] sm:w-[320px]"
          >
            <div className="relative mx-auto" style={{ perspective: "1200px" }}>
              <div
                className="w-[280px] sm:w-[320px] rounded-2xl border border-mint/20 overflow-hidden cursor-pointer select-none"
                style={{ boxShadow: "inset -4px 0 8px rgba(0,0,0,0.15), 2px 4px 24px rgba(0,0,0,0.35)" }}
                onClick={() => setFridgeOpen(!fridgeOpen)}
              >
                {/* Freezer */}
                <div
                  className={`relative overflow-hidden transition-all duration-500 ${freezerExpanded ? "min-h-[200px]" : "h-[180px] sm:h-[200px]"}`}
                  style={{
                    background: "linear-gradient(160deg, hsl(155 25% 28%) 0%, hsl(155 30% 20%) 100%)",
                    borderBottom: "2px solid hsl(155 20% 30%)",
                  }}
                >
                  <div className="text-[10px] text-muted-foreground px-3 pt-2 tracking-wider font-medium">
                    ❄️ FREEZER
                  </div>

                  {/* Freezer items */}
                  <div className="absolute inset-0 p-2 pt-6 z-[5] overflow-y-auto">
                    <div className="flex flex-wrap gap-2 items-end">
                      {visibleFreezerItems.map((item) => (
                        <motion.div
                          key={item.id}
                          whileHover={{ y: -2, scale: 1.1 }}
                          className="flex flex-col items-center cursor-pointer"
                          style={{ width: "48px" }}
                          onClick={(e) => {
                            e.stopPropagation();
                            showTooltip(item);
                          }}
                        >
                          <div className="w-12 h-12 flex items-center justify-center text-3xl bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                            {getProductImage(item.name)}
                          </div>
                          <span className={`text-[9px] font-bold ${urgencyText[item.urgency]} mt-1`}>
                            {item.daysLabel}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                    {hasMoreFreezer && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFreezerExpanded(!freezerExpanded);
                        }}
                        className="mt-2 w-full text-[10px] text-center py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-muted-foreground font-medium z-[25] relative"
                      >
                        {freezerExpanded
                          ? "▲ Show less"
                          : `▼ +${freezerDisplayItems.length - maxFreezerVisible} more items`}
                      </motion.button>
                    )}
                  </div>

                  {/* Door overlay */}
                  <div
                    className="absolute inset-0 z-[20] transition-transform duration-700 ease-[cubic-bezier(.25,.46,.45,.94)] rounded-r-2xl cursor-pointer"
                    style={{
                      background: "linear-gradient(160deg, hsl(155 18% 26%) 0%, hsl(155 22% 18%) 100%)",
                      transformOrigin: "left center",
                      transform: fridgeOpen
                        ? "perspective(1200px) rotateY(90deg)"
                        : "perspective(1200px) rotateY(0deg)",
                      borderLeft: "1.5px solid hsl(155 20% 30%)",
                    }}
                    onClick={() => setFridgeOpen(false)}
                  >
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-[5px] h-10 rounded-sm"
                      style={{ background: "hsl(155 15% 40%)" }}
                    />
                    <div className="absolute left-3 top-2 text-sm">❄</div>
                  </div>
                  <div
                    className="absolute inset-x-0 top-0 h-5 z-[1] transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg, rgba(180,255,200,0.4) 0%, transparent 100%)",
                      opacity: fridgeOpen ? 1 : 0,
                    }}
                  />
                </div>

                {/* Main compartment */}
                <div
                  className={`relative overflow-hidden transition-all duration-500 ${fridgeExpanded ? "min-h-[320px]" : "h-[280px] sm:h-[320px]"}`}
                  style={{ background: "linear-gradient(160deg, hsl(155 22% 24%) 0%, hsl(155 26% 17%) 100%)" }}
                >
                  {/* Shelves with items */}
                  <div className="absolute inset-0 p-2 flex flex-col gap-1 z-[5] overflow-y-auto">
                    {(() => {
                      const itemsPerShelf = 3;
                      const shelves: (typeof visibleFridgeItems)[] = [];
                      for (let i = 0; i < visibleFridgeItems.length; i += itemsPerShelf) {
                        shelves.push(visibleFridgeItems.slice(i, i + itemsPerShelf));
                      }
                      if (shelves.length === 0) shelves.push([]);
                      return shelves.map((shelf, si) => (
                        <div
                          key={si}
                          className="flex gap-2 items-end px-1 py-1 rounded-sm"
                          style={{
                            background: "rgba(120,190,160,0.12)",
                            borderBottom: "1.5px solid rgba(120,190,160,0.3)",
                            minHeight: "70px",
                          }}
                        >
                          {shelf.map((item) => (
                            <motion.div
                              key={item.id}
                              whileHover={{ y: -3, scale: 1.1 }}
                              className="flex flex-col items-center cursor-pointer flex-1 justify-end"
                              onClick={(e) => {
                                e.stopPropagation();
                                showTooltip(item);
                              }}
                            >
                              <div className="w-12 h-12 flex items-center justify-center text-3xl bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
                                {getProductImage(item.name)}
                              </div>
                              <span
                                className={`text-[8px] font-bold ${urgencyText[item.urgency]} ${item.urgency === "urgent" ? "animate-pulse" : ""} mt-1`}
                              >
                                {item.daysLabel}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      ));
                    })()}
                    {hasMoreFridge && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFridgeExpanded(!fridgeExpanded);
                        }}
                        className="mt-1 w-full text-[10px] text-center py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-muted-foreground font-medium z-[25] relative"
                      >
                        {fridgeExpanded
                          ? "▲ Show less"
                          : `▼ +${fridgeDisplayItems.length - maxFridgeVisible} more items`}
                      </motion.button>
                    )}
                  </div>

                  {/* Door overlay */}
                  <div
                    className="absolute inset-0 z-[20] transition-transform duration-700 ease-[cubic-bezier(.25,.46,.45,.94)] cursor-pointer"
                    style={{
                      background: "linear-gradient(160deg, hsl(155 18% 23%) 0%, hsl(155 22% 16%) 100%)",
                      transformOrigin: "left center",
                      transform: fridgeOpen
                        ? "perspective(1200px) rotateY(90deg)"
                        : "perspective(1200px) rotateY(0deg)",
                      borderLeft: "1.5px solid hsl(155 20% 30%)",
                    }}
                    onClick={() => setFridgeOpen(false)}
                  >
                    <div
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-[5px] h-10 rounded-sm"
                      style={{ background: "hsl(155 15% 40%)" }}
                    />
                    <div className="absolute left-3 top-3 text-[11px] font-medium tracking-wider text-muted-foreground font-display">
                      EatSmart
                    </div>
                  </div>
                  <div
                    className="absolute inset-x-0 top-0 h-5 z-[1] transition-opacity duration-300 pointer-events-none"
                    style={{
                      background: "linear-gradient(180deg, rgba(180,255,200,0.4) 0%, transparent 100%)",
                      opacity: fridgeOpen ? 1 : 0,
                    }}
                  />
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setFridgeOpen(!fridgeOpen)}
                className="mt-3 w-full py-2.5 glass-card rounded-xl text-xs font-medium text-foreground"
              >
                🚪 {fridgeOpen ? "Close" : "Open"} Fridge
              </motion.button>

              {/* Trash Can - Expired Items */}
              {expiredItems.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 w-full">
                  <div
                    className="rounded-2xl border border-urgent/20 overflow-hidden"
                    style={{ background: "linear-gradient(160deg, hsl(0 15% 18%) 0%, hsl(0 12% 14%) 100%)" }}
                  >
                    <div className="px-4 py-2.5 flex items-center justify-between border-b border-urgent/15">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🗑️</span>
                        <span className="text-xs font-semibold text-urgent">Expired Items</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{expiredItems.length} items</span>
                    </div>
                    <div className="p-3 flex flex-wrap gap-2 max-h-[200px] overflow-y-auto">
                      {expiredItems.map((item) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center opacity-60 cursor-pointer"
                          style={{ width: "52px" }}
                          onClick={() => setSelectedExpiredItem(item)}
                        >
                          <div className="w-10 h-10 flex items-center justify-center text-2xl bg-urgent/10 rounded-lg border border-urgent/20">
                            {getProductImage(item.name)}
                          </div>
                          <span className="text-[8px] text-urgent font-medium mt-1 text-center truncate w-full">
                            {item.name}
                          </span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="px-3 pb-3">
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={async () => {
                          const count = expiredItems.length;
                          const ids = expiredItems.map((item) => item.id);
                          // Optimistic: immediately hide all expired items
                          setDeletedIds((prev) => new Set([...prev, ...ids]));
                          setSelectedExpiredItem(null);
                          const { error } = await supabase.from("fridge_items").delete().in("id", ids);
                          if (error) {
                            console.error("Empty trash error:", error);
                            // Rollback
                            setDeletedIds((prev) => {
                              const s = new Set(prev);
                              ids.forEach((id) => s.delete(id));
                              return s;
                            });
                            toast({
                              title: "Error",
                              description: "Could not empty trash: " + error.message,
                              variant: "destructive",
                            });
                            return;
                          }
                          await queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
                          toast({
                            title: "Trash emptied",
                            description: `${count} expired items removed.`,
                          });
                        }}
                        className="w-full py-2 rounded-lg bg-urgent/15 text-urgent text-[11px] font-semibold hover:bg-urgent/25 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Empty Trash
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Expired Item Detail Popup moved to top level */}

              <AnimatePresence>
                {selectedItem && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => {
                        setSelectedItem(null);
                        setEditingItem(null);
                      }}
                      className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-md"
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 60 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8, y: 60 }}
                      transition={{ type: "spring", damping: 20, stiffness: 300 }}
                      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
                    >
                      <div className="w-full max-w-[500px] glass-card-strong rounded-3xl p-7 shadow-2xl pointer-events-auto overflow-y-auto max-h-[85vh]">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl">{selectedItem.emoji}</span>
                            <div>
                              <p className="text-lg font-bold text-foreground">{selectedItem.name}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">{selectedItem.category}</p>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={() => {
                              setSelectedItem(null);
                              setEditingItem(null);
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          >
                            <X className="w-6 h-6" />
                          </motion.button>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between py-3 px-3 rounded-lg bg-background/30 border border-border/30">
                            <span className="text-sm text-muted-foreground">Amount</span>
                            <span className="text-sm font-semibold text-foreground">
                              {formatQtyUnit(selectedItem.quantity, selectedItem.unit || "pcs")}
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 rounded-lg bg-background/30 border border-border/30">
                            <span className="text-sm text-muted-foreground">Location</span>
                            <span className="text-sm font-semibold text-foreground">
                              {selectedItem.status === "freezer" ? "❄️ Freezer" : "🧊 Fridge"}
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 rounded-lg bg-background/30 border border-border/30">
                            <span className="text-sm text-muted-foreground">Expires</span>
                            <span className={`text-sm font-semibold ${urgencyText[selectedItem.urgency]}`}>
                              {selectedItem.expiry_date || "N/A"} ({selectedItem.daysLabel})
                            </span>
                          </div>
                          <div className="flex justify-between py-3 px-3 rounded-lg bg-background/30 border border-border/30">
                            <span className="text-sm text-muted-foreground">Freshness</span>
                            <span className="text-sm font-semibold text-foreground">{selectedItem.freshness}%</span>
                          </div>
                          <div className="pt-2 px-1">
                            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${urgencyColor[selectedItem.urgency]}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${selectedItem.freshness}%` }}
                                transition={{ duration: 0.6 }}
                              />
                            </div>
                          </div>
                        </div>

                        {editingItem === selectedItem.id ? (
                          <div className="space-y-4 mt-5 pt-4 border-t border-primary/10">
                            <h3 className="text-base font-bold text-foreground">Edit Item</h3>

                            <div className="space-y-2">
                              <label className="text-sm text-muted-foreground font-semibold">📍 Storage Location</label>
                              <Select
                                value={editLocation}
                                onValueChange={(val) => {
                                  setEditLocation(val);
                                  const currentStatus =
                                    selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status;
                                  // Switching to transfer mode — clamp quantity to current max
                                  if (val !== currentStatus) {
                                    setEditQuantity((q) => Math.min(q, selectedItem.quantity));
                                  }
                                }}
                              >
                                <SelectTrigger className="h-10 text-sm bg-background/50 border-border/50 rounded-lg">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="fridge">🧊 Fridge</SelectItem>
                                  <SelectItem value="freezer">❄️ Freezer</SelectItem>
                                </SelectContent>
                              </Select>
                              {/* Info messages about automatic expiry recalculation */}
                              {(selectedItem.status === "fridge" || selectedItem.status === "in_fridge") &&
                                editLocation === "freezer" && (
                                  <p className="text-[11px] text-blue-400/80 bg-blue-500/8 px-2.5 py-1.5 rounded-lg">
                                    ❄️ Expiry date will be set automatically based on freezer shelf life. Remaining
                                    fridge days are saved.
                                  </p>
                                )}
                              {selectedItem.status === "freezer" && editLocation === "fridge" && (
                                <p className="text-[11px] text-mint/80 bg-mint/8 px-2.5 py-1.5 rounded-lg">
                                  🧊 Expiry will be restored to{" "}
                                  <span className="font-semibold">
                                    {selectedItem.remaining_fridge_days ?? 1} day(s)
                                  </span>{" "}
                                  from today.
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <label className="text-sm text-muted-foreground font-semibold">📦 Quantity</label>
                              <div className="flex items-center gap-3">
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const step = 1;
                                    const isTransfer =
                                      editLocation !==
                                      (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status);
                                    setEditQuantity((q) => +Math.max(q - step, step).toFixed(1));
                                  }}
                                  className="w-10 h-10 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-4 h-4 text-foreground" />
                                </motion.button>
                                <input
                                  type="number"
                                  min={1}
                                  max={
                                    editLocation !==
                                    (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status)
                                      ? selectedItem.quantity
                                      : 99999
                                  }
                                  step={1}
                                  value={editQuantity}
                                  onChange={(e) => {
                                    const step = 1;
                                    const isTransfer =
                                      editLocation !==
                                      (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status);
                                    const maxQty = isTransfer ? selectedItem.quantity : 99999;
                                    const v = parseFloat(e.target.value);
                                    setEditQuantity(isNaN(v) || v < step ? step : +Math.min(v, maxQty).toFixed(1));
                                  }}
                                  className="w-20 text-center text-lg font-bold text-foreground bg-background/50 border border-border/50 rounded-lg h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <span className="text-sm text-muted-foreground">{selectedItem.unit}</span>
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const step = 1;
                                    const isTransfer =
                                      editLocation !==
                                      (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status);
                                    const maxQty = isTransfer ? selectedItem.quantity : 99999;
                                    setEditQuantity((q) => +Math.min(q + step, maxQty).toFixed(1));
                                  }}
                                  className="w-10 h-10 rounded-lg bg-muted/40 hover:bg-muted/60 flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-4 h-4 text-foreground" />
                                </motion.button>
                              </div>
                              {/* Partial transfer hint */}
                              {editLocation !==
                                (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status) &&
                                editQuantity < selectedItem.quantity && (
                                  <p className="text-[11px] text-warning/80 bg-warning/8 px-2.5 py-1.5 rounded-lg">
                                    ⚠️ Only {editQuantity} {selectedItem.unit} will be moved. The remaining{" "}
                                    {+(selectedItem.quantity - editQuantity).toFixed(1)} {selectedItem.unit} will stay
                                    in the {selectedItem.status === "freezer" ? "freezer" : "fridge"}.
                                  </p>
                                )}
                            </div>

                            <div className="space-y-2">
                              <label
                                className={`text-sm font-semibold ${
                                  editLocation !==
                                  (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status)
                                    ? "text-muted-foreground/40"
                                    : "text-muted-foreground"
                                }`}
                              >
                                📅 Expiry Date
                                {editLocation !==
                                  (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status) && " (auto)"}
                              </label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    disabled={
                                      editLocation !==
                                      (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status)
                                    }
                                    className={cn(
                                      "w-full justify-start text-left text-sm font-normal bg-background/50 border-border/50 rounded-lg h-10 px-3",
                                      !editExpiryDate && "text-muted-foreground",
                                      editLocation !==
                                        (selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status) &&
                                        "opacity-40 cursor-not-allowed",
                                    )}
                                  >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {editExpiryDate ? format(editExpiryDate, "MMM d, yyyy") : "Pick a date"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editExpiryDate}
                                    onSelect={setEditExpiryDate}
                                    initialFocus
                                    className="p-2 pointer-events-auto"
                                    disabled={(date) => date < new Date()}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={handleUpdateItem}
                                className="flex-1 py-2.5 rounded-lg bg-primary/15 text-primary text-sm font-bold hover:bg-primary/25 transition-colors flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" /> Save
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  setEditingItem(null);
                                  setEditLocation(selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status);
                                  setEditExpiryDate(
                                    selectedItem.expiry_date ? new Date(selectedItem.expiry_date) : undefined,
                                  );
                                  setEditQuantity(selectedItem.quantity);
                                }}
                                className="flex-1 py-2.5 rounded-lg bg-muted/30 text-muted-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
                              >
                                Cancel
                              </motion.button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-3 mt-6 pt-4 border-t border-border/30 flex-wrap">
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setEditingItem(selectedItem.id);
                                setEditLocation(selectedItem.status === "in_fridge" ? "fridge" : selectedItem.status);
                                setEditExpiryDate(
                                  selectedItem.expiry_date ? new Date(selectedItem.expiry_date) : undefined,
                                );
                                setEditQuantity(selectedItem.quantity);
                              }}
                              className="flex-1 min-w-[100px] py-3 rounded-lg bg-primary/20 text-primary text-sm font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" /> Edit
                            </motion.button>
                            {selectedItem.days >= 0 ? (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setShowDonationModal(true)}
                                className={`flex-1 min-w-[100px] py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-colors ${
                                  selectedItem.days <= 5
                                    ? "bg-warning/30 text-warning hover:bg-warning/40"
                                    : "bg-safe/20 text-safe hover:bg-safe/30"
                                }`}
                              >
                                <Gift className="w-4 h-4" /> Donate
                              </motion.button>
                            ) : (
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => {
                                  handleDelete(selectedItem.id);
                                  setSelectedItem(null);
                                }}
                                className="flex-1 min-w-[100px] py-3 rounded-lg bg-muted/30 text-muted-foreground text-sm font-bold hover:bg-muted/50 transition-colors flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-4 h-4" /> Expired
                              </motion.button>
                            )}
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                handleDelete(selectedItem.id);
                                setSelectedItem(null);
                              }}
                              className="flex-1 min-w-[100px] py-3 rounded-lg bg-urgent/20 text-urgent text-sm font-bold hover:bg-urgent/30 transition-colors flex items-center justify-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" /> Remove
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* === PANEL === */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-lg min-w-0"
          >
            <div className="flex gap-2 mb-5 justify-center lg:justify-start">
              {(["overview", "list", "recipes"] as Tab[]).map((tab) => (
                <motion.button
                  key={tab}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setActiveTab(tab);
                    setSelectedRecipe(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${activeTab === tab ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground"}`}
                >
                  {tab}
                </motion.button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* Overview */}
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="glass-card rounded-xl p-3 text-center">
                      <div className="text-xl font-semibold text-urgent">{urgentItems.length}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Urgent</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 text-center">
                      <div className="text-xl font-semibold text-warning">{warnItems.length}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">Warning</div>
                    </div>
                    <div className="glass-card rounded-xl p-3 text-center">
                      <div className="text-xl font-semibold text-safe">{safeItems.length}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">OK</div>
                    </div>
                  </div>

                  {enrichedItems.length === 0 && !isLoading && (
                    <div className="glass-card rounded-xl p-6 text-center">
                      <p className="text-sm text-muted-foreground">No items in your fridge yet.</p>
                      <p className="text-[11px] text-muted-foreground mt-1">Scan a receipt or barcode to add items!</p>
                    </div>
                  )}

                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-3">Alerts</p>
                  {enrichedItems
                    .filter((i) => i.urgency !== "safe")
                    .map((item, idx) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`glass-card rounded-xl p-3 mb-2 flex items-center gap-3 ${urgencyGlow[item.urgency]}`}
                      >
                        <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty: {formatQtyUnit(item.quantity, item.unit || "pcs")}
                          </p>
                          <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${urgencyColor[item.urgency]}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${item.freshness}%` }}
                              transition={{ duration: 0.8, delay: 0.2 + idx * 0.05 }}
                            />
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${urgencyBadge[item.urgency]}`}
                        >
                          {item.daysLabel}
                        </span>
                      </motion.div>
                    ))}
                  {enrichedItems.length > 0 && (
                    <p className="text-[11px] text-muted-foreground mt-4 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Click on items in the fridge for details
                    </p>
                  )}
                </motion.div>
              )}

              {/* List */}
              {activeTab === "list" && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
                    All Items ({enrichedItems.length})
                  </p>
                  {enrichedItems.length === 0 && !isLoading && (
                    <div className="glass-card rounded-xl p-6 text-center">
                      <p className="text-sm text-muted-foreground">Your fridge is empty.</p>
                    </div>
                  )}
                  {enrichedItems.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="glass-card rounded-xl p-3 mb-2 flex items-center gap-3"
                    >
                      <div className="w-12 h-12 flex items-center justify-center text-2xl bg-white/10 rounded-lg hover:bg-white/20 transition-colors flex-shrink-0">
                        {getProductImage(item.name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.category}</p>
                        <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${urgencyColor[item.urgency]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${item.freshness}%` }}
                            transition={{ duration: 0.6, delay: idx * 0.03 }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => handleQuantity(item.id, -1, item.quantity, item.unit || "pcs")}
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-medium text-foreground min-w-[40px] text-center">
                          {formatQtyUnit(item.quantity, item.unit || "pcs")}
                        </span>
                        <button
                          onClick={() => handleQuantity(item.id, 1, item.quantity, item.unit || "pcs")}
                          className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${urgencyBadge[item.urgency]}`}
                      >
                        {item.daysLabel}
                      </span>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setDonationItem(item);
                          setShowDonationModal(true);
                        }}
                        className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
                          item.days < 0
                            ? "text-muted-foreground hover:text-muted-foreground"
                            : item.days <= 5
                              ? "text-warning hover:bg-warning/20"
                              : "text-safe hover:bg-safe/20"
                        }`}
                        title={item.days < 0 ? "Item expired" : "Donate item"}
                      >
                        <Gift className="w-4 h-4" />
                      </motion.button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-muted-foreground hover:text-urgent transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Recipes */}
              {activeTab === "recipes" && !selectedRecipe && (
                <motion.div
                  key="recipes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {(() => {
                    const unusedRecipes = recipes.filter((r) => !usedRecipeTitles.has(r.title));
                    // Merge: prefer DB-stored used recipes (persisted), fallback to current generated ones
                    const usedFromDbTitles = new Set(usedRecipesFromDb.map((r) => r.title));
                    const usedFromCurrent = recipes.filter(
                      (r) => usedRecipeTitles.has(r.title) && !usedFromDbTitles.has(r.title)
                    );
                    const usedRecipes = [...usedRecipesFromDb, ...usedFromCurrent];
                    return (
                      <>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
                          AI Suggestions — use before they expire
                        </p>
                        {unusedRecipes.length === 0 && (
                          <div className="glass-card rounded-xl p-4 mb-3 text-center">
                            <p className="text-sm text-muted-foreground">All recipes used! Generate more below.</p>
                          </div>
                        )}
                        {unusedRecipes.map((r, idx) => (
                          <motion.div
                            key={`${r.title}-${idx}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            whileHover={{ scale: 1.01 }}
                            className="glass-card rounded-xl p-4 mb-3 cursor-pointer"
                            onClick={() => setSelectedRecipe(r)}
                          >
                            <p className="text-sm font-medium text-foreground">{r.title}</p>
                            {r.sub && <p className="text-[11px] text-muted-foreground mt-1">{r.sub}</p>}
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {r.time}
                                {r.difficulty && <span className="ml-2">· {r.difficulty}</span>}
                              </span>
                            </div>
                          </motion.div>
                        ))}

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={handleGenerateRecipes}
                          disabled={generatingRecipes}
                          className="w-full glass-card rounded-xl py-2.5 text-xs font-medium text-foreground flex items-center justify-center gap-1.5 mt-1 disabled:opacity-50"
                        >
                          {generatingRecipes ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating recipes...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-3.5 w-3.5" /> Generate more recipes{" "}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </>
                          )}
                        </motion.button>

                        {usedRecipes.length > 0 && (
                          <div className="mt-6">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-3">
                              ✅ Used Recipes ({usedRecipes.length})
                            </p>
                            {usedRecipes.map((r, idx) => (
                              <motion.div
                                key={`used-${r.title}-${idx}`}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ scale: 1.01 }}
                                className="glass-card rounded-xl p-4 mb-2 cursor-pointer opacity-60"
                                onClick={() => setSelectedRecipe(r)}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-foreground">{r.title}</p>
                                  <span className="text-[10px] font-semibold text-safe bg-safe/15 px-2 py-0.5 rounded-full">
                                    ✅ Used
                                  </span>
                                </div>
                                {r.sub && <p className="text-[11px] text-muted-foreground mt-1">{r.sub}</p>}
                                <div className="flex items-center justify-between mt-3">
                                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {r.time}
                                    {r.difficulty && <span className="ml-2">· {r.difficulty}</span>}
                                  </span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </motion.div>
              )}

              {/* Recipe Detail */}
              {activeTab === "recipes" && selectedRecipe && (
                <motion.div
                  key="recipe-detail"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <button
                    onClick={() => setSelectedRecipe(null)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to recipes
                  </button>
                  <div className="glass-card rounded-2xl p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="font-display text-lg font-bold text-foreground">{selectedRecipe.title}</h2>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {selectedRecipe.time}
                          </span>
                          {selectedRecipe.difficulty && (
                            <span className="text-[11px] text-muted-foreground">· {selectedRecipe.difficulty}</span>
                          )}

                          {usedRecipeTitles.has(selectedRecipe.title) && (
                            <span className="text-[11px] font-semibold text-safe bg-safe/10 px-2 py-0.5 rounded-full">
                              ✅ Used
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedRecipe(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    {selectedRecipe.ingredients && selectedRecipe.ingredients.length > 0 && (
                      <div className="mb-5">
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                          🧾 Ingredients
                        </h3>
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
                        <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">
                          📋 Instructions
                        </h3>
                        <ol className="space-y-3">
                          {selectedRecipe.instructions.map((step, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <p className="text-sm text-muted-foreground pt-0.5">{step}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {(!selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0) &&
                      (!selectedRecipe.instructions || selectedRecipe.instructions.length === 0) && (
                        <p className="text-sm text-muted-foreground">
                          {selectedRecipe.sub || "No detailed instructions available."}
                        </p>
                      )}
                    <div className="mt-6 pt-4 border-t border-primary/10 flex gap-3">
                      {usedRecipeTitles.has(selectedRecipe.title) ? (
                        <div className="flex-1 py-3 rounded-lg bg-safe/15 text-safe text-sm font-bold flex items-center justify-center gap-2">
                          <Check className="w-4 h-4" /> Already Used
                        </div>
                      ) : (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleUseRecipe(selectedRecipe)}
                          className="flex-1 py-3 rounded-lg bg-primary/20 text-primary text-sm font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-2"
                        >
                          <Check className="w-4 h-4" /> Use Recipe
                        </motion.button>
                      )}
                      {!usedRecipeTitles.has(selectedRecipe.title) && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setShowChat(!showChat)}
                          className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
                            showChat
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          <MessageCircle className="w-4 h-4" /> {showChat ? "Hide Chat" : "Ask AI"}
                        </motion.button>
                      )}
                    </div>

                    {/* Recipe Chat */}
                    <AnimatePresence>
                      {showChat && !usedRecipeTitles.has(selectedRecipe.title) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 overflow-hidden"
                        >
                          <div className="glass-card rounded-xl p-3">
                            <p className="text-[10px] text-muted-foreground mb-2">
                              💬 Ask about this recipe — e.g. "I don't have flour, what can I use instead?"
                            </p>

                            {chatMessages.length > 0 && (
                              <div className="max-h-60 overflow-y-auto space-y-2 mb-3 pr-1">
                                {chatMessages.map((msg, i) => (
                                  <div
                                    key={i}
                                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[85%] rounded-xl px-3 py-2 text-xs whitespace-pre-wrap ${
                                        msg.role === "user"
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-foreground"
                                      }`}
                                    >
                                      {msg.content}
                                    </div>
                                  </div>
                                ))}
                                {chatLoading && (
                                  <div className="flex justify-start">
                                    <div className="bg-muted rounded-xl px-3 py-2 text-xs flex items-center gap-1.5">
                                      <Loader2 className="w-3 h-3 animate-spin" /> Thinking...
                                    </div>
                                  </div>
                                )}
                                <div ref={chatEndRef} />
                              </div>
                            )}

                            <div className="flex gap-2">
                              <input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                                placeholder="e.g. I don't have flour..."
                                className="flex-1 bg-background/50 border border-primary/10 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                              />
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleSendChat}
                                disabled={chatLoading || !chatInput.trim()}
                                className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {(selectedItem || donationItem) && (
        <DonationModal
          isOpen={showDonationModal}
          onClose={() => {
            setShowDonationModal(false);
            setDonationItem(null);
            setSelectedItem(null);
            queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
            fetchWallet();
          }}
          itemId={(donationItem || selectedItem)?.id || ""}
          itemName={(donationItem || selectedItem)?.name || ""}
          daysLeft={(donationItem || selectedItem)?.days || 0}
          quantity={(donationItem || selectedItem)?.quantity || 1}
          unit={(donationItem || selectedItem)?.unit || "pcs"}
          userWalletAddress={userWalletAddress}
        />
      )}

      <AnimatePresence>
        {selectedExpiredItem && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExpiredItem(null)}
              className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 60 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 60 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="w-full max-w-[500px] glass-card-strong rounded-3xl p-7 shadow-2xl pointer-events-auto">
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getProductImage(selectedExpiredItem.name)}</span>
                    <div>
                      <p className="text-lg font-bold text-foreground">{selectedExpiredItem.name}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{selectedExpiredItem.category}</p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedExpiredItem(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-3 px-3 rounded-lg bg-background/30 border border-border/30">
                    <span className="text-sm text-muted-foreground">Expiry Date</span>
                    <span className="text-sm font-semibold text-urgent">
                      {selectedExpiredItem.expiry_date
                        ? new Date(selectedExpiredItem.expiry_date).toLocaleDateString()
                        : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between py-3 px-3 rounded-lg bg-background/30 border border-border/30">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <span className="text-sm font-semibold text-foreground">
                      {formatQtyUnit(selectedExpiredItem.quantity, selectedExpiredItem.unit)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-border/30">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      const itemId = selectedExpiredItem.id;
                      setSelectedExpiredItem(null);
                      await handleDelete(itemId);
                    }}
                    className="flex-1 py-3 rounded-lg bg-urgent/20 text-urgent text-sm font-bold hover:bg-urgent/30 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  );
};

export default FridgePage;
