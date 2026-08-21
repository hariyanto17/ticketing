"use client";

import { Provider } from "react-redux";
import { store } from "@/store";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </Provider>
  );
}
