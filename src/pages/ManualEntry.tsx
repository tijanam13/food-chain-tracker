import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Minus, ShoppingBasket } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BottomNav from "@/components/BottomNav";

const categories = [
  { value: "Dairy", emoji: "🥛" },
  { value: "Meat", emoji: "🥩" },
  { value: "Fruit", emoji: "🍎" },
  { value: "Vegetable", emoji: "🥬" },
  { value: "Bakery", emoji: "🍞" },
  { value: "Pantry", emoji: "🫙" },
  { value: "Frozen", emoji: "🧊" },
  { value: "Drinks", emoji: "🧃" },
  { value: "Other", emoji: "📦" },
];

const locations = [
  { value: "fridge", label: "Fridge", emoji: "🧊" },
  { value: "freezer", label: "Freezer", emoji: "❄️" },
];

const units = [
  { value: "pcs", label: "pcs" },
  { value: "g", label: "g" },
  { value: "kg", label: "kg" },
  { value: "ml", label: "ml" },
  { value: "l", label: "l" },
];

const ManualEntry = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [expiryDate, setExpiryDate] = useState<Date>();
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState("pcs");
  const [location, setLocation] = useState("fridge");
  const [saving, setSaving] = useState(false);

  const step = 1;

  const handleSave = async () => {
    if (!user) {
      toast.error("Please log in first");
      return;
    }
    if (!name.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    if (!category) {
      toast.error("Please select a category");
      return;
    }

    setSaving(true);
    const expiryStr = expiryDate ? format(expiryDate, "yyyy-MM-dd") : null;

    // Check if identical item already exists (same name, location, expiry)
    // Match both "fridge" and "in_fridge" when location is fridge
    const statusFilter = location === "fridge" ? ["fridge", "in_fridge"] : [location];
    let query = supabase
      .from("fridge_items")
      .select("id, quantity")
      .eq("user_id", user.id)
      .eq("name", name.trim())
      .in("status", statusFilter);
    query = expiryStr ? query.eq("expiry_date", expiryStr) : query.is("expiry_date", null);
    const { data: existing } = await query.maybeSingle();

    if (existing) {
      const newQty = +(existing.quantity + quantity).toFixed(1);
      const { error } = await supabase.from("fridge_items").update({ quantity: newQty }).eq("id", existing.id);
      setSaving(false);
      if (error) {
        toast.error("Failed to update item");
        return;
      }
      toast.success(`Quantity updated for existing item in your ${location === "freezer" ? "freezer" : "fridge"}!`);
    } else {
      const { error } = await supabase.from("fridge_items").insert({
        user_id: user.id,
        name: name.trim(),
        category,
        expiry_date: expiryStr,
        quantity,
        unit,
        status: location,
      });
      setSaving(false);
      if (error) {
        toast.error("Failed to add item");
        return;
      }
      toast.success(`Item successfully added to your ${location === "freezer" ? "freezer" : "fridge"}!`);
    }

    setName("");
    setCategory("");
    setExpiryDate(undefined);
    setQuantity(1);
    setUnit("pcs");
    setLocation("fridge");
  };

  const displayQty = Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(1);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-6 pb-4 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/")}
          className="w-9 h-9 rounded-xl glass-card flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </motion.button>
        <h1 className="font-display text-lg font-bold text-foreground">Add Item Manually</h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-5 glass-card-strong rounded-2xl p-5 space-y-5"
      >
        {/* Product Name */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Product Name</Label>
          <Input
            placeholder="e.g. Greek Yogurt"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-background/50 border-border/50 rounded-xl h-11"
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-background/50 border-border/50 rounded-xl h-11">
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  <span className="flex items-center gap-2">
                    <span>{c.emoji}</span>
                    <span>{c.value}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Storage Location</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="bg-background/50 border-border/50 rounded-xl h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {locations.map((loc) => (
                <SelectItem key={loc.value} value={loc.value}>
                  <span className="flex items-center gap-2">
                    <span>{loc.emoji}</span>
                    <span>{loc.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Expiry Date */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Expiry Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal bg-background/50 border-border/50 rounded-xl h-11",
                  !expiryDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {expiryDate ? format(expiryDate, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={expiryDate}
                onSelect={setExpiryDate}
                initialFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Quantity + Unit row */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quantity & Unit</Label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
              >
                <Minus className="w-4 h-4 text-foreground" />
              </motion.button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setQuantity(isNaN(v) || v < 1 ? 1 : v);
                }}
                className="w-16 text-center text-lg font-bold text-foreground bg-background/50 border border-border/50 rounded-xl h-10 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setQuantity((q) => q + 1)}
                className="w-10 h-10 rounded-xl glass-card flex items-center justify-center"
              >
                <Plus className="w-4 h-4 text-foreground" />
              </motion.button>
            </div>
            <Select
              value={unit}
              onValueChange={(v) => {
                setUnit(v);
                setQuantity(1);
              }}
            >
              <SelectTrigger className="bg-background/50 border-border/50 rounded-xl h-10 w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {units.map((u) => (
                  <SelectItem key={u.value} value={u.value}>
                    {u.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Submit */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm gap-2"
        >
          <ShoppingBasket className="w-4 h-4" />
          {saving ? "Adding..." : `Add to ${location === "freezer" ? "Freezer" : "Fridge"}`}
        </Button>
      </motion.div>

      <BottomNav />
    </div>
  );
};

export default ManualEntry;
