import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, History, Landmark, Plus, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { PlayerCard } from "@/components/dashboard/PlayerCard";
import { LedgerRow } from "@/components/dashboard/LedgerRow";
import { TransactionSheet } from "@/components/transaction/TransactionSheet";
import { IncomingConfirmations } from "@/components/dashboard/IncomingConfirmations";
import { MoneyRequestNotifier } from "@/components/dashboard/MoneyRequestNotifier";
import { Button } from "@/components/ui/button";

export function Dashboard() {
  const goTo = useGameStore((s) => s.goTo);
  const viewPlayer = useGameStore((s) => s.viewPlayer);
  const players = useDashboardStore((s) => s.players);
  const bankBalance = useDashboardStore((s) => s.bankBalance);
  const editionId = useDashboardStore((s) => s.edition);
  const gameId = useDashboardStore((s) => s.gameId);
  const selfId = useDashboardStore((s) => s.selfId);
  const transactions = useDashboardStore((s) => s.transactions);
  const passGo = useDashboardStore((s) => s.passGo);
  const trackProperties = useDashboardStore((s) => s.trackProperties);
  const pendingRequestCount = useDashboardStore(
    (s) => s.moneyRequests.filter((r) => r.status === "pending").length,
  );
  const hasPendingPassGo = useDashboardStore((s) =>
    s.moneyRequests.some(
      (r) => r.requestedBy === s.selfId && r.status === "pending" && r.type === "pass-go",
    ),
  );

  const edition = EDITIONS[editionId];
  const displayBank = useAnimatedNumber(bankBalance);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Bridges the gap between clicking and the request round-tripping back
  // into moneyRequests (hasPendingPassGo) — without it, rapid re-clicks
  // during that window could fire off several duplicate requests.
  const [passGoSending, setPassGoSending] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const ranked = useMemo(
    () => [...players].sort((a, b) => b.balance - a.balance),
    [players],
  );

  const onlineCount = players.filter((p) => p.isOnline).length;
  const isBanker = players.find((p) => p.id === selfId)?.isBanker ?? false;
  const passGoDisabled = passGoSending || hasPendingPassGo;

  // Once the round trip lands, hasPendingPassGo takes over as the real
  // disabled-source-of-truth, so this flag only needs to cover the gap
  // before that — no need to clear it on approval/rejection separately.
  useEffect(() => {
    if (hasPendingPassGo) setPassGoSending(false);
  }, [hasPendingPassGo]);

  function handlePassGo() {
    if (passGoDisabled) return;
    setPassGoSending(true);
    if (!passGo()) {
      setPassGoSending(false);
      toast.error("Couldn't send — you're offline right now.", { icon: "📡" });
      return;
    }
    toast(`Pass Go request sent — waiting for the banker to approve`, {
      icon: "🕒",
    });
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-md px-5 pb-32 pt-8 sm:max-w-lg lg:max-w-2xl">
      <header className="mb-5">
        <div className="flex items-center gap-2 pr-12 text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
          <span className="truncate font-mono">{gameId}</span>
          <span className="shrink-0 opacity-50">·</span>
          <span className="shrink-0">{onlineCount}/{players.length} online</span>
        </div>
        <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-text">
          Bank Dashboard
        </h1>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full border border-border-soft bg-surface px-3 py-1.5 text-text-faint">
            <Landmark className="h-3.5 w-3.5" />
            <span className="font-mono text-xs font-semibold tabular-nums">
              {formatCurrency(displayBank, edition)}
            </span>
          </div>
          <button
            onClick={() => goTo("ledger")}
            aria-label="View ledger"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
          >
            <History className="h-4 w-4" />
          </button>
          {trackProperties && (
            <button
              onClick={() => goTo("properties")}
              aria-label="View properties"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border-soft bg-surface text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
            >
              <Building2 className="h-4 w-4" />
            </button>
          )}
          {isBanker && (
            <button
              onClick={() => goTo("banker-console")}
              aria-label="Banker console"
              className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold transition-colors hover:bg-gold/15"
            >
              <ShieldAlert className="h-4 w-4" />
              {pendingRequestCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 font-mono text-[10px] font-bold text-white">
                  {pendingRequestCount}
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      <Button
        variant="secondary"
        size="lg"
        className="mb-6 w-full gap-2 border-gold/30 bg-gold/10 text-gold hover:bg-gold/15"
        onClick={handlePassGo}
        disabled={passGoDisabled}
      >
        <Sparkles className="h-4.5 w-4.5" />
        {hasPendingPassGo
          ? "Pass Go · Waiting for banker approval"
          : `Pass Go · Collect ${formatCurrency(edition.passGoAmount, edition)}`}
      </Button>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
          Standings
        </h2>
        <div className="flex flex-col gap-2">
          {ranked.map((player, i) => (
            <PlayerCard
              key={player.id}
              player={player}
              rank={i + 1}
              edition={edition}
              isSelf={player.id === selfId}
              onClick={() => viewPlayer(player.id)}
            />
          ))}
        </div>
      </section>

      {transactions.length > 0 && (
        <section className="mt-8">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
              Recent Activity
            </h2>
            <button
              onClick={() => goTo("ledger")}
              className="text-xs font-semibold text-text-faint transition-colors hover:text-text"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-border-soft rounded-2xl border border-border-soft bg-surface px-4">
            <AnimatePresence initial={false} mode="popLayout">
              {transactions.slice(0, 3).map((tx) => (
                <LedgerRow
                  key={tx.id}
                  tx={tx}
                  players={players}
                  editionId={editionId}
                  selfId={selfId}
                  now={now}
                />
              ))}
            </AnimatePresence>
          </div>
        </section>
      )}

      <motion.button
        onClick={() => setSheetOpen(true)}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-5 z-30 flex h-16 w-16 items-center justify-center rounded-full bg-green text-[#06170F] shadow-[0_10px_28px_-6px_rgba(33,165,103,0.6)] sm:right-[calc(50%-14rem)] lg:right-[calc(50%-30rem)]"
        aria-label="New Transaction"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </motion.button>

      <TransactionSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      <IncomingConfirmations />
      <MoneyRequestNotifier />
    </div>
  );
}
