import { useId, useMemo, useState } from "react";
import type { BalancePoint } from "@/lib/balanceHistory";
import { formatCurrency, type EditionConfig } from "@/lib/locale";
import { relativeTime } from "@/lib/ledger";

const WIDTH = 320;
const HEIGHT = 120;
const PAD_X = 8;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;

export function BalanceSparkline({
  points,
  edition,
}: {
  points: BalancePoint[];
  edition: EditionConfig;
}) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  const { path, areaPath, coords, min, max, trendUp } = useMemo(() => {
    const balances = points.map((p) => p.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);
    const range = max - min || 1;
    const tMin = points[0].t;
    const tMax = points[points.length - 1].t;
    const tRange = tMax - tMin || 1;

    const innerW = WIDTH - PAD_X * 2;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;

    const coords = points.map((p) => ({
      x: PAD_X + ((p.t - tMin) / tRange) * innerW,
      y: PAD_TOP + innerH - ((p.balance - min) / range) * innerH,
      balance: p.balance,
      t: p.t,
    }));

    const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const areaPath = `${path} L${coords[coords.length - 1].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} L${coords[0].x.toFixed(1)},${HEIGHT - PAD_BOTTOM} Z`;

    const trendUp = points[points.length - 1].balance >= points[0].balance;

    return { path, areaPath, coords, min, max, trendUp };
  }, [points]);

  const lineColor = trendUp ? "var(--green-strong)" : "var(--red)";
  const active = hover !== null ? coords[hover] : coords[coords.length - 1];

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    coords.forEach((c, i) => {
      const d = Math.abs(c.x - relX);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between font-mono text-[11px] text-text-faint">
        <span>Peak {formatCurrency(max, edition)}</span>
        <span>Low {formatCurrency(min, edition)}</span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Balance over time, currently ${formatCurrency(points[points.length - 1].balance, edition)}`}
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hover !== null && (
          <line
            x1={active.x}
            x2={active.x}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--border)"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}

        <circle
          cx={coords[coords.length - 1].x}
          cy={coords[coords.length - 1].y}
          r={hover === null ? 4 : 0}
          fill={lineColor}
          stroke="var(--surface)"
          strokeWidth={2}
        />
        {hover !== null && (
          <circle cx={active.x} cy={active.y} r={4} fill={lineColor} stroke="var(--surface)" strokeWidth={2} />
        )}
      </svg>
      <div className="mt-1 h-8 text-center">
        {hover !== null && (
          <div className="inline-flex flex-col items-center">
            <span className="font-mono text-sm font-bold text-text">
              {formatCurrency(active.balance, edition)}
            </span>
            <span className="font-mono text-[10px] text-text-faint">
              {relativeTime(active.t, Date.now())}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
