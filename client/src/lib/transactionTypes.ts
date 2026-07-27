import {
  Banknote,
  Building2,
  Handshake,
  Landmark,
  Receipt,
  Sparkles,
  Wallet,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";

export type TransactionTypeId =
  | "rent"
  | "buy-property"
  | "tax"
  | "bank-payout"
  | "trade"
  | "mortgage"
  | "custom";

export type Counterparty = "player" | "bank";
export type Direction = "pay" | "receive";

export interface TransactionTypeDef {
  id: TransactionTypeId;
  label: string;
  description: string;
  Icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  counterparty: Counterparty;
  direction: Direction;
  counterpartyEditable: boolean;
  directionEditable: boolean;
  memoPlaceholder: string;
}

export const TRANSACTION_TYPES: TransactionTypeDef[] = [
  {
    id: "rent",
    label: "Pay Rent",
    description: "To another player",
    Icon: Receipt,
    counterparty: "player",
    direction: "pay",
    counterpartyEditable: false,
    directionEditable: false,
    memoPlaceholder: "Rent",
  },
  {
    id: "buy-property",
    label: "Buy Property",
    description: "From the bank",
    Icon: Building2,
    counterparty: "bank",
    direction: "pay",
    counterpartyEditable: false,
    directionEditable: false,
    memoPlaceholder: "Property name",
  },
  {
    id: "tax",
    label: "Pay Tax",
    description: "To the bank",
    Icon: Landmark,
    counterparty: "bank",
    direction: "pay",
    counterpartyEditable: false,
    directionEditable: false,
    memoPlaceholder: "Tax",
  },
  {
    id: "bank-payout",
    label: "Bank Payout",
    description: "From the bank",
    Icon: Sparkles,
    counterparty: "bank",
    direction: "receive",
    counterpartyEditable: false,
    directionEditable: false,
    memoPlaceholder: "Payout",
  },
  {
    id: "trade",
    label: "Trade",
    description: "With another player",
    Icon: Handshake,
    counterparty: "player",
    direction: "pay",
    counterpartyEditable: false,
    directionEditable: true,
    memoPlaceholder: "Trade",
  },
  {
    id: "mortgage",
    label: "Mortgage",
    description: "From the bank",
    Icon: Banknote,
    counterparty: "bank",
    direction: "receive",
    counterpartyEditable: false,
    directionEditable: true,
    memoPlaceholder: "Mortgaged property",
  },
  {
    id: "custom",
    label: "Custom",
    description: "Any amount, either way",
    Icon: Wallet,
    counterparty: "player",
    direction: "pay",
    counterpartyEditable: true,
    directionEditable: true,
    memoPlaceholder: "What's this for?",
  },
];

export function transactionTypeById(id: TransactionTypeId): TransactionTypeDef {
  return TRANSACTION_TYPES.find((t) => t.id === id) ?? TRANSACTION_TYPES[0];
}
