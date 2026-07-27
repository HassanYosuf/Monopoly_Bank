import type { SVGProps } from "react";

export type TokenId =
  | "hat"
  | "car"
  | "dog"
  | "ship"
  | "boot"
  | "cat"
  | "rocket"
  | "diamond";

type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function HatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 17c0-3 2-9 8-9s8 6 8 9" />
      <path d="M4 17h16" />
      <path d="M8 8c0-2 2-4 4-4s4 2 4 4" />
    </svg>
  );
}

export function CarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 16l2-6h14l2 6" />
      <rect x="3" y="16" width="18" height="4" rx="1" />
      <circle cx="7.5" cy="20" r="1.4" />
      <circle cx="16.5" cy="20" r="1.4" />
    </svg>
  );
}

export function DogIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 18c-1-3 0-6 2-7L5 8l3-1 2 2h4l2-2 3 1-2 3c2 1 3 4 2 7" />
      <circle cx="9" cy="17" r="0.6" fill="currentColor" />
      <circle cx="15" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function ShipIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 14h16l-2 5H6z" />
      <path d="M7 14V7h3l4 4V4" />
      <path d="M2 19c2 1.5 4 1.5 6 0s4-1.5 6 0 4 1.5 6 0" />
    </svg>
  );
}

export function BootIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3h4v8l4 3v6H6v-4l2-2z" />
      <path d="M6 20h10" />
    </svg>
  );
}

export function CatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 12c0-4 2-7 7-7s7 3 7 7-2 7-7 7-7-3-7-7z" />
      <path d="M4 9l2 1M20 9l-2 1" />
      <circle cx="9.5" cy="11" r="0.6" fill="currentColor" />
      <circle cx="14.5" cy="11" r="0.6" fill="currentColor" />
    </svg>
  );
}

export function RocketIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 2c3 3 4 8 3 14l-3 4-3-4c-1-6 0-11 3-14z" />
      <path d="M9 12l-4 1 1 2M15 12l4 1-1 2" />
    </svg>
  );
}

export function DiamondIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3l4 6-4 12-4-12z" />
      <path d="M8 9h8" />
    </svg>
  );
}

export interface TokenDef {
  id: TokenId;
  label: string;
  Icon: (props: IconProps) => React.JSX.Element;
  band: string;
}

export const TOKENS: TokenDef[] = [
  { id: "hat", label: "Top Hat", Icon: HatIcon, band: "var(--band-scarlet)" },
  { id: "car", label: "Car", Icon: CarIcon, band: "var(--band-indigo)" },
  { id: "dog", label: "Dog", Icon: DogIcon, band: "var(--band-umber)" },
  { id: "ship", label: "Ship", Icon: ShipIcon, band: "var(--band-sky)" },
  { id: "boot", label: "Boot", Icon: BootIcon, band: "var(--band-magenta)" },
  { id: "cat", label: "Cat", Icon: CatIcon, band: "var(--band-citrine)" },
  { id: "rocket", label: "Rocket", Icon: RocketIcon, band: "var(--band-emerald)" },
  { id: "diamond", label: "Diamond", Icon: DiamondIcon, band: "var(--band-amber)" },
];

export function tokenById(id: TokenId): TokenDef {
  return TOKENS.find((t) => t.id === id) ?? TOKENS[0];
}
