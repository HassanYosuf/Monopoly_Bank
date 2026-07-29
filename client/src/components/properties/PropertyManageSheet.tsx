import { useEffect, useState } from "react";
import { Building2, Gavel, Home, Landmark, Lock, Minus, Plus, Unlock } from "lucide-react";
import { toast } from "sonner";
import { useDashboardStore } from "@/store/useDashboardStore";
import { EDITIONS, formatAmount, formatCurrency } from "@/lib/locale";
import { COLOR_GROUP_LABEL, COLOR_GROUP_SWATCH, propertyById } from "@/lib/properties";
import { TokenBadge } from "@/components/icons/token-badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PropertyManageSheet({
  propertyId,
  onClose,
}: {
  propertyId: string | null;
  onClose: () => void;
}) {
  const editionId = useDashboardStore((s) => s.edition);
  const players = useDashboardStore((s) => s.players);
  const selfId = useDashboardStore((s) => s.selfId);
  const properties = useDashboardStore((s) => s.properties);
  const buyProperty = useDashboardStore((s) => s.buyProperty);
  const claimPropertyViaAuction = useDashboardStore((s) => s.claimPropertyViaAuction);
  const buildOnProperty = useDashboardStore((s) => s.buildOnProperty);
  const sellBuildingOnProperty = useDashboardStore((s) => s.sellBuildingOnProperty);
  const mortgageProperty = useDashboardStore((s) => s.mortgageProperty);
  const unmortgageProperty = useDashboardStore((s) => s.unmortgageProperty);
  const allowAuction = useDashboardStore((s) => s.allowAuction);

  const [auctionMode, setAuctionMode] = useState(false);
  const [auctionAmount, setAuctionAmount] = useState("");
  const [customName, setCustomName] = useState("");

  const edition = EDITIONS[editionId];
  const def = propertyId ? propertyById(editionId, propertyId) : undefined;
  const current = propertyId ? properties[propertyId] : undefined;
  const owner = current?.ownerId ? players.find((p) => p.id === current.ownerId) : undefined;
  const selfPlayer = players.find((p) => p.id === selfId);
  const isBanker = selfPlayer?.isBanker ?? false;
  const isMine = current?.ownerId === selfId;
  const canManage = isMine || isBanker;

  useEffect(() => {
    setCustomName(def && !current?.ownerId ? def.name : "");
  }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeAndReset() {
    setAuctionMode(false);
    setAuctionAmount("");
    setCustomName("");
    onClose();
  }

  function handleBuy() {
    if (!def || !customName.trim()) return;
    if (!buyProperty(def.id, customName)) {
      toast.error("Couldn't buy — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Bought ${customName.trim()} for ${formatCurrency(def.price, edition)}`, {
      icon: "🏠",
    });
    closeAndReset();
  }

  function handleAuctionClaim() {
    if (!def || !customName.trim()) return;
    const amount = Number(auctionAmount);
    if (!amount || amount <= 0) return;
    if (!claimPropertyViaAuction(def.id, amount, customName)) {
      toast.error("Couldn't claim — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Won ${customName.trim()} at auction for ${formatCurrency(amount, edition)}`, {
      icon: "🔨",
    });
    closeAndReset();
  }

  function handleBuild() {
    if (!def) return;
    if (!buildOnProperty(def.id)) {
      toast.error(
        current?.hasHotel ? "Already at a hotel — that's the max." : "Couldn't build right now.",
      );
      return;
    }
    toast.success(`Built on ${current?.name ?? def.name}`, { icon: "🏗️" });
  }

  function handleSell() {
    if (!def) return;
    if (!sellBuildingOnProperty(def.id)) {
      toast.error("Couldn't sell — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Sold a building on ${current?.name ?? def.name}`, { icon: "💰" });
  }

  function handleMortgage() {
    if (!def) return;
    if (!mortgageProperty(def.id)) {
      toast.error("Couldn't mortgage — sell any houses/hotel here first.");
      return;
    }
    toast.success(`Mortgaged ${current?.name ?? def.name} for ${formatCurrency(Math.floor(def.price / 2), edition)}`, {
      icon: "🔒",
    });
  }

  function handleUnmortgage() {
    if (!def) return;
    if (!unmortgageProperty(def.id)) {
      toast.error("Couldn't unmortgage — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Unmortgaged ${current?.name ?? def.name}`, { icon: "🔓" });
  }

  return (
    <Dialog open={!!propertyId} onOpenChange={(next) => !next && closeAndReset()}>
      <DialogContent>
        {def && (
          <>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: COLOR_GROUP_SWATCH[def.group] }}
              />
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                {COLOR_GROUP_LABEL[def.group]}
              </span>
            </div>
            <DialogTitle className="font-display text-xl font-bold text-text">
              {current?.name ?? def.name}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-text-muted">
              {formatCurrency(def.price, edition)}
              {def.buildable && <> · {formatCurrency(def.houseCost, edition)} per house</>}
            </DialogDescription>

            <div className="mt-4">
              {!owner && (
                <div className="mb-3">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                    <span>Name this property</span>
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.65rem] font-bold normal-case tracking-normal text-text-muted">
                      {def.buildable ? "City" : COLOR_GROUP_LABEL[def.group]}
                    </span>
                  </div>
                  <input
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="What's this square called on your board?"
                    className="h-11 w-full rounded-xl border border-border-soft bg-surface-2 px-3.5 text-sm font-medium text-text outline-none placeholder:text-text-faint focus:border-gold focus:ring-2 focus:ring-focus"
                  />
                </div>
              )}
              {!owner ? (
                auctionMode ? (
                  <div className="rounded-2xl border border-border-soft bg-surface-2 p-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                      Winning bid
                    </div>
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-border-soft bg-surface px-3.5">
                      <span className="font-mono text-lg text-text-faint">
                        {edition.currencySymbol}
                      </span>
                      <input
                        value={auctionAmount}
                        onChange={(e) => setAuctionAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        inputMode="numeric"
                        placeholder={formatAmount(def.price, edition)}
                        autoFocus
                        className="h-12 w-full bg-transparent font-mono text-lg font-bold text-text outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setAuctionMode(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!Number(auctionAmount) || !customName.trim()}
                        onClick={handleAuctionClaim}
                      >
                        Claim
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button className="w-full gap-2" disabled={!customName.trim()} onClick={handleBuy}>
                      Buy for {formatCurrency(def.price, edition)}
                    </Button>
                    {allowAuction && (
                      <button
                        onClick={() => setAuctionMode(true)}
                        className="flex items-center justify-center gap-1.5 rounded-full border border-dashed border-border py-2 text-sm font-semibold text-text-faint transition-colors hover:text-text"
                      >
                        <Gavel className="h-3.5 w-3.5" />
                        Declined — sell at auction instead
                      </button>
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 rounded-full border border-border-soft bg-surface-2 py-1.5 pl-1.5 pr-3.5 text-sm font-semibold text-text">
                    <TokenBadge token={owner.token} size={28} />
                    {owner.name}
                    {owner.id === selfId && (
                      <span className="font-normal text-text-faint">(You)</span>
                    )}
                  </div>

                  {current?.mortgaged && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-red/10 px-3 py-2 text-xs font-semibold text-red">
                      <Lock className="h-3.5 w-3.5" />
                      Mortgaged — no rent, no building until unmortgaged
                    </div>
                  )}

                  {def.buildable && !current?.mortgaged && (
                    <div className="flex items-center justify-between rounded-2xl border border-border-soft bg-surface-2 p-3.5">
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
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={handleSell}
                            disabled={!current || (current.houses === 0 && !current.hasHotel)}
                            aria-label="Sell a building"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-text transition-colors hover:bg-surface disabled:opacity-30"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={handleBuild}
                            disabled={current?.hasHotel}
                            aria-label="Build a house or hotel"
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-3 text-text transition-colors hover:bg-surface disabled:opacity-30"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {canManage && (
                    <Button
                      variant="secondary"
                      className="w-full gap-2"
                      disabled={
                        !current?.mortgaged &&
                        ((current?.houses ?? 0) > 0 || !!current?.hasHotel)
                      }
                      onClick={current?.mortgaged ? handleUnmortgage : handleMortgage}
                    >
                      {current?.mortgaged ? (
                        <>
                          <Unlock className="h-4 w-4" />
                          Unmortgage for{" "}
                          {formatCurrency(Math.ceil((def.price / 2) * 1.1), edition)}
                        </>
                      ) : (
                        <>
                          <Landmark className="h-4 w-4" />
                          Mortgage for {formatCurrency(Math.floor(def.price / 2), edition)}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
