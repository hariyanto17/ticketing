import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  X,
} from "lucide-react-native";
import { useTheme } from "./ThemeContext";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  hideToast: (id?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const ToastItemView: React.FC<{
  item: ToastItem;
  onDismiss: () => void;
}> = ({ item, onDismiss }) => {
  const { colors, isDark } = useTheme();
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 6,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();

    const duration = item.duration || 3200;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIcon = () => {
    switch (item.type) {
      case "success":
        return <CheckCircle size={20} color="#10b981" />;
      case "error":
        return <AlertCircle size={20} color="#ef4444" />;
      case "warning":
        return <AlertTriangle size={20} color="#f59e0b" />;
      case "info":
      default:
        return <Info size={20} color="#6366f1" />;
    }
  };

  const getBorderColor = () => {
    switch (item.type) {
      case "success":
        return "rgba(16, 185, 129, 0.4)";
      case "error":
        return "rgba(239, 68, 68, 0.4)";
      case "warning":
        return "rgba(245, 158, 11, 0.4)";
      case "info":
      default:
        return "rgba(99, 102, 241, 0.4)";
    }
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.toastCard,
          {
            backgroundColor: isDark ? "#1f222e" : "#ffffff",
            borderColor: getBorderColor(),
            shadowColor: isDark ? "#000000" : "#64748b",
          },
        ]}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        <View style={styles.iconContainer}>{getIcon()}</View>
        <Text
          style={[
            styles.messageText,
            { color: isDark ? "#f8fafc" : "#0f172a" },
          ]}
          numberOfLines={3}
        >
          {item.message}
        </Text>
        <TouchableOpacity
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.closeBtn}
        >
          <X size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const insets = useSafeAreaInsets();

  const hideToast = useCallback((id?: string) => {
    if (id) {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    } else {
      setToasts((prev) => prev.slice(1));
    }
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", duration = 3200) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    []
  );

  const showSuccess = useCallback(
    (msg: string, dur?: number) => showToast(msg, "success", dur),
    [showToast]
  );
  const showError = useCallback(
    (msg: string, dur?: number) => showToast(msg, "error", dur),
    [showToast]
  );
  const showWarning = useCallback(
    (msg: string, dur?: number) => showToast(msg, "warning", dur),
    [showToast]
  );
  const showInfo = useCallback(
    (msg: string, dur?: number) => showToast(msg, "info", dur),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        toast: showToast,
        success: showSuccess,
        error: showError,
        warning: showWarning,
        info: showInfo,
        hideToast,
      }}
    >
      {children}
      {toasts.length > 0 && (
        <View
          pointerEvents="box-none"
          style={[
            styles.container,
            {
              top: Math.max(insets.top + 8, 20),
            },
          ]}
        >
          {toasts.map((item) => (
            <ToastItemView
              key={item.id}
              item={item}
              onDismiss={() => hideToast(item.id)}
            />
          ))}
        </View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: "center",
    gap: 8,
  },
  toastWrapper: {
    width: "100%",
    maxWidth: 440,
  },
  toastCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 8,
    gap: 12,
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  closeBtn: {
    padding: 2,
  },
});
