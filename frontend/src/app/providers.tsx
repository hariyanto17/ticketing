"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";
import { store } from "@/store";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/lib/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleChunkError = (event: ErrorEvent) => {
      if (
        event.error?.name === "ChunkLoadError" ||
        (typeof event.message === "string" && event.message.includes("ChunkLoadError")) ||
        (typeof event.message === "string" && event.message.includes("Loading chunk"))
      ) {
        const lastReload = sessionStorage.getItem("last_chunk_reload");
        const now = Date.now();
        if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
          sessionStorage.setItem("last_chunk_reload", String(now));
          window.location.reload();
        }
      }
    };
    window.addEventListener("error", handleChunkError);
    return () => window.removeEventListener("error", handleChunkError);
  }, []);

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
