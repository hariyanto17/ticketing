import React, { createContext, useContext, useState, useCallback } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  const success = useCallback((msg: string) => toast(msg, "success"), [toast]);
  const error = useCallback((msg: string) => toast(msg, "error"), [toast]);
  const info = useCallback((msg: string) => toast(msg, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      {/* Toast Portal/Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full">
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
            error: <AlertCircle className="w-5 h-5 text-rose-500" />,
            info: <Info className="w-5 h-5 text-blue-500" />,
          };

          const bgClasses = {
            success: "bg-white dark:bg-zinc-900 border-emerald-100 dark:border-emerald-950/20",
            error: "bg-white dark:bg-zinc-900 border-rose-100 dark:border-rose-950/20",
            info: "bg-white dark:bg-zinc-900 border-blue-100 dark:border-blue-950/20",
          };

          return (
            <div
              key={t.id}
              className={`flex items-start gap-3 p-4 border rounded-2xl shadow-lg transition-all transform translate-y-0 duration-300 animate-slide-in ${bgClasses[t.type]}`}
            >
              <div className="shrink-0 mt-0.5">{icons[t.type]}</div>
              <div className="flex-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {t.message}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
