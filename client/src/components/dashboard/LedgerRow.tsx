import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { RuntimePlayer, Transaction } from "@/store/useDashboardStore";
import { BANK_ID } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency, type EditionId } from "@/lib/locale";
import { describeTransaction, relativeTime } from "@/lib/ledger";
import { transactionTypeById } from "@/lib/transactionTypes";

export function LedgerRow({
  tx,
  players,
  editionId,
  selfId,
  now,
}: {
  tx: Transaction;
  players: RuntimePlayer[];
  editionId: EditionId;
  selfId: string | null;
  now: number;
}) {
  const edition = EDITIONS[editionId];
  const type = transactionTypeById(tx.type);
  const tone = tx.toId === selfId ? "gain" : tx.fromId === selfId ? "loss" : "neutral";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ type: "spring", stiffness: 380, damping: 34 }}
      className="flex items-center gap-3 py-2.5"
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{
          background:
            tone === "gain"
              ? "color-mix(in srgb, var(--green) 16%, var(--surface-3))"
              : tone === "loss"
                ? "color-mix(in srgb, var(--red) 14%, var(--surface-3))"
                : "var(--surface-3)",
        }}
      >
        <type.Icon
          className="h-4 w-4"
          style={{
            color: tone === "gain" ? "var(--green-strong)" : tone === "loss" ? "var(--red)" : "var(--gold)",
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-text">
            {describeTransaction(tx, players)}
          </span>
          {tx.disputed && (
            <span
              className="flex shrink-0 items-center gap-0.5 rounded-full bg-red/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red"
              aria-label="Disputed"
            >
              <AlertTriangle className="h-2.5 w-2.5" />
              Disputed
            </span>
          )}
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-text-faint">
          {relativeTime(tx.createdAt, now)}
          {tx.fromId !== BANK_ID && tx.toId !== BANK_ID ? "" : " · Bank"}
        </div>
      </div>

      <div
        className="shrink-0 font-mono text-sm font-bold tabular-nums"
        style={{
          color: tone === "gain" ? "var(--green-strong)" : tone === "loss" ? "var(--red)" : "var(--text)",
        }}
      >
        {tone === "loss" ? "− " : tone === "gain" ? "+ " : ""}
        {formatCurrency(tx.amount, edition)}
      </div>
    </motion.div>
  );
}
