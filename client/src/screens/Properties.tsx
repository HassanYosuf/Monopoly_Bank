import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Building2, Home, Lock } from "lucide-react";
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
import { PropertyManageSheet } from "@/components/properties/PropertyManageSheet";
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

  const edition = EDITIONS[editionId];
  const defs = PROPERTIES[editionId];

  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [managingPropertyId, setManagingPropertyId] = useState<string | null>(null);

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

                  return (
                    <button
                      key={def.id}
                      onClick={() => setManagingPropertyId(def.id)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-border-soft bg-surface p-4 text-left transition-colors active:scale-[0.98] hover:bg-surface-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-text">{def.name}</div>
                        <div className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-text-faint">
                          {formatCurrency(def.price, edition)}
                          {current?.mortgaged && (
                            <span className="flex items-center gap-0.5 font-sans font-semibold text-red">
                              <Lock className="h-3 w-3" />
                              Mortgaged
                            </span>
                          )}
                          {!current?.mortgaged && current?.hasHotel && (
                            <span className="flex items-center gap-0.5 font-sans font-semibold text-gold">
                              <Building2 className="h-3 w-3" />
                              Hotel
                            </span>
                          )}
                          {!current?.mortgaged && !current?.hasHotel && (current?.houses ?? 0) > 0 && (
                            <span className="flex items-center gap-0.5 font-sans font-semibold text-text-muted">
                              <Home className="h-3 w-3" />
                              {current!.houses}/4
                            </span>
                          )}
                        </div>
                      </div>

                      {owner ? (
                        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-border-soft bg-surface-2 py-1 pl-1 pr-2.5 text-xs font-semibold text-text-muted">
                          <TokenBadge token={owner.token} size={20} />
                          {owner.name}
                        </div>
                      ) : (
                        <span className="shrink-0 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-text-faint">
                          Unowned
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <PropertyManageSheet
        propertyId={managingPropertyId}
        onClose={() => setManagingPropertyId(null)}
      />
    </motion.div>
  );
}
