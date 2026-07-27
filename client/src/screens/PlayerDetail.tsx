import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Building2, Crown, Home, Inbox, Lock } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";
import { useAnimatedNumber } from "@/lib/useAnimatedNumber";
import { computeBalanceHistory } from "@/lib/balanceHistory";
import { isRecent } from "@/lib/ledger";
import { COLOR_GROUP_SWATCH, propertyById } from "@/lib/properties";
import { TokenBadge } from "@/components/icons/token-badge";
import { BalanceSparkline } from "@/components/dashboard/BalanceSparkline";
import { LedgerRow } from "@/components/dashboard/LedgerRow";
import { PropertyManageSheet } from "@/components/properties/PropertyManageSheet";

export function PlayerDetail() {
  const goTo = useGameStore((s) => s.goTo);
  const selectedPlayerId = useGameStore((s) => s.selectedPlayerId);
  const players = useDashboardStore((s) => s.players);
  const transactions = useDashboardStore((s) => s.transactions);
  const editionId = useDashboardStore((s) => s.edition);
  const selfId = useDashboardStore((s) => s.selfId);
  const startedAt = useDashboardStore((s) => s.startedAt);

  const properties = useDashboardStore((s) => s.properties);
  const trackProperties = useDashboardStore((s) => s.trackProperties);

  const edition = EDITIONS[editionId];
  const player = players.find((p) => p.id === selectedPlayerId);
  const displayBalance = useAnimatedNumber(player?.balance ?? 0);
  const [now, setNow] = useState(() => Date.now());
  const [managingPropertyId, setManagingPropertyId] = useState<string | null>(null);

  const ownedProperties = useMemo(
    () => Object.values(properties).filter((p) => p.ownerId === player?.id),
    [properties, player],
  );

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const history = useMemo(() => {
    if (!player || !startedAt) return [];
    // Every player's real balance starts at 0 server-side — their starting
    // cash is itself a transaction in the log, so folding from 0 replays
    // the true trajectory without needing to know any local "rules" value.
    return computeBalanceHistory(player.id, 0, transactions, startedAt, now);
  }, [player, transactions, startedAt, now]);

  const playerTx = useMemo(
    () => transactions.filter((t) => t.fromId === player?.id || t.toId === player?.id),
    [transactions, player],
  );
  const recent = playerTx.filter((t) => isRecent(t.createdAt, now));
  const earlier = playerTx.filter((t) => !isRecent(t.createdAt, now));

  if (!player) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center px-5 text-center">
        <p className="text-text-muted">Player not found.</p>
        <button onClick={() => goTo("dashboard")} className="mt-4 text-sm font-bold text-green-strong">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-md px-5 pb-16 pt-8 sm:max-w-lg lg:max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => goTo("dashboard")}
          aria-label="Back to dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-6 flex flex-col items-center text-center">
        <TokenBadge token={player.token} size={72} />
        <div className="mt-3 flex items-center gap-1.5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-text">
            {player.name}
            {player.id === selfId && <span className="font-normal text-text-faint"> (You)</span>}
          </h1>
          {player.isBanker && <Crown className="h-5 w-5 text-gold" />}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-text-faint">
          <span className={player.isOnline ? "text-green-strong" : ""}>
            {player.isBankrupt ? "Bankrupt" : player.isOnline ? "Online" : "Offline"}
          </span>
        </div>
        <div className="mt-4 font-mono text-4xl font-extrabold tabular-nums text-text">
          {formatCurrency(displayBalance, edition)}
        </div>
      </div>

      {history.length > 1 && (
        <section className="mb-8 rounded-2xl border border-border-soft bg-surface p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
            Balance Over Time
          </h2>
          <BalanceSparkline points={history} edition={edition} />
        </section>
      )}

      {trackProperties && ownedProperties.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
            Properties Owned
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {ownedProperties.map((prop) => {
              const def = propertyById(editionId, prop.propertyId);
              if (!def) return null;
              const swatch = COLOR_GROUP_SWATCH[def.group];
              return (
                <button
                  key={prop.propertyId}
                  onClick={() => setManagingPropertyId(prop.propertyId)}
                  className="flex shrink-0 flex-col items-start gap-2 text-left"
                >
                  <div
                    className="flex h-28 w-32 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-center transition-transform active:scale-95"
                    style={{ borderColor: swatch, backgroundColor: `${swatch}1a` }}
                  >
                    {prop.mortgaged ? (
                      <Lock className="h-6 w-6" style={{ color: swatch }} />
                    ) : prop.hasHotel ? (
                      <Building2 className="h-6 w-6" style={{ color: swatch }} />
                    ) : (
                      <Home className="h-6 w-6" style={{ color: swatch }} />
                    )}
                    <span
                      className="line-clamp-2 text-xs font-extrabold leading-tight"
                      style={{ color: swatch }}
                    >
                      {def.name}
                    </span>
                  </div>
                  <div className="w-32 text-xs text-text-faint">
                    {prop.mortgaged
                      ? "Mortgaged"
                      : prop.hasHotel
                        ? "Hotel"
                        : prop.houses > 0
                          ? `${prop.houses} house${prop.houses > 1 ? "s" : ""}`
                          : "No buildings yet"}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <PropertyManageSheet
        propertyId={managingPropertyId}
        onClose={() => setManagingPropertyId(null)}
      />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
          Transaction History
        </h2>

        {playerTx.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-text-faint">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-text">No activity yet</p>
          </div>
        ) : (
          <>
            {recent.length > 0 && (
              <div className="mb-5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                  Just now
                </div>
                <div className="divide-y divide-border-soft rounded-2xl border border-border-soft bg-surface px-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {recent.map((tx) => (
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
              </div>
            )}
            {earlier.length > 0 && (
              <motion.div layout>
                <div className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                  Earlier this game
                </div>
                <div className="divide-y divide-border-soft rounded-2xl border border-border-soft bg-surface px-4">
                  <AnimatePresence initial={false} mode="popLayout">
                    {earlier.map((tx) => (
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
              </motion.div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
