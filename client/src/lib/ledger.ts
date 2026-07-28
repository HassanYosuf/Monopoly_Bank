import type { RuntimePlayer, Transaction } from "@/store/useDashboardStore";
import { BANK_ID } from "@/store/useDashboardStore";

export function nameFor(id: string, players: RuntimePlayer[]): string {
  if (id === BANK_ID) return "Bank";
  return players.find((p) => p.id === id)?.name ?? "Someone";
}

export function describeTransaction(tx: Transaction, players: RuntimePlayer[]): string {
  const from = nameFor(tx.fromId, players);
  const to = nameFor(tx.toId, players);

  switch (tx.type) {
    case "rent":
      return `${from} paid ${to} rent`;
    case "tax":
      return `${from} paid tax`;
    case "buy-property":
      return `${from} bought ${tx.memo || "a property"}`;
    case "bank-payout":
      return tx.memo === "Passed Go" ? `${to} passed Go` : `${to} collected a bank payout`;
    case "pass-go":
      return `${to} passed Go`;
    case "trade":
      return `${from} traded with ${to}${tx.memo ? ` — ${tx.memo}` : ""}`;
    case "mortgage":
      return `${to} mortgaged ${tx.memo || "a property"}`;
    case "custom":
      return `${from} paid ${to}${tx.memo ? ` — ${tx.memo}` : ""}`;
    default:
      return `${from} paid ${to}`;
  }
}

export function relativeTime(timestamp: number, now: number): string {
  const diffMs = now - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ago`;
}

const RECENT_WINDOW_MS = 2 * 60 * 1000;

export function isRecent(timestamp: number, now: number): boolean {
  return now - timestamp < RECENT_WINDOW_MS;
}

/** True only for a transaction between two players (never touching the bank). */
export function isPeerToPeer(tx: Transaction): boolean {
  return tx.fromId !== BANK_ID && tx.toId !== BANK_ID;
}
