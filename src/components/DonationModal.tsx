/**
 * src/components/DonationModal.tsx
 *
 * Shown to the regular user (donor) when they click "Donate" on a fridge item.
 * Displays a QR code that the admin scans to confirm the donation.
 * Auto-closes when the item is deleted from fridge (after admin blockchain confirmation).
 */

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, QrCode, CheckCircle, AlertTriangle, Wallet, Unlink, Loader2, ExternalLink } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import {
  connectMetaMask,
  isMetaMaskAvailable,
  isMobileDevice,
  getMetaMaskDeepLinkForCurrentPage,
} from "@/lib/blockchain";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemName: string;
  daysLeft: number;
  quantity?: number;
  unit?: string;
  userWalletAddress: string;
}

const DonationModal: React.FC<DonationModalProps> = ({
  isOpen,
  onClose,
  itemId,
  itemName,
  daysLeft,
  quantity = 1,
  unit = "pcs",
  userWalletAddress,
}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);
  const [tokensEarned, setTokensEarned] = useState(0);
  const [localWallet, setLocalWallet] = useState(userWalletAddress || "");
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [scannedByAdmin, setScannedByAdmin] = useState(false);

  const [donationQty, setDonationQty] = useState(quantity ?? 1);

  // Clamp donationQty when quantity prop changes
  useEffect(() => {
    setDonationQty(Math.min(donationQty, quantity ?? 1));
  }, [quantity]);

  const isCritical = daysLeft <= 5 && daysLeft >= 0;
  const isExpired = daysLeft < 0;
  const bonusTokens = isCritical ? 5 : 3;
  const hasValidWallet = /^0x[a-fA-F0-9]{40}$/.test(localWallet);
  const maxQty = quantity ?? 1;
  const isDonatingAll = donationQty >= maxQty;

  // Sync wallet from prop
  useEffect(() => {
    if (userWalletAddress) setLocalWallet(userWalletAddress);
  }, [userWalletAddress]);

  // QR code payload — admin scans this to confirm the donation
  const qrData = JSON.stringify({
    itemId,
    itemName,
    isCritical,
    bonusTokens,
    donationQuantity: donationQty,
    totalQuantity: maxQty,
    unit: unit ?? "pcs",
    userWalletAddress: localWallet,
    action: "food_donation",
    network: "sepolia",
  });

  // Prati donaciju: realtime + polling fallback
  useEffect(() => {
    if (!isOpen || !itemId) return;

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let alreadyConfirmed = false;
    // Pamtimo originalnu količinu kada se modal otvori
    let originalQuantity: number | null = null;

    const triggerConfirmed = () => {
      if (alreadyConfirmed) return;
      alreadyConfirmed = true;
      if (pollInterval) clearInterval(pollInterval);
      // Odmah osveži fridge listu
      queryClient.invalidateQueries({ queryKey: ["fridge_items"] });
      setScannedByAdmin(true);
      setTokensEarned(bonusTokens);
      setConfirmed(true);
      setTimeout(() => {
        setConfirmed(false);
        setScannedByAdmin(false);
        onClose();
      }, 4500);
    };

    // Realtime listener
    const channel = supabase
      .channel(`donation-watch-${itemId}-${Date.now()}`)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "fridge_items" }, (payload: any) => {
        const deletedId = payload.old?.id;
        if (deletedId === itemId) triggerConfirmed();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "fridge_items" }, (payload: any) => {
        if (payload.new?.id !== itemId) return;
        const newQty = payload.new?.quantity ?? 0;
        const oldQty = payload.old?.quantity ?? maxQty;
        if (newQty < oldQty) triggerConfirmed();
      })
      .subscribe();

    // Polling fallback — svake 2.5s provjeri da li item još postoji ili mu se smanjila količina
    pollInterval = setInterval(async () => {
      if (alreadyConfirmed) return;
      const { data, error } = await supabase.from("fridge_items").select("id, quantity").eq("id", itemId).maybeSingle();

      if (error) return;

      if (!data) {
        // Item obrisan — puna donacija
        triggerConfirmed();
        return;
      }

      // Zapamti originalnu količinu pri prvom pollu
      if (originalQuantity === null) {
        originalQuantity = data.quantity;
        return; // Čekaj sledeći poll da vidiš promenu
      }

      // Ako se količina smanjila u odnosu na originalnu — parcijalna donacija
      if (data.quantity < originalQuantity) {
        triggerConfirmed();
      }
    }, 2500);

    return () => {
      supabase.removeChannel(channel);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOpen, itemId, bonusTokens, maxQty]);

  // Connect MetaMask from within the modal
  const handleConnectWallet = async () => {
    if (!isMetaMaskAvailable() && isMobileDevice()) {
      window.location.href = getMetaMaskDeepLinkForCurrentPage();
      return;
    }
    if (!isMetaMaskAvailable()) return;

    setConnectingWallet(true);
    try {
      const address = await connectMetaMask();
      if (address) {
        setLocalWallet(address);
        // Save to profile
        await supabase.rpc("update_own_profile", { _wallet_address: address });
      }
    } catch {
      // ignore
    } finally {
      setConnectingWallet(false);
    }
  };

  // Disconnect wallet
  const handleDisconnectWallet = async () => {
    setLocalWallet("");
    await supabase.rpc("update_own_profile", { _wallet_address: "" });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-[9998] backdrop-blur-md"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 60 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8, y: 60 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className={`w-full max-w-sm rounded-3xl p-7 shadow-2xl pointer-events-auto flex flex-col items-center relative overflow-y-auto max-h-[90vh] transition-all ${
            isCritical ? "glass-card-strong bg-warning/10 border border-warning/30" : "glass-card-strong"
          }`}
        >
          {/* Close button */}
          <div className="absolute top-5 right-5">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-6 h-6" />
            </motion.button>
          </div>

          <AnimatePresence mode="wait">
            {confirmed ? (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full flex flex-col items-center py-6"
              >
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <h2 className="text-xl font-bold text-foreground">Donation Confirmed! 🎉</h2>
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  The admin verified your donation on the blockchain.
                </p>
                <div className="mt-3 px-4 py-2 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <p className="text-lg font-bold text-primary">+{tokensEarned} 🪙 Tokens Earned!</p>
                  <p className="text-xs text-muted-foreground">+{tokensEarned} Points added to your profile</p>
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Your donation of{" "}
                  <strong>
                    {donationQty} {unit ?? "pcs"}
                  </strong>{" "}
                  of {itemName} has been recorded on the blockchain.
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">Closing automatically...</p>
              </motion.div>
            ) : (
              <motion.div
                key="info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full flex flex-col items-center"
              >
                {isCritical && (
                  <div className="mb-3 px-3 py-1 rounded-full bg-warning/20 text-warning text-xs font-semibold">
                    ⏰ Priority Donation (+{bonusTokens} Tokens)
                  </div>
                )}

                <h2 className="text-xl font-bold text-foreground mt-2 text-center">
                  {isExpired ? "🗑️ Item Expired" : "🎁 Donate Item"}
                </h2>

                <div className="mt-4 mb-4 text-center">
                  <p className="text-lg font-semibold text-foreground">{itemName}</p>
                  {isCritical && <p className="text-sm text-warning mt-1 font-medium">⏰ Expires in {daysLeft} days</p>}
                </div>

                {!isExpired && (
                  <>
                    {/* Wallet Status Section */}
                    <div className="w-full mb-4 px-4 py-3 rounded-xl border border-border/30 bg-background/30">
                      {hasValidWallet ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-safe" />
                            <div>
                              <p className="text-xs font-semibold text-safe">Wallet Connected</p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {localWallet.slice(0, 10)}...{localWallet.slice(-6)}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleDisconnectWallet}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Unlink className="w-3 h-3" />
                            Disconnect
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4 text-warning" />
                            <p className="text-xs font-semibold text-warning">Wallet address required</p>
                          </div>

                          {isMetaMaskAvailable() ? (
                            <Button
                              onClick={handleConnectWallet}
                              disabled={connectingWallet}
                              variant="outline"
                              size="sm"
                              className="w-full border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                            >
                              {connectingWallet ? (
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                              )}
                              {connectingWallet ? "Connecting..." : "Connect MetaMask"}
                            </Button>
                          ) : isMobileDevice() ? (
                            <a
                              href={getMetaMaskDeepLinkForCurrentPage()}
                              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-orange-500/40 text-orange-400 text-sm hover:bg-orange-500/10"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Open in MetaMask App
                            </a>
                          ) : null}

                          <p className="text-[10px] text-muted-foreground">Or enter your wallet address manually:</p>
                          <Input
                            value={localWallet}
                            onChange={(e) => setLocalWallet(e.target.value)}
                            placeholder="0x..."
                            className="font-mono text-xs h-9"
                          />
                        </div>
                      )}
                    </div>

                    {/* Donation Quantity Selector */}
                    <div className="w-full mb-4 px-4 py-3 rounded-xl border border-border/30 bg-background/30">
                      <p className="text-xs font-semibold text-foreground mb-3">📦 How much do you want to donate?</p>
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() =>
                            setDonationQty((q) =>
                              Math.max(1, parseFloat((q - (unit === "kg" || unit === "l" ? 0.1 : 1)).toFixed(1))),
                            )
                          }
                          disabled={donationQty <= 1}
                          className="w-9 h-9 rounded-lg bg-muted/50 hover:bg-muted/70 flex items-center justify-center transition-colors disabled:opacity-30 text-foreground font-bold text-lg"
                        >
                          −
                        </button>
                        <div className="flex-1 text-center">
                          <span className="text-xl font-bold text-foreground">{donationQty}</span>
                          <span className="text-sm text-muted-foreground ml-1">{unit ?? "pcs"}</span>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            of {maxQty} {unit ?? "pcs"} total
                          </p>
                        </div>
                        <button
                          onClick={() =>
                            setDonationQty((q) =>
                              Math.min(maxQty, parseFloat((q + (unit === "kg" || unit === "l" ? 0.1 : 1)).toFixed(1))),
                            )
                          }
                          disabled={donationQty >= maxQty}
                          className="w-9 h-9 rounded-lg bg-muted/50 hover:bg-muted/70 flex items-center justify-center transition-colors disabled:opacity-30 text-foreground font-bold text-lg"
                        >
                          +
                        </button>
                      </div>
                      {isDonatingAll ? (
                        <p className="text-[10px] text-warning text-center mt-2">
                          ⚠️ Donating all — item will be removed from fridge
                        </p>
                      ) : (
                        <p className="text-[10px] text-safe text-center mt-2">
                          ✅ Remaining {(maxQty - donationQty).toFixed(1)} {unit ?? "pcs"} will stay in fridge
                        </p>
                      )}
                    </div>

                    {/* Instructions */}

                    <div className="w-full mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-center">
                      <QrCode className="w-5 h-5 text-primary mx-auto mb-1" />
                      <p className="text-xs text-muted-foreground">
                        Show this QR code to the{" "}
                        <span className="font-semibold text-foreground">donation center admin</span> — they will scan it
                        and confirm your donation.
                      </p>
                    </div>

                    {/* QR Code */}
                    <div
                      className={`bg-white rounded-2xl p-4 mb-4 shadow-sm ${!hasValidWallet ? "opacity-40 pointer-events-none" : ""}`}
                    >
                      <QRCodeSVG
                        value={qrData}
                        size={190}
                        level="H"
                        includeMargin={true}
                        fgColor="#000000"
                        bgColor="#ffffff"
                      />
                    </div>

                    {/* Waiting indicator */}
                    {hasValidWallet && (
                      <div className="w-full mb-3 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        Waiting for admin to scan and confirm...
                      </div>
                    )}

                    {/* Token reward info */}
                    <div className="w-full text-center mb-4 space-y-1 text-xs text-muted-foreground">
                      <p>✅ You earn +{bonusTokens} tokens when confirmed</p>
                      <p>🌱 Helps reduce food waste</p>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="w-full py-3 rounded-xl bg-muted/30 text-muted-foreground text-sm font-bold hover:bg-muted/50 transition-colors"
                    >
                      Close
                    </motion.button>
                  </>
                )}

                {isExpired && (
                  <>
                    <div className="mb-6 text-center px-4 py-3 rounded-lg bg-urgent/10 border border-urgent/20">
                      <p className="text-sm text-urgent">
                        This item has expired and should be removed from your fridge.
                      </p>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="w-full py-3 rounded-lg bg-primary/20 text-primary text-sm font-bold hover:bg-primary/30 transition-colors"
                    >
                      Close
                    </motion.button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>
  );
};

export default DonationModal;
