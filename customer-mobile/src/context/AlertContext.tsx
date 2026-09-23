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
  Modal,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from "react-native";
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Info,
  HelpCircle,
} from "lucide-react-native";
import { useTheme } from "./ThemeContext";

export type AlertType = "info" | "warning" | "error" | "success" | "confirm";

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
}

export interface AlertConfig {
  title?: string;
  message: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

interface AlertContextType {
  showAlert: {
    (config: AlertConfig): void;
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type?: AlertType
    ): void;
  };
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { colors, isDark } = useTheme();
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const showAlert = useCallback(
    (
      titleOrConfig: string | AlertConfig,
      message?: string,
      buttons?: AlertButton[],
      type?: AlertType
    ) => {
      let config: AlertConfig;
      if (typeof titleOrConfig === "object") {
        config = titleOrConfig;
      } else {
        config = {
          title: titleOrConfig,
          message: message || "",
          buttons: buttons && buttons.length > 0 ? buttons : [{ text: "OK" }],
          type: type || (buttons && buttons.some((b) => b.style === "destructive") ? "confirm" : "info"),
        };
      }

      if (!config.buttons || config.buttons.length === 0) {
        config.buttons = [{ text: "OK" }];
      }

      setAlertConfig(config);
      setVisible(true);

      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    },
    [scaleAnim, opacityAnim]
  );

  const hideAlert = useCallback((callback?: () => void) => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setAlertConfig(null);
      if (callback) {
        callback();
      }
    });
  }, [scaleAnim, opacityAnim]);

  const handleButtonPress = (button: AlertButton) => {
    hideAlert(() => {
      if (button.onPress) {
        button.onPress();
      }
    });
  };

  const getTypeStyles = (type?: AlertType) => {
    switch (type) {
      case "error":
        return {
          icon: <AlertCircle size={28} color="#ef4444" />,
          badgeBg: "rgba(239, 68, 68, 0.12)",
          borderColor: "rgba(239, 68, 68, 0.3)",
          accentColor: "#ef4444",
        };
      case "warning":
        return {
          icon: <AlertTriangle size={28} color="#f59e0b" />,
          badgeBg: "rgba(245, 158, 11, 0.12)",
          borderColor: "rgba(245, 158, 11, 0.3)",
          accentColor: "#f59e0b",
        };
      case "success":
        return {
          icon: <CheckCircle2 size={28} color="#10b981" />,
          badgeBg: "rgba(16, 185, 129, 0.12)",
          borderColor: "rgba(16, 185, 129, 0.3)",
          accentColor: "#10b981",
        };
      case "confirm":
        return {
          icon: <HelpCircle size={28} color="#6366f1" />,
          badgeBg: "rgba(99, 102, 241, 0.12)",
          borderColor: "rgba(99, 102, 241, 0.3)",
          accentColor: "#6366f1",
        };
      case "info":
      default:
        return {
          icon: <Info size={28} color="#6366f1" />,
          badgeBg: "rgba(99, 102, 241, 0.12)",
          borderColor: "rgba(99, 102, 241, 0.3)",
          accentColor: "#6366f1",
        };
    }
  };

  const typeStyles = getTypeStyles(alertConfig?.type);
  const buttons = alertConfig?.buttons || [{ text: "OK" }];
  const isSingleButton = buttons.length === 1;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}

      <Modal
        visible={visible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {
          const cancelBtn = buttons.find((b) => b.style === "cancel");
          if (cancelBtn) {
            handleButtonPress(cancelBtn);
          } else {
            hideAlert();
          }
        }}
      >
        <TouchableWithoutFeedback
          onPress={() => {
            const cancelBtn = buttons.find((b) => b.style === "cancel");
            if (cancelBtn) {
              handleButtonPress(cancelBtn);
            }
          }}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: opacityAnim,
                backgroundColor: "rgba(0, 0, 0, 0.72)",
              },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View
                style={[
                  styles.alertCard,
                  {
                    backgroundColor: isDark ? "#181a20" : "#ffffff",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)",
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                {/* Top Icon Badge */}
                <View
                  style={[
                    styles.iconBadge,
                    {
                      backgroundColor: typeStyles.badgeBg,
                      borderColor: typeStyles.borderColor,
                    },
                  ]}
                >
                  {typeStyles.icon}
                </View>

                {/* Title and Message */}
                <View style={styles.textContainer}>
                  {alertConfig?.title ? (
                    <Text
                      style={[
                        styles.titleText,
                        { color: isDark ? "#f8fafc" : "#0f172a" },
                      ]}
                    >
                      {alertConfig.title}
                    </Text>
                  ) : null}

                  <Text
                    style={[
                      styles.messageText,
                      { color: isDark ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    {alertConfig?.message}
                  </Text>
                </View>

                {/* Buttons Row / Column */}
                <View
                  style={[
                    styles.buttonContainer,
                    isSingleButton ? styles.singleButtonRow : styles.multiButtonRow,
                  ]}
                >
                  {buttons.map((btn, index) => {
                    const isCancel = btn.style === "cancel";
                    const isDestructive = btn.style === "destructive";

                    let btnBg = colors.primary;
                    let textColor = "#ffffff";
                    let borderWidth = 0;
                    let borderColor = "transparent";

                    if (isCancel) {
                      btnBg = isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.05)";
                      textColor = isDark ? "#94a3b8" : "#64748b";
                      borderWidth = 1;
                      borderColor = isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)";
                    } else if (isDestructive) {
                      btnBg = "#ef4444";
                      textColor = "#ffffff";
                    }

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: btnBg,
                            borderWidth,
                            borderColor,
                            flex: isSingleButton ? 1 : 1,
                          },
                        ]}
                        onPress={() => handleButtonPress(btn)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.buttonText,
                            {
                              color: textColor,
                              fontWeight: isCancel ? "600" : "700",
                            },
                          ]}
                        >
                          {btn.text}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  alertCard: {
    width: Math.min(width - 48, 380),
    borderRadius: 24,
    borderWidth: 1,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  textContainer: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  titleText: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  messageText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  buttonContainer: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  singleButtonRow: {
    flexDirection: "row",
  },
  multiButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  buttonText: {
    fontSize: 14,
  },
});
