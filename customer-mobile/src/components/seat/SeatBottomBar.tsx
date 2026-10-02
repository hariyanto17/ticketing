import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ShowtimeSeat } from "../../types/schedule";
import { Button } from "../common/Button";

interface SeatBottomBarProps {
  selectedSeats: ShowtimeSeat[];
  ticketSubtotal: number;
  formatCurrency: (amount: number) => string;
  t: (key: string) => string;
  onProceed: () => void;
  holding: boolean;
  colors: any;
}

export const SeatBottomBar: React.FC<SeatBottomBarProps> = ({
  selectedSeats,
  ticketSubtotal,
  formatCurrency,
  t,
  onProceed,
  holding,
  colors,
}) => {
  return (
    <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
      <View style={styles.summaryRow}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]} numberOfLines={2}>
            {selectedSeats.length > 0
              ? `${selectedSeats.length} ${t("seat.selectedSeats")}: ${selectedSeats.map((s) => s.seat.seatLabel).join(", ")}`
              : t("seat.noSeatsSelected")}
          </Text>
          <Text style={[styles.summaryPrice, { color: colors.primary }]}>
            {formatCurrency(ticketSubtotal)}
          </Text>
        </View>

        <Button
          title={t("seat.proceed")}
          onPress={onProceed}
          loading={holding}
          disabled={selectedSeats.length === 0}
          size="medium"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: "800",
  },
});
