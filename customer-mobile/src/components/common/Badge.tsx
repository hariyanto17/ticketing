import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface BadgeProps {
  label: string;
  variant?: "primary" | "success" | "warning" | "danger" | "muted";
}

export const Badge: React.FC<BadgeProps> = ({ label, variant = "primary" }) => {
  const { colors } = useTheme();

  const getColors = () => {
    switch (variant) {
      case "success":
        return { bg: "rgba(16, 185, 129, 0.2)", text: "#10b981", border: "rgba(16, 185, 129, 0.45)" };
      case "warning":
        return { bg: "rgba(245, 158, 11, 0.2)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.45)" };
      case "danger":
        return { bg: "rgba(239, 68, 68, 0.2)", text: "#ef4444", border: "rgba(239, 68, 68, 0.45)" };
      case "muted":
        return { bg: colors.surface, text: colors.textMuted, border: colors.border };
      default:
        return { bg: "rgba(99, 102, 241, 0.2)", text: colors.primary, border: "rgba(99, 102, 241, 0.45)" };
    }
  };

  const { bg, text, border } = getColors();

  return (
    <View style={[styles.container, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});
