export interface TypographyStyle {
  fontSize: number;
  fontWeight: "400" | "600" | "700" | "800" | "900";
  letterSpacing?: number;
  lineHeight?: number;
}

export const typography: Record<string, TypographyStyle> = {
  h1: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 16,
    fontWeight: "700",
  },
  bodyLarge: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "400",
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  button: {
    fontSize: 15,
    fontWeight: "700",
  },
  caption: {
    fontSize: 11,
    fontWeight: "600",
  },
};
