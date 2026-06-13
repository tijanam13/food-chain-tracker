import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Package,
    QrCode,
    Search,
    MapPin,
    User,
    Clock,
    FileText,
    Loader2,
    ChevronLeft,
    RefreshCw,
    ExternalLink,
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import {
    getAllProductsFromChain,
    getProductInfoFromChain,
    getFullHistoryFromChain,
    type ProductInfo,
    type ProductEvent,
    EVENT_TYPE_LABELS,
} from "@/lib/productChain";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const EVENT_ICONS: Record<number, string> = {
    0: "🌱",
    1: "🚛",
    2: "🏭",
    3: "🤝",
    4: "🛒",
};

const SCANNER_ID = "products-qr-reader";

const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ProductSummary {
    qrCode: string;
    info: ProductInfo | null;
    infoLoading: boolean;
}

type View = "list" | "scanner" | "detail";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const ProductsPage = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    const [view, setView] = useState<View>("list");

    // ── List ──
    const [products, setProducts] = useState<ProductSummary[]>([]);
    const [listLoading, setListLoading] = useState(true);
    const [search, setSearch] = useState("");

    // ── Detail ──
    const [detailQr, setDetailQr] = useState("");
    const [detailInfo, setDetailInfo] = useState<ProductInfo | null>(null);
    const [detailEvents, setDetailEvents] = useState<ProductEvent[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // ── Scanner ──
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [cameras, setCameras] = useState<Array<{ id: string; label?: string }>>([]);
    const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);

    // ─── LOAD LIST ────────────────────────────────────────────────────────

    const loadList = async () => {
        setListLoading(true);
        const qrCodes = await getAllProductsFromChain();
        const summaries: ProductSummary[] = qrCodes.map((qr) => ({
            qrCode: qr,
            info: null,
            infoLoading: true,
        }));
        setProducts(summaries);
        setListLoading(false);

        // Load info for each product in the background
        qrCodes.forEach(async (qr, i) => {
            const info = await getProductInfoFromChain(qr);
            setProducts((prev) =>
                prev.map((p, idx) => (idx === i ? { ...p, info, infoLoading: false } : p))
            );
        });
    };

    useEffect(() => {
        loadList();
    }, []);

    // ─── OPEN DETAIL ──────────────────────────────────────────────────────

    const openDetail = async (qrCode: string) => {
        setDetailQr(qrCode);
        setDetailInfo(null);
        setDetailEvents([]);
        setDetailLoading(true);
        setView("detail");
        const [info, events] = await Promise.all([
            getProductInfoFromChain(qrCode),
            getFullHistoryFromChain(qrCode),
        ]);
        setDetailInfo(info);
        setDetailEvents(events);
        setDetailLoading(false);
        if (!info) {
            toast({ title: "Product not found.", variant: "destructive" });
            setView("list");
        }
    };

    // ─── SCANNER ─────────────────────────────────────────────────────────

    const destroyScanner = useCallback(async () => {
        const s = scannerRef.current;
        if (!s) return;
        try {
            if (s.isScanning) await s.stop();
            await s.clear();
        } catch { /* ignore */ }
        scannerRef.current = null;
    }, []);

    useEffect(() => {
        return () => { destroyScanner(); };
    }, [destroyScanner]);

    const startScanner = async (deviceId?: string | null) => {
        await destroyScanner();
        try {
            const scanner = new Html5Qrcode(SCANNER_ID, { verbose: false });
            scannerRef.current = scanner;
            await scanner.start(
                deviceId ?? { facingMode: "environment" },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                async (decodedText) => {
                    // Show what was decoded so we can debug QR payloads on mobile
                    try {
                        toast({ title: "Scanned", description: decodedText });
                    } catch { /* ignore */ }
                    await scanner.stop().catch(() => { });
                    setScanning(false);
                    // Handle both plain QR code and full URL
                    const qrCode = decodedText.includes("/product/")
                        ? decodedText.split("/product/")[1]
                        : decodedText;
                    await openDetail(qrCode);
                    setView("detail");
                },
                undefined
            );
            setScanning(true);
        } catch (err) {
            // Log full error to console for debugging
            // and surface the message to the user so they can act on it
            // (permission denied, insecure context, no camera, etc.)
            // eslint-disable-next-line no-console
            console.error("Html5Qrcode start error:", err);
            // Try to fetch available cameras so user can pick one
            try {
                const cams = await Html5Qrcode.getCameras();
                setCameras(cams.map((c) => ({ id: c.id, label: c.label })));
                if (cams.length === 1) setSelectedCameraId(cams[0].id);
            } catch (e) {
                // ignore
            }
            setScanning(false);
            const msg = (err && (err as any).message) || String(err) || "Unable to start camera. Please allow camera access.";
            toast({
                title: "Camera error",
                description: msg,
                variant: "destructive",
            });
        }
    };

    const stopScanner = useCallback(async () => {
        const s = scannerRef.current;
        if (!s) return;
        try { if (s.isScanning) await s.stop(); } catch { /* ignore */ }
        setScanning(false);
    }, []);

    const handleOpenScanner = async () => {
        await destroyScanner();
        setView("scanner");
    };

    const handleBackFromScanner = async () => {
        await destroyScanner();
        setScanning(false);
        setView("list");
    };

    // ─── FILTERED LIST ────────────────────────────────────────────────────

    const filtered = products.filter((p) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            p.qrCode.toLowerCase().includes(q) ||
            p.info?.name?.toLowerCase().includes(q) ||
            p.info?.producerName?.toLowerCase().includes(q) ||
            p.info?.originLocation?.toLowerCase().includes(q)
        );
    });

    // ─── RENDER ──────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-background relative overflow-x-hidden">
            <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />
            <div className="absolute top-60 right-0 w-[300px] h-[300px] rounded-full bg-coral/4 blur-[100px] pointer-events-none" />

            <div className="relative z-10 pb-28">
                <Header />

                <div className="px-5 mt-4">
                    <AnimatePresence mode="wait">

                        {/* ══════════════════════════════════
                VIEW: LIST
            ══════════════════════════════════ */}
                        {view === "list" && (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="w-5 h-5 text-primary" />
                                        <h1 className="font-display text-xl font-bold text-foreground">Products</h1>
                                    </div>
                                    <button
                                        onClick={handleOpenScanner}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                                    >
                                        <QrCode className="w-3.5 h-3.5" /> Scan QR
                                    </button>
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search products..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>

                                {/* List */}
                                {listLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : filtered.length === 0 ? (
                                    <div className="glass-card-strong rounded-2xl p-10 text-center">
                                        <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                                        <p className="text-sm text-muted-foreground">
                                            {search ? "No results found." : "No registered products."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filtered.map((p, i) => (
                                            <motion.button
                                                key={p.qrCode}
                                                initial={{ opacity: 0, y: 6 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.03 }}
                                                onClick={() => openDetail(p.qrCode)}
                                                className="w-full glass-card-strong rounded-2xl p-4 flex items-center gap-3 text-left hover:bg-white/5 transition-colors"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center text-lg shrink-0">
                                                    📦
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {p.infoLoading ? (
                                                        <div className="space-y-1.5">
                                                            <div className="h-3 bg-muted/50 rounded w-3/4 animate-pulse" />
                                                            <div className="h-2.5 bg-muted/30 rounded w-1/2 animate-pulse" />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <p className="text-sm font-semibold text-foreground truncate">
                                                                {p.info?.name ?? "Unknown product"}
                                                            </p>
                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {p.info?.originLocation ?? "—"} · {p.info?.producerName ?? "—"}
                                                                </p>
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                <ChevronLeft className="w-4 h-4 text-muted-foreground rotate-180 shrink-0" />
                                            </motion.button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={loadList}
                                    className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-2 transition-colors"
                                >
                                    <RefreshCw className="w-3 h-3" /> Refresh list
                                </button>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════
                VIEW: SCANNER
            ══════════════════════════════════ */}
                        {view === "scanner" && (
                            <motion.div
                                key="scanner"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3">
                                    <button onClick={handleBackFromScanner} className="text-muted-foreground hover:text-foreground">
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h1 className="font-display text-xl font-bold text-foreground">Scan QR</h1>
                                </div>

                                <div className="glass-card-strong rounded-2xl p-5 flex flex-col items-center gap-4">
                                    <p className="text-sm text-muted-foreground text-center">
                                        Point camera at a product QR code
                                    </p>

                                    <div className="w-full rounded-2xl overflow-hidden bg-black/30 min-h-[290px] relative border border-border/30">
                                        <div id={SCANNER_ID} className="w-full" />
                                        {!scanning && (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 gap-3 px-4">
                                                <QrCode className="w-14 h-14 opacity-20" />
                                                <p className="text-sm text-muted-foreground text-center">Press the button to start the camera</p>
                                                {cameras.length > 0 && (
                                                    <div className="w-full max-w-sm flex items-center gap-2">
                                                        <select
                                                            value={selectedCameraId ?? ""}
                                                            onChange={(e) => setSelectedCameraId(e.target.value || null)}
                                                            className="flex-1 rounded-md bg-input px-3 py-2 text-sm"
                                                        >
                                                            <option value="">Default / facingMode</option>
                                                            {cameras.map((c) => (
                                                                <option key={c.id} value={c.id}>{c.label || c.id}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => startScanner(selectedCameraId ?? undefined)}
                                                            className="px-3 py-2 rounded-md bg-primary text-white text-sm"
                                                        >
                                                            Use
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {scanning && (
                                            <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-green-500/80 flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                <span className="text-[10px] text-white font-bold">SCANNING</span>
                                            </div>
                                        )}
                                    </div>

                                    <Button
                                        onClick={scanning ? stopScanner : () => startScanner()}
                                        variant={scanning ? "outline" : "default"}
                                        className="w-full"
                                    >
                                        {scanning ? (
                                            <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Stop</>
                                        ) : (
                                            <><QrCode className="w-4 h-4 mr-2" /> Start Camera</>
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════
                VIEW: DETAIL
            ══════════════════════════════════ */}
                        {view === "detail" && (
                            <motion.div
                                key="detail"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-4"
                            >
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setView("list")}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <h1 className="font-display text-xl font-bold text-foreground truncate">
                                        {detailInfo?.name ?? "Loading..."}
                                    </h1>
                                </div>

                                {detailLoading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                    </div>
                                ) : detailInfo ? (
                                    <>
                                        {/* Product info card */}
                                        <div className="glass-card-strong rounded-2xl p-4 space-y-2">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Package className="w-4 h-4 text-primary" />
                                                <h2 className="text-sm font-bold text-foreground">{detailInfo.name}</h2>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <MapPin className="w-3 h-3" />
                                                <span>Origin: {detailInfo.originLocation}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <User className="w-3 h-3" />
                                                <span>Producer: {detailInfo.producerName}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                <span>Registered: {formatDate(detailInfo.registeredAt)}</span>
                                            </div>
                                            <a
                                                href={`/product/${detailQr}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                                            >
                                                <ExternalLink className="w-3 h-3" /> Open public page
                                            </a>
                                        </div>

                                        {/* Timeline */}
                                        <div className="glass-card-strong rounded-2xl p-4">
                                            <h3 className="text-sm font-semibold text-foreground mb-4">
                                                Supply chain ({detailEvents.length} eventa)
                                            </h3>
                                            <div className="relative">
                                                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border/40" />
                                                <div className="space-y-4">
                                                    {detailEvents.map((evt, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0, x: -8 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            transition={{ delay: i * 0.05 }}
                                                            className="flex gap-4 relative"
                                                        >
                                                            <div className="w-6 h-6 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-xs z-10 shrink-0">
                                                                {EVENT_ICONS[evt.eventType]}
                                                            </div>
                                                            <div className="flex-1 pb-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-semibold text-foreground">
                                                                        {EVENT_TYPE_LABELS[evt.eventType]}
                                                                    </span>
                                                                    <div className="text-right shrink-0">
                                                                        {evt.eventDate && evt.eventDate !== evt.timestamp && (
                                                                            <p className="text-[10px] text-primary/80">
                                                                                occurred: {formatDate(evt.eventDate)}
                                                                            </p>
                                                                        )}
                                                                        <p className="text-[10px] text-muted-foreground">
                                                                            confirmed: {formatDate(evt.timestamp)}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-1 mt-0.5">
                                                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                                                    <span className="text-xs text-muted-foreground">{evt.location}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <User className="w-3 h-3 text-muted-foreground" />
                                                                    <span className="text-xs text-muted-foreground">{evt.actor}</span>
                                                                </div>
                                                                {evt.notes && (
                                                                    <div className="flex items-start gap-1 mt-0.5">
                                                                        <FileText className="w-3 h-3 text-muted-foreground mt-0.5" />
                                                                        <span className="text-xs text-muted-foreground">{evt.notes}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : null}
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default ProductsPage;
