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
  const giveUpProperty = useDashboardStore((s) => s.giveUpProperty);
  const allowAuction = useDashboardStore((s) => s.allowAuction);

  const [auctionMode, setAuctionMode] = useState(false);
  const [auctionAmount, setAuctionAmount] = useState("");
  const [customName, setCustomName] = useState("");
  const [confirmGiveUp, setConfirmGiveUp] = useState(false);

  const edition = EDITIONS[editionId];
  // Properties bought with "Track Properties" off aren't in the fixed
  // catalog (they're named freehand at purchase time), so there's no
  // color-group def for them — just whatever got recorded as `current`.
  const def = propertyId ? propertyById(editionId, propertyId) : undefined;
  const current = propertyId ? properties[propertyId] : undefined;
  const owner = current?.ownerId ? players.find((p) => p.id === current.ownerId) : undefined;
  const selfPlayer = players.find((p) => p.id === selfId);
  const isBanker = selfPlayer?.isBanker ?? false;
  const isMine = current?.ownerId === selfId;
  const canManage = isMine || isBanker;

  const displayName = current?.name ?? def?.name ?? "";
  const displayPrice = current?.price ?? def?.price ?? 0;
  const buildable = current?.buildable ?? def?.buildable ?? false;
  const houseCost = current?.houseCost ?? def?.houseCost ?? 0;
  const auctionBidTooHigh = Number(auctionAmount) > (selfPlayer?.balance ?? 0);

  useEffect(() => {
    setCustomName(def && !current?.ownerId ? def.name : "");
  }, [propertyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function closeAndReset() {
    setAuctionMode(false);
    setAuctionAmount("");
    setCustomName("");
    setConfirmGiveUp(false);
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
    if (!amount || amount <= 0 || auctionBidTooHigh) return;
    if (!claimPropertyViaAuction(def.id, amount, customName)) {
      toast.error("Couldn't claim — you're offline, or that's more than your balance.", {
        icon: "📡",
      });
      return;
    }
    toast.success(`Won ${customName.trim()} at auction for ${formatCurrency(amount, edition)}`, {
      icon: "🔨",
    });
    closeAndReset();
  }

  function handleBuild() {
    if (!propertyId) return;
    if (!buildOnProperty(propertyId)) {
      toast.error(
        current?.hasHotel ? "Already at a hotel — that's the max." : "Couldn't build right now.",
      );
      return;
    }
    toast.success(`Built on ${displayName}`, { icon: "🏗️" });
  }

  function handleSell() {
    if (!propertyId) return;
    if (!sellBuildingOnProperty(propertyId)) {
      toast.error("Couldn't sell — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Sold a building on ${displayName}`, { icon: "💰" });
  }

  function handleMortgage() {
    if (!propertyId) return;
    if (!mortgageProperty(propertyId)) {
      toast.error("Couldn't mortgage — sell any houses/hotel here first.");
      return;
    }
    toast.success(`Mortgaged ${displayName} for ${formatCurrency(Math.floor(displayPrice / 2), edition)}`, {
      icon: "🔒",
    });
  }

  function handleUnmortgage() {
    if (!propertyId) return;
    if (!unmortgageProperty(propertyId)) {
      toast.error("Couldn't unmortgage — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`Unmortgaged ${displayName}`, { icon: "🔓" });
  }

  function handleGiveUp() {
    if (!propertyId) return;
    if (!giveUpProperty(propertyId)) {
      toast.error("Couldn't release — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(`${displayName} released back to the bank`, { icon: "🏳️" });
    closeAndReset();
  }

  return (
    <Dialog open={!!propertyId} onOpenChange={(next) => !next && closeAndReset()}>
      <DialogContent>
        {(def || current) && (
          <>
            <div className="mb-1 flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: def ? COLOR_GROUP_SWATCH[def.group] : "#9ca3af" }}
              />
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                {def ? COLOR_GROUP_LABEL[def.group] : "Property"}
              </span>
            </div>
            <DialogTitle className="font-display text-xl font-bold text-text">
              {displayName}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm text-text-muted">
              {formatCurrency(displayPrice, edition)}
              {buildable && <> · {formatCurrency(houseCost, edition)} per house</>}
            </DialogDescription>

            <div className="mt-4">
              {!owner && def && (
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
              {!owner && def ? (
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
                    {auctionBidTooHigh && (
                      <p className="mb-3 text-xs font-semibold text-red">
                        That's more than your current balance
                        {selfPlayer && ` (${formatCurrency(selfPlayer.balance, edition)})`}.
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1" onClick={() => setAuctionMode(false)}>
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        disabled={!Number(auctionAmount) || !customName.trim() || auctionBidTooHigh}
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
              ) : owner ? (
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

                  {buildable && !current?.mortgaged && (
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
                          {formatCurrency(Math.ceil((displayPrice / 2) * 1.1), edition)}
                        </>
                      ) : (
                        <>
                          <Landmark className="h-4 w-4" />
                          Mortgage for {formatCurrency(Math.floor(displayPrice / 2), edition)}
                        </>
                      )}
                    </Button>
                  )}

                  {current?.mortgaged && canManage && (
                    confirmGiveUp ? (
                      <div className="rounded-2xl border border-red/30 bg-red/5 p-3.5">
                        <p className="mb-3 text-xs font-semibold text-red">
                          Releases {displayName} back to the bank for $0 — it becomes unowned
                          and can be bought or auctioned by anyone from here on.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => setConfirmGiveUp(false)}
                          >
                            Cancel
                          </Button>
                          <Button variant="destructive" className="flex-1" onClick={handleGiveUp}>
                            Give Up
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmGiveUp(true)}
                        className="flex items-center justify-center gap-1.5 rounded-full border border-dashed border-red/40 py-2 text-sm font-semibold text-red transition-colors hover:bg-red/5"
                      >
                        <Gavel className="h-3.5 w-3.5" />
                        Give up property
                      </button>
                    )
                  )}
                </div>
              ) : null}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
