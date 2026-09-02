import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Theme, darkTheme, lightTheme, ThemeColors } from "../theme";

export type ThemeMode = "dark" | "light" | "system";

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: "dark" | "light";
  colors: ThemeColors;
  themeObject: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "planet_cinema_theme_mode";

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [theme, setThemeState] = useState<ThemeMode>("dark"); // Default Dark

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === "light" || stored === "dark" || stored === "system") {
        setThemeState(stored as ThemeMode);
      }
    });
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    AsyncStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  const toggleTheme = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const resolvedTheme: "dark" | "light" =
    theme === "system"
      ? systemColorScheme === "light"
        ? "light"
        : "dark"
      : theme;

  const currentTheme: Theme = resolvedTheme === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        colors: currentTheme.colors,
        themeObject: currentTheme,
        isDark: resolvedTheme === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
