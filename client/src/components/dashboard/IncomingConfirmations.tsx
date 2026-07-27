import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useDashboardStore } from "@/store/useDashboardStore";
import type { Transaction } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";
import { describeTransaction, isPeerToPeer, nameFor } from "@/lib/ledger";
import { transactionTypeById } from "@/lib/transactionTypes";
import { TokenBadge } from "@/components/icons/token-badge";

function IncomingToastCard({
  tx,
  onAccept,
  onDispute,
}: {
  tx: Transaction;
  onAccept: () => void;
  onDispute: () => void;
}) {
  const players = useDashboardStore((s) => s.players);
  const editionId = useDashboardStore((s) => s.edition);
  const edition = EDITIONS[editionId];
  const senderId = tx.createdBy;
  const sender = players.find((p) => p.id === senderId);
  const type = transactionTypeById(tx.type);

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex w-[calc(100vw-2rem)] max-w-sm items-start gap-3 rounded-2xl border border-gold/30 bg-surface p-4 shadow-2xl"
    >
      {sender ? (
        <TokenBadge token={sender.token} size={40} />
      ) : (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-3 text-gold">
          <type.Icon className="h-4.5 w-4.5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text">{describeTransaction(tx, players)}</p>
        <p className="mt-0.5 font-mono text-xs text-text-faint">
          {formatCurrency(tx.amount, edition)} · from {nameFor(senderId, players)}
        </p>
        <div className="mt-3 flex gap-2">
          <button
            autoFocus
            onClick={onAccept}
            className="flex-1 rounded-full bg-green px-3 py-1.5 text-xs font-bold text-[#06170F] transition-transform active:scale-95"
          >
            Accept
          </button>
          <button
            onClick={onDispute}
            className="flex-1 rounded-full border border-red/40 px-3 py-1.5 text-xs font-bold text-red transition-transform active:scale-95"
          >
            Dispute
          </button>
        </div>
      </div>
    </div>
  );
}

export function IncomingConfirmations() {
  const transactions = useDashboardStore((s) => s.transactions);
  const selfId = useDashboardStore((s) => s.selfId);
  const disputeTransaction = useDashboardStore((s) => s.disputeTransaction);
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (seenIds.current === null) {
      seenIds.current = new Set(transactions.map((t) => t.id));
      return;
    }

    const fresh = transactions.filter((t) => !seenIds.current!.has(t.id));
    fresh.forEach((t) => seenIds.current!.add(t.id));

    fresh
      .filter(
        (t) =>
          isPeerToPeer(t) &&
          t.createdBy !== selfId &&
          (t.fromId === selfId || t.toId === selfId),
      )
      .forEach((t) => {
        toast.custom(
          (id) => (
            <IncomingToastCard
              tx={t}
              onAccept={() => toast.dismiss(id)}
              onDispute={() => {
                disputeTransaction(t.id);
                toast.dismiss(id);
                toast.error("Flagged for the banker to review", { icon: "🚩" });
              }}
            />
          ),
          { duration: 12_000 },
        );
      });
  }, [transactions, selfId, disputeTransaction]);

  return null;
}
