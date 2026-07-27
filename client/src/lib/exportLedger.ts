import type { RuntimePlayer, Transaction } from "@/store/useDashboardStore";
import { nameFor } from "@/lib/ledger";

export function buildLedgerCsv(transactions: Transaction[], players: RuntimePlayer[]): string {
  const header = "Time,From,To,Amount,Type,Memo,Disputed";
  const rows = [...transactions]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((t) => {
      const time = new Date(t.createdAt).toISOString();
      const from = nameFor(t.fromId, players);
      const to = nameFor(t.toId, players);
      const memo = t.memo.replace(/"/g, '""');
      return `${time},"${from}","${to}",${t.amount},${t.type},"${memo}",${t.disputed ? "yes" : "no"}`;
    });
  return [header, ...rows].join("\n");
}

export function downloadLedgerCsv(
  transactions: Transaction[],
  players: RuntimePlayer[],
  gameId: string | null,
) {
  const csv = buildLedgerCsv(transactions, players);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ledger-${gameId ?? "game"}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
