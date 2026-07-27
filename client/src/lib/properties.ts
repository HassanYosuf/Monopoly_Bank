import type { EditionId } from "@/lib/locale";

export type ColorGroup =
  | "brown"
  | "lightblue"
  | "pink"
  | "orange"
  | "red"
  | "yellow"
  | "green"
  | "darkblue"
  | "railroad"
  | "utility";

export interface PropertyDef {
  id: string;
  name: string;
  group: ColorGroup;
  price: number;
  // Cost per house, and per hotel (standard Monopoly rule: a hotel costs
  // the same as one more house, on top of returning the 4 houses already
  // on the property to the bank).
  houseCost: number;
  // Railroads and utilities are ownable but never take houses/hotels.
  buildable: boolean;
}

export const COLOR_GROUP_LABEL: Record<ColorGroup, string> = {
  brown: "Brown",
  lightblue: "Light Blue",
  pink: "Pink",
  orange: "Orange",
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  darkblue: "Dark Blue",
  railroad: "Railroads",
  utility: "Utilities",
};

// Swatches for the color-group chip — matched to the physical board's
// colors, not the app's data-viz palette (these have fixed, iconic meaning).
export const COLOR_GROUP_SWATCH: Record<ColorGroup, string> = {
  brown: "#8B5A2B",
  lightblue: "#AAE0FA",
  pink: "#D93A96",
  orange: "#F7941D",
  red: "#ED1B24",
  yellow: "#FEF200",
  green: "#1FB25A",
  darkblue: "#0072BB",
  railroad: "#6b7280",
  utility: "#9ca3af",
};

// Standard International (US) board — the well-known classic 28-square set.
const INTERNATIONAL: PropertyDef[] = [
  { id: "int-mediterranean", name: "Mediterranean Avenue", group: "brown", price: 60, houseCost: 50, buildable: true },
  { id: "int-baltic", name: "Baltic Avenue", group: "brown", price: 60, houseCost: 50, buildable: true },

  { id: "int-oriental", name: "Oriental Avenue", group: "lightblue", price: 100, houseCost: 50, buildable: true },
  { id: "int-vermont", name: "Vermont Avenue", group: "lightblue", price: 100, houseCost: 50, buildable: true },
  { id: "int-connecticut", name: "Connecticut Avenue", group: "lightblue", price: 120, houseCost: 50, buildable: true },

  { id: "int-stcharles", name: "St. Charles Place", group: "pink", price: 140, houseCost: 100, buildable: true },
  { id: "int-states", name: "States Avenue", group: "pink", price: 140, houseCost: 100, buildable: true },
  { id: "int-virginia", name: "Virginia Avenue", group: "pink", price: 160, houseCost: 100, buildable: true },

  { id: "int-stjames", name: "St. James Place", group: "orange", price: 180, houseCost: 100, buildable: true },
  { id: "int-tennessee", name: "Tennessee Avenue", group: "orange", price: 180, houseCost: 100, buildable: true },
  { id: "int-newyork", name: "New York Avenue", group: "orange", price: 200, houseCost: 100, buildable: true },

  { id: "int-kentucky", name: "Kentucky Avenue", group: "red", price: 220, houseCost: 150, buildable: true },
  { id: "int-indiana", name: "Indiana Avenue", group: "red", price: 220, houseCost: 150, buildable: true },
  { id: "int-illinois", name: "Illinois Avenue", group: "red", price: 240, houseCost: 150, buildable: true },

  { id: "int-atlantic", name: "Atlantic Avenue", group: "yellow", price: 260, houseCost: 150, buildable: true },
  { id: "int-ventnor", name: "Ventnor Avenue", group: "yellow", price: 260, houseCost: 150, buildable: true },
  { id: "int-marvin", name: "Marvin Gardens", group: "yellow", price: 280, houseCost: 150, buildable: true },

  { id: "int-pacific", name: "Pacific Avenue", group: "green", price: 300, houseCost: 200, buildable: true },
  { id: "int-northcarolina", name: "North Carolina Avenue", group: "green", price: 300, houseCost: 200, buildable: true },
  { id: "int-pennsylvania", name: "Pennsylvania Avenue", group: "green", price: 320, houseCost: 200, buildable: true },

  { id: "int-parkplace", name: "Park Place", group: "darkblue", price: 350, houseCost: 200, buildable: true },
  { id: "int-boardwalk", name: "Boardwalk", group: "darkblue", price: 400, houseCost: 200, buildable: true },

  { id: "int-reading", name: "Reading Railroad", group: "railroad", price: 200, houseCost: 0, buildable: false },
  { id: "int-pennsylvania-rr", name: "Pennsylvania Railroad", group: "railroad", price: 200, houseCost: 0, buildable: false },
  { id: "int-bo", name: "B&O Railroad", group: "railroad", price: 200, houseCost: 0, buildable: false },
  { id: "int-shortline", name: "Short Line", group: "railroad", price: 200, houseCost: 0, buildable: false },

  { id: "int-electric", name: "Electric Company", group: "utility", price: 150, houseCost: 0, buildable: false },
  { id: "int-water", name: "Water Works", group: "utility", price: 150, houseCost: 0, buildable: false },
];

// India edition reskin — same board structure and group sizes as the
// classic set above, scaled 10x to match this edition's existing
// starting-cash/Pass-Go ratio. Not a transcription of any specific printed
// edition's numbers — a consistent India-flavored version of the same game.
const INDIA: PropertyDef[] = [
  { id: "ind-chandnichowk", name: "Chandni Chowk", group: "brown", price: 600, houseCost: 500, buildable: true },
  { id: "ind-sadarbazaar", name: "Sadar Bazaar", group: "brown", price: 600, houseCost: 500, buildable: true },

  { id: "ind-kochi", name: "Kochi", group: "lightblue", price: 1000, houseCost: 500, buildable: true },
  { id: "ind-patna", name: "Patna", group: "lightblue", price: 1000, houseCost: 500, buildable: true },
  { id: "ind-bhopal", name: "Bhopal", group: "lightblue", price: 1200, houseCost: 500, buildable: true },

  { id: "ind-jaipur", name: "Jaipur", group: "pink", price: 1400, houseCost: 1000, buildable: true },
  { id: "ind-lucknow", name: "Lucknow", group: "pink", price: 1400, houseCost: 1000, buildable: true },
  { id: "ind-chandigarh", name: "Chandigarh", group: "pink", price: 1600, houseCost: 1000, buildable: true },

  { id: "ind-nagpur", name: "Nagpur", group: "orange", price: 1800, houseCost: 1000, buildable: true },
  { id: "ind-indore", name: "Indore", group: "orange", price: 1800, houseCost: 1000, buildable: true },
  { id: "ind-surat", name: "Surat", group: "orange", price: 2000, houseCost: 1000, buildable: true },

  { id: "ind-ahmedabad", name: "Ahmedabad", group: "red", price: 2200, houseCost: 1500, buildable: true },
  { id: "ind-pune", name: "Pune", group: "red", price: 2200, houseCost: 1500, buildable: true },
  { id: "ind-hyderabad", name: "Hyderabad", group: "red", price: 2400, houseCost: 1500, buildable: true },

  { id: "ind-kolkata", name: "Kolkata", group: "yellow", price: 2600, houseCost: 1500, buildable: true },
  { id: "ind-chennai", name: "Chennai", group: "yellow", price: 2600, houseCost: 1500, buildable: true },
  { id: "ind-bengaluru", name: "Bengaluru", group: "yellow", price: 2800, houseCost: 1500, buildable: true },

  { id: "ind-connaughtplace", name: "Connaught Place", group: "green", price: 3000, houseCost: 2000, buildable: true },
  { id: "ind-bandra", name: "Bandra", group: "green", price: 3000, houseCost: 2000, buildable: true },
  { id: "ind-southdelhi", name: "South Delhi", group: "green", price: 3200, houseCost: 2000, buildable: true },

  { id: "ind-southmumbai", name: "South Mumbai", group: "darkblue", price: 3500, houseCost: 2000, buildable: true },
  { id: "ind-marinedrive", name: "Marine Drive", group: "darkblue", price: 4000, houseCost: 2000, buildable: true },

  { id: "ind-cst", name: "Chhatrapati Shivaji Terminus", group: "railroad", price: 2000, houseCost: 0, buildable: false },
  { id: "ind-newdelhi-station", name: "New Delhi Railway Station", group: "railroad", price: 2000, houseCost: 0, buildable: false },
  { id: "ind-howrah", name: "Howrah Junction", group: "railroad", price: 2000, houseCost: 0, buildable: false },
  { id: "ind-chennaicentral", name: "Chennai Central", group: "railroad", price: 2000, houseCost: 0, buildable: false },

  { id: "ind-electricity", name: "Electricity Board", group: "utility", price: 1500, houseCost: 0, buildable: false },
  { id: "ind-water", name: "Water Board", group: "utility", price: 1500, houseCost: 0, buildable: false },
];

export const PROPERTIES: Record<EditionId, PropertyDef[]> = {
  international: INTERNATIONAL,
  india: INDIA,
};

// Total physical pieces in a standard Monopoly set — shared across every
// property, so availability has to be checked against the whole board, not
// tracked per-property.
export const TOTAL_HOUSES = 32;
export const TOTAL_HOTELS = 12;

export function propertyById(edition: EditionId, propertyId: string): PropertyDef | undefined {
  return PROPERTIES[edition].find((p) => p.id === propertyId);
}
