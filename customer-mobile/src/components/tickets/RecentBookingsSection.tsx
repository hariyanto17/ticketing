import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { History } from "lucide-react-native";
import { ThemeColors } from "../../theme";

interface RecentBookingItem {
  orderId: string;
  orderNumber: string;
  movieTitle: string;
}

interface RecentBookingsSectionProps {
  recentBookings: RecentBookingItem[];
  onSelectBooking: (orderNumber: string) => void;
  colors: ThemeColors;
  t: (key: string) => string;
}

export const RecentBookingsSection: React.FC<RecentBookingsSectionProps> = ({
  recentBookings,
  onSelectBooking,
  colors,
  t,
}) => {
  if (recentBookings.length === 0) return null;

  return (
    <View style={styles.recentSection}>
      <View style={styles.recentHeader}>
        <History size={16} color={colors.primary} />
        <Text style={[styles.recentTitle, { color: colors.text }]}>
          {t("myTickets.recentOrders")}
        </Text>
      </View>

      <View style={styles.recentChipsRow}>
        {recentBookings.map((b) => (
          <TouchableOpacity
            key={b.orderId}
            style={[styles.recentChip, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => onSelectBooking(b.orderNumber)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipOrderNum, { color: colors.primary }]}>{b.orderNumber}</Text>
            <Text style={[styles.chipMovie, { color: colors.textMuted }]} numberOfLines={1}>
              {b.movieTitle}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  recentSection: {
    gap: 10,
  },
  recentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  recentChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  recentChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: "48%",
  },
  chipOrderNum: {
    fontSize: 12,
    fontWeight: "700",
  },
  chipMovie: {
    fontSize: 11,
  },
});
