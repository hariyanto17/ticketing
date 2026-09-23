import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { PinchGestureHandler, PinchGestureHandlerGestureEvent, HandlerStateChangeEvent, State } from "react-native-gesture-handler";
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react-native";
import { useNavigation, useRoute, RouteProp, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../types/navigation";
import { ShowtimeSeat } from "../types/schedule";
import { useGetScheduleSeatsQuery } from "../lib/api/scheduleApi";
import { useHoldSeatsMutation, useReleaseSeatsMutation } from "../lib/api/bookingApi";
import { initSocket } from "../services/socketService";
import { useBooking } from "../context/BookingContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import { useAlert } from "../context/AlertContext";
import { Header } from "../components/common/Header";
import { CinemaScreen } from "../components/seat/CinemaScreen";
import { SeatItem } from "../components/seat/SeatItem";
import { SeatLegend } from "../components/seat/SeatLegend";
import { HoldTimer } from "../components/seat/HoldTimer";
import { Button } from "../components/common/Button";
import { NonRefundableBanner } from "../components/common/NonRefundableBanner";

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
    ticketSubtotal,
  } = useBooking();
  const { colors } = useTheme();
  const { t, formatCurrency } = useLanguage();
  const { showAlert } = useAlert();

  const schedule = route.params.schedule;

  // Zoom scale state (1.0 = auto-fit to screen, up to 2.2x zoom)
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const baseScaleRef = useRef<number>(1.0);

  const handlePinchGestureEvent = (event: PinchGestureHandlerGestureEvent) => {
    const scale = event.nativeEvent.scale;
    const nextLevel = Math.max(1.0, Math.min(2.5, +(baseScaleRef.current * scale).toFixed(2)));
    setZoomLevel(nextLevel);
  };

  const handlePinchStateChange = (event: HandlerStateChangeEvent) => {
    if (event.nativeEvent.oldState === State.ACTIVE || event.nativeEvent.state === State.END) {
      baseScaleRef.current = zoomLevel;
    }
  };

  // RTK Query: Seat matrix & Hold/Release mutations
  const {
    data: serverSeats = [],
    isLoading: loading,
    refetch: loadSeats,
  } = useGetScheduleSeatsQuery(schedule.id);

  const [holdSeatsMutation, { isLoading: holding }] = useHoldSeatsMutation();
  const [releaseSeatsMutation] = useReleaseSeatsMutation();

  const [seats, setSeats] = useState<ShowtimeSeat[]>([]);

  useEffect(() => {
    if (serverSeats.length > 0) {
      setSeats(serverSeats);
    }
  }, [serverSeats]);

  const isProceedingRef = useRef(false);
  const selectedSeatsRef = useRef(selectedSeats);
  selectedSeatsRef.current = selectedSeats;

  useFocusEffect(
    useCallback(() => {
      isProceedingRef.current = false;
      setZoomLevel(1.0);
      loadSeats();
    }, [schedule.id])
  );

  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", () => {
      if (isProceedingRef.current) {
        return;
      }

      const currentSeats = selectedSeatsRef.current;
      if (currentSeats.length > 0) {
        const seatIds = currentSeats.map((s) => s.seatId || s.seat?.id || s.id);
        releaseSeatsMutation({ scheduleId: schedule.id, seatIds }).catch(() => {});
        clearSelectedSeats();
      }
    });

    return unsubscribe;
  }, [navigation, schedule.id, releaseSeatsMutation, clearSelectedSeats]);

  useEffect(() => {
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
    const currentSeats = selectedSeatsRef.current;
    if (currentSeats.length > 0) {
      const seatIds = currentSeats.map((s) => s.seatId || s.seat?.id || s.id);
      releaseSeatsMutation({ scheduleId: schedule.id, seatIds }).catch(() => {});
      clearSelectedSeats();
    }
    loadSeats();
    showAlert(t("seat.timerExpired"), t("seat.timerExpired"), [{ text: "OK" }], "warning");
  };

  // Group seats by Row (ordered K -> A from screen down) and compute auto-fit size + zoom
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

    const getRowIndex = (row: string): number => {
      let index = 0;
      for (let i = 0; i < row.length; i++) {
        index = index * 26 + (row.charCodeAt(i) - 64);
      }
      return index - 1;
    };

    const sortedRows = Object.keys(rowsMap).sort((a, b) => getRowIndex(b) - getRowIndex(a));
    
    // Auto-fit calculation:
    // Total screen width available = width
    // Non-seat horizontal offsets: left & right row labels (~44px) + grid margins (~20px) = ~64px
    // Each seat column has seat width + horizontal margin (~3px)
    const availableWidthForCols = Math.max(160, width - 64);
    const fitSize = Math.max(13, Math.min(32, Math.floor(availableWidthForCols / Math.max(1, maxCol)) - 3));
    const computedSize = Math.round(fitSize * zoomLevel);

    return {
      rowList: sortedRows.map((r) => ({ rowName: r, cols: rowsMap[r] })),
      maxColumn: maxCol,
      seatSize: computedSize,
    };
  }, [seats, zoomLevel]);

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.2, +(prev + 0.3).toFixed(1)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(1.0, +(prev - 0.3).toFixed(1)));
  };

  const handleResetZoom = () => {
    setZoomLevel(1.0);
  };

  const handleSeatPress = async (seat: ShowtimeSeat) => {
    const isAlreadySelected = selectedSeats.some(
      (s) => s.seatId === seat.seatId || s.id === seat.id
    );

    if (seat.status !== "AVAILABLE" && !isAlreadySelected) {
      if (seat.status === "HOLD") {
        showAlert(t("seat.held"), t("seat.heldWarning"), [{ text: "OK" }], "warning");
      } else if (seat.status === "SOLD") {
        showAlert(t("seat.sold"), t("seat.soldWarning"), [{ text: "OK" }], "error");
      }
      return;
    }

    const seatIdToHold = seat.seatId || seat.seat?.id || seat.id;

    try {
      if (isAlreadySelected) {
        toggleSeat(seat);
        await releaseSeatsMutation({ scheduleId: schedule.id, seatIds: [seatIdToHold] }).unwrap();
      } else {
        if (selectedSeats.length >= 8) {
          showAlert(t("seat.title"), "Maksimal 8 kursi dalam satu transaksi.", [{ text: "OK" }], "warning");
          return;
        }
        const res = await holdSeatsMutation({ scheduleId: schedule.id, seatIds: [seatIdToHold] }).unwrap();
        if (res.reservedUntil) {
          setReservedUntil(new Date(res.reservedUntil));
        }
        toggleSeat(seat);
      }
    } catch (err: any) {
      showAlert(
        t("common.error"),
        err?.data?.message || err?.message || "Kursi yang Anda pilih baru saja dipesan oleh kasir atau pengguna lain. Silakan pilih kursi lain.",
        [{ text: "OK", onPress: () => loadSeats() }],
        "error"
      );
    }
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const handleHoldAndProceed = async () => {
    if (selectedSeats.length === 0) {
      showAlert(t("seat.title"), t("seat.selectAtLeastOne"), [{ text: "OK" }], "warning");
      return;
    }

    isProceedingRef.current = true;
    navigation.navigate("BookingSummary");
  };

  const rowLabelWidth = Math.max(16, Math.min(26, Math.round(seatSize * 0.85)));
  const rowLabelFontSize = Math.max(9, Math.min(13, Math.round(seatSize * 0.45)));
  const seatGapMargin = Math.max(1, Math.min(2.5, Math.round(seatSize * 0.08)));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header
        title={`${schedule.movie?.title || "Film"} • ${schedule.studio?.name || "Studio"}`}
        showBack
        onBack={handleBack}
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

          {/* Zoom In / Out Controls Toolbar */}
          <View style={styles.zoomControlContainer}>
            <Text style={[styles.zoomHintText, { color: colors.textMuted }]}>
              {t("seat.zoomHint")}
            </Text>
            <View style={[styles.zoomPill, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
              <TouchableOpacity
                style={[styles.zoomBtn, zoomLevel <= 1.0 && styles.zoomBtnDisabled]}
                onPress={handleZoomOut}
                disabled={zoomLevel <= 1.0}
                activeOpacity={0.7}
              >
                <ZoomOut size={16} color={zoomLevel <= 1.0 ? colors.textMuted : colors.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.zoomResetBtn, { borderLeftColor: colors.cardBorder, borderRightColor: colors.cardBorder }]}
                onPress={handleResetZoom}
                activeOpacity={0.7}
              >
                <Maximize2 size={12} color={colors.primary} />
                <Text style={[styles.zoomPercentText, { color: colors.primary }]}>
                  {zoomLevel === 1.0 ? t("seat.zoomReset") : `${Math.round(zoomLevel * 100)}%`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.zoomBtn, zoomLevel >= 2.2 && styles.zoomBtnDisabled]}
                onPress={handleZoomIn}
                disabled={zoomLevel >= 2.2}
                activeOpacity={0.7}
              >
                <ZoomIn size={16} color={zoomLevel >= 2.2 ? colors.textMuted : colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Seat Layout Grid with Pinch to Zoom Support */}
          <PinchGestureHandler
            onGestureEvent={handlePinchGestureEvent}
            onHandlerStateChange={handlePinchStateChange}
          >
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.seatMatrixScroll,
                  zoomLevel === 1.0 && styles.seatMatrixScrollFit,
                ]}
              >
                <View style={styles.seatGrid}>
                  {rowList.map(({ rowName, cols }) => (
                    <View key={rowName} style={styles.seatRow}>
                      {/* Row Label Left */}
                      <View style={[styles.rowLabelBox, { width: rowLabelWidth }]}>
                        <Text style={[styles.rowLabel, { color: colors.textMuted, fontSize: rowLabelFontSize }]}>
                          {rowName}
                        </Text>
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
                                style={{ width: seatSize, height: seatSize, margin: seatGapMargin }}
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
                      <View style={[styles.rowLabelBox, { width: rowLabelWidth }]}>
                        <Text style={[styles.rowLabel, { color: colors.textMuted, fontSize: rowLabelFontSize }]}>
                          {rowName}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          </PinchGestureHandler>

          {/* Legend */}
          <SeatLegend />
        </ScrollView>
      )}

      {/* Sticky Non-Refundable Announcement */}
      <NonRefundableBanner compact />

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
              {formatCurrency(ticketSubtotal)}
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
    paddingVertical: 14,
    alignItems: "center",
  },
  seatMatrixScrollFit: {
    minWidth: "100%",
    justifyContent: "center",
  },
  zoomControlContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginTop: 8,
    marginBottom: 2,
  },
  zoomHintText: {
    fontSize: 11,
    fontWeight: "500",
    flex: 1,
    marginRight: 10,
  },
  zoomPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 4,
    paddingVertical: 3,
  },
  zoomBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomBtnDisabled: {
    opacity: 0.35,
  },
  zoomResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    gap: 4,
  },
  zoomPercentText: {
    fontSize: 11,
    fontWeight: "700",
  },
  seatGrid: {
    gap: 6,
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
