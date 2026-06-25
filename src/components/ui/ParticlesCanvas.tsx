import { useEffect, useRef } from "react";

const DOT_COUNT_DESKTOP = 62;
const DOT_COUNT_MOBILE  = 22;
const MAX_DIST = 125;
const SPEED = 0.30;

interface Dot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  teal: boolean;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function ParticlesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let dots: Dot[] = [];
    let W = 0;
    let H = 0;

    function resize() {
      if (!canvas || !ctx) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initDots();
    }

    function initDots() {
      const count = W < 640 ? DOT_COUNT_MOBILE : DOT_COUNT_DESKTOP;
      dots = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * SPEED * 2,
        vy: (Math.random() - 0.5) * SPEED * 2,
        r: Math.random() * 1.6 + 0.8,
        teal: i % 4 === 0, // ~25% teal, resto verde
      }));
    }

    function frame() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, W, H);

      const green = cssVar("--primary");
      const teal  = cssVar("--accent-teal") || "186 78% 38%";

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = W;
        if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H;
        if (d.y > H) d.y = 0;
      }

      // linhas — cor mista baseada nos dois pontos
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const a = (1 - dist / MAX_DIST) * 0.16;
            const mixed = dots[i].teal || dots[j].teal ? teal : green;
            ctx.beginPath();
            ctx.strokeStyle = `hsl(${mixed} / ${a})`;
            ctx.lineWidth = 0.75;
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.stroke();
          }
        }
      }

      // pontos
      for (const d of dots) {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${d.teal ? teal : green} / 0.40)`;
        ctx.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();
    frame();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
