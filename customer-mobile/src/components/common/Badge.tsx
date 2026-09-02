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
        return { bg: "rgba(16, 185, 129, 0.15)", text: colors.success };
      case "warning":
        return { bg: "rgba(245, 158, 11, 0.15)", text: colors.warning };
      case "danger":
        return { bg: "rgba(239, 68, 68, 0.15)", text: colors.danger };
      case "muted":
        return { bg: colors.surface, text: colors.textMuted };
      default:
        return { bg: "rgba(99, 102, 241, 0.15)", text: colors.primary };
    }
  };

  const { bg, text } = getColors();

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
  },
});
