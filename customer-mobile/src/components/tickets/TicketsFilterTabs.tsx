import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { ThemeColors } from "../../theme";

interface TicketsFilterTabsProps {
  selectedFilter: "ALL" | "PAID" | "CANCELLED";
  onSelectFilter: (filter: "ALL" | "PAID" | "CANCELLED") => void;
  allOrdersCount: number;
  paidOrdersCount: number;
  cancelledOrdersCount: number;
  colors: ThemeColors;
  t: (key: string) => string;
}

export const TicketsFilterTabs: React.FC<TicketsFilterTabsProps> = ({
  selectedFilter,
  onSelectFilter,
  allOrdersCount,
  paidOrdersCount,
  cancelledOrdersCount,
  colors,
  t,
}) => {
  return (
    <View style={styles.filterSection}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            {
              backgroundColor: selectedFilter === "ALL" ? colors.primary : colors.card,
              borderColor: selectedFilter === "ALL" ? colors.primary : colors.cardBorder,
            },
          ]}
          onPress={() => onSelectFilter("ALL")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: selectedFilter === "ALL" ? "#ffffff" : colors.text },
            ]}
          >
            {t("myTickets.filterAll")} ({allOrdersCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            {
              backgroundColor: selectedFilter === "PAID" ? colors.success : colors.card,
              borderColor: selectedFilter === "PAID" ? colors.success : colors.cardBorder,
            },
          ]}
          onPress={() => onSelectFilter("PAID")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: selectedFilter === "PAID" ? "#ffffff" : colors.text },
            ]}
          >
            {t("myTickets.filterPaid")} ({paidOrdersCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            {
              backgroundColor: selectedFilter === "CANCELLED" ? colors.danger : colors.card,
              borderColor: selectedFilter === "CANCELLED" ? colors.danger : colors.cardBorder,
            },
          ]}
          onPress={() => onSelectFilter("CANCELLED")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.filterTabText,
              { color: selectedFilter === "CANCELLED" ? "#ffffff" : colors.text },
            ]}
          >
            {t("myTickets.filterCancelled")} ({cancelledOrdersCount})
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  filterSection: {
    paddingBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
