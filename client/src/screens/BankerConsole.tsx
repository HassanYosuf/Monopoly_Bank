import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  Gavel,
  Home,
  Landmark,
  Lock,
  LogOut,
  ShieldAlert,
  Sparkles,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { useGameStore } from "@/store/useGameStore";
import { useDashboardStore, BANK_ID } from "@/store/useDashboardStore";
import { EDITIONS, formatCurrency } from "@/lib/locale";
import { TOTAL_HOTELS, TOTAL_HOUSES } from "@/lib/properties";
import { TokenBadge } from "@/components/icons/token-badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function PendingRequestsCard() {
  const moneyRequests = useDashboardStore((s) => s.moneyRequests);
  const players = useDashboardStore((s) => s.players);
  const selfId = useDashboardStore((s) => s.selfId);
  const resolveMoneyRequest = useDashboardStore((s) => s.resolveMoneyRequest);
  const editionId = useDashboardStore((s) => s.edition);
  const edition = EDITIONS[editionId];

  // Real network latency (unlike an instant local connection) leaves a
  // visible window between clicking and the row actually disappearing —
  // long enough that a second tap in that window is common. Track
  // in-flight ids locally so a repeat click on the same row is a no-op
  // instead of racing the first click's round trip.
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());

  const pending = moneyRequests
    .filter((r) => r.status === "pending")
    .sort((a, b) => a.requestedAt - b.requestedAt);

  if (pending.length === 0) return null;

  function respond(id: string, approved: boolean) {
    if (resolvingIds.has(id)) return;
    setResolvingIds((prev) => new Set(prev).add(id));

    const result = resolveMoneyRequest(id, approved);
    if (result === "offline") {
      toast.error("Couldn't respond — you're offline right now.", { icon: "📡" });
    } else if (result === "already-resolved") {
      toast("Already handled — someone beat you to it.", { icon: "⏱️" });
    } else {
      toast.success(approved ? "Approved" : "Rejected", { icon: approved ? "✅" : "🚫" });
    }

    if (result !== "sent") {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4">
      <h3 className="mb-3 text-sm font-bold text-text">
        Pending Requests
        <span className="ml-1.5 text-text-faint">({pending.length})</span>
      </h3>
      <div className="flex flex-col gap-2">
        {pending.map((r) => {
          const requester = players.find((p) => p.id === r.requestedBy);
          return (
            <div
              key={r.id}
              className="flex flex-col gap-3 rounded-xl border border-border-soft bg-surface p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {requester && <TokenBadge token={requester.token} size={32} />}
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-text">
                    {requester?.name ?? "Someone"}
                    {r.requestedBy === selfId && (
                      <span className="ml-1.5 text-xs font-semibold text-gold">(you)</span>
                    )}
                  </div>
                  <div className="truncate text-xs text-text-muted">
                    {r.memo || "Bank payout"} · {formatCurrency(r.amount, edition)}
                  </div>
                </div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 sm:flex-none"
                  disabled={resolvingIds.has(r.id)}
                  onClick={() => respond(r.id, false)}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={resolvingIds.has(r.id)}
                  onClick={() => respond(r.id, true)}
                >
                  Approve
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdjustBalanceCard() {
  const players = useDashboardStore((s) => s.players);
  const sendTransaction = useDashboardStore((s) => s.sendTransaction);
  const editionId = useDashboardStore((s) => s.edition);
  const edition = EDITIONS[editionId];

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);

  const player = players.find((p) => p.id === playerId);
  const numericAmount = Number(amount) || 0;

  function apply() {
    if (!player || numericAmount <= 0) return;
    const legs =
      direction === "credit"
        ? { fromId: BANK_ID, toId: player.id }
        : { fromId: player.id, toId: BANK_ID };
    const sent = sendTransaction({
      type: "custom",
      ...legs,
      amount: numericAmount,
      memo: "Banker adjustment",
    });
    setOpen(false);
    if (!sent) {
      toast.error("Couldn't apply — you're offline right now.", { icon: "📡" });
      return;
    }
    toast.success(
      `${direction === "credit" ? "Credited" : "Debited"} ${formatCurrency(numericAmount, edition)} ${direction === "credit" ? "to" : "from"} ${player.name}`,
      { icon: "🏦" },
    );
    setAmount("");
    setPlayerId(null);
  }

  return (
    <div className="rounded-2xl border border-border-soft bg-surface p-4">
      <h3 className="mb-3 text-sm font-bold text-text">Manual Adjustment</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlayerId(p.id)}
            aria-pressed={playerId === p.id}
            className={cn(
              "flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold transition-colors",
              playerId === p.id
                ? "border-gold bg-gold/10 text-text"
                : "border-border-soft bg-surface-2 text-text-muted hover:bg-surface-3",
            )}
          >
            <TokenBadge token={p.token} size={24} />
            {p.name}
          </button>
        ))}
      </div>

      <div className="mb-3 flex gap-2 rounded-full bg-surface-2 p-1">
        {(["credit", "debit"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirection(d)}
            className={cn(
              "flex-1 rounded-full py-2 text-sm font-bold transition-colors",
              direction === d
                ? d === "credit"
                  ? "bg-green text-[#06170F]"
                  : "bg-red text-white"
                : "text-text-muted hover:text-text",
            )}
          >
            {d === "credit" ? "Credit (+)" : "Debit (−)"}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-xl border border-border-soft bg-surface-2 px-3.5">
        <span className="font-mono text-lg text-text-faint">{edition.currencySymbol}</span>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          placeholder="0"
          className="h-12 w-full bg-transparent font-mono text-lg font-bold text-text outline-none"
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            variant="secondary"
            className="w-full border-gold/30 bg-gold/10 text-gold hover:bg-gold/15"
            disabled={!player || numericAmount <= 0}
          >
            Review Adjustment
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle className="font-display text-lg font-bold text-text">
            Confirm adjustment
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-text-muted">
            {player && (
              <>
                {direction === "credit" ? "Credit" : "Debit"}{" "}
                <span className="font-bold text-text">
                  {formatCurrency(numericAmount, edition)}
                </span>{" "}
                {direction === "credit" ? "to" : "from"}{" "}
                <span className="font-bold text-text">{player.name}</span>'s balance. This
                applies immediately and can't be undone automatically.
              </>
            )}
          </DialogDescription>
          <div className="mt-5 flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={apply}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Read-only — houses/hotels in play are now derived from what's actually
// built on the Properties screen, not a manually-adjustable tally.
function InventorySummary({
  label,
  Icon,
  remaining,
  total,
}: {
  label: string;
  Icon: typeof Home;
  remaining: number;
  total: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border-soft bg-surface p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-gold">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className="text-sm font-bold text-text">{label}</div>
      </div>
      <span className="font-mono text-sm font-bold tabular-nums text-text-muted">
        {remaining} of {total} left
      </span>
    </div>
  );
}

function RuleRow({
  icon,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border-soft bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-text-muted">
          {icon}
        </div>
        <div>
          <div className="text-sm font-bold text-text">{label}</div>
          <div className="mt-0.5 text-sm text-text-muted">{description}</div>
        </div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className="mt-1 shrink-0"
      />
    </div>
  );
}

export function BankerConsole() {
  const goTo = useGameStore((s) => s.goTo);
  const isLocked = useDashboardStore((s) => s.isLocked);
  const toggleLocked = useDashboardStore((s) => s.toggleLocked);
  const properties = useDashboardStore((s) => s.properties);
  const useFreeParking = useDashboardStore((s) => s.useFreeParking);
  const setFreeParkingJackpot = useDashboardStore((s) => s.setFreeParkingJackpot);
  const trackProperties = useDashboardStore((s) => s.trackProperties);
  const setTrackProperties = useDashboardStore((s) => s.setTrackProperties);
  const allowAuction = useDashboardStore((s) => s.allowAuction);
  const setAllowAuction = useDashboardStore((s) => s.setAllowAuction);
  const trackHousePrices = useDashboardStore((s) => s.trackHousePrices);
  const setTrackHousePrices = useDashboardStore((s) => s.setTrackHousePrices);
  const endGame = useDashboardStore((s) => s.endGame);

  const built = Object.values(properties).reduce(
    (acc, p) => ({ houses: acc.houses + p.houses, hotels: acc.hotels + (p.hasHotel ? 1 : 0) }),
    { houses: 0, hotels: 0 },
  );
  const [endOpen, setEndOpen] = useState(false);

  function handleEndGame() {
    setEndOpen(false);
    if (!endGame()) {
      toast.error("Couldn't end the game — you're offline right now.", { icon: "📡" });
      return;
    }
    // The server's gameEnd broadcast (handled globally in App.tsx) is what
    // actually moves everyone to the summary — this just gets the banker
    // there without waiting on their own echo.
    goTo("end-game");
  }

  function handleRuleToggle(setter: (value: boolean) => boolean, nextValue: boolean) {
    if (!setter(nextValue)) {
      toast.error("Couldn't change that — you're offline right now.", { icon: "📡" });
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="mx-auto min-h-svh w-full max-w-md px-5 pb-16 pt-8 sm:max-w-lg lg:max-w-2xl"
    >
      <div className="mb-2 flex items-center gap-3">
        <button
          onClick={() => goTo("dashboard")}
          aria-label="Back to dashboard"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-1.5 text-gold">
          <ShieldAlert className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-[0.14em]">Banker Only</span>
        </div>
      </div>
      <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight text-text">
        Banker Console
      </h1>

      <div className="flex flex-col gap-3">
        <PendingRequestsCard />
        <AdjustBalanceCard />

        {trackProperties && (
          <div className="mt-2 flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
              Inventory
            </h2>
            <InventorySummary
              label="Houses"
              Icon={Home}
              remaining={TOTAL_HOUSES - built.houses}
              total={TOTAL_HOUSES}
            />
            <InventorySummary
              label="Hotels"
              Icon={Building2}
              remaining={TOTAL_HOTELS - built.hotels}
              total={TOTAL_HOTELS}
            />
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-text-faint">
            Game Rules
          </h2>
          <RuleRow
            icon={<Sparkles className="h-4.5 w-4.5" />}
            label="Free Parking jackpot"
            description="Taxes and fines pool up and pay out to whoever lands on Free Parking."
            checked={useFreeParking}
            onCheckedChange={() => handleRuleToggle(setFreeParkingJackpot, !useFreeParking)}
          />
          <RuleRow
            icon={<Home className="h-4.5 w-4.5" />}
            label="Track properties"
            description="Buying requires picking a real property; houses/hotels build up per-property. Off = free-text money transfers only."
            checked={trackProperties}
            onCheckedChange={() => handleRuleToggle(setTrackProperties, !trackProperties)}
          />
          <RuleRow
            icon={<Gavel className="h-4.5 w-4.5" />}
            label="Allow auctions"
            description="A declined property can be claimed by anyone at whatever it went for at the table."
            checked={allowAuction}
            onCheckedChange={() => handleRuleToggle(setAllowAuction, !allowAuction)}
            disabled={!trackProperties}
          />
          <RuleRow
            icon={<Landmark className="h-4.5 w-4.5" />}
            label="Ask for house price"
            description="With Track properties off, also ask for a per-house build price when buying — so houses/hotels can still be tracked on that property."
            checked={trackHousePrices}
            onCheckedChange={() => handleRuleToggle(setTrackHousePrices, !trackHousePrices)}
            disabled={trackProperties}
          />
        </div>

        <div className="mt-2 flex items-start justify-between gap-4 rounded-2xl border border-border-soft bg-surface p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-text-muted">
              {isLocked ? <Lock className="h-4.5 w-4.5" /> : <Unlock className="h-4.5 w-4.5" />}
            </div>
            <div>
              <div className="text-sm font-bold text-text">Lock game to new joiners</div>
              <div className="mt-0.5 text-sm text-text-muted">
                Existing players can keep playing; nobody new can join with the code.
              </div>
            </div>
          </div>
          <Switch
            checked={isLocked}
            onCheckedChange={() => {
              if (!toggleLocked()) {
                toast.error("Couldn't change that — you're offline right now.", { icon: "📡" });
              }
            }}
            className="mt-1 shrink-0"
          />
        </div>

        <div className="mt-4 rounded-2xl border border-red/30 bg-red/5 p-4">
          <h3 className="text-sm font-bold text-red">End Game</h3>
          <p className="mt-1 text-sm text-text-muted">
            Finalizes standings for everyone and opens the game summary. This can't be undone.
          </p>
          <Dialog open={endOpen} onOpenChange={setEndOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="mt-3 w-full gap-2">
                <LogOut className="h-4 w-4" />
                End Game
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogTitle className="font-display text-lg font-bold text-text">
                End the game for everyone?
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-text-muted">
                This locks in final balances and takes the whole table to the summary
                screen. Nobody can send new transactions after this.
              </DialogDescription>
              <div className="mt-5 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setEndOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleEndGame}>
                  End Game
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </motion.div>
  );
}
