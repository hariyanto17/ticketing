import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { ShowtimeSeat } from "../../types/schedule";
import { useTheme } from "../../context/ThemeContext";

interface SeatItemProps {
  showtimeSeat: ShowtimeSeat;
  isSelected: boolean;
  onPress: () => void;
  size?: number;
}

export const SeatItem: React.FC<SeatItemProps> = ({
  showtimeSeat,
  isSelected,
  onPress,
  size = 28,
}) => {
  const { colors } = useTheme();
  const status = showtimeSeat.status;

  const isSelectable = status === "AVAILABLE";

  const getBackgroundColor = () => {
    if (isSelected) return colors.seatSelected;
    switch (status) {
      case "AVAILABLE":
        return colors.seatAvailable;
      case "HOLD":
        return colors.seatHeld;
      case "SOLD":
        return colors.seatSold;
      case "DISABLED":
      default:
        return colors.seatDisabled;
    }
  };

  const getBorderColor = () => {
    if (isSelected) return colors.seatSelected;
    if (status === "AVAILABLE") return colors.cardBorder;
    return "transparent";
  };

  const getTextColor = () => {
    if (isSelected) return "#ffffff";
    if (status === "AVAILABLE") return colors.text;
    if (status === "HOLD") return "#b45309";
    if (status === "SOLD") return "#991b1b";
    return colors.textMuted;
  };

  const seatMargin = Math.max(1, Math.min(2.5, Math.round(size * 0.08)));
  const borderRadius = Math.max(3, Math.min(6, Math.round(size * 0.2)));
  const fontSize = Math.max(7.5, Math.round(size * 0.38));

  return (
    <TouchableOpacity
      style={[
        styles.seat,
        {
          width: size,
          height: size,
          margin: seatMargin,
          borderRadius: borderRadius,
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: status === "AVAILABLE" ? 1 : 0,
        },
      ]}
      onPress={onPress}
      disabled={!isSelectable && !isSelected}
      activeOpacity={0.7}
      hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
    >
      <Text style={[styles.label, { color: getTextColor(), fontSize }]}>
        {showtimeSeat.seat.seatNumber}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  seat: {
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontWeight: "700",
  },
});

