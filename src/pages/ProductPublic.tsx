import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
    Package,
    MapPin,
    User,
    Clock,
    FileText,
    Loader2,
    CheckCircle,
    XCircle,
    ExternalLink,
    Shield,
} from "lucide-react";
import {
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

const EVENT_COLORS: Record<number, string> = {
    0: "bg-green-500/20 border-green-500/40 text-green-400",
    1: "bg-blue-500/20 border-blue-500/40 text-blue-400",
    2: "bg-yellow-500/20 border-yellow-500/40 text-yellow-400",
    3: "bg-purple-500/20 border-purple-500/40 text-purple-400",
    4: "bg-orange-500/20 border-orange-500/40 text-orange-400",
};

const formatDate = (timestamp: number) =>
    new Date(timestamp * 1000).toLocaleString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });

// ─── MAP COMPONENT ────────────────────────────────────────────────────────────

declare global {
    interface Window { L: any; }
}

const RouteMap = ({ events }: { events: ProductEvent[] }) => {
    const mapId = "product-route-map";

    useEffect(() => {
        const loadMap = async () => {
            // Load Leaflet CSS
            if (!document.getElementById("leaflet-css")) {
                const link = document.createElement("link");
                link.id = "leaflet-css";
                link.rel = "stylesheet";
                link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
                document.head.appendChild(link);
            }

            // Load Leaflet JS
            if (!window.L) {
                await new Promise<void>((resolve) => {
                    const script = document.createElement("script");
                    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
                    script.onload = () => resolve();
                    document.head.appendChild(script);
                });
            }

            const L = window.L;
            const mapEl = document.getElementById(mapId);
            if (!mapEl || (mapEl as any)._leaflet_id) return;

            // Geocode location string → [lat, lng] using Nominatim
            const geocode = async (location: string): Promise<[number, number] | null> => {
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`,
                        { headers: { "Accept-Language": "en" } }
                    );
                    const data = await res.json();
                    if (data[0]) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
                } catch { /* ignore */ }
                return null;
            };

            // Deduplicate by location, preserve order
            const seen = new Set<string>();
            const unique = events.filter((e) => {
                if (seen.has(e.location)) return false;
                seen.add(e.location);
                return true;
            });

            const coords: { event: ProductEvent; latlng: [number, number] }[] = [];
            for (const evt of unique) {
                const latlng = await geocode(evt.location);
                if (latlng) coords.push({ event: evt, latlng });
            }

            if (coords.length === 0) return;

            // Create map — attribution hidden
            const map = L.map(mapId, { attributionControl: false }).setView(
                coords[0].latlng,
                6
            );

            // OpenStreetMap Standard tiles
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

            // Route polyline
            if (coords.length > 1) {
                const line = L.polyline(
                    coords.map((c) => c.latlng),
                    { color: "#6366f1", weight: 4, opacity: 0.85 }
                ).addTo(map);
                map.fitBounds(line.getBounds(), { padding: [40, 40] });
            }

            // Markers
            coords.forEach(({ event, latlng }, i) => {
                const isFirst = i === 0;
                const isLast = i === coords.length - 1;
                const color = isFirst ? "#22c55e" : isLast ? "#6366f1" : "#f59e0b";

                const icon = L.divIcon({
                    className: "",
                    html: `<div style="
            width:36px;height:36px;border-radius:50%;
            background:${color};border:3px solid white;
            display:flex;align-items:center;justify-content:center;
            font-size:15px;box-shadow:0 3px 10px rgba(0,0,0,0.25);
          ">${EVENT_ICONS[event.eventType]}</div>`,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                });

                L.marker(latlng, { icon })
                    .addTo(map)
                    .bindPopup(
                        `<div style="font-family:sans-serif;min-width:190px;padding:4px 0">
              <p style="font-weight:700;font-size:13px;margin:0 0 6px">${EVENT_TYPE_LABELS[event.eventType as keyof typeof EVENT_TYPE_LABELS]}</p>
              <p style="color:#6b7280;font-size:12px;margin:0 0 3px">📍 ${event.location}</p>
              <p style="color:#6b7280;font-size:12px;margin:0 0 3px">👤 ${event.actor}</p>
              ${event.eventDate && event.eventDate !== event.timestamp
                            ? `<p style="color:#6366f1;font-size:11px;margin:4px 0 1px">🕐 occurred: ${formatDate(event.eventDate)}</p>`
                            : ""}
              <p style="color:#9ca3af;font-size:11px;margin:0">✅ confirmed: ${formatDate(event.timestamp)}</p>
              ${event.notes ? `<p style="color:#9ca3af;font-size:11px;font-style:italic;margin:4px 0 0">${event.notes}</p>` : ""}
            </div>`
                    );
            });
        };

        loadMap();

        return () => {
            const mapEl = document.getElementById(mapId) as any;
            if (mapEl?._leaflet_id) {
                try { window.L?.map(mapId)?.remove?.(); } catch { /* ignore */ }
            }
        };
    }, [events]);

    return (
        <div
            id={mapId}
            className="w-full rounded-2xl overflow-hidden border border-border/30"
            style={{ height: "300px", zIndex: 0 }}
        />
    );
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const ProductPublic = () => {
    const { qrCode } = useParams<{ qrCode: string }>();
    const [loading, setLoading] = useState(true);
    const [info, setInfo] = useState<ProductInfo | null>(null);
    const [events, setEvents] = useState<ProductEvent[]>([]);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!qrCode) return;
        const load = async () => {
            setLoading(true);
            const [productInfo, productEvents] = await Promise.all([
                getProductInfoFromChain(qrCode),
                getFullHistoryFromChain(qrCode),
            ]);
            if (!productInfo) {
                setNotFound(true);
            } else {
                setInfo(productInfo);
                setEvents(productEvents);
            }
            setLoading(false);
        };
        load();
    }, [qrCode]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Package className="w-6 h-6 text-primary" />
                </div>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading data from blockchain...</p>
            </div>
        );
    }

    if (notFound || !info) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
                <XCircle className="w-14 h-14 text-destructive opacity-60" />
                <h1 className="text-lg font-bold text-foreground text-center">Product not found</h1>
                <p className="text-sm text-muted-foreground text-center">
                    The QR code <span className="font-mono text-xs">{qrCode}</span> is not registered on the blockchain.
                </p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative">
            <div className="absolute top-0 left-1/3 w-[500px] h-[500px] rounded-full bg-mint/5 blur-[140px] pointer-events-none" />

            <div className="relative z-10 max-w-lg mx-auto px-5 pt-10 pb-16">

                {/* ── Branding ── */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mb-6"
                >
                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-foreground">SmartEat</p>
                        <p className="text-[10px] text-muted-foreground">Blockchain Verification</p>
                    </div>
                    <div className="ml-auto flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/15 border border-green-500/30">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-[10px] text-green-400 font-semibold">Verified</span>
                    </div>
                </motion.div>

                {/* ── Product Hero ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card-strong rounded-2xl p-5 mb-4"
                >
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center text-2xl shrink-0">
                            📦
                        </div>
                        <div className="flex-1">
                            <h1 className="text-lg font-bold text-foreground leading-tight">{info.name}</h1>
                            <div className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{info.originLocation}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{info.producerName}</span>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    Registered: {formatDate(info.registeredAt)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        {[
                            { label: "Events", value: events.length },
                            { label: "Locations", value: new Set(events.map((e) => e.location)).size },
                            { label: "Actors", value: new Set(events.map((e) => e.actor)).size },
                        ].map(({ label, value }) => (
                            <div
                                key={label}
                                className="rounded-xl bg-primary/10 border border-primary/20 py-2 text-center"
                            >
                                <p className="text-lg font-bold text-primary">{value}</p>
                                <p className="text-[10px] text-muted-foreground">{label}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>

                {/* ── Map ── */}
                {events.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-4"
                    >
                        <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-primary" />
                            Supply chain route
                        </h2>
                        <RouteMap events={events} />
                    </motion.div>
                )}

                {/* ── Timeline ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-card-strong rounded-2xl p-4 mb-4"
                >
                    <h2 className="text-sm font-semibold text-foreground mb-4">
                        Complete history ({events.length} events)
                    </h2>
                    <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-border/40 to-transparent" />
                        <div className="space-y-5">
                            {events.map((evt, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -12 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.35 + i * 0.06 }}
                                    className="flex gap-4 relative"
                                >
                                    <div
                                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm z-10 shrink-0 ${EVENT_COLORS[evt.eventType]}`}
                                    >
                                        {EVENT_ICONS[evt.eventType]}
                                    </div>
                                    <div className="flex-1 pb-1">
                                        <div className="flex items-start justify-between gap-2">
                                            <span className="text-sm font-semibold text-foreground">
                                                {EVENT_TYPE_LABELS[evt.eventType as keyof typeof EVENT_TYPE_LABELS]}
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
                                            <div className="flex items-start gap-1 mt-0.5 bg-muted/20 rounded-lg px-2 py-1">
                                                <FileText className="w-3 h-3 text-muted-foreground mt-0.5 shrink-0" />
                                                <span className="text-xs text-muted-foreground italic">{evt.notes}</span>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>

                {/* ── Blockchain proof ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-2xl border border-border/40 p-4 flex items-start gap-3"
                >
                    <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1">
                        <p className="text-xs font-semibold text-foreground mb-1">Blockchain Verification</p>
                        <p className="text-[11px] text-muted-foreground mb-2">
                            All data is permanently recorded on the Ethereum Sepolia testnet blockchain and cannot be altered.
                        </p>
                        <p className="text-[10px] font-mono text-muted-foreground break-all">{qrCode}</p>
                        <a
                            href="https://sepolia.etherscan.io/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-[11px] text-primary hover:underline mt-1.5"
                        >
                            <ExternalLink className="w-3 h-3" /> Verify on Etherscan
                        </a>
                    </div>
                </motion.div>

            </div>
        </div>
    );
};

export default ProductPublic;
