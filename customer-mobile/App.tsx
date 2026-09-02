import React from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import { BookingProvider } from "./src/context/BookingContext";
import { RootNavigator } from "./src/navigation/RootNavigator";

const MainApp: React.FC = () => {
  const { isDark, colors } = useTheme();

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />
      <RootNavigator />
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <BookingProvider>
          <MainApp />
        </BookingProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
