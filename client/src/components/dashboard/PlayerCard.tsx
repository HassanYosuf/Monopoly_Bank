import { useEffect } from "react";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import type { RuntimePlayer } from "@/store/useDashboardStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { TokenBadge } from "@/components/icons/token-badge";
import { formatCurrency, type EditionConfig } from "@/lib/locale";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { cn } from "@/lib/utils";

const pulseVariants = {
  up: { backgroundColor: ["rgba(33,165,103,0)", "rgba(33,165,103,0.22)", "rgba(33,165,103,0)"] },
  down: { backgroundColor: ["rgba(226,72,58,0)", "rgba(226,72,58,0.18)", "rgba(226,72,58,0)"] },
  none: { backgroundColor: "rgba(0,0,0,0)" },
};

export function PlayerCard({
  player,
  rank,
  edition,
  isSelf,
  onClick,
}: {
  player: RuntimePlayer;
  rank: number;
  edition: EditionConfig;
  isSelf: boolean;
  onClick?: () => void;
}) {
  const pulse = useDashboardStore((s) => s.pulses[player.id]);
  const clearPulse = useDashboardStore((s) => s.clearPulse);
  const displayBalance = useAnimatedNumber(player.balance);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => clearPulse(player.id), 900);
    return () => clearTimeout(t);
  }, [pulse, player.id, clearPulse]);

  return (
    <motion.button
      layout
      onClick={onClick}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className={cn(
        "relative flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3.5 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-surface-2",
        player.isBankrupt
          ? "border-red/30 bg-red/5 opacity-70"
          : isSelf
            ? "border-gold/40 bg-surface"
            : "border-border-soft bg-surface",
      )}
    >
      <motion.div
        className="pointer-events-none absolute inset-0"
        animate={pulse ? pulseVariants[pulse] : pulseVariants.none}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />

      <span className="w-4 shrink-0 text-center font-mono text-xs font-bold text-text-faint">
        {rank}
      </span>

      <div className="relative shrink-0">
        <TokenBadge token={player.token} size={46} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface",
            player.isOnline ? "bg-green-strong" : "bg-text-faint",
          )}
          aria-label={player.isOnline ? "Online" : "Offline"}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[15px] font-bold text-text">
            {player.name}
            {isSelf && <span className="font-normal text-text-faint"> (You)</span>}
          </span>
          {player.isBanker && <Crown className="h-3.5 w-3.5 shrink-0 text-gold" />}
        </div>
        <div className="text-xs text-text-faint">
          {player.isBankrupt ? "Bankrupt" : player.isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="shrink-0 text-right font-mono text-xl font-bold tabular-nums text-text">
        {formatCurrency(displayBalance, edition)}
      </div>
    </motion.button>
  );
}
