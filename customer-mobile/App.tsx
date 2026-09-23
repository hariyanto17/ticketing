import React, { useEffect, useState } from "react";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { store, persistor } from "./src/lib/store/store";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { LanguageProvider } from "./src/context/LanguageContext";
import { BookingProvider } from "./src/context/BookingContext";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { otaService, OtaCheckResult } from "./src/services/otaService";
import { OtaUpdateModal } from "./src/components/common/OtaUpdateModal";
import { ToastProvider } from "./src/context/ToastContext";
import { AlertProvider } from "./src/context/AlertContext";

const MainApp: React.FC = () => {
  const { isDark, colors } = useTheme();
  const [updateInfo, setUpdateInfo] = useState<OtaCheckResult | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    // Check for updates when app initializes
    const checkUpdates = async () => {
      try {
        const result = await otaService.checkForUpdates();
        if (result && result.updateAvailable) {
          setUpdateInfo(result);
          setShowModal(true);
        }
      } catch (err) {
        console.warn("OTA update check failed:", err);
      }
    };

    // Delay slightly to allow splash / initial render to mount smoothly
    const timer = setTimeout(checkUpdates, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.background }}>
      <ToastProvider>
        <AlertProvider>
          <StatusBar
            barStyle={isDark ? "light-content" : "dark-content"}
            backgroundColor={colors.background}
          />
          <RootNavigator />
          <OtaUpdateModal
            visible={showModal}
            updateInfo={updateInfo}
            onDismiss={() => setShowModal(false)}
          />
        </AlertProvider>
      </ToastProvider>
    </SafeAreaProvider>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ThemeProvider>
          <LanguageProvider>
            <BookingProvider>
              <MainApp />
            </BookingProvider>
          </LanguageProvider>
        </ThemeProvider>
      </PersistGate>
    </Provider>
  );
}
