import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Upload, Camera, Loader2, Trash2, Check, Pencil, Plus, Minus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ScannedItem {
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_date: string;
}

const categories = ["Dairy", "Meat", "Fruit", "Vegetable", "Bakery", "Pantry", "Beverage", "Other"];

const ReceiptScanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  const handleImage = async (file: File) => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to scan receipts.", variant: "destructive" });
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setProcessing(true);
    setItems([]);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64 },
      });

      if (error) throw error;

      if (data?.items && data.items.length > 0) {
        const normalized = data.items.map((item: any) => ({
          name: item.name || "Unknown",
          category: item.category || "Other",
          quantity: item.quantity || 1,
          unit: item.unit || "pcs",
          expiry_date: item.expiry_date || "",
        }));
        setItems(normalized);
        toast({ title: "Receipt scanned!", description: `${normalized.length} food items detected.` });
      } else {
        toast({
          title: "No food items found",
          description: "Try a clearer photo of the receipt.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Scan error:", err);
      toast({ title: "Scan failed", description: err.message || "Could not process receipt.", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImage(file);
    e.target.value = "";
  };

  const deleteItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: keyof ScannedItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };

  const adjustQuantity = (idx: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const newQty = Math.max(1, +(item.quantity + delta * 1).toFixed(1));
        return { ...item, quantity: newQty };
      }),
    );
  };

  const handleConfirm = async () => {
    if (!user || items.length === 0) return;
    setSaving(true);

    try {
      let merged = 0;
      let added = 0;

      for (const item of items) {
        // Check if an identical item already exists (same name, location, expiry)
        let query = supabase
          .from("fridge_items")
          .select("id, quantity")
          .eq("user_id", user.id)
          .eq("name", item.name)
          .in("status", ["fridge", "in_fridge"]);
        query = item.expiry_date ? query.eq("expiry_date", item.expiry_date) : query.is("expiry_date", null);
        const { data: existing } = await query.maybeSingle();

        if (existing) {
          // Merge: add scanned quantity to the existing row
          const newQty = +(existing.quantity + item.quantity).toFixed(1);
          const { error } = await supabase.from("fridge_items").update({ quantity: newQty }).eq("id", existing.id);
          if (error) throw error;
          merged++;
        } else {
          // No match — insert as new row
          const { error } = await supabase.from("fridge_items").insert({
            user_id: user.id,
            name: item.name,
            category: item.category,
            expiry_date: item.expiry_date,
            quantity: item.quantity,
            unit: item.unit,
            status: "in_fridge",
          });
          if (error) throw error;
          added++;
        }
      }

      const desc = [
        added > 0 && `${added} new item${added > 1 ? "s" : ""} added`,
        merged > 0 && `${merged} existing item${merged > 1 ? "s" : ""} updated`,
      ]
        .filter(Boolean)
        .join(", ");

      toast({ title: "Added to fridge!", description: desc + "." });
      setItems([]);
      setPreviewUrl(null);
      navigate("/fridge");
    } catch (err: any) {
      console.error("Save error:", err);
      toast({ title: "Save failed", description: err.message || "Could not save items.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-coral/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 pb-28 pt-10 px-4 lg:px-8 xl:px-16">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </button>
          <h1 className="font-display text-2xl font-bold text-foreground text-center">Receipt Scanner</h1>
          <p className="text-xs text-muted-foreground mt-0.5 text-center">
            Scan your grocery receipt to auto-add items
          </p>
        </motion.div>

        <div className="max-w-lg mx-auto">
          {/* Upload buttons */}
          {items.length === 0 && !processing && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 mb-6">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 glass-card rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">Upload Receipt</span>
                <span className="text-[10px] text-muted-foreground">From gallery</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 glass-card rounded-2xl p-6 flex flex-col items-center gap-3 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-xl bg-coral/15 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-coral" />
                </div>
                <span className="text-sm font-medium text-foreground">Take Photo</span>
                <span className="text-[10px] text-muted-foreground">Use camera</span>
              </motion.button>
            </motion.div>
          )}

          {/* Processing spinner */}
          {processing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card rounded-2xl p-8 text-center mb-6"
            >
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Receipt"
                  className="w-32 h-40 object-cover rounded-xl mx-auto mb-4 opacity-60"
                />
              )}
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Analyzing receipt with AI...</p>
              <p className="text-[11px] text-muted-foreground mt-1">Detecting food items and predicting expiry dates</p>
            </motion.div>
          )}

          {/* Scanned items list */}
          {items.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  {items.length} Items Detected
                </p>
                <button
                  onClick={() => {
                    setItems([]);
                    setPreviewUrl(null);
                  }}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Scan another
                </button>
              </div>

              <div className="space-y-2 mb-5">
                <AnimatePresence>
                  {items.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10, height: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className="glass-card rounded-xl p-3"
                    >
                      {editingIdx === idx ? (
                        <div className="space-y-2">
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(idx, "name", e.target.value)}
                            className="h-8 text-sm bg-muted/50"
                            placeholder="Item name"
                          />
                          <div className="flex gap-2">
                            <select
                              value={item.category}
                              onChange={(e) => updateItem(idx, "category", e.target.value)}
                              className="flex-1 h-8 rounded-md border border-input bg-muted/50 px-2 text-sm text-foreground"
                            >
                              {categories.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                            <Input
                              type="date"
                              value={item.expiry_date}
                              onChange={(e) => updateItem(idx, "expiry_date", e.target.value)}
                              className="flex-1 h-8 text-sm bg-muted/50"
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-primary"
                            onClick={() => setEditingIdx(null)}
                          >
                            Done
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                {item.category}
                              </span>
                              <span className="text-[10px] text-muted-foreground">Expires: {item.expiry_date}</span>
                              <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                                {item.unit}
                              </span>
                            </div>
                          </div>
                          {/* Quantity controls */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => adjustQuantity(idx, -1)}
                              className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-medium text-foreground w-12 text-center">
                              {Number.isInteger(item.quantity) ? item.quantity : item.quantity.toFixed(1)} {item.unit}
                            </span>
                            <button
                              onClick={() => adjustQuantity(idx, 1)}
                              className="w-6 h-6 rounded-md bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => setEditingIdx(idx)}
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteItem(idx)}
                            className="p-1.5 text-muted-foreground hover:text-urgent transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Confirm button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleConfirm}
                disabled={saving || items.length === 0}
                className="w-full bg-primary text-primary-foreground rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Confirm & Add to Fridge ({items.length})
                  </>
                )}
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default ReceiptScanner;
