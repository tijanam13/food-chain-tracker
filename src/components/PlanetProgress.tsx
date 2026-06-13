import { useEffect, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Stage = "seedling" | "sprouting" | "growing" | "blooming" | "lush" | "cosmic";

interface StageData {
  label: string;
  bar: string;
  glow: string;
}

interface TreeConfig {
  ang: number;
  h: number;
  cr: number;
}

interface FlowerConfig {
  ang: number;
  p: string;
  c: string;
}

interface BushConfig {
  ang: number;
  col: string;
}

interface Point {
  x: number;
  y: number;
}

interface PlanetProgressProps {
  tokens: number;
  showLabel?: boolean;
  className?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const W = 300;
const H = 300;
const CX = 150;
const CY = 150;
const R = 105;

const STAGES: Record<Stage, StageData> = {
  seedling:  { label: "Plant your first seed... 🌱",        bar: "#4ade80", glow: "rgba(74,222,128,0.22)"  },
  sprouting: { label: "Keep growing! 🌿",                   bar: "#22c55e", glow: "rgba(74,222,128,0.32)"  },
  growing:   { label: "Your planet is flourishing! 🌳",     bar: "#16a34a", glow: "rgba(34,197,94,0.42)"   },
  blooming:  { label: "Beautiful flowers blooming! 🌸",     bar: "#15803d", glow: "rgba(22,163,74,0.52)"   },
  lush:      { label: "A thriving ecosystem! 🌺",           bar: "#166534", glow: "rgba(21,128,61,0.68)"   },
  cosmic:    { label: "A cosmic paradise! ✨🌍✨",           bar: "#7c3aed", glow: "rgba(124,58,237,0.72)"  },
};

const PLANET_COLORS: Record<Stage, [string, string, string]> = {
  seedling:  ["#2a5e2a", "#357a35", "#4a9e4a"],
  sprouting: ["#266038", "#307a42", "#429e55"],
  growing:   ["#1e5e2e", "#287040", "#3a9255"],
  blooming:  ["#185828", "#226e34", "#348a4a"],
  lush:      ["#124e20", "#1a6028", "#2a8038"],
  cosmic:    ["#0f2d1a", "#1a4a2e", "#256040"],
};

const PILL_TOKENS: Record<Stage, number> = {
  seedling: 0, sprouting: 40, growing: 125, blooming: 350, lush: 750, cosmic: 1000,
};

// ─── Helper Functions ─────────────────────────────────────────────────────────
function getStage(t: number): Stage {
  if (t <= 25)   return "seedling";
  if (t <= 75)   return "sprouting";
  if (t <= 200)  return "growing";
  if (t <= 500)  return "blooming";
  if (t <= 999)  return "lush";
  return "cosmic";
}

function poc(angleDeg: number, radius: number): Point {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

// ─── Draw Functions ───────────────────────────────────────────────────────────
function drawPlanetBase(ctx: CanvasRenderingContext2D, stage: Stage, tokens: number): void {
  const sd = STAGES[stage];

  // Cosmic extra glow at 1000+
  if (tokens >= 1000) {
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 600);
    const cosmicGrd = ctx.createRadialGradient(CX, CY, R * 0.3, CX, CY, R * 2.2);
    cosmicGrd.addColorStop(0, `rgba(167,139,250,${0.15 + pulse * 0.12})`);
    cosmicGrd.addColorStop(0.5, `rgba(124,58,237,${0.10 + pulse * 0.08})`);
    cosmicGrd.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = cosmicGrd;
    ctx.beginPath();
    ctx.arc(CX, CY, R * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Normal glow
  const grd = ctx.createRadialGradient(CX, CY, R * 0.5, CX, CY, R * 1.5);
  grd.addColorStop(0, sd.glow);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(CX, CY, R * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Planet body
  const [c1, c2, c3] = PLANET_COLORS[stage];
  const pg = ctx.createRadialGradient(CX - 30, CY - 30, 8, CX, CY, R);
  pg.addColorStop(0, c3);
  pg.addColorStop(0.55, c2);
  pg.addColorStop(1, c1);
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.fillStyle = pg;
  ctx.fill();

  // Surface texture patches
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(CX - 35 + i * 17, CY + 18 + (i % 2) * 14, 18, 9, i * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.fill();
  }

  // Rim
  ctx.beginPath();
  ctx.arc(CX, CY, R, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 3;
  ctx.stroke();

  // Atmosphere ring
  ctx.beginPath();
  ctx.arc(CX, CY, R + 5, 0, Math.PI * 2);
  ctx.strokeStyle = tokens >= 1000
    ? `rgba(167,139,250,${0.25 + 0.1 * Math.sin(Date.now() / 400)})`
    : "rgba(100,220,100,0.12)";
  ctx.lineWidth = 8;
  ctx.stroke();

  // Cosmic sparkles at 1000+
  if (tokens >= 1000) {
    const t = Date.now() / 1000;
    const sparkCount = Math.min(30, Math.floor((tokens - 1000) / 30) + 12);
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + t * 0.3;
      const dist = R + 12 + Math.sin(t * 2 + i * 0.8) * 10;
      const sx = CX + Math.cos(angle) * dist;
      const sy = CY + Math.sin(angle) * dist;
      const size = 1.2 + Math.sin(t * 3 + i) * 0.8;
      ctx.beginPath();
      ctx.arc(sx, sy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,200,${0.5 + 0.5 * Math.sin(t * 2.5 + i * 1.3)})`;
      ctx.fill();
    }
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  trunkH: number,
  crownR: number,
  sw: number
): void {
  const root = poc(angleDeg, R - 2);
  const tipAngle = (angleDeg - 90) * (Math.PI / 180);
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(tipAngle + (sw * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -trunkH);
  ctx.strokeStyle = "#3d5e1a";
  ctx.lineWidth = Math.max(1.5, crownR * 0.16);
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(2, -trunkH - crownR * 0.75, crownR * 0.88, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -trunkH - crownR * 0.75, crownR, 0, Math.PI * 2);
  ctx.fillStyle = "#3a7a22";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-crownR * 0.2, -trunkH - crownR * 1.0, crownR * 0.72, 0, Math.PI * 2);
  ctx.fillStyle = "#4d9430";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-crownR * 0.1, -trunkH - crownR * 1.25, crownR * 0.48, 0, Math.PI * 2);
  ctx.fillStyle = "#5aaa38";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-crownR * 0.3, -trunkH - crownR * 1.3, crownR * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();

  ctx.restore();
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  size: number,
  petalColor: string,
  centerColor: string,
  sw: number
): void {
  const root = poc(angleDeg, R - 1);
  const tipAngle = (angleDeg - 90) * (Math.PI / 180);
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(tipAngle + (sw * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -size * 2.4);
  ctx.strokeStyle = "#3a8a3a";
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-size * 0.9, -size * 1.2, size * 0.75, size * 0.3, -0.65, 0, Math.PI * 2);
  ctx.fillStyle = "#4aaa4a";
  ctx.fill();

  for (let i = 0; i < 6; i++) {
    const pa = (i / 6) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(
      Math.cos(pa) * size * 0.95,
      -size * 2.4 + Math.sin(pa) * size * 0.95,
      size * 0.58, size * 0.32,
      pa, 0, Math.PI * 2
    );
    ctx.fillStyle = petalColor;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.arc(0, -size * 2.4, size * 0.38, 0, Math.PI * 2);
  ctx.fillStyle = centerColor;
  ctx.fill();

  ctx.restore();
}

function drawBush(
  ctx: CanvasRenderingContext2D,
  angleDeg: number,
  size: number,
  color: string,
  sw: number
): void {
  const root = poc(angleDeg, R - 1);
  const tipAngle = (angleDeg - 90) * (Math.PI / 180);
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(tipAngle + (sw * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -size * 0.6);
  ctx.strokeStyle = "#3a6a2a";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  const offsets: [number, number][] = [[-0.7, -1.0], [0.7, -1.0], [0, -1.4], [-0.4, -1.7], [0.4, -1.7]];
  offsets.forEach(([ox, oy], i) => {
    ctx.beginPath();
    ctx.arc(ox * size, oy * size, size * (0.65 + i * 0.04), 0, Math.PI * 2);
    ctx.fillStyle = i > 2 ? "rgba(60,140,40,0.85)" : color;
    ctx.fill();
  });
  ctx.restore();
}

// ─── Stage Draw Functions ─────────────────────────────────────────────────────
function drawSeedling(ctx: CanvasRenderingContext2D, at: number): void {
  const sw = Math.sin(at * 0.8) * 2.5;
  const root = poc(0, R - 1);
  ctx.save();
  ctx.translate(root.x, root.y);
  ctx.rotate(-Math.PI / 2 + (sw * Math.PI) / 180);

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -20);
  ctx.strokeStyle = "#558B2F";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(-5, -13, 6, 2.8, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = "#7CB342";
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(5, -15, 6, 2.8, 0.5, 0, Math.PI * 2);
  ctx.fillStyle = "#8BC34A";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, -20, 3.5, 0, Math.PI * 2);
  ctx.fillStyle = "#9CCC65";
  ctx.fill();

  ctx.restore();
}

function drawSprouting(ctx: CanvasRenderingContext2D, at: number): void {
  const configs: Array<{ ang: number; h: number }> = [
    { ang: 350, h: 22 }, { ang: 25, h: 18 }, { ang: 175, h: 20 }, { ang: 200, h: 16 },
  ];
  configs.forEach(({ ang, h }, i) => {
    const sw = Math.sin(at * (0.7 + i * 0.15) + i * 1.2) * 2.5;
    const root = poc(ang, R - 1);
    ctx.save();
    ctx.translate(root.x, root.y);
    ctx.rotate(((ang - 90) * Math.PI) / 180 + (sw * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -h);
    ctx.strokeStyle = "#558B2F";
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(-5, -h * 0.55, 6, 2.8, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#7CB342";
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(5, -h * 0.72, 6, 2.8, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = "#8BC34A";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, -h, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#9CCC65";
    ctx.fill();

    ctx.restore();
  });
}

function drawGrowing(ctx: CanvasRenderingContext2D, at: number): void {
  const trees: TreeConfig[] = [
    { ang: 355, h: 26, cr: 12 }, { ang: 35, h: 20, cr: 10 },
    { ang: 100, h: 18, cr: 9 }, { ang: 170, h: 24, cr: 11 },
    { ang: 220, h: 20, cr: 10 }, { ang: 285, h: 22, cr: 10 },
  ];
  trees.forEach(({ ang, h, cr }, i) => {
    drawTree(ctx, ang, h, cr, Math.sin(at * (0.6 + i * 0.12) + i * 1.1) * 1.8);
  });

  const flowers: FlowerConfig[] = [
    { ang: 65, p: "#FF8FAD", c: "#FFD54F" },
    { ang: 145, p: "#FFD54F", c: "#FF8FAD" },
    { ang: 250, p: "#BA68C8", c: "#fff" },
  ];
  flowers.forEach(({ ang, p, c }, i) => {
    drawFlower(ctx, ang, 4, p, c, Math.sin(at * (0.9 + i * 0.1) + i * 2) * 3.5);
  });
}

function drawBlooming(ctx: CanvasRenderingContext2D, at: number): void {
  const trees: TreeConfig[] = [
    { ang: 350, h: 30, cr: 14 }, { ang: 22, h: 23, cr: 11 },
    { ang: 55, h: 19, cr: 9 }, { ang: 90, h: 26, cr: 12 },
    { ang: 130, h: 20, cr: 10 }, { ang: 175, h: 28, cr: 13 },
    { ang: 215, h: 22, cr: 10 }, { ang: 255, h: 25, cr: 12 },
    { ang: 295, h: 19, cr: 9 }, { ang: 325, h: 27, cr: 12 },
  ];
  trees.forEach(({ ang, h, cr }, i) => {
    drawTree(ctx, ang, h, cr, Math.sin(at * (0.55 + i * 0.1) + i * 1.05) * 1.5);
  });

  const flowers: FlowerConfig[] = [
    { ang: 38, p: "#FF6B9D", c: "#FFD54F" }, { ang: 72, p: "#FFD54F", c: "#FF6B9D" },
    { ang: 112, p: "#BA68C8", c: "#FFD54F" }, { ang: 148, p: "#4DD0E1", c: "#FFD54F" },
    { ang: 195, p: "#FF6B9D", c: "#fff" }, { ang: 235, p: "#FFD54F", c: "#FF6B9D" },
    { ang: 272, p: "#FF4081", c: "#FFD54F" }, { ang: 312, p: "#4DD0E1", c: "#fff" },
  ];
  flowers.forEach(({ ang, p, c }, i) => {
    drawFlower(ctx, ang, 4.2, p, c, Math.sin(at * (0.8 + i * 0.09) + i * 0.9) * 4);
  });

  const bushes: BushConfig[] = [
    { ang: 10, col: "#3a8a3a" }, { ang: 160, col: "#2e7a2e" }, { ang: 280, col: "#4a9a3a" },
  ];
  bushes.forEach(({ ang, col }, i) => {
    drawBush(ctx, ang, 8, col, Math.sin(at * (0.65 + i * 0.1) + i) * 2.2);
  });
}

function drawLush(ctx: CanvasRenderingContext2D, at: number): void {
  const treeAngles = Array.from({ length: 15 }, (_, i) => i * (360 / 15));
  treeAngles.forEach((ang, i) => {
    const h = 24 + Math.sin(i * 2.1) * 8;
    const cr = 11 + Math.sin(i * 1.7) * 4;
    drawTree(ctx, ang, h, cr, Math.sin(at * (0.5 + i * 0.08) + i * 1.15) * 1.2);
  });

  const flowerCols = ["#FF6B9D","#FFD54F","#BA68C8","#4DD0E1","#FF4081","#FF8FAD","#FFD54F","#BA68C8","#4DD0E1","#FF6B9D","#FFD54F","#FF4081","#4DD0E1","#BA68C8","#FF6B9D"];
  const centerCols = ["#FFD54F","#FF6B9D","#FFD54F","#FFD54F","#FFD54F","#fff","#FF6B9D","#FFD54F","#fff","#FFD54F","#FF6B9D","#FFD54F","#FFD54F","#fff","#FFD54F"];

  Array.from({ length: 15 }, (_, i) => i * (360 / 15) + 360 / 30).forEach((ang, i) => {
    drawFlower(ctx, ang, 4.8, flowerCols[i], centerCols[i], Math.sin(at * (0.75 + i * 0.07) + i * 0.82) * 5);
  });

  [45, 135, 225, 315].forEach((ang, i) => {
    drawBush(ctx, ang, 9, ["#3a8a3a", "#2e7a2e", "#4a9a3a", "#357530"][i], Math.sin(at * (0.6 + i * 0.1) + i) * 2.5);
  });
}

function drawCosmic(ctx: CanvasRenderingContext2D, at: number, tokens: number): void {
  // Dense outer ring of trees — 20 trees
  const treeCount = Math.min(20, Math.floor(12 + (tokens - 200) / 50));
  Array.from({ length: treeCount }, (_, i) => i * (360 / treeCount)).forEach((ang, i) => {
    const h = 26 + Math.sin(i * 2.3) * 9;
    const cr = 12 + Math.sin(i * 1.9) * 5;
    drawTree(ctx, ang, h, cr, Math.sin(at * (0.45 + i * 0.07) + i * 1.1) * 1.0);
  });

  // Dense flowers between trees
  const fCols = ["#FF6B9D","#FFD54F","#BA68C8","#4DD0E1","#FF4081","#FF8FAD","#c084fc","#818cf8","#f472b6","#34d399","#fbbf24","#f87171","#a78bfa","#38bdf8","#4ade80","#fb923c","#e879f9","#2dd4bf","#facc15","#f9a8d4"];
  const cCols  = ["#FFD54F","#FF6B9D","#FFD54F","#FFD54F","#FFD54F","#fff","#fff","#FFD54F","#fff","#FFD54F","#FF6B9D","#FFD54F","#FFD54F","#fff","#FFD54F","#fff","#FFD54F","#FFD54F","#fff","#FFD54F"];
  const flowerCount = Math.min(20, Math.floor(10 + (tokens - 200) / 40));
  Array.from({ length: flowerCount }, (_, i) => i * (360 / flowerCount) + 360 / (flowerCount * 2)).forEach((ang, i) => {
    drawFlower(ctx, ang, 5.2, fCols[i % fCols.length], cCols[i % cCols.length], Math.sin(at * (0.7 + i * 0.06) + i * 0.75) * 5.5);
  });

  // Bushes every 45°
  [0, 45, 90, 135, 180, 225, 270, 315].forEach((ang, i) => {
    drawBush(ctx, ang, 9.5, ["#3a8a3a","#2e7a2e","#4a9a3a","#357530","#3d8040","#266028","#4a9a4a","#2e6a3e"][i], Math.sin(at * (0.55 + i * 0.09) + i) * 2.8);
  });

  // At 1000+: flowers in the center of the planet
  if (tokens >= 1000) {
    const progress = Math.min(1, (tokens - 1000) / 500);
    const innerFlowerCount = Math.floor(6 + progress * 12);

    ctx.save();
    ctx.beginPath();
    ctx.arc(CX, CY, R - 6, 0, Math.PI * 2);
    ctx.clip();

    // Central big flower
    const centralPulse = 1 + 0.08 * Math.sin(at * 2.2);
    const centralSize = (5 + progress * 4) * centralPulse;
    const centralAng = at * 30; // slowly rotating
    for (let i = 0; i < 8; i++) {
      const pa = (i / 8) * Math.PI * 2 + centralAng * Math.PI / 180;
      ctx.beginPath();
      ctx.ellipse(
        CX + Math.cos(pa) * centralSize * 1.4,
        CY + Math.sin(pa) * centralSize * 1.4,
        centralSize, centralSize * 0.45,
        pa, 0, Math.PI * 2
      );
      ctx.fillStyle = fCols[i % fCols.length];
      ctx.globalAlpha = 0.85;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(CX, CY, centralSize * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD54F";
    ctx.fill();

    // Ring of smaller inner flowers
    Array.from({ length: innerFlowerCount }, (_, i) => i * (360 / innerFlowerCount)).forEach((angDeg, i) => {
      const rad = (R - 6) * 0.55 + Math.sin(at * 0.8 + i) * 3;
      const a = (angDeg + at * 15) * Math.PI / 180;
      const fx = CX + Math.cos(a) * rad;
      const fy = CY + Math.sin(a) * rad;
      const fs = 3.5 + Math.sin(at * 1.5 + i) * 1;
      const fc = fCols[(i * 3) % fCols.length];
      const cc = cCols[(i * 2) % cCols.length];

      ctx.save();
      ctx.translate(fx, fy);
      for (let p = 0; p < 6; p++) {
        const pa = (p / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(
          Math.cos(pa) * fs * 0.9,
          Math.sin(pa) * fs * 0.9,
          fs * 0.55, fs * 0.28,
          pa, 0, Math.PI * 2
        );
        ctx.fillStyle = fc;
        ctx.globalAlpha = 0.9;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, fs * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = cc;
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────
const PlanetProgress = ({ tokens = 0, showLabel = true, className = "" }: PlanetProgressProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const tokensRef = useRef<number>(0);

  const stage = getStage(tokens);
  const sd = STAGES[stage];

  const barPct = tokens < 1000
    ? Math.min((tokens / 1000) * 100, 100)
    : Math.min(((tokens - 1000) / 500) * 100, 100);

  const renderLoop = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const t = Date.now() / 1000;
    ctx.clearRect(0, 0, W, H);

    const tok = tokensRef.current;
    const st = getStage(tok);

    drawPlanetBase(ctx, st, tok);

    if (st === "seedling")       drawSeedling(ctx, t);
    else if (st === "sprouting") drawSprouting(ctx, t);
    else if (st === "growing")   drawGrowing(ctx, t);
    else if (st === "blooming")  drawBlooming(ctx, t);
    else if (st === "lush")      drawLush(ctx, t);
    else                         drawCosmic(ctx, t, tok);

    rafRef.current = requestAnimationFrame(renderLoop);
  }, []);

  useEffect(() => {
    tokensRef.current = tokens;
  }, [tokens]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderLoop]);

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Canvas */}
      <div className="w-80 h-80 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          style={{ display: "block", maxWidth: "100%", height: "auto" }}
        />
      </div>

      {/* Token label + bar */}
      {showLabel && (
        <div>
          <div style={{
            fontSize: 18,
            fontWeight: 500,
            color: tokens >= 1000 ? "#7c3aed" : "var(--foreground)",
            textAlign: "center",
            transition: "color .5s",
          }}>
            {tokens} ⭐ Points
            {tokens >= 1000 && <span style={{ marginLeft: 6 }}>✨</span>}
          </div>
          <div style={{
            fontSize: 14,
            color: "var(--muted-foreground)",
            textAlign: "center",
            marginBottom: 8,
          }}>
            {sd.label}
          </div>
          <div style={{
            width: 220,
            height: 8,
            borderRadius: 99,
            background: "rgba(0,0,0,0.08)",
            overflow: "hidden",
            margin: "0 auto",
          }}>
            <div style={{
              height: "100%",
              borderRadius: 99,
              width: `${barPct}%`,
              background: sd.bar,
              transition: "width .7s ease, background .7s",
            }} />
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            width: 220,
            margin: "3px auto 0",
            fontSize: 10,
            color: "var(--muted-foreground)",
          }}>
            {tokens < 1000
              ? <><span>0</span><span>500</span><span>1000+</span></>
              : <><span>1000</span><span>1250</span><span>1500+</span></>
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanetProgress;
