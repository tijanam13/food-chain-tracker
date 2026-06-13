import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ScanLine, X, Check, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface NewItemForm {
  name: string;
  expiry_date: string;
  category: string;
}

const categories = ["Dairy", "Meat", "Fruit", "Vegetable", "Bakery", "Pantry", "Other"];

const BarcodeScanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [showNewItemPopup, setShowNewItemPopup] = useState(false);
  const [newItem, setNewItem] = useState<NewItemForm>({ name: "", expiry_date: "", category: "Other" });
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "barcode-scanner-container";

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScan(decodedText);
          scanner.stop().catch(console.error);
          setScanning(false);
        },
        undefined
      );
      setScanning(true);
    } catch (err) {
      console.error("Scanner error:", err);
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopScanner = () => {
    if (scannerRef.current?.isScanning) {
      scannerRef.current.stop().catch(console.error);
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleScan = async (code: string) => {
    if (!user) {
      toast.error("Please log in first.");
      return;
    }
    setScannedCode(code);
    setProcessing(true);

    try {
      const { data: existing, error } = await supabase
        .from("fridge_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("gtin_code", code)
        .eq("status", "in_fridge")
        .maybeSingle();

      if (error) throw error;

      if (existing) {
        const { error: updateError } = await supabase
          .from("fridge_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);

        if (updateError) throw updateError;
        toast.success(`${existing.name} — quantity increased to ${existing.quantity + 1}`);
        setScannedCode(null);
      } else {
        setShowNewItemPopup(true);
      }
    } catch (err) {
      console.error("Scan handling error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveNewItem = async () => {
    if (!user || !scannedCode) return;
    if (!newItem.name.trim()) {
      toast.error("Please enter a product name.");
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase.from("fridge_items").insert({
        user_id: user.id,
        name: newItem.name.trim(),
        gtin_code: scannedCode,
        category: newItem.category,
        expiry_date: newItem.expiry_date || null,
        quantity: 1,
        status: "in_fridge",
      });

      if (error) throw error;
      toast.success(`${newItem.name} added to your fridge!`);
      setShowNewItemPopup(false);
      setScannedCode(null);
      setNewItem({ name: "", expiry_date: "", category: "Other" });
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save item.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Ambient glows */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />
      <div className="absolute top-60 right-0 w-[300px] h-[300px] rounded-full bg-coral/4 blur-[100px] pointer-events-none" />

      <div className="relative z-10 pb-10">
        {/* Header */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="glass-card w-10 h-10 rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </motion.button>
          <div>
            <h1 className="font-display text-lg font-bold text-foreground">Barcode Scanner</h1>
            <p className="text-xs text-muted-foreground">Scan EAN-13 or DataMatrix codes</p>
          </div>
        </div>

        {/* Scanner area */}
        <div className="px-5 mt-4">
          <div className="glass-card rounded-2xl p-4 overflow-hidden">
            <div
              id={scannerContainerId}
              className="w-full rounded-xl overflow-hidden bg-black/40 min-h-[280px] flex items-center justify-center"
            >
              {!scanning && (
                <div className="text-center p-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                    <ScanLine className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Camera preview will appear here</p>
                  <p className="text-xs text-muted-foreground/60">Tap the button below to start scanning</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              {!scanning ? (
                <Button
                  onClick={startScanner}
                  className="flex-1 bg-primary text-primary-foreground font-semibold rounded-xl"
                >
                  <ScanLine className="w-4 h-4 mr-2" />
                  Start Scanning
                </Button>
              ) : (
                <Button
                  onClick={stopScanner}
                  variant="destructive"
                  className="flex-1 rounded-xl font-semibold"
                >
                  <X className="w-4 h-4 mr-2" />
                  Stop Scanning
                </Button>
              )}
            </div>
          </div>

          {/* Status */}
          {processing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-4 mt-4 text-center"
            >
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Looking up product…</p>
            </motion.div>
          )}

          {/* Instructions */}
          <div className="glass-card rounded-2xl p-4 mt-4">
            <h3 className="font-display text-sm font-semibold text-foreground mb-2">How it works</h3>
            <div className="space-y-2">
              {[
                "Point your camera at a barcode",
                "If the product is already in your fridge, quantity goes up",
                "If it's new, you'll fill in a quick form to add it",
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-xs flex items-center justify-center mt-0.5 shrink-0 font-semibold">
                    {i + 1}
                  </span>
                  <p className="text-xs text-muted-foreground">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New item popup */}
      <AnimatePresence>
        {showNewItemPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
            onClick={() => { setShowNewItemPopup(false); setScannedCode(null); }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-5 w-full max-w-sm border border-border/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center">
                  <Package className="w-5 h-5 text-coral" />
                </div>
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">New Product</h3>
                  <p className="text-xs text-muted-foreground">Code: {scannedCode}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Product Name *</Label>
                  <Input
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g. Whole Milk"
                    className="bg-secondary/50 border-border/50 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Category</Label>
                  <select
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    className="w-full bg-secondary/50 border border-border/50 rounded-xl text-sm text-foreground px-3 py-2"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Expiry Date</Label>
                  <Input
                    type="date"
                    value={newItem.expiry_date}
                    onChange={(e) => setNewItem({ ...newItem, expiry_date: e.target.value })}
                    className="bg-secondary/50 border-border/50 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button
                  variant="outline"
                  onClick={() => { setShowNewItemPopup(false); setScannedCode(null); }}
                  className="flex-1 rounded-xl border-border/50"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveNewItem}
                  disabled={processing || !newItem.name.trim()}
                  className="flex-1 bg-primary text-primary-foreground rounded-xl font-semibold"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Add to Fridge
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BarcodeScanner;
