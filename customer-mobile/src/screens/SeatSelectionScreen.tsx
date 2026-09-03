import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { ShowtimeSeat } from "../types/schedule";
import { useGetScheduleSeatsQuery } from "../lib/api/scheduleApi";
import { useHoldSeatsMutation } from "../lib/api/bookingApi";
import { initSocket } from "../services/socketService";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { Header } from "../components/common/Header";
import { CinemaScreen } from "../components/seat/CinemaScreen";
import { SeatItem } from "../components/seat/SeatItem";
import { SeatLegend } from "../components/seat/SeatLegend";
import { HoldTimer } from "../components/seat/HoldTimer";
import { Button } from "../components/common/Button";

type SeatSelectionRouteProp = RouteProp<RootStackParamList, "SeatSelection">;
type SeatSelectionNavProp = StackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get("window");

export const SeatSelectionScreen: React.FC = () => {
  const navigation = useNavigation<SeatSelectionNavProp>();
  const route = useRoute<SeatSelectionRouteProp>();
  const {
    selectedSeats,
    toggleSeat,
    clearSelectedSeats,
    reservedUntil,
    setReservedUntil,
    estimatedTotal,
  } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();

  const schedule = route.params.schedule;

  // RTK Query: Seat matrix & Hold mutation
  const {
    data: serverSeats = [],
    isLoading: loading,
    refetch: loadSeats,
  } = useGetScheduleSeatsQuery(schedule.id);

  const [holdSeatsMutation, { isLoading: holding }] = useHoldSeatsMutation();

  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);

  useEffect(() => {
    if (serverSeats.length > 0) {
      setSeats(serverSeats);
    }
  }, [serverSeats]);

  useEffect(() => {
    clearSelectedSeats();

    // Initialize Socket.IO Real-time Synchronization
    const socket = initSocket();

    const handleSeatsHeld = (payload: { showtimeId: string; seatIds: string[] }) => {
      if (payload.showtimeId === schedule.id) {
        setSeats((prev) =>
          prev.map((s) =>
            payload.seatIds.includes(s.seatId) ? { ...s, status: "HOLD" } : s
          )
        );
      }
    };

    const handleSeatsReleased = (payload: { showtimeId: string; seatIds: string[] }) => {
      if (payload.showtimeId === schedule.id) {
        setSeats((prev) =>
          prev.map((s) =>
            payload.seatIds.includes(s.seatId) ? { ...s, status: "AVAILABLE" } : s
          )
        );
      }
    };

    const handleSeatsSold = (payload: { showtimeId: string; seatIds: string[] }) => {
      if (payload.showtimeId === schedule.id) {
        setSeats((prev) =>
          prev.map((s) =>
            payload.seatIds.includes(s.seatId) ? { ...s, status: "SOLD" } : s
          )
        );
      }
    };

    socket.on("seats_held", handleSeatsHeld);
    socket.on("seats_released", handleSeatsReleased);
    socket.on("seats_sold", handleSeatsSold);

    return () => {
      socket.off("seats_held", handleSeatsHeld);
      socket.off("seats_released", handleSeatsReleased);
      socket.off("seats_sold", handleSeatsSold);
    };
  }, [schedule.id]);

  // Handle Hold Expiry
  const handleHoldExpired = () => {
    Alert.alert(t("seat.timerExpired"), t("seat.timerExpired"), [
      {
        text: "OK",
        onPress: () => {
          clearSelectedSeats();
          loadSeats();
        },
      },
    ]);
  };

  // Group seats by Row (ordered A -> K) and preserve column matrix (preserving aisles)
  const { rowList, maxColumn, seatSize } = useMemo(() => {
    const rowsMap: Record<string, Record<number, ShowtimeSeat>> = {};
    let maxCol = 1;

    for (const s of seats) {
      const row = s.seat.row;
      const col = s.seat.column;
      if (!rowsMap[row]) {
        rowsMap[row] = {};
      }
      rowsMap[row][col] = s;
      if (col > maxCol) maxCol = col;
    }

    const sortedRows = Object.keys(rowsMap).sort();
    const padding = 60;
    const computedSize = Math.max(22, Math.min(32, Math.floor((width - padding) / (maxCol + 1))));

    return {
      rowList: sortedRows.map((r) => ({ rowName: r, cols: rowsMap[r] })),
      maxColumn: maxCol,
      seatSize: computedSize,
    };
  }, [seats]);

  const handleSeatPress = (seat: ShowtimeSeat) => {
    if (seat.status !== "AVAILABLE" && !selectedSeats.some((s) => s.seatId === seat.seatId)) {
      if (seat.status === "HOLD") {
        Alert.alert(t("seat.held"), t("seat.heldWarning"));
      } else if (seat.status === "SOLD") {
        Alert.alert(t("seat.sold"), t("seat.soldWarning"));
      }
      return;
    }

    toggleSeat(seat);
  };

  const handleHoldAndProceed = async () => {
    if (selectedSeats.length === 0) {
      Alert.alert(t("seat.title"), t("seat.selectAtLeastOne"));
      return;
    }

    try {
      const seatIds = selectedSeats.map((s) => s.seat.id);
      const res = await holdSeatsMutation({ scheduleId: schedule.id, seatIds }).unwrap();
      setReservedUntil(new Date(res.reservedUntil));
      navigation.navigate("BookingSummary");
    } catch (err: any) {
      Alert.alert(
        t("common.error"),
        err?.data?.message || err?.message || "Kursi yang Anda pilih baru saja dipesan oleh pengguna lain. Silakan pilih kursi lain.",
        [{ text: "OK", onPress: () => loadSeats() }]
      );
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`${schedule.movie?.title || "Film"} • ${schedule.studio?.name || "Studio"}`}
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            {t("common.loading")}
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Active Hold Countdown Timer */}
          {reservedUntil && (
            <HoldTimer reservedUntil={reservedUntil} onExpired={handleHoldExpired} />
          )}

          {/* Screen Curve representation */}
          <CinemaScreen />

          {/* Seat Layout Grid */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.seatMatrixScroll}
          >
            <View style={styles.seatGrid}>
              {rowList.map(({ rowName, cols }) => (
                <View key={rowName} style={styles.seatRow}>
                  {/* Row Label Left */}
                  <View style={[styles.rowLabelBox, { width: 24 }]}>
                    <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{rowName}</Text>
                  </View>

                  {/* Seat columns spanning 1 -> maxColumn */}
                  <View style={styles.columnsContainer}>
                    {Array.from({ length: maxColumn }, (_, i) => i + 1).map((colNum) => {
                      const seat = cols[colNum];
                      if (!seat) {
                        // Aisle Gap
                        return (
                          <View
                            key={`aisle-${rowName}-${colNum}`}
                            style={{ width: seatSize, height: seatSize, marginHorizontal: 2 }}
                          />
                        );
                      }

                      const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);

                      return (
                        <SeatItem
                          key={seat.seatId}
                          showtimeSeat={seat}
                          isSelected={isSelected}
                          size={seatSize}
                          onPress={() => handleSeatPress(seat)}
                        />
                      );
                    })}
                  </View>

                  {/* Row Label Right */}
                  <View style={[styles.rowLabelBox, { width: 24 }]}>
                    <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{rowName}</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Legend */}
          <SeatLegend />
        </ScrollView>
      )}

      {/* Selected Seats summary footer */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {selectedSeats.length > 0
                ? `${selectedSeats.length} ${t("seat.selectedSeats")}: ${selectedSeats.map((s) => s.seat.seatLabel).join(", ")}`
                : t("seat.noSeatsSelected")}
            </Text>
            <Text style={[styles.summaryPrice, { color: colors.primary }]}>
              {formatCurrency(estimatedTotal)}
            </Text>
          </View>

          <Button
            title={t("seat.proceed")}
            onPress={handleHoldAndProceed}
            loading={holding}
            disabled={selectedSeats.length === 0}
            size="medium"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  seatMatrixScroll: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  seatGrid: {
    gap: 8,
    alignItems: "center",
  },
  seatRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowLabelBox: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  columnsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
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
    maxWidth: 200,
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: "800",
  },
});
