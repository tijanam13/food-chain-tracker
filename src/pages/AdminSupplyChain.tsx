import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    Package,
    Plus,
    Truck,
    List,
    CheckCircle,
    Loader2,
    ExternalLink,
    MapPin,
    User,
    Clock,
    FileText,
    ChevronDown,
    ChevronUp,
    Wallet,
    QrCode,
    Download,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNav from "@/components/BottomNav";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import {
    registerProductOnChain,
    addEventOnChain,
    getProductInfoFromChain,
    getFullHistoryFromChain,
    getAllProductsFromChain,
    type ProductInfo,
    type ProductEvent,
    type EventType,
    EVENT_TYPE_LABELS,
} from "@/lib/productChain";
import {
    connectMetaMask,
    canUseMetaMaskDirectly,
    getMetaMaskDeepLink,
    checkNetwork,
    switchToSepolia,
} from "@/lib/blockchain";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const APP_URL = window.location.origin;

const EVENT_TYPE_OPTIONS = [
    { value: 1, label: "Transported", icon: "🚛" },
    { value: 2, label: "Stored", icon: "🏭" },
    { value: 3, label: "Donated", icon: "🤝" },
    { value: 4, label: "Sold", icon: "🛒" },
];

const EVENT_ICONS: Record<number, string> = {
    0: "🌱",
    1: "🚛",
    2: "🏭",
    3: "🤝",
    4: "🛒",
};

const generateQrCode = () =>
    "PROD-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7).toUpperCase();

const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Tab = "register" | "add-event" | "products";

interface ProductWithInfo {
    qrCode: string;
    info: ProductInfo | null;
    events: ProductEvent[];
    expanded: boolean;
    loading: boolean;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const AdminSupplyChain = () => {
    const { isAdmin, loading: adminLoading } = useAdmin();
    const { toast } = useToast();

    // ── Wallet ──
    const [walletAddress, setWalletAddress] = useState("");
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletConnecting, setWalletConnecting] = useState(false);
    const [isOnSepolia, setIsOnSepolia] = useState(false);

    // ── Tabs ──
    const [activeTab, setActiveTab] = useState<Tab>("register");

    // ── Register ──
    const [regName, setRegName] = useState("");
    const [regOrigin, setRegOrigin] = useState("");
    const [regProducer, setRegProducer] = useState("");
    const [regLoading, setRegLoading] = useState(false);
    const [regQr, setRegQr] = useState("");
    const [regTxUrl, setRegTxUrl] = useState("");
    const [regDate, setRegDate] = useState("");
    const [regTime, setRegTime] = useState("");
    const [regSeconds, setRegSeconds] = useState("00");

    // ── Add Event ──
    const [evtQr, setEvtQr] = useState("");
    const [evtType, setEvtType] = useState<EventType>(1);
    const [evtLocation, setEvtLocation] = useState("");
    const [evtActor, setEvtActor] = useState("");
    const [evtNotes, setEvtNotes] = useState("");
    const [evtLoading, setEvtLoading] = useState(false);
    const [evtTxUrl, setEvtTxUrl] = useState("");
    const [evtDate, setEvtDate] = useState("");
    const [evtTime, setEvtTime] = useState("");
    const [evtSeconds, setEvtSeconds] = useState("00");

    // ── Products list ──
    const [products, setProducts] = useState<ProductWithInfo[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);

    // ─── WALLET ──────────────────────────────────────────────────────────

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

    const handleConnectWallet = async () => {
        setWalletConnecting(true);
        try {
            const address = await connectMetaMask();
            const net = await checkNetwork();
            setIsOnSepolia(net.ok);
            setWalletAddress(address);
            setWalletConnected(true);
            toast({ title: "✅ MetaMask connected", description: `${address.slice(0, 8)}...${address.slice(-6)}` });
        } catch (err: any) {
            toast({ title: "Connection error", description: err.message, variant: "destructive" });
        } finally {
            setWalletConnecting(false);
        }
    };

    const handleSwitchSepolia = async () => {
        try {
            await switchToSepolia();
            const net = await checkNetwork();
            setIsOnSepolia(net.ok);
            if (net.ok) toast({ title: "✅ Sepolia Testnet Active" });
        } catch (err: any) {
            toast({ title: "Network error", description: err.message, variant: "destructive" });
        }
    };

    // ─── REGISTER ────────────────────────────────────────────────────────

    const handleRegister = async () => {
        if (!regName || !regOrigin || !regProducer) {
            toast({ title: "All fields are required.", variant: "destructive" });
            return;
        }

        let eventDateUnix: number;
        if (regDate) {
            const timeStr = regTime ? `${regTime}:${regSeconds.padStart(2, "0")}` : `00:00:00`;
            eventDateUnix = Math.floor(new Date(`${regDate}T${timeStr}`).getTime() / 1000);
        } else {
            eventDateUnix = Math.floor(Date.now() / 1000);
        }

        const qr = generateQrCode();
        setRegLoading(true);
        setRegQr("");
        setRegTxUrl("");
        const result = await registerProductOnChain(qr, regName, regOrigin, regProducer, eventDateUnix);
        setRegLoading(false);
        if (result.success) {
            setRegQr(qr);
            setRegTxUrl(result.etherscanUrl || "");
            toast({ title: "Product registered on blockchain!" });
            setRegName("");
            setRegOrigin("");
            setRegProducer("");
            setRegDate("");
            setRegTime("");
            setRegSeconds("00");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    const handleDownloadQR = () => {
        const svg = document.getElementById("product-qr-svg");
        if (!svg) return;
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 300;
        const ctx = canvas.getContext("2d");
        const img = new Image();
        img.onload = () => {
            ctx?.drawImage(img, 0, 0, 300, 300);
            const a = document.createElement("a");
            a.download = `${regQr}.png`;
            a.href = canvas.toDataURL("image/png");
            a.click();
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    // ─── ADD EVENT ───────────────────────────────────────────────────────

    const handleAddEvent = async () => {
        if (!evtQr || !evtLocation || !evtActor) {
            toast({ title: "QR code, location and actor are required.", variant: "destructive" });
            return;
        }

        let eventDateUnix: number;
        if (evtDate) {
            const timeStr = evtTime ? `${evtTime}:${evtSeconds.padStart(2, "0")}` : `00:00:00`;
            eventDateUnix = Math.floor(new Date(`${evtDate}T${timeStr}`).getTime() / 1000);
        } else {
            eventDateUnix = Math.floor(Date.now() / 1000);
        }

        setEvtLoading(true);
        setEvtTxUrl("");
        const result = await addEventOnChain(evtQr, evtType, evtLocation, evtActor, evtNotes, eventDateUnix);
        setEvtLoading(false);
        if (result.success) {
            setEvtTxUrl(result.etherscanUrl || "");
            toast({ title: "Event added to blockchain!" });
            setEvtQr("");
            setEvtLocation("");
            setEvtActor("");
            setEvtNotes("");
            setEvtDate("");
            setEvtTime("");
            setEvtSeconds("00");
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };

    // ─── PRODUCTS LIST ───────────────────────────────────────────────────

    const loadProducts = async () => {
        setProductsLoading(true);
        const qrCodes = await getAllProductsFromChain();
        const initial: ProductWithInfo[] = qrCodes.map((qr) => ({
            qrCode: qr,
            info: null,
            events: [],
            expanded: false,
            loading: true,
        }));
        setProducts(initial);
        setProductsLoading(false);
        // Fetch info eagerly so product names show right away
        qrCodes.forEach(async (qr, i) => {
            const info = await getProductInfoFromChain(qr);
            setProducts((prev) =>
                prev.map((item, idx) => (idx === i ? { ...item, info, loading: false } : item))
            );
        });
    };

    useEffect(() => {
        if (activeTab === "products") loadProducts();
    }, [activeTab]);

    const toggleProduct = async (index: number) => {
        const p = products[index];
        if (p.expanded) {
            setProducts((prev) =>
                prev.map((item, i) => (i === index ? { ...item, expanded: false } : item))
            );
            return;
        }
        if (p.events.length === 0) {
            setProducts((prev) =>
                prev.map((item, i) => (i === index ? { ...item, loading: true } : item))
            );
            const events = await getFullHistoryFromChain(p.qrCode);
            setProducts((prev) =>
                prev.map((item, i) =>
                    i === index ? { ...item, events, expanded: true, loading: false } : item
                )
            );
        } else {
            setProducts((prev) =>
                prev.map((item, i) => (i === index ? { ...item, expanded: true } : item))
            );
        }
    };

    // ─── GUARD ───────────────────────────────────────────────────────────

    if (adminLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="animate-spin text-primary" />
            </div>
        );
    }
    if (!isAdmin) return null;

    // ─── RENDER ──────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background relative overflow-x-hidden">
            <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />
            <div className="absolute top-60 right-0 w-[300px] h-[300px] rounded-full bg-coral/4 blur-[100px] pointer-events-none" />

            <div className="relative z-10 pb-28 px-5 pt-10">
                {/* ── Header ── */}
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center">
                        <ShieldCheck className="text-primary w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-display text-xl font-bold text-foreground">Supply Chain</h1>
                        <p className="text-xs text-muted-foreground">Admin • Sepolia Testnet</p>
                    </div>
                </div>

                {/* ── Wallet banner ── */}
                {!walletConnected ? (
                    <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-5 rounded-2xl bg-orange-500/10 border border-orange-500/30 p-4"
                    >
                        <div className="flex items-start gap-3">
                            <Wallet className="w-5 h-5 text-orange-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-orange-300 mb-1">MetaMask not connected</p>
                                <p className="text-xs text-muted-foreground mb-3">
                                    Required for signing blockchain transactions.
                                </p>
                                {canUseMetaMaskDirectly() ? (
                                    <Button
                                        onClick={handleConnectWallet}
                                        disabled={walletConnecting}
                                        size="sm"
                                        className="bg-orange-500 hover:bg-orange-600 text-white"
                                    >
                                        {walletConnecting ? (
                                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Connecting...</>
                                        ) : (
                                            <><Wallet className="w-3 h-3 mr-2" /> Connect MetaMask</>
                                        )}
                                    </Button>
                                ) : (
                                    <a
                                        href={getMetaMaskDeepLink()}
                                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500 text-white text-xs font-bold"
                                    >
                                        <ExternalLink className="w-3 h-3" /> Otvori u MetaMask App
                                    </a>
                                )}
                            </div>
                        </div>
                    </motion.div>
                ) : (
                    <div className="mb-5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs text-green-400 font-mono">
                                {walletAddress.slice(0, 10)}...{walletAddress.slice(-6)}
                            </span>
                            {!isOnSepolia && (
                                <button onClick={handleSwitchSepolia} className="text-[10px] text-yellow-400 underline ml-1">
                                    Switch to Sepolia
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => { setWalletConnected(false); setWalletAddress(""); }}
                            className="text-[10px] text-muted-foreground underline"
                        >
                            Disconnect
                        </button>
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="flex gap-2 mb-5">
                    {([
                        { id: "register", label: "Register", icon: Plus },
                        { id: "add-event", label: "Add Event", icon: Truck },
                        { id: "products", label: "Products", icon: List },
                    ] as const).map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors flex flex-col items-center gap-1 ${activeTab === id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {label}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {/* ══════════════════════════════════
              TAB 1 — REGISTER PRODUCT
          ══════════════════════════════════ */}
                    {activeTab === "register" && (
                        <motion.div
                            key="register"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="glass-card-strong rounded-2xl p-3 space-y-2">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Package className="w-4 h-4 text-primary" />
                                    <h2 className="text-sm font-semibold text-foreground">Register new product</h2>
                                </div>
                                <Input
                                    placeholder="Product name (e.g. Organic Honey)"
                                    value={regName}
                                    onChange={(e) => setRegName(e.target.value)}
                                    className="h-8 text-xs"
                                />
                                <Input
                                    placeholder="Origin (e.g. Topola, Serbia)"
                                    value={regOrigin}
                                    onChange={(e) => setRegOrigin(e.target.value)}
                                    className="h-8 text-xs"
                                />
                                <Input
                                    placeholder="Producer (e.g. Petrović Apiary)"
                                    value={regProducer}
                                    onChange={(e) => setRegProducer(e.target.value)}
                                    className="h-8 text-xs"
                                />

                                <div>
                                    <p className="text-xs text-muted-foreground mb-1.5">Production date & time (when it was produced)</p>
                                    <div className="flex gap-2">
                                        <Input
                                            type="date"
                                            value={regDate}
                                            onChange={(e) => setRegDate(e.target.value)}
                                            className="h-8 text-xs flex-1"
                                        />
                                        <Input
                                            type="time"
                                            value={regTime}
                                            onChange={(e) => setRegTime(e.target.value)}
                                            className="h-8 text-xs w-24"
                                        />
                                        <Input
                                            type="number"
                                            min="0"
                                            max="59"
                                            placeholder="ss"
                                            value={regSeconds}
                                            onChange={(e) => setRegSeconds(e.target.value)}
                                            className="h-8 text-xs w-16"
                                        />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use current time</p>
                                </div>
                                <Button
                                    onClick={handleRegister}
                                    disabled={regLoading || !walletConnected}
                                    className="w-full"
                                >
                                    {regLoading ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Registering...</>
                                    ) : (
                                        <><Plus className="w-4 h-4 mr-2" /> Register on Blockchain</>
                                    )}
                                </Button>
                                {!walletConnected && (
                                    <p className="text-xs text-center text-muted-foreground">
                                        Connect MetaMask to register a product
                                    </p>
                                )}
                            </div>

                            {/* QR result */}
                            {regQr && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="glass-card-strong rounded-2xl p-5 flex flex-col items-center gap-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                        <p className="text-sm font-semibold text-foreground">Product registered!</p>
                                    </div>

                                    <div className="p-3 bg-white rounded-xl">
                                        <QRCodeSVG
                                            id="product-qr-svg"
                                            value={`${APP_URL}/product/${regQr}`}
                                            size={180}
                                            includeMargin={false}
                                        />
                                    </div>

                                    <div className="w-full text-center space-y-1">
                                        <p className="text-[11px] text-muted-foreground font-mono break-all">{regQr}</p>
                                        <p className="text-[10px] text-muted-foreground">
                                            Scan this QR code to open the public product history page
                                        </p>
                                    </div>

                                    <div className="flex gap-2 w-full">
                                        <Button onClick={handleDownloadQR} variant="outline" className="flex-1 text-xs">
                                            <Download className="w-3 h-3 mr-1.5" /> Download QR
                                        </Button>
                                        {regTxUrl && (
                                            <a
                                                href={regTxUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-1.5 text-xs text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors"
                                            >
                                                <ExternalLink className="w-3 h-3" /> Etherscan
                                            </a>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </motion.div>
                    )}

                    {/* ══════════════════════════════════
              TAB 2 — ADD EVENT
          ══════════════════════════════════ */}
                    {activeTab === "add-event" && (
                        <motion.div
                            key="add-event"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="glass-card-strong rounded-2xl p-3 space-y-2"
                        >
                            <div className="flex items-center gap-2 mb-0.5">
                                <Truck className="w-4 h-4 text-primary" />
                                <h2 className="text-sm font-semibold text-foreground">Add event to chain</h2>
                            </div>

                            <Input
                                placeholder="Product QR code (e.g. PROD-123...)"
                                value={evtQr}
                                onChange={(e) => setEvtQr(e.target.value)}
                                className="font-mono text-xs h-8"
                            />

                            <div>
                                <p className="text-xs text-muted-foreground mb-1.5">Event type</p>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {EVENT_TYPE_OPTIONS.map((opt) => (
                                        <button
                                            key={opt.value}
                                            onClick={() => setEvtType(opt.value as EventType)}
                                            className={`py-2 rounded-xl text-xs font-semibold transition-colors ${evtType === opt.value
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted text-muted-foreground hover:text-foreground"
                                                }`}
                                        >
                                            {opt.icon} {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Input
                                placeholder="Location (e.g. Belgrade, Serbia)"
                                value={evtLocation}
                                onChange={(e) => setEvtLocation(e.target.value)}
                                className="h-8 text-xs"
                            />
                            <Input
                                placeholder="Actor (e.g. Transport Company XY)"
                                value={evtActor}
                                onChange={(e) => setEvtActor(e.target.value)}
                                className="h-8 text-xs"
                            />
                            <Input
                                placeholder="Notes (optional)"
                                value={evtNotes}
                                onChange={(e) => setEvtNotes(e.target.value)}
                                className="h-8 text-xs"
                            />

                            <div>
                                <p className="text-xs text-muted-foreground mb-1.5">Event date & time (when it actually happened)</p>
                                <div className="flex gap-2">
                                    <Input
                                        type="date"
                                        value={evtDate}
                                        onChange={(e) => setEvtDate(e.target.value)}
                                        className="h-8 text-xs flex-1"
                                    />
                                    <Input
                                        type="time"
                                        value={evtTime}
                                        onChange={(e) => setEvtTime(e.target.value)}
                                        className="h-8 text-xs w-24"
                                    />
                                    <Input
                                        type="number"
                                        min="0"
                                        max="59"
                                        placeholder="ss"
                                        value={evtSeconds}
                                        onChange={(e) => setEvtSeconds(e.target.value)}
                                        className="h-8 text-xs w-16"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use current time</p>
                            </div>

                            <Button
                                onClick={handleAddEvent}
                                disabled={evtLoading || !walletConnected}
                                className="w-full"
                            >
                                {evtLoading ? (
                                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Adding...</>
                                ) : (
                                    <><Plus className="w-4 h-4 mr-2" /> Add Event</>
                                )}
                            </Button>

                            {!walletConnected && (
                                <p className="text-xs text-center text-muted-foreground">
                                    Connect MetaMask to add an event
                                </p>
                            )}

                            {evtTxUrl && (
                                <a
                                    href={evtTxUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline"
                                >
                                    <ExternalLink className="w-3 h-3" /> View on Etherscan
                                </a>
                            )}
                        </motion.div>
                    )}

                    {/* ══════════════════════════════════
              TAB 3 — ALL PRODUCTS
          ══════════════════════════════════ */}
                    {activeTab === "products" && (
                        <motion.div
                            key="products"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-3"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <List className="w-4 h-4 text-primary" />
                                    <h2 className="text-sm font-semibold text-foreground">
                                        All Products ({products.length})
                                    </h2>
                                </div>
                                <button
                                    onClick={loadProducts}
                                    disabled={productsLoading}
                                    className="text-xs text-primary hover:underline disabled:opacity-50"
                                >
                                    {productsLoading ? "Loading..." : "Refresh"}
                                </button>
                            </div>

                            {productsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : products.length === 0 ? (
                                <div className="glass-card-strong rounded-2xl p-8 text-center">
                                    <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                                    <p className="text-sm text-muted-foreground">No registered products.</p>
                                </div>
                            ) : (
                                products.map((p, index) => (
                                    <motion.div
                                        key={p.qrCode}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.04 }}
                                        className="glass-card-strong rounded-2xl overflow-hidden"
                                    >
                                        {/* Product header row */}
                                        <button
                                            onClick={() => toggleProduct(index)}
                                            className="w-full p-4 flex items-center justify-between text-left"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center text-sm">
                                                    📦
                                                </div>
                                                <div>
                                                    {p.loading ? (
                                                        <>
                                                            <div className="h-3.5 bg-muted/50 rounded w-32 animate-pulse mb-1" />
                                                            <div className="h-2.5 bg-muted/30 rounded w-20 animate-pulse" />
                                                        </>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-semibold text-foreground">
                                                                {p.info?.name ?? "Unknown product"}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {p.info?.originLocation ?? ""} {p.info?.producerName ? "· " + p.info.producerName : ""}
                                                            </p>
                                                            <p className="text-[10px] font-mono text-primary/70 mt-0.5 select-all">
                                                                {p.qrCode}
                                                            </p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {p.loading ? (
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                            ) : p.expanded ? (
                                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                            )}
                                        </button>

                                        {/* Expanded detail */}
                                        {p.expanded && p.info && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                className="px-4 pb-4 space-y-3 border-t border-border/30"
                                            >
                                                {/* Big product name */}
                                                <div className="pt-3 text-center">
                                                    <p className="text-xl font-bold text-foreground tracking-tight uppercase">
                                                        {p.info.name}
                                                    </p>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <MapPin className="w-3 h-3" />
                                                        <span>Origin: {p.info.originLocation}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <User className="w-3 h-3" />
                                                        <span>Producer: {p.info.producerName}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Clock className="w-3 h-3" />
                                                        <span>Registered: {formatDate(p.info.registeredAt)}</span>
                                                    </div>
                                                </div>

                                                {/* Mini timeline */}
                                                <div className="space-y-2">
                                                    <p className="text-xs font-semibold text-foreground">
                                                        History ({p.events.length} events)
                                                    </p>
                                                    <div className="relative">
                                                        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border/40" />
                                                        <div className="space-y-3">
                                                            {p.events.map((evt, ei) => (
                                                                <div key={ei} className="flex gap-3 relative">
                                                                    <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-[10px] z-10 shrink-0">
                                                                        {EVENT_ICONS[evt.eventType]}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-semibold text-foreground">
                                                                                {EVENT_TYPE_LABELS[evt.eventType]}
                                                                            </span>
                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                confirmed: {formatDate(evt.timestamp)}
                                                                            </span>
                                                                        </div>
                                                                        {evt.eventDate && evt.eventDate !== evt.timestamp && (
                                                                            <div className="text-[10px] text-muted-foreground">
                                                                                occurred: {formatDate(evt.eventDate)}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center gap-1">
                                                                            <MapPin className="w-2.5 h-2.5 text-muted-foreground" />
                                                                            <span className="text-[11px] text-muted-foreground">{evt.location}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <User className="w-2.5 h-2.5 text-muted-foreground" />
                                                                            <span className="text-[11px] text-muted-foreground">{evt.actor}</span>
                                                                        </div>
                                                                        {evt.notes && (
                                                                            <div className="flex items-start gap-1 mt-0.5">
                                                                                <FileText className="w-2.5 h-2.5 text-muted-foreground mt-0.5" />
                                                                                <span className="text-[11px] text-muted-foreground">{evt.notes}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* QR + public link */}
                                                <div className="flex items-center justify-between pt-2 border-t border-border/30">
                                                    <div className="p-1.5 bg-white rounded-lg">
                                                        <QRCodeSVG value={`${APP_URL}/product/${p.qrCode}`} size={60} />
                                                    </div>
                                                    <a
                                                        href={`/product/${p.qrCode}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                                                    >
                                                        <QrCode className="w-3 h-3" /> Public page
                                                    </a>
                                                </div>
                                            </motion.div>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <BottomNav />
        </div>
    );
};

export default AdminSupplyChain;
