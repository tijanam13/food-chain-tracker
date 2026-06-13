/**
 * src/pages/AdminScan.tsx
 *
 * Admin-only QR scanner page.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  QrCode,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Wallet,
  ExternalLink,
  PenLine,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
  connectMetaMask,
  recordDonationOnChain,
  canUseMetaMaskDirectly,
  isMobileDevice,
  getMetaMaskDeepLink,
  isValidEthAddress,
  switchToSepolia,
  checkNetwork,
  type DonationResult,
} from "@/lib/blockchain";

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface QRDonationData {
  itemId: string;
  itemName: string;
  isCritical: boolean;
  bonusTokens: number;
  donationQuantity?: number;
  totalQuantity?: number;
  unit?: string;
  userWalletAddress: string;
  action: string;
  network: string;
}

type WalletStep = "choose" | "connecting" | "manual-input" | "connected";
type PageStep = "wallet" | "scanner" | "confirm" | "processing" | "success" | "error";

const SCANNER_ID = "admin-qr-reader";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const AdminScan = () => {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── Wallet ──
  const [walletStep, setWalletStep] = useState<WalletStep>("choose");
  const [adminWalletAddress, setAdminWalletAddress] = useState("");
  const [manualAddressInput, setManualAddressInput] = useState("");
  const [manualAddressError, setManualAddressError] = useState("");
  const [isOnSepolia, setIsOnSepolia] = useState(false);

  // ── Page flow ──
  const [step, setStep] = useState<PageStep>("wallet");
  const [scannedData, setScannedData] = useState<QRDonationData | null>(null);
  const [txResult, setTxResult] = useState<DonationResult | null>(null);
  const [scanning, setScanning] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  // ── Camera cleanup on unmount ──
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  // ── Listen for MetaMask network changes ──
  useEffect(() => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;
    const handleChainChange = async () => {
      const net = await checkNetwork();
      setIsOnSepolia(net.ok);
    };
    ethereum.on("chainChanged", handleChainChange);
    return () => ethereum.removeListener("chainChanged", handleChainChange);
  }, []);

  // ─── WALLET ──────────────────────────────────────────────────────────

  const handleConnectMetaMask = async () => {
    setWalletStep("connecting");
    try {
      const address = await connectMetaMask();
      const net = await checkNetwork();
      setIsOnSepolia(net.ok);
      setAdminWalletAddress(address);
      setWalletStep("connected");
      setStep("scanner");
      toast({ title: "✅ Wallet Connected", description: `${address.slice(0, 8)}...${address.slice(-6)}` });
    } catch (err: any) {
      setWalletStep("choose");
      toast({ title: "Connection Error", description: err.message, variant: "destructive" });
    }
  };

  const handleSwitchToSepolia = async () => {
    try {
      await switchToSepolia();
      const net = await checkNetwork();
      setIsOnSepolia(net.ok);
      if (net.ok) toast({ title: "✅ Sepolia Testnet Active" });
    } catch (err: any) {
      toast({ title: "Network Error", description: err.message, variant: "destructive" });
    }
  };

  const handleManualAddressSubmit = () => {
    const addr = manualAddressInput.trim();
    if (!isValidEthAddress(addr)) {
      setManualAddressError("Please enter a valid Ethereum address (0x...)");
      return;
    }
    setAdminWalletAddress(addr);
    setWalletStep("connected");
    setStep("scanner");
    toast({ title: "✅ Address Confirmed", description: `${addr.slice(0, 8)}...` });
  };

  // ─── SCANNER ─────────────────────────────────────────────────────────

  const destroyScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      await s.clear();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
  }, []);

  const stopScanner = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
    } catch {
      /* ignore */
    }
    setScanning(false);
  }, []);

  const startScanner = async () => {
    await destroyScanner();
    try {
      const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          setScanning(false);
          handleQRScanned(decodedText);
        },
        undefined,
      );
      setScanning(true);
    } catch {
      setScanning(false);
      toast({
        title: "Camera Error",
        description: "Could not start camera. Please allow camera access.",
        variant: "destructive",
      });
    }
  };

  const handleQRScanned = (rawText: string) => {
    try {
      const data: QRDonationData = JSON.parse(rawText);
      if (!data.itemName || !data.userWalletAddress || data.action !== "food_donation") {
        toast({
          title: "Invalid QR Code",
          description: "This is not a valid EatSmart donation QR code.",
          variant: "destructive",
        });
        return;
      }
      setScannedData(data);
      setStep("confirm");
      toast({ title: "✅ QR Scanned!", description: `Found: ${data.itemName}` });
    } catch {
      toast({ title: "Read Error", description: "Could not parse QR code. Please try again.", variant: "destructive" });
    }
  };

  // ─── BLOCKCHAIN ──────────────────────────────────────────────────────

  const handleConfirmOnChain = async () => {
    if (!scannedData || !user) return;

    const donorWallet = scannedData.userWalletAddress?.trim();
    if (!isValidEthAddress(donorWallet)) {
      toast({
        title: "Invalid Wallet",
        description: "Donor wallet address is missing or invalid.",
        variant: "destructive",
      });
      return;
    }

    setStep("processing");

    const result = await recordDonationOnChain(donorWallet, scannedData.itemName, scannedData.isCritical);

    setTxResult(result);

    if (!result.success) {
      setStep("error");
      return;
    }

    // Sync with Supabase after blockchain confirmation.
    // Uses SECURITY DEFINER RPC so admin can modify any user's fridge items (bypasses RLS).
    try {
      const donated = scannedData.donationQuantity ?? scannedData.totalQuantity ?? 1;
      const total = scannedData.totalQuantity ?? donated;

      const { error: rpcError } = await supabase.rpc("admin_confirm_donation", {
        _item_id: scannedData.itemId || null,
        _item_name: scannedData.itemName,
        _donor_wallet: donorWallet,
        _donated_qty: donated,
        _total_qty: total,
        _unit: scannedData.unit ?? "pcs",
        _is_critical: scannedData.isCritical,
      });

      if (rpcError) {
        console.error("admin_confirm_donation RPC error:", rpcError.message);
      }
    } catch (err: any) {
      console.error("Database sync error:", err.message);
      // Don't fail — blockchain is source of truth
    }

    setStep("success");
  };

  // ─── RESET ───────────────────────────────────────────────────────────

  const handleReset = async () => {
    await destroyScanner();
    setStep("scanner");
    setScannedData(null);
    setTxResult(null);
    setScanning(false);
  };

  const handleFullReset = async () => {
    await destroyScanner();
    setStep("wallet");
    setWalletStep("choose");
    setAdminWalletAddress("");
    setScannedData(null);
    setTxResult(null);
    setScanning(false);
  };

  // ─── LOADING / GUARD ─────────────────────────────────────────────────

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  // ─── RENDER ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      <div className="relative z-10 pb-28 px-5 pt-10 flex flex-col items-center">
        {/* ── Header ── */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md mb-6">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
              <ShieldCheck className="text-primary" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold">Admin — QR Scanner</h1>
              <p className="text-xs text-muted-foreground">Blockchain Donations • Sepolia Testnet</p>
            </div>
          </div>

          {adminWalletAddress && step !== "wallet" && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-safe/10 border border-safe/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-safe" />
                <span className="text-xs text-safe font-mono">
                  {adminWalletAddress.slice(0, 10)}...{adminWalletAddress.slice(-6)}
                </span>
                {!isOnSepolia && (
                  <button onClick={handleSwitchToSepolia} className="text-[10px] text-yellow-400 underline ml-1">
                    Switch to Sepolia
                  </button>
                )}
              </div>
              <button onClick={handleFullReset} className="text-[10px] underline text-muted-foreground">
                Change
              </button>
            </div>
          )}
        </motion.div>

        {/* ── Step Content ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {/* ═══════════════════════════════════════
                STEP 1 — WALLET SELECTION
            ═══════════════════════════════════════ */}
            {step === "wallet" && (
              <motion.div
                key="wallet"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-6 flex flex-col gap-4"
              >
                <div className="text-center mb-2">
                  <Wallet className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h2 className="text-lg font-bold">Connect Admin Wallet</h2>
                  <p className="text-xs text-muted-foreground">Required to sign blockchain transactions</p>
                </div>

                {walletStep === "connecting" && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Connecting to MetaMask...</p>
                  </div>
                )}

                {walletStep === "manual-input" && (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-muted-foreground">Enter your Ethereum wallet address:</p>
                    <Input
                      value={manualAddressInput}
                      onChange={(e) => {
                        setManualAddressInput(e.target.value);
                        setManualAddressError("");
                      }}
                      placeholder="0x..."
                      className="font-mono text-xs"
                    />
                    {manualAddressError && <p className="text-xs text-destructive">{manualAddressError}</p>}
                    <Button onClick={handleManualAddressSubmit} className="w-full">
                      Confirm Address
                    </Button>
                    <Button onClick={() => setWalletStep("choose")} variant="outline" className="w-full">
                      Back
                    </Button>
                  </div>
                )}

                {walletStep === "choose" && (
                  <>
                    {canUseMetaMaskDirectly() ? (
                      <button
                        onClick={handleConnectMetaMask}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20 transition-colors text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                          <Wallet className="text-orange-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">Connect MetaMask</p>
                          <p className="text-xs text-muted-foreground">Direct connection • Recommended</p>
                        </div>
                        <CheckCircle className="text-safe ml-auto shrink-0 w-5 h-5" />
                      </button>
                    ) : (
                      <div className="w-full rounded-xl bg-orange-500/10 border border-orange-500/20 p-4 flex flex-col gap-3">
                        <p className="text-xs font-semibold text-orange-300">MetaMask not detected</p>
                        <p className="text-xs text-muted-foreground">
                          To sign transactions on mobile, open this page inside the MetaMask app browser (🌐 icon inside
                          MetaMask).
                        </p>
                        <a
                          href={getMetaMaskDeepLink()}
                          className="w-full py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" /> Open in MetaMask App
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border/50" />
                      <span className="text-xs text-muted-foreground">or</span>
                      <div className="flex-1 h-px bg-border/50" />
                    </div>

                    <button
                      onClick={() => setWalletStep("manual-input")}
                      className="w-full flex items-center gap-4 px-4 py-4 rounded-xl bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center flex-shrink-0">
                        <PenLine className="text-muted-foreground w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Enter Address Manually</p>
                        <p className="text-xs text-muted-foreground">No MetaMask required for manual entry</p>
                      </div>
                    </button>
                  </>
                )}
              </motion.div>
            )}

            {/* ═══════════════════════════════════════
                STEP 2 — SCANNER
            ═══════════════════════════════════════ */}
            {step === "scanner" && (
              <motion.div
                key="scanner"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-6 flex flex-col items-center gap-5"
              >
                <div className="text-center">
                  <QrCode className="w-10 h-10 text-primary mx-auto mb-2" />
                  <h2 className="text-lg font-bold">Scan Donor QR Code</h2>
                  <p className="text-sm text-muted-foreground">
                    Ask the donor to show their QR code from the Fridge section
                  </p>
                </div>

                <div className="w-full rounded-2xl overflow-hidden bg-black/30 min-h-[290px] relative border border-border/30">
                  <div id={SCANNER_ID} className="w-full" />
                  {!scanning && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 gap-2">
                      <QrCode className="w-14 h-14 opacity-25" />
                      <p className="text-sm text-muted-foreground">Press the button below to start the camera</p>
                    </div>
                  )}
                  {scanning && (
                    <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-safe/80 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] text-white font-bold">SCANNING</span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={scanning ? stopScanner : startScanner}
                  className="w-full"
                  variant={scanning ? "outline" : "default"}
                  size="lg"
                >
                  {scanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Stop Camera
                    </>
                  ) : (
                    <>
                      <QrCode className="w-4 h-4 mr-2" />
                      Start Camera & Scan
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════
                STEP 3 — CONFIRM
            ═══════════════════════════════════════ */}
            {step === "confirm" && scannedData && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card rounded-2xl p-6 flex flex-col gap-5"
              >
                <div className="text-center">
                  <CheckCircle className="w-10 h-10 text-safe mx-auto mb-2" />
                  <h2 className="text-lg font-bold">QR Scanned!</h2>
                  <p className="text-sm text-muted-foreground">
                    Review the donation details before sending to blockchain
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-background/40 border">
                    <span className="text-sm text-muted-foreground">Item</span>
                    <span className="text-sm font-bold">{scannedData.itemName}</span>
                  </div>

                  <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-background/40 border">
                    <span className="text-sm text-muted-foreground">Donating</span>
                    <span className="text-sm font-bold">
                      {scannedData.donationQuantity ?? scannedData.totalQuantity ?? 1} {scannedData.unit ?? "pcs"}
                      {scannedData.totalQuantity &&
                      scannedData.donationQuantity &&
                      scannedData.donationQuantity < scannedData.totalQuantity
                        ? ` (od ${scannedData.totalQuantity})`
                        : " (sve)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-background/40 border">
                    <span className="text-sm text-muted-foreground">Type</span>
                    <span
                      className={`text-xs font-bold px-2 py-1 rounded-full ${scannedData.isCritical ? "bg-danger/20 text-danger" : "bg-safe/20 text-safe"}`}
                    >
                      {scannedData.isCritical ? "⚠️ Critical" : "✅ Normal"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-3 px-4 rounded-xl bg-primary/10 border border-primary/20">
                    <span className="text-sm text-muted-foreground">Tokens for donor</span>
                    <span className="text-sm font-bold text-primary">+{scannedData.isCritical ? 5 : 3} 🪙</span>
                  </div>

                  <div className="py-3 px-4 rounded-xl bg-background/40 border">
                    <p className="text-xs text-muted-foreground mb-1">Donor wallet</p>
                    <p className="text-xs font-mono break-all text-foreground/80">{scannedData.userWalletAddress}</p>
                  </div>
                </div>

                <div className="px-3 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
                  <p className="text-xs text-orange-300 leading-relaxed">
                    <strong>MetaMask will open</strong> to sign the transaction. Review the details before confirming.
                  </p>
                </div>

                <Button onClick={handleConfirmOnChain} className="w-full bg-primary" size="lg">
                  <Wallet className="w-4 h-4 mr-2" />
                  Confirm on Blockchain
                </Button>

                <Button onClick={handleReset} variant="outline" className="w-full">
                  Cancel / Scan Again
                </Button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════
                STEP 4 — PROCESSING
            ═══════════════════════════════════════ */}
            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-8 flex flex-col items-center gap-5"
              >
                <Loader2 className="w-14 h-14 text-primary animate-spin" />
                <h2 className="text-lg font-bold text-center">Processing on Blockchain</h2>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  Waiting for transaction confirmation on the Sepolia network. This may take 15–30 seconds.
                </p>
                <div className="w-full py-3 px-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <p className="text-xs text-muted-foreground">Do not close this page</p>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════
                STEP 5 — SUCCESS
            ═══════════════════════════════════════ */}
            {step === "success" && txResult && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-7 flex flex-col items-center gap-5"
              >
                <CheckCircle className="w-16 h-16 text-safe" />
                <h2 className="text-xl font-bold">Donation Confirmed! 🎉</h2>
                <p className="text-sm text-center text-muted-foreground">
                  The blockchain has permanently recorded this food donation.
                </p>

                <div className="w-full py-5 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <p className="text-3xl font-bold text-primary">+{txResult.tokensAwarded} 🪙</p>
                  <p className="text-xs text-muted-foreground mt-1">Awarded to donor wallet</p>
                </div>

                {txResult.etherscanUrl && (
                  <a
                    href={txResult.etherscanUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-3 rounded-xl bg-blue-500/15 text-blue-400 text-sm font-bold flex items-center justify-center gap-2 hover:bg-blue-500/25 transition-colors border border-blue-500/20"
                  >
                    <ExternalLink className="w-4 h-4" /> View on Etherscan
                  </a>
                )}

                {txResult.txHash && (
                  <div className="w-full py-3 px-4 rounded-xl bg-background/40 border">
                    <p className="text-xs text-muted-foreground mb-1">TX Hash</p>
                    <p className="text-[11px] font-mono break-all text-foreground/70">{txResult.txHash}</p>
                  </div>
                )}

                <Button onClick={handleReset} className="w-full" size="lg">
                  <QrCode className="w-4 h-4 mr-2" />
                  Scan Next Donation
                </Button>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════
                STEP 6 — ERROR
            ═══════════════════════════════════════ */}
            {step === "error" && txResult && (
              <motion.div
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card rounded-2xl p-7 flex flex-col items-center gap-5"
              >
                <AlertCircle className="w-14 h-14 text-danger" />
                <h2 className="text-lg font-bold">Transaction Failed</h2>

                <div className="w-full py-3 px-4 rounded-xl bg-danger/10 border border-danger/20">
                  <p className="text-sm text-center text-danger/80">{txResult.error}</p>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  Make sure you have enough Sepolia ETH for gas fees, and that MetaMask is on the Sepolia testnet.
                </p>

                <Button onClick={handleReset} className="w-full" variant="outline">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminScan;
