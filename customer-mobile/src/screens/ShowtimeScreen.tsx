import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { useToast } from "../context/ToastContext";
import { Header } from "../components/common/Header";
import { isScheduleExpired } from "../utils/format";

type ShowtimeScreenRouteProp = RouteProp<RootStackParamList, "Showtime">;
type ShowtimeScreenNavProp = StackNavigationProp<RootStackParamList>;

export const ShowtimeScreen: React.FC = () => {
  const navigation = useNavigation<ShowtimeScreenNavProp>();
  const route = useRoute<ShowtimeScreenRouteProp>();
  const { setSelectedSchedule, resetBooking } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();
  const { showWarning } = useToast();

  const movie = route.params.movie;

  // Generate next 5 dates for date selector
  const dates = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return d;
    });
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(dates[0]);

  const formatYYYYMMDD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const todayStr = useMemo(() => formatYYYYMMDD(dates[0]), [dates]);

  const {
    data: allSchedules = [],
    isLoading: loading,
  } = useGetSchedulesQuery({
    movieId: movie.id,
    startDate: todayStr,
  });

  // Filter only PUBLISHED schedules
  const publishedSchedules = useMemo(() => {
    return allSchedules.filter((s) => s.status === "PUBLISHED");
  }, [allSchedules]);

  const isScheduleOnDate = useCallback((schedule: Showtime, targetDate: Date) => {
    const targetStr = formatYYYYMMDD(targetDate);
    if (schedule.businessDate) {
      const bDateStr = schedule.businessDate.split("T")[0];
      if (bDateStr === targetStr) return true;
    }
    if (schedule.startTime) {
      const stDate = new Date(schedule.startTime);
      if (formatYYYYMMDD(stDate) === targetStr) return true;
    }
    return false;
  }, []);

  const getSchedulesForDate = useCallback(
    (targetDate: Date) => {
      return publishedSchedules.filter((s) => isScheduleOnDate(s, targetDate));
    },
    [publishedSchedules, isScheduleOnDate]
  );

  // Auto-select first available date if today has no schedules but another date does
  useEffect(() => {
    if (!loading && publishedSchedules.length > 0) {
      const currentHasSchedules = publishedSchedules.some((s) =>
        isScheduleOnDate(s, selectedDate)
      );
      if (!currentHasSchedules) {
        const firstAvailableDate = dates.find((d) =>
          publishedSchedules.some((s) => isScheduleOnDate(s, d))
        );
        if (firstAvailableDate) {
          setSelectedDate(firstAvailableDate);
        }
      }
    }
  }, [loading, publishedSchedules, dates, isScheduleOnDate, selectedDate]);

  // Current schedules for selected date
  const currentDaySchedules = useMemo(() => {
    return getSchedulesForDate(selectedDate);
  }, [getSchedulesForDate, selectedDate]);

  // Group schedules by Studio
  const groupedByStudio = useMemo(() => {
    return currentDaySchedules.reduce((acc, schedule) => {
      const studioName = schedule.studio?.name || "Studio 1";
      if (!acc[studioName]) {
        acc[studioName] = [];
      }
      acc[studioName].push(schedule);
      return acc;
    }, {} as Record<string, Showtime[]>);
  }, [currentDaySchedules]);

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  };

  const handleSelectSchedule = (schedule: Showtime) => {
    resetBooking();
    setSelectedSchedule(schedule);
    navigation.navigate("SeatSelection", { schedule });
  };

  const handleDatePress = (date: Date, hasSchedules: boolean) => {
    if (!hasSchedules) {
      showWarning(
        t("showtimes.noScheduleForDate") || "Tidak ada jadwal untuk tanggal yang dipilih"
      );
      return;
    }
    setSelectedDate(date);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={movie.title} showBack onBack={() => navigation.goBack()} />

      {/* Date Selector Row */}
      <View style={styles.dateSelectorContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateScroll}>
          {dates.map((date, index) => {
            const isSelected = date.toDateString() === selectedDate.toDateString();
            const dateSchedules = getSchedulesForDate(date);
            const hasSchedules = dateSchedules.length > 0;
            const isDisabled = !loading && !hasSchedules;

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
                    backgroundColor: isSelected
                      ? colors.primary
                      : isDisabled
                      ? colors.surface
                      : colors.card,
                    borderColor: isSelected
                      ? colors.primary
                      : isDisabled
                      ? colors.cardBorder
                      : colors.cardBorder,
                    opacity: isDisabled ? 0.45 : 1,
                  },
                ]}
                onPress={() => handleDatePress(date, hasSchedules)}
                activeOpacity={isDisabled ? 0.6 : 0.8}
              >
                <Text
                  style={[
                    styles.dayName,
                    {
                      color: isSelected
                        ? "rgba(255,255,255,0.8)"
                        : isDisabled
                        ? colors.textMuted
                        : colors.textMuted,
                    },
                  ]}
                >
                  {dayName}
                </Text>
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: isSelected
                        ? "#ffffff"
                        : isDisabled
                        ? colors.textMuted
                        : colors.text,
                      textDecorationLine: isDisabled ? "line-through" : "none",
                    },
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
                {studioSchedules.map((schedule) => {
                  const expired = isScheduleExpired(schedule.startTime, 1);

                  return (
                    <TouchableOpacity
                      key={schedule.id}
                      style={[
                        styles.timeSlot,
                        {
                          backgroundColor: expired ? colors.card : colors.surface,
                          borderColor: expired ? colors.cardBorder : colors.cardBorder,
                          opacity: expired ? 0.35 : 1,
                        },
                      ]}
                      onPress={() => !expired && handleSelectSchedule(schedule)}
                      disabled={expired}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.timeText,
                          {
                            color: expired ? colors.textMuted : colors.text,
                            textDecorationLine: expired ? "line-through" : "none",
                          },
                        ]}
                      >
                        {formatTime(schedule.startTime)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
