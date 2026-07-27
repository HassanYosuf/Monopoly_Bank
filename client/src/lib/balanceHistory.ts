import type { Transaction } from "@/store/useDashboardStore";

export interface BalancePoint {
  t: number;
  balance: number;
}

export function computeBalanceHistory(
  playerId: string,
  startingBalance: number,
  transactions: Transaction[],
  gameStartedAt: number,
  now: number,
): BalancePoint[] {
  const relevant = transactions
    .filter((t) => t.fromId === playerId || t.toId === playerId)
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt);

  const points: BalancePoint[] = [{ t: gameStartedAt, balance: startingBalance }];
  let running = startingBalance;
  for (const t of relevant) {
    running += t.toId === playerId ? t.amount : -t.amount;
    points.push({ t: t.createdAt, balance: running });
  }
  const last = points[points.length - 1];
  if (last.t < now) points.push({ t: now, balance: running });
  return points;
}
