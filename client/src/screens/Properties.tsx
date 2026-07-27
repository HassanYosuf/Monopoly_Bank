import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Home, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";
import {
  COLOR_GROUP_LABEL,
  COLOR_GROUP_SWATCH,
  PROPERTIES,
  TOTAL_HOTELS,
  TOTAL_HOUSES,
  type ColorGroup,
  type PropertyDef,
} from "@/lib/properties";
import { TokenBadge } from "@/components/icons/token-badge";
import { cn } from "@/lib/utils";

const GROUP_ORDER: ColorGroup[] = [
  "brown",
  "lightblue",
  "pink",
  "orange",
  "red",
  "yellow",
  "green",
  "darkblue",
  "railroad",
  "utility",
];

export function Properties() {
  const goTo = useGameStore((s) => s.goTo);
  const editionId = useDashboardStore((s) => s.edition);
  const players = useDashboardStore((s) => s.players);
  const selfId = useDashboardStore((s) => s.selfId);
  const properties = useDashboardStore((s) => s.properties);
  const buyProperty = useDashboardStore((s) => s.buyProperty);
  const buildOnProperty = useDashboardStore((s) => s.buildOnProperty);
  const sellBuildingOnProperty = useDashboardStore((s) => s.sellBuildingOnProperty);

  const edition = EDITIONS[editionId];
  const defs = PROPERTIES[editionId];

  const [filter, setFilter] = useState<"all" | "mine">("all");

  const grouped = useMemo(() => {
    const byGroup = new Map<ColorGroup, PropertyDef[]>();
    GROUP_ORDER.forEach((g) => byGroup.set(g, []));
    defs.forEach((p) => byGroup.get(p.group)?.push(p));
    return byGroup;
  }, [defs]);

  const totals = useMemo(
    () =>
      Object.values(properties).reduce(
        (acc, p) => ({
          houses: acc.houses + p.houses,
          hotels: acc.hotels + (p.hasHotel ? 1 : 0),
        }),
        { houses: 0, hotels: 0 },
      ),
    [properties],
  );

  function playerFor(id: string | null) {
    return id ? players.find((p) => p.id === id) : undefined;
  }

  function handleBuy(def: PropertyDef) {
    if (!buyProperty(def.id)) {
      toast.error("Couldn't buy — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Bought ${def.name} for ${formatCurrency(def.price, edition)}`, { icon: "🏠" });
  }

  function handleBuild(def: PropertyDef) {
    if (!buildOnProperty(def.id)) {
      const current = properties[def.id];
      if (current?.hasHotel) {
        toast.error("Already at a hotel — that's the maximum.");
      } else if (totals.hotels >= TOTAL_HOTELS && current?.houses === 4) {
        toast.error("No hotels left in the bank.");
      } else if (totals.houses >= TOTAL_HOUSES) {
        toast.error("No houses left in the bank.");
      } else {
        toast.error("Couldn't build — you're offline right now.", { icon: "📡" });
      }
      return;
    }
    toast.success(`Built on ${def.name}`, { icon: "🏗️" });
  }

  function handleSell(def: PropertyDef) {
    if (!sellBuildingOnProperty(def.id)) {
      toast.error("Couldn't sell — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Sold a building on ${def.name}`, { icon: "💰" });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="mx-auto min-h-svh w-full max-w-md px-5 pb-16 pt-8 sm:max-w-lg lg:max-w-2xl"
    >
      <div className="mb-2 flex items-center gap-3 pr-12">
        <button
          onClick={() => goTo("dashboard")}
          aria-label="Back to dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-text">
          Properties
        </h1>
      </div>

      <div className="mb-5 flex items-center gap-3 pl-12 text-xs font-semibold text-text-faint">
        <span className="font-mono tabular-nums">
          {TOTAL_HOUSES - totals.houses}/{TOTAL_HOUSES} houses
        </span>
        <span className="opacity-50">·</span>
        <span className="font-mono tabular-nums">
          {TOTAL_HOTELS - totals.hotels}/{TOTAL_HOTELS} hotels
        </span>
      </div>

      <div className="mb-5 flex gap-2 pl-12">
        {(["all", "mine"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              filter === f
                ? "border-green bg-green/10 text-green-strong"
                : "border-border-soft bg-surface-2 text-text-muted hover:bg-surface-3 hover:text-text",
            )}
          >
            {f === "all" ? "All" : "Mine"}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {GROUP_ORDER.map((group) => {
          const groupDefs = grouped.get(group) ?? [];
          const visible =
            filter === "all"
              ? groupDefs
              : groupDefs.filter((d) => properties[d.id]?.ownerId === selfId);
          if (visible.length === 0) return null;

          return (
            <div key={group}>
              <div className="mb-2 flex items-center gap-2 pl-1">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: COLOR_GROUP_SWATCH[group] }}
                />
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
                  {COLOR_GROUP_LABEL[group]}
                </h2>
              </div>
              <div className="flex flex-col gap-2">
                {visible.map((def) => {
                  const current = properties[def.id];
                  const owner = playerFor(current?.ownerId ?? null);
                  const isMine = current?.ownerId === selfId;

                  return (
                    <div
                      key={def.id}
                      className="rounded-2xl border border-border-soft bg-surface p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-text">{def.name}</div>
                          <div className="mt-0.5 font-mono text-xs text-text-faint">
                            {formatCurrency(def.price, edition)}
                            {def.buildable && (
                              <> · {formatCurrency(def.houseCost, edition)}/house</>
                            )}
                          </div>
                        </div>

                        {owner ? (
                          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-soft bg-surface-2 py-1 pl-1 pr-2.5 text-xs font-semibold text-text-muted">
                            <TokenBadge token={owner.token} size={20} />
                            {owner.name}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleBuy(def)}
                            className="shrink-0 rounded-full bg-green px-3 py-1.5 text-xs font-bold text-[#06170F] transition-transform active:scale-95"
                          >
                            Buy
                          </button>
                        )}
                      </div>

                      {isMine && def.buildable && (
                        <div className="mt-3 flex items-center justify-between border-t border-border-soft pt-3">
                          <div className="flex items-center gap-1.5">
                            {current?.hasHotel ? (
                              <span className="flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-xs font-bold text-gold">
                                <Building2 className="h-3.5 w-3.5" />
                                Hotel
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                                <Home className="h-3.5 w-3.5" />
                                {current?.houses ?? 0}/4 houses
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleSell(def)}
                              disabled={!current || (current.houses === 0 && !current.hasHotel)}
                              aria-label={`Sell a building on ${def.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-text transition-colors hover:bg-surface-2 disabled:opacity-30"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleBuild(def)}
                              disabled={current?.hasHotel}
                              aria-label={`Build on ${def.name}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-text transition-colors hover:bg-surface-2 disabled:opacity-30"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
