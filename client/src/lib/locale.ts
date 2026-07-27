export type EditionId = "international" | "india";

export interface EditionConfig {
  id: EditionId;
  label: string;
  tagline: string;
  currencyCode: string;
  currencySymbol: string;
  numberLocale: string;
  startingCash: number;
  passGoAmount: number;
  cities: string[];
  supportsSpeedDie: boolean;
  quickAmounts: number[];
}

export const EDITIONS: Record<EditionId, EditionConfig> = {
  international: {
    id: "international",
    label: "International",
    tagline: "Classic edition",
    currencyCode: "USD",
    currencySymbol: "$",
    numberLocale: "en-US",
    startingCash: 1500,
    passGoAmount: 200,
    cities: ["New York", "London", "Paris", "Tokyo", "Sydney", "Toronto"],
    supportsSpeedDie: false,
    quickAmounts: [10, 50, 100, 500],
  },
  india: {
    id: "india",
    label: "India",
    tagline: "₹ · Speed Die",
    currencyCode: "INR",
    currencySymbol: "₹",
    numberLocale: "en-IN",
    startingCash: 15000,
    passGoAmount: 2000,
    cities: ["Mumbai", "Delhi", "Bengaluru", "Kolkata", "Chennai", "Jaipur"],
    supportsSpeedDie: true,
    quickAmounts: [100, 500, 1000, 5000],
  },
};

export function formatCurrency(amount: number, edition: EditionConfig): string {
  const formatted = new Intl.NumberFormat(edition.numberLocale, {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  const sign = amount < 0 ? "− " : "";
  return `${sign}${edition.currencySymbol}${formatted}`;
}

export function formatAmount(amount: number, edition: EditionConfig): string {
  return new Intl.NumberFormat(edition.numberLocale, {
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}
