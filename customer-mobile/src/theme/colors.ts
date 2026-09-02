export interface ThemeColors {
  background: string;
  card: string;
  surface: string;
  border: string;
  cardBorder: string; // convenient alias
  text: string;       // primary text alias
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  success: string;
  warning: string;
  danger: string;
  seatAvailable: string;
  seatSelected: string;
  seatHeld: string;
  seatSold: string;
  seatDisabled: string;
}

export const darkColors: ThemeColors = {
  background: "#09090b",       // Zinc 950
  card: "#18181b",             // Zinc 900
  surface: "#27272a",          // Zinc 800
  border: "#27272a",           // Zinc 800
  cardBorder: "#27272a",       // Zinc 800
  text: "#fafafa",             // Zinc 50
  textPrimary: "#fafafa",      // Zinc 50
  textSecondary: "#a1a1aa",    // Zinc 400
  textMuted: "#71717a",        // Zinc 500
  primary: "#6366f1",          // Indigo 500
  primaryHover: "#4f46e5",     // Indigo 600
  success: "#10b981",          // Emerald 500
  warning: "#f59e0b",          // Amber 500
  danger: "#ef4444",           // Red 500
  seatAvailable: "#27272a",    // Dark outlined seat
  seatSelected: "#6366f1",     // Indigo 500
  seatHeld: "#f59e0b",         // Amber 500
  seatSold: "#ef4444",         // Red 500
  seatDisabled: "#3f3f46",     // Zinc 700
};

export const lightColors: ThemeColors = {
  background: "#ffffff",       // Pure White / Zinc 50
  card: "#ffffff",             // White
  surface: "#f4f4f5",          // Zinc 100
  border: "#e4e4e7",           // Zinc 200
  cardBorder: "#e4e4e7",       // Zinc 200
  text: "#09090b",             // Zinc 950
  textPrimary: "#09090b",      // Zinc 950
  textSecondary: "#52525b",    // Zinc 600
  textMuted: "#71717a",        // Zinc 500
  primary: "#4f46e5",          // Indigo 600
  primaryHover: "#4338ca",     // Indigo 700
  success: "#10b981",          // Emerald 500
  warning: "#f59e0b",          // Amber 500
  danger: "#ef4444",           // Red 500
  seatAvailable: "#ffffff",    // Light outlined seat
  seatSelected: "#4f46e5",     // Indigo 600
  seatHeld: "#fef3c7",         // Amber 100
  seatSold: "#fee2e2",         // Red 100
  seatDisabled: "#e4e4e7",     // Zinc 200
};
