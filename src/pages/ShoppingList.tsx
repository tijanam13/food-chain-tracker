import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  X,
  Trash2,
  ExternalLink,
  ChevronRight,
  ListPlus,
  Store,
  Check,
  Sparkles,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  store: string;
  checked: boolean;
}

interface ShoppingListData {
  id: string;
  name: string;
  createdAt: number;
  items: ShoppingItem[];
}

const STORES = [
  // SUPERMARKETS
  "🛒 Maxi",
  "🛒 Univerexport",
  "🛒 Lidl",
  "🛒 Idea",
  "🛒 Idea Super",
  "🛒 DIS",
  "🛒 MERE",
  // HYPERMARKETS
  "🛒 Roda",
  "🛒 DIS Super",
  "🛒 Tempo",
  "🛒 Super Vero",
  "🛒 Mega Maxi",
  // STORES
  "🛒 Gomex",
  "🛒 Aman",
  "🛒 Aman Plus",
  "🛒 Shop&Go",
  "🛒 Aroma",
  // CASH & CARRY
  "🛒 METRO Cash & Carry",
  "🛒 Velpro",
  "🛒 Plus Cash & Carry",
  // HEALTH
  "🏥 BENU",
  "🏥 Lilly",
  "🏥 DM",
];

const UNITS = ["pcs", "kg", "l", "g", "ml", "package"];

interface Suggestion {
  name: string;
  reason: string;
  category: string;
  priority: "high" | "medium" | "low";
  macronutrient?: string;
}

const macroEmoji: Record<string, string> = {
  protein: "💪",
  carbs: "🌾",
  fats: "🥑",
  fiber: "🥦",
  vitamins: "🍊",
  mixed: "⚖️",
};

const ShoppingList = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [lists, setLists] = useState<ShoppingListData[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState("");

  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");
  const [newItemUnit, setNewItemUnit] = useState("pcs");
  const [selectedStore, setSelectedStore] = useState("🛒 Maxi");
  const [showAddForm, setShowAddForm] = useState(false);
  const [customStore, setCustomStore] = useState("");
  const [showCustomStore, setShowCustomStore] = useState(false);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchSuggestions = async () => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return;
    }
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    try {
      const { data: fridgeItems } = await supabase
        .from("fridge_items")
        .select("name, quantity, unit, category, expiry_date")
        .eq("user_id", user.id);

      const { data, error } = await supabase.functions.invoke("suggest-shopping", {
        body: { fridgeItems: fridgeItems || [] },
      });

      if (error) throw error;
      setSuggestions(data.suggestions || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to get suggestions", variant: "destructive" });
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Per-suggestion expanded state for store/qty picker
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [suggestionStore, setSuggestionStore] = useState("🛒 Maxi");
  const [suggestionQty, setSuggestionQty] = useState("1");
  const [suggestionUnit, setSuggestionUnit] = useState("pcs");
  const [suggestionCustomStore, setSuggestionCustomStore] = useState("");
  const [suggestionShowCustomStore, setSuggestionShowCustomStore] = useState(false);

  const openSuggestionPicker = (name: string) => {
    setExpandedSuggestion(name);
    setSuggestionStore("🛒 Maxi");
    setSuggestionQty("1");
    setSuggestionUnit("pcs");
    setSuggestionCustomStore("");
    setSuggestionShowCustomStore(false);
  };

  const addSuggestionToList = (suggestion: Suggestion) => {
    if (!currentList) {
      toast({ title: "Error", description: "Select a list first", variant: "destructive" });
      return;
    }
    const store =
      suggestionShowCustomStore && suggestionCustomStore.trim() ? suggestionCustomStore.trim() : suggestionStore;
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: suggestion.name,
      quantity: parseFloat(suggestionQty) || 1,
      unit: suggestionUnit,
      store: store,
      checked: false,
    };
    const updatedLists = lists.map((list) =>
      list.id === currentList.id ? { ...list, items: [...list.items, newItem] } : list,
    );
    setLists(updatedLists);
    setSuggestions((prev) => prev.filter((s) => s.name !== suggestion.name));
    setExpandedSuggestion(null);
    toast({ title: "Added!", description: `"${suggestion.name}" added to ${store}` });
  };

  // Load from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem("shopping_lists");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLists(parsed);
        if (parsed.length > 0 && !selectedListId) {
          setSelectedListId(parsed[0].id);
        }
      } catch (e) {
        console.error("Failed to load lists", e);
      }
    }
  }, []);

  // Save to LocalStorage
  useEffect(() => {
    if (lists.length > 0) {
      localStorage.setItem("shopping_lists", JSON.stringify(lists));
    }
  }, [lists]);

  const currentList = lists.find((l) => l.id === selectedListId);

  const createNewList = () => {
    if (!newListName.trim()) {
      toast({ title: "Error", description: "Enter list name", variant: "destructive" });
      return;
    }

    const newList: ShoppingListData = {
      id: Date.now().toString(),
      name: newListName.trim(),
      createdAt: Date.now(),
      items: [],
    };

    const updatedLists = [...lists, newList];
    setLists(updatedLists);
    setSelectedListId(newList.id);
    setNewListName("");
    setShowNewListForm(false);
    toast({ title: "List created!", description: `"${newList.name}" has been created` });
  };

  const deleteList = (id: string) => {
    const updatedLists = lists.filter((l) => l.id !== id);
    setLists(updatedLists);
    if (selectedListId === id) {
      setSelectedListId(updatedLists.length > 0 ? updatedLists[0].id : null);
    }
    toast({ title: "List deleted!" });
  };

  const addItem = () => {
    if (!currentList || !newItemName.trim()) {
      toast({ title: "Error", description: "Select a list and enter product name", variant: "destructive" });
      return;
    }

    const store = showCustomStore && customStore.trim() ? customStore : selectedStore;
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: newItemName.trim(),
      quantity: parseFloat(newItemQty) || 1,
      unit: newItemUnit,
      store: store,
      checked: false,
    };

    const updatedLists = lists.map((list) =>
      list.id === currentList.id ? { ...list, items: [...list.items, newItem] } : list,
    );

    setLists(updatedLists);
    setNewItemName("");
    setNewItemQty("1");
    setNewItemUnit("pcs");
    setCustomStore("");
    setShowAddForm(false);
    setShowCustomStore(false);
    toast({ title: "Added!", description: `"${newItem.name}" has been added to the list` });
  };

  const deleteItem = (itemId: string) => {
    if (!currentList) return;

    const updatedLists = lists.map((list) =>
      list.id === currentList.id ? { ...list, items: list.items.filter((i) => i.id !== itemId) } : list,
    );
    setLists(updatedLists);
  };

  const toggleItem = (itemId: string) => {
    if (!currentList) return;

    const updatedLists = lists.map((list) =>
      list.id === currentList.id
        ? {
            ...list,
            items: list.items.map((item) => (item.id === itemId ? { ...item, checked: !item.checked } : item)),
          }
        : list,
    );
    setLists(updatedLists);
  };

  const groupedByStore = currentList
    ? currentList.items.reduce(
        (acc, item) => {
          const store = item.store || "📋 No Store";
          if (!acc[store]) acc[store] = [];
          acc[store].push(item);
          return acc;
        },
        {} as Record<string, ShoppingItem[]>,
      )
    : {};

  const uncheckedCount = currentList ? currentList.items.filter((i) => !i.checked).length : 0;
  const totalCount = currentList ? currentList.items.length : 0;

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />
      <div className="absolute top-60 right-0 w-[300px] h-[300px] rounded-full bg-coral/4 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-40 left-0 w-[250px] h-[250px] rounded-full bg-cream/3 blur-[100px] pointer-events-none" />

      <div className="relative z-10 pb-28 pt-10 px-4 lg:px-8 xl:px-16">
        <Header />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center mt-6">
          <h1 className="font-display text-2xl font-bold text-foreground">Shopping Lists</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lists.length} {lists.length === 1 ? "list" : "lists"}
          </p>
        </motion.div>

        {/* Expiry notifications removed */}

        <div className="max-w-2xl mx-auto">
          {/* All Shopping Lists */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <ListPlus className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">My Lists</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => (
                <motion.div key={list.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                  <button
                    onClick={() => setSelectedListId(list.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedListId === list.id
                        ? "bg-primary text-primary-foreground"
                        : "glass-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {list.name}
                    <span className="text-xs ml-2 opacity-60">
                      ({list.items.filter((i) => !i.checked).length}/{list.items.length})
                    </span>
                  </button>
                </motion.div>
              ))}
              {!showNewListForm && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNewListForm(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium glass-card text-primary hover:bg-primary/10 transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> New List
                </motion.button>
              )}
            </div>

            {/* New List Form */}
            <AnimatePresence>
              {showNewListForm && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="glass-card rounded-lg p-3 flex gap-2"
                >
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && createNewList()}
                    placeholder="List name..."
                    className="flex-1 glass-card rounded px-3 py-2 text-sm border border-primary/20 outline-none focus:border-primary/60 text-foreground placeholder:text-muted-foreground"
                    autoFocus
                  />
                  <button
                    onClick={createNewList}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewListForm(false);
                      setNewListName("");
                    }}
                    className="px-3 py-2 glass-card text-muted-foreground rounded text-sm font-medium hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {currentList ? (
            <>
              {/* Add Item Button */}
              <AnimatePresence mode="wait">
                {!showAddForm ? (
                  <motion.button
                    key="add-btn"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    onClick={() => setShowAddForm(true)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full glass-card-strong rounded-2xl p-5 flex items-center justify-center gap-2 cursor-pointer mb-6 border border-primary/20 hover:border-primary/40 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Add Product</span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="add-form"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="glass-card-strong rounded-2xl p-5 mb-6 space-y-4"
                  >
                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                        Product
                      </label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && addItem()}
                        placeholder="E.g., Milk, Bread..."
                        className="w-full glass-card rounded-lg px-4 py-2.5 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                        autoFocus
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                          Quantity
                        </label>
                        <input
                          type="number"
                          value={newItemQty}
                          onChange={(e) => setNewItemQty(e.target.value)}
                          min="0.1"
                          step="0.1"
                          className="w-full glass-card rounded-lg px-3 py-2 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                          Unit
                        </label>
                        <select
                          value={newItemUnit}
                          onChange={(e) => setNewItemUnit(e.target.value)}
                          className="w-full glass-card rounded-lg px-3 py-2 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground"
                        >
                          {UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-foreground uppercase tracking-wider block mb-2">
                        Store
                      </label>
                      {!showCustomStore ? (
                        <div className="space-y-2">
                          <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full glass-card rounded-lg px-3 py-2 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground"
                          >
                            {STORES.map((store) => (
                              <option key={store} value={store}>
                                {store}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setShowCustomStore(true)}
                            className="w-full text-xs text-primary hover:text-primary/80 transition-colors font-medium py-1"
                          >
                            + Add Custom Store
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={customStore}
                            onChange={(e) => setCustomStore(e.target.value)}
                            placeholder="E.g., Pharmacy, Local Market..."
                            className="w-full glass-card rounded-lg px-4 py-2 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                            autoFocus
                          />
                          <button
                            onClick={() => {
                              setShowCustomStore(false);
                              setCustomStore("");
                            }}
                            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors font-medium py-1"
                          >
                            Use Store List
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={addItem}
                        className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                      <button
                        onClick={() => {
                          setShowAddForm(false);
                          setNewItemName("");
                          setCustomStore("");
                          setShowCustomStore(false);
                        }}
                        className="flex-1 glass-card rounded-lg py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Cenoteka Link - Always Visible */}
              <motion.a
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                href="https://cenoteka.rs/"
                target="_blank"
                rel="noopener noreferrer"
                className="block glass-card rounded-2xl p-4 mb-6 cursor-pointer hover:border-primary/40 transition-colors border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-token/20 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-5 h-5 text-token" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-token font-semibold uppercase tracking-wider">Cenoteka.rs</p>
                    <p className="text-sm text-foreground mt-0.5">Compare prices and find the best deals →</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                </div>
              </motion.a>

              {/* Smart Suggestions */}
              <div className="mb-6">
                {!showSuggestions ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={fetchSuggestions}
                    className="w-full glass-card-strong rounded-2xl p-4 flex items-center justify-center gap-3 border border-accent/30 hover:border-accent/60 transition-colors"
                  >
                    <Sparkles className="w-5 h-5 text-accent" />
                    <span className="text-sm font-semibold text-foreground">Smart Suggestions</span>
                    <span className="text-xs text-muted-foreground">Based on your fridge</span>
                  </motion.button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card-strong rounded-2xl p-5 border border-accent/20"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        <h3 className="text-sm font-semibold text-foreground">Smart Suggestions</h3>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={fetchSuggestions}
                          disabled={loadingSuggestions}
                          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                        >
                          Refresh
                        </button>
                        <button
                          onClick={() => setShowSuggestions(false)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {loadingSuggestions ? (
                      <div className="flex items-center justify-center py-8 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">Analyzing your fridge...</span>
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="space-y-2">
                        {suggestions.map((s, idx) => (
                          <div key={s.name + idx}>
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="glass-card rounded-xl p-3 flex items-center gap-3"
                            >
                              <div
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  s.priority === "high"
                                    ? "bg-urgent"
                                    : s.priority === "medium"
                                      ? "bg-warning"
                                      : "bg-safe"
                                }`}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground">{s.name}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                                {s.macronutrient && (
                                  <span className="text-[10px] text-primary/80 mt-0.5 inline-flex items-center gap-0.5">
                                    {macroEmoji[s.macronutrient] || "⚖️"} {s.macronutrient}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex-shrink-0">
                                {s.category}
                              </span>
                              {currentList && (
                                <motion.button
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => openSuggestionPicker(s.name)}
                                  className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                                  title="Add to list"
                                >
                                  <Plus className="w-4 h-4" />
                                </motion.button>
                              )}
                            </motion.div>

                            {/* Expanded store/qty picker for this suggestion */}
                            <AnimatePresence>
                              {expandedSuggestion === s.name && (
                                <motion.div
                                  key="picker"
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2 mx-1 p-3 rounded-xl bg-background/40 border border-primary/20 space-y-3">
                                    {/* Quantity + Unit */}
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                          Quantity
                                        </label>
                                        <input
                                          type="number"
                                          value={suggestionQty}
                                          onChange={(e) => setSuggestionQty(e.target.value)}
                                          min="0.1"
                                          step="0.1"
                                          className="w-full glass-card rounded-lg px-2 py-1.5 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                          Unit
                                        </label>
                                        <select
                                          value={suggestionUnit}
                                          onChange={(e) => setSuggestionUnit(e.target.value)}
                                          className="w-full glass-card rounded-lg px-2 py-1.5 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground"
                                        >
                                          {UNITS.map((u) => (
                                            <option key={u} value={u}>
                                              {u}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>

                                    {/* Store picker */}
                                    <div>
                                      <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Store
                                      </label>
                                      {!suggestionShowCustomStore ? (
                                        <div className="space-y-1.5">
                                          <select
                                            value={suggestionStore}
                                            onChange={(e) => setSuggestionStore(e.target.value)}
                                            className="w-full glass-card rounded-lg px-2 py-1.5 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground"
                                          >
                                            {STORES.map((store) => (
                                              <option key={store} value={store}>
                                                {store}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            onClick={() => setSuggestionShowCustomStore(true)}
                                            className="w-full text-[10px] text-primary hover:text-primary/80 transition-colors font-medium py-0.5"
                                          >
                                            + Custom Store
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="space-y-1.5">
                                          <input
                                            type="text"
                                            value={suggestionCustomStore}
                                            onChange={(e) => setSuggestionCustomStore(e.target.value)}
                                            placeholder="Store name..."
                                            className="w-full glass-card rounded-lg px-2 py-1.5 text-sm border border-primary/20 focus:border-primary/60 outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                                            autoFocus
                                          />
                                          <button
                                            onClick={() => {
                                              setSuggestionShowCustomStore(false);
                                              setSuggestionCustomStore("");
                                            }}
                                            className="w-full text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium py-0.5"
                                          >
                                            Use Store List
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    {/* Confirm / Cancel */}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => addSuggestionToList(s)}
                                        className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" /> Add to List
                                      </button>
                                      <button
                                        onClick={() => setExpandedSuggestion(null)}
                                        className="flex-1 glass-card rounded-lg py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          No suggestions available. Add items to your fridge first.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Items by Store */}
              {Object.keys(groupedByStore).length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedByStore).map(([store, storeItems], storeIdx) => (
                    <motion.div
                      key={store}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: storeIdx * 0.1 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Store className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">{store}</h3>
                        <span className="text-xs text-muted-foreground">
                          ({storeItems.filter((i) => !i.checked).length}/{storeItems.length})
                        </span>
                      </div>

                      <div className="space-y-2">
                        {storeItems.map((item, idx) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`glass-card rounded-xl p-4 flex items-center gap-3 transition-all ${
                              item.checked ? "opacity-60 bg-primary/5" : "hover:bg-primary/2"
                            }`}
                          >
                            <motion.button
                              onClick={() => toggleItem(item.id)}
                              whileTap={{ scale: 0.9 }}
                              className={`flex-shrink-0 w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${
                                item.checked ? "bg-primary border-primary" : "border-primary/30 hover:border-primary/60"
                              }`}
                            >
                              {item.checked && <Check className="w-4 h-4 text-primary-foreground" />}
                            </motion.button>
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleItem(item.id)}>
                              <p
                                className={`text-sm font-medium ${item.checked ? "line-through text-muted-foreground" : "text-foreground"}`}
                              >
                                {item.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {item.quantity} {item.unit}
                              </p>
                            </div>
                            <motion.button
                              onClick={() => deleteItem(item.id)}
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 text-muted-foreground hover:text-urgent transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card rounded-2xl p-8 text-center"
                >
                  <ListPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No items on your list</p>
                  <p className="text-xs text-muted-foreground mt-1">Start adding products you need to buy</p>
                </motion.div>
              )}

              {/* Summary */}
              {totalCount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-5 mt-6 border border-primary/20"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Remaining</p>
                      <p className="text-lg font-bold text-primary mt-1">{uncheckedCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Purchased</p>
                      <p className="text-lg font-bold text-safe mt-1">{totalCount - uncheckedCount}</p>
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-primary to-safe rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${totalCount > 0 ? ((totalCount - uncheckedCount) / totalCount) * 100 : 0}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
              <div className="glass-card rounded-2xl p-12 text-center space-y-4">
                <ListPlus className="w-16 h-16 text-muted-foreground/30 mx-auto" />
                <div>
                  <p className="text-sm text-muted-foreground">You don't have any lists yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Click on "New List" to get started</p>
                </div>
              </div>

              {/* Cenoteka Link - LARGE & PROMINENT */}
              <motion.a
                whileHover={{ scale: 1.02 }}
                href="https://cenoteka.rs/"
                target="_blank"
                rel="noopener noreferrer"
                className="block glass-card-strong rounded-2xl p-6 cursor-pointer hover:border-token/40 transition-all border-2 border-token/30 bg-gradient-to-br from-token/10 to-transparent"
              >
                <div className="flex items-center justify-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-token/20 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-6 h-6 text-token" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-token font-bold uppercase tracking-wider">
                      Compare Prices on Cenoteka.rs
                    </p>
                    <p className="text-base text-foreground font-semibold mt-1">
                      Find the best deals for your shopping →
                    </p>
                  </div>
                </div>
              </motion.a>
            </motion.div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ShoppingList;
