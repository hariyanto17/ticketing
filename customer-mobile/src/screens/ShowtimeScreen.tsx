import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Calendar, Armchair } from "lucide-react-native";
import { RootStackParamList } from "../types/navigation";
import { Showtime } from "../types/schedule";
import { useGetSchedulesQuery } from "../lib/api/scheduleApi";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";

type ShowtimeScreenRouteProp = RouteProp<RootStackParamList, "Showtime">;
type ShowtimeScreenNavProp = StackNavigationProp<RootStackParamList>;

export const ShowtimeScreen: React.FC = () => {
  const navigation = useNavigation<ShowtimeScreenNavProp>();
  const route = useRoute<ShowtimeScreenRouteProp>();
  const { setSelectedSchedule } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();

  const movie = route.params.movie;

  // Generate next 5 dates for date selector
  const dates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);
  const dateStr = selectedDate.toISOString().split("T")[0];

  const {
    data: allSchedules = [],
    isLoading: loading,
  } = useGetSchedulesQuery({
    movieId: movie.id,
    startDate: dateStr,
  });

  // Filter only PUBLISHED schedules
  const schedules = allSchedules.filter((s) => s.status === "PUBLISHED");

  // Group schedules by Studio
  const groupedByStudio = schedules.reduce((acc, schedule) => {
    const studioName = schedule.studio?.name || "Studio 1";
    if (!acc[studioName]) {
      acc[studioName] = [];
    }
    acc[studioName].push(schedule);
    return acc;
  }, {} as Record<string, Showtime[]>);

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const handleSelectSchedule = (schedule: Showtime) => {
    setSelectedSchedule(schedule);
    navigation.navigate("SeatSelection", { schedule });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={movie.title} showBack onBack={() => navigation.goBack()} />

      {/* Date Selector Row */}
      <View style={styles.dateSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {dates.map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const dayName =
              index === 0
                ? t("common.today")
                : index === 1
                ? t("common.tomorrow")
                : date.toLocaleDateString("id-ID", { weekday: "short" });
            const dayNum = date.getDate();
            const monthName = date.toLocaleDateString("id-ID", { month: "short" });

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.datePill,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.cardBorder,
                  },
                ]}
                onPress={() => setSelectedDate(date)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: isSelected ? "rgba(255,255,255,0.8)" : colors.textMuted },
                  ]}
                >
                  {dayName}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    { color: isSelected ? "#ffffff" : colors.text },
                  ]}
                >
                  {dayNum} {monthName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Studios & Showtimes List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t("common.loading")}
          </Text>
        </View>
      ) : Object.keys(groupedByStudio).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Calendar size={40} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t("movieDetail.noSchedules")}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          {Object.entries(groupedByStudio).map(([studioName, studioSchedules]) => (
            <View
              key={studioName}
              style={[styles.studioCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            >
              <View style={styles.studioHeader}>
                <View style={styles.studioTitleRow}>
                  <Armchair size={18} color={colors.primary} />
                  <Text style={[styles.studioName, { color: colors.text }]}>
                    {studioName}
                  </Text>
                </View>
                <Text style={[styles.studioPrice, { color: colors.primary }]}>
                  {formatCurrency(studioSchedules[0]?.ticketPrice || 0)}
                </Text>
              </View>

              <View style={styles.timeGrid}>
                {studioSchedules.map((schedule) => (
                  <TouchableOpacity
                    key={schedule.id}
                    style={[styles.timeSlot, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}
                    onPress={() => handleSelectSchedule(schedule)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.timeText, { color: colors.text }]}>
                      {formatTime(schedule.startTime)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dateSelectorContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dateScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  datePill: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 2,
    minWidth: 90,
  },
  dayName: {
    fontSize: 11,
    fontWeight: "600",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "800",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  studioCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  studioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studioTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  studioName: {
    fontSize: 16,
    fontWeight: "700",
  },
  studioPrice: {
    fontSize: 14,
    fontWeight: "800",
  },
  timeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  timeSlot: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
