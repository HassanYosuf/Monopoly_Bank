import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Drawer } from "vaul";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Building2, X } from "lucide-react";
import { toast } from "sonner";
import { useDashboardStore, BANK_ID } from "@/store/useDashboardStore";
import { EDITIONS, formatAmount, formatCurrency } from "@/lib/locale";
import {
  TRANSACTION_TYPES,
  transactionTypeById,
  type Counterparty,
  type Direction,
  type TransactionTypeId,
} from "@/lib/transactionTypes";
import { COLOR_GROUP_LABEL, PROPERTIES, propertyById } from "@/lib/properties";
import { TokenBadge } from "@/components/icons/token-badge";
import { Keypad } from "@/components/transaction/Keypad";
import { cn } from "@/lib/utils";

const MAX_AMOUNT = 999_999;

type FlyTone = "gain" | "loss" | "neutral";

interface FlyState {
  from: DOMRect;
  to: DOMRect;
  amount: number;
  tone: FlyTone;
}

export function TransactionSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const players = useDashboardStore((s) => s.players);
  const selfId = useDashboardStore((s) => s.selfId);
  const editionId = useDashboardStore((s) => s.edition);
  const sendTransaction = useDashboardStore((s) => s.sendTransaction);
  const buyProperty = useDashboardStore((s) => s.buyProperty);
  const buyCustomProperty = useDashboardStore((s) => s.buyCustomProperty);
  const ownedProperties = useDashboardStore((s) => s.properties);
  const trackProperties = useDashboardStore((s) => s.trackProperties);
  const isOnline = useDashboardStore((s) => s.connectionStatus === "connected");
  const edition = EDITIONS[editionId];

  const [step, setStep] = useState<"type" | "details">("type");
  const [typeId, setTypeId] = useState<TransactionTypeId | null>(null);
  const [counterparty, setCounterparty] = useState<Counterparty>("player");
  const [direction, setDirection] = useState<Direction>("pay");
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState("");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [flying, setFlying] = useState<FlyState | null>(null);

  const isBuyProperty = typeId === "buy-property";
  // The catalog picker only makes sense when properties are actually being
  // tracked — with the house rule off there's no ownership record to pick
  // into, so it's just a plain named bank payment instead.
  const showPropertyPicker = isBuyProperty && trackProperties;
  const unownedProperties = PROPERTIES[editionId].filter((p) => !ownedProperties[p.id]?.ownerId);

  const amountRef = useRef<HTMLDivElement>(null);
  const bankBadgeRef = useRef<HTMLButtonElement>(null);
  const chipRefs = useRef(new Map<string, HTMLButtonElement>());

  const type = typeId ? transactionTypeById(typeId) : null;
  const others = players.filter((p) => p.id !== selfId && !p.isBankrupt);
  const selfPlayer = players.find((p) => p.id === selfId) ?? null;
  const isBanker = selfPlayer?.isBanker ?? false;

  // Only the banker's device can push money out of the bank to anyone at
  // the table — everyone else can't self-serve a Bank Payout at all (Pass
  // Go and mortgage/build payouts have their own dedicated, rule-validated
  // flows and don't go through this generic type).
  const bankPaysAnyPlayer = type?.id === "bank-payout" && isBanker;
  const payoutRoster = players.filter((p) => !p.isBankrupt);
  // "Pass Go" has its own dedicated button on the dashboard, and a non-banker
  // can't use "Bank Payout" here since it now always requires banker approval.
  const selectableTypes = TRANSACTION_TYPES.filter(
    (t) => t.id !== "pass-go" && (t.id !== "bank-payout" || isBanker),
  );

  function reset() {
    setStep("type");
    setTypeId(null);
    setCounterparty("player");
    setDirection("pay");
    setRecipientId(null);
    setAmount(0);
    setMemo("");
    setSelectedPropertyId(null);
    setFlying(null);
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) setTimeout(reset, 250);
  }

  function selectType(id: TransactionTypeId) {
    const def = transactionTypeById(id);
    setTypeId(id);
    setCounterparty(def.counterparty);
    setDirection(def.direction);
    const isBankPayoutForBanker = id === "bank-payout" && isBanker;
    setRecipientId(isBankPayoutForBanker ? selfId : null);
    setAmount(0);
    setMemo("");
    setSelectedPropertyId(null);
    setStep("details");
  }

  function selectProperty(propertyId: string, price: number, name: string) {
    setSelectedPropertyId(propertyId);
    setAmount(price);
    setMemo(name);
  }

  function handleKey(key: string) {
    if (key === "back") {
      setAmount((a) => Math.floor(a / 10));
      return;
    }
    const digits = key === "00" ? "00" : key;
    setAmount((a) => {
      const next = Number(String(a) + digits);
      return Number.isFinite(next) ? Math.min(next, MAX_AMOUNT) : a;
    });
  }

  function addQuick(value: number) {
    setAmount((a) => Math.min(a + value, MAX_AMOUNT));
  }

  // Mirrors the server's authorization rule (messageHandlers.ts): only the
  // banker can pull money out of the bank. Kept here too so a non-banker
  // can't end up sending something the server will just silently drop.
  const receivingFromBankAsNonBanker =
    !bankPaysAnyPlayer && counterparty === "bank" && direction === "receive" && !isBanker;

  const canSend =
    isOnline &&
    amount > 0 &&
    !receivingFromBankAsNonBanker &&
    (isBuyProperty
      ? !!memo.trim() && (!showPropertyPicker || !!selectedPropertyId)
      : true) &&
    (bankPaysAnyPlayer
      ? !!recipientId
      : counterparty === "bank" || (counterparty === "player" && recipientId));

  function computeLegs(): { fromId: string; toId: string } | null {
    if (!selfId) return null;
    if (bankPaysAnyPlayer) {
      if (!recipientId) return null;
      return { fromId: BANK_ID, toId: recipientId };
    }
    const other = counterparty === "bank" ? BANK_ID : recipientId;
    if (!other) return null;
    return direction === "pay" ? { fromId: selfId, toId: other } : { fromId: other, toId: selfId };
  }

  function handleSend() {
    if (!canSend || !type) return;
    const legs = computeLegs();
    if (!legs) return;

    const targetEl =
      legs.toId === BANK_ID
        ? bankBadgeRef.current
        : chipRefs.current.get(legs.toId) ?? null;
    const fromRect = amountRef.current?.getBoundingClientRect();
    const toRect = targetEl?.getBoundingClientRect();

    const tone: FlyTone =
      legs.toId === selfId ? "gain" : legs.fromId === selfId ? "loss" : "neutral";

    if (fromRect && toRect) {
      setFlying({ from: fromRect, to: toRect, amount, tone });
    } else {
      commit(legs);
    }
  }

  function commit(legs: { fromId: string; toId: string }) {
    if (!type) return;
    const sent = showPropertyPicker
      ? buyProperty(selectedPropertyId!, memo)
      : isBuyProperty
        ? buyCustomProperty(memo, amount)
        : sendTransaction({ type: type.id, fromId: legs.fromId, toId: legs.toId, amount, memo });

    if (!sent) {
      toast.error("Couldn't send — you're offline. Try again once you're back online.", {
        icon: "📡",
      });
      handleOpenChange(false);
      return;
    }

    if (isBuyProperty) {
      toast.success(`Bought ${memo} for ${formatCurrency(amount, edition)}`, { icon: "🏠" });
    } else if (legs.toId === selfId) {
      toast.success(`Received ${formatCurrency(amount, edition)}`, { icon: "💸" });
    } else if (legs.fromId === selfId) {
      toast.success(`Sent ${formatCurrency(amount, edition)}`, { icon: "💸" });
    } else {
      const recipientName = players.find((p) => p.id === legs.toId)?.name ?? "player";
      toast.success(`Paid ${formatCurrency(amount, edition)} to ${recipientName}`, {
        icon: "🏦",
      });
    }
    handleOpenChange(false);
  }

  function onFlyComplete() {
    if (!flying) return;
    setFlying(null);
    const legs = computeLegs();
    if (legs) commit(legs);
  }

  return (
    <>
      <Drawer.Root open={open} onOpenChange={handleOpenChange}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[88dvh] w-full max-w-md flex-col rounded-t-3xl border border-border bg-surface pb-[env(safe-area-inset-bottom)] outline-none sm:max-w-lg">
            <Drawer.Title className="sr-only">New Transaction</Drawer.Title>
            <div className="mx-auto mt-3 h-1.5 w-10 shrink-0 rounded-full bg-surface-3" />

            <AnimatePresence mode="wait" initial={false}>
              {step === "type" ? (
                <motion.div
                  key="type"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  className="overflow-y-auto px-5 pb-6 pt-4"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-display text-xl font-bold text-text">
                      New Transaction
                    </h2>
                    <button
                      onClick={() => handleOpenChange(false)}
                      aria-label="Close"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-surface-2 hover:text-text"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {selectableTypes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => selectType(t.id)}
                        className="flex flex-col items-start gap-2 rounded-2xl border border-border-soft bg-surface-2 p-4 text-left transition-colors active:scale-[0.97] hover:bg-surface-3"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-3 text-green-strong">
                          <t.Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold text-text">{t.label}</div>
                          <div className="text-xs text-text-faint">{t.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                type && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-5 pt-4"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        onClick={() => setStep("type")}
                        aria-label="Back"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-surface-2 hover:text-text"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                      <h2 className="font-display text-lg font-bold text-text">{type.label}</h2>
                      <button
                        onClick={() => handleOpenChange(false)}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-text-faint hover:bg-surface-2 hover:text-text"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {type.directionEditable && (
                      <div className="mb-4 flex gap-2 rounded-full bg-surface-2 p-1">
                        {(["pay", "receive"] as Direction[]).map((d) => (
                          <button
                            key={d}
                            onClick={() => {
                              setDirection(d);
                              // Only the banker can pull money out of the bank — if a
                              // non-banker switches to "receiving" while Bank is the
                              // counterparty, drop back to picking a player instead.
                              // (The server would silently reject this anyway; this
                              // just avoids showing a false success toast for it.)
                              if (d === "receive" && counterparty === "bank" && !isBanker) {
                                setCounterparty("player");
                                setRecipientId(null);
                              }
                            }}
                            className={cn(
                              "flex-1 rounded-full py-2 text-sm font-bold transition-colors",
                              direction === d
                                ? "bg-green text-[#06170F]"
                                : "text-text-muted hover:text-text",
                            )}
                          >
                            {d === "pay" ? "I'm paying" : "I'm receiving"}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                        {bankPaysAnyPlayer
                          ? "Pay out to"
                          : counterparty === "bank"
                            ? "From the Bank"
                            : "Choose recipient"}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {bankPaysAnyPlayer &&
                          payoutRoster.map((p) => (
                            <button
                              key={p.id}
                              ref={(el) => {
                                if (el) chipRefs.current.set(p.id, el);
                              }}
                              onClick={() => setRecipientId(p.id)}
                              aria-label={`Pay ${p.name} from the bank`}
                              aria-pressed={recipientId === p.id}
                              className={cn(
                                "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors active:scale-95",
                                recipientId === p.id
                                  ? "border-gold bg-gold/10"
                                  : "border-border-soft bg-surface-2 hover:bg-surface-3",
                              )}
                            >
                              <TokenBadge token={p.token} size={28} />
                              <span className="text-sm font-bold text-text">
                                {p.name}
                                {p.id === selfId && (
                                  <span className="font-normal text-text-faint"> (You)</span>
                                )}
                              </span>
                            </button>
                          ))}

                        {!bankPaysAnyPlayer && counterparty === "player" &&
                          others.map((p) => (
                            <button
                              key={p.id}
                              ref={(el) => {
                                if (el) chipRefs.current.set(p.id, el);
                              }}
                              onClick={() => setRecipientId(p.id)}
                              aria-label={`Send to ${p.name}`}
                              aria-pressed={recipientId === p.id}
                              className={cn(
                                "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors active:scale-95",
                                recipientId === p.id
                                  ? "border-gold bg-gold/10"
                                  : "border-border-soft bg-surface-2 hover:bg-surface-3",
                              )}
                            >
                              <TokenBadge token={p.token} size={28} />
                              <span className="text-sm font-bold text-text">{p.name}</span>
                            </button>
                          ))}

                        {!bankPaysAnyPlayer &&
                          (counterparty === "bank" || type.counterpartyEditable) &&
                          !(direction === "receive" && !isBanker) && (
                          <button
                            ref={bankBadgeRef}
                            onClick={() => {
                              setCounterparty("bank");
                              setRecipientId(null);
                            }}
                            className={cn(
                              "flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 transition-colors active:scale-95",
                              counterparty === "bank"
                                ? "border-gold bg-gold/10"
                                : "border-border-soft bg-surface-2 hover:bg-surface-3",
                            )}
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-3 text-gold">
                              <Building2 className="h-3.5 w-3.5" />
                            </span>
                            <span className="text-sm font-bold text-text">Bank</span>
                          </button>
                        )}

                        {!bankPaysAnyPlayer && type.counterpartyEditable && counterparty === "bank" && (
                          <button
                            onClick={() => setCounterparty("player")}
                            className="flex items-center gap-2 rounded-full border border-dashed border-border px-3.5 py-1.5 text-sm font-semibold text-text-faint hover:text-text"
                          >
                            Pick a player instead
                          </button>
                        )}
                      </div>
                    </div>

                    {showPropertyPicker ? (
                      <div className="mb-5">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                          Which property?
                        </div>
                        {unownedProperties.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-border px-3.5 py-3 text-sm text-text-faint">
                            Every property is already owned.
                          </p>
                        ) : (
                          <div className="grid max-h-52 grid-cols-2 gap-2 overflow-y-auto pr-1">
                            {unownedProperties.map((p) => (
                              <button
                                key={p.id}
                                onClick={() => selectProperty(p.id, p.price, p.name)}
                                aria-pressed={selectedPropertyId === p.id}
                                className={cn(
                                  "rounded-xl border px-3 py-2.5 text-left transition-colors",
                                  selectedPropertyId === p.id
                                    ? "border-gold bg-gold/10"
                                    : "border-border-soft bg-surface-2 hover:bg-surface-3",
                                )}
                              >
                                <div className="truncate text-xs font-bold text-text">
                                  {p.name}
                                </div>
                                <div className="mt-0.5 font-mono text-xs text-text-faint">
                                  {formatCurrency(p.price, edition)}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {selectedPropertyId && (() => {
                          const selectedDef = propertyById(editionId, selectedPropertyId);
                          if (!selectedDef) return null;
                          return (
                            <div className="mt-3">
                              <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                                <span>Name this property</span>
                                <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[0.65rem] font-bold normal-case tracking-normal text-text-muted">
                                  {selectedDef.buildable ? "City" : COLOR_GROUP_LABEL[selectedDef.group]}
                                </span>
                              </div>
                              <input
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                placeholder="What's this square called on your board?"
                                autoFocus
                                className="h-11 w-full rounded-xl border border-border-soft bg-surface-2 px-3.5 text-sm font-medium text-text outline-none placeholder:text-text-faint focus:border-gold focus:ring-2 focus:ring-focus"
                              />
                              {!memo.trim() && (
                                <p className="mt-1.5 text-xs text-text-faint">
                                  Required — matches whatever's actually printed on the board you're playing.
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ) : isBuyProperty ? (
                      <div className="mb-5">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-text-faint">
                          Property name
                        </div>
                        <input
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          placeholder="What's this square called on your board?"
                          className="h-11 w-full rounded-xl border border-border-soft bg-surface-2 px-3.5 text-sm font-medium text-text outline-none placeholder:text-text-faint focus:border-gold focus:ring-2 focus:ring-focus"
                        />
                        {!memo.trim() && (
                          <p className="mt-1.5 text-xs text-text-faint">Required</p>
                        )}
                      </div>
                    ) : (
                      <input
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder={type.memoPlaceholder}
                        className="mb-5 h-11 w-full rounded-xl border border-border-soft bg-surface-2 px-3.5 text-sm font-medium text-text outline-none placeholder:text-text-faint focus:border-gold focus:ring-2 focus:ring-focus"
                      />
                    )}

                    <div
                      ref={amountRef}
                      className="mb-4 flex items-center justify-center gap-1 py-2 font-mono text-5xl font-extrabold tabular-nums text-text"
                    >
                      <span className="text-3xl text-text-faint">{edition.currencySymbol}</span>
                      {formatAmount(amount, edition)}
                    </div>

                    {!showPropertyPicker && (
                      <>
                        <div className="mb-4 flex justify-center gap-2">
                          {edition.quickAmounts.map((q) => (
                            <button
                              key={q}
                              onClick={() => addQuick(q)}
                              className="rounded-full border border-border-soft bg-surface-2 px-3.5 py-1.5 font-mono text-xs font-bold text-text-muted transition-colors hover:bg-surface-3 hover:text-text active:scale-95"
                            >
                              +{formatAmount(q, edition)}
                            </button>
                          ))}
                          <button
                            onClick={() => setAmount(0)}
                            className="rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-semibold text-text-faint hover:text-text"
                          >
                            Clear
                          </button>
                        </div>

                        <Keypad onKey={handleKey} />
                      </>
                    )}

                    {!isOnline && (
                      <p className="mt-4 text-center text-xs font-semibold text-gold">
                        You're offline — reconnect to send this.
                      </p>
                    )}

                    <button
                      onClick={handleSend}
                      disabled={!canSend}
                      className={cn(
                        "mt-3 flex h-16 w-full shrink-0 items-center justify-center gap-2 rounded-full text-base font-bold transition-all active:scale-[0.97]",
                        canSend
                          ? "bg-green text-[#06170F] shadow-[0_6px_16px_-6px_rgba(33,165,103,0.55)] hover:brightness-110"
                          : "cursor-not-allowed bg-surface-2 text-text-faint",
                      )}
                    >
                      {isBuyProperty
                        ? "Buy"
                        : bankPaysAnyPlayer
                          ? "Pay Out"
                          : direction === "pay"
                            ? "Send"
                            : "Confirm"}{" "}
                      {amount > 0 && formatCurrency(amount, edition)}
                    </button>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      {flying &&
        createPortal(
          <motion.div
            initial={{
              position: "fixed",
              left: flying.from.left + flying.from.width / 2,
              top: flying.from.top + flying.from.height / 2,
              x: "-50%",
              y: "-50%",
              scale: 1,
              opacity: 1,
            }}
            animate={{
              left: flying.to.left + flying.to.width / 2,
              top: flying.to.top + flying.to.height / 2,
              scale: 0.35,
              opacity: 0,
            }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={onFlyComplete}
            className={cn(
              "pointer-events-none z-[60] whitespace-nowrap rounded-full px-4 py-2 font-mono text-lg font-extrabold shadow-lg",
              flying.tone === "gain" && "bg-green text-[#06170F]",
              flying.tone === "loss" && "border border-border bg-surface-3 text-text",
              flying.tone === "neutral" && "bg-gold text-[#1a1300]",
            )}
          >
            {flying.tone === "loss" ? "−" : "+"}
            {formatAmount(flying.amount, edition)}
          </motion.div>,
          document.body,
        )}
    </>
  );
}
