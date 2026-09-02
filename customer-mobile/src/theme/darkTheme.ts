import { darkColors, ThemeColors } from "./colors";
import { typography } from "./typography";
import { spacing } from "./spacing";
import { radius } from "./radius";
import { shadows, ThemeShadows } from "./shadows";

export interface Theme {
  mode: "dark" | "light";
  colors: ThemeColors;
  typography: typeof typography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: ThemeShadows;
}

export const darkTheme: Theme = {
  mode: "dark",
  colors: darkColors,
  typography,
  spacing,
  radius,
  shadows,
};
