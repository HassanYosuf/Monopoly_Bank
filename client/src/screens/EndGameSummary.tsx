import { useMemo } from "react";
import { motion } from "framer-motion";
import { Crown, Download, RotateCcw, Trophy } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";
import { downloadLedgerCsv } from "@/lib/exportLedger";
import { TokenBadge } from "@/components/icons/token-badge";
import { Confetti } from "@/components/dashboard/Confetti";
import { Button } from "@/components/ui/button";

const spring = { type: "spring" as const, stiffness: 320, damping: 30 };

export function EndGameSummary() {
  const resetToLanding = useGameStore((s) => s.resetToLanding);
  const players = useDashboardStore((s) => s.players);
  const transactions = useDashboardStore((s) => s.transactions);
  const editionId = useDashboardStore((s) => s.edition);
  const gameId = useDashboardStore((s) => s.gameId);
  const startedAt = useDashboardStore((s) => s.startedAt);
  const edition = EDITIONS[editionId];

  const ranked = useMemo(() => [...players].sort((a, b) => b.balance - a.balance), [players]);
  const winner = ranked[0];

  const durationLabel = useMemo(() => {
    if (!startedAt) return null;
    const mins = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    if (mins < 60) return `${mins} min`;
    return `${Math.round(mins / 60)} hr`;
  }, [startedAt]);

  function handlePlayAgain() {
    resetToLanding();
  }

  return (
    <div className="relative mx-auto min-h-svh w-full max-w-md px-5 pb-16 pt-12 text-center sm:max-w-lg lg:max-w-2xl">
      <Confetti />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
      >
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-text-faint">
          Game Over
        </span>
        <div className="mt-4 flex justify-center">
          <div className="relative">
            <TokenBadge token={winner.token} size={96} />
            <div className="absolute -top-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-gold text-[#1a1300] shadow-lg">
              <Trophy className="h-4.5 w-4.5" />
            </div>
          </div>
        </div>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight text-text">
          {winner.name} wins!
        </h1>
        <p className="mt-1 font-mono text-lg font-bold text-gold">
          {formatCurrency(winner.balance, edition)}
        </p>
        {durationLabel && (
          <p className="mt-1 text-sm text-text-faint">
            {gameId} · {durationLabel} · {transactions.length} transactions
          </p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.1 }}
        className="mt-8 flex flex-col gap-2 text-left"
      >
        {ranked.map((p, i) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 rounded-2xl border p-3.5 ${
              i === 0
                ? "border-gold/40 bg-gold/10"
                : "border-border-soft bg-surface"
            }`}
          >
            <span className="w-5 text-center font-mono text-sm font-bold text-text-faint">
              {i + 1}
            </span>
            <TokenBadge token={p.token} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-sm font-bold text-text">{p.name}</span>
                {p.isBanker && <Crown className="h-3.5 w-3.5 shrink-0 text-gold" />}
              </div>
              <div className="text-xs text-text-faint">
                {p.isBankrupt ? "Bankrupt" : "Finished"}
              </div>
            </div>
            <div className="shrink-0 font-mono text-base font-bold tabular-nums text-text">
              {formatCurrency(p.balance, edition)}
            </div>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.2 }}
        className="mt-8 flex flex-col gap-3"
      >
        <Button
          variant="secondary"
          className="w-full gap-2"
          onClick={() => downloadLedgerCsv(transactions, players, gameId)}
        >
          <Download className="h-4 w-4" />
          Export Full History
        </Button>
        <Button className="w-full gap-2" onClick={handlePlayAgain}>
          <RotateCcw className="h-4 w-4" />
          New Game
        </Button>
      </motion.div>
    </div>
  );
}
