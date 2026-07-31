import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";

// Toasts the requester once their own pending money request (e.g. Pass Go)
// has been approved or rejected by a banker — the request itself is only
// ever resolved by someone else's action, so this is the requester's one
// notification that something happened to it.
export function MoneyRequestNotifier() {
  const moneyRequests = useDashboardStore((s) => s.moneyRequests);
  const selfId = useDashboardStore((s) => s.selfId);
  const editionId = useDashboardStore((s) => s.edition);
  const edition = EDITIONS[editionId];
  const seenIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    const ownResolved = moneyRequests.filter(
      (r) => r.requestedBy === selfId && r.status !== "pending",
    );

    if (seenIds.current === null) {
      seenIds.current = new Set(ownResolved.map((r) => r.id));
      return;
    }

    ownResolved
      .filter((r) => !seenIds.current!.has(r.id))
      .forEach((r) => {
        seenIds.current!.add(r.id);
        if (r.status === "approved") {
          toast.success(`Banker approved — +${formatCurrency(r.amount, edition)}`, {
            icon: "✅",
          });
        } else {
          toast.error("Banker rejected your request", { icon: "🚫" });
        }
      });
  }, [moneyRequests, selfId, edition]);

  return null;
}
