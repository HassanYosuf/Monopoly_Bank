import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Inbox } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore, BANK_ID } from "@/store/useDashboardStore";
import { TRANSACTION_TYPES } from "@/lib/transactionTypes";
import { isRecent } from "@/lib/ledger";
import { TokenBadge } from "@/components/icons/token-badge";
import { LedgerRow } from "@/components/dashboard/LedgerRow";
import { cn } from "@/lib/utils";

type Filter = { kind: "all" } | { kind: "player"; id: string } | { kind: "type"; id: string };

const PAGE_SIZE = 8;

export function Ledger() {
  const goTo = useGameStore((s) => s.goTo);
  const players = useDashboardStore((s) => s.players);
  const transactions = useDashboardStore((s) => s.transactions);
  const editionId = useDashboardStore((s) => s.edition);
  const selfId = useDashboardStore((s) => s.selfId);

  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [earlierLimit, setEarlierLimit] = useState(PAGE_SIZE);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    if (filter.kind === "all") return transactions;
    if (filter.kind === "player") {
      return transactions.filter((t) => t.fromId === filter.id || t.toId === filter.id);
    }
    return transactions.filter((t) => t.type === filter.id);
  }, [transactions, filter]);

  const recent = filtered.filter((t) => isRecent(t.createdAt, now));
  const earlier = filtered.filter((t) => !isRecent(t.createdAt, now));
  const earlierShown = earlier.slice(0, earlierLimit);

  function selectFilter(f: Filter) {
    setFilter(f);
    setEarlierLimit(PAGE_SIZE);
  }

  return (
    <div className="mx-auto min-h-svh w-full max-w-md px-5 pb-16 pt-8 sm:max-w-lg lg:max-w-2xl">
      <div className="mb-5 flex items-center gap-3 pr-12">
        <button
          onClick={() => goTo("dashboard")}
          aria-label="Back to dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text">
          Ledger
        </h1>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <FilterChip
          active={filter.kind === "all"}
          onClick={() => selectFilter({ kind: "all" })}
          label="All"
        />
        {players.map((p) => (
          <FilterChip
            key={p.id}
            active={filter.kind === "player" && filter.id === p.id}
            onClick={() => selectFilter({ kind: "player", id: p.id })}
            label={p.name}
            avatar={<TokenBadge token={p.token} size={18} />}
          />
        ))}
        <FilterChip
          active={filter.kind === "player" && filter.id === BANK_ID}
          onClick={() => selectFilter({ kind: "player", id: BANK_ID })}
          label="Bank"
        />
        <div className="mx-1 my-auto h-4 w-px shrink-0 bg-border" />
        {TRANSACTION_TYPES.map((t) => (
          <FilterChip
            key={t.id}
            active={filter.kind === "type" && filter.id === t.id}
            onClick={() => selectFilter({ kind: "type", id: t.id })}
            label={t.label}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState />
      ) : (
        <motion.div layout className="flex flex-col">
          {recent.length > 0 && (
            <Section title="Just now">
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
            </Section>
          )}

          {earlierShown.length > 0 && (
            <Section title="Earlier this game">
              {earlierShown.map((tx) => (
                <LedgerRow
                  key={tx.id}
                  tx={tx}
                  players={players}
                  editionId={editionId}
                  selfId={selfId}
                  now={now}
                />
              ))}
            </Section>
          )}

          {earlier.length > earlierShown.length && (
            <button
              onClick={() => setEarlierLimit((n) => n + PAGE_SIZE)}
              className="mx-auto mt-2 rounded-full border border-border-soft bg-surface-2 px-5 py-2 text-sm font-semibold text-text-muted transition-colors hover:bg-surface-3 hover:text-text"
            >
              Load more
            </button>
          )}
        </motion.div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-1 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
        {title}
      </div>
      <div className="divide-y divide-border-soft rounded-2xl border border-border-soft bg-surface px-4">
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  avatar,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  avatar?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors active:scale-95",
        active
          ? "border-green bg-green/10 text-green-strong"
          : "border-border-soft bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text",
      )}
    >
      {avatar}
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface-2 text-text-faint">
        <Inbox className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-text">No transactions yet</p>
      <p className="mt-1 max-w-[22ch] text-sm text-text-faint">
        Every payment, payout, and trade at the table will show up here.
      </p>
    </div>
  );
}
