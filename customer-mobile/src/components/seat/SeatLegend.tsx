import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

export const SeatLegend: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useLanguage();

  const items = [
    { label: t("seat.available"), bg: colors.seatAvailable, border: colors.cardBorder },
    { label: t("seat.selected"), bg: colors.seatSelected, border: colors.seatSelected },
    { label: t("seat.held"), bg: colors.seatHeld, border: "transparent" },
    { label: t("seat.sold"), bg: colors.seatSold, border: "transparent" },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {items.map((item, index) => (
        <View key={index} style={styles.legendItem}>
          <View
            style={[
              styles.box,
              {
                backgroundColor: item.bg,
                borderColor: item.border,
                borderWidth: item.border !== "transparent" ? 1 : 0,
              },
            ]}
          />
          <Text style={[styles.label, { color: colors.textMuted }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  box: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
