import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { scheduleService } from "../services/scheduleService";
import { bookingService } from "../services/bookingService";
import { initSocket, disconnectSocket } from "../services/socketService";
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

  const [loading, setLoading] = useState<boolean>(true);
  const [holding, setHolding] = useState<boolean>(false);
  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);

  const loadSeats = useCallback(async () => {
    try {
      const data = await scheduleService.getScheduleSeats(schedule.id);
      setSeats(data);
    } catch (e) {
      console.error("Failed to load seats", e);
    } finally {
      setLoading(false);
    }
  }, [schedule.id]);

  useEffect(() => {
    loadSeats();
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
  }, [schedule.id, loadSeats]);

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

    // Sort rows alphabetically (A, B, C, ...)
    const sortedRows = Object.keys(rowsMap).sort();

    // Calculate dynamic seat size to fit screen width
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

    setHolding(true);
    try {
      const seatIds = selectedSeats.map((s) => s.seat.id);
      const res = await bookingService.holdSeats(schedule.id, seatIds);
      setReservedUntil(new Date(res.reservedUntil));
      navigation.navigate("BookingSummary");
    } catch (err: any) {
      Alert.alert(
        t("common.error"),
        err.message || "Kursi yang Anda pilih baru saja dipesan oleh pengguna lain. Silakan pilih kursi lain.",
        [{ text: "OK", onPress: () => loadSeats() }]
      );
    } finally {
      setHolding(false);
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

          {/* Cinema Screen (Placed in FRONT of Row A) */}
          <CinemaScreen />

          {/* Seat Grid Matrix */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matrixContainer}
          >
            <View style={styles.gridTable}>
              {rowList.map(({ rowName, cols }) => (
                <View key={rowName} style={styles.rowWrapper}>
                  {/* Row Letter on Left */}
                  <View style={[styles.rowHeader, { width: seatSize * 0.8 }]}>
                    <Text style={[styles.rowLetter, { color: colors.textMuted }]}>
                      {rowName}
                    </Text>
                  </View>

                  {/* Columns 1 .. maxColumn with Preserved Aisle Gaps */}
                  {Array.from({ length: maxColumn }, (_, i) => i + 1).map((colNum) => {
                    const seat = cols[colNum];
                    if (!seat) {
                      // Aisle empty space
                      return (
                        <View
                          key={`empty-${rowName}-${colNum}`}
                          style={{ width: seatSize + 5, height: seatSize + 5 }}
                        />
                      );
                    }

                    const isSelected = selectedSeats.some((s) => s.seatId === seat.seatId);

                    return (
                      <SeatItem
                        key={seat.id}
                        showtimeSeat={seat}
                        isSelected={isSelected}
                        size={seatSize}
                        onPress={() => handleSeatPress(seat)}
                      />
                    );
                  })}

                  {/* Row Letter on Right */}
                  <View style={[styles.rowHeader, { width: seatSize * 0.8 }]}>
                    <Text style={[styles.rowLetter, { color: colors.textMuted }]}>
                      {rowName}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Seat Status Legend */}
          <View style={styles.legendWrapper}>
            <SeatLegend />
          </View>
        </ScrollView>
      )}

      {/* Checkout Footer Bar */}
      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.cardBorder }]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {t("seat.selectedSeats")} ({selectedSeats.length})
            </Text>
            <Text style={[styles.seatListText, { color: colors.text }]} numberOfLines={1}>
              {selectedSeats.length > 0
                ? selectedSeats.map((s) => s.seat.seatLabel).join(", ")
                : "—"}
            </Text>
          </View>

          <View style={styles.priceColumn}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>
              {t("seat.estimatedTotal")}
            </Text>
            <Text style={[styles.totalAmountText, { color: colors.primary }]}>
              {formatCurrency(estimatedTotal)}
            </Text>
          </View>
        </View>

        <Button
          title={t("seat.continueToCheckout")}
          onPress={handleHoldAndProceed}
          disabled={selectedSeats.length === 0}
          loading={holding}
          size="large"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
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
  matrixContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gridTable: {
    alignItems: "center",
    gap: 2,
  },
  rowWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowHeader: {
    alignItems: "center",
    justifyContent: "center",
  },
  rowLetter: {
    fontSize: 12,
    fontWeight: "700",
  },
  legendWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  seatListText: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
    maxWidth: width * 0.45,
  },
  priceColumn: {
    alignItems: "flex-end",
  },
  totalAmountText: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
});
